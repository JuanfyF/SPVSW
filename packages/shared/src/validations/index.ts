/**
 * Esquemas Zod compartidos entre:
 *  - apps/desktop (formularios del renderer)
 *  - apps/local-server (validación de requests del celular de las pasteleras)
 *  - packages/core (validación antes de ejecutar reglas de negocio)
 *
 * Regla del AGENT.md 5.1: nunca confiar en datos del cliente sin validar aquí primero.
 */

import { z } from "zod";

// ============================================================
// UTILIDADES REUTILIZABLES
// ============================================================

/** ID numérico positivo entero (para PKs y FKs) */
export const IdSchema = z.number().int().positive("ID debe ser un entero positivo");

/** Fecha formato YYYY-MM-DD */
export const FechaSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha debe ser YYYY-MM-DD");

/** Mes formato YYYY-MM */
export const MesSchema = z.string().regex(/^\d{4}-\d{2}$/, "Mes debe ser YYYY-MM");

/** Teléfono: 7-15 dígitos, opcionalmente con + al inicio */
export const TelefonoSchema = z
  .string()
  .trim()
  .optional()
  .nullable()
  .refine(
    (val) => !val || /^\+?[\d\s\-()]{7,15}$/.test(val),
    "Teléfono debe tener 7-15 dígitos (puede incluir espacios, guiones, paréntesis)"
  );

/** Texto libre: max 255 chars */
export const TextoLibreSchema = (max = 255) => z.string().trim().max(max, `Máximo ${max} caracteres`);

// ============================================================
// ENUMS / LITERALES REUTILIZABLES
// ============================================================

export const RolSchema = z.enum(["propietario", "cajero", "pastelera"]);

export const MetodoPagoSchema = z.enum(["efectivo", "transferencia"]);

export const TipoVentaSchema = z.enum(["entero", "porcion", "ambos"]);

export const UnidadSchema = z.enum(["entero", "porcion", "porcion_llevar"]);

/** Unidad solo de stock (entero o porción, sin llevar) */
export const UnidadStockSchema = z.enum(["entero", "porcion"]);

export const TipoOrigenVentaSchema = z.enum(["mostrador", "pedido", "cortesia"]);

export const EstadoPedidoSchema = z.enum([
  "pendiente",
  "en_proceso",
  "listo",
  "entregado",
  "cancelado",
]);

export const EstadoSesionCajaSchema = z.enum(["abierta", "cerrada"]);

export const EstadoRevisionSchema = z.enum(["pendiente", "revisada"]);

export const TipoComprobanteSchema = z.enum(["factura", "nota_venta"]);

export const EstadoComprobanteSchema = z.enum([
  "pendiente",
  "firmado",
  "enviado",
  "autorizado",
  "rechazado",
]);

export const OrigenGastoSchema = z.enum(["caja", "pedidos"]);

// ============================================================
// ESQUEMAS DE ENTRADA — AUTH
// ============================================================

export const LoginSchema = z.object({
  pin: z
    .string()
    .min(4, "PIN debe tener al menos 4 dígitos")
    .max(6, "PIN no puede tener más de 6 dígitos")
    .regex(/^\d+$/, "PIN solo debe contener números"),
});

// ============================================================
// ESQUEMAS DE ENTRADA — USUARIOS
// ============================================================

export const CrearUsuarioSchema = z.object({
  nombre: z.string().trim().min(1, "Nombre es requerido").max(100),
  rol: RolSchema,
  pin: z
    .string()
    .min(4, "PIN debe tener al menos 4 dígitos")
    .max(6, "PIN no puede tener más de 6 dígitos")
    .regex(/^\d+$/, "PIN solo debe contener números"),
});

export const ActualizarUsuarioSchema = z.object({
  nombre: z.string().trim().min(1, "Nombre es requerido").max(100).optional(),
  rol: RolSchema.optional(),
  activo: z.boolean().optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: "Debe proporcionar al menos un campo para actualizar",
});

export const CambiarPinSchema = z.object({
  nuevoPin: z
    .string()
    .min(4, "PIN debe tener al menos 4 dígitos")
    .max(6, "PIN no puede tener más de 6 dígitos")
    .regex(/^\d+$/, "PIN solo debe contener números"),
  confirmarPin: z.string(),
}).refine((data) => data.nuevoPin === data.confirmarPin, {
  message: "Los PINs no coinciden",
  path: ["confirmarPin"],
});

// ============================================================
// ESQUEMAS DE ENTRADA — EMPLEADOS
// ============================================================

