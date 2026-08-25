/**
 * Módulo: Reportes (AGENT.md sección 2.5 y 2.6)
 *
 * Reportes diarios, por fechas y de pedidos.
 * Cálculo de totales consolidados y resúmenes.
 * Consulta histórica de cierres de caja por rango de fecha.
 */

import {
  PosDatabase,
  ventas,
  pedidos,
  gastos,
  categoriasGasto,
  adelantosSueldo,
  multasEmpleado,
  devolucionesAnticipo,
  empleados,
  productos,
  ventaDetalle,
  pedidoDetalle,
  cierreCaja,
  sesionesCaja,
  usuarios,
  eq,
  and,
  sql,
  gte,
  lte,
  like,
} from "@pos/db";
import { ReporteDiarioSchema, ReportePorFechasSchema } from "@pos/shared";

export function crearServicioReportes(db: PosDatabase) {
  return {
    /**
     * Genera el reporte diario de caja.
     */
    async reporteDiario(fecha: string) {
      const validados = ReporteDiarioSchema.parse({ fecha });
      // Ventas del día
      const ventasDelDia = await db
        .select({
          metodoPago: ventas.metodoPago,
          total: sql<number>`sum(${ventas.total})`,
          cantidad: sql<number>`count(*)`,
        })
        .from(ventas)
        .where(like(ventas.fechaHora, `${validados.fecha}%`))
        .groupBy(ventas.metodoPago);

      // Pedidos del día (anticipos)
      const pedidosDelDia = await db
        .select({
          metodoPago: pedidos.metodoPagoAnticipo,
          total: sql<number>`sum(${pedidos.anticipo})`,
          cantidad: sql<number>`count(*)`,
        })
        .from(pedidos)
        .where(eq(pedidos.fechaPedido, validados.fecha))
        .groupBy(pedidos.metodoPagoAnticipo);

      // Gastos del día por origen
      const gastosDelDia = await db
        .select({
          origen: gastos.origen,
          total: sql<number>`sum(${gastos.monto})`,
        })
        .from(gastos)
        .where(eq(gastos.fecha, validados.fecha))
        .groupBy(gastos.origen);

      // Gastos del día por categoría
      const gastosPorCategoria = await db
        .select({
          categoriaId: gastos.categoriaId,
          categoriaNombre: categoriasGasto.nombre,
          total: sql<number>`sum(${gastos.monto})`,
          cantidad: sql<number>`count(*)`,
        })
        .from(gastos)
        .innerJoin(categoriasGasto, eq(gastos.categoriaId, categoriasGasto.id))
        .where(eq(gastos.fecha, validados.fecha))
        .groupBy(gastos.categoriaId, categoriasGasto.nombre);

      // Gastos del día detalle
      const gastosDetalle = await db
        .select({
          id: gastos.id,
          descripcion: gastos.descripcion,
          monto: gastos.monto,
          origen: gastos.origen,
          categoriaNombre: categoriasGasto.nombre,
        })
        .from(gastos)
        .innerJoin(categoriasGasto, eq(gastos.categoriaId, categoriasGasto.id))
        .where(eq(gastos.fecha, validados.fecha));

      // Adelantos del día
      const adelantosDelDia = await db
        .select({
          metodoPago: adelantosSueldo.metodoPago,
          total: sql<number>`sum(${adelantosSueldo.monto})`,
        })
        .from(adelantosSueldo)
        .where(eq(adelantosSueldo.fecha, validados.fecha))
        .groupBy(adelantosSueldo.metodoPago);

      // Multas del día
      const multasDelDia = await db
        .select({ total: sql<number>`sum(${multasEmpleado.monto})` })
        .from(multasEmpleado)
        .where(eq(multasEmpleado.fecha, validados.fecha));

      // Devoluciones de anticipo del día
      const devolucionesDelDia = await db
        .select({
          metodoDevolucion: devolucionesAnticipo.metodoDevolucion,
          total: sql<number>`sum(${devolucionesAnticipo.monto})`,
        })
        .from(devolucionesAnticipo)
        .where(eq(devolucionesAnticipo.fecha, validados.fecha))
        .groupBy(devolucionesAnticipo.metodoDevolucion);

      // Calcular totales
      const ventasEfectivo =
        ventasDelDia.find((v) => v.metodoPago === "efectivo")?.total ?? 0;
      const ventasTransferencia =
        ventasDelDia.find((v) => v.metodoPago === "transferencia")?.total ?? 0;
      const ventasEfectivoCantidad =
        ventasDelDia.find((v) => v.metodoPago === "efectivo")?.cantidad ?? 0;
      const ventasTransferenciaCantidad =
        ventasDelDia.find((v) => v.metodoPago === "transferencia")?.cantidad ?? 0;
      const pedidosEfectivo =
        pedidosDelDia.find((p) => p.metodoPago === "efectivo")?.total ?? 0;
      const pedidosTransferencia =
        pedidosDelDia.find((p) => p.metodoPago === "transferencia")?.total ?? 0;
      const pedidosEfectivoCantidad =
        pedidosDelDia.find((p) => p.metodoPago === "efectivo")?.cantidad ?? 0;
      const pedidosTransferenciaCantidad =
        pedidosDelDia.find((p) => p.metodoPago === "transferencia")?.cantidad ?? 0;
      const gastosCaja =
        gastosDelDia.find((g) => g.origen === "caja")?.total ?? 0;
      const gastosPedidos =
        gastosDelDia.find((g) => g.origen === "pedidos")?.total ?? 0;
      const adelantosEfectivo =
        adelantosDelDia.find((a) => a.metodoPago === "efectivo")?.total ?? 0;
      const adelantosTransferencia =
        adelantosDelDia.find((a) => a.metodoPago === "transferencia")?.total ?? 0;
      const devolucionesEfectivo =
        devolucionesDelDia.find((d) => d.metodoDevolucion === "efectivo")?.total ?? 0;
      const devolucionesTransferencia =
        devolucionesDelDia.find((d) => d.metodoDevolucion === "transferencia")?.total ?? 0;

      return {
        fecha: validados.fecha,
        ventas: {
          efectivo: ventasEfectivo,
          transferencia: ventasTransferencia,
          total: ventasEfectivo + ventasTransferencia,
          cantidadEfectivo: ventasEfectivoCantidad,
          cantidadTransferencia: ventasTransferenciaCantidad,
          cantidadTotal: ventasEfectivoCantidad + ventasTransferenciaCantidad,
        },
        pedidos: {
          efectivo: pedidosEfectivo,
          transferencia: pedidosTransferencia,
          total: pedidosEfectivo + pedidosTransferencia,
          cantidadEfectivo: pedidosEfectivoCantidad,
          cantidadTransferencia: pedidosTransferenciaCantidad,
          cantidadTotal: pedidosEfectivoCantidad + pedidosTransferenciaCantidad,
        },
        gastos: {
          caja: gastosCaja,
          pedidos: gastosPedidos,
          total: gastosCaja + gastosPedidos,
          porCategoria: gastosPorCategoria.map((g) => ({
            categoriaId: g.categoriaId,
            categoriaNombre: g.categoriaNombre,
            total: g.total,
            cantidad: g.cantidad,
          })),
          detalle: gastosDetalle.map((g) => ({
            id: g.id,
            descripcion: g.descripcion,
            monto: g.monto,
            origen: g.origen,
            categoriaNombre: g.categoriaNombre,
          })),
        },
        adelantos: {
          efectivo: adelantosEfectivo,
          transferencia: adelantosTransferencia,
          total: adelantosEfectivo + adelantosTransferencia,
        },
        devoluciones: {
          efectivo: devolucionesEfectivo,
          transferencia: devolucionesTransferencia,
          total: devolucionesEfectivo + devolucionesTransferencia,
        },
        multas: multasDelDia[0]?.total ?? 0,
        consolidado: {
          ingresosBrutos:
            ventasEfectivo +
            ventasTransferencia +
            pedidosEfectivo +
            pedidosTransferencia,
          egresosTotales: gastosCaja + gastosPedidos + adelantosEfectivo + adelantosTransferencia + devolucionesEfectivo + devolucionesTransferencia,
          ingresoNeto:
            ventasEfectivo +
            ventasTransferencia +
            pedidosEfectivo +
            pedidosTransferencia -
            gastosCaja -
            gastosPedidos -
            adelantosEfectivo -
            adelantosTransferencia -
            devolucionesEfectivo -
            devolucionesTransferencia,
        },
      };
    },

    /**
     * Genera reporte por rango de fechas.
     */
    async reportePorFechas(fechaInicio: string, fechaFin: string) {
      const validados = ReportePorFechasSchema.parse({ fechaInicio, fechaFin });
      const fechaFinCompleta = validados.fechaFin + " 23:59:59";
      // Ventas en el rango
      const ventasRango = await db
        .select({
          metodoPago: ventas.metodoPago,
          total: sql<number>`sum(${ventas.total})`,
          cantidad: sql<number>`count(*)`,
        })
        .from(ventas)
        .where(and(gte(ventas.fechaHora, validados.fechaInicio), lte(ventas.fechaHora, fechaFinCompleta)))
        .groupBy(ventas.metodoPago);

      // Gastos en el rango
      const gastosRango = await db
        .select({
          origen: gastos.origen,
          total: sql<number>`sum(${gastos.monto})`,
        })
        .from(gastos)
        .where(and(gte(gastos.fecha, validados.fechaInicio), lte(gastos.fecha, validados.fechaFin)))
        .groupBy(gastos.origen);

      const ventasEfectivo =
        ventasRango.find((v) => v.metodoPago === "efectivo")?.total ?? 0;
      const ventasTransferencia =
        ventasRango.find((v) => v.metodoPago === "transferencia")?.total ?? 0;
      const gastosCaja =
        gastosRango.find((g) => g.origen === "caja")?.total ?? 0;
      const gastosPedidos =
        gastosRango.find((g) => g.origen === "pedidos")?.total ?? 0;

      return {
        fechaInicio: validados.fechaInicio,
        fechaFin: validados.fechaFin,
        ventas: {
          efectivo: ventasEfectivo,
          transferencia: ventasTransferencia,
          total: ventasEfectivo + ventasTransferencia,
        },
        gastos: {
          caja: gastosCaja,
          pedidos: gastosPedidos,
          total: gastosCaja + gastosPedidos,
        },
        consolidado: {
          ingresosBrutos: ventasEfectivo + ventasTransferencia,
          egresosTotales: gastosCaja + gastosPedidos,
          ingresoNeto:
            ventasEfectivo +
            ventasTransferencia -
            gastosCaja -
            gastosPedidos,
        },
      };
    },

    /**
     * Consulta histórica de cierres de caja por rango de fecha.
     * AGENT.md §2.6 — Por cada cierre: sesión, cajero, ventas, pedidos,
     * gastos, adelantos, efectivo esperado vs. contado, diferencia y estado.
     */
    async listarCierresPorRango(fechaInicio: string, fechaFin: string) {
      const validados = ReportePorFechasSchema.parse({ fechaInicio, fechaFin });

      const cierres = await db
        .select({
          id: cierreCaja.id,
          sesionCajaId: cierreCaja.sesionCajaId,
          fechaApertura: sesionesCaja.fecha,
          ventasEfectivo: cierreCaja.ventasEfectivo,
          ventasTransferencia: cierreCaja.ventasTransferencia,
          pedidosEfectivo: cierreCaja.pedidosEfectivo,
          pedidosTransferencia: cierreCaja.pedidosTransferencia,
          gastosCaja: cierreCaja.gastosCaja,
          adelantosEfectivo: cierreCaja.adelantosEfectivo,
          adelantosTransferencia: cierreCaja.adelantosTransferencia,
          devolucionesAnticipoEfectivo: cierreCaja.devolucionesAnticipoEfectivo,
          efectivoEsperado: cierreCaja.efectivoEsperado,
          efectivoContado: cierreCaja.efectivoContado,
          diferenciaEfectivo: cierreCaja.diferenciaEfectivo,
          tieneDiferenciaStock: cierreCaja.tieneDiferenciaStock,
          estadoRevision: cierreCaja.estadoRevision,
          cajeroNombre: usuarios.nombre,
        })
        .from(cierreCaja)
        .innerJoin(sesionesCaja, eq(cierreCaja.sesionCajaId, sesionesCaja.id))
        .innerJoin(usuarios, eq(sesionesCaja.usuarioId, usuarios.id))
        .where(
          and(
            gte(sesionesCaja.fecha, validados.fechaInicio),
            lte(sesionesCaja.fecha, validados.fechaFin)
          )
        )
        .orderBy(sesionesCaja.fecha);

      // Calcular totales del rango
      const totales = cierres.reduce(
        (acc, c) => ({
          ventasEfectivo: acc.ventasEfectivo + c.ventasEfectivo,
          ventasTransferencia: acc.ventasTransferencia + c.ventasTransferencia,
          pedidosEfectivo: acc.pedidosEfectivo + c.pedidosEfectivo,
          pedidosTransferencia: acc.pedidosTransferencia + c.pedidosTransferencia,
          gastosCaja: acc.gastosCaja + c.gastosCaja,
          adelantosEfectivo: acc.adelantosEfectivo + c.adelantosEfectivo,
          adelantosTransferencia: acc.adelantosTransferencia + c.adelantosTransferencia,
          devolucionesAnticipoEfectivo:
            acc.devolucionesAnticipoEfectivo + (c.devolucionesAnticipoEfectivo ?? 0),
          efectivoEsperado: acc.efectivoEsperado + c.efectivoEsperado,
          efectivoContado: acc.efectivoContado + (c.efectivoContado ?? 0),
          diferenciaEfectivo: acc.diferenciaEfectivo + (c.diferenciaEfectivo ?? 0),
        }),
        {
          ventasEfectivo: 0,
          ventasTransferencia: 0,
          pedidosEfectivo: 0,
          pedidosTransferencia: 0,
          gastosCaja: 0,
          adelantosEfectivo: 0,
          adelantosTransferencia: 0,
          devolucionesAnticipoEfectivo: 0,
          efectivoEsperado: 0,
          efectivoContado: 0,
          diferenciaEfectivo: 0,
        }
      );

      return {
        fechaInicio: validados.fechaInicio,
        fechaFin: validados.fechaFin,
        cierres,
        totales,
      };
    },

    /**
     * Reporte de pedidos pendientes.
     */
    async reportePedidosPendientes() {
      const pedidosRows = await db
        .select({
          id: pedidos.id,
          cliente: pedidos.cliente,
          fechaEntrega: pedidos.fechaEntrega,
          estado: pedidos.estado,
          totalEstimado: pedidos.totalEstimado,
          saldoPendiente: pedidos.saldoPendiente,
          notas: pedidos.notas,
        })
        .from(pedidos)
        .where(
          sql`${pedidos.estado} IN ('pendiente', 'en_proceso', 'listo')`
        )
        .orderBy(pedidos.fechaEntrega);

      if (pedidosRows.length === 0) return [];

      const ids = pedidosRows.map((p) => p.id);

      const detalles = await db
        .select({
          pedidoId: pedidoDetalle.pedidoId,
          descripcionPersonalizada: pedidoDetalle.descripcionPersonalizada,
          nombreProducto: productos.nombre,
        })
        .from(pedidoDetalle)
        .leftJoin(productos, eq(pedidoDetalle.productoId, productos.id))
        .where(sql`${pedidoDetalle.pedidoId} IN (${sql.join(ids.map((id) => sql`${id}`), sql`, `)})`);

      const detallesMap = new Map<number, string[]>();
      for (const d of detalles) {
        const texto = d.descripcionPersonalizada || d.nombreProducto || "";
        if (!texto) continue;
        if (!detallesMap.has(d.pedidoId)) detallesMap.set(d.pedidoId, []);
        detallesMap.get(d.pedidoId)!.push(texto);
      }

      return pedidosRows.map((p) => ({
        ...p,
        descripcion: detallesMap.get(p.id)?.join(" | ") || "",
      }));
    },

    /**
     * Reporte de productos más vendidos.
     */
    async reporteProductosMasVendidos(fechaInicio: string, fechaFin: string) {
      const validados = ReportePorFechasSchema.parse({ fechaInicio, fechaFin });
      return db
        .select({
          productoId: ventaDetalle.productoId,
          nombre: productos.nombre,
          cantidad: sql<number>`sum(${ventaDetalle.cantidad})`,
        })
        .from(ventaDetalle)
        .innerJoin(ventas, eq(ventaDetalle.ventaId, ventas.id))
        .innerJoin(productos, eq(ventaDetalle.productoId, productos.id))
        .where(and(gte(ventas.fechaHora, validados.fechaInicio), lte(ventas.fechaHora, validados.fechaFin)))
        .groupBy(ventaDetalle.productoId, productos.nombre)
        .orderBy(sql`sum(${ventaDetalle.cantidad}) DESC`)
        .limit(10);
    },
  };
}
