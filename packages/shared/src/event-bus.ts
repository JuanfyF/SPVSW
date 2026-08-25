/**
 * EventBus tipado.
 *
 * Por qué existe: el módulo de ventas emite eventos sin saber quién los
 * escucha. Hoy nadie escucha "venta:creada". El día que se construya
 * /packages/facturacion-sri, se suscribe aquí sin tocar el código de
 * ventas ya probado. Ver AGENT.md sección 3 (arquitectura) y sección 5.3 (SOLID).
 *
 * TODO(fase 3): definir el payload real de cada evento junto con el
 * módulo de core correspondiente. Estos son placeholders de forma.
 */

export type EventoSistema =
  | { tipo: "venta:creada"; payload: { ventaId: number } }
  | { tipo: "pedido:entregado"; payload: { pedidoId: number } }
  | { tipo: "cierre:completado"; payload: { sesionCajaId: number } }
  | { tipo: "cierre:diferencia_detectada"; payload: { sesionCajaId: number } };

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
