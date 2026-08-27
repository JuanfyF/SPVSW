/**
 * Tipos para la API expuesta al renderer via contextBridge.
 * Esta interfaz define lo que está disponible en window.pos.
 */

export interface PosAPI {
  // ============================================================
  // AUTH
  // ============================================================
  auth: {
    login: (pin: string) => Promise<{
      usuario: { id: number; nombre: string; rol: string } | null;
      sesionAbierta: { id: number; usuarioId: number; fecha: string; horaApertura: string; estado: string } | null;
    }>;
    logout: () => Promise<boolean>;
    getUsuarioActual: () => Promise<{ id: number; nombre: string; rol: string } | null>;
  };

  // ============================================================
  // USUARIOS
  // ============================================================
  usuarios: {
    listar: () => Promise<Array<{
      id: number;
      nombre: string;
      rol: string;
      activo: boolean;
      actualizadoEn: string;
    }>>;
    obtenerPorId: (id: number) => Promise<{
      id: number;
      nombre: string;
      rol: string;
      pinHash: string;
      activo: boolean;
      actualizadoEn: string;
    } | null>;
    crear: (datos: { nombre: string; rol: string; pin: string }) => Promise<{
      id: number;
      nombre: string;
      rol: string;
      pinHash: string;
      activo: boolean;
      actualizadoEn: string;
    }>;
    actualizar: (id: number, datos: { nombre?: string; rol?: string }) => Promise<{
      id: number;
      nombre: string;
      rol: string;
      pinHash: string;
      activo: boolean;
      actualizadoEn: string;
    } | null>;
    desactivar: (id: number) => Promise<void>;
    cambiarPin: (id: number, nuevoPin: string) => Promise<void>;
  };

  // ============================================================
  // EMPLEADOS
  // ============================================================
  empleados: {
    listar: () => Promise<Array<{
      id: number;
      usuarioId: number | null;
      nombre: string;
      cargo: string;
      salarioMensual: number;
      activo: boolean;
      actualizadoEn: string;
    }>>;
    obtenerPorId: (id: number) => Promise<{
      id: number;
      usuarioId: number | null;
      nombre: string;
      cargo: string;
      salarioMensual: number;
      activo: boolean;
      actualizadoEn: string;
    } | null>;
    crear: (datos: {
      usuarioId?: number | null;
      nombre: string;
      cargo: string;
      salarioMensual: number;
    }) => Promise<{
      id: number;
      usuarioId: number | null;
      nombre: string;
      cargo: string;
      salarioMensual: number;
      activo: boolean;
      actualizadoEn: string;
    }>;
    actualizar: (id: number, datos: {
      nombre?: string;
      cargo?: string;
      salarioMensual?: number;
    }) => Promise<{
      id: number;
      usuarioId: number | null;
      nombre: string;
      cargo: string;
      salarioMensual: number;
      activo: boolean;
      actualizadoEn: string;
    } | null>;
    desactivar: (id: number) => Promise<void>;
  };

