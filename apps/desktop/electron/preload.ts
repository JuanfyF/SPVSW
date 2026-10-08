import { contextBridge, ipcRenderer } from "electron";
import { limpiarErrorIPC } from "./utils/error-utils";

/**
 * API expuesta al renderer a través de contextBridge.
 * Cada función es un canal IPC específico y tipado.
 * NUNCA se expone ipcRenderer directo (AGENT.md 5.1, seguridad).
 */

/** Wrapper seguro de ipcRenderer.invoke que limpia errores. */
function invoke(canal: string, ...args: unknown[]): Promise<any> {
  return ipcRenderer.invoke(canal, ...args).catch((err) => {
    throw limpiarErrorIPC(err, canal);
  });
}

contextBridge.exposeInMainWorld("pos", {
  // ============================================================
  // AUTH
  // ============================================================
  auth: {
    login: (pin: string, rol?: string) => invoke("auth:login", pin, rol),
    logout: () => invoke("auth:logout"),
    getUsuarioActual: () => invoke("auth:getUsuarioActual"),
    restablecerPin: (usuarioId: number) => invoke("auth:restablecerPin", usuarioId),
    restablecerPinPublico: (usuarioId: number) => invoke("auth:restablecerPinPublico", usuarioId),
  },

  // ============================================================
  // USUARIOS
  // ============================================================
  usuarios: {
    listar: () => invoke("usuarios:listar"),
    listarPublico: () => invoke("usuarios:listarPublico"),
    obtenerPorId: (id: number) => invoke("usuarios:obtenerPorId", id),
    crear: (datos: unknown) => invoke("usuarios:crear", datos),
    actualizar: (id: number, datos: unknown) =>
      invoke("usuarios:actualizar", id, datos),
    desactivar: (id: number) => invoke("usuarios:desactivar", id),
    cambiarPin: (id: number, nuevoPin: string) =>
      invoke("usuarios:cambiarPin", id, nuevoPin),
  },

  // ============================================================
  // CONFIGURACIÓN DEL NEGOCIO
  // ============================================================
  configuracion: {
    obtener: () => invoke("configuracion:obtener"),
    guardar: (datos: { nombreNegocio: string }) =>
      invoke("configuracion:guardar", datos),
  },

  // ============================================================
  // EMPLEADOS
  // ============================================================
  empleados: {
    listar: () => invoke("empleados:listar"),
    obtenerPorId: (id: number) => invoke("empleados:obtenerPorId", id),
    crear: (datos: unknown) => invoke("empleados:crear", datos),
    actualizar: (id: number, datos: unknown) =>
      invoke("empleados:actualizar", id, datos),
    desactivar: (id: number) => invoke("empleados:desactivar", id),
  },

  // ============================================================
  // PRODUCTOS
  // ============================================================
  productos: {
    listar: () => invoke("productos:listar"),
    obtenerPorId: (id: number) => invoke("productos:obtenerPorId", id),
    crear: (datos: unknown) => invoke("productos:crear", datos),
    actualizar: (id: number, datos: unknown) =>
      invoke("productos:actualizar", id, datos),
    desactivar: (id: number) => invoke("productos:desactivar", id),
    buscar: (nombre: string) => invoke("productos:buscar", nombre),
  },

  // ============================================================
  // CAJA
  // ============================================================
  caja: {
    abrir: (datos: unknown) => invoke("caja:abrir", datos),
    cerrar: (datos: unknown) => invoke("caja:cerrar", datos),
    obtenerSesionAbierta: (usuarioId: number) =>
      invoke("caja:obtenerSesionAbierta", usuarioId),
    calcularEfectivoEsperado: (sesionCajaId: number) =>
      invoke("caja:calcularEfectivoEsperado", sesionCajaId),
    obtenerTotalDevoluciones: (sesionCajaId: number) =>
      invoke("caja:obtenerTotalDevoluciones", sesionCajaId),
    forzarCierre: (sesionCajaId: number, usuarioId: number) =>
      invoke("caja:forzarCierre", sesionCajaId, usuarioId),
    marcarRevisado: (cierreCajaId: number, usuarioId: number) =>
      invoke("caja:marcarRevisado", cierreCajaId, usuarioId),
  },

  // ============================================================
  // STOCK
  // ============================================================
  stock: {
    registrarStock: (datos: unknown) => invoke("stock:registrarStock", datos),
    registrarReposicion: (productoId: number, sesionCajaId: number, cantidad: number, unidad?: "entero" | "porcion") =>
      invoke("stock:registrarReposicion", productoId, sesionCajaId, cantidad, unidad),
    registrarCorte: (datos: unknown) => invoke("stock:registrarCorte", datos),
    registrarMerma: (datos: unknown) => invoke("stock:registrarMerma", datos),
    registrarCortesia: (datos: unknown) => invoke("stock:registrarCortesia", datos),
    obtenerStockPorSesion: (sesionCajaId: number) =>
      invoke("stock:obtenerStockPorSesion", sesionCajaId),
    listarMermasPorSesion: (sesionCajaId: number) =>
      invoke("stock:listarMermasPorSesion", sesionCajaId),
    listarCortesiasPorSesion: (sesionCajaId: number) =>
      invoke("stock:listarCortesiasPorSesion", sesionCajaId),
    conciliarStock: (sesionCajaId: number, conteoFisicoPorProducto: unknown[]) =>
      invoke("stock:conciliarStock", sesionCajaId, conteoFisicoPorProducto),
    calcularVendido: (productoId: number, sesionCajaId: number, unidad?: string) =>
      invoke("stock:calcularVendido", productoId, sesionCajaId, unidad),
    calcularVendidoLote: (sesionCajaId: number) =>
      invoke("stock:calcularVendidoLote", sesionCajaId),
    calcularAjusteCortesLote: (sesionCajaId: number) =>
      invoke("stock:calcularAjusteCortesLote", sesionCajaId),
    verificarDisponibilidad: (productoId: number, sesionCajaId: number, unidad: "entero" | "porcion", cantidadRequerida: number) =>
      invoke("stock:verificarDisponibilidad", productoId, sesionCajaId, unidad, cantidadRequerida),
  },

  // ============================================================
  // VENTAS
  // ============================================================
  ventas: {
    crear: (datos: unknown) => invoke("ventas:crear", datos),
    listarPorSesion: (sesionCajaId: number) =>
      invoke("ventas:listarPorSesion", sesionCajaId),
    obtenerDetalle: (ventaId: number) =>
      invoke("ventas:obtenerDetalle", ventaId),
    obtenerPorId: (id: number) => invoke("ventas:obtenerPorId", id),
  },

  // ============================================================
  // PEDIDOS
  // ============================================================
  pedidos: {
    crear: (datos: unknown) => invoke("pedidos:crear", datos),
    marcarListo: (pedidoId: number) => invoke("pedidos:marcarListo", pedidoId),
    actualizarEstado: (pedidoId: number, nuevoEstado: string) => invoke("pedidos:actualizarEstado", pedidoId, nuevoEstado),
    entregar: (pedidoId: number, sesionCajaEntregaId: number, metodoPagoSaldo?: string) =>
      invoke("pedidos:entregar", pedidoId, sesionCajaEntregaId, metodoPagoSaldo),
    revertirEntrega: (pedidoId: number) =>
      invoke("pedidos:revertirEntrega", pedidoId),
    cancelar: (pedidoId: number, motivo: string, metodoDevolucion: string, registradoPor: number, sesionCajaDevolucionId?: number) =>
      invoke("pedidos:cancelar", pedidoId, motivo, metodoDevolucion, registradoPor, sesionCajaDevolucionId),
    listarPorEstado: (estado: string) => invoke("pedidos:listarPorEstado", estado),
    listarActivos: () => invoke("pedidos:listarActivos"),
    listarTodos: () => invoke("pedidos:listarTodos"),
    listarPorSesionAnticipo: (sesionCajaId: number) => invoke("pedidos:listarPorSesionAnticipo", sesionCajaId),
    listarPorSesionEntrega: (sesionCajaId: number) => invoke("pedidos:listarPorSesionEntrega", sesionCajaId),
    listarPorFecha: (fechaInicio: string, fechaFin: string) =>
      invoke("pedidos:listarPorFecha", fechaInicio, fechaFin),
    obtenerPorId: (id: number) => invoke("pedidos:obtenerPorId", id),
    obtenerDetalle: (pedidoId: number) => invoke("pedidos:obtenerDetalle", pedidoId),
    obtenerResumen: (pedidoId: number) => invoke("pedidos:obtenerResumen", pedidoId),
  },

  // ============================================================
  // GASTOS
  // ============================================================
  gastos: {
    crear: (datos: unknown) => invoke("gastos:crear", datos),
    listarPorSesion: (sesionCajaId: number) =>
      invoke("gastos:listarPorSesion", sesionCajaId),
    listarPorCategoria: (categoriaId: number, sesionCajaId?: number) =>
      invoke("gastos:listarPorCategoria", categoriaId, sesionCajaId),
    obtenerTotalPorOrigen: (sesionCajaId: number) =>
      invoke("gastos:obtenerTotalPorOrigen", sesionCajaId),
    listarCategorias: () => invoke("gastos:listarCategorias"),
    crearCategoria: (nombre: string) => invoke("gastos:crearCategoria", nombre),
  },

  // ============================================================
  // NÓMINA
  // ============================================================
  nomina: {
    registrarAdelanto: (datos: unknown) => invoke("nomina:registrarAdelanto", datos),
    registrarMulta: (datos: unknown) => invoke("nomina:registrarMulta", datos),
    listarAdelantosPorEmpleado: (empleadoId: number) =>
      invoke("nomina:listarAdelantosPorEmpleado", empleadoId),
    listarAdelantosPorSesion: (sesionCajaId: number) =>
      invoke("nomina:listarAdelantosPorSesion", sesionCajaId),
    listarMultasPorEmpleado: (empleadoId: number) =>
      invoke("nomina:listarMultasPorEmpleado", empleadoId),
    calcularDescuentosMes: (empleadoId: number, mes: string) =>
      invoke("nomina:calcularDescuentosMes", empleadoId, mes),
    listarEmpleadosActivos: () => invoke("nomina:listarEmpleadosActivos"),
    crearEmpleado: (datos: unknown) => invoke("nomina:crearEmpleado", datos),
  },

  // ============================================================
  // REPORTES
  // ============================================================
  reportes: {
    reporteDiario: (fecha: string) => invoke("reportes:reporteDiario", fecha),
    reportePorFechas: (fechaInicio: string, fechaFin: string) =>
      invoke("reportes:reportePorFechas", fechaInicio, fechaFin),
    listarCierresPorRango: (fechaInicio: string, fechaFin: string) =>
      invoke("reportes:listarCierresPorRango", fechaInicio, fechaFin),
    reportePedidosPendientes: () => invoke("reportes:reportePedidosPendientes"),
    reporteProductosMasVendidos: (fechaInicio: string, fechaFin: string) =>
      invoke("reportes:reporteProductosMasVendidos", fechaInicio, fechaFin),
  },

  // ============================================================
  // SISTEMA
  // ============================================================
  sistema: {
    getDbPath: () => invoke("sistema:getDbPath"),
    getVersion: () => invoke("sistema:getVersion"),
    getRedLocal: () => invoke("sistema:getRedLocal"),
    backup: (rutaDestino: string) => invoke("sistema:backup", rutaDestino),
    restore: (rutaBackup: string) => invoke("sistema:restore", rutaBackup),
  },

  // ============================================================
  // EVENTOS (push notifications del main process)
  // ============================================================
  onCambio: (callback: () => void) => {
    ipcRenderer.on("data:cambio", callback);
    return () => {
      ipcRenderer.removeListener("data:cambio", callback);
    };
  },
  onSesionExpirada: (callback: () => void) => {
    ipcRenderer.on("sesion:expirada", callback);
    return () => {
      ipcRenderer.removeListener("sesion:expirada", callback);
    };
  },
  onSesionAviso: (callback: () => void) => {
    ipcRenderer.on("sesion:aviso", callback);
    return () => {
      ipcRenderer.removeListener("sesion:aviso", callback);
    };
  },
  extenderSesion: () => invoke("sesion:extender"),
  onUpdateProgress: (callback: (data: { percent: number; bytesPerSecond: number; transferred: number; total: number }) => void) => {
    const handler = (_event: any, data: any) => callback(data);
    ipcRenderer.on("update:progress", handler);
    return () => {
      ipcRenderer.removeListener("update:progress", handler);
    };
  },
});
