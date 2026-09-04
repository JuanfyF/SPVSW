import { contextBridge, ipcRenderer } from "electron";

/**
 * API expuesta al renderer a través de contextBridge.
 * Cada función es un canal IPC específico y tipado.
 * NUNCA se expone ipcRenderer directo (AGENT.md 5.1, seguridad).
 */

contextBridge.exposeInMainWorld("pos", {
  // ============================================================
  // AUTH
  // ============================================================
  auth: {
    login: (pin: string, rol?: string) => ipcRenderer.invoke("auth:login", pin, rol),
    logout: () => ipcRenderer.invoke("auth:logout"),
    getUsuarioActual: () => ipcRenderer.invoke("auth:getUsuarioActual"),
    restablecerPin: (usuarioId: number) => ipcRenderer.invoke("auth:restablecerPin", usuarioId),
  },

  // ============================================================
  // USUARIOS
  // ============================================================
  usuarios: {
    listar: () => ipcRenderer.invoke("usuarios:listar"),
    obtenerPorId: (id: number) => ipcRenderer.invoke("usuarios:obtenerPorId", id),
    crear: (datos: unknown) => ipcRenderer.invoke("usuarios:crear", datos),
    actualizar: (id: number, datos: unknown) =>
      ipcRenderer.invoke("usuarios:actualizar", id, datos),
    desactivar: (id: number) => ipcRenderer.invoke("usuarios:desactivar", id),
    cambiarPin: (id: number, nuevoPin: string) =>
      ipcRenderer.invoke("usuarios:cambiarPin", id, nuevoPin),
  },

  // ============================================================
  // EMPLEADOS
  // ============================================================
  empleados: {
    listar: () => ipcRenderer.invoke("empleados:listar"),
    obtenerPorId: (id: number) => ipcRenderer.invoke("empleados:obtenerPorId", id),
    crear: (datos: unknown) => ipcRenderer.invoke("empleados:crear", datos),
    actualizar: (id: number, datos: unknown) =>
      ipcRenderer.invoke("empleados:actualizar", id, datos),
    desactivar: (id: number) => ipcRenderer.invoke("empleados:desactivar", id),
  },

  // ============================================================
  // PRODUCTOS
  // ============================================================
  productos: {
    listar: () => ipcRenderer.invoke("productos:listar"),
    obtenerPorId: (id: number) => ipcRenderer.invoke("productos:obtenerPorId", id),
    crear: (datos: unknown) => ipcRenderer.invoke("productos:crear", datos),
    actualizar: (id: number, datos: unknown) =>
      ipcRenderer.invoke("productos:actualizar", id, datos),
    desactivar: (id: number) => ipcRenderer.invoke("productos:desactivar", id),
    buscar: (nombre: string) => ipcRenderer.invoke("productos:buscar", nombre),
  },

  // ============================================================
  // CAJA
  // ============================================================
  caja: {
    abrir: (datos: unknown) => ipcRenderer.invoke("caja:abrir", datos),
    cerrar: (datos: unknown) => ipcRenderer.invoke("caja:cerrar", datos),
    obtenerSesionAbierta: (usuarioId: number) =>
      ipcRenderer.invoke("caja:obtenerSesionAbierta", usuarioId),
    calcularEfectivoEsperado: (sesionCajaId: number) =>
      ipcRenderer.invoke("caja:calcularEfectivoEsperado", sesionCajaId),
    obtenerTotalDevoluciones: (sesionCajaId: number) =>
      ipcRenderer.invoke("caja:obtenerTotalDevoluciones", sesionCajaId),
    forzarCierre: (sesionCajaId: number, usuarioId: number) =>
      ipcRenderer.invoke("caja:forzarCierre", sesionCajaId, usuarioId),
    marcarRevisado: (cierreCajaId: number, usuarioId: number) =>
      ipcRenderer.invoke("caja:marcarRevisado", cierreCajaId, usuarioId),
  },

  // ============================================================
  // STOCK
  // ============================================================
  stock: {
    registrarStock: (datos: unknown) => ipcRenderer.invoke("stock:registrarStock", datos),
    registrarReposicion: (productoId: number, sesionCajaId: number, cantidad: number, unidad?: "entero" | "porcion") =>
      ipcRenderer.invoke("stock:registrarReposicion", productoId, sesionCajaId, cantidad, unidad),
    registrarCorte: (datos: unknown) => ipcRenderer.invoke("stock:registrarCorte", datos),
    registrarMerma: (datos: unknown) => ipcRenderer.invoke("stock:registrarMerma", datos),
    registrarCortesia: (datos: unknown) => ipcRenderer.invoke("stock:registrarCortesia", datos),
    obtenerStockPorSesion: (sesionCajaId: number) =>
      ipcRenderer.invoke("stock:obtenerStockPorSesion", sesionCajaId),
    listarMermasPorSesion: (sesionCajaId: number) =>
      ipcRenderer.invoke("stock:listarMermasPorSesion", sesionCajaId),
    listarCortesiasPorSesion: (sesionCajaId: number) =>
      ipcRenderer.invoke("stock:listarCortesiasPorSesion", sesionCajaId),
    conciliarStock: (sesionCajaId: number, conteoFisicoPorProducto: unknown[]) =>
      ipcRenderer.invoke("stock:conciliarStock", sesionCajaId, conteoFisicoPorProducto),
    calcularVendido: (productoId: number, sesionCajaId: number, unidad?: string) =>
      ipcRenderer.invoke("stock:calcularVendido", productoId, sesionCajaId, unidad),
    calcularVendidoLote: (sesionCajaId: number) =>
      ipcRenderer.invoke("stock:calcularVendidoLote", sesionCajaId),
    calcularAjusteCortesLote: (sesionCajaId: number) =>
      ipcRenderer.invoke("stock:calcularAjusteCortesLote", sesionCajaId),
    verificarDisponibilidad: (productoId: number, sesionCajaId: number, unidad: "entero" | "porcion", cantidadRequerida: number) =>
      ipcRenderer.invoke("stock:verificarDisponibilidad", productoId, sesionCajaId, unidad, cantidadRequerida),
  },

  // ============================================================
  // VENTAS
  // ============================================================
  ventas: {
    crear: (datos: unknown) => ipcRenderer.invoke("ventas:crear", datos),
    listarPorSesion: (sesionCajaId: number) =>
      ipcRenderer.invoke("ventas:listarPorSesion", sesionCajaId),
    obtenerDetalle: (ventaId: number) =>
      ipcRenderer.invoke("ventas:obtenerDetalle", ventaId),
    obtenerPorId: (id: number) => ipcRenderer.invoke("ventas:obtenerPorId", id),
  },

  // ============================================================
  // PEDIDOS
  // ============================================================
  pedidos: {
    crear: (datos: unknown) => ipcRenderer.invoke("pedidos:crear", datos),
    marcarListo: (pedidoId: number) => ipcRenderer.invoke("pedidos:marcarListo", pedidoId),
    actualizarEstado: (pedidoId: number, nuevoEstado: string) => ipcRenderer.invoke("pedidos:actualizarEstado", pedidoId, nuevoEstado),
    entregar: (pedidoId: number, sesionCajaEntregaId: number, metodoPagoSaldo?: string) =>
      ipcRenderer.invoke("pedidos:entregar", pedidoId, sesionCajaEntregaId, metodoPagoSaldo),
    revertirEntrega: (pedidoId: number) =>
      ipcRenderer.invoke("pedidos:revertirEntrega", pedidoId),
    cancelar: (pedidoId: number, motivo: string, metodoDevolucion: string, registradoPor: number, sesionCajaDevolucionId?: number) =>
      ipcRenderer.invoke("pedidos:cancelar", pedidoId, motivo, metodoDevolucion, registradoPor, sesionCajaDevolucionId),
    listarPorEstado: (estado: string) => ipcRenderer.invoke("pedidos:listarPorEstado", estado),
    listarActivos: () => ipcRenderer.invoke("pedidos:listarActivos"),
    listarTodos: () => ipcRenderer.invoke("pedidos:listarTodos"),
    listarPorSesionAnticipo: (sesionCajaId: number) => ipcRenderer.invoke("pedidos:listarPorSesionAnticipo", sesionCajaId),
    listarPorFecha: (fechaInicio: string, fechaFin: string) =>
      ipcRenderer.invoke("pedidos:listarPorFecha", fechaInicio, fechaFin),
    obtenerPorId: (id: number) => ipcRenderer.invoke("pedidos:obtenerPorId", id),
    obtenerDetalle: (pedidoId: number) => ipcRenderer.invoke("pedidos:obtenerDetalle", pedidoId),
    obtenerResumen: (pedidoId: number) => ipcRenderer.invoke("pedidos:obtenerResumen", pedidoId),
  },

  // ============================================================
  // GASTOS
  // ============================================================
  gastos: {
    crear: (datos: unknown) => ipcRenderer.invoke("gastos:crear", datos),
    listarPorSesion: (sesionCajaId: number) =>
      ipcRenderer.invoke("gastos:listarPorSesion", sesionCajaId),
    listarPorCategoria: (categoriaId: number, sesionCajaId?: number) =>
      ipcRenderer.invoke("gastos:listarPorCategoria", categoriaId, sesionCajaId),
    obtenerTotalPorOrigen: (sesionCajaId: number) =>
      ipcRenderer.invoke("gastos:obtenerTotalPorOrigen", sesionCajaId),
    listarCategorias: () => ipcRenderer.invoke("gastos:listarCategorias"),
    crearCategoria: (nombre: string) => ipcRenderer.invoke("gastos:crearCategoria", nombre),
  },

  // ============================================================
  // NÓMINA
  // ============================================================
  nomina: {
    registrarAdelanto: (datos: unknown) => ipcRenderer.invoke("nomina:registrarAdelanto", datos),
    registrarMulta: (datos: unknown) => ipcRenderer.invoke("nomina:registrarMulta", datos),
    listarAdelantosPorEmpleado: (empleadoId: number) =>
      ipcRenderer.invoke("nomina:listarAdelantosPorEmpleado", empleadoId),
    listarAdelantosPorSesion: (sesionCajaId: number) =>
      ipcRenderer.invoke("nomina:listarAdelantosPorSesion", sesionCajaId),
    listarMultasPorEmpleado: (empleadoId: number) =>
      ipcRenderer.invoke("nomina:listarMultasPorEmpleado", empleadoId),
    calcularDescuentosMes: (empleadoId: number, mes: string) =>
      ipcRenderer.invoke("nomina:calcularDescuentosMes", empleadoId, mes),
    listarEmpleadosActivos: () => ipcRenderer.invoke("nomina:listarEmpleadosActivos"),
    crearEmpleado: (datos: unknown) => ipcRenderer.invoke("nomina:crearEmpleado", datos),
  },

  // ============================================================
  // REPORTES
  // ============================================================
  reportes: {
    reporteDiario: (fecha: string) => ipcRenderer.invoke("reportes:reporteDiario", fecha),
    reportePorFechas: (fechaInicio: string, fechaFin: string) =>
      ipcRenderer.invoke("reportes:reportePorFechas", fechaInicio, fechaFin),
    listarCierresPorRango: (fechaInicio: string, fechaFin: string) =>
      ipcRenderer.invoke("reportes:listarCierresPorRango", fechaInicio, fechaFin),
    reportePedidosPendientes: () => ipcRenderer.invoke("reportes:reportePedidosPendientes"),
    reporteProductosMasVendidos: (fechaInicio: string, fechaFin: string) =>
      ipcRenderer.invoke("reportes:reporteProductosMasVendidos", fechaInicio, fechaFin),
  },

  // ============================================================
  // SISTEMA
  // ============================================================
  sistema: {
    getDbPath: () => ipcRenderer.invoke("sistema:getDbPath"),
    getVersion: () => ipcRenderer.invoke("sistema:getVersion"),
    backup: (rutaDestino: string) => ipcRenderer.invoke("sistema:backup", rutaDestino),
    restore: (rutaBackup: string) => ipcRenderer.invoke("sistema:restore", rutaBackup),
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
});