  // ============================================================
  // PRODUCTOS
  // ============================================================
  productos: {
    listar: () => Promise<Array<{
      id: number;
      nombre: string;
      categoria: string | null;
      tipoVenta: string;
      precioEntero: number | null;
      precioPorcion: number | null;
      artesanal: boolean;
      activo: boolean;
      actualizadoEn: string;
    }>>;
    obtenerPorId: (id: number) => Promise<{
      id: number;
      nombre: string;
      categoria: string | null;
      tipoVenta: string;
      precioEntero: number | null;
      precioPorcion: number | null;
      artesanal: boolean;
      activo: boolean;
      actualizadoEn: string;
    } | null>;
    crear: (datos: {
      nombre: string;
      categoria?: string | null;
      tipoVenta: string;
      precioEntero?: number | null;
      precioPorcion?: number | null;
      artesanal?: boolean;
    }) => Promise<{
      id: number;
      nombre: string;
      categoria: string | null;
      tipoVenta: string;
      precioEntero: number | null;
      precioPorcion: number | null;
      artesanal: boolean;
      activo: boolean;
      actualizadoEn: string;
    }>;
    actualizar: (id: number, datos: {
      nombre?: string;
      categoria?: string | null;
      tipoVenta?: string;
      precioEntero?: number | null;
      precioPorcion?: number | null;
      artesanal?: boolean;
    }) => Promise<{
      id: number;
      nombre: string;
      categoria: string | null;
      tipoVenta: string;
      precioEntero: number | null;
      precioPorcion: number | null;
      artesanal: boolean;
      activo: boolean;
      actualizadoEn: string;
    } | null>;
    desactivar: (id: number) => Promise<void>;
    buscar: (nombre: string) => Promise<Array<{
      id: number;
      nombre: string;
      categoria: string | null;
      tipoVenta: string;
      precioEntero: number | null;
      precioPorcion: number | null;
      artesanal: boolean;
      activo: boolean;
      actualizadoEn: string;
    }>>;
  };

  // ============================================================
  // CAJA
  // ============================================================
  caja: {
    abrir: (datos: {
      usuarioId: number;
      fecha: string;
      horaApertura: string;
    }) => Promise<{
      id: number;
      usuarioId: number;
      fecha: string;
      horaApertura: string;
      horaCierre: string | null;
      estado: string;
      actualizadoEn: string;
    }>;
    cerrar: (datos: {
      sesionCajaId: number;
      efectivoContado: number;
      tieneDiferenciaStock: boolean;
      revisadoPor?: number | null;
      conteoStock?: Array<{
        productoId: number;
        unidad: string;
        conteoFisico: number;
      }>;
    }) => Promise<{
      id: number;
      sesionCajaId: number;
      ventasEfectivo: number;
      ventasTransferencia: number;
      pedidosEfectivo: number;
      pedidosTransferencia: number;
      gastosCaja: number;
      adelantosEfectivo: number;
      adelantosTransferencia: number;
      devolucionesAnticipoEfectivo: number;
      efectivoEsperado: number;
      efectivoContado: number | null;
      diferenciaEfectivo: number | null;
      tieneDiferenciaStock: boolean;
      estadoRevision: string;
      revisadoPor: number | null;
      revisadoEn: string | null;
      actualizadoEn: string;
    }>;
    obtenerSesionAbierta: (usuarioId: number) => Promise<{
      id: number;
      usuarioId: number;
      fecha: string;
      horaApertura: string;
      horaCierre: string | null;
      estado: string;
      actualizadoEn: string;
    } | null>;
    calcularEfectivoEsperado: (sesionCajaId: number) => Promise<number>;
    obtenerTotalDevoluciones: (sesionCajaId: number) => Promise<number>;
    forzarCierre: (sesionCajaId: number, usuarioId: number) => Promise<{ exito: boolean }>;
    marcarRevisado: (cierreCajaId: number, usuarioId: number) => Promise<void>;
  };

