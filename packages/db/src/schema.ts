import {
  sqliteTable,
  text,
  integer,
  real,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

/* ============================================================
   CAMPOS COMUNES (se repiten en toda tabla transaccional)
   Sistema de un solo local: sin local_id ni sincronizado.
   Se conserva actualizado_en como campo de auditoría simple.
   ============================================================ */

const camposAuditoria = {
  actualizadoEn: text("actualizado_en")
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
};

/* ============================================================
   1. USUARIOS Y EMPLEADOS
   ============================================================ */

export const usuarios = sqliteTable("usuarios", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  nombre: text("nombre").notNull(),
  rol: text("rol", { enum: ["propietario", "cajero", "pastelera"] }).notNull(),
  pinHash: text("pin_hash").notNull(), // PIN individual, nunca compartido
  activo: integer("activo", { mode: "boolean" }).notNull().default(true),
  ...camposAuditoria,
});

export const empleados = sqliteTable("empleados", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  usuarioId: integer("usuario_id").references(() => usuarios.id), // nullable: no todo empleado tiene login
  nombre: text("nombre").notNull(),
  cargo: text("cargo").notNull(),
  salarioMensual: real("salario_mensual").notNull(),
  activo: integer("activo", { mode: "boolean" }).notNull().default(true),
  ...camposAuditoria,
});

/* ============================================================
   2. PRODUCTOS
   ============================================================ */

export const productos = sqliteTable("productos", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  nombre: text("nombre").notNull(),
  categoria: text("categoria"),
  tipoVenta: text("tipo_venta", {
    enum: ["entero", "porcion", "ambos"],
  }).notNull(),
  precioEntero: real("precio_entero"),
  precioPorcion: real("precio_porcion"),
  artesanal: integer("artesanal", { mode: "boolean" }).notNull().default(false), // 0% IVA (futuro SRI)
  activo: integer("activo", { mode: "boolean" }).notNull().default(true),
  ...camposAuditoria,
});

/* ============================================================
   3. SESIONES DE CAJA
   Una fila por cajero + apertura del día, no una fila por día fijo,
   porque puede haber más de un cajero el mismo día.
   ============================================================ */

export const sesionesCaja = sqliteTable("sesiones_caja", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  usuarioId: integer("usuario_id")
    .notNull()
    .references(() => usuarios.id),
  fecha: text("fecha").notNull(),
  horaApertura: text("hora_apertura").notNull(),
  horaCierre: text("hora_cierre"),
  estado: text("estado", { enum: ["abierta", "cerrada"] })
    .notNull()
    .default("abierta"),
  ...camposAuditoria,
});

/* ============================================================
   4. STOCK DIARIO Y MOVIMIENTOS DE PRODUCCIÓN
   ============================================================ */

export const stockDiario = sqliteTable(
  "stock_diario",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    productoId: integer("producto_id")
      .notNull()
      .references(() => productos.id),
    sesionCajaId: integer("sesion_caja_id")
      .notNull()
      .references(() => sesionesCaja.id),
    unidad: text("unidad", { enum: ["entero", "porcion"] }).notNull().default("entero"),
    fecha: text("fecha").notNull(),
    cantidadInicial: integer("cantidad_inicial").notNull().default(0),
    cantidadAgregada: integer("cantidad_agregada").notNull().default(0),
    conteoFisicoCierre: integer("conteo_fisico_cierre"),
    diferenciaDetectada: integer("diferencia_detectada"),
    ...camposAuditoria,
  },
  (table) => ({
    stockDiarioSesionProductoUnidadIdx: uniqueIndex(
      "stock_diario_sesion_producto_unidad_idx"
    ).on(table.sesionCajaId, table.productoId, table.unidad),
  })
);

// Corte de producto entero -> porciones (evento explícito, no automático)
export const cortesProducto = sqliteTable("cortes_producto", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  productoId: integer("producto_id")
    .notNull()
    .references(() => productos.id),
  sesionCajaId: integer("sesion_caja_id")
    .notNull()
    .references(() => sesionesCaja.id),
  fechaHora: text("fecha_hora")
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
  unidadesEnteras: integer("unidades_enteras").notNull().default(1),
  porcionesObtenidas: integer("porciones_obtenidas").notNull(), // ajustable, no siempre = estándar
  registradoPor: integer("registrado_por")
    .notNull()
    .references(() => usuarios.id),
  ...camposAuditoria,
});

// Merma: pérdida real, registrada en el momento con motivo
export const mermas = sqliteTable("mermas", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  productoId: integer("producto_id")
    .notNull()
    .references(() => productos.id),
  sesionCajaId: integer("sesion_caja_id")
    .notNull()
    .references(() => sesionesCaja.id),
  fechaHora: text("fecha_hora")
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
  cantidad: integer("cantidad").notNull(),
  unidad: text("unidad", { enum: ["entero", "porcion", "porcion_llevar"] }).notNull(),
  motivo: text("motivo").notNull(),
  registradoPor: integer("registrado_por")
    .notNull()
    .references(() => usuarios.id),
  ...camposAuditoria,
});

