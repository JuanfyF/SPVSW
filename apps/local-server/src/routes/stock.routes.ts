import { Router, Request, Response } from "express";
import { crearServicioStock } from "@pos/core";
import { requerirRol } from "../middleware/auth";
import { logAuditoriaLS } from "../middleware/auditoria";
import { responderError, parseIdQuery, parseNumeroQuery } from "../middleware/errores";

/**
 * Rutas de stock para el servidor local.
 *
 * AGENT.md §2.7 — Acceso:
 * - Pastelera: puede registrar mermas, cortesías, reposiciones y cortes
 * - Administrador: acceso total
 *
 * Estas rutas NO deben exponer información financiera (ventas, caja, gastos).
 */
export function stockRoutes(stock: ReturnType<typeof crearServicioStock>): Router {
  const router = Router();

  // GET /api/stock — Consultar stock de la sesión actual
  router.get(
    "/",
    requerirRol("propietario", "cajero", "pastelera"),
    async (req: Request, res: Response) => {
      try {
        const sesionCajaId = parseIdQuery(req.query.sesionCajaId);
        if (!sesionCajaId) {
          return res.status(400).json({ error: "sesionCajaId es requerido" });
        }

        const stockData = await stock.obtenerStockPorSesion(sesionCajaId);
        res.json({ stock: stockData });
      } catch (error) {
        responderError(res, error, "Error al obtener stock");
      }
    }
  );

  // GET /api/stock/mermas — Listar mermas de una sesión
  router.get(
    "/mermas",
    requerirRol("propietario", "cajero", "pastelera"),
    async (req: Request, res: Response) => {
      try {
        const sesionCajaId = parseIdQuery(req.query.sesionCajaId);
        if (!sesionCajaId) {
          return res.status(400).json({ error: "sesionCajaId es requerido" });
        }

        const mermasData = await stock.listarMermasPorSesion(sesionCajaId);
        res.json({ mermas: mermasData });
      } catch (error) {
        responderError(res, error, "Error al obtener mermas");
      }
    }
  );

  // GET /api/stock/cortesias — Listar cortesías de una sesión
  router.get(
    "/cortesias",
    requerirRol("propietario", "cajero", "pastelera"),
    async (req: Request, res: Response) => {
      try {
        const sesionCajaId = parseIdQuery(req.query.sesionCajaId);
        if (!sesionCajaId) {
          return res.status(400).json({ error: "sesionCajaId es requerido" });
        }

        const cortesiasData = await stock.listarCortesiasPorSesion(sesionCajaId);
        res.json({ cortesias: cortesiasData });
      } catch (error) {
        responderError(res, error, "Error al obtener cortesías");
      }
    }
  );

  // POST /api/stock/merma — Registrar merma
  router.post(
    "/merma",
    requerirRol("propietario", "cajero", "pastelera"),
    async (req: Request, res: Response) => {
      try {
        const { productoId, sesionCajaId, cantidad, unidad, motivo } = req.body;
        const usuario = (req as any).usuario;

        if (!productoId || !sesionCajaId || !cantidad || !unidad || !motivo) {
          return res.status(400).json({ error: "Faltan campos requeridos" });
        }

        const merma = await stock.registrarMerma({
          productoId,
          sesionCajaId,
          cantidad,
          unidad,
          motivo,
          registradoPor: usuario.usuarioId,
        });

        logAuditoriaLS("stock_merma", usuario.usuarioId, { productoId, cantidad, motivo, sesionCajaId });

        res.json({ merma });
      } catch (error) {
        responderError(res, error, "Error al registrar merma");
      }
    }
  );

  // POST /api/stock/cortesia — Registrar cortesía
  router.post(
    "/cortesia",
    requerirRol("propietario", "cajero", "pastelera"),
    async (req: Request, res: Response) => {
      try {
        const { productoId, sesionCajaId, cantidad, unidad, motivo, cliente } =
          req.body;
        const usuario = (req as any).usuario;

        if (!productoId || !sesionCajaId || !cantidad || !unidad) {
          return res.status(400).json({ error: "Faltan campos requeridos" });
        }

        const cortesia = await stock.registrarCortesia({
          productoId,
          sesionCajaId,
          cantidad,
          unidad,
          motivo: motivo || null,
          cliente: cliente || null,
          registradoPor: usuario.usuarioId,
        });

        logAuditoriaLS("stock_cortesia", usuario.usuarioId, { productoId, cantidad, motivo, cliente, sesionCajaId });

        res.json({ cortesia });
      } catch (error) {
        responderError(res, error, "Error al registrar cortesía");
      }
    }
  );

  // POST /api/stock/corte — Registrar corte (entero → porciones)
  router.post(
    "/corte",
    requerirRol("propietario", "cajero", "pastelera"),
    async (req: Request, res: Response) => {
      try {
        const { productoId, sesionCajaId, unidadesEnteras, porcionesObtenidas } = req.body;
        const usuario = (req as any).usuario;

        if (!productoId || !sesionCajaId || !porcionesObtenidas) {
          return res.status(400).json({ error: "Faltan campos requeridos" });
        }

        const corte = await stock.registrarCorte({
          productoId,
          sesionCajaId,
          unidadesEnteras: unidadesEnteras ?? 1,
          porcionesObtenidas,
          registradoPor: usuario.usuarioId,
        });

        logAuditoriaLS("stock_corte", usuario.usuarioId, { productoId, unidadesEnteras: unidadesEnteras ?? 1, porcionesObtenidas });

        res.json({ corte });
      } catch (error) {
        responderError(res, error, "Error al registrar corte");
      }
    }
  );

  // POST /api/stock/reposicion — Registrar reposición
  router.post(
    "/reposicion",
    requerirRol("propietario", "cajero", "pastelera"),
    async (req: Request, res: Response) => {
      try {
        const { productoId, sesionCajaId, cantidad } = req.body;
        const usuario = (req as any).usuario;

        if (!productoId || !sesionCajaId || !cantidad) {
          return res.status(400).json({ error: "Faltan campos requeridos" });
        }

        const stockActualizado = await stock.registrarReposicion(
          productoId,
          sesionCajaId,
          cantidad
        );

        logAuditoriaLS("stock_reposicion", usuario.usuarioId, { productoId, cantidad, sesionCajaId });

        res.json({ stock: stockActualizado });
      } catch (error) {
        responderError(res, error, "Error al registrar reposición");
      }
    }
  );

  return router;
}

