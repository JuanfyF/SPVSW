/**
 * Handlers IPC de autenticación y sesión.
 */
import { ipcMain } from "electron";
import { usuarios, eq } from "@pos/db";
import { crearRateLimiter, crearHashPin } from "@pos/shared";
import { ctx } from "./context";

const resetRateLimit = crearRateLimiter({ maxIntentos: 2, ventanaMs: 60 * 60 * 1000 });

export function registrarAuthHandlers() {
  const servicios = ctx.getServicios();
  const rateLimit = crearRateLimiter();

  ipcMain.handle("auth:login", async (_event, pin: string, rol?: string) => {
    const { permitido, restantes } = rateLimit.verificar("desktop");
    if (!permitido) {
      ctx.logAuditoria("login_bloqueado", undefined, { razon: "rate_limit" });
      throw new Error("Demasiados intentos. Espere 15 minutos.");
    }

    const usuario = await servicios.auth.login(pin);
    if (!usuario) {
      ctx.logAuditoria("login_fallido", undefined, { intentosRestantes: restantes });
      throw new Error(`PIN incorrecto. Intentos restantes: ${restantes}`);
    }

    if (rol && usuario.rol !== rol) {
      return { usuario: null, sesionAbierta: null };
    }

    ctx.setUsuarioActual(usuario);
    ctx.reiniciarTimeoutSesion();
    ctx.logAuditoria("login_exitoso", usuario.id, { nombre: usuario.nombre, rol: usuario.rol });

    let sesionAbierta = null;
    if (usuario) {
      sesionAbierta = await servicios.caja.obtenerSesionAbierta(usuario.id);
    }
    return { usuario, sesionAbierta };
  });

  ipcMain.handle("auth:logout", async () => {
    ctx.setUsuarioActual(null);
    ctx.limpiarSesionesTimeout();
    return true;
  });

  ipcMain.handle("sesion:extender", ctx.safeHandler(async () => {
    ctx.reiniciarTimeoutSesion();
  }, { auth: true }));

  ipcMain.handle("auth:getUsuarioActual", ctx.safeHandler(async () => {
    return ctx.getUsuarioActual();
  }, { auth: true }));

  ipcMain.handle("auth:restablecerPin", ctx.safeHandler(async (_event, usuarioId: number) => {
    const usuarioActual = ctx.getUsuarioActual()!;
    const resultado = await servicios.auth.restablecerPin(usuarioId, usuarioActual.id);
    ctx.logAuditoria("pin_reset", usuarioActual.id, { usuarioResetId: usuarioId, nombre: resultado.nombre });
    return resultado;
  }, { admin: true }));

  ipcMain.handle("auth:restablecerPinPublico", ctx.safeHandler(async (_event, usuarioId: number) => {
    const { permitido } = resetRateLimit.verificar("pin-reset-publico");
    if (!permitido) {
      ctx.logAuditoria("pin_reset_bloqueado", undefined, { usuarioId, razon: "rate_limit" });
      throw new Error("Demasiadas solicitudes. Espere 1 hora.");
    }

    const crypto = await import("crypto");
    const pinTemporal = String(crypto.randomInt(100000, 999999));
    const pinHash = await crearHashPin(pinTemporal);
    const expiracion = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const db = ctx.getDb();
    if (!db) throw new Error("Base de datos no disponible");
    await db
      .update(usuarios)
      .set({ pinHash, debeCambiarPin: true })
      .where(eq(usuarios.id, usuarioId));

    ctx.logAuditoria("pin_reset_publico", undefined, { usuarioId, expiracion });

    return { pinTemporal, expiracion };
  }));
}
