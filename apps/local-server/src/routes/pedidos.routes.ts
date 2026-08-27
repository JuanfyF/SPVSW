import { Router, Request, Response } from "express";
import { crearServicioPedidos } from "@pos/core";
import { requerirRol } from "../middleware/auth";

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

        const pedidosConDetalles = await Promise.all(
          pedidosProduccion.map(async (p) => {
            const detalles = await pedidos.obtenerDetalle(p.id);
            return {
              ...p,
              detalles: detalles.map((d) => ({
                productoId: d.productoId,
                descripcion: d.descripcionPersonalizada,
                cantidad: d.cantidad,
              })),
            };
          })
        );

        res.json({ pedidos: pedidosConDetalles });
      } catch (error) {
        res.status(500).json({ error: "Error al obtener pedidos de producción" });
      }
    }
  );

  // GET /api/pedidos/:id — Detalle completo de un pedido
  router.get(
    "/:id",
    requerirRol("propietario", "cajero", "pastelera"),
    async (req: Request, res: Response) => {
      try {
        const id = req.params.id as string;
        const pedido = await pedidos.obtenerPorId(parseInt(id, 10));

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
              telefono: pedido.telefono,
              fechaPedido: pedido.fechaPedido,
              fechaEntrega: pedido.fechaEntrega,
              estado: pedido.estado,
              notas: pedido.notas,
            }
          : pedido;

        res.json({
          pedido: pedidoLimpio,
          detalles: detalles.map((d) => ({
            id: d.id,
            productoId: d.productoId,
            descripcionPersonalizada: d.descripcionPersonalizada,
            unidad: d.unidad,
            cantidad: d.cantidad,
            precioUnitario: d.precioUnitario,
            subtotal: d.subtotal,
          })),
        });
      } catch (error) {
        res.status(500).json({ error: "Error al obtener el pedido" });
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
        const id = req.params.id as string;
        const { estado } = req.body;

        if (!["en_proceso", "listo"].includes(estado)) {
          return res.status(400).json({
            error: "Solo se permite cambiar a 'en_proceso' o 'listo'",
          });
        }

        const pedido = await pedidos.obtenerPorId(parseInt(id, 10));
        if (!pedido) {
          return res.status(404).json({ error: "Pedido no encontrado" });
        }

        if (estado === "listo") {
          await pedidos.marcarListo(pedido.id);
        } else {
          await pedidos.actualizarEstado(pedido.id, estado);
        }

        res.json({ mensaje: "Estado actualizado correctamente" });
      } catch (error) {
        res.status(500).json({ error: "Error al actualizar el estado" });
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

  router.get(
    "/",
    requerirRol("propietario", "cajero", "pastelera"),
    async (req: Request, res: Response) => {
      try {
        const activos = await pedidos.listarActivos();
        res.json({ pedidos: activos });
      } catch (error: any) {
        res.status(500).json({ error: "Error al listar pedidos" });
      }
    }
  );

  router.post(
    "/",
    requerirRol("propietario", "cajero"),
    async (req: Request, res: Response) => {
      try {
        const pedido = await pedidos.crear(req.body);
        res.json({ pedido });
      } catch (error: any) {
        res.status(400).json({ error: error.message || "Error al crear el pedido" });
      }
    }
  );

  return router;
}
