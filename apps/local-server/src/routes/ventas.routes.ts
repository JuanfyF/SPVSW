import { Router, Request, Response } from "express";
import { crearServicioVentas } from "@pos/core";
import { requerirRol } from "../middleware/auth";

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
        const { sesionCajaId } = req.query;
        if (!sesionCajaId) {
          return res.status(400).json({ error: "sesionCajaId es requerido" });
        }
        const data = await ventas.listarPorSesion(
          parseInt(sesionCajaId as string, 10)
        );
        res.json({ ventas: data });
      } catch (error) {
        res.status(500).json({ error: "Error al obtener ventas" });
      }
    }
  );

  // GET /api/ventas/stock/verificar — Verificar stock (ANTES de /:id para evitar conflicto)
  router.get(
    "/stock/verificar",
    requerirRol("propietario", "cajero"),
    async (req: Request, res: Response) => {
      try {
        const { productoId, sesionCajaId, unidad, cantidad } = req.query;
        if (!productoId || !sesionCajaId || !unidad || !cantidad) {
          return res.status(400).json({ error: "Faltan parámetros requeridos" });
        }
        const resultado = await ventas.verificarStock(
          parseInt(productoId as string, 10),
          parseInt(sesionCajaId as string, 10),
          unidad as "entero" | "porcion" | "porcion_llevar",
          parseFloat(cantidad as string)
        );
        res.json(resultado);
      } catch (error) {
        res.status(500).json({ error: "Error al verificar stock" });
      }
    }
  );

  // GET /api/ventas/:id — Obtener venta por ID
  router.get(
    "/:id",
    requerirRol("propietario", "cajero"),
    async (req: Request, res: Response) => {
      try {
        const venta = await ventas.obtenerPorId(parseInt(req.params.id as string, 10));
        if (!venta) {
          return res.status(404).json({ error: "Venta no encontrada" });
        }
        res.json({ venta });
      } catch (error) {
        res.status(500).json({ error: "Error al obtener venta" });
      }
    }
  );

  // GET /api/ventas/:id/detalle — Obtener detalle de venta
  router.get(
    "/:id/detalle",
    requerirRol("propietario", "cajero"),
    async (req: Request, res: Response) => {
      try {
        const detalle = await ventas.obtenerDetalle(parseInt(req.params.id as string, 10));
        res.json({ detalle });
      } catch (error) {
        res.status(500).json({ error: "Error al obtener detalle" });
      }
    }
  );

  // POST /api/ventas — Crear venta
  router.post(
    "/",
    requerirRol("propietario", "cajero"),
    async (req: Request, res: Response) => {
      try {
        const venta = await ventas.crear(req.body);
        res.json({ venta });
      } catch (error: any) {
        res.status(500).json({ error: error.message || "Error al crear venta" });
      }
    }
  );

  return router;
}
