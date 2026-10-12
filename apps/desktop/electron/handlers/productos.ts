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
    const resultado = await servicios.productos.crear(datos as any);
    ctx.logAuditoria("producto_creado", undefined, {
      productoId: resultado?.id,
      nombre: resultado?.nombre,
      precioEntero: resultado?.precioEntero,
      precioPorcion: resultado?.precioPorcion,
    });
    ctx.notificarCambio();
    return resultado;
  }, { gestores: true }));

  ipcMain.handle("productos:actualizar", ctx.safeHandler(async (_event, id: number, datos: unknown) => {
    const antes = await servicios.productos.obtenerPorId(id);
    const resultado = await servicios.productos.actualizar(id, datos as any);
    ctx.logAuditoria("producto_actualizado", undefined, {
      productoId: id,
      nombreAntes: antes?.nombre,
      nombre: resultado?.nombre ?? antes?.nombre,
      precioEnteroAntes: antes?.precioEntero,
      precioEnteroDespues: resultado?.precioEntero ?? antes?.precioEntero,
      precioPorcionAntes: antes?.precioPorcion,
      precioPorcionDespues: resultado?.precioPorcion ?? antes?.precioPorcion,
    });
    ctx.notificarCambio();
    return resultado;
  }, { gestores: true }));

  ipcMain.handle("productos:desactivar", ctx.safeHandler(async (_event, id: number) => {
    const antes = await servicios.productos.obtenerPorId(id);
    await servicios.productos.desactivar(id);
    ctx.logAuditoria("producto_desactivado", undefined, { productoId: id, nombre: antes?.nombre });
    ctx.notificarCambio();
  }, { gestores: true }));

  ipcMain.handle("productos:buscar", ctx.safeHandler(async (_event, nombre: string) => {
    return servicios.productos.buscar(nombre);
  }, { auth: true }));
}
