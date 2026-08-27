/**
 * Utilidad compartida para calcular stock disponible.
 * Fórmula unificada: inicial + agregada - vendido - mermas - cortesías + corteAjuste
 *
 * Usada por: stock/index.ts, ventas/index.ts, caja/index.ts
 */
import {
  PosDatabase,
  stockDiario,
  cortesProducto,
  mermas,
  cortesias,
  ventas,
  ventaDetalle,
  eq,
  and,
  sql,
} from "@pos/db";

export async function calcularStockDisponible(
  db: PosDatabase,
  productoId: number,
  sesionCajaId: number,
  unidad: "entero" | "porcion" | "porcion_llevar"
): Promise<{ stockInicial: number; agregada: number; vendido: number; mermas: number; cortesias: number; corteAjuste: number; disponible: number }> {
  const unidadNormalizada = unidad === "porcion_llevar" ? "porcion" : unidad;

  // Stock diario
  const stockResult = await db
    .select()
    .from(stockDiario)
    .where(
      and(
        eq(stockDiario.productoId, productoId),
        eq(stockDiario.sesionCajaId, sesionCajaId),
        eq(stockDiario.unidad, unidadNormalizada)
      )
    )
    .limit(1);

  if (stockResult.length === 0) {
    return { stockInicial: 0, agregada: 0, vendido: 0, mermas: 0, cortesias: 0, corteAjuste: 0, disponible: 0 };
  }

  const s = stockResult[0]!;
  const stockInicial = s.cantidadInicial;
  const agregada = s.cantidadAgregada;

  // Vendido
  const vendidoResult = await db
    .select({ total: sql<number>`coalesce(sum(${ventaDetalle.cantidad}), 0)` })
    .from(ventaDetalle)
    .innerJoin(ventas, eq(ventaDetalle.ventaId, ventas.id))
    .where(
      and(
        eq(ventaDetalle.productoId, productoId),
        eq(ventas.sesionCajaId, sesionCajaId),
        eq(ventaDetalle.unidad, unidadNormalizada)
      )
    );
  const vendido = vendidoResult[0]?.total ?? 0;

  // Mermas
  const mermasResult = await db
    .select({ total: sql<number>`coalesce(sum(${mermas.cantidad}), 0)` })
    .from(mermas)
    .where(
      and(
        eq(mermas.productoId, productoId),
        eq(mermas.sesionCajaId, sesionCajaId),
        eq(mermas.unidad, unidadNormalizada)
      )
    );
  const totalMermas = mermasResult[0]?.total ?? 0;

  // Cortesías
  const cortesiasResult = await db
    .select({ total: sql<number>`coalesce(sum(${cortesias.cantidad}), 0)` })
    .from(cortesias)
    .where(
      and(
        eq(cortesias.productoId, productoId),
        eq(cortesias.sesionCajaId, sesionCajaId),
        eq(cortesias.unidad, unidadNormalizada)
      )
    );
  const totalCortesias = cortesiasResult[0]?.total ?? 0;

  // Ajuste por cortes entero→porción
  let corteAjuste = 0;
  if (unidadNormalizada === "entero" || unidadNormalizada === "porcion") {
    const cortesResult = await db
      .select({
        enteras: sql<number>`coalesce(sum(${cortesProducto.unidadesEnteras}), 0)`,
        porciones: sql<number>`coalesce(sum(${cortesProducto.porcionesObtenidas}), 0)`,
      })
      .from(cortesProducto)
      .where(
        and(
          eq(cortesProducto.productoId, productoId),
          eq(cortesProducto.sesionCajaId, sesionCajaId)
        )
      );
    corteAjuste =
      unidadNormalizada === "entero"
        ? -(cortesResult[0]?.enteras ?? 0)
        : (cortesResult[0]?.porciones ?? 0);
  }

  const disponible = stockInicial + agregada - vendido - totalMermas - totalCortesias + corteAjuste;

  return { stockInicial, agregada, vendido, mermas: totalMermas, cortesias: totalCortesias, corteAjuste, disponible };
}
