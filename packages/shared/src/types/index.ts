/**
 * Tipos de dominio compartidos entre capas (no infieridos directamente
 * del schema de Drizzle, para no acoplar el core a detalles de persistencia).
 */

// ============================================================
// ENUMS / LITERALES
// ============================================================

export type Rol = "propietario" | "cajero" | "pastelera";

export type MetodoPago = "efectivo" | "transferencia";

export type TipoVenta = "entero" | "porcion" | "ambos";

export type Unidad = "entero" | "porcion" | "porcion_llevar";

export type TipoOrigenVenta = "mostrador" | "pedido" | "cortesia";

export type EstadoPedido = "pendiente" | "en_proceso" | "listo" | "entregado" | "cancelado";

export type EstadoSesionCaja = "abierta" | "cerrada";

export type EstadoRevision = "pendiente" | "revisada";

export type TipoComprobante = "factura" | "nota_venta";

export type EstadoComprobante = "pendiente" | "firmado" | "enviado" | "autorizado" | "rechazado";

export type OrigenGasto = "caja" | "pedidos";

// ============================================================
// INTERFACES DE DOMINIO (entidades)
// ============================================================

export interface Usuario {
  id: number;
  nombre: string;
  rol: Rol;
  pinHash: string;
  activo: boolean;
  actualizadoEn: string;
}

export interface Empleado {
  id: number;
  usuarioId: number | null;
  nombre: string;
  cargo: string;
  salarioMensual: number;
  activo: boolean;
  actualizadoEn: string;
}

export interface Producto {
  id: number;
  nombre: string;
  categoria: string | null;
  tipoVenta: TipoVenta;
  precioEntero: number | null;
  precioPorcion: number | null;
  artesanal: boolean;
  activo: boolean;
  actualizadoEn: string;
}

export interface SesionCaja {
  id: number;
  usuarioId: number;
  fecha: string;
  horaApertura: string;
  horaCierre: string | null;
  estado: EstadoSesionCaja;
  actualizadoEn: string;
}

export interface StockDiario {
  id: number;
  productoId: number;
  sesionCajaId: number;
  unidad: "entero" | "porcion";
  fecha: string;
  cantidadInicial: number;
  cantidadAgregada: number;
  conteoFisicoCierre: number | null;
  diferenciaDetectada: number | null;
  actualizadoEn: string;
}

export interface CorteProducto {
  id: number;
  productoId: number;
  sesionCajaId: number;
  fechaHora: string;
  porcionesObtenidas: number;
  registradoPor: number;
  actualizadoEn: string;
}

export interface Merma {
  id: number;
  productoId: number;
  sesionCajaId: number;
  fechaHora: string;
  cantidad: number;
  unidad: Unidad;
  motivo: string;
  registradoPor: number;
  actualizadoEn: string;
}

export interface Cortesia {
  id: number;
  productoId: number;
  sesionCajaId: number;
  fechaHora: string;
  cantidad: number;
  unidad: Unidad;
  motivo: string | null;
  cliente: string | null;
  registradoPor: number;
  actualizadoEn: string;
}

export interface Venta {
  id: number;
  sesionCajaId: number;
  fechaHora: string;
  total: number;
  metodoPago: MetodoPago;
  tipoOrigen: TipoOrigenVenta;
  requiereFactura: boolean;
  clienteIdentificacion: string | null;
  clienteNombre: string | null;
  actualizadoEn: string;
}

