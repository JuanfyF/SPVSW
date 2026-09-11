/**
 * Contexto compartido para todos los handlers IPC.
 * Mantiene estado global (sesión, servicios, DB) y provee helpers
 * (safeHandler, requireAuth, requireAdmin, reiniciarTimeoutSesion).
 */
import { BrowserWindow } from "electron";
import { auditLog, createDbWithSqlite } from "@pos/db";

type DbType = ReturnType<typeof createDbWithSqlite>["db"];
import {
  crearServicioAuth,
  crearServicioUsuarios,
  crearServicioEmpleados,
  crearServicioProductos,
  crearServicioCaja,
  crearServicioStock,
  crearServicioVentas,
  crearServicioPedidos,
  crearServicioGastos,
  crearServicioNomina,
  crearServicioReportes,
} from "@pos/core";

export interface UsuarioActual {
  id: number;
  nombre: string;
  rol: string;
}

export interface Servicios {
  auth: ReturnType<typeof crearServicioAuth>;
  usuarios: ReturnType<typeof crearServicioUsuarios>;
  empleados: ReturnType<typeof crearServicioEmpleados>;
  productos: ReturnType<typeof crearServicioProductos>;
  caja: ReturnType<typeof crearServicioCaja>;
  stock: ReturnType<typeof crearServicioStock>;
  ventas: ReturnType<typeof crearServicioVentas>;
  pedidos: ReturnType<typeof crearServicioPedidos>;
  gastos: ReturnType<typeof crearServicioGastos>;
  nomina: ReturnType<typeof crearServicioNomina>;
  reportes: ReturnType<typeof crearServicioReportes>;
}

export interface HandlerContext {
  getUsuarioActual: () => UsuarioActual | null;
  setUsuarioActual: (u: UsuarioActual | null) => void;
  getServicios: () => Servicios;
  getDb: () => DbType;
  getMainWindow: () => BrowserWindow | null;
  reiniciarTimeoutSesion: () => void;
  safeHandler: <T extends (...args: any[]) => Promise<any>>(fn: T, opts?: { auth?: boolean; admin?: boolean }) => T;
  requireAuth: () => void;
  requireAdmin: () => void;
  limpiarSesionesTimeout: () => void;
  logAuditoria: (evento: string, usuarioId?: number, detalle?: Record<string, unknown>) => void;
  notificarCambio: () => void;
}

const SESION_TIMEOUT_MS = 15 * 60 * 1000;
const SESION_AVISO_MS = 14 * 60 * 1000;

let _usuarioActual: UsuarioActual | null = null;
let _servicios: Servicios | null = null;
let _db: DbType | null = null;
let _mainWindow: BrowserWindow | null = null;
let _timeoutSesion: ReturnType<typeof setTimeout> | null = null;
let _timeoutAviso: ReturnType<typeof setTimeout> | null = null;

function _reiniciarTimeoutSesion() {
  if (_timeoutSesion) clearTimeout(_timeoutSesion);
  if (_timeoutAviso) clearTimeout(_timeoutAviso);
  if (_usuarioActual) {
    _timeoutAviso = setTimeout(() => {
      _mainWindow?.webContents.send("sesion:aviso");
    }, SESION_AVISO_MS);
    _timeoutSesion = setTimeout(() => {
      console.log("Sesión expirada por inactividad (15 min)");
      _usuarioActual = null;
      _mainWindow?.webContents.send("sesion:expirada");
    }, SESION_TIMEOUT_MS);
  }
}

function _requireAuth(): void {
  if (!_usuarioActual) {
    throw new Error("Sesión no válida. Inicie sesión nuevamente.");
  }
}

function _requireAdmin(): void {
  _requireAuth();
  if (_usuarioActual!.rol !== "propietario") {
    try {
      _db?.insert(auditLog).values({
        evento: "permiso_denegado",
        usuarioId: _usuarioActual!.id,
        detalle: JSON.stringify({ rol: _usuarioActual!.rol }),
        origen: "desktop",
      });
    } catch { /* audit logging es best-effort */ }
    throw new Error("No tiene permisos para realizar esta acción.");
  }
}

function _safeHandler<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  opts?: { auth?: boolean; admin?: boolean }
): T {
  return (async (...args: any[]) => {
    try {
      if (opts?.admin) _requireAdmin();
      else if (opts?.auth) _requireAuth();
      if (_usuarioActual) _reiniciarTimeoutSesion();
      return await fn(...args);
    } catch (err: any) {
      const message = err?.message ?? String(err);
      console.error(`[IPC Error] ${message}`);
      throw new Error(message);
    }
  }) as T;
}

function _logAuditoria(evento: string, usuarioId?: number, detalle?: Record<string, unknown>) {
  try {
    _db?.insert(auditLog).values({
      evento,
      usuarioId,
      detalle: detalle ? JSON.stringify(detalle) : undefined,
      origen: "desktop",
    });
  } catch { /* audit logging es best-effort */ }
}

function _notificarCambio() {
  _mainWindow?.webContents.send("data:cambio");
}

function _limpiarSesionesTimeout() {
  if (_timeoutSesion) { clearTimeout(_timeoutSesion); _timeoutSesion = null; }
  if (_timeoutAviso) { clearTimeout(_timeoutAviso); _timeoutAviso = null; }
}

export const ctx: HandlerContext = {
  getUsuarioActual: () => _usuarioActual,
  setUsuarioActual: (u) => { _usuarioActual = u; },
  getServicios: () => {
    if (!_servicios) throw new Error("Servicios no inicializados");
    return _servicios;
  },
  getDb: () => _db,
  getMainWindow: () => _mainWindow,
  reiniciarTimeoutSesion: _reiniciarTimeoutSesion,
  safeHandler: _safeHandler,
  requireAuth: _requireAuth,
  requireAdmin: _requireAdmin,
  limpiarSesionesTimeout: _limpiarSesionesTimeout,
  logAuditoria: _logAuditoria,
  notificarCambio: _notificarCambio,
};

/** Inicializa el contexto — llamar una vez al startup */
export function initContext(deps: {
  servicios: Servicios;
  db: DbType;
  mainWindow: BrowserWindow | null;
}) {
  _servicios = deps.servicios;
  _db = deps.db;
  _mainWindow = deps.mainWindow;
}

/** Actualiza la referencia de mainWindow después de crearla */
export function setMainWindow(win: BrowserWindow | null) {
  _mainWindow = win;
}
