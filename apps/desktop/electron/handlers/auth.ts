/**
 * Handlers IPC de autenticación y sesión.
 */
import { ipcMain } from "electron";
import { crearRateLimiter, rateLimitPinReset } from "@pos/shared";
import { ctx } from "./context";

export function registrarAuthHandlers() {
  const servicios = ctx.getServicios();
  const rateLimit = crearRateLimiter();

  ipcMain.handle("auth:login", ctx.safeHandler(async (_event, pin: string, rol?: string) => {
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
  }));

  ipcMain.handle("auth:logout", ctx.safeHandler(async () => {
    const usuario = ctx.getUsuarioActual();
    if (usuario) ctx.logAuditoria("logout", usuario.id, { nombre: usuario.nombre });
    ctx.setUsuarioActual(null);
    ctx.limpiarSesionesTimeout();
    return true;
  }));

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

  ipcMain.handle("auth:restablecerPinPublico", ctx.safeHandler(async (_event, usuarioId: unknown) => {
    const { permitido } = rateLimitPinReset.verificar("pin-reset-publico");
    if (!permitido) {
      ctx.logAuditoria("pin_reset_bloqueado", undefined, { razon: "rate_limit" });
      throw new Error("Demasiadas solicitudes. Espere 1 hora.");
    }

    try {
      const resultado = await servicios.auth.restablecerPinPublico(usuarioId);
      ctx.logAuditoria("pin_reset_publico", undefined, {
        usuarioResetId: typeof usuarioId === "number" ? usuarioId : undefined,
        expiracion: resultado.expiracion,
      });
      return resultado;
    } catch (err) {
      ctx.logAuditoria("permiso_denegado", undefined, {
        operacion: "reset_pin_publico",
        usuarioId: typeof usuarioId === "number" ? usuarioId : undefined,
      });
      throw new Error("No se puede restablecer este PIN");
    }
  }));
}