  // ============================================================
  // STOCK
  // ============================================================
  stock: {
    registrarStock: (datos: {
      productoId: number;
      sesionCajaId: number;
      unidad?: string;
      fecha: string;
      cantidadInicial: number;
      cantidadAgregada?: number;
    }) => Promise<{
      id: number;
      productoId: number;
      sesionCajaId: number;
      unidad: string;
      fecha: string;
      cantidadInicial: number;
      cantidadAgregada: number;
      conteoFisicoCierre: number | null;
      diferenciaDetectada: number | null;
      actualizadoEn: string;
    }>;
    registrarReposicion: (
      productoId: number,
      sesionCajaId: number,
      cantidad: number,
      unidad?: string
    ) => Promise<{
      id: number;
      productoId: number;
      sesionCajaId: number;
      unidad: string;
      fecha: string;
      cantidadInicial: number;
      cantidadAgregada: number;
      conteoFisicoCierre: number | null;
      diferenciaDetectada: number | null;
      actualizadoEn: string;
    }>;
    registrarCorte: (datos: {
      productoId: number;
      sesionCajaId: number;
      unidadesEnteras?: number;
      porcionesObtenidas: number;
      registradoPor: number;
    }) => Promise<{
      id: number;
      productoId: number;
      sesionCajaId: number;
      fechaHora: string;
      unidadesEnteras: number;
      porcionesObtenidas: number;
      registradoPor: number;
      actualizadoEn: string;
    }>;
    registrarMerma: (datos: {
      productoId: number;
      sesionCajaId: number;
      cantidad: number;
      unidad: string;
      motivo: string;
      registradoPor: number;
    }) => Promise<{
      id: number;
      productoId: number;
      sesionCajaId: number;
      fechaHora: string;
      cantidad: number;
      unidad: string;
      motivo: string;
      registradoPor: number;
      actualizadoEn: string;
    }>;
    registrarCortesia: (datos: {
      productoId: number;
      sesionCajaId: number;
      cantidad: number;
      unidad: string;
      motivo?: string | null;
      cliente?: string | null;
      registradoPor: number;
    }) => Promise<{
      id: number;
      productoId: number;
      sesionCajaId: number;
      fechaHora: string;
      cantidad: number;
      unidad: string;
      motivo: string | null;
      cliente: string | null;
      registradoPor: number;
      actualizadoEn: string;
    }>;
    obtenerStockPorSesion: (sesionCajaId: number) => Promise<Array<{
      id: number;
      productoId: number;
      sesionCajaId: number;
      unidad: string;
      fecha: string;
      cantidadInicial: number;
      cantidadAgregada: number;
      conteoFisicoCierre: number | null;
      diferenciaDetectada: number | null;
      actualizadoEn: string;
    }>>;
    calcularVendido: (productoId: number, sesionCajaId: number, unidad?: string) => Promise<number>;
    calcularVendidoLote: (sesionCajaId: number) => Promise<Record<string, number>>;
    calcularAjusteCortesLote: (sesionCajaId: number) => Promise<Record<string, number>>;
    listarMermasPorSesion: (sesionCajaId: number) => Promise<Array<{
      id: number;
      productoId: number;
      sesionCajaId: number;
      fechaHora: string;
      cantidad: number;
      unidad: string;
      motivo: string;
      registradoPor: number;
      actualizadoEn: string;
    }>>;
    listarCortesiasPorSesion: (sesionCajaId: number) => Promise<Array<{
      id: number;
      productoId: number;
      sesionCajaId: number;
      fechaHora: string;
      cantidad: number;
      unidad: string;
      motivo: string | null;
      cliente: string | null;
      registradoPor: number;
      actualizadoEn: string;
    }>>;
    conciliarStock: (
      sesionCajaId: number,
      conteoFisicoPorProducto: Array<{
        productoId: number;
        unidad: string;
        conteoFisico: number;
      }>
    ) => Promise<void>;
    verificarDisponibilidad: (
      productoId: number,
      sesionCajaId: number,
      unidad: "entero" | "porcion",
      cantidadRequerida: number
    ) => Promise<{ suficiente: boolean; disponible: number }>;
  };

