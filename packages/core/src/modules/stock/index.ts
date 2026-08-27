/**
 * Módulo: Stock y cierre diario (AGENT.md sección 2.1)
 *
 * Gestión de stock diario, cortes, mermas y cortesías.
 * Conciliación de stock al cierre de caja.
 */

import {
  PosDatabase,
  stockDiario,
  cortesProducto,
  mermas,
  cortesias,
  ventas,
  ventaDetalle,
  productos,
  sesionesCaja,
  usuarios,
  eq,
  and,
  sql,
} from "@pos/db";
import {
  RegistrarStockDiarioInput,
  RegistrarStockDiarioSchema,
  RegistrarCorteInput,
  RegistrarCorteSchema,
  RegistrarMermaInput,
  RegistrarMermaSchema,
  RegistrarCortesiaInput,
  RegistrarCortesiaSchema,
  RegistrarReposicionSchema,
  ConciliarStockSchema,
  IdSchema,
  formatearFecha,
} from "@pos/shared";
import { calcularStockDisponible } from "./stock-calculo";

export function crearServicioStock(db: PosDatabase) {
  return {
    /**
     * Registra stock diario para un producto.
     */
    async registrarStock(datos: RegistrarStockDiarioInput) {
      const validados = RegistrarStockDiarioSchema.parse(datos);

      const existeProducto = await db
        .select({ id: productos.id })
        .from(productos)
        .where(eq(productos.id, validados.productoId))
        .limit(1);
      if (existeProducto.length === 0) throw new Error("Producto no encontrado");

      const existeSesion = await db
        .select({ id: sesionesCaja.id })
        .from(sesionesCaja)
        .where(eq(sesionesCaja.id, validados.sesionCajaId))
        .limit(1);
      if (existeSesion.length === 0) throw new Error("Sesión de caja no encontrada");

      const resultado = await db
        .insert(stockDiario)
        .values({
          productoId: validados.productoId,
          sesionCajaId: validados.sesionCajaId,
          unidad: validados.unidad,
          fecha: validados.fecha,
          cantidadInicial: validados.cantidadInicial,
          cantidadAgregada: validados.cantidadAgregada ?? 0,
        })
        .returning();

      return resultado[0];
    },

    /**
     * Registra reposición de stock durante el día.
     */
    async registrarReposicion(
      productoId: number,
      sesionCajaId: number,
      cantidad: number,
      unidad: "entero" | "porcion" = "entero"
    ) {
      const validados = RegistrarReposicionSchema.parse({ productoId, sesionCajaId, cantidad, unidad });

      const existeProducto = await db
        .select({ id: productos.id })
        .from(productos)
        .where(eq(productos.id, validados.productoId))
        .limit(1);
      if (existeProducto.length === 0) throw new Error("Producto no encontrado");

      const existeSesion = await db
        .select({ id: sesionesCaja.id })
        .from(sesionesCaja)
        .where(eq(sesionesCaja.id, validados.sesionCajaId))
        .limit(1);
      if (existeSesion.length === 0) throw new Error("Sesión de caja no encontrada");

      const resultado = await db
        .update(stockDiario)
        .set({
          cantidadAgregada: sql`${stockDiario.cantidadAgregada} + ${validados.cantidad}`,
        })
        .where(
          and(
            eq(stockDiario.productoId, validados.productoId),
            eq(stockDiario.sesionCajaId, validados.sesionCajaId),
            eq(stockDiario.unidad, validados.unidad)
          )
        )
        .returning();

      if (resultado.length > 0) {
        return resultado[0];
      }

      // Si no existe fila, crear una nueva con cantidadInicial=0
      const nuevaFila = await db
        .insert(stockDiario)
        .values({
          productoId: validados.productoId,
          sesionCajaId: validados.sesionCajaId,
          unidad: validados.unidad,
          fecha: formatearFecha(new Date()),
          cantidadInicial: 0,
          cantidadAgregada: validados.cantidad,
        })
        .returning();

      return nuevaFila[0];
    },

    /**
     * Registra corte de producto entero a porciones.
     */
    async registrarCorte(datos: RegistrarCorteInput) {
      const validados = RegistrarCorteSchema.parse(datos);

      const existeProducto = await db
        .select({ id: productos.id })
        .from(productos)
        .where(eq(productos.id, validados.productoId))
        .limit(1);
      if (existeProducto.length === 0) throw new Error("Producto no encontrado");

      const existeSesion = await db
        .select({ id: sesionesCaja.id })
        .from(sesionesCaja)
        .where(eq(sesionesCaja.id, validados.sesionCajaId))
        .limit(1);
      if (existeSesion.length === 0) throw new Error("Sesión de caja no encontrada");

      const existeUsuario = await db
        .select({ id: usuarios.id })
        .from(usuarios)
        .where(eq(usuarios.id, validados.registradoPor))
        .limit(1);
      if (existeUsuario.length === 0) throw new Error("Usuario no encontrado");

      // Verificar stock de enteros disponible
      const filaEntero = await db
        .select()
        .from(stockDiario)
        .where(
          and(
            eq(stockDiario.productoId, validados.productoId),
            eq(stockDiario.sesionCajaId, validados.sesionCajaId),
            eq(stockDiario.unidad, "entero")
          )
        )
        .limit(1);

      const entero = filaEntero[0];
      if (!entero) throw new Error("No hay stock de enteros registrado para este producto");
      const vendidoEntero = await this.calcularVendidoPorSesion(validados.productoId, validados.sesionCajaId, "entero");
      const mermasEntero = await db
        .select({ total: sql<number>`coalesce(sum(${mermas.cantidad}), 0)` })
        .from(mermas)
        .where(and(eq(mermas.productoId, validados.productoId), eq(mermas.sesionCajaId, validados.sesionCajaId), eq(mermas.unidad, "entero")));
      const cortesiasEntero = await db
        .select({ total: sql<number>`coalesce(sum(${cortesias.cantidad}), 0)` })
        .from(cortesias)
        .where(and(eq(cortesias.productoId, validados.productoId), eq(cortesias.sesionCajaId, validados.sesionCajaId), eq(cortesias.unidad, "entero")));
      const cortesPrevios = await db
        .select({ total: sql<number>`coalesce(sum(${cortesProducto.unidadesEnteras}), 0)` })
        .from(cortesProducto)
        .where(and(eq(cortesProducto.productoId, validados.productoId), eq(cortesProducto.sesionCajaId, validados.sesionCajaId)));
      const enterosDisponibles =
        entero.cantidadInicial +
        entero.cantidadAgregada -
        (vendidoEntero ?? 0) -
        (mermasEntero[0]?.total ?? 0) -
        (cortesiasEntero[0]?.total ?? 0) -
        (cortesPrevios[0]?.total ?? 0);

      if (enterosDisponibles < validados.unidadesEnteras) {
        throw new Error(
          `Stock insuficiente de enteros: disponible ${enterosDisponibles}, solicitado ${validados.unidadesEnteras}`
        );
      }

      // Registrar el corte
      const resultado = await db
        .insert(cortesProducto)
        .values({
          productoId: validados.productoId,
          sesionCajaId: validados.sesionCajaId,
          unidadesEnteras: validados.unidadesEnteras,
          porcionesObtenidas: validados.porcionesObtenidas,
          registradoPor: validados.registradoPor,
        })
        .returning();

      return resultado[0];
    },

    /**
     * Registra merma de producto.
     */
    async registrarMerma(datos: RegistrarMermaInput) {
      const validados = RegistrarMermaSchema.parse(datos);

      const existeProducto = await db
        .select({ id: productos.id })
        .from(productos)
        .where(eq(productos.id, validados.productoId))
        .limit(1);
      if (existeProducto.length === 0) throw new Error("Producto no encontrado");

      const existeSesion = await db
        .select({ id: sesionesCaja.id })
        .from(sesionesCaja)
        .where(eq(sesionesCaja.id, validados.sesionCajaId))
        .limit(1);
      if (existeSesion.length === 0) throw new Error("Sesión de caja no encontrada");

      const existeUsuario = await db
        .select({ id: usuarios.id })
        .from(usuarios)
        .where(eq(usuarios.id, validados.registradoPor))
        .limit(1);
      if (existeUsuario.length === 0) throw new Error("Usuario no encontrado");

      const resultado = await db
        .insert(mermas)
        .values({
          productoId: validados.productoId,
          sesionCajaId: validados.sesionCajaId,
          cantidad: validados.cantidad,
          unidad: validados.unidad,
          motivo: validados.motivo,
          registradoPor: validados.registradoPor,
        })
        .returning();

      return resultado[0];
    },

    /**
     * Registra cortesía de producto.
     */
    async registrarCortesia(datos: RegistrarCortesiaInput) {
      const validados = RegistrarCortesiaSchema.parse(datos);

      const existeProducto = await db
        .select({ id: productos.id })
        .from(productos)
        .where(eq(productos.id, validados.productoId))
        .limit(1);
      if (existeProducto.length === 0) throw new Error("Producto no encontrado");

      const existeSesion = await db
        .select({ id: sesionesCaja.id })
        .from(sesionesCaja)
        .where(eq(sesionesCaja.id, validados.sesionCajaId))
        .limit(1);
      if (existeSesion.length === 0) throw new Error("Sesión de caja no encontrada");

      const existeUsuario = await db
        .select({ id: usuarios.id })
        .from(usuarios)
        .where(eq(usuarios.id, validados.registradoPor))
        .limit(1);
      if (existeUsuario.length === 0) throw new Error("Usuario no encontrado");

      const resultado = await db
        .insert(cortesias)
        .values({
          productoId: validados.productoId,
          sesionCajaId: validados.sesionCajaId,
          cantidad: validados.cantidad,
          unidad: validados.unidad,
          motivo: validados.motivo ?? null,
          cliente: validados.cliente ?? null,
          registradoPor: validados.registradoPor,
        })
        .returning();

      return resultado[0];
    },

    /**
     * Obtiene el stock diario de una sesión.
     */
    async obtenerStockPorSesion(sesionCajaId: number) {
      IdSchema.parse(sesionCajaId);

      return db
        .select()
        .from(stockDiario)
        .where(eq(stockDiario.sesionCajaId, sesionCajaId));
    },

    /**
     * Lista mermas de una sesión.
     */
    async listarMermasPorSesion(sesionCajaId: number) {
      IdSchema.parse(sesionCajaId);

      return db
        .select()
        .from(mermas)
        .where(eq(mermas.sesionCajaId, sesionCajaId));
    },

    /**
     * Lista cortesías de una sesión.
     */
    async listarCortesiasPorSesion(sesionCajaId: number) {
      IdSchema.parse(sesionCajaId);

      return db
        .select()
        .from(cortesias)
        .where(eq(cortesias.sesionCajaId, sesionCajaId));
    },

    /**
     * Lista cortes entero→porción de la sesión.
     * unidadesEnteras descuentan del stock "entero";
     * porcionesObtenidas suman al stock "porcion".
     */
    async listarCortesPorSesion(sesionCajaId: number) {
      IdSchema.parse(sesionCajaId);

      return db
        .select()
        .from(cortesProducto)
        .where(eq(cortesProducto.sesionCajaId, sesionCajaId));
    },

    /**
     * Resumen de ajustes por cortes: { "productoId:entero": -N, "productoId:porcion": +M }.
     */
    async calcularAjusteCortesLote(
      sesionCajaId: number
    ): Promise<Record<string, number>> {
      const cortes = await this.listarCortesPorSesion(sesionCajaId);
      const mapa: Record<string, number> = {};
      for (const c of cortes) {
        const kEntero = `${c.productoId}:entero`;
        const kPorcion = `${c.productoId}:porcion`;
        mapa[kEntero] = (mapa[kEntero] ?? 0) - c.unidadesEnteras;
        mapa[kPorcion] = (mapa[kPorcion] ?? 0) + c.porcionesObtenidas;
      }
      return mapa;
    },

    /**
     * Concilia stock al cierre de caja.
     * Calcula la diferencia entre el conteo físico y el stock esperado.
     * Fórmula: esperado = inicial + agregada - vendida - mermas - cortesías
     */
    async conciliarStock(
      sesionCajaId: number,
      conteoFisicoPorProducto: Array<{
        productoId: number;
        unidad: "entero" | "porcion";
        conteoFisico: number;
      }>
    ) {
      const validados = ConciliarStockSchema.parse({ sesionCajaId, conteoFisicoPorProducto });

      for (const item of validados.conteoFisicoPorProducto) {
        const stock = await db
          .select()
          .from(stockDiario)
          .where(
            and(
              eq(stockDiario.productoId, item.productoId),
              eq(stockDiario.sesionCajaId, validados.sesionCajaId),
              eq(stockDiario.unidad, item.unidad)
            )
          )
          .limit(1);

        if (stock.length === 0) continue;

        const s = stock[0];
        if (!s) continue;

        const calc = await calcularStockDisponible(db, item.productoId, validados.sesionCajaId, item.unidad);
        const diferencia = item.conteoFisico - calc.disponible;

        await db
          .update(stockDiario)
          .set({
            conteoFisicoCierre: item.conteoFisico,
            diferenciaDetectada: diferencia,
          })
          .where(eq(stockDiario.id, s.id));
      }
    },

    /**
     * Calcula el total vendido de un producto en una sesión.
     */
    async calcularVendidoPorSesion(
      productoId: number,
      sesionCajaId: number,
      unidad?: string
    ): Promise<number> {
      IdSchema.parse(productoId);
      IdSchema.parse(sesionCajaId);

      // Normalizar porcion_llevar → porcion (compatibilidad con ventas existentes)
      const unidadNormalizada = unidad === "porcion_llevar" ? "porcion" : unidad;

      const conditions = [
        eq(ventaDetalle.productoId, productoId),
        eq(ventas.sesionCajaId, sesionCajaId),
      ];
      if (unidadNormalizada) {
        conditions.push(eq(ventaDetalle.unidad, unidadNormalizada as "entero" | "porcion" | "porcion_llevar"));
      }

      const resultado = await db
        .select({ total: sql<number>`sum(${ventaDetalle.cantidad})` })
        .from(ventaDetalle)
        .innerJoin(ventas, eq(ventaDetalle.ventaId, ventas.id))
        .where(and(...conditions));

      return resultado[0]?.total ?? 0;
    },

    /**
     * Calcula el total vendido de TODOS los productos en una sesión (lote).
     * Retorna un mapa: `{ "productoId:unidad": cantidad }`.
     */
    async calcularVendidoLote(
      sesionCajaId: number
    ): Promise<Record<string, number>> {
      IdSchema.parse(sesionCajaId);

      const resultado = await db
        .select({
          productoId: ventaDetalle.productoId,
          unidad: ventaDetalle.unidad,
          total: sql<number>`sum(${ventaDetalle.cantidad})`,
        })
        .from(ventaDetalle)
        .innerJoin(ventas, eq(ventaDetalle.ventaId, ventas.id))
        .where(eq(ventas.sesionCajaId, sesionCajaId))
        .groupBy(ventaDetalle.productoId, ventaDetalle.unidad);

      const mapa: Record<string, number> = {};
      for (const row of resultado) {
        // Normalizar porcion_llevar → porcion
        const unidad = row.unidad === "porcion_llevar" ? "porcion" : row.unidad;
        const key = `${row.productoId}:${unidad}`;
        mapa[key] = (mapa[key] ?? 0) + (row.total ?? 0);
      }
      return mapa;
    },

    /**
     * Verifica disponibilidad de stock para un producto.
     * Retorna si hay stock suficiente y la cantidad disponible.
     */
    async verificarDisponibilidad(
      productoId: number,
      sesionCajaId: number,
      unidad: "entero" | "porcion",
      cantidadRequerida: number
    ): Promise<{ suficiente: boolean; disponible: number }> {
      IdSchema.parse(productoId);
      IdSchema.parse(sesionCajaId);

      const calc = await calcularStockDisponible(db, productoId, sesionCajaId, unidad);
      return { suficiente: calc.disponible >= cantidadRequerida, disponible: calc.disponible };
    },
  };
}
