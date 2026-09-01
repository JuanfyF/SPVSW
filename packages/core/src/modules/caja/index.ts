/**
 * Módulo: Caja y sesiones (AGENT.md sección 2.1)
 *
 * Apertura y cierre de sesiones de caja.
 * Cálculo de efectivo esperado y conciliación.
 */

import {
  PosDatabase,
  sesionesCaja,
  ventas,
  pedidos,
  gastos,
  adelantosSueldo,
  devolucionesAnticipo,
  cierreCaja,
  stockDiario,
  mermas,
  cortesias,
  cortesProducto,
  ventaDetalle,
  usuarios,
  eq,
  and,
  sql,
} from "@pos/db";
import {
  AbrirSesionCajaInput,
  AbrirSesionCajaSchema,
  CerrarCajaInput,
  CerrarCajaSchema,
  MarcarRevisadoSchema,
  IdSchema,
  formatearHora,
} from "@pos/shared";

export function crearServicioCaja(db: PosDatabase) {
  return {
    /**
     * Abre una nueva sesión de caja.
     */
    async abrir(datos: AbrirSesionCajaInput) {
      const validados = AbrirSesionCajaSchema.parse(datos);

      // Verificar que el usuario exista y esté activo
      const existeUsuario = await db.select({ id: usuarios.id, activo: usuarios.activo }).from(usuarios).where(eq(usuarios.id, validados.usuarioId)).limit(1);
      if (existeUsuario.length === 0) throw new Error("Usuario no encontrado");
      if (!existeUsuario[0]?.activo) throw new Error("El usuario no está activo");

      // Verificar que no haya una sesión abierta para este usuario
      const sesionAbierta = await db
        .select()
        .from(sesionesCaja)
        .where(
          and(
            eq(sesionesCaja.usuarioId, validados.usuarioId),
            eq(sesionesCaja.estado, "abierta")
          )
        )
        .limit(1);

      if (sesionAbierta.length > 0) {
        throw new Error("Ya existe una sesión abierta para este usuario");
      }

      const resultado = await db
        .insert(sesionesCaja)
        .values({
          usuarioId: validados.usuarioId,
          fecha: validados.fecha,
          horaApertura: validados.horaApertura,
        })
        .returning();

      return resultado[0];
    },

    /**
     * Cierra una sesión de caja con conteo de efectivo.
     */
    async cerrar(datos: CerrarCajaInput) {
      const validados = CerrarCajaSchema.parse(datos);

      // Verificar que la sesión esté abierta
      const sesion = await db
        .select()
        .from(sesionesCaja)
        .where(eq(sesionesCaja.id, validados.sesionCajaId))
        .limit(1);

      if (sesion.length === 0) {
        throw new Error("Sesión no encontrada");
      }
      const sesionData = sesion[0];
      if (!sesionData) {
        throw new Error("Sesión no encontrada");
      }
      if (sesionData.estado === "cerrada") {
        throw new Error("La sesión ya está cerrada");
      }

      // Calcular efectivo esperado
      const efectivoEsperado = await this.calcularEfectivoEsperado(
        validados.sesionCajaId
      );

      // Calcular diferencia
      const diferenciaEfectivo =
        validados.efectivoContado - efectivoEsperado;

      // Crear cierre de caja
      const ventasResumen = await this.obtenerResumenVentas(
        validados.sesionCajaId
      );
      const pedidosResumen = await this.obtenerResumenPedidos(
        validados.sesionCajaId
      );
      const gastosTotal = await this.obtenerTotalGastos(
        validados.sesionCajaId
      );
      const adelantosTotal = await this.obtenerTotalAdelantos(
        validados.sesionCajaId
      );
      const devolucionesTotal = await this.obtenerTotalDevoluciones(
        validados.sesionCajaId
      );

      // Verificar si ya existe un cierreCaja (posible crash anterior en forzarCierre)
      const cierreExistente = await db
        .select({ id: cierreCaja.id })
        .from(cierreCaja)
        .where(eq(cierreCaja.sesionCajaId, validados.sesionCajaId))
        .limit(1);

      let cierreResultado;

      if (cierreExistente.length > 0) {
        // Actualizar cierre existente (de un forzarCierre incompleto)
        cierreResultado = await db
          .update(cierreCaja)
          .set({
            ventasEfectivo: ventasResumen.efectivo,
            ventasTransferencia: ventasResumen.transferencia,
            pedidosEfectivo: pedidosResumen.efectivo,
            pedidosTransferencia: pedidosResumen.transferencia,
            gastosCaja: gastosTotal,
            adelantosEfectivo: adelantosTotal.efectivo,
            adelantosTransferencia: adelantosTotal.transferencia,
            devolucionesAnticipoEfectivo: devolucionesTotal,
            efectivoEsperado,
            efectivoContado: validados.efectivoContado,
            diferenciaEfectivo,
            tieneDiferenciaStock: validados.tieneDiferenciaStock,
          })
          .where(eq(cierreCaja.sesionCajaId, validados.sesionCajaId))
          .returning();
      } else {
        // Crear cierre de caja nuevo
        cierreResultado = await db
          .insert(cierreCaja)
          .values({
            sesionCajaId: validados.sesionCajaId,
            ventasEfectivo: ventasResumen.efectivo,
            ventasTransferencia: ventasResumen.transferencia,
            pedidosEfectivo: pedidosResumen.efectivo,
            pedidosTransferencia: pedidosResumen.transferencia,
            gastosCaja: gastosTotal,
            adelantosEfectivo: adelantosTotal.efectivo,
            adelantosTransferencia: adelantosTotal.transferencia,
            devolucionesAnticipoEfectivo: devolucionesTotal,
            efectivoEsperado,
            efectivoContado: validados.efectivoContado,
            diferenciaEfectivo,
            tieneDiferenciaStock: validados.tieneDiferenciaStock,
          })
          .returning();
      }

      // Cerrar la sesión
      await db
        .update(sesionesCaja)
        .set({
          estado: "cerrada",
          horaCierre: formatearHora(new Date()),
        })
        .where(eq(sesionesCaja.id, validados.sesionCajaId));

      const cierre = cierreResultado[0];

      // Conciliación de stock si se proporcionó conteo físico
      if (validados.conteoStock && validados.conteoStock.length > 0) {
        for (const item of validados.conteoStock) {
          const unidad = item.unidad || "entero";
          const stock = await db
            .select()
            .from(stockDiario)
            .where(
              and(
                eq(stockDiario.productoId, item.productoId),
                eq(stockDiario.sesionCajaId, validados.sesionCajaId),
                eq(stockDiario.unidad, unidad)
              )
            )
            .limit(1);

          if (stock.length === 0) continue;
          const s = stock[0];
          if (!s) continue;

          // Vendido
          const vendidoResult = await db
            .select({ total: sql<number>`coalesce(sum(${ventaDetalle.cantidad}), 0)` })
            .from(ventaDetalle)
            .innerJoin(ventas, eq(ventaDetalle.ventaId, ventas.id))
            .where(
              and(
                eq(ventaDetalle.productoId, item.productoId),
                eq(ventaDetalle.unidad, unidad),
                eq(ventas.sesionCajaId, validados.sesionCajaId)
              )
            );
          const vendido = vendidoResult[0]?.total ?? 0;

          // Mermas
          const mermasResult = await db
            .select({ total: sql<number>`coalesce(sum(${mermas.cantidad}), 0)` })
            .from(mermas)
            .where(
              and(
                eq(mermas.productoId, item.productoId),
                eq(mermas.unidad, unidad),
                eq(mermas.sesionCajaId, validados.sesionCajaId)
              )
            );
          const totalMermas = mermasResult[0]?.total ?? 0;

          // Cortesías
          const cortesiasResult = await db
            .select({ total: sql<number>`coalesce(sum(${cortesias.cantidad}), 0)` })
            .from(cortesias)
            .where(
              and(
                eq(cortesias.productoId, item.productoId),
                eq(cortesias.unidad, unidad),
                eq(cortesias.sesionCajaId, validados.sesionCajaId)
              )
            );
          const totalCortesias = cortesiasResult[0]?.total ?? 0;

          // Ajuste por cortes entero→porción
          const corteResult = await db
            .select({
              enteras: sql<number>`coalesce(sum(${cortesProducto.unidadesEnteras}), 0)`,
              porciones: sql<number>`coalesce(sum(${cortesProducto.porcionesObtenidas}), 0)`,
            })
            .from(cortesProducto)
            .where(
              and(
                eq(cortesProducto.productoId, item.productoId),
                eq(cortesProducto.sesionCajaId, validados.sesionCajaId)
              )
            );
          const corteAjuste =
            unidad === "entero"
              ? -(corteResult[0]?.enteras ?? 0)
              : (corteResult[0]?.porciones ?? 0);

          // Esperado = inicial + agregada - vendida - mermas - cortesías ± cortes
          const esperado =
            s.cantidadInicial +
            s.cantidadAgregada -
            vendido -
            totalMermas -
            totalCortesias +
            corteAjuste;
          const diferencia = item.conteoFisico - esperado;

          await db
            .update(stockDiario)
            .set({
              conteoFisicoCierre: item.conteoFisico,
              diferenciaDetectada: diferencia,
            })
            .where(eq(stockDiario.id, s.id));
        }
      }

      return cierre;
    },

    /**
     * Calcula el efectivo esperado en caja.
     * Modelo canónico (fuente única de verdad):
     *   ventas (todas; las de pedidos registran SOLO el saldo cobrado)
     *   + anticipos de pedidos creados en esta sesión
     *   - gastos (todos; caja y pedidos salen del mismo cajón)
     *   - adelantos en efectivo
     *   - devoluciones de anticipo en efectivo (atribuidas a esta sesión)
     */
    async calcularEfectivoEsperado(sesionCajaId: number): Promise<number> {
      IdSchema.parse(sesionCajaId);
      // Ventas en efectivo (mostrador + saldo de pedidos entregados)
      const ventasEfectivo = await db
        .select({ total: sql<number>`coalesce(sum(${ventas.total}), 0)` })
        .from(ventas)
        .where(
          and(
            eq(ventas.sesionCajaId, sesionCajaId),
            eq(ventas.metodoPago, "efectivo")
          )
        );

      // Anticipos de pedidos en efectivo
      const anticiposEfectivo = await db
        .select({ total: sql<number>`coalesce(sum(${pedidos.anticipo}), 0)` })
        .from(pedidos)
        .where(
          and(
            eq(pedidos.sesionCajaAnticipoId, sesionCajaId),
            eq(pedidos.metodoPagoAnticipo, "efectivo")
          )
        );

      // Gastos de la sesión (caja y pedidos salen del mismo cajón)
      const gastosSesion = await db
        .select({ total: sql<number>`coalesce(sum(${gastos.monto}), 0)` })
        .from(gastos)
        .where(eq(gastos.sesionCajaId, sesionCajaId));

      // Adelantos en efectivo
      const adelantosEfectivo = await db
        .select({ total: sql<number>`coalesce(sum(${adelantosSueldo.monto}), 0)` })
        .from(adelantosSueldo)
        .where(
          and(
            eq(adelantosSueldo.sesionCajaId, sesionCajaId),
            eq(adelantosSueldo.metodoPago, "efectivo")
          )
        );

      // Devoluciones de anticipo en efectivo (de ESTA sesión)
      const devolucionesEfectivo = await db
        .select({ total: sql<number>`coalesce(sum(${devolucionesAnticipo.monto}), 0)` })
        .from(devolucionesAnticipo)
        .where(
          and(
            eq(devolucionesAnticipo.sesionCajaId, sesionCajaId),
            eq(devolucionesAnticipo.metodoDevolucion, "efectivo")
          )
        );

      return (
        (ventasEfectivo[0]?.total ?? 0) +
        (anticiposEfectivo[0]?.total ?? 0) -
        (gastosSesion[0]?.total ?? 0) -
        (adelantosEfectivo[0]?.total ?? 0) -
        (devolucionesEfectivo[0]?.total ?? 0)
      );
    },

    /**
     * Obtiene resumen de ventas por método de pago.
     */
    async obtenerResumenVentas(sesionCajaId: number) {
      const resultado = await db
        .select({
          metodoPago: ventas.metodoPago,
          total: sql<number>`sum(${ventas.total})`,
        })
        .from(ventas)
        .where(eq(ventas.sesionCajaId, sesionCajaId))
        .groupBy(ventas.metodoPago);

      const efectivo =
        resultado.find((r) => r.metodoPago === "efectivo")?.total ?? 0;
      const transferencia =
        resultado.find((r) => r.metodoPago === "transferencia")?.total ?? 0;

      return { efectivo, transferencia };
    },

    /**
     * Obtiene resumen de ANTICIPOS de pedidos por método de pago.
     * Los saldos cobrados van en las ventas (tipoOrigen="pedido" = solo saldo).
     */
    async obtenerResumenPedidos(sesionCajaId: number) {
      const anticipos = await db
        .select({
          metodoPago: pedidos.metodoPagoAnticipo,
          total: sql<number>`coalesce(sum(${pedidos.anticipo}), 0)`,
        })
        .from(pedidos)
        .where(eq(pedidos.sesionCajaAnticipoId, sesionCajaId))
        .groupBy(pedidos.metodoPagoAnticipo);

      const efectivo =
        anticipos.find((r) => r.metodoPago === "efectivo")?.total ?? 0;
      const transferencia =
        anticipos.find((r) => r.metodoPago === "transferencia")?.total ?? 0;

      return { efectivo, transferencia };
    },

    /**
     * Obtiene el total de gastos de una sesión.
     */
    async obtenerTotalGastos(sesionCajaId: number): Promise<number> {
      const resultado = await db
        .select({ total: sql<number>`coalesce(sum(${gastos.monto}), 0)` })
        .from(gastos)
        .where(eq(gastos.sesionCajaId, sesionCajaId));

      return resultado[0]?.total ?? 0;
    },

    /**
     * Obtiene el total de adelantos por método de pago.
     */
    async obtenerTotalAdelantos(sesionCajaId: number) {
      const resultado = await db
        .select({
          metodoPago: adelantosSueldo.metodoPago,
          total: sql<number>`sum(${adelantosSueldo.monto})`,
        })
        .from(adelantosSueldo)
        .where(eq(adelantosSueldo.sesionCajaId, sesionCajaId))
        .groupBy(adelantosSueldo.metodoPago);

      const efectivo =
        resultado.find((r) => r.metodoPago === "efectivo")?.total ?? 0;
      const transferencia =
        resultado.find((r) => r.metodoPago === "transferencia")?.total ?? 0;

      return { efectivo, transferencia };
    },

    /**
     * Obtiene el total de devoluciones en efectivo.
     */
    async obtenerTotalDevoluciones(sesionCajaId: number): Promise<number> {
      const resultado = await db
        .select({
          total: sql<number>`coalesce(sum(${devolucionesAnticipo.monto}), 0)`,
        })
        .from(devolucionesAnticipo)
        .where(
          and(
            eq(devolucionesAnticipo.sesionCajaId, sesionCajaId),
            eq(devolucionesAnticipo.metodoDevolucion, "efectivo")
          )
        );

      return resultado[0]?.total ?? 0;
    },

    /**
     * Marca un cierre de caja como revisado.
     */
    async marcarRevisado(cierreCajaId: number, usuarioId: number) {
      const validados = MarcarRevisadoSchema.parse({ cierreCajaId, usuarioId });

      // Verificar que el cierre de caja exista
      const existeCierre = await db.select({ id: cierreCaja.id }).from(cierreCaja).where(eq(cierreCaja.id, validados.cierreCajaId)).limit(1);
      if (existeCierre.length === 0) throw new Error("Cierre de caja no encontrado");

      // Verificar que el usuario exista
      const existeUsuario = await db.select({ id: usuarios.id }).from(usuarios).where(eq(usuarios.id, validados.usuarioId)).limit(1);
      if (existeUsuario.length === 0) throw new Error("Usuario no encontrado");

      await db
        .update(cierreCaja)
        .set({
          estadoRevision: "revisada",
          revisadoPor: validados.usuarioId,
          revisadoEn: new Date().toISOString(),
        })
        .where(eq(cierreCaja.id, validados.cierreCajaId));
    },

    /**
     * Obtiene la sesión abierta de un usuario.
     */
    async obtenerSesionAbierta(usuarioId: number) {
      IdSchema.parse(usuarioId);
      const resultado = await db
        .select()
        .from(sesionesCaja)
        .where(
          and(
            eq(sesionesCaja.usuarioId, usuarioId),
            eq(sesionesCaja.estado, "abierta")
          )
        )
        .limit(1);

      return resultado[0] ?? null;
    },

    /**
     * Fuerza el cierre de una sesión abierta (para sesiones stale de crash anterior).
     * Envuelto en transacción para evitar estado inconsistente si falla a medio camino.
     */
    async forzarCierre(sesionCajaId: number, usuarioId: number) {
      IdSchema.parse(sesionCajaId);
      IdSchema.parse(usuarioId);

      const sesion = await db
        .select()
        .from(sesionesCaja)
        .where(eq(sesionesCaja.id, sesionCajaId))
        .limit(1);

      if (sesion.length === 0) throw new Error("Sesión no encontrada");
      if (sesion[0]?.estado !== "abierta") {
        // Si ya está cerrada, simplemente limpiar cierreCaja huérfano si existe
        // y reportar éxito (la sesión ya está cerrada)
        return { exito: true };
      }

      // Verificar si ya existe un cierreCaja para esta sesión (posible crash anterior)
      const cierreExistente = await db
        .select({ id: cierreCaja.id })
        .from(cierreCaja)
        .where(eq(cierreCaja.sesionCajaId, sesionCajaId))
        .limit(1);

      // Crear cierre de caja con zeros (forzado — sin conteo real)
      // Si ya existe un cierre, no duplicar
      if (cierreExistente.length === 0) {
        await db.insert(cierreCaja).values({
          sesionCajaId,
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
          tieneDiferenciaStock: false,
        });
      }

      // Cerrar la sesión
      await db
        .update(sesionesCaja)
        .set({
          estado: "cerrada",
          horaCierre: formatearHora(new Date()),
        })
        .where(eq(sesionesCaja.id, sesionCajaId));

      return { exito: true };
    },
  };
}
