/**
 * EventBus tipado.
 *
 * Por qué existe: el módulo de ventas emite eventos sin saber quién los
 * escucha. Hoy nadie escucha "venta:creada". El día que se construya
 * /packages/facturacion-sri, se suscribe aquí sin tocar el código de
 * ventas ya probado. Ver AGENT.md sección 3 (arquitectura) y sección 5.3 (SOLID).
 *
 * Payloads diseñados para soportar facturación SRI y reporting sin
 * necesidad de queries adicionales en el subscriber.
 */

export type EventoSistema =
  | {
      tipo: "venta:creada";
      payload: {
        ventaId: number;
        sesionCajaId: number;
        total: number;
        metodoPago: "efectivo" | "transferencia";
        tipoOrigen: "mostrador" | "pedido" | "cortesia";
        requiereFactura: boolean;
        clienteIdentificacion: string | null;
        clienteNombre: string | null;
        fechaHora: string;
      };
    }
  | {
      tipo: "pedido:entregado";
      payload: {
        pedidoId: number;
        cliente: string;
        totalEstimado: number;
        anticipo: number;
        saldoPendiente: number;
        metodoPagoSaldo: "efectivo" | "transferencia" | null;
        requiereFactura: boolean;
        clienteIdentificacion: string | null;
        fechaEntrega: string;
      };
    }
  | {
      tipo: "cierre:completado";
      payload: {
        sesionCajaId: number;
        fecha: string;
        usuarioId: number;
        totalVentas: number;
        totalGastos: number;
        diferencia: number;
      };
    }
  | {
      tipo: "cierre:diferencia_detectada";
      payload: {
        sesionCajaId: number;
        fecha: string;
        usuarioId: number;
        diferencia: number;
        totalEsperado: number;
        totalReal: number;
      };
    };

type Handler<T extends EventoSistema["tipo"]> = (
  payload: Extract<EventoSistema, { tipo: T }>["payload"]
) => void | Promise<void>;

export class EventBus {
  private handlers = new Map<string, Handler<any>[]>();

  on<T extends EventoSistema["tipo"]>(tipo: T, handler: Handler<T>): void {
    const lista = this.handlers.get(tipo) ?? [];
    lista.push(handler);
    this.handlers.set(tipo, lista);
  }

  async emit<T extends EventoSistema["tipo"]>(
    tipo: T,
    payload: Extract<EventoSistema, { tipo: T }>["payload"]
  ): Promise<void> {
    const lista = this.handlers.get(tipo) ?? [];
    for (const handler of lista) {
      await handler(payload);
    }
  }
}

export const eventBus = new EventBus();