export interface VentaDetalle {
  id: number;
  ventaId: number;
  productoId: number;
  unidad: Unidad;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

export interface Pedido {
  id: number;
  cliente: string;
  telefono: string | null;
  fechaPedido: string;
  fechaEntrega: string;
  horaEntrega: string | null;
  estado: EstadoPedido;
  anticipo: number;
  metodoPagoAnticipo: MetodoPago;
  sesionCajaAnticipoId: number;
  totalEstimado: number;
  saldoPendiente: number;
  metodoPagoSaldo: MetodoPago | null;
  sesionCajaEntregaId: number | null;
  notas: string | null;
  requiereFactura: boolean;
  clienteIdentificacion: string | null;
  actualizadoEn: string;
}

export interface PedidoDetalle {
  id: number;
  pedidoId: number;
  productoId: number | null;
  descripcionPersonalizada: string | null;
  unidad: "entero" | "porcion";
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

export interface DevolucionAnticipo {
  id: number;
  pedidoId: number;
  sesionCajaId: number;
  monto: number;
  fecha: string;
  metodoDevolucion: MetodoPago;
  motivo: string | null;
  registradoPor: number;
  actualizadoEn: string;
}

export interface CategoriaGasto {
  id: number;
  nombre: string;
}

export interface Gasto {
  id: number;
  fecha: string;
  sesionCajaId: number;
  categoriaId: number;
  descripcion: string;
  monto: number;
  origen: OrigenGasto;
  registradoPor: number;
  actualizadoEn: string;
}

export interface AdelantoSueldo {
  id: number;
  empleadoId: number;
  sesionCajaId: number;
  fecha: string;
  monto: number;
  metodoPago: MetodoPago;
  mesADescontar: string;
  descripcion: string | null;
  registradoPor: number;
  actualizadoEn: string;
}

export interface MultaEmpleado {
  id: number;
  empleadoId: number;
  fecha: string;
  monto: number;
  motivo: string;
  mesADescontar: string;
  registradoPor: number;
  actualizadoEn: string;
}

export interface CierreCaja {
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
  estadoRevision: EstadoRevision;
  revisadoPor: number | null;
  revisadoEn: string | null;
  actualizadoEn: string;
}

export interface Comprobante {
  id: number;
  ventaId: number;
  tipo: TipoComprobante;
  estado: EstadoComprobante;
  xmlFirmado: string | null;
  claveAcceso: string | null;
  intentosEnvio: number;
  ultimoError: string | null;
  actualizadoEn: string;
}

// ============================================================
// TIPOS DE ENTRADA (para crear/actualizar)
// ============================================================

export interface CrearUsuario {
  nombre: string;
  rol: Rol;
  pin: string;
}

export interface CrearEmpleado {
  usuarioId?: number | null;
  nombre: string;
  cargo: string;
  salarioMensual: number;
}

export interface CrearProducto {
  nombre: string;
  categoria?: string | null;
  tipoVenta: TipoVenta;
  precioEntero?: number | null;
  precioPorcion?: number | null;
  artesanal?: boolean;
}

export interface AbrirSesionCaja {
  usuarioId: number;
  fecha: string;
  horaApertura: string;
}

export interface RegistrarStockDiario {
  productoId: number;
  sesionCajaId: number;
  unidad: "entero" | "porcion";
  fecha: string;
  cantidadInicial: number;
  cantidadAgregada?: number;
}

export interface RegistrarCorte {
  productoId: number;
  sesionCajaId: number;
  unidadesEnteras?: number;
  porcionesObtenidas: number;
  registradoPor: number;
}

export interface RegistrarMerma {
  productoId: number;
  sesionCajaId: number;
  cantidad: number;
  unidad: Unidad;
  motivo: string;
  registradoPor: number;
}

export interface RegistrarCortesia {
  productoId: number;
  sesionCajaId: number;
  cantidad: number;
  unidad: Unidad;
  motivo?: string | null;
  cliente?: string | null;
  registradoPor: number;
}

export interface CrearVenta {
  sesionCajaId: number;
  total: number;
  metodoPago: MetodoPago;
  tipoOrigen: TipoOrigenVenta;
  requiereFactura?: boolean;
  clienteIdentificacion?: string | null;
  clienteNombre?: string | null;
  detalles: CrearVentaDetalle[];
}

export interface CrearVentaDetalle {
  productoId: number;
  unidad: Unidad;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

export interface CrearPedido {
  cliente: string;
  telefono?: string | null;
  fechaPedido: string;
  fechaEntrega: string;
  horaEntrega?: string;
  anticipo: number;
  metodoPagoAnticipo: MetodoPago;
  sesionCajaAnticipoId: number;
  totalEstimado: number;
  notas?: string | null;
  requiereFactura?: boolean;
  clienteIdentificacion?: string | null;
  detalles: CrearPedidoDetalle[];
}

export interface CrearPedidoDetalle {
  productoId?: number | null;
  descripcionPersonalizada?: string | null;
  unidad: "entero" | "porcion";
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

export interface RegistrarDevolucionAnticipo {
  pedidoId: number;
  sesionCajaId: number;
  monto: number;
  fecha: string;
  metodoDevolucion: MetodoPago;
  motivo?: string | null;
  registradoPor: number;
}

export interface CrearGasto {
  fecha: string;
  sesionCajaId: number;
  categoriaId: number;
  descripcion: string;
  monto: number;
  origen: OrigenGasto;
  registradoPor: number;
}

export interface RegistrarAdelantoSueldo {
  empleadoId: number;
  sesionCajaId: number;
  fecha: string;
  monto: number;
  metodoPago: MetodoPago;
  mesADescontar: string;
  descripcion?: string | null;
  registradoPor: number;
}

export interface RegistrarMulta {
  empleadoId: number;
  fecha: string;
  monto: number;
  motivo: string;
  mesADescontar: string;
  registradoPor: number;
}

export interface CerrarCaja {
  sesionCajaId: number;
  efectivoContado: number;
  tieneDiferenciaStock: boolean;
  revisadoPor?: number | null;
}

// ============================================================
// TIPOS DE RESULTADO
// ============================================================

export interface ResultadoCierreCaja {
  exitoso: boolean;
  cierreCaja?: CierreCaja;
  errores?: string[];
}

export interface ResumenPedido {
  pedido: Pedido;
  detalles: PedidoDetalle[];
  totalPagado: number;
  saldoPendiente: number;
}

export interface ResumenVenta {
  venta: Venta;
  detalles: VentaDetalle[];
}