export const CrearEmpleadoSchema = z.object({
  usuarioId: z.number().int().positive().nullable().optional(),
  nombre: z.string().trim().min(1, "Nombre es requerido").max(100),
  cargo: z.string().trim().min(1, "Cargo es requerido").max(100),
  salarioMensual: z.number().min(0, "Salario no puede ser negativo"),
});

export const ActualizarEmpleadoSchema = z.object({
  nombre: z.string().trim().min(1).max(100).optional(),
  cargo: z.string().trim().min(1).max(100).optional(),
  salarioMensual: z.number().min(0).optional(),
  activo: z.boolean().optional(),
  usuarioId: z.number().int().positive().nullable().optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: "Debe proporcionar al menos un campo para actualizar",
});

// ============================================================
// ESQUEMAS DE ENTRADA — PRODUCTOS
// ============================================================

export const CrearProductoSchema = z.object({
  nombre: z.string().trim().min(1, "Nombre es requerido").max(150),
  categoria: z.string().trim().max(100).nullable().optional(),
  tipoVenta: TipoVentaSchema,
  precioEntero: z.number().positive().nullable().optional(),
  precioPorcion: z.number().positive().nullable().optional(),
  artesanal: z.boolean().optional().default(false),
});

export const ActualizarProductoSchema = z.object({
  nombre: z.string().trim().min(1).max(150).optional(),
  categoria: z.string().trim().max(100).nullable().optional(),
  tipoVenta: TipoVentaSchema.optional(),
  precioEntero: z.number().min(0).nullable().optional(),
  precioPorcion: z.number().min(0).nullable().optional(),
  artesanal: z.boolean().optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: "Debe proporcionar al menos un campo para actualizar",
});

export const BuscarProductoSchema = z.object({
  nombre: z.string().trim().min(1, "Nombre de búsqueda requerido").max(150),
});

// ============================================================
// ESQUEMAS DE ENTRADA — CAJA
// ============================================================

export const AbrirSesionCajaSchema = z.object({
  usuarioId: z.number().int().positive(),
  fecha: FechaSchema,
  horaApertura: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Hora inválida"),
});

export const CerrarCajaSchema = z.object({
  sesionCajaId: z.number().int().positive(),
  efectivoContado: z.number().min(0),
  tieneDiferenciaStock: z.boolean(),
  revisadoPor: z.number().int().positive().nullable().optional(),
  conteoStock: z.array(z.object({
    productoId: z.number().int().positive(),
    unidad: UnidadStockSchema.default("entero"),
    conteoFisico: z.number().min(0),
  })).optional(),
});

export const MarcarRevisadoSchema = z.object({
  cierreCajaId: z.number().int().positive(),
  usuarioId: z.number().int().positive(),
});

// ============================================================
// ESQUEMAS DE ENTRADA — STOCK
// ============================================================

export const RegistrarStockDiarioSchema = z.object({
  productoId: z.number().int().positive(),
  sesionCajaId: z.number().int().positive(),
  unidad: UnidadStockSchema.default("entero"),
  fecha: FechaSchema,
  cantidadInicial: z.number().int().min(0),
  cantidadAgregada: z.number().int().min(0).optional().default(0),
});

export const RegistrarReposicionSchema = z.object({
  productoId: z.number().int().positive(),
  sesionCajaId: z.number().int().positive(),
  cantidad: z.number().int().positive("Cantidad debe ser positiva"),
  unidad: UnidadStockSchema,
});

export const RegistrarCorteSchema = z.object({
  productoId: z.number().int().positive(),
  sesionCajaId: z.number().int().positive(),
  unidadesEnteras: z.number().int().positive().default(1),
  porcionesObtenidas: z.number().int().positive(),
  registradoPor: z.number().int().positive(),
});

export const RegistrarMermaSchema = z.object({
  productoId: z.number().int().positive(),
  sesionCajaId: z.number().int().positive(),
  cantidad: z.number().int().positive("Cantidad debe ser positiva"),
  unidad: UnidadSchema,
  motivo: z.string().trim().min(1, "Motivo es requerido").max(255),
  registradoPor: z.number().int().positive(),
});

export const RegistrarCortesiaSchema = z.object({
  productoId: z.number().int().positive(),
  sesionCajaId: z.number().int().positive(),
  cantidad: z.number().int().positive(),
  unidad: UnidadSchema,
  motivo: z.string().trim().max(255).nullable().optional(),
  cliente: z.string().trim().max(100).nullable().optional(),
  registradoPor: z.number().int().positive(),
});

