/**
 * Handlers IPC de gestión de gastos.
 */
import { ipcMain } from "electron";
import { ctx } from "./context";

export function registrarGastosHandlers() {
  const servicios = ctx.getServicios();

  ipcMain.handle("gastos:crear", ctx.safeHandler(async (_event, datos: unknown) => {
    const resultado = await servicios.gastos.crear(datos as any);
    ctx.notificarCambio();
    return resultado;
  }, { auth: true }));

  ipcMain.handle("gastos:listarPorSesion", ctx.safeHandler(async (_event, sesionCajaId: number) => {
    return servicios.gastos.listarPorSesion(sesionCajaId);
  }, { auth: true }));

  ipcMain.handle("gastos:listarPorCategoria", ctx.safeHandler(async (_event, categoriaId: number, sesionCajaId?: number) => {
    return servicios.gastos.listarPorCategoria(categoriaId, sesionCajaId);
  }, { auth: true }));

  ipcMain.handle("gastos:obtenerTotalPorOrigen", ctx.safeHandler(async (_event, sesionCajaId: number) => {
    return servicios.gastos.obtenerTotalPorOrigen(sesionCajaId);
  }, { auth: true }));

  ipcMain.handle("gastos:listarCategorias", ctx.safeHandler(async () => {
    return servicios.gastos.listarCategorias();
  }, { auth: true }));

  ipcMain.handle("gastos:crearCategoria", ctx.safeHandler(async (_event, nombre: string) => {
    return servicios.gastos.crearCategoria(nombre);
  }, { auth: true }));
}
