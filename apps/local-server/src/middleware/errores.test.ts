import { describe, it, expect, vi } from "vitest";
import {
  esErrorValidacion,
  esErrorDominio,
  responderError,
  parseIdQuery,
  parseNumeroQuery,
} from "./errores";

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

describe("clasificación de errores", () => {
  it("esErrorValidacion detecta errores de Zod (issues)", () => {
    expect(esErrorValidacion({ issues: [{ path: ["id"] }] })).toBe(true);
    expect(esErrorValidacion(new Error("cualquiera"))).toBe(false);
    expect(esErrorValidacion(null)).toBe(false);
    expect(esErrorValidacion("string")).toBe(false);
  });

  it("esErrorDominio acepta mensajes de negocio en español", () => {
    expect(esErrorDominio(new Error("Sesión de caja no encontrada"))).toBe(true);
    expect(esErrorDominio(new Error("Ya existe una sesión abierta para este usuario"))).toBe(true);
    expect(esErrorDominio(new Error("No hay stock de enteros registrado para este producto"))).toBe(true);
  });

  it("esErrorDominio RECHAZA mensajes que parecen SQL/DB (no fugar schema)", () => {
    expect(esErrorDominio(new Error("SQLITE_CONSTRAINT: UNIQUE constraint failed"))).toBe(false);
    expect(esErrorDominio(new Error('no such column: "usuarios.pin_hash"'))).toBe(false);
    expect(esErrorDominio(new Error("DrizzleQueryError: select failed"))).toBe(false);
    expect(esErrorDominio(new Error("TypeError: cannot read property"))).toBe(false);
    expect(esErrorDominio(new Error("SqliteError: database is locked"))).toBe(false);
  });

  it("esErrorDominio rechaza mensajes vacíos o demasiado largos", () => {
    expect(esErrorDominio(new Error(""))).toBe(false);
    expect(esErrorDominio(new Error("x".repeat(300)))).toBe(false);
    expect(esErrorDominio("no es Error")).toBe(false);
  });
});

describe("responderError", () => {
  it("ZodError → 400 Datos inválidos", () => {
    const res = crearRes();
    responderError(res, { issues: [] }, "Error genérico");
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: "Datos inválidos" });
  });

  it("error de dominio → 409 con el mensaje legible de core", () => {
    const res = crearRes();
    responderError(res, new Error("La sesión ya está cerrada"), "Error al cerrar");
    expect(res.statusCode).toBe(409);
    expect(res.body).toEqual({ error: "La sesión ya está cerrada" });
  });

  it("error de DB → 500 genérico SIN exponer el mensaje SQL", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = crearRes();
    responderError(res, new Error("no such column: pin_hash"), "Error al crear gasto");
    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: "Error al crear gasto" });
    spy.mockRestore();
  });

  it("error desconocido (string) → 500 genérico", () => {
    const res = crearRes();
    responderError(res, "algo raro", "Error interno");
    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: "Error interno" });
  });
});

describe("parseIdQuery", () => {
  it("acepta enteros positivos como string", () => {
    expect(parseIdQuery("12")).toBe(12);
  });

  it("rechaza NaN, negativos, cero, arrays y undefined", () => {
    expect(parseIdQuery("abc")).toBeNull();
    expect(parseIdQuery("-5")).toBeNull();
    expect(parseIdQuery("0")).toBeNull();
    expect(parseIdQuery("1.5")).toBeNull();
    expect(parseIdQuery(undefined)).toBeNull();
    expect(parseIdQuery(["1"])).toBeNull();
    expect(parseIdQuery("")).toBeNull();
  });
});

describe("parseNumeroQuery", () => {
  it("acepta enteros y decimales", () => {
    expect(parseNumeroQuery("3")).toBe(3);
    expect(parseNumeroQuery("2.5")).toBe(2.5);
    expect(parseNumeroQuery("0")).toBe(0);
  });

  it("rechaza no-numéricos", () => {
    expect(parseNumeroQuery("abc")).toBeNull();
    expect(parseNumeroQuery("")).toBeNull();
    expect(parseNumeroQuery(undefined)).toBeNull();
    expect(parseNumeroQuery("Infinity")).toBeNull();
  });
});
