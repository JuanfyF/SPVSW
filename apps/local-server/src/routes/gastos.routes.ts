import { Router, Request, Response } from "express";
import { crearServicioGastos } from "@pos/core";
import { requerirRol } from "../middleware/auth";

/**
 * Rutas de gastos para el servidor local.
 * Solo propietario y cajero pueden gestionar gastos.
 */
export function gastosRoutes(gastos: ReturnType<typeof crearServicioGastos>): Router {
  const router = Router();

  // GET /api/gastos — Listar gastos por sesión
  router.get(
    "/",
    requerirRol("propietario", "cajero"),
    async (req: Request, res: Response) => {
      try {
        const { sesionCajaId } = req.query;
        if (!sesionCajaId) {
          return res.status(400).json({ error: "sesionCajaId es requerido" });
        }
        const data = await gastos.listarPorSesion(
          parseInt(sesionCajaId as string, 10)
        );
        res.json({ gastos: data });
      } catch (error) {
        res.status(500).json({ error: "Error al obtener gastos" });
      }
    }
  );

  // GET /api/gastos/categorias — Listar categorías
  router.get(
    "/categorias",
    requerirRol("propietario", "cajero"),
    async (_req: Request, res: Response) => {
      try {
        const categorias = await gastos.listarCategorias();
        res.json({ categorias });
      } catch (error) {
        res.status(500).json({ error: "Error al obtener categorías" });
      }
    }
  );

  // POST /api/gastos — Crear gasto
  router.post(
    "/",
    requerirRol("propietario", "cajero"),
    async (req: Request, res: Response) => {
      try {
        const usuario = (req as any).usuario;
        const gasto = await gastos.crear({
          ...req.body,
          registradoPor: usuario.usuarioId,
        });
        res.json({ gasto });
      } catch (error: any) {
        res.status(500).json({ error: error.message || "Error al crear gasto" });
      }
    }
  );

  // POST /api/gastos/categorias — Crear categoría
  router.post(
    "/categorias",
    requerirRol("propietario"),
    async (req: Request, res: Response) => {
      try {
        const { nombre } = req.body;
        if (!nombre) {
          return res.status(400).json({ error: "nombre es requerido" });
        }
        const categoria = await gastos.crearCategoria(nombre);
        res.json({ categoria });
      } catch (error: any) {
        res.status(500).json({ error: error.message || "Error al crear categoría" });
      }
    }
  );

  return router;
}