  // ============================================================
  // VENTAS
  // ============================================================
  ventas: {
    crear: (datos: {
      sesionCajaId: number;
      total: number;
      metodoPago: string;
      tipoOrigen: string;
      requiereFactura?: boolean;
      clienteIdentificacion?: string | null;
      clienteNombre?: string | null;
      detalles: Array<{
        productoId: number;
        unidad: string;
        cantidad: number;
        precioUnitario: number;
        subtotal: number;
      }>;
    }) => Promise<{
      id: number;
      sesionCajaId: number;
      fechaHora: string;
      total: number;
      metodoPago: string;
      tipoOrigen: string;
      requiereFactura: boolean;
      clienteIdentificacion: string | null;
      clienteNombre: string | null;
      actualizadoEn: string;
    }>;
    listarPorSesion: (sesionCajaId: number) => Promise<Array<{
      id: number;
      sesionCajaId: number;
      fechaHora: string;
      total: number;
      metodoPago: string;
      tipoOrigen: string;
      requiereFactura: boolean;
      clienteIdentificacion: string | null;
      clienteNombre: string | null;
      actualizadoEn: string;
    }>>;
    obtenerDetalle: (ventaId: number) => Promise<Array<{
      id: number;
      ventaId: number;
      productoId: number;
      unidad: string;
      cantidad: number;
      precioUnitario: number;
      subtotal: number;
    }>>;
    obtenerPorId: (id: number) => Promise<{
      id: number;
      sesionCajaId: number;
      fechaHora: string;
      total: number;
      metodoPago: string;
      tipoOrigen: string;
      requiereFactura: boolean;
      clienteIdentificacion: string | null;
      clienteNombre: string | null;
      actualizadoEn: string;
    } | null>;
  };

