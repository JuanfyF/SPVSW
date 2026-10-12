/**
 * Handlers IPC de gestión de empleados.
 */
import { ipcMain } from "electron";
import { ctx } from "./context";

export function registrarEmpleadosHandlers() {
  const servicios = ctx.getServicios();

  ipcMain.handle("empleados:listar", ctx.safeHandler(async () => {
    return servicios.empleados.listar();
  }, { gestores: true }));

  ipcMain.handle("empleados:obtenerPorId", ctx.safeHandler(async (_event, id: number) => {
    return servicios.empleados.obtenerPorId(id);
  }, { gestores: true }));

  ipcMain.handle("empleados:crear", ctx.safeHandler(async (_event, datos: unknown) => {
    const resultado = await servicios.empleados.crear(datos as any);
    ctx.logAuditoria("empleado_creado", undefined, { empleadoId: resultado?.id, nombre: resultado?.nombre, cargo: resultado?.cargo, salarioMensual: resultado?.salarioMensual });
    return resultado;
  }, { gestores: true }));

  ipcMain.handle("empleados:actualizar", ctx.safeHandler(async (_event, id: number, datos: unknown) => {
    const resultado = await servicios.empleados.actualizar(id, datos as any);
    const cambios = datos as Record<string, unknown>;
    ctx.logAuditoria("empleado_actualizado", undefined, {
      empleadoId: id,
      ...(cambios.nombre !== undefined ? { nombre: cambios.nombre } : {}),
      ...(cambios.cargo !== undefined ? { cargo: cambios.cargo } : {}),
      ...(cambios.salarioMensual !== undefined ? { salarioMensual: cambios.salarioMensual } : {}),
    });
    return resultado;
  }, { gestores: true }));

  ipcMain.handle("empleados:desactivar", ctx.safeHandler(async (_event, id: number) => {
    const resultado = await servicios.empleados.desactivar(id);
    ctx.logAuditoria("empleado_desactivado", undefined, { empleadoId: id });
    return resultado;
  }, { gestores: true }));
}
