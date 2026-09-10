export interface RateLimitResult {
  permitido: boolean;
  restantes: number;
}

export interface RateLimiter {
  verificar(key: string): RateLimitResult;
  destroy(): void;
}

export function crearRateLimiter(opts?: {
  maxIntentos?: number;
  ventanaMs?: number;
}): RateLimiter {
  const MAX_INTENTOS = opts?.maxIntentos ?? 5;
  const VENTANA_MS = opts?.ventanaMs ?? 15 * 60 * 1000;
  const intentos = new Map<string, { count: number; resetAt: number }>();

  const interval = setInterval(() => {
    const ahora = Date.now();
    for (const [key, datos] of intentos.entries()) {
      if (ahora > datos.resetAt) intentos.delete(key);
    }
  }, 5 * 60 * 1000);

  if (typeof interval === "object" && "unref" in interval) {
    interval.unref();
  }

  return {
    verificar(key: string): RateLimitResult {
      const ahora = Date.now();
      const datos = intentos.get(key);

      if (!datos || ahora > datos.resetAt) {
        intentos.set(key, { count: 1, resetAt: ahora + VENTANA_MS });
        return { permitido: true, restantes: MAX_INTENTOS - 1 };
      }

      if (datos.count >= MAX_INTENTOS) {
        return { permitido: false, restantes: 0 };
      }

      datos.count++;
      return { permitido: true, restantes: MAX_INTENTOS - datos.count };
    },

    destroy() {
      clearInterval(interval);
      intentos.clear();
    },
  };
}
