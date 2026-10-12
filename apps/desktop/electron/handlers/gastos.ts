/**
 * Handlers IPC de gestión de gastos.
 */
import { ipcMain } from "electron";
import { ctx } from "./context";

export function registrarGastosHandlers() {
  const servicios = ctx.getServicios();

  ipcMain.handle("gastos:crear", ctx.safeHandler(async (_event, datos: unknown) => {
    const resultado = await servicios.gastos.crear(datos as any);
    ctx.logAuditoria("gasto_creado", undefined, { gastoId: resultado?.id, monto: resultado?.monto, categoriaId: resultado?.categoriaId, descripcion: resultado?.descripcion });
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
    const resultado = await servicios.gastos.crearCategoria(nombre);
    ctx.logAuditoria("categoria_gasto_creada", undefined, { categoriaId: (resultado as { id?: number })?.id, nombre });
    return resultado;
  }, { auth: true }));
}
