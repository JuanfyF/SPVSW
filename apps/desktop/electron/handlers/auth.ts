/**
 * Handlers IPC de autenticación y sesión.
 */
import { ipcMain } from "electron";
import { crearRateLimiter } from "@pos/shared";
import { ctx } from "./context";

export function registrarAuthHandlers() {
  const servicios = ctx.getServicios();
  const rateLimit = crearRateLimiter();

  ipcMain.handle("auth:login", async (_event, pin: string, rol?: string) => {
    const { permitido, restantes } = rateLimit.verificar("desktop");
    if (!permitido) {
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
}