export const ConciliarStockSchema = z.object({
  sesionCajaId: z.number().int().positive(),
  conteoFisicoPorProducto: z.array(z.object({
    productoId: z.number().int().positive(),
    unidad: UnidadStockSchema,
    conteoFisico: z.number().int().min(0, "Conteo no puede ser negativo"),
  })).min(1, "Debe haber al menos un producto"),
});

// ============================================================
// ESQUEMAS DE ENTRADA — VENTAS
// ============================================================

export const CrearVentaDetalleSchema = z.object({
  productoId: z.number().int().positive(),
  unidad: UnidadSchema,
  cantidad: z.number().int().positive(),
  precioUnitario: z.number().min(0, "Precio no puede ser negativo"),
  subtotal: z.number().min(0, "Subtotal no puede ser negativo"),
});

export const CrearVentaSchema = z.object({
  sesionCajaId: z.number().int().positive(),
  total: z.number().min(0, "Total no puede ser negativo"),
  metodoPago: MetodoPagoSchema,
  tipoOrigen: TipoOrigenVentaSchema,
  requiereFactura: z.boolean().optional().default(false),
  clienteIdentificacion: z.string().max(20).nullable().optional(),
  clienteNombre: z.string().max(150).nullable().optional(),
  detalles: z.array(CrearVentaDetalleSchema).min(1, "Debe haber al menos un detalle"),
});

// ============================================================
// ESQUEMAS DE ENTRADA — PEDIDOS
// ============================================================

export const CrearPedidoDetalleSchema = z.object({
  productoId: z.number().int().positive().nullable().optional(),
  descripcionPersonalizada: z.string().trim().max(500).nullable().optional(),
  unidad: z.enum(["entero", "porcion"]).default("entero"),
  cantidad: z.number().int().positive(),
  precioUnitario: z.number().min(0, "Precio no puede ser negativo"),
  subtotal: z.number().min(0, "Subtotal no puede ser negativo"),
});

export const CrearPedidoSchema = z.object({
  cliente: z.string().trim().min(1, "Cliente es requerido").max(150),
  telefono: TelefonoSchema,
  fechaPedido: FechaSchema,
  fechaEntrega: FechaSchema,
  horaEntrega: z.string().regex(/^\d{2}:\d{2}$/, "Hora inválida (HH:MM)").optional().default("12:00"),
  anticipo: z.number().min(0, "Anticipo no puede ser negativo"),
  metodoPagoAnticipo: MetodoPagoSchema,
  sesionCajaAnticipoId: z.number().int().positive(),
  totalEstimado: z.number().min(0, "Total no puede ser negativo"),
  notas: z.string().trim().max(500).nullable().optional(),
  requiereFactura: z.boolean().optional().default(false),
  clienteIdentificacion: z.string().max(20).nullable().optional(),
  detalles: z.array(CrearPedidoDetalleSchema).min(1, "Debe haber al menos un detalle"),
});

export const EntregarPedidoSchema = z.object({
  pedidoId: z.number().int().positive(),
  sesionCajaEntregaId: z.number().int().positive().nullable().optional(),
  metodoPagoSaldo: MetodoPagoSchema.optional(),
});

export const CancelarPedidoSchema = z.object({
  pedidoId: z.number().int().positive(),
  motivo: z.string().trim().min(1, "Motivo es requerido").max(255),
  metodoDevolucion: MetodoPagoSchema,
  registradoPor: z.number().int().positive(),
});

export const ListarPedidosEstadoSchema = z.object({
  estado: EstadoPedidoSchema,
});

export const RegistrarDevolucionAnticipoSchema = z.object({
  pedidoId: z.number().int().positive(),
  sesionCajaId: z.number().int().positive(),
  monto: z.number().positive(),
  fecha: FechaSchema,
  metodoDevolucion: MetodoPagoSchema,
  motivo: z.string().trim().max(255).nullable().optional(),
  registradoPor: z.number().int().positive(),
});

// ============================================================
// ESQUEMAS DE ENTRADA — GASTOS
// ============================================================

export const CrearGastoSchema = z.object({
  fecha: FechaSchema,
  sesionCajaId: z.number().int().positive(),
  categoriaId: z.number().int().positive(),
  descripcion: z.string().trim().min(1, "Descripción es requerida").max(255),
  monto: z.number().positive(),
  origen: OrigenGastoSchema,
  registradoPor: z.number().int().positive(),
});

