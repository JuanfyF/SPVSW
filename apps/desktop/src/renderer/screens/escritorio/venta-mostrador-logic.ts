/**
 * Lógica pura del carrito de VentaMostrador.
 *
 * INVARIANTE: subtotal === cantidad * precioUnitario en TODAS las líneas.
 *
 * Bug que motivó este módulo: "agregar cortesía" mutaba la línea pagada
 * existente poniendo subtotal:0 con precioUnitario intacto y cantidad+1 →
 * la línea COMPLETA se regalaba (cantidad 3 × precio 25 cobraba $0).
 * Ahora la cortesía va en línea propia de $0 y solo se fusiona con otras
 * líneas gratis; una línea pagada nunca se fusiona con una gratis.
 */

export interface LineaCarrito<U extends string = string> {
  productoId: number;
  nombre: string;
  unidad: U;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

export type NuevaLineaPagada<U extends string = string> = Omit<
  LineaCarrito<U>,
  "cantidad" | "subtotal"
>;

export type BaseCortesia<U extends string = string> = Pick<
  LineaCarrito<U>,
  "productoId" | "nombre" | "unidad"
>;

function mismaLinea(a: LineaCarrito, b: Pick<LineaCarrito, "productoId" | "unidad">): boolean {
  return a.productoId === b.productoId && a.unidad === b.unidad;
}

/**
 * Agrega una unidad pagada. Se fusiona solo con líneas del mismo producto,
 * unidad Y precio (una cortesía $0 previa no "absorbe" lo pagado ni viceversa).
 */
export function agregarLineaPagada<U extends string>(
  carrito: LineaCarrito<U>[],
  nueva: NuevaLineaPagada<U>
): LineaCarrito<U>[] {
  const idx = carrito.findIndex(
    (l) => mismaLinea(l, nueva) && l.precioUnitario === nueva.precioUnitario
  );
  if (idx >= 0) {
    return carrito.map((l, i) =>
      i === idx
        ? { ...l, cantidad: l.cantidad + 1, subtotal: (l.cantidad + 1) * l.precioUnitario }
        : l
    );
  }
  return [...carrito, { ...nueva, cantidad: 1, subtotal: nueva.precioUnitario }];
}

/**
 * Agrega una unidad de cortesía ($0). Se fusiona solo con líneas gratis
 * existentes del mismo producto/unidad; jamás toca una línea pagada.
 */
export function agregarLineaCortesia<U extends string>(
  carrito: LineaCarrito<U>[],
  base: BaseCortesia<U>
): LineaCarrito<U>[] {
  const idx = carrito.findIndex(
    (l) => mismaLinea(l, base) && l.precioUnitario === 0 && l.subtotal === 0
  );
  if (idx >= 0) {
    return carrito.map((l, i) =>
      i === idx ? { ...l, cantidad: l.cantidad + 1, subtotal: 0 } : l
    );
  }
  return [...carrito, { ...base, cantidad: 1, precioUnitario: 0, subtotal: 0 }];
}

/**
 * Cantidad total requerida por (productoId, unidad) para verificar stock
 * una sola vez por producto. Con líneas separadas (pagada + cortesía) un
 * chequeo por línea daría falsos positivos: cada una ve el stock completo.
 */
export function cantidadesPorProducto<U extends string>(
  carrito: LineaCarrito<U>[]
): Map<string, { productoId: number; unidad: U; cantidad: number }> {
  const mapa = new Map<string, { productoId: number; unidad: U; cantidad: number }>();
  for (const l of carrito) {
    const key = `${l.productoId}:${l.unidad}`;
    const actual = mapa.get(key);
    if (actual) {
      actual.cantidad += l.cantidad;
    } else {
      mapa.set(key, { productoId: l.productoId, unidad: l.unidad, cantidad: l.cantidad });
    }
  }
  return mapa;
}
