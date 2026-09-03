/**
 * Módulo: Gastos (AGENT.md sección 2.3)
 *
 * Registro de gastos de caja y pedidos.
 * Categorías predefinidas: insumos, servicios, mantenimiento, otro.
 */

import {
  PosDatabase,
  gastos,
  categoriasGasto,
  sesionesCaja,
  usuarios,
  ventas,
  pedidos,
  adelantosSueldo,
  devolucionesAnticipo,
  eq,
  and,
  sql,
} from "@pos/db";
import { CrearGastoInput, CrearGastoSchema, CrearCategoriaGastoSchema, IdSchema } from "@pos/shared";

export function crearServicioGastos(db: PosDatabase) {
  return {
    /**
     * Crea un nuevo gasto.
     */
    async crear(datos: CrearGastoInput) {
      const validados = CrearGastoSchema.parse(datos);

      // Verificar que la categoría exista
      const categoria = await db
        .select()
        .from(categoriasGasto)
        .where(eq(categoriasGasto.id, validados.categoriaId))
        .limit(1);

      if (categoria.length === 0) {
        throw new Error("Categoría de gasto no encontrada");
      }

      const existeSesion = await db
        .select({ id: sesionesCaja.id })
        .from(sesionesCaja)
        .where(eq(sesionesCaja.id, validados.sesionCajaId))
        .limit(1);
      if (existeSesion.length === 0)
        throw new Error("Sesión de caja no encontrada");

      const existeUsuario = await db
        .select({ id: usuarios.id })
        .from(usuarios)
        .where(eq(usuarios.id, validados.registradoPor))
        .limit(1);
      if (existeUsuario.length === 0)
        throw new Error("Usuario no encontrado");

      // Verificar que haya saldo disponible en la caja
      const ventasResult = await db
        .select({ total: sql<number>`coalesce(sum(${ventas.total}), 0)` })
        .from(ventas)
        .where(eq(ventas.sesionCajaId, validados.sesionCajaId));
      const anticiposResult = await db
        .select({ total: sql<number>`coalesce(sum(${pedidos.anticipo}), 0)` })
        .from(pedidos)
        .where(eq(pedidos.sesionCajaAnticipoId, validados.sesionCajaId));
      const gastosResult = await db
        .select({ total: sql<number>`coalesce(sum(${gastos.monto}), 0)` })
        .from(gastos)
        .where(eq(gastos.sesionCajaId, validados.sesionCajaId));
      const adelantosResult = await db
        .select({ total: sql<number>`coalesce(sum(${adelantosSueldo.monto}), 0)` })
        .from(adelantosSueldo)
        .where(eq(adelantosSueldo.sesionCajaId, validados.sesionCajaId));
      const devolucionesResult = await db
        .select({ total: sql<number>`coalesce(sum(${devolucionesAnticipo.monto}), 0)` })
        .from(devolucionesAnticipo)
        .where(eq(devolucionesAnticipo.sesionCajaId, validados.sesionCajaId));

      const efectivoEsperado =
        (ventasResult[0]?.total ?? 0) +
        (anticiposResult[0]?.total ?? 0) -
        (gastosResult[0]?.total ?? 0) -
        (adelantosResult[0]?.total ?? 0) -
        (devolucionesResult[0]?.total ?? 0);

      if (validados.monto > efectivoEsperado) {
        throw new Error(
          `Saldo insuficiente en caja. Disponible: $${efectivoEsperado.toFixed(2)}, gasto: $${validados.monto.toFixed(2)}`
        );
      }

      const resultado = await db
        .insert(gastos)
        .values({
          fecha: validados.fecha,
          sesionCajaId: validados.sesionCajaId,
          categoriaId: validados.categoriaId,
          descripcion: validados.descripcion,
          monto: validados.monto,
          origen: validados.origen,
          registradoPor: validados.registradoPor,
        })
        .returning();

      return resultado[0];
    },

    /**
     * Lista los gastos de una sesión.
     */
    async listarPorSesion(sesionCajaId: number) {
      const validado = IdSchema.parse(sesionCajaId);
      return db
        .select()
        .from(gastos)
        .where(eq(gastos.sesionCajaId, validado));
    },

    /**
     * Lista gastos por categoría.
     */
    async listarPorCategoria(categoriaId: number, sesionCajaId?: number) {
      const validadoCategoria = IdSchema.parse(categoriaId);
      const condiciones = [eq(gastos.categoriaId, validadoCategoria)];
      if (sesionCajaId !== undefined) {
        const validadoSesion = IdSchema.parse(sesionCajaId);
        condiciones.push(eq(gastos.sesionCajaId, validadoSesion));
      }

      return db
        .select()
        .from(gastos)
        .where(and(...condiciones));
    },

    /**
     * Obtiene el total de gastos por origen.
     */
    async obtenerTotalPorOrigen(sesionCajaId: number) {
      const validado = IdSchema.parse(sesionCajaId);
      const resultado = await db
        .select({
          origen: gastos.origen,
          total: sql<number>`sum(${gastos.monto})`,
        })
        .from(gastos)
        .where(eq(gastos.sesionCajaId, validado))
        .groupBy(gastos.origen);

      const caja = resultado.find((r) => r.origen === "caja")?.total ?? 0;
      const pedidos =
        resultado.find((r) => r.origen === "pedidos")?.total ?? 0;

      return { caja, pedidos };
    },

    /**
     * Lista todas las categorías de gasto.
     */
    async listarCategorias() {
      return db.select().from(categoriasGasto);
    },

    /**
     * Crea una nueva categoría de gasto.
     */
    async crearCategoria(nombre: string) {
      const validados = CrearCategoriaGastoSchema.parse({ nombre });

      const existente = await db
        .select({ id: categoriasGasto.id })
        .from(categoriasGasto)
        .where(eq(categoriasGasto.nombre, validados.nombre))
        .limit(1);
      if (existente.length > 0)
        throw new Error("Ya existe una categoría con ese nombre");

      const resultado = await db
        .insert(categoriasGasto)
        .values({ nombre: validados.nombre })
        .returning();

      return resultado[0];
    },

    /**
     * Obtiene un gasto por ID.
     */
    async obtenerPorId(id: number) {
      const resultado = await db
        .select()
        .from(gastos)
        .where(eq(gastos.id, id))
        .limit(1);

      return resultado[0] ?? null;
    },
  };
}
