/**
 * Handlers IPC de gestión de usuarios.
 */
import { ipcMain } from "electron";
import { ctx } from "./context";

export function registrarUsuariosHandlers() {
  const servicios = ctx.getServicios();

  ipcMain.handle("usuarios:listar", ctx.safeHandler(async () => {
    return servicios.usuarios.listar();
  }, { admin: true }));

  ipcMain.handle("usuarios:obtenerPorId", ctx.safeHandler(async (_event, id: number) => {
    return servicios.usuarios.obtenerPorId(id);
  }, { admin: true }));

  ipcMain.handle("usuarios:crear", ctx.safeHandler(async (_event, datos: unknown) => {
    return servicios.usuarios.crear(datos as any);
  }, { admin: true }));

  ipcMain.handle("usuarios:actualizar", ctx.safeHandler(async (_event, id: number, datos: unknown) => {
    return servicios.usuarios.actualizar(id, datos as any);
  }, { admin: true }));

  ipcMain.handle("usuarios:desactivar", ctx.safeHandler(async (_event, id: number) => {
    return servicios.usuarios.desactivar(id);
  }, { admin: true }));

  ipcMain.handle("usuarios:cambiarPin", ctx.safeHandler(async (_event, id: number, nuevoPin: string) => {
    return servicios.usuarios.cambiarPin(id, nuevoPin);
  }, { admin: true }));
}
