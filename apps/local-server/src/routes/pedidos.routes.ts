import { Router, Request, Response } from "express";
import { crearServicioPedidos } from "@pos/core";
import { requerirRol } from "../middleware/auth";
import { logAuditoriaLS } from "../middleware/auditoria";
import { responderError } from "../middleware/errores";

/**
 * Rutas de pedidos para el servidor local (vista de producción).
 *
 * AGENT.md §2.7 — Pastelera solo ve:
 * - cliente, producto/descripción, cantidad, fecha de entrega, estado
 * - NUNCA: teléfono, anticipo, saldo ni método de pago (datos financieros)
 *
 * AGENT.md §2.7 — Actualización de estado:
 * - Pastelera puede cambiar estado a "en_proceso" o "listo"
 * - No puede cancelar ni eliminar pedidos
 */
export function pedidosRoutes(
  pedidos: ReturnType<typeof crearServicioPedidos>
): Router {
  const router = Router();

  // GET /api/pedidos/produccion — Vista de producción (solo lectura)
  // SOLO expone: cliente, producto/descripción, cantidad, fecha de entrega, estado
  // NUNCA teléfono, anticipo, saldo ni método de pago (AGENT.md 2.7)
  router.get(
    "/produccion",
    requerirRol("propietario", "cajero", "pastelera"),
    async (req: Request, res: Response) => {
      try {
        const pedidosActivos = await pedidos.listarActivos();

        // Filtrar solo los campos permitidos para producción
        const pedidosProduccion = pedidosActivos.map((p) => ({
          id: p.id,
          cliente: p.cliente,
          fechaEntrega: p.fechaEntrega,
          estado: p.estado,
        }));

        // Una sola query de detalles para todos los pedidos (inArray),
        // en vez de una query por pedido (N+1 sobre SQLite sincrónico).
        const todosDetalles = await pedidos.listarDetallesLote(
          pedidosProduccion.map((p) => p.id)
        );
        const detallesPorPedido = new Map<number, typeof todosDetalles>();
        for (const d of todosDetalles) {
          const lista = detallesPorPedido.get(d.pedidoId) ?? [];
          lista.push(d);
          detallesPorPedido.set(d.pedidoId, lista);
        }

        const pedidosConDetalles = pedidosProduccion.map((p) => ({
          ...p,
          detalles: (detallesPorPedido.get(p.id) ?? []).map((d) => ({
            productoId: d.productoId,
            descripcion: d.descripcionPersonalizada,
            cantidad: d.cantidad,
          })),
        }));

        res.json({ pedidos: pedidosConDetalles });
      } catch (error) {
        responderError(res, error, "Error al obtener pedidos de producción");
      }
    }
  );

  // GET /api/pedidos/:id — Detalle completo de un pedido
  router.get(
    "/:id",
    requerirRol("propietario", "cajero", "pastelera"),
    async (req: Request, res: Response) => {
      try {
        const id = parseInt(req.params.id as string, 10);
        if (!Number.isSafeInteger(id) || id <= 0) {
          return res.status(400).json({ error: "id inválido" });
        }
        const pedido = await pedidos.obtenerPorId(id);

        if (!pedido) {
          return res.status(404).json({ error: "Pedido no encontrado" });
        }

        const detalles = await pedidos.obtenerDetalle(pedido.id);

        // Pastelera NO ve datos financieros (AGENT.md 2.7)
        const rol = (req as any).usuario?.rol;
        const pedidoLimpio = rol === "pastelera"
          ? {
              id: pedido.id,
              cliente: pedido.cliente,
              fechaPedido: pedido.fechaPedido,
              fechaEntrega: pedido.fechaEntrega,
              horaEntrega: pedido.horaEntrega,
              estado: pedido.estado,
              notas: pedido.notas,
            }
          : pedido;

        // Pastelera: sin precioUnitario ni subtotal en detalles
        const detallesLimpios = rol === "pastelera"
          ? detalles.map((d) => ({
              id: d.id,
              productoId: d.productoId,
              descripcionPersonalizada: d.descripcionPersonalizada,
              unidad: d.unidad,
              cantidad: d.cantidad,
            }))
          : detalles.map((d) => ({
              id: d.id,
              productoId: d.productoId,
              descripcionPersonalizada: d.descripcionPersonalizada,
              unidad: d.unidad,
              cantidad: d.cantidad,
              precioUnitario: d.precioUnitario,
              subtotal: d.subtotal,
            }));

        res.json({
          pedido: pedidoLimpio,
          detalles: detallesLimpios,
        });
      } catch (error) {
        responderError(res, error, "Error al obtener el pedido");
      }
    }
  );

  // PATCH /api/pedidos/:id/estado — Actualizar estado del pedido
  // Solo permite cambiar a "en_proceso" o "listo"
  router.patch(
    "/:id/estado",
    requerirRol("propietario", "cajero", "pastelera"),
    async (req: Request, res: Response) => {
      try {
        const id = parseInt(req.params.id as string, 10);
        if (!Number.isSafeInteger(id) || id <= 0) {
          return res.status(400).json({ error: "id inválido" });
        }
        const { estado } = req.body;
        const usuario = (req as any).usuario;

        if (!["en_proceso", "listo"].includes(estado)) {
          return res.status(400).json({
            error: "Solo se permite cambiar a 'en_proceso' o 'listo'",
          });
        }

        const pedido = await pedidos.obtenerPorId(id);
        if (!pedido) {
          return res.status(404).json({ error: "Pedido no encontrado" });
        }

        if (estado === "listo") {
          await pedidos.marcarListo(pedido.id);
        } else {
          await pedidos.actualizarEstado(pedido.id, estado);
        }

        if (estado === "listo") {
          logAuditoriaLS("pedido_listo", usuario.usuarioId, { pedidoId: pedido.id });
        } else {
          logAuditoriaLS("pedido_estado_cambiado", usuario.usuarioId, { pedidoId: pedido.id, nuevoEstado: estado });
        }

        res.json({ mensaje: "Estado actualizado correctamente" });
      } catch (error) {
        responderError(res, error, "Error al actualizar el estado");
      }
    }
  );

  return router;
}

