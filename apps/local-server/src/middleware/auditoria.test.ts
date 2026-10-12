import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { auditLog } from "@pos/db";
import { logAuditoriaLS, registrarAuditoriaLocalServer } from "./auditoria";

function crearDbMock() {
  const values = vi.fn().mockResolvedValue(1);
  const insert = vi.fn().mockReturnValue({ values });
  return { db: { insert } as any, insert, values };
}

describe("logAuditoriaLS", () => {
  let consoleSpy: any;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it("sin DB registrada no hace nada ni lanza", () => {
    expect(() => logAuditoriaLS("login_exitoso", 1, { rol: "cajero" })).not.toThrow();
  });

  it("inserta con origen local-server y detalle serializado", async () => {
    const { db, insert, values } = crearDbMock();
    registrarAuditoriaLocalServer(db);

    logAuditoriaLS("venta_creada", 42, { ventaId: 7, total: 150 });

    expect(insert).toHaveBeenCalledWith(auditLog);
    expect(values).toHaveBeenCalledWith({
      evento: "venta_creada",
      usuarioId: 42,
      detalle: JSON.stringify({ ventaId: 7, total: 150 }),
      origen: "local-server",
    });
    await Promise.resolve();
    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it("omite detalle si no hay detalle", () => {
    const { db, values } = crearDbMock();
    registrarAuditoriaLocalServer(db);

    logAuditoriaLS("login_exitoso", 1);

    expect(values).toHaveBeenCalledWith({
      evento: "login_exitoso",
      usuarioId: 1,
      detalle: undefined,
      origen: "local-server",
    });
  });

  it("es best-effort: un insert rechazado no escapa", async () => {
    const values = vi.fn().mockReturnValue(Promise.reject(new Error("db rota")));
    const db: any = { insert: vi.fn().mockReturnValue({ values }) };
    registrarAuditoriaLocalServer(db);

    expect(() => logAuditoriaLS("caja_abierta", 1, { sesionCajaId: 3 })).not.toThrow();
    await new Promise((r) => setTimeout(r, 5));

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('No se pudo registrar "caja_abierta"'),
      expect.any(Error)
    );
  });

  it("no serializa PINs ni datos sensibles en el detalle", () => {
    const { db, values } = crearDbMock();
    registrarAuditoriaLocalServer(db);

    logAuditoriaLS("permiso_denegado", 5, { rol: "pastelera", ruta: "/api/nomina" });

    const detalle = values.mock.calls[0][0].detalle as string;
    expect(detalle).not.toMatch(/pin|pinHash|hash/i);
    expect(detalle).toBe(JSON.stringify({ rol: "pastelera", ruta: "/api/nomina" }));
  });
});