// Cortesía: sale del stock, no genera dinero, registro libre sin autorización previa
export const cortesias = sqliteTable("cortesias", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  productoId: integer("producto_id")
    .notNull()
    .references(() => productos.id),
  sesionCajaId: integer("sesion_caja_id")
    .notNull()
    .references(() => sesionesCaja.id),
  fechaHora: text("fecha_hora")
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
  cantidad: integer("cantidad").notNull(),
  unidad: text("unidad", { enum: ["entero", "porcion", "porcion_llevar"] }).notNull(),
  motivo: text("motivo"),
  cliente: text("cliente"),
  registradoPor: integer("registrado_por")
    .notNull()
    .references(() => usuarios.id),
  ...camposAuditoria,
});

/* ============================================================
   5. VENTAS
   ============================================================ */

export const ventas = sqliteTable("ventas", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sesionCajaId: integer("sesion_caja_id")
    .notNull()
    .references(() => sesionesCaja.id),
  fechaHora: text("fecha_hora")
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
  total: real("total").notNull(),
  metodoPago: text("metodo_pago", {
    enum: ["efectivo", "transferencia"],
  }).notNull(),
  tipoOrigen: text("tipo_origen", {
    enum: ["mostrador", "pedido", "cortesia"],
  }).notNull(),
  // Preparado para el futuro módulo de facturación SRI:
  requiereFactura: integer("requiere_factura", { mode: "boolean" })
    .notNull()
    .default(false),
  clienteIdentificacion: text("cliente_identificacion"),
  clienteNombre: text("cliente_nombre"),
  ...camposAuditoria,
});

export const ventaDetalle = sqliteTable("venta_detalle", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ventaId: integer("venta_id")
    .notNull()
    .references(() => ventas.id),
  productoId: integer("producto_id")
    .notNull()
    .references(() => productos.id),
  unidad: text("unidad", { enum: ["entero", "porcion", "porcion_llevar"] }).notNull(),
  cantidad: integer("cantidad").notNull(),
  precioUnitario: real("precio_unitario").notNull(),
  subtotal: real("subtotal").notNull(),
});

/* ============================================================
   6. PEDIDOS Y ANTICIPOS
   ============================================================ */

export const pedidos = sqliteTable("pedidos", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  cliente: text("cliente").notNull(),
  telefono: text("telefono"),
  fechaPedido: text("fecha_pedido").notNull(),
  fechaEntrega: text("fecha_entrega").notNull(),
  horaEntrega: text("hora_entrega").notNull().default("12:00"),
  estado: text("estado", {
    enum: ["pendiente", "en_proceso", "listo", "entregado", "cancelado"],
  })
    .notNull()
    .default("pendiente"),

  // Anticipo (obligatorio, monto libre)
  anticipo: real("anticipo").notNull(),
  metodoPagoAnticipo: text("metodo_pago_anticipo", {
    enum: ["efectivo", "transferencia"],
  }).notNull(),
  sesionCajaAnticipoId: integer("sesion_caja_anticipo_id")
    .notNull()
    .references(() => sesionesCaja.id),

  // Saldo (se cobra completo al entregar, o queda en 0 si el anticipo cubrió todo)
  totalEstimado: real("total_estimado").notNull(),
  saldoPendiente: real("saldo_pendiente").notNull(),
  metodoPagoSaldo: text("metodo_pago_saldo", {
    enum: ["efectivo", "transferencia"],
  }),
  sesionCajaEntregaId: integer("sesion_caja_entrega_id").references(
    () => sesionesCaja.id
  ),

  notas: text("notas"),
  // Preparado para facturación SRI:
  requiereFactura: integer("requiere_factura", { mode: "boolean" })
    .notNull()
    .default(false),
  clienteIdentificacion: text("cliente_identificacion"),

  ...camposAuditoria,
});

export const pedidoDetalle = sqliteTable("pedido_detalle", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  pedidoId: integer("pedido_id")
    .notNull()
    .references(() => pedidos.id),
  productoId: integer("producto_id").references(() => productos.id), // null si es personalizado
  descripcionPersonalizada: text("descripcion_personalizada"), // ej: "torta 3 pisos, diseño floral"
  unidad: text("unidad", { enum: ["entero", "porcion"] }).notNull().default("entero"),
  cantidad: integer("cantidad").notNull(),
  precioUnitario: real("precio_unitario").notNull(),
  subtotal: real("subtotal").notNull(),
});

export const devolucionesAnticipo = sqliteTable("devoluciones_anticipo", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  pedidoId: integer("pedido_id")
    .notNull()
    .references(() => pedidos.id),
  sesionCajaId: integer("sesion_caja_id")
    .notNull()
    .references(() => sesionesCaja.id),
  monto: real("monto").notNull(),
  fecha: text("fecha").notNull(),
  metodoDevolucion: text("metodo_devolucion", {
    enum: ["efectivo", "transferencia"],
  }).notNull(),
  motivo: text("motivo"),
  registradoPor: integer("registrado_por")
    .notNull()
    .references(() => usuarios.id),
  ...camposAuditoria,
});

