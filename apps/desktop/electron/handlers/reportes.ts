/**
 * Handlers IPC de generación de reportes.
 */
import { ipcMain } from "electron";
import { ctx } from "./context";

export function registrarReportesHandlers() {
  const servicios = ctx.getServicios();

  ipcMain.handle("reportes:reporteDiario", ctx.safeHandler(async (_event, fecha: string) => {
    return servicios.reportes.reporteDiario(fecha);
  }, { auth: true }));

  ipcMain.handle("reportes:reportePorFechas", ctx.safeHandler(async (_event, fechaInicio: string, fechaFin: string) => {
    return servicios.reportes.reportePorFechas(fechaInicio, fechaFin);
  }, { auth: true }));

  ipcMain.handle("reportes:listarCierresPorRango", ctx.safeHandler(async (_event, fechaInicio: string, fechaFin: string) => {
    return servicios.reportes.listarCierresPorRango(fechaInicio, fechaFin);
  }, { auth: true }));

  ipcMain.handle("reportes:reportePedidosPendientes", ctx.safeHandler(async () => {
    return servicios.reportes.reportePedidosPendientes();
  }, { auth: true }));

  ipcMain.handle("reportes:reporteProductosMasVendidos", ctx.safeHandler(async (_event, fechaInicio: string, fechaFin: string) => {
    return servicios.reportes.reporteProductosMasVendidos(fechaInicio, fechaFin);
  }, { auth: true }));
}
