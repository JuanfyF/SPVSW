import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

vi.mock("electron", () => ({ BrowserWindow: class {} }));

import { ctx, initContext } from "./context";

const PROPIETARIO = { id: 1, nombre: "Dueña", rol: "propietario" };
const CAJERO = { id: 2, nombre: "Caja", rol: "cajero" };
const PASTELERA = { id: 3, nombre: "Ana", rol: "pastelera" };

describe("ctx.safeHandler — gates por rol", () => {
  beforeEach(() => {
    ctx.setUsuarioActual(null);
  });

  afterEach(() => {
    ctx.limpiarSesionesTimeout();
    ctx.setUsuarioActual(null);
  });

  const ejecutar = (opts?: { auth?: boolean; admin?: boolean; gestores?: boolean }) =>
    ctx.safeHandler(async () => "ok", opts);

  it("sin gate: ejecuta sin sesión", async () => {
    await expect(ejecutar()()).resolves.toBe("ok");
  });

  it("auth: rechaza sin sesión", async () => {
    await expect(ejecutar({ auth: true })()).rejects.toThrow("Sesión no válida");
  });

  it("auth: acepta cualquier rol", async () => {
    for (const u of [PROPIETARIO, CAJERO, PASTELERA]) {
      ctx.setUsuarioActual(u);
      await expect(ejecutar({ auth: true })()).resolves.toBe("ok");
    }
  });

  it("gestores: acepta propietario", async () => {
    ctx.setUsuarioActual(PROPIETARIO);
    await expect(ejecutar({ gestores: true })()).resolves.toBe("ok");
  });

  it("gestores: acepta cajero", async () => {
    ctx.setUsuarioActual(CAJERO);
    await expect(ejecutar({ gestores: true })()).resolves.toBe("ok");
  });

  it("gestores: rechaza pastelera con mensaje genérico", async () => {
    ctx.setUsuarioActual(PASTELERA);
    await expect(ejecutar({ gestores: true })()).rejects.toThrow(
      "No tiene permisos para realizar esta acción."
    );
  });

  it("admin: acepta propietario", async () => {
    ctx.setUsuarioActual(PROPIETARIO);
    await expect(ejecutar({ admin: true })()).resolves.toBe("ok");
  });

  it("admin: rechaza cajero (solo propietario)", async () => {
    ctx.setUsuarioActual(CAJERO);
    await expect(ejecutar({ admin: true })()).rejects.toThrow(
      "No tiene permisos para realizar esta acción."
    );
  });

  it("admin: rechaza pastelera", async () => {
    ctx.setUsuarioActual(PASTELERA);
    await expect(ejecutar({ admin: true })()).rejects.toThrow(
      "No tiene permisos para realizar esta acción."
    );
  });

  it("registra permiso_denegado en auditoría al denegar", async () => {
    const values = vi.fn();
    initContext({
      servicios: {} as any,
      db: { insert: vi.fn().mockReturnValue({ values }) } as any,
      mainWindow: null,
    });
    ctx.setUsuarioActual(PASTELERA);
    await expect(ejecutar({ gestores: true })()).rejects.toThrow();
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({ evento: "permiso_denegado", origen: "desktop" })
    );
    initContext({
      servicios: {} as any,
      db: null as any,
      mainWindow: null,
    });
  });

  it("la función envolvida nunca ve la excepción de gate (error tipado)", async () => {
    const fn = vi.fn().mockResolvedValue(42);
    ctx.setUsuarioActual(PASTELERA);
    await expect(ctx.safeHandler(fn, { admin: true })()).rejects.toThrow();
    expect(fn).not.toHaveBeenCalled();
  });
});

describe("ctx.requireGestor", () => {
  afterEach(() => ctx.setUsuarioActual(null));

  it("permite propietario y cajero", () => {
    ctx.setUsuarioActual(PROPIETARIO);
    expect(() => ctx.requireGestor()).not.toThrow();
    ctx.setUsuarioActual(CAJERO);
    expect(() => ctx.requireGestor()).not.toThrow();
  });

  it("rechaza pastelera y sin sesión", () => {
    ctx.setUsuarioActual(PASTELERA);
    expect(() => ctx.requireGestor()).toThrow();
    ctx.setUsuarioActual(null);
    expect(() => ctx.requireGestor()).toThrow("Sesión no válida");
  });
});
