/**
 * Handlers IPC de gestión de nómina.
 */
import { ipcMain } from "electron";
import { ctx } from "./context";

export function registrarNominaHandlers() {
  const servicios = ctx.getServicios();

  ipcMain.handle("nomina:registrarAdelanto", ctx.safeHandler(async (_event, datos: unknown) => {
    const resultado = await servicios.nomina.registrarAdelanto(datos as any);
    ctx.logAuditoria("adelanto_registrado", undefined, { adelantoId: resultado?.id, empleadoId: resultado?.empleadoId, monto: resultado?.monto });
    ctx.notificarCambio();
    return resultado;
  }, { gestores: true }));

  ipcMain.handle("nomina:registrarMulta", ctx.safeHandler(async (_event, datos: unknown) => {
    const resultado = await servicios.nomina.registrarMulta(datos as any);
    ctx.logAuditoria("multa_registrada", undefined, { multaId: resultado?.id, empleadoId: resultado?.empleadoId, monto: resultado?.monto, motivo: resultado?.motivo });
    ctx.notificarCambio();
    return resultado;
  }, { gestores: true }));

  ipcMain.handle("nomina:listarAdelantosPorEmpleado", ctx.safeHandler(async (_event, empleadoId: number) => {
    return servicios.nomina.listarAdelantosPorEmpleado(empleadoId);
  }, { gestores: true }));

  ipcMain.handle("nomina:listarAdelantosPorSesion", ctx.safeHandler(async (_event, sesionCajaId: number) => {
    return servicios.nomina.listarAdelantosPorSesion(sesionCajaId);
  }, { gestores: true }));

  ipcMain.handle("nomina:listarMultasPorEmpleado", ctx.safeHandler(async (_event, empleadoId: number) => {
    return servicios.nomina.listarMultasPorEmpleado(empleadoId);
  }, { gestores: true }));

  ipcMain.handle("nomina:calcularDescuentosMes", ctx.safeHandler(async (_event, empleadoId: number, mes: string) => {
    return servicios.nomina.calcularDescuentosMes(empleadoId, mes);
  }, { gestores: true }));

  ipcMain.handle("nomina:listarEmpleadosActivos", ctx.safeHandler(async () => {
    return servicios.nomina.listarEmpleadosActivos();
  }, { gestores: true }));

  ipcMain.handle("nomina:crearEmpleado", ctx.safeHandler(async (_event, datos: unknown) => {
    const resultado = await servicios.nomina.crearEmpleado(datos as any);
    ctx.logAuditoria("empleado_creado", undefined, { empleadoId: resultado?.id, nombre: resultado?.nombre, cargo: resultado?.cargo });
    ctx.notificarCambio();
    return resultado;
  }, { gestores: true }));
}
