import { Router, Request, Response } from "express";
import { crearServicioCaja } from "@pos/core";
import { requerirRol } from "../middleware/auth";
import { logAuditoriaLS } from "../middleware/auditoria";
import { responderError, parseIdQuery } from "../middleware/errores";

/**
 * Rutas de caja para el servidor local.
 * Solo propietario y cajero pueden gestionar caja.
 */
export function cajaRoutes(caja: ReturnType<typeof crearServicioCaja>): Router {
  const router = Router();

  // GET /api/caja/sesion-abierta — Obtener sesión abierta del usuario
  router.get(
    "/sesion-abierta",
    requerirRol("propietario", "cajero"),
    async (req: Request, res: Response) => {
      try {
        const usuario = (req as any).usuario;
        const sesion = await caja.obtenerSesionAbierta(usuario.usuarioId);
        res.json({ sesion });
      } catch (error) {
        responderError(res, error, "Error al obtener sesión");
      }
    }
  );

  // POST /api/caja/abrir — Abrir sesión de caja
  router.post(
    "/abrir",
    requerirRol("propietario", "cajero"),
    async (req: Request, res: Response) => {
      try {
        const usuario = (req as any).usuario;
        const sesion = await caja.abrir({
          ...req.body,
          usuarioId: usuario.usuarioId,
        });
        logAuditoriaLS("caja_abierta", usuario.usuarioId, { sesionCajaId: sesion?.id });
        res.json({ sesion });
      } catch (error) {
        responderError(res, error, "Error al abrir caja", "Error al abrir caja");
      }
    }
  );

  // POST /api/caja/cerrar — Cerrar sesión de caja
  router.post(
    "/cerrar",
    requerirRol("propietario", "cajero"),
    async (req: Request, res: Response) => {
      try {
        const usuario = (req as any).usuario;
        const sesionCajaId = req.body.sesionCajaId;
        if (!sesionCajaId) {
          return res.status(400).json({ error: "sesionCajaId es requerido" });
        }

        // Verificar que la sesión pertenezca al usuario (excepto propietario)
        if (usuario.rol !== "propietario") {
          const sesion = await caja.obtenerSesionAbierta(usuario.usuarioId);
          if (!sesion || sesion.id !== sesionCajaId) {
            logAuditoriaLS("permiso_denegado", usuario.usuarioId, {
              metodo: req.method,
              ruta: req.originalUrl,
              motivo: "sesion_caja_no_pertenece",
            });
            return res.status(403).json({ error: "No tienes permiso para cerrar esta sesión" });
          }
        }

        const cierre = await caja.cerrar({
          sesionCajaId,
          efectivoContado: req.body.efectivoContado,
          tieneDiferenciaStock: req.body.tieneDiferenciaStock,
          conteoStock: req.body.conteoStock,
        });
        logAuditoriaLS("caja_cerrada", usuario.usuarioId, {
          cierreCajaId: cierre?.id,
          efectivoEsperado: cierre?.efectivoEsperado,
        });
        res.json({ cierre });
      } catch (error) {
        responderError(res, error, "Error al cerrar caja", "Error al cerrar caja");
      }
    }
  );

  // GET /api/caja/efectivo-esperado — Calcular efectivo esperado
  router.get(
    "/efectivo-esperado",
    requerirRol("propietario", "cajero"),
    async (req: Request, res: Response) => {
      try {
        const sesionCajaId = parseIdQuery(req.query.sesionCajaId);
        if (!sesionCajaId) {
          return res.status(400).json({ error: "sesionCajaId es requerido" });
        }
        const efectivo = await caja.calcularEfectivoEsperado(sesionCajaId);
        res.json({ efectivoEsperado: efectivo });
      } catch (error) {
        responderError(res, error, "Error al calcular efectivo esperado");
      }
    }
  );

  // GET /api/caja/resumen-ventas — Resumen de ventas por sesión
  router.get(
    "/resumen-ventas",
    requerirRol("propietario", "cajero"),
    async (req: Request, res: Response) => {
      try {
        const sesionCajaId = parseIdQuery(req.query.sesionCajaId);
        if (!sesionCajaId) {
          return res.status(400).json({ error: "sesionCajaId es requerido" });
        }
        const resumen = await caja.obtenerResumenVentas(sesionCajaId);
        res.json(resumen);
      } catch (error) {
        responderError(res, error, "Error al obtener resumen");
      }
    }
  );

  // GET /api/caja/resumen-pedidos — Resumen de pedidos por sesión
  router.get(
    "/resumen-pedidos",
    requerirRol("propietario", "cajero"),
    async (req: Request, res: Response) => {
      try {
        const sesionCajaId = parseIdQuery(req.query.sesionCajaId);
        if (!sesionCajaId) {
          return res.status(400).json({ error: "sesionCajaId es requerido" });
        }
        const resumen = await caja.obtenerResumenPedidos(sesionCajaId);
        res.json(resumen);
      } catch (error) {
        responderError(res, error, "Error al obtener resumen");
      }
    }
  );

  // POST /api/caja/marcar-revisado — Marcar cierre como revisado
  router.post(
    "/marcar-revisado",
    requerirRol("propietario"),
    async (req: Request, res: Response) => {
      try {
        const usuario = (req as any).usuario;
        const cierreCajaId = req.body.cierreCajaId;
        if (!cierreCajaId) {
          return res.status(400).json({ error: "cierreCajaId es requerido" });
        }
        await caja.marcarRevisado(cierreCajaId, usuario.usuarioId);
        logAuditoriaLS("caja_revisada", usuario.usuarioId, { cierreCajaId });
        res.json({ mensaje: "Cierre marcado como revisado" });
      } catch (error) {
        responderError(res, error, "Error al marcar revisado", "Error al marcar revisado");
      }
    }
  );

  // POST /api/caja/forzar-cierre — Forzar cierre de sesión
  router.post(
    "/forzar-cierre",
    requerirRol("propietario"),
    async (req: Request, res: Response) => {
      try {
        const usuario = (req as any).usuario;
        const sesionCajaId = req.body.sesionCajaId;
        if (!sesionCajaId) {
          return res.status(400).json({ error: "sesionCajaId es requerido" });
        }
        await caja.forzarCierre(sesionCajaId, usuario.usuarioId);
        logAuditoriaLS("caja_forzar_cierre", usuario.usuarioId, { sesionCajaId });
        res.json({ exito: true });
      } catch (error) {
        responderError(res, error, "Error al forzar cierre", "Error al forzar cierre");
      }
    }
  );

  return router;
}
