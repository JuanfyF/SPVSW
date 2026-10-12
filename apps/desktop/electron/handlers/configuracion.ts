/**
 * Handlers IPC de configuración del negocio (fila única).
 * obtener: público (el login muestra el nombre del negocio).
 * guardar: solo propietario (identidad del negocio).
 */
import { ipcMain } from "electron";
import { ctx } from "./context";

export function registrarConfiguracionHandlers() {
  const servicios = ctx.getServicios();

  ipcMain.handle("configuracion:obtener", ctx.safeHandler(async () => {
    return servicios.configuracion.obtener();
  }));

  ipcMain.handle("configuracion:guardar", ctx.safeHandler(async (_event, datos: unknown) => {
    const antes = await servicios.configuracion.obtener();
    const resultado = await servicios.configuracion.guardar(datos as any);
    const nuevos = datos as { nombreNegocio?: string };
    ctx.logAuditoria("configuracion_guardada", undefined, {
      nombreAntes: antes.nombreNegocio,
      nombreNuevo: nuevos.nombreNegocio ?? antes.nombreNegocio,
    });
    return resultado;
  }, { admin: true }));
}
