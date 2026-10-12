/**
 * Handlers IPC de gestión de ventas.
 */
import { ipcMain } from "electron";
import { ctx } from "./context";

export function registrarVentasHandlers() {
  const servicios = ctx.getServicios();

  ipcMain.handle("ventas:crear", ctx.safeHandler(async (_event, datos: unknown) => {
    const resultado = await servicios.ventas.crear(datos as any);
    ctx.logAuditoria("venta_creada", undefined, { ventaId: resultado.id, total: resultado.total, metodoPago: resultado.metodoPago });
    ctx.notificarCambio();
    return resultado;
  }, { gestores: true }));

  ipcMain.handle("ventas:listarPorSesion", ctx.safeHandler(async (_event, sesionCajaId: number) => {
    return servicios.ventas.listarPorSesion(sesionCajaId);
  }, { gestores: true }));

  ipcMain.handle("ventas:obtenerDetalle", ctx.safeHandler(async (_event, ventaId: number) => {
    return servicios.ventas.obtenerDetalle(ventaId);
  }, { gestores: true }));

  ipcMain.handle("ventas:obtenerPorId", ctx.safeHandler(async (_event, id: number) => {
    return servicios.ventas.obtenerPorId(id);
  }, { gestores: true }));
}
