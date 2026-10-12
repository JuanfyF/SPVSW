import { describe, it, expect, vi, beforeAll, afterEach } from "vitest";

vi.mock("./auditoria", () => ({
  logAuditoriaLS: vi.fn(),
  registrarAuditoriaLocalServer: vi.fn(),
}));

import { logAuditoriaLS } from "./auditoria";

let requerirRol: (...roles: string[]) => (req: any, res: any, next: any) => void;

beforeAll(async () => {
  // auth.ts crea un setInterval de limpieza de sesiones al importarse:
  // con fake timers no se arma un timer real que cuelgue el worker de vitest.
  vi.useFakeTimers();
  const modulo = await import("./auth");
  requerirRol = modulo.requerirRol;
  vi.useRealTimers();
});

afterEach(() => {
  vi.clearAllMocks();
});

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

function crearReq(rol: string | null, extras: Record<string, unknown> = {}) {
  return {
    method: "GET",
    originalUrl: "/api/nomina/empleados",
    ...extras,
    usuario: rol
      ? { usuarioId: 9, nombre: "Lupita", rol }
      : undefined,
  } as any;
}

describe("requerirRol (auditoría de denegaciones)", () => {
  it("permite el paso y NO registra auditoría cuando el rol está permitido", () => {
    const req = crearReq("propietario");
    const res = crearRes();
    const next = vi.fn();

    requerirRol("propietario", "cajero")(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBe(200);
    expect(logAuditoriaLS).not.toHaveBeenCalled();
  });

  it("responde 403 y registra permiso_denegado con usuario y ruta", () => {
    const req = crearReq("pastelera", { originalUrl: "/api/caja/abrir", method: "POST" });
    const res = crearRes();
    const next = vi.fn();

    requerirRol("propietario", "cajero")(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({ error: "Acceso denegado para este rol" });
    expect(logAuditoriaLS).toHaveBeenCalledTimes(1);
    expect(logAuditoriaLS).toHaveBeenCalledWith("permiso_denegado", 9, {
      metodo: "POST",
      ruta: "/api/caja/abrir",
      rol: "pastelera",
      rolesPermitidos: ["propietario", "cajero"],
    });
  });

  it("responde 401 sin registrar si no hay sesión", () => {
    const req = crearReq(null);
    const res = crearRes();
    const next = vi.fn();

    requerirRol("propietario")(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
    expect(logAuditoriaLS).not.toHaveBeenCalled();
  });
});
