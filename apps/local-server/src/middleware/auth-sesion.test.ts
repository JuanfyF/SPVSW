import { describe, it, expect, vi, afterEach } from "vitest";

vi.mock("./auditoria", () => ({
  logAuditoriaLS: vi.fn(),
  registrarAuditoriaLocalServer: vi.fn(),
}));

import { crearSesion, authMiddleware } from "./auth";

const authStub = {} as any;

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

function crearReq(token: string | null) {
  return {
    path: "/api/stock",
    method: "GET",
    headers: token ? { authorization: `Bearer ${token}` } : {},
  } as any;
}

afterEach(() => {
  vi.useRealTimers();
});

describe("authMiddleware — sesión deslizante de 4 h", () => {
  it("renueva con cada request válido: expira 4 h después del ÚLTIMO uso", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T08:00:00Z"));

    const token = crearSesion({ usuarioId: 1, nombre: "Ana", rol: "pastelera" });
    const middleware = authMiddleware(authStub);

    // t=0: primer uso OK
    let res = crearRes();
    let next = vi.fn();
    middleware(crearReq(token), res, next);
    expect(next).toHaveBeenCalledTimes(1);

    // t=+3h: sin requests intermedios, sigue viva
    vi.setSystemTime(new Date("2026-01-01T11:00:00Z"));
    res = crearRes();
    next = vi.fn();
    middleware(crearReq(token), res, next);
    expect(next).toHaveBeenCalledTimes(1);

    // t=+3h30min desde el último uso (11:00 → 14:30): renovada, sigue viva
    vi.setSystemTime(new Date("2026-01-01T14:30:00Z"));
    res = crearRes();
    next = vi.fn();
    middleware(crearReq(token), res, next);
    expect(next).toHaveBeenCalledTimes(1);

    // t=+4h01min SIN uso desde 14:30 (18:31): expirada
    vi.setSystemTime(new Date("2026-01-01T18:31:00Z"));
    res = crearRes();
    next = vi.fn();
    middleware(crearReq(token), res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({ error: "Sesión expirada" });
  });

  it("con uso continuo (menos de 4 h entre requests) la sesión NO expira nunca", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T08:00:00Z"));

    const token = crearSesion({ usuarioId: 2, nombre: "Rosa", rol: "cajero" });
    const middleware = authMiddleware(authStub);

    // Uso cada 3 h durante 3 días: siempre debe pasar (UTC consistente
    // con la creación de la sesión: Date.UTC, no hora local del SO)
    for (let horas = 0; horas < 72; horas += 3) {
      vi.setSystemTime(new Date(Date.UTC(2026, 0, 1, 8 + horas)));
      const res = crearRes();
      const next = vi.fn();
      middleware(crearReq(token), res, next);
      expect(next, `falló a las +${horas}h`).toHaveBeenCalledTimes(1);
    }
  });

  it("rechaza token inválido y sin token con 401", () => {
    const middleware = authMiddleware(authStub);

    let res = crearRes();
    let next = vi.fn();
    middleware(crearReq("token-fantasma"), res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);

    res = crearRes();
    next = vi.fn();
    middleware(crearReq(null), res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
  });
});
