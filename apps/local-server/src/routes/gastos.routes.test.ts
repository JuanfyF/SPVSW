import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Router } from "express";

vi.mock("../middleware/auditoria", () => ({
  logAuditoriaLS: vi.fn(),
  registrarAuditoriaLocalServer: vi.fn(),
}));

import { logAuditoriaLS } from "../middleware/auditoria";
import { gastosRoutes } from "./gastos.routes";

function crearRes() {
  const res: any = {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    json(payload: unknown) {
      res.body = payload;
      return res;
    },
  };
  return res;
}

function extraerHandlers(router: Router, path: string, metodo: string) {
  const capa = (router as any).stack.find(
    (l: any) => l.route?.path === path && l.route?.methods?.[metodo]
  );
  expect(capa, `ruta ${metodo} ${path} no encontrada`).toBeTruthy();
  return capa.route.stack.map((s: any) => s.handle) as Array<
    (req: any, res: any, next: any) => void
  >;
}

describe("gastosRoutes — auditoría de mutaciones", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("POST /api/gastos registra gasto_creado con el usuario de la sesión", async () => {
    const gastoCreado = { id: 11, monto: 250, categoriaId: 2, descripcion: "Luz" };
    const gastos: any = {
      crear: vi.fn().mockResolvedValue(gastoCreado),
      listar: vi.fn(),
      listarCategorias: vi.fn(),
      crearCategoria: vi.fn(),
    };
    const router = gastosRoutes(gastos);
    const handlers = extraerHandlers(router, "/", "post");
    expect(handlers.length).toBe(2);

    const req = {
      method: "POST",
      originalUrl: "/api/gastos",
      body: { monto: 250, categoriaId: 2, descripcion: "Luz" },
      usuario: { usuarioId: 42, nombre: "Cajero", rol: "cajero" },
    };
    const res = crearRes();
    const next = vi.fn();

    // middleware de rol (pasa) + handler
    handlers[0]!(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    await handlers[1]!(req, res, next);

    expect(gastos.crear).toHaveBeenCalledWith({
      monto: 250,
      categoriaId: 2,
      descripcion: "Luz",
      registradoPor: 42,
    });
    expect(res.statusCode).toBe(200);
    expect(logAuditoriaLS).toHaveBeenCalledWith("gasto_creado", 42, {
      gastoId: 11,
      monto: 250,
      categoriaId: 2,
      descripcion: "Luz",
    });
  });

  it("POST /api/gastos/categorias registra categoria_gasto_creada", async () => {
    const gastos: any = {
      crear: vi.fn(),
      listar: vi.fn(),
      listarCategorias: vi.fn(),
      crearCategoria: vi.fn().mockResolvedValue({ id: 8, nombre: "Insumos" }),
    };
    const router = gastosRoutes(gastos);
    const handlers = extraerHandlers(router, "/categorias", "post");

    const req = {
      method: "POST",
      originalUrl: "/api/gastos/categorias",
      body: { nombre: "Insumos" },
      usuario: { usuarioId: 7, nombre: "Dueña", rol: "propietario" },
    };
    const res = crearRes();
    const next = vi.fn();

    handlers[0]!(req, res, next);
    await handlers[1]!(req, res, next);

    expect(logAuditoriaLS).toHaveBeenCalledWith("categoria_gasto_creada", 7, {
      nombre: "Insumos",
      categoriaId: 8,
    });
  });

  it("POST sin rol permitido no ejecuta la mutación ni audita éxito", async () => {
    const gastos: any = { crear: vi.fn(), crearCategoria: vi.fn() };
    const router = gastosRoutes(gastos);
    const handlers = extraerHandlers(router, "/", "post");

    const req = {
      method: "POST",
      originalUrl: "/api/gastos",
      body: { monto: 10 },
      usuario: { usuarioId: 3, nombre: "Pastelera", rol: "pastelera" },
    };
    const res = crearRes();
    const next = vi.fn();

    handlers[0]!(req, res, next);

    expect(res.statusCode).toBe(403);
    expect(next).not.toHaveBeenCalled();
    expect(gastos.crear).not.toHaveBeenCalled();
    // el 403 lo audita el middleware con permiso_denegado, no gasto_creado
    expect(logAuditoriaLS).toHaveBeenCalledWith(
      "permiso_denegado",
      3,
      expect.objectContaining({ rol: "pastelera" })
    );
    expect(logAuditoriaLS).not.toHaveBeenCalledWith("gasto_creado", expect.anything(), expect.anything());
  });
});
