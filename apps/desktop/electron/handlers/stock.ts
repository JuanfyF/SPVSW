/**
 * Handlers IPC de gestión de stock.
 */
import { ipcMain } from "electron";
import { ctx } from "./context";

export function registrarStockHandlers() {
  const servicios = ctx.getServicios();

  ipcMain.handle("stock:registrarStock", ctx.safeHandler(async (_event, datos: unknown) => {
    const resultado = await servicios.stock.registrarStock(datos as any);
    ctx.logAuditoria("stock_registrado", undefined, { productoId: (datos as any).productoId, cantidadInicial: (datos as any).cantidadInicial });
    return resultado;
  }, { auth: true }));

  ipcMain.handle("stock:registrarReposicion", ctx.safeHandler(async (
    _event, productoId: number, sesionCajaId: number, cantidad: number, unidad?: "entero" | "porcion"
  ) => {
    const resultado = await servicios.stock.registrarReposicion(productoId, sesionCajaId, cantidad, unidad);
    ctx.logAuditoria("stock_reposicion", undefined, { productoId, sesionCajaId, cantidad, unidad });
    return resultado;
  }, { auth: true }));

  ipcMain.handle("stock:registrarCorte", ctx.safeHandler(async (_event, datos: unknown) => {
    const resultado = await servicios.stock.registrarCorte(datos as any);
    ctx.logAuditoria("stock_corte", undefined, { productoId: (datos as any).productoId, porcionesObtenidas: (datos as any).porcionesObtenidas });
    return resultado;
  }, { auth: true }));

  ipcMain.handle("stock:calcularAjusteCortesLote", ctx.safeHandler(async (_event, sesionCajaId: number) => {
    return servicios.stock.calcularAjusteCortesLote(sesionCajaId);
  }, { auth: true }));

  ipcMain.handle("stock:registrarMerma", ctx.safeHandler(async (_event, datos: unknown) => {
    const resultado = await servicios.stock.registrarMerma(datos as any);
    ctx.logAuditoria("stock_merma", undefined, { productoId: (datos as any).productoId, cantidad: (datos as any).cantidad, motivo: (datos as any).motivo });
    return resultado;
  }, { auth: true }));

  ipcMain.handle("stock:registrarCortesia", ctx.safeHandler(async (_event, datos: unknown) => {
    const resultado = await servicios.stock.registrarCortesia(datos as any);
    ctx.logAuditoria("stock_cortesia", undefined, { productoId: (datos as any).productoId, cantidad: (datos as any).cantidad });
    return resultado;
  }, { auth: true }));

  ipcMain.handle("stock:obtenerStockPorSesion", ctx.safeHandler(async (_event, sesionCajaId: number) => {
    return servicios.stock.obtenerStockPorSesion(sesionCajaId);
  }, { auth: true }));

  ipcMain.handle("stock:listarMermasPorSesion", ctx.safeHandler(async (_event, sesionCajaId: number) => {
    return servicios.stock.listarMermasPorSesion(sesionCajaId);
  }, { auth: true }));

  ipcMain.handle("stock:listarCortesiasPorSesion", ctx.safeHandler(async (_event, sesionCajaId: number) => {
    return servicios.stock.listarCortesiasPorSesion(sesionCajaId);
  }, { auth: true }));

  ipcMain.handle("stock:conciliarStock", ctx.safeHandler(async (
    _event, sesionCajaId: number, conteoFisicoPorProducto: unknown[]
  ) => {
    await servicios.stock.conciliarStock(sesionCajaId, conteoFisicoPorProducto as any);
    ctx.logAuditoria("stock_conciliado", undefined, { sesionCajaId, productos: (conteoFisicoPorProducto as any[]).length });
  }, { auth: true }));

  ipcMain.handle("stock:calcularVendido", ctx.safeHandler(async (
    _event, productoId: number, sesionCajaId: number, unidad?: string
  ) => {
    return servicios.stock.calcularVendidoPorSesion(productoId, sesionCajaId, unidad);
  }, { auth: true }));

  ipcMain.handle("stock:calcularVendidoLote", ctx.safeHandler(async (_event, sesionCajaId: number) => {
    return servicios.stock.calcularVendidoLote(sesionCajaId);
  }, { auth: true }));

  ipcMain.handle("stock:verificarDisponibilidad", ctx.safeHandler(async (
    _event, productoId: number, sesionCajaId: number, unidad: "entero" | "porcion", cantidadRequerida: number
  ) => {
    return servicios.stock.verificarDisponibilidad(productoId, sesionCajaId, unidad, cantidadRequerida);
  }, { auth: true }));
}
