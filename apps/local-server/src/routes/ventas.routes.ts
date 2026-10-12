import { Router, Request, Response } from "express";
import { crearServicioVentas } from "@pos/core";
import { requerirRol } from "../middleware/auth";
import { logAuditoriaLS } from "../middleware/auditoria";
import { responderError, parseIdQuery, parseNumeroQuery } from "../middleware/errores";

/**
 * Rutas de ventas para el servidor local.
 * Solo propietario y cajero pueden gestionar ventas.
 */
export function ventasRoutes(ventas: ReturnType<typeof crearServicioVentas>): Router {
  const router = Router();

  // GET /api/ventas — Listar ventas por sesión
  router.get(
    "/",
    requerirRol("propietario", "cajero"),
    async (req: Request, res: Response) => {
      try {
        const sesionCajaId = parseIdQuery(req.query.sesionCajaId);
        if (!sesionCajaId) {
          return res.status(400).json({ error: "sesionCajaId es requerido" });
        }
        const data = await ventas.listarPorSesion(sesionCajaId);
        res.json({ ventas: data });
      } catch (error) {
        responderError(res, error, "Error al obtener ventas");
      }
    }
  );

  // GET /api/ventas/stock/verificar — Verificar stock (ANTES de /:id para evitar conflicto)
  router.get(
    "/stock/verificar",
    requerirRol("propietario", "cajero"),
    async (req: Request, res: Response) => {
      try {
        const productoId = parseIdQuery(req.query.productoId);
        const sesionCajaId = parseIdQuery(req.query.sesionCajaId);
        const unidad = req.query.unidad;
        const cantidad = parseNumeroQuery(req.query.cantidad);
        if (!productoId || !sesionCajaId || !unidad || cantidad === null) {
          return res.status(400).json({ error: "Faltan parámetros requeridos" });
        }
        const resultado = await ventas.verificarStock(
          productoId,
          sesionCajaId,
          unidad as "entero" | "porcion" | "porcion_llevar",
          cantidad
        );
        res.json(resultado);
      } catch (error) {
        responderError(res, error, "Error al verificar stock");
      }
    }
  );

  // GET /api/ventas/:id — Obtener venta por ID
  router.get(
    "/:id",
    requerirRol("propietario", "cajero"),
    async (req: Request, res: Response) => {
      try {
        const id = parseIdQuery(req.params.id);
        if (!id) {
          return res.status(400).json({ error: "id inválido" });
        }
        const venta = await ventas.obtenerPorId(id);
        if (!venta) {
          return res.status(404).json({ error: "Venta no encontrada" });
        }
        res.json({ venta });
      } catch (error) {
        responderError(res, error, "Error al obtener venta");
      }
    }
  );

  // GET /api/ventas/:id/detalle — Obtener detalle de venta
  router.get(
    "/:id/detalle",
    requerirRol("propietario", "cajero"),
    async (req: Request, res: Response) => {
      try {
        const id = parseIdQuery(req.params.id);
        if (!id) {
          return res.status(400).json({ error: "id inválido" });
        }
        const detalle = await ventas.obtenerDetalle(id);
        res.json({ detalle });
      } catch (error) {
        responderError(res, error, "Error al obtener detalle");
      }
    }
  );

  // POST /api/ventas — Crear venta
  router.post(
    "/",
    requerirRol("propietario", "cajero"),
    async (req: Request, res: Response) => {
      try {
        const usuario = (req as any).usuario;
        const venta = await ventas.crear(req.body);
        logAuditoriaLS("venta_creada", usuario.usuarioId, {
          ventaId: venta.id,
          total: venta.total,
          metodoPago: venta.metodoPago,
        });
        res.json({ venta });
      } catch (error) {
        responderError(res, error, "Error al crear venta", "Error al crear venta");
      }
    }
  );

  return router;
}
