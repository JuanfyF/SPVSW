import { Router, Request, Response } from "express";
import { crearServicioNomina } from "@pos/core";
import { requerirRol } from "../middleware/auth";
import { logAuditoriaLS } from "../middleware/auditoria";
import { responderError, parseIdQuery } from "../middleware/errores";

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
        responderError(res, error, "Error al obtener empleados");
      }
    }
  );

  // POST /api/nomina/empleados — Crear empleado
  router.post(
    "/empleados",
    requerirRol("propietario"),
    async (req: Request, res: Response) => {
      try {
        const usuario = (req as any).usuario;
        const empleado = await nomina.crearEmpleado(req.body);
        logAuditoriaLS("empleado_creado", usuario.usuarioId, {
          empleadoId: empleado?.id,
          nombre: empleado?.nombre,
          cargo: empleado?.cargo,
          salarioMensual: empleado?.salarioMensual,
        });
        res.json({ empleado });
      } catch (error) {
        responderError(res, error, "Error al crear empleado", "Error al crear empleado");
      }
    }
  );

  // GET /api/nomina/adelantos — Listar adelantos por sesión
  router.get(
    "/adelantos",
    requerirRol("propietario"),
    async (req: Request, res: Response) => {
      try {
        const sesionCajaId = parseIdQuery(req.query.sesionCajaId);
        if (!sesionCajaId) {
          return res.status(400).json({ error: "sesionCajaId es requerido" });
        }
        const adelantos = await nomina.listarAdelantosPorSesion(sesionCajaId);
        res.json({ adelantos });
      } catch (error) {
        responderError(res, error, "Error al obtener adelantos");
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
        logAuditoriaLS("adelanto_registrado", usuario.usuarioId, {
          adelantoId: adelanto?.id,
          empleadoId: adelanto?.empleadoId,
          monto: adelanto?.monto,
        });
        res.json({ adelanto });
      } catch (error) {
        responderError(res, error, "Error al registrar adelanto", "Error al registrar adelanto");
      }
    }
  );

  // GET /api/nomina/multas — Listar multas por empleado
  router.get(
    "/multas",
    requerirRol("propietario"),
    async (req: Request, res: Response) => {
      try {
        const empleadoId = parseIdQuery(req.query.empleadoId);
        if (!empleadoId) {
          return res.status(400).json({ error: "empleadoId es requerido" });
        }
        const multas = await nomina.listarMultasPorEmpleado(empleadoId);
        res.json({ multas });
      } catch (error) {
        responderError(res, error, "Error al obtener multas");
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
        logAuditoriaLS("multa_registrada", usuario.usuarioId, {
          multaId: multa?.id,
          empleadoId: multa?.empleadoId,
          monto: multa?.monto,
          motivo: multa?.motivo,
        });
        res.json({ multa });
      } catch (error) {
        responderError(res, error, "Error al registrar multa", "Error al registrar multa");
      }
    }
  );

  // GET /api/nomina/descuentos — Calcular descuentos del mes
  router.get(
    "/descuentos",
    requerirRol("propietario"),
    async (req: Request, res: Response) => {
      try {
        const empleadoId = parseIdQuery(req.query.empleadoId);
        const mes = req.query.mes;
        if (!empleadoId || typeof mes !== "string" || !mes) {
          return res.status(400).json({ error: "empleadoId y mes son requeridos" });
        }
        const descuentos = await nomina.calcularDescuentosMes(empleadoId, mes);
        res.json(descuentos);
      } catch (error) {
        responderError(res, error, "Error al calcular descuentos");
      }
    }
  );

  return router;
}