  // ============================================================
  // PEDIDOS
  // ============================================================
  pedidos: {
    crear: (datos: {
      cliente: string;
      telefono?: string | null;
      fechaPedido: string;
      fechaEntrega: string;
      horaEntrega?: string | null;
      anticipo: number;
      metodoPagoAnticipo: string;
      sesionCajaAnticipoId: number;
      totalEstimado: number;
      notas?: string | null;
      requiereFactura?: boolean;
      clienteIdentificacion?: string | null;
      detalles: Array<{
        productoId?: number | null;
        descripcionPersonalizada?: string | null;
        unidad?: "entero" | "porcion";
        cantidad: number;
        precioUnitario: number;
        subtotal: number;
      }>;
    }) => Promise<{
      id: number;
      cliente: string;
      telefono: string | null;
      fechaPedido: string;
      fechaEntrega: string;
      horaEntrega: string | null;
      estado: string;
      anticipo: number;
      metodoPagoAnticipo: string;
      sesionCajaAnticipoId: number;
      totalEstimado: number;
      saldoPendiente: number;
      metodoPagoSaldo: string | null;
      sesionCajaEntregaId: number | null;
      notas: string | null;
      requiereFactura: boolean;
      clienteIdentificacion: string | null;
      actualizadoEn: string;
    }>;
    marcarListo: (pedidoId: number) => Promise<void>;
    actualizarEstado: (pedidoId: number, nuevoEstado: string) => Promise<{ exito: boolean }>;
    entregar: (
      pedidoId: number,
      sesionCajaEntregaId: number,
      metodoPagoSaldo?: string
    ) => Promise<{ exito: boolean }>;
    revertirEntrega: (pedidoId: number) => Promise<{ exito: boolean }>;
    cancelar: (
      pedidoId: number,
      motivo: string,
      metodoDevolucion: string,
      registradoPor: number,
      sesionCajaDevolucionId?: number
    ) => Promise<void>;
    listarPorEstado: (estado: string) => Promise<Array<{
      id: number;
      cliente: string;
      telefono: string | null;
      fechaPedido: string;
      fechaEntrega: string;
      estado: string;
      anticipo: number;
      metodoPagoAnticipo: string;
      sesionCajaAnticipoId: number;
      totalEstimado: number;
      saldoPendiente: number;
      metodoPagoSaldo: string | null;
      sesionCajaEntregaId: number | null;
      notas: string | null;
      requiereFactura: boolean;
      clienteIdentificacion: string | null;
      actualizadoEn: string;
    }>>;
    listarActivos: () => Promise<Array<{
      id: number;
      cliente: string;
      telefono: string | null;
      fechaPedido: string;
      fechaEntrega: string;
      estado: string;
      anticipo: number;
      metodoPagoAnticipo: string;
      sesionCajaAnticipoId: number;
      totalEstimado: number;
      saldoPendiente: number;
      metodoPagoSaldo: string | null;
      sesionCajaEntregaId: number | null;
      notas: string | null;
      requiereFactura: boolean;
      clienteIdentificacion: string | null;
      actualizadoEn: string;
    }>>;
    listarTodos: () => Promise<Array<{
      id: number;
      cliente: string;
      telefono: string | null;
      fechaPedido: string;
      fechaEntrega: string;
      estado: string;
      anticipo: number;
      metodoPagoAnticipo: string;
      sesionCajaAnticipoId: number;
      totalEstimado: number;
      saldoPendiente: number;
      metodoPagoSaldo: string | null;
      sesionCajaEntregaId: number | null;
      notas: string | null;
      requiereFactura: boolean;
      clienteIdentificacion: string | null;
      actualizadoEn: string;
    }>>;
    listarPorSesionAnticipo: (sesionCajaId: number) => Promise<Array<{
      id: number;
      cliente: string;
      telefono: string | null;
      fechaPedido: string;
      fechaEntrega: string;
      estado: string;
      anticipo: number;
      metodoPagoAnticipo: string;
      sesionCajaAnticipoId: number;
      totalEstimado: number;
      saldoPendiente: number;
      metodoPagoSaldo: string | null;
      sesionCajaEntregaId: number | null;
      notas: string | null;
      requiereFactura: boolean;
      clienteIdentificacion: string | null;
      actualizadoEn: string;
    }>>;
    listarPorFecha: (fechaInicio: string, fechaFin: string) => Promise<Array<{
      id: number;
      cliente: string;
      telefono: string | null;
      fechaPedido: string;
      fechaEntrega: string;
      estado: string;
      anticipo: number;
      metodoPagoAnticipo: string;
      sesionCajaAnticipoId: number;
      totalEstimado: number;
      saldoPendiente: number;
      metodoPagoSaldo: string | null;
      sesionCajaEntregaId: number | null;
      notas: string | null;
      requiereFactura: boolean;
      clienteIdentificacion: string | null;
      actualizadoEn: string;
    }>>;
    obtenerPorId: (id: number) => Promise<{
      id: number;
      cliente: string;
      telefono: string | null;
      fechaPedido: string;
      fechaEntrega: string;
      estado: string;
      anticipo: number;
      metodoPagoAnticipo: string;
      sesionCajaAnticipoId: number;
      totalEstimado: number;
      saldoPendiente: number;
      metodoPagoSaldo: string | null;
      sesionCajaEntregaId: number | null;
      notas: string | null;
      requiereFactura: boolean;
      clienteIdentificacion: string | null;
      actualizadoEn: string;
    } | null>;
    obtenerDetalle: (pedidoId: number) => Promise<Array<{
      id: number;
      pedidoId: number;
      productoId: number | null;
      descripcionPersonalizada: string | null;
      unidad: "entero" | "porcion";
      cantidad: number;
      precioUnitario: number;
      subtotal: number;
    }>>;
    obtenerResumen: (pedidoId: number) => Promise<{
      pedido: {
        id: number;
        cliente: string;
        telefono: string | null;
        fechaPedido: string;
        fechaEntrega: string;
        estado: string;
        anticipo: number;
        metodoPagoAnticipo: string;
        sesionCajaAnticipoId: number;
        totalEstimado: number;
        saldoPendiente: number;
        metodoPagoSaldo: string | null;
        sesionCajaEntregaId: number | null;
        notas: string | null;
        requiereFactura: boolean;
        clienteIdentificacion: string | null;
        actualizadoEn: string;
      };
      detalles: Array<{
        id: number;
        pedidoId: number;
        productoId: number | null;
        descripcionPersonalizada: string | null;
        unidad: "entero" | "porcion";
        cantidad: number;
        precioUnitario: number;
        subtotal: number;
      }>;
      devoluciones: Array<{
        id: number;
        pedidoId: number;
        sesionCajaId: number;
        monto: number;
        fecha: string;
        metodoDevolucion: string;
        motivo: string | null;
      }>;
      totalPagado: number;
      saldoPendiente: number;
    } | null>;
  };