export const CrearCategoriaGastoSchema = z.object({
  nombre: z.string().trim().min(1, "Nombre es requerido").max(100),
});

// ============================================================
// ESQUEMAS DE ENTRADA — NÓMINA
// ============================================================

export const RegistrarAdelantoSueldoSchema = z.object({
  empleadoId: z.number().int().positive(),
  sesionCajaId: z.number().int().positive(),
  fecha: FechaSchema,
  monto: z.number().positive(),
  metodoPago: MetodoPagoSchema,
  mesADescontar: MesSchema,
  descripcion: z.string().trim().max(255).nullable().optional(),
  registradoPor: z.number().int().positive(),
});

export const RegistrarMultaSchema = z.object({
  empleadoId: z.number().int().positive(),
  fecha: FechaSchema,
  monto: z.number().positive(),
  motivo: z.string().trim().min(1, "Motivo es requerido").max(255),
  mesADescontar: MesSchema,
  registradoPor: z.number().int().positive(),
});

// ============================================================
// ESQUEMAS DE ENTRADA — REPORTES
// ============================================================

export const ReporteDiarioSchema = z.object({
  fecha: FechaSchema,
});

export const ReportePorFechasSchema = z.object({
  fechaInicio: FechaSchema,
  fechaFin: FechaSchema,
}).refine((data) => data.fechaInicio <= data.fechaFin, {
  message: "Fecha inicio no puede ser posterior a fecha fin",
  path: ["fechaInicio"],
});

export const ListarPedidosFechaSchema = z.object({
  fechaInicio: FechaSchema,
  fechaFin: FechaSchema,
});

// ============================================================
// TIPOS INFERIDOS
// ============================================================

export type LoginInput = z.infer<typeof LoginSchema>;
export type CrearUsuarioInput = z.infer<typeof CrearUsuarioSchema>;
export type ActualizarUsuarioInput = z.infer<typeof ActualizarUsuarioSchema>;
export type CambiarPinInput = z.infer<typeof CambiarPinSchema>;
export type CrearEmpleadoInput = z.infer<typeof CrearEmpleadoSchema>;
export type ActualizarEmpleadoInput = z.infer<typeof ActualizarEmpleadoSchema>;
export type CrearProductoInput = z.infer<typeof CrearProductoSchema>;
export type ActualizarProductoInput = z.infer<typeof ActualizarProductoSchema>;
export type BuscarProductoInput = z.infer<typeof BuscarProductoSchema>;
export type AbrirSesionCajaInput = z.infer<typeof AbrirSesionCajaSchema>;
export type CerrarCajaInput = z.infer<typeof CerrarCajaSchema>;
export type MarcarRevisadoInput = z.infer<typeof MarcarRevisadoSchema>;
export type RegistrarStockDiarioInput = z.infer<typeof RegistrarStockDiarioSchema>;
export type RegistrarReposicionInput = z.infer<typeof RegistrarReposicionSchema>;
export type RegistrarCorteInput = z.infer<typeof RegistrarCorteSchema>;
export type RegistrarMermaInput = z.infer<typeof RegistrarMermaSchema>;
export type RegistrarCortesiaInput = z.infer<typeof RegistrarCortesiaSchema>;
export type ConciliarStockInput = z.infer<typeof ConciliarStockSchema>;
export type CrearVentaInput = z.infer<typeof CrearVentaSchema>;
export type CrearPedidoInput = z.infer<typeof CrearPedidoSchema>;
export type EntregarPedidoInput = z.infer<typeof EntregarPedidoSchema>;
export type CancelarPedidoInput = z.infer<typeof CancelarPedidoSchema>;
export type ListarPedidosEstadoInput = z.infer<typeof ListarPedidosEstadoSchema>;
export type RegistrarDevolucionAnticipoInput = z.infer<typeof RegistrarDevolucionAnticipoSchema>;
export type CrearGastoInput = z.infer<typeof CrearGastoSchema>;
export type CrearCategoriaGastoInput = z.infer<typeof CrearCategoriaGastoSchema>;
export type RegistrarAdelantoSueldoInput = z.infer<typeof RegistrarAdelantoSueldoSchema>;
export type RegistrarMultaInput = z.infer<typeof RegistrarMultaSchema>;
export type ReporteDiarioInput = z.infer<typeof ReporteDiarioSchema>;
export type ReportePorFechasInput = z.infer<typeof ReportePorFechasSchema>;
export type ListarPedidosFechaInput = z.infer<typeof ListarPedidosFechaSchema>;
