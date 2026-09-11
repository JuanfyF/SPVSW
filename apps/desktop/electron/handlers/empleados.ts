/**
 * Handlers IPC de gestión de empleados.
 */
import { ipcMain } from "electron";
import { ctx } from "./context";

export function registrarEmpleadosHandlers() {
  const servicios = ctx.getServicios();

  ipcMain.handle("empleados:listar", ctx.safeHandler(async () => {
    return servicios.empleados.listar();
  }, { auth: true }));

  ipcMain.handle("empleados:obtenerPorId", ctx.safeHandler(async (_event, id: number) => {
    return servicios.empleados.obtenerPorId(id);
  }, { auth: true }));

  ipcMain.handle("empleados:crear", ctx.safeHandler(async (_event, datos: unknown) => {
    return servicios.empleados.crear(datos as any);
  }, { auth: true }));

  ipcMain.handle("empleados:actualizar", ctx.safeHandler(async (_event, id: number, datos: unknown) => {
    return servicios.empleados.actualizar(id, datos as any);
  }, { auth: true }));

  ipcMain.handle("empleados:desactivar", ctx.safeHandler(async (_event, id: number) => {
    return servicios.empleados.desactivar(id);
  }, { auth: true }));
}
