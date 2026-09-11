/**
 * Handlers IPC de gestión de productos.
 */
import { ipcMain } from "electron";
import { ctx } from "./context";

export function registrarProductosHandlers() {
  const servicios = ctx.getServicios();

  ipcMain.handle("productos:listar", ctx.safeHandler(async () => {
    return servicios.productos.listar();
  }, { auth: true }));

  ipcMain.handle("productos:obtenerPorId", ctx.safeHandler(async (_event, id: number) => {
    return servicios.productos.obtenerPorId(id);
  }, { auth: true }));

  ipcMain.handle("productos:crear", ctx.safeHandler(async (_event, datos: unknown) => {
    return servicios.productos.crear(datos as any);
  }, { auth: true }));

  ipcMain.handle("productos:actualizar", ctx.safeHandler(async (_event, id: number, datos: unknown) => {
    return servicios.productos.actualizar(id, datos as any);
  }, { auth: true }));

  ipcMain.handle("productos:desactivar", ctx.safeHandler(async (_event, id: number) => {
    return servicios.productos.desactivar(id);
  }, { auth: true }));

  ipcMain.handle("productos:buscar", ctx.safeHandler(async (_event, nombre: string) => {
    return servicios.productos.buscar(nombre);
  }, { auth: true }));
}