/* ============================================================
   7. GASTOS
   ============================================================ */

export const categoriasGasto = sqliteTable("categorias_gasto", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  nombre: text("nombre").notNull(), // insumos, servicios, mantenimiento, otro
});

export const gastos = sqliteTable("gastos", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  fecha: text("fecha").notNull(),
  sesionCajaId: integer("sesion_caja_id")
    .notNull()
    .references(() => sesionesCaja.id),
  categoriaId: integer("categoria_id")
    .notNull()
    .references(() => categoriasGasto.id),
  descripcion: text("descripcion").notNull(),
  monto: real("monto").notNull(),
  origen: text("origen", { enum: ["caja", "pedidos"] }).notNull(),
  registradoPor: integer("registrado_por")
    .notNull()
    .references(() => usuarios.id),
  ...camposAuditoria,
});

/* ============================================================
   8. ADELANTOS DE SUELDO Y MULTAS
   ============================================================ */

// Adelanto: mueve dinero real de la caja el mismo día
export const adelantosSueldo = sqliteTable("adelantos_sueldo", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  empleadoId: integer("empleado_id")
    .notNull()
    .references(() => empleados.id),
  sesionCajaId: integer("sesion_caja_id")
    .notNull()
    .references(() => sesionesCaja.id),
  fecha: text("fecha").notNull(),
  monto: real("monto").notNull(),
  metodoPago: text("metodo_pago", {
    enum: ["efectivo", "transferencia"],
  }).notNull(),
  mesADescontar: text("mes_a_descontar").notNull(), // formato "YYYY-MM"
  descripcion: text("descripcion"),
  registradoPor: integer("registrado_por")
    .notNull()
    .references(() => usuarios.id),
  ...camposAuditoria,
});

// Multa: SOLO descuento contable de nómina, no toca caja ni sesión
export const multasEmpleado = sqliteTable("multas_empleado", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  empleadoId: integer("empleado_id")
    .notNull()
    .references(() => empleados.id),
  fecha: text("fecha").notNull(),
  monto: real("monto").notNull(),
  motivo: text("motivo").notNull(),
  mesADescontar: text("mes_a_descontar").notNull(),
  registradoPor: integer("registrado_por")
    .notNull()
    .references(() => usuarios.id),
  ...camposAuditoria,
});

/* ============================================================
   9. CIERRE DE CAJA
   Una fila por sesión de caja (1 a 1). Sin margen de tolerancia:
   cualquier diferencia queda pendiente de revisión.
   ============================================================ */

export const cierreCaja = sqliteTable("cierre_caja", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sesionCajaId: integer("sesion_caja_id")
    .notNull()
    .unique()
    .references(() => sesionesCaja.id),

  // Ventas de mostrador
  ventasEfectivo: real("ventas_efectivo").notNull().default(0),
  ventasTransferencia: real("ventas_transferencia").notNull().default(0),

  // Pedidos (anticipos + saldos cobrados en esta sesión)
  pedidosEfectivo: real("pedidos_efectivo").notNull().default(0),
  pedidosTransferencia: real("pedidos_transferencia").notNull().default(0),

  // Descuentos
  gastosCaja: real("gastos_caja").notNull().default(0),
  adelantosEfectivo: real("adelantos_efectivo").notNull().default(0),
  adelantosTransferencia: real("adelantos_transferencia").notNull().default(0),
  devolucionesAnticipoEfectivo: real("devoluciones_anticipo_efectivo")
    .notNull()
    .default(0),

  // Caja física (lo único que se cuenta a mano)
  efectivoEsperado: real("efectivo_esperado").notNull(),
  efectivoContado: real("efectivo_contado"),
  diferenciaEfectivo: real("diferencia_efectivo"),

  // Conciliación de stock
  tieneDiferenciaStock: integer("tiene_diferencia_stock", { mode: "boolean" })
    .notNull()
    .default(false),

  // Revisión (sin margen de tolerancia: toda diferencia se marca)
  estadoRevision: text("estado_revision", {
    enum: ["pendiente", "revisada"],
  })
    .notNull()
    .default("pendiente"),
  revisadoPor: integer("revisado_por").references(() => usuarios.id),
  revisadoEn: text("revisado_en"),

  ...camposAuditoria,
});

/* ============================================================
   10. COMPROBANTES (placeholder para el futuro módulo de facturación SRI)
   Aislado del resto: el módulo de ventas no sabe que esto existe.
   ============================================================ */

export const comprobantes = sqliteTable("comprobantes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ventaId: integer("venta_id")
    .notNull()
    .references(() => ventas.id),
  tipo: text("tipo", { enum: ["factura", "nota_venta"] }).notNull(),
  estado: text("estado", {
    enum: ["pendiente", "firmado", "enviado", "autorizado", "rechazado"],
  })
    .notNull()
    .default("pendiente"),
  xmlFirmado: text("xml_firmado"),
  claveAcceso: text("clave_acceso"),
  intentosEnvio: integer("intentos_envio").notNull().default(0),
  ultimoError: text("ultimo_error"),
  ...camposAuditoria,
});
