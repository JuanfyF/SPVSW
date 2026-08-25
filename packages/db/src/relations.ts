import { relations } from "drizzle-orm";
import {
  usuarios,
  empleados,
  productos,
  sesionesCaja,
  stockDiario,
  cortesProducto,
  mermas,
  cortesias,
  ventas,
  ventaDetalle,
  pedidos,
  pedidoDetalle,
  devolucionesAnticipo,
  categoriasGasto,
  gastos,
  adelantosSueldo,
  multasEmpleado,
  cierreCaja,
  comprobantes,
} from "./schema";

/* ============================================================
   USUARIOS Y EMPLEADOS
   ============================================================ */

export const usuariosRelations = relations(usuarios, ({ one, many }) => ({
  empleado: one(empleados, {
    fields: [usuarios.id],
    references: [empleados.usuarioId],
  }),
  sesionesCaja: many(sesionesCaja),
}));

export const empleadosRelations = relations(empleados, ({ one, many }) => ({
  usuario: one(usuarios, {
    fields: [empleados.usuarioId],
    references: [usuarios.id],
  }),
  adelantos: many(adelantosSueldo),
  multas: many(multasEmpleado),
}));

/* ============================================================
   PRODUCTOS
   ============================================================ */

export const productosRelations = relations(productos, ({ many }) => ({
  stockDiario: many(stockDiario),
  cortes: many(cortesProducto),
  mermas: many(mermas),
  cortesias: many(cortesias),
  ventaDetalle: many(ventaDetalle),
  pedidoDetalle: many(pedidoDetalle),
}));

/* ============================================================
   SESIÓN DE CAJA — el eje central del día operativo
   ============================================================ */

export const sesionesCajaRelations = relations(
  sesionesCaja,
  ({ one, many }) => ({
    usuario: one(usuarios, {
      fields: [sesionesCaja.usuarioId],
      references: [usuarios.id],
    }),
    stockDiario: many(stockDiario),
    cortesProducto: many(cortesProducto),
    mermas: many(mermas),
    cortesias: many(cortesias),
    ventas: many(ventas),
    gastos: many(gastos),
    adelantos: many(adelantosSueldo),
    devolucionesAnticipo: many(devolucionesAnticipo),
    // Relación 1 a 1: cada sesión tiene como máximo un cierre
    cierre: one(cierreCaja, {
      fields: [sesionesCaja.id],
      references: [cierreCaja.sesionCajaId],
    }),
    // Pedidos donde esta sesión cobró el anticipo
    pedidosConAnticipoEn: many(pedidos, { relationName: "anticipoSesion" }),
    // Pedidos donde esta sesión cobró el saldo de entrega
    pedidosConEntregaEn: many(pedidos, { relationName: "entregaSesion" }),
  })
);

/* ============================================================
   STOCK Y MOVIMIENTOS DE PRODUCCIÓN
   ============================================================ */

export const stockDiarioRelations = relations(stockDiario, ({ one }) => ({
  producto: one(productos, {
    fields: [stockDiario.productoId],
    references: [productos.id],
  }),
  sesionCaja: one(sesionesCaja, {
    fields: [stockDiario.sesionCajaId],
    references: [sesionesCaja.id],
  }),
}));

export const cortesProductoRelations = relations(
  cortesProducto,
  ({ one }) => ({
    producto: one(productos, {
      fields: [cortesProducto.productoId],
      references: [productos.id],
    }),
    sesionCaja: one(sesionesCaja, {
      fields: [cortesProducto.sesionCajaId],
      references: [sesionesCaja.id],
    }),
    registradoPorUsuario: one(usuarios, {
      fields: [cortesProducto.registradoPor],
      references: [usuarios.id],
    }),
  })
);

export const mermasRelations = relations(mermas, ({ one }) => ({
  producto: one(productos, {
    fields: [mermas.productoId],
    references: [productos.id],
  }),
  sesionCaja: one(sesionesCaja, {
    fields: [mermas.sesionCajaId],
    references: [sesionesCaja.id],
  }),
  registradoPorUsuario: one(usuarios, {
    fields: [mermas.registradoPor],
    references: [usuarios.id],
  }),
}));

