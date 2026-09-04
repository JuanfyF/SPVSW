import { Request, Response, NextFunction } from "express";
import { crearServicioAuth } from "@pos/core";
import { randomUUID } from "crypto";

/**
 * Middleware de autenticación y control de roles para el servidor local.
 *
 * AGENT.md §2.7 — Roles:
 * - Administrador: acceso total
 * - Pastelera: solo stock, cortes, mermas, vista producción pedidos (solo lectura)
 *
 * AGENT.md §5.1 — OWASP: toda ruta valida el rol del PIN antes de ejecutar
 * cualquier acción — una pastelera nunca debe poder alcanzar, ni por URL directa,
 * una función de caja o ventas.
 */

export interface SesionUsuario {
  usuarioId: number;
  nombre: string;
  rol: "propietario" | "cajero" | "pastelera";
}

interface SesionConTimestamp {
  sesion: SesionUsuario;
  creadoEn: number;
}

// Almacenamiento temporal de sesiones con timestamps para TTL
const sesiones = new Map<string, SesionConTimestamp>();

// TTL de sesiones: 4 horas (en ms)
const SESION_TTL_MS = 4 * 60 * 60 * 1000;

// Intervalo de limpieza: cada 10 minutos
const LIMPIEZA_INTERVALO_MS = 10 * 60 * 1000;

/**
 * Limpia sesiones expiradas.
 */
function limpiarSesionesExpiradas() {
  const ahora = Date.now();
  for (const [token, datos] of sesiones.entries()) {
    if (ahora - datos.creadoEn > SESION_TTL_MS) {
      sesiones.delete(token);
    }
  }
}

// Iniciar limpieza periódica
setInterval(limpiarSesionesExpiradas, LIMPIEZA_INTERVALO_MS);

/**
 * Middleware que valida autenticación (token Bearer).
 * Rechaza sesiones expiradas (TTL).
 */
export function authMiddleware(auth: ReturnType<typeof crearServicioAuth>) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.path === "/auth/login") {
      return next();
    }

    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Token de autenticación requerido" });
    }

    const token = authHeader.slice(7);
    const datos = sesiones.get(token);

    if (!datos) {
      return res.status(401).json({ error: "Sesión inválida o expirada" });
    }

    // Verificar TTL
    if (Date.now() - datos.creadoEn > SESION_TTL_MS) {
      sesiones.delete(token);
      return res.status(401).json({ error: "Sesión expirada" });
    }

    (req as any).usuario = datos.sesion;
    next();
  };
}

/**
 * Middleware de control de roles.
 * Restringe acceso según el rol del usuario autenticado.
 *
 * @param rolesPermitidos - Roles que pueden acceder a la ruta.
 *   Ej: ["administrador"] → solo administradores
 *   Ej: ["administrador", "pastelera"] → ambos roles
 */
export function requerirRol(...rolesPermitidos: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const usuario = (req as any).usuario as SesionUsuario | undefined;
    if (!usuario) {
      return res.status(401).json({ error: "No autenticado" });
    }

    if (!rolesPermitidos.includes(usuario.rol)) {
      return res.status(403).json({
        error: "Acceso denegado para este rol",
      });
    }

    next();
  };
}

/**
 * Crea una sesión y retorna el token.
 */
export function crearSesion(usuario: SesionUsuario): string {
  const token = randomUUID();
  sesiones.set(token, { sesion: usuario, creadoEn: Date.now() });
  return token;
}

/**
 * Elimina una sesión (logout).
 */
export function eliminarSesion(token: string): void {
  sesiones.delete(token);
}

/**
 * Obtiene la información de una sesión.
 */
export function obtenerSesion(token: string) {
  return sesiones.get(token)?.sesion;
}
