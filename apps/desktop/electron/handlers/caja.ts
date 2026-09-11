/**
 * Handlers IPC de gestión de caja.
 */
import { ipcMain } from "electron";
import { ctx } from "./context";

export function registrarCajaHandlers() {
  const servicios = ctx.getServicios();

  ipcMain.handle("caja:abrir", ctx.safeHandler(async (_event, datos: unknown) => {
    const resultado = await servicios.caja.abrir(datos as any);
    ctx.notificarCambio();
    return resultado;
  }, { auth: true }));

  ipcMain.handle("caja:cerrar", ctx.safeHandler(async (_event, datos: unknown) => {
    const resultado = await servicios.caja.cerrar(datos as any);
    ctx.notificarCambio();
    return resultado;
  }, { auth: true }));

  ipcMain.handle("caja:obtenerSesionAbierta", ctx.safeHandler(async (_event, usuarioId: number) => {
    return servicios.caja.obtenerSesionAbierta(usuarioId);
  }, { auth: true }));

  ipcMain.handle("caja:calcularEfectivoEsperado", ctx.safeHandler(async (_event, sesionCajaId: number) => {
    return servicios.caja.calcularEfectivoEsperado(sesionCajaId);
  }, { auth: true }));

  ipcMain.handle("caja:obtenerTotalDevoluciones", ctx.safeHandler(async (_event, sesionCajaId: number) => {
    return servicios.caja.obtenerTotalDevoluciones(sesionCajaId);
  }, { auth: true }));

  ipcMain.handle("caja:forzarCierre", ctx.safeHandler(async (_event, sesionCajaId: number, usuarioId: number) => {
    return servicios.caja.forzarCierre(sesionCajaId, usuarioId);
  }, { admin: true }));

  ipcMain.handle("caja:marcarRevisado", ctx.safeHandler(async (_event, cierreCajaId: number, usuarioId: number) => {
    return servicios.caja.marcarRevisado(cierreCajaId, usuarioId);
  }, { auth: true }));
}
