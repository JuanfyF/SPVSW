/**
 * Handlers IPC de gestión de usuarios.
 */
import { ipcMain } from "electron";
import { crearRateLimiter } from "@pos/shared";
import { ctx } from "./context";

const resetRateLimit = crearRateLimiter({ maxIntentos: 2, ventanaMs: 60 * 60 * 1000 });

export function registrarUsuariosHandlers() {
  const servicios = ctx.getServicios();

  ipcMain.handle("usuarios:listar", ctx.safeHandler(async () => {
    return servicios.usuarios.listar();
  }, { admin: true }));

  ipcMain.handle("usuarios:listarPublico", ctx.safeHandler(async () => {
    const { permitido } = resetRateLimit.verificar("pin-recovery");
    if (!permitido) {
      throw new Error("Demasiadas solicitudes. Espere 1 hora.");
    }
    const todos = await servicios.usuarios.listar();
    return todos
      .filter((u: any) => u.rol === "pastelera")
      .map((u: any) => ({ id: u.id, nombre: u.nombre, rol: u.rol }));
  }));

  ipcMain.handle("usuarios:obtenerPorId", ctx.safeHandler(async (_event, id: number) => {
    return servicios.usuarios.obtenerPorId(id);
  }, { admin: true }));

  ipcMain.handle("usuarios:crear", ctx.safeHandler(async (_event, datos: unknown) => {
    return servicios.usuarios.crear(datos as any);
  }, { admin: true }));

  ipcMain.handle("usuarios:actualizar", ctx.safeHandler(async (_event, id: number, datos: unknown) => {
    return servicios.usuarios.actualizar(id, datos as any);
  }, { admin: true }));

  ipcMain.handle("usuarios:desactivar", ctx.safeHandler(async (_event, id: number) => {
    return servicios.usuarios.desactivar(id);
  }, { admin: true }));

  ipcMain.handle("usuarios:cambiarPin", ctx.safeHandler(async (_event, id: number, nuevoPin: string) => {
    return servicios.usuarios.cambiarPin(id, nuevoPin);
  }, { admin: true }));
}
