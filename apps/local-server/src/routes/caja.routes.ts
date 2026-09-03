import { Router, Request, Response } from "express";
import { crearServicioCaja } from "@pos/core";
import { requerirRol } from "../middleware/auth";

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
        res.status(500).json({ error: "Error al obtener sesión" });
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
        res.json({ sesion });
      } catch (error: any) {
        res.status(500).json({ error: error.message || "Error al abrir caja" });
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
        const cierre = await caja.cerrar({
          ...req.body,
          usuarioId: usuario.usuarioId,
        });
        res.json({ cierre });
      } catch (error: any) {
        res.status(500).json({ error: error.message || "Error al cerrar caja" });
      }
    }
  );

  // GET /api/caja/efectivo-esperado — Calcular efectivo esperado
  router.get(
    "/efectivo-esperado",
    requerirRol("propietario", "cajero"),
    async (req: Request, res: Response) => {
      try {
        const { sesionCajaId } = req.query;
        if (!sesionCajaId) {
          return res.status(400).json({ error: "sesionCajaId es requerido" });
        }
        const efectivo = await caja.calcularEfectivoEsperado(
          parseInt(sesionCajaId as string, 10)
        );
        res.json({ efectivoEsperado: efectivo });
      } catch (error) {
        res.status(500).json({ error: "Error al calcular efectivo esperado" });
      }
    }
  );

  // GET /api/caja/resumen-ventas — Resumen de ventas por sesión
  router.get(
    "/resumen-ventas",
    requerirRol("propietario", "cajero"),
    async (req: Request, res: Response) => {
      try {
        const { sesionCajaId } = req.query;
        if (!sesionCajaId) {
          return res.status(400).json({ error: "sesionCajaId es requerido" });
        }
        const resumen = await caja.obtenerResumenVentas(
          parseInt(sesionCajaId as string, 10)
        );
        res.json(resumen);
      } catch (error) {
        res.status(500).json({ error: "Error al obtener resumen" });
      }
    }
  );

  // GET /api/caja/resumen-pedidos — Resumen de pedidos por sesión
  router.get(
    "/resumen-pedidos",
    requerirRol("propietario", "cajero"),
    async (req: Request, res: Response) => {
      try {
        const { sesionCajaId } = req.query;
        if (!sesionCajaId) {
          return res.status(400).json({ error: "sesionCajaId es requerido" });
        }
        const resumen = await caja.obtenerResumenPedidos(
          parseInt(sesionCajaId as string, 10)
        );
        res.json(resumen);
      } catch (error) {
        res.status(500).json({ error: "Error al obtener resumen" });
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
        const { cierreCajaId } = req.body;
        if (!cierreCajaId) {
          return res.status(400).json({ error: "cierreCajaId es requerido" });
        }
        await caja.marcarRevisado(cierreCajaId, usuario.usuarioId);
        res.json({ mensaje: "Cierre marcado como revisado" });
      } catch (error: any) {
        res.status(500).json({ error: error.message || "Error al marcar revisado" });
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
        const { sesionCajaId } = req.body;
        if (!sesionCajaId) {
          return res.status(400).json({ error: "sesionCajaId es requerido" });
        }
        await caja.forzarCierre(sesionCajaId, usuario.usuarioId);
        res.json({ exito: true });
      } catch (error: any) {
        res.status(500).json({ error: error.message || "Error al forzar cierre" });
      }
    }
  );

  return router;
}
