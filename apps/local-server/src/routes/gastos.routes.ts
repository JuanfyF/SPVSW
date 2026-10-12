import { Router, Request, Response } from "express";
import { crearServicioGastos } from "@pos/core";
import { requerirRol } from "../middleware/auth";
import { logAuditoriaLS } from "../middleware/auditoria";
import { responderError, parseIdQuery } from "../middleware/errores";

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
        const sesionCajaId = parseIdQuery(req.query.sesionCajaId);
        if (!sesionCajaId) {
          return res.status(400).json({ error: "sesionCajaId es requerido" });
        }
        const data = await gastos.listarPorSesion(sesionCajaId);
        res.json({ gastos: data });
      } catch (error) {
        responderError(res, error, "Error al obtener gastos");
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
        responderError(res, error, "Error al obtener categorías");
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
        logAuditoriaLS("gasto_creado", usuario.usuarioId, {
          gastoId: gasto?.id,
          monto: gasto?.monto,
          categoriaId: gasto?.categoriaId,
          descripcion: gasto?.descripcion,
        });
        res.json({ gasto });
      } catch (error) {
        responderError(res, error, "Error al crear gasto", "Error al crear gasto");
      }
    }
  );

  // POST /api/gastos/categorias — Crear categoría
  router.post(
    "/categorias",
    requerirRol("propietario"),
    async (req: Request, res: Response) => {
      try {
        const usuario = (req as any).usuario;
        const { nombre } = req.body;
        if (!nombre) {
          return res.status(400).json({ error: "nombre es requerido" });
        }
        const categoria = await gastos.crearCategoria(nombre);
        logAuditoriaLS("categoria_gasto_creada", usuario.usuarioId, { nombre, categoriaId: categoria?.id });
        res.json({ categoria });
      } catch (error) {
        responderError(res, error, "Error al crear categoría", "Error al crear categoría");
      }
    }
  );

  return router;
}