  // ============================================================
  // GASTOS
  // ============================================================
  gastos: {
    crear: (datos: {
      fecha: string;
      sesionCajaId: number;
      categoriaId: number;
      descripcion: string;
      monto: number;
      origen: string;
      registradoPor: number;
    }) => Promise<{
      id: number;
      fecha: string;
      sesionCajaId: number;
      categoriaId: number;
      descripcion: string;
      monto: number;
      origen: string;
      registradoPor: number;
      actualizadoEn: string;
    }>;
    listarPorSesion: (sesionCajaId: number) => Promise<Array<{
      id: number;
      fecha: string;
      sesionCajaId: number;
      categoriaId: number;
      descripcion: string;
      monto: number;
      origen: string;
      registradoPor: number;
      actualizadoEn: string;
    }>>;
    listarPorCategoria: (
      categoriaId: number,
      sesionCajaId?: number
    ) => Promise<Array<{
      id: number;
      fecha: string;
      sesionCajaId: number;
      categoriaId: number;
      descripcion: string;
      monto: number;
      origen: string;
      registradoPor: number;
      actualizadoEn: string;
    }>>;
    obtenerTotalPorOrigen: (sesionCajaId: number) => Promise<{
      caja: number;
      pedidos: number;
    }>;
    listarCategorias: () => Promise<Array<{
      id: number;
      nombre: string;
    }>>;
    crearCategoria: (nombre: string) => Promise<{
      id: number;
      nombre: string;
    }>;
  };

  // ============================================================
  // NÓMINA
  // ============================================================
  nomina: {
    registrarAdelanto: (datos: {
      empleadoId: number;
      sesionCajaId: number;
      fecha: string;
      monto: number;
      metodoPago: string;
      mesADescontar: string;
      descripcion?: string | null;
      registradoPor: number;
    }) => Promise<{
      id: number;
      empleadoId: number;
      sesionCajaId: number;
      fecha: string;
      monto: number;
      metodoPago: string;
      mesADescontar: string;
      descripcion: string | null;
      registradoPor: number;
      actualizadoEn: string;
    }>;
    registrarMulta: (datos: {
      empleadoId: number;
      fecha: string;
      monto: number;
      motivo: string;
      mesADescontar: string;
      registradoPor: number;
    }) => Promise<{
      id: number;
      empleadoId: number;
      fecha: string;
      monto: number;
      motivo: string;
      mesADescontar: string;
      registradoPor: number;
      actualizadoEn: string;
    }>;
    listarAdelantosPorEmpleado: (empleadoId: number) => Promise<Array<{
      id: number;
      empleadoId: number;
      sesionCajaId: number;
      fecha: string;
      monto: number;
      metodoPago: string;
      mesADescontar: string;
      descripcion: string | null;
      registradoPor: number;
      actualizadoEn: string;
    }>>;
    listarAdelantosPorSesion: (sesionCajaId: number) => Promise<Array<{
      id: number;
      empleadoId: number;
      sesionCajaId: number;
      fecha: string;
      monto: number;
      metodoPago: string;
      mesADescontar: string;
      descripcion: string | null;
      registradoPor: number;
      actualizadoEn: string;
    }>>;
    listarMultasPorEmpleado: (empleadoId: number) => Promise<Array<{
      id: number;
      empleadoId: number;
      fecha: string;
      monto: number;
      motivo: string;
      mesADescontar: string;
      registradoPor: number;
      actualizadoEn: string;
    }>>;
    calcularDescuentosMes: (
      empleadoId: number,
      mes: string
    ) => Promise<{
      salario: number;
      adelantosMes: number;
      multasMes: number;
      totalDescuentos: number;
      neto: number;
    }>;
    listarEmpleadosActivos: () => Promise<Array<{
      id: number;
      usuarioId: number | null;
      nombre: string;
      cargo: string;
      salarioMensual: number;
      activo: boolean;
      actualizadoEn: string;
    }>>;
    crearEmpleado: (datos: {
      nombre: string;
      cargo: string;
      salarioMensual: number;
      usuarioId?: number;
    }) => Promise<{
      id: number;
      usuarioId: number | null;
      nombre: string;
      cargo: string;
      salarioMensual: number;
      activo: boolean;
      actualizadoEn: string;
    }>;
  };

