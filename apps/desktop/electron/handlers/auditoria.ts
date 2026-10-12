/**
 * Handlers IPC de auditoría (lectura de audit_log).
 * Acceso: solo propietario — el gate vive en safeHandler({ admin: true }).
 */
import { ipcMain } from "electron";
import { ctx } from "./context";

export function registrarAuditoriaHandlers() {
  const servicios = ctx.getServicios();

  ipcMain.handle("auditoria:listar", ctx.safeHandler(async (_event, filtros: unknown) => {
    return servicios.auditoria.listar(filtros);
  }, { admin: true }));
}