// ─── Rutas admin: creación de pedidos ──────────────────
export function pedidosAdminRoutes(
  pedidos: ReturnType<typeof crearServicioPedidos>
): Router {
  const router = Router();

  // GET / — Lista de pedidos (pastelera ve campos limitados, sin datos financieros)
  router.get(
    "/",
    requerirRol("propietario", "cajero", "pastelera"),
    async (req: Request, res: Response) => {
      try {
        const activos = await pedidos.listarActivos();
        const rol = (req as any).usuario?.rol;

        // Pastelera: solo campos de producción, sin datos financieros
        if (rol === "pastelera") {
          const pedidosLimitados = activos.map((p) => ({
            id: p.id,
            cliente: p.cliente,
            fechaEntrega: p.fechaEntrega,
            horaEntrega: p.horaEntrega,
            estado: p.estado,
            notas: p.notas,
          }));
          return res.json({ pedidos: pedidosLimitados });
        }

        res.json({ pedidos: activos });
      } catch (error) {
        responderError(res, error, "Error al listar pedidos");
      }
    }
  );

  router.post(
    "/",
    requerirRol("propietario", "cajero"),
    async (req, res) => {
      try {
        const usuario = (req as any).usuario;
        const pedido = await pedidos.crear(req.body);
        logAuditoriaLS("pedido_creado", usuario.usuarioId, {
          pedidoId: pedido.id,
          cliente: pedido.cliente,
          totalEstimado: pedido.totalEstimado,
        });
        res.json({ pedido });
      } catch (error) {
        responderError(res, error, "Error al crear el pedido", "Error al crear el pedido");
      }
    }
  );

  return router;
}
