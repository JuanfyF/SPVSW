import { describe, it, expect, afterEach } from "vitest";
import { crearRateLimiter } from "./rate-limit";

describe("crearRateLimiter", () => {
  const limiters: Array<ReturnType<typeof crearRateLimiter>> = [];
  function crear(opts?: Parameters<typeof crearRateLimiter>[0]) {
    const limiter = crearRateLimiter(opts);
    limiters.push(limiter);
    return limiter;
  }

  afterEach(() => {
    while (limiters.length > 0) limiters.pop()?.destroy();
  });

  it("permite los primeros intentos y bloquea al superar el máximo", () => {
    const limiter = crear({ maxIntentos: 3, ventanaMs: 60_000 });

    expect(limiter.verificar("ip1").permitido).toBe(true);
    expect(limiter.verificar("ip1").permitido).toBe(true);
    expect(limiter.verificar("ip1").permitido).toBe(true);
    expect(limiter.verificar("ip1").permitido).toBe(false);
  });

  it("las keys son independientes", () => {
    const limiter = crear({ maxIntentos: 1, ventanaMs: 60_000 });

    expect(limiter.verificar("ip1").permitido).toBe(true);
    expect(limiter.verificar("ip1").permitido).toBe(false);
    // Otra IP no está afectada por el bloqueo de ip1
    expect(limiter.verificar("ip2").permitido).toBe(true);
  });

  it("exito() libera la cuota: un login válido no consume intentos", () => {
    const limiter = crear({ maxIntentos: 2, ventanaMs: 60_000 });

    // 2 fallos + exito (login correcto) no debe bloquear
    limiter.verificar("ip1");
    limiter.verificar("ip1");
    limiter.exito("ip1");

    expect(limiter.verificar("ip1").permitido).toBe(true);
    expect(limiter.verificar("ip1").permitido).toBe(true);
    expect(limiter.verificar("ip1").permitido).toBe(false);
  });

  it("exito() con key inexistente no lanza error", () => {
    const limiter = crear();
    expect(() => limiter.exito("nunca-vista")).not.toThrow();
  });

  it("restantes refleja la cuota restante", () => {
    const limiter = crear({ maxIntentos: 3, ventanaMs: 60_000 });

    expect(limiter.verificar("k").restantes).toBe(2);
    expect(limiter.verificar("k").restantes).toBe(1);
    expect(limiter.verificar("k").restantes).toBe(0);
    expect(limiter.verificar("k").permitido).toBe(false);
  });
});