// ─── Rutas admin de stock: disponibilidad ──────────────
export function stockAdminRoutes(
  stock: ReturnType<typeof crearServicioStock>
): Router {
  const router = Router();

  router.get(
    "/disponibilidad",
    requerirRol("propietario", "cajero", "pastelera"),
    async (req: Request, res: Response) => {
      try {
        const productoId = parseIdQuery(req.query.productoId);
        const sesionCajaId = parseIdQuery(req.query.sesionCajaId);
        const unidad = req.query.unidad;
        const cantidad = parseNumeroQuery(req.query.cantidad);
        if (!productoId || !sesionCajaId || !unidad || cantidad === null) {
          return res.status(400).json({ error: "Faltan parámetros requeridos" });
        }

        const resultado = await stock.verificarDisponibilidad(
          productoId,
          sesionCajaId,
          unidad as "entero" | "porcion",
          cantidad
        );

        res.json(resultado);
      } catch (error) {
        responderError(res, error, "Error al verificar disponibilidad");
      }
    }
  );

  router.get(
    "/vendido-lote",
    requerirRol("propietario", "cajero", "pastelera"),
    async (req: Request, res: Response) => {
      try {
        const sesionCajaId = parseIdQuery(req.query.sesionCajaId);
        if (!sesionCajaId) {
          return res.status(400).json({ error: "sesionCajaId es requerido" });
        }

        const resultado = await stock.calcularVendidoLote(sesionCajaId);

        res.json({ vendido: resultado });
      } catch (error) {
        responderError(res, error, "Error al calcular vendido");
      }
    }
  );

  return router;
}
