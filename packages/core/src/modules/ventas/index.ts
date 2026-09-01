/**
 * Módulo: Ventas y ventas detalladas (AGENT.md sección 2.1)
 *
 * Registro de ventas de mostrador con detalles.
 * Validación de stock antes de confirmar la venta.
 */

import {
  PosDatabase,
  ventas,
  ventaDetalle,
  productos,
  stockDiario,
  sesionesCaja,
  mermas,
  cortesias,
  eq,
  and,
  sql,
} from "@pos/db";
import { calcularStockDisponible } from "../stock/stock-calculo";
import { CrearVentaInput, CrearVentaSchema, IdSchema } from "@pos/shared";

export function crearServicioVentas(db: PosDatabase) {
  return {
    /**
     * Crea una venta con sus detalles.
     * Valida que el stock sea suficiente para cada producto.
     * skipStockCheck: true para ventas de pedidos (el stock ya fue descontado al crear el pedido).
     */
    async crear(datos: CrearVentaInput, skipStockCheck = false) {
      const validados = CrearVentaSchema.parse(datos);

      // Validar que la sesión de caja exista y esté abierta
      const existeSesion = await db.select().from(sesionesCaja).where(eq(sesionesCaja.id, validados.sesionCajaId)).limit(1);
      if (existeSesion.length === 0) throw new Error("Sesión de caja no encontrada");
      if (existeSesion[0]?.estado !== "abierta") {
        const estado = existeSesion[0]?.estado ?? "desconocido";
        throw new Error(`La sesión de caja no está abierta (estado: ${estado}). Ve a Apertura de Caja para abrir una nueva sesión.`);
      }

      // Validar stock FUERA de la transacción (better-sqlite3 no soporta async en transaction)
      if (!skipStockCheck) {
        for (const detalle of validados.detalles) {
          const stock = await this.verificarStock(
            detalle.productoId,
            validados.sesionCajaId,
            detalle.unidad,
            detalle.cantidad
          );
          if (!stock.suficiente) {
            throw new Error(
              `Stock insuficiente para producto ${detalle.productoId}: ` +
                `disponible ${stock.disponible}, solicitado ${detalle.cantidad}`
            );
          }
        }
      }

      // Crear la venta y sus detalles
      // (single-user desktop app — sequential inserts on same connection are safe)
      const ventaResultado = await db
        .insert(ventas)
        .values({
          sesionCajaId: validados.sesionCajaId,
          total: validados.total,
          metodoPago: validados.metodoPago,
          tipoOrigen: validados.tipoOrigen,
          requiereFactura: validados.requiereFactura ?? false,
          clienteIdentificacion: validados.clienteIdentificacion ?? null,
          clienteNombre: validados.clienteNombre ?? null,
        })
        .returning();

      const ventaCreada = ventaResultado[0];
      if (!ventaCreada) {
        throw new Error("Error al crear la venta");
      }

      for (const detalle of validados.detalles) {
        const unidadDetalle = detalle.unidad === "porcion_llevar" ? "porcion" : detalle.unidad;
        await db.insert(ventaDetalle).values({
          ventaId: ventaCreada.id,
          productoId: detalle.productoId,
          unidad: unidadDetalle,
          cantidad: detalle.cantidad,
          precioUnitario: detalle.precioUnitario,
          subtotal: detalle.subtotal,
        });
      }

      return ventaCreada;
    },

    /**
     * Verifica si hay stock suficiente para un producto.
     */
    async verificarStock(
      productoId: number,
      sesionCajaId: number,
      unidad: "entero" | "porcion" | "porcion_llevar",
      cantidadRequerida: number
    ): Promise<{ suficiente: boolean; disponible: number }> {
      const producto = await db
        .select()
        .from(productos)
        .where(eq(productos.id, productoId))
        .limit(1);

      if (producto.length === 0) {
        throw new Error("Producto no encontrado");
      }

      const calc = await calcularStockDisponible(db, productoId, sesionCajaId, unidad);
      return {
        suficiente: calc.disponible >= cantidadRequerida,
        disponible: calc.disponible,
      };
    },

    /**
     * Calcula la cantidad vendida de un producto.
     */
    async calcularVendido(
      productoId: number,
      sesionCajaId: number,
      unidad: "entero" | "porcion" | "porcion_llevar"
    ): Promise<number> {
      const unidadVendido = unidad === "porcion_llevar" ? "porcion" : unidad;

      const resultado = await db
        .select({ total: sql<number>`coalesce(sum(${ventaDetalle.cantidad}), 0)` })
        .from(ventaDetalle)
        .innerJoin(ventas, eq(ventaDetalle.ventaId, ventas.id))
        .where(
          and(
            eq(ventaDetalle.productoId, productoId),
            eq(ventas.sesionCajaId, sesionCajaId),
            eq(ventaDetalle.unidad, unidadVendido)
          )
        );

      return resultado[0]?.total ?? 0;
    },

    /**
     * Obtiene el stock inicial de un producto desde stock_diario.
     */
    async obtenerStockInicial(
      productoId: number,
      sesionCajaId: number,
      unidad?: "entero" | "porcion" | "porcion_llevar"
    ): Promise<number> {
      // Mapear porcion_llevar a porcion para stock
      const unidadStock = unidad === "porcion_llevar" ? "porcion" : unidad;

      const conditions = [
        eq(stockDiario.productoId, productoId),
        eq(stockDiario.sesionCajaId, sesionCajaId),
      ];
      if (unidadStock) {
        conditions.push(eq(stockDiario.unidad, unidadStock));
      }

      const resultado = await db
        .select({ total: sql<number>`coalesce(sum(${stockDiario.cantidadInicial} + ${stockDiario.cantidadAgregada}), 0)` })
        .from(stockDiario)
        .where(and(...conditions));

      return resultado[0]?.total ?? 0;
    },

    /**
     * Lista las ventas de una sesión.
     */
    async listarPorSesion(sesionCajaId: number) {
      IdSchema.parse(sesionCajaId);
      return db
        .select()
        .from(ventas)
        .where(eq(ventas.sesionCajaId, sesionCajaId));
    },

    /**
     * Obtiene el detalle de una venta.
     */
    async obtenerDetalle(ventaId: number) {
      IdSchema.parse(ventaId);
      return db
        .select()
        .from(ventaDetalle)
        .where(eq(ventaDetalle.ventaId, ventaId));
    },

    /**
     * Obtiene una venta por ID.
     */
    async obtenerPorId(id: number) {
      IdSchema.parse(id);
      const resultado = await db
        .select()
        .from(ventas)
        .where(eq(ventas.id, id))
        .limit(1);

      return resultado[0] ?? null;
    },
  };
}
