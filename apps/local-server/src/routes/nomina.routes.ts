import { Router, Request, Response } from "express";
import { crearServicioNomina } from "@pos/core";
import { requerirRol } from "../middleware/auth";

/**
 * Rutas de nómina para el servidor local.
 * Solo propietario puede gestionar nómina.
 */
export function nominaRoutes(nomina: ReturnType<typeof crearServicioNomina>): Router {
  const router = Router();

  // GET /api/nomina/empleados — Listar empleados activos
  router.get(
    "/empleados",
    requerirRol("propietario"),
    async (_req: Request, res: Response) => {
      try {
        const empleados = await nomina.listarEmpleadosActivos();
        res.json({ empleados });
      } catch (error) {
        res.status(500).json({ error: "Error al obtener empleados" });
      }
    }
  );

  // POST /api/nomina/empleados — Crear empleado
  router.post(
    "/empleados",
    requerirRol("propietario"),
    async (req: Request, res: Response) => {
      try {
        const empleado = await nomina.crearEmpleado(req.body);
        res.json({ empleado });
      } catch (error: any) {
        res.status(500).json({ error: error.message || "Error al crear empleado" });
      }
    }
  );

  // GET /api/nomina/adelantos — Listar adelantos por sesión
  router.get(
    "/adelantos",
    requerirRol("propietario"),
    async (req: Request, res: Response) => {
      try {
        const { sesionCajaId } = req.query;
        if (!sesionCajaId) {
          return res.status(400).json({ error: "sesionCajaId es requerido" });
        }
        const adelantos = await nomina.listarAdelantosPorSesion(
          parseInt(sesionCajaId as string, 10)
        );
        res.json({ adelantos });
      } catch (error) {
        res.status(500).json({ error: "Error al obtener adelantos" });
      }
    }
  );

  // POST /api/nomina/adelantos — Registrar adelanto
  router.post(
    "/adelantos",
    requerirRol("propietario"),
    async (req: Request, res: Response) => {
      try {
        const usuario = (req as any).usuario;
        const adelanto = await nomina.registrarAdelanto({
          ...req.body,
          registradoPor: usuario.usuarioId,
        });
        res.json({ adelanto });
      } catch (error: any) {
        res.status(500).json({ error: error.message || "Error al registrar adelanto" });
      }
    }
  );

  // GET /api/nomina/multas — Listar multas por empleado
  router.get(
    "/multas",
    requerirRol("propietario"),
    async (req: Request, res: Response) => {
      try {
        const { empleadoId } = req.query;
        if (!empleadoId) {
          return res.status(400).json({ error: "empleadoId es requerido" });
        }
        const multas = await nomina.listarMultasPorEmpleado(
          parseInt(empleadoId as string, 10)
        );
        res.json({ multas });
      } catch (error) {
        res.status(500).json({ error: "Error al obtener multas" });
      }
    }
  );

  // POST /api/nomina/multas — Registrar multa
  router.post(
    "/multas",
    requerirRol("propietario"),
    async (req: Request, res: Response) => {
      try {
        const usuario = (req as any).usuario;
        const multa = await nomina.registrarMulta({
          ...req.body,
          registradoPor: usuario.usuarioId,
        });
        res.json({ multa });
      } catch (error: any) {
        res.status(500).json({ error: error.message || "Error al registrar multa" });
      }
    }
  );

  // GET /api/nomina/descuentos — Calcular descuentos del mes
  router.get(
    "/descuentos",
    requerirRol("propietario"),
    async (req: Request, res: Response) => {
      try {
        const { empleadoId, mes } = req.query;
        if (!empleadoId || !mes) {
          return res.status(400).json({ error: "empleadoId y mes son requeridos" });
        }
        const descuentos = await nomina.calcularDescuentosMes(
          parseInt(empleadoId as string, 10),
          mes as string
        );
        res.json(descuentos);
      } catch (error) {
        res.status(500).json({ error: "Error al calcular descuentos" });
      }
    }
  );

  return router;
}