  // ============================================================
  // REPORTES
  // ============================================================
  reportes: {
    reporteDiario: (fecha: string) => Promise<{
      fecha: string;
      ventas: {
        efectivo: number; transferencia: number; total: number;
        cantidadEfectivo: number; cantidadTransferencia: number; cantidadTotal: number;
      };
      pedidos: {
        efectivo: number; transferencia: number; total: number;
        cantidadEfectivo: number; cantidadTransferencia: number; cantidadTotal: number;
      };
      gastos: {
        caja: number; pedidos: number; total: number;
        porCategoria: Array<{
          categoriaId: number;
          categoriaNombre: string;
          total: number;
          cantidad: number;
        }>;
      };
      adelantos: { efectivo: number; transferencia: number; total: number };
      multas: number;
      consolidado: {
        ingresosBrutos: number;
        egresosTotales: number;
        ingresoNeto: number;
      };
    }>;
    reportePorFechas: (
      fechaInicio: string,
      fechaFin: string
    ) => Promise<{
      fechaInicio: string;
      fechaFin: string;
      ventas: { efectivo: number; transferencia: number; total: number };
      gastos: { caja: number; pedidos: number; total: number };
      consolidado: {
        ingresosBrutos: number;
        egresosTotales: number;
        ingresoNeto: number;
      };
    }>;
    reportePedidosPendientes: () => Promise<Array<{
      id: number;
      cliente: string;
      fechaEntrega: string;
      estado: string;
      totalEstimado: number;
      saldoPendiente: number;
      notas: string | null;
      descripcion: string | null;
    }>>;
    reporteProductosMasVendidos: (
      fechaInicio: string,
      fechaFin: string
    ) => Promise<Array<{
      productoId: number;
      nombre: string;
      cantidad: number;
    }>>;
    listarCierresPorRango: (
      fechaInicio: string,
      fechaFin: string
    ) => Promise<{
      fechaInicio: string;
      fechaFin: string;
      cierres: Array<{
        id: number;
        sesionCajaId: number;
        fechaApertura: string;
        ventasEfectivo: number;
        ventasTransferencia: number;
        pedidosEfectivo: number;
        pedidosTransferencia: number;
        gastosCaja: number;
        adelantosEfectivo: number;
        adelantosTransferencia: number;
        devolucionesAnticipoEfectivo: number | null;
        efectivoEsperado: number;
        efectivoContado: number | null;
        diferenciaEfectivo: number | null;
        tieneDiferenciaStock: boolean;
        estadoRevision: string;
        cajeroNombre: string | null;
      }>;
      totales: {
        ventasEfectivo: number;
        ventasTransferencia: number;
        pedidosEfectivo: number;
        pedidosTransferencia: number;
        gastosCaja: number;
        adelantosEfectivo: number;
        adelantosTransferencia: number;
        devolucionesAnticipoEfectivo: number;
        efectivoEsperado: number;
        efectivoContado: number;
        diferenciaEfectivo: number;
      };
    }>;
  };

  // ============================================================
  // SISTEMA
  // ============================================================
  sistema: {
    getDbPath: () => Promise<string>;
    getVersion: () => Promise<string>;
    backup: (rutaDestino: string) => Promise<{ ok: boolean; ruta: string }>;
    restore: (rutaBackup: string) => Promise<{ ok: boolean }>;
  };
}

declare global {
  interface Window {
    pos: PosAPI;
  }
}
