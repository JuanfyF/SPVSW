/**
 * Handlers IPC de gestión de usuarios.
 * Acceso: propietario y cajero (gestores); las operaciones sobre la cuenta
 * del propietario están reservadas al propietario (reglas en @pos/core).
 */
import { ipcMain } from "electron";
import { crearRateLimiter } from "@pos/shared";
import { ctx } from "./context";
import type { ActorUsuario } from "@pos/core";

const resetRateLimit = crearRateLimiter({ maxIntentos: 2, ventanaMs: 60 * 60 * 1000 });

function actorActual(): ActorUsuario {
  const u = ctx.getUsuarioActual();
  if (!u) throw new Error("Sesión no válida. Inicie sesión nuevamente.");
  return { id: u.id, rol: u.rol };
}

export function registrarUsuariosHandlers() {
  const servicios = ctx.getServicios();

  ipcMain.handle("usuarios:listar", ctx.safeHandler(async () => {
    return servicios.usuarios.listar();
  }, { gestores: true }));

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
  }, { gestores: true }));

  ipcMain.handle("usuarios:crear", ctx.safeHandler(async (_event, datos: unknown) => {
    const resultado = await servicios.usuarios.crear(datos as any, actorActual());
    ctx.logAuditoria("usuario_creado", undefined, { usuarioId: resultado?.id, nombre: resultado?.nombre, rol: resultado?.rol });
    return resultado;
  }, { gestores: true }));

  ipcMain.handle("usuarios:actualizar", ctx.safeHandler(async (_event, id: number, datos: unknown) => {
    const resultado = await servicios.usuarios.actualizar(id, datos as any, actorActual());
    const cambios = datos as Record<string, unknown>;
    ctx.logAuditoria("usuario_actualizado", undefined, {
      usuarioId: id,
      nombre: resultado?.nombre ?? cambios.nombre,
      rol: resultado?.rol ?? cambios.rol,
    });
    return resultado;
  }, { gestores: true }));

  ipcMain.handle("usuarios:desactivar", ctx.safeHandler(async (_event, id: number) => {
    const usuario = await servicios.usuarios.obtenerPorId(id);
    const resultado = await servicios.usuarios.desactivar(id, actorActual());
    ctx.logAuditoria("usuario_desactivado", undefined, { usuarioId: id, nombre: usuario?.nombre, rol: usuario?.rol });
    return resultado;
  }, { gestores: true }));

  ipcMain.handle("usuarios:cambiarPin", ctx.safeHandler(async (_event, id: number, nuevoPin: string) => {
    // Auto-cambio (pantalla forzada tras un reset de PIN, ej. pastelera
    // con debeCambiarPin) permitido a cualquier rol; cambiar el PIN de
    // OTRO usuario requiere propietario/cajero.
    if (id !== ctx.getUsuarioActual()?.id) ctx.requireGestor();
    return servicios.usuarios.cambiarPin(id, nuevoPin, actorActual());
  }, { auth: true }));
}
