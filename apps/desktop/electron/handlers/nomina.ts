/**
 * Handlers IPC de gestión de nómina.
 */
import { ipcMain } from "electron";
import { ctx } from "./context";

export function registrarNominaHandlers() {
  const servicios = ctx.getServicios();

  ipcMain.handle("nomina:registrarAdelanto", ctx.safeHandler(async (_event, datos: unknown) => {
    return servicios.nomina.registrarAdelanto(datos as any);
  }, { auth: true }));

  ipcMain.handle("nomina:registrarMulta", ctx.safeHandler(async (_event, datos: unknown) => {
    return servicios.nomina.registrarMulta(datos as any);
  }, { auth: true }));

  ipcMain.handle("nomina:listarAdelantosPorEmpleado", ctx.safeHandler(async (_event, empleadoId: number) => {
    return servicios.nomina.listarAdelantosPorEmpleado(empleadoId);
  }, { auth: true }));

  ipcMain.handle("nomina:listarAdelantosPorSesion", ctx.safeHandler(async (_event, sesionCajaId: number) => {
    return servicios.nomina.listarAdelantosPorSesion(sesionCajaId);
  }, { auth: true }));

  ipcMain.handle("nomina:listarMultasPorEmpleado", ctx.safeHandler(async (_event, empleadoId: number) => {
    return servicios.nomina.listarMultasPorEmpleado(empleadoId);
  }, { auth: true }));

  ipcMain.handle("nomina:calcularDescuentosMes", ctx.safeHandler(async (_event, empleadoId: number, mes: string) => {
    return servicios.nomina.calcularDescuentosMes(empleadoId, mes);
  }, { auth: true }));

  ipcMain.handle("nomina:listarEmpleadosActivos", ctx.safeHandler(async () => {
    return servicios.nomina.listarEmpleadosActivos();
  }, { auth: true }));

  ipcMain.handle("nomina:crearEmpleado", ctx.safeHandler(async (_event, datos: unknown) => {
    return servicios.nomina.crearEmpleado(datos as any);
  }, { auth: true }));
}