export const cortesiasRelations = relations(cortesias, ({ one }) => ({
  producto: one(productos, {
    fields: [cortesias.productoId],
    references: [productos.id],
  }),
  sesionCaja: one(sesionesCaja, {
    fields: [cortesias.sesionCajaId],
    references: [sesionesCaja.id],
  }),
  registradoPorUsuario: one(usuarios, {
    fields: [cortesias.registradoPor],
    references: [usuarios.id],
  }),
}));

/* ============================================================
   VENTAS
   ============================================================ */

export const ventasRelations = relations(ventas, ({ one, many }) => ({
  sesionCaja: one(sesionesCaja, {
    fields: [ventas.sesionCajaId],
    references: [sesionesCaja.id],
  }),
  detalle: many(ventaDetalle),
  comprobante: one(comprobantes, {
    fields: [ventas.id],
    references: [comprobantes.ventaId],
  }),
}));

export const ventaDetalleRelations = relations(ventaDetalle, ({ one }) => ({
  venta: one(ventas, {
    fields: [ventaDetalle.ventaId],
    references: [ventas.id],
  }),
  producto: one(productos, {
    fields: [ventaDetalle.productoId],
    references: [productos.id],
  }),
}));

/* ============================================================
   PEDIDOS Y ANTICIPOS
   ============================================================ */

export const pedidosRelations = relations(pedidos, ({ one, many }) => ({
  detalle: many(pedidoDetalle),
  devoluciones: many(devolucionesAnticipo),
  // Distingue la sesión donde se cobró el anticipo de la sesión de entrega
  sesionAnticipo: one(sesionesCaja, {
    fields: [pedidos.sesionCajaAnticipoId],
    references: [sesionesCaja.id],
    relationName: "anticipoSesion",
  }),
  sesionEntrega: one(sesionesCaja, {
    fields: [pedidos.sesionCajaEntregaId],
    references: [sesionesCaja.id],
    relationName: "entregaSesion",
  }),
}));

export const pedidoDetalleRelations = relations(pedidoDetalle, ({ one }) => ({
  pedido: one(pedidos, {
    fields: [pedidoDetalle.pedidoId],
    references: [pedidos.id],
  }),
  producto: one(productos, {
    fields: [pedidoDetalle.productoId],
    references: [productos.id],
  }),
}));

export const devolucionesAnticipoRelations = relations(
  devolucionesAnticipo,
  ({ one }) => ({
    pedido: one(pedidos, {
      fields: [devolucionesAnticipo.pedidoId],
      references: [pedidos.id],
    }),
    sesionCaja: one(sesionesCaja, {
      fields: [devolucionesAnticipo.sesionCajaId],
      references: [sesionesCaja.id],
    }),
  })
);

/* ============================================================
   GASTOS
   ============================================================ */

export const categoriasGastoRelations = relations(
  categoriasGasto,
  ({ many }) => ({
    gastos: many(gastos),
  })
);

export const gastosRelations = relations(gastos, ({ one }) => ({
  categoria: one(categoriasGasto, {
    fields: [gastos.categoriaId],
    references: [categoriasGasto.id],
  }),
  sesionCaja: one(sesionesCaja, {
    fields: [gastos.sesionCajaId],
    references: [sesionesCaja.id],
  }),
}));

/* ============================================================
   ADELANTOS Y MULTAS
   ============================================================ */

export const adelantosSueldoRelations = relations(
  adelantosSueldo,
  ({ one }) => ({
    empleado: one(empleados, {
      fields: [adelantosSueldo.empleadoId],
      references: [empleados.id],
    }),
    sesionCaja: one(sesionesCaja, {
      fields: [adelantosSueldo.sesionCajaId],
      references: [sesionesCaja.id],
    }),
  })
);

export const multasEmpleadoRelations = relations(multasEmpleado, ({ one }) => ({
  empleado: one(empleados, {
    fields: [multasEmpleado.empleadoId],
    references: [empleados.id],
  }),
}));

/* ============================================================
   CIERRE DE CAJA
   ============================================================ */

export const cierreCajaRelations = relations(cierreCaja, ({ one }) => ({
  sesionCaja: one(sesionesCaja, {
    fields: [cierreCaja.sesionCajaId],
    references: [sesionesCaja.id],
  }),
}));

/* ============================================================
   COMPROBANTES (futuro módulo de facturación SRI)
   ============================================================ */

export const comprobantesRelations = relations(comprobantes, ({ one }) => ({
  venta: one(ventas, {
    fields: [comprobantes.ventaId],
    references: [ventas.id],
  }),
}));
