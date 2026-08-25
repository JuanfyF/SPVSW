/**
 * Módulo: Pedidos y anticipos (AGENT.md sección 2.2)
 *
 * Creación de pedidos con anticipo obligatorio.
 * Flujo: pendiente -> en_proceso -> listo -> entregado
 * Cancelación con devolución de anticipo.
 */

import {
  PosDatabase,
  pedidos,
  pedidoDetalle,
  devolucionesAnticipo,
  sesionesCaja,
  eq,
  and,
  notInArray,
  gte,
  lte,
} from "@pos/db";
import {
  CrearPedidoInput,
  CrearPedidoSchema,
  ListarPedidosFechaInput,
  ListarPedidosFechaSchema,
  EntregarPedidoSchema,
  CancelarPedidoSchema,
  ListarPedidosEstadoSchema,
  IdSchema,
  formatearFecha,
} from "@pos/shared";
import { eventBus } from "@pos/shared";

export function crearServicioPedidos(db: PosDatabase) {
  return {
    /**
     * Crea un nuevo pedido con anticipo obligatorio.
     */
    async crear(datos: CrearPedidoInput) {
      const validados = CrearPedidoSchema.parse(datos);

      // Validar que la sesión de caja exista
      const existeSesion = await db.select().from(sesionesCaja).where(eq(sesionesCaja.id, validados.sesionCajaAnticipoId)).limit(1);
      if (existeSesion.length === 0) throw new Error("Sesión de caja no encontrada");

      // Verificar que el anticipo no exceda el total estimado
      if (validados.anticipo > validados.totalEstimado) {
        throw new Error("El anticipo no puede exceder el total estimado");
      }

      // Calcular saldo pendiente
      const saldoPendiente = validados.totalEstimado - validados.anticipo;

      // Crear el pedido
      const pedidoResultado = await db
        .insert(pedidos)
        .values({
          cliente: validados.cliente,
          telefono: validados.telefono ?? null,
          fechaPedido: validados.fechaPedido,
          fechaEntrega: validados.fechaEntrega,
          horaEntrega: validados.horaEntrega ?? "12:00",
          anticipo: validados.anticipo,
          metodoPagoAnticipo: validados.metodoPagoAnticipo,
          sesionCajaAnticipoId: validados.sesionCajaAnticipoId,
          totalEstimado: validados.totalEstimado,
          saldoPendiente,
          notas: validados.notas ?? null,
          requiereFactura: validados.requiereFactura ?? false,
          clienteIdentificacion: validados.clienteIdentificacion ?? null,
        })
        .returning();

      const pedido = pedidoResultado[0];
      if (!pedido) {
        throw new Error("Error al crear el pedido");
      }

      // Crear los detalles
      for (const detalle of validados.detalles) {
        await db.insert(pedidoDetalle).values({
          pedidoId: pedido.id,
          productoId: detalle.productoId ?? null,
          descripcionPersonalizada: detalle.descripcionPersonalizada ?? null,
          unidad: detalle.unidad,
          cantidad: detalle.cantidad,
          precioUnitario: detalle.precioUnitario,
          subtotal: detalle.subtotal,
        });
      }

      return pedido;
    },

    /**
     * Marca un pedido como listo para entregar.
     */
    async marcarListo(pedidoId: number) {
      IdSchema.parse(pedidoId);
      const pedido = await this.obtenerPorId(pedidoId);
      if (!pedido) {
        throw new Error("Pedido no encontrado");
      }

      if (pedido.estado !== "en_proceso") {
        throw new Error("Solo se puede marcar como listo un pedido en proceso");
      }

      await db
        .update(pedidos)
        .set({ estado: "listo" })
        .where(eq(pedidos.id, pedidoId));
    },

    /**
     * Actualiza el estado de un pedido.
     * Transiciones válidas: pendiente → en_proceso → listo → entregado
     */
    async actualizarEstado(pedidoId: number, nuevoEstado: "pendiente" | "en_proceso" | "listo" | "entregado" | "cancelado") {
      IdSchema.parse(pedidoId);
      const pedido = await this.obtenerPorId(pedidoId);
      if (!pedido) {
        throw new Error("Pedido no encontrado");
      }

      const transicionesPermitidas: Record<string, string[]> = {
        pendiente: ["en_proceso", "cancelado"],
        en_proceso: ["listo", "cancelado"],
        listo: ["entregado", "cancelado"],
      };

      const permitidos = transicionesPermitidas[pedido.estado] ?? [];
      if (!permitidos.includes(nuevoEstado)) {
        throw new Error(
          `No se puede cambiar de "${pedido.estado}" a "${nuevoEstado}". ` +
          `Transiciones permitidas: ${permitidos.join(", ")}`
        );
      }

      await db
        .update(pedidos)
        .set({ estado: nuevoEstado })
        .where(eq(pedidos.id, pedidoId));

      return { exito: true };
    },

    /**
     * Entrega un pedido y cobra el saldo pendiente si existe.
     */
    async entregar(
      pedidoId: number,
      sesionCajaEntregaId: number,
      metodoPagoSaldo?: "efectivo" | "transferencia"
    ) {
      const validados = EntregarPedidoSchema.parse({ pedidoId, sesionCajaEntregaId, metodoPagoSaldo });
      const pedido = await this.obtenerPorId(validados.pedidoId);
      if (!pedido) {
        throw new Error("Pedido no encontrado");
      }

      if (pedido.estado !== "listo") {
        throw new Error("Solo se puede entregar un pedido listo");
      }

      // Si hay saldo pendiente, cobrar
      if (pedido.saldoPendiente > 0) {
        if (!validados.metodoPagoSaldo) {
          throw new Error(
            "Se requiere método de pago para cobrar saldo pendiente"
          );
        }

        await db
          .update(pedidos)
          .set({
            estado: "entregado",
            metodoPagoSaldo: validados.metodoPagoSaldo,
            sesionCajaEntregaId: validados.sesionCajaEntregaId,
            saldoPendiente: 0,
          })
          .where(eq(pedidos.id, validados.pedidoId));
      } else {
        // Sin saldo pendiente, solo cambiar estado
        await db
          .update(pedidos)
          .set({
            estado: "entregado",
            sesionCajaEntregaId: validados.sesionCajaEntregaId,
          })
          .where(eq(pedidos.id, validados.pedidoId));
      }

      // Emitir evento
      eventBus.emit("pedido:entregado", { pedidoId: validados.pedidoId });
    },

    /**
     * Revierte una entrega fallida (rollback compensatorio).
     * Restaura directamente los campos que entregar() modificó.
     */
    async revertirEntrega(pedidoId: number) {
      IdSchema.parse(pedidoId);
      const pedido = await this.obtenerPorId(pedidoId);
      if (!pedido) throw new Error("Pedido no encontrado");

      const saldoPendiente = Math.max(
        (pedido.totalEstimado ?? 0) - (pedido.anticipo ?? 0),
        0
      );

      await db
        .update(pedidos)
        .set({
          estado: "listo",
          metodoPagoSaldo: null,
          sesionCajaEntregaId: null,
          saldoPendiente,
        })
        .where(eq(pedidos.id, pedidoId));
    },

    /**
     * Cancela un pedido y devuelve el anticipo.
     * sesionCajaDevolucionId: sesión ACTUAL de donde sale el dinero devuelto.
     * Si se omite, se usa la sesión original del anticipo (retrocompatibilidad).
     */
    async cancelar(
      pedidoId: number,
      motivo: string,
      metodoDevolucion: "efectivo" | "transferencia",
      registradoPor: number,
      sesionCajaDevolucionId?: number
    ) {
      const validados = CancelarPedidoSchema.parse({ pedidoId, motivo, metodoDevolucion, registradoPor });
      const pedido = await this.obtenerPorId(validados.pedidoId);
      if (!pedido) {
        throw new Error("Pedido no encontrado");
      }

      if (pedido.estado === "cancelado") {
        throw new Error("El pedido ya está cancelado");
      }

      if (pedido.estado === "entregado") {
        throw new Error("No se puede cancelar un pedido ya entregado");
      }

      // Crear devolución de anticipo si se pagó anticipo
      if (pedido.anticipo > 0) {
        const fechaActual = formatearFecha(new Date());
        await db.insert(devolucionesAnticipo).values({
          pedidoId: validados.pedidoId,
          sesionCajaId: sesionCajaDevolucionId ?? pedido.sesionCajaAnticipoId,
          monto: pedido.anticipo,
          fecha: fechaActual,
          metodoDevolucion: validados.metodoDevolucion,
          motivo: validados.motivo,
          registradoPor: validados.registradoPor,
        });
      }

      // Marcar pedido como cancelado
      await db
        .update(pedidos)
        .set({ estado: "cancelado", saldoPendiente: 0 })
        .where(eq(pedidos.id, validados.pedidoId));
    },

    /**
     * Lista los pedidos por estado.
     */
    async listarPorEstado(estado: string) {
      const validados = ListarPedidosEstadoSchema.parse({ estado });
      return db
        .select()
        .from(pedidos)
        .where(eq(pedidos.estado, validados.estado));
    },

    /**
     * Lista todos los pedidos activos (no cancelados ni entregados).
     */
    async listarActivos() {
      return db
        .select()
        .from(pedidos)
        .where(
          notInArray(pedidos.estado, ["cancelado", "entregado"])
        );
    },

    /**
     * Lista TODOS los pedidos (incluye entregados y cancelados).
     */
    async listarTodos() {
      return db.select().from(pedidos).orderBy(pedidos.fechaEntrega);
    },

    /**
     * Lista pedidos por sesión de caja del anticipo (incluso entregados).
     * Usado para cierre de caja.
     */
    async listarPorSesionAnticipo(sesionCajaId: number) {
      return db
        .select()
        .from(pedidos)
        .where(eq(pedidos.sesionCajaAnticipoId, sesionCajaId));
    },

    /**
     * Lista pedidos por rango de fechas de entrega.
     */
    async listarPorFecha(fechaInicio: string, fechaFin: string) {
      const validados = ListarPedidosFechaSchema.parse({ fechaInicio, fechaFin });
      return db
        .select()
        .from(pedidos)
        .where(
          and(
            gte(pedidos.fechaEntrega, validados.fechaInicio),
            lte(pedidos.fechaEntrega, validados.fechaFin)
          )
        )
        .orderBy(pedidos.fechaEntrega);
    },

    /**
     * Obtiene un pedido por ID.
     */
    async obtenerPorId(id: number) {
      IdSchema.parse(id);
      const resultado = await db
        .select()
        .from(pedidos)
        .where(eq(pedidos.id, id))
        .limit(1);

      return resultado[0] ?? null;
    },

    /**
     * Obtiene el detalle de un pedido.
     */
    async obtenerDetalle(pedidoId: number) {
      IdSchema.parse(pedidoId);
      return db
        .select()
        .from(pedidoDetalle)
        .where(eq(pedidoDetalle.pedidoId, pedidoId));
    },

    /**
     * Obtiene resumen de un pedido con detalles.
     */
    async obtenerResumen(pedidoId: number) {
      IdSchema.parse(pedidoId);
      const pedido = await this.obtenerPorId(pedidoId);
      if (!pedido) return null;

      const detalles = await this.obtenerDetalle(pedidoId);
      const devoluciones = await db
        .select()
        .from(devolucionesAnticipo)
        .where(eq(devolucionesAnticipo.pedidoId, pedidoId));

      const totalDevoluciones = devoluciones.reduce((acc, d) => acc + d.monto, 0);
      const totalPagado = pedido.anticipo - totalDevoluciones;
      // Saldo real recalculado: nunca menor a 0
      const saldoPendiente = Math.max(
        (pedido.totalEstimado ?? 0) - pedido.anticipo + totalDevoluciones,
        0
      );

      return {
        pedido,
        detalles,
        devoluciones,
        totalPagado,
        saldoPendiente,
      };
    },
  };
}
