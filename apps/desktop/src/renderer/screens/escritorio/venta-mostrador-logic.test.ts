import { describe, it, expect } from "vitest";
import {
  agregarLineaPagada,
  agregarLineaCortesia,
  cantidadesPorProducto,
  type LineaCarrito,
} from "./venta-mostrador-logic";

type U = "entero" | "porcion" | "porcion_llevar";

const pagada = (extra: Partial<LineaCarrito<U>> = {}): LineaCarrito<U> => ({
  productoId: 1,
  nombre: "Torta",
  unidad: "entero",
  cantidad: 3,
  precioUnitario: 25,
  subtotal: 75,
  ...extra,
});

function invariantes(carrito: LineaCarrito<U>[]) {
  for (const l of carrito) {
    expect(l.subtotal).toBe(l.cantidad * l.precioUnitario);
  }
}

describe("agregarLineaCortesia", () => {
  it("crea línea gratis de $0 en carrito vacío", () => {
    const r = agregarLineaCortesia<U>([], { productoId: 1, nombre: "Torta", unidad: "entero" });
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ cantidad: 1, precioUnitario: 0, subtotal: 0 });
    invariantes(r);
  });

  it("NO regala la línea pagada existente (bug original: subtotal:0 con precio intacto)", () => {
    const carrito = [pagada()]; // 3 × $25 = $75
    const r = agregarLineaCortesia<U>(carrito, {
      productoId: 1,
      nombre: "Torta",
      unidad: "entero",
    });
    // Línea pagada intacta + línea de cortesía separada
    expect(r).toHaveLength(2);
    expect(r[0]).toMatchObject({ cantidad: 3, precioUnitario: 25, subtotal: 75 });
    expect(r[1]).toMatchObject({ cantidad: 1, precioUnitario: 0, subtotal: 0 });
    invariantes(r);
    // El total sigue cobrando lo pagado
    expect(r.reduce((s, l) => s + l.subtotal, 0)).toBe(75);
  });

  it("fusiona con línea gratis existente del mismo producto", () => {
    const carrito = [
      pagada({ cantidad: 1, precioUnitario: 0, subtotal: 0 }),
      pagada({ productoId: 2, precioUnitario: 25, subtotal: 25, cantidad: 1 }),
    ];
    const r = agregarLineaCortesia<U>(carrito, {
      productoId: 1,
      nombre: "Torta",
      unidad: "entero",
    });
    expect(r).toHaveLength(2);
    expect(r[0]).toMatchObject({ cantidad: 2, precioUnitario: 0, subtotal: 0 });
    invariantes(r);
  });

  it("no fusiona si la unidad difiere", () => {
    const carrito = [pagada({ unidad: "entero" })];
    const r = agregarLineaCortesia<U>(carrito, {
      productoId: 1,
      nombre: "Torta",
      unidad: "porcion",
    });
    expect(r).toHaveLength(2);
    invariantes(r);
  });
});

describe("agregarLineaPagada", () => {
  it("agrega línea nueva cuando no existe la misma clave", () => {
    const r = agregarLineaPagada<U>([], {
      productoId: 1,
      nombre: "Torta",
      unidad: "entero",
      precioUnitario: 25,
    });
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ cantidad: 1, precioUnitario: 25, subtotal: 25 });
    invariantes(r);
  });

  it("fusiona con línea pagada del mismo precio", () => {
    const carrito = [pagada()];
    const r = agregarLineaPagada<U>(carrito, {
      productoId: 1,
      nombre: "Torta",
      unidad: "entero",
      precioUnitario: 25,
    });
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ cantidad: 4, precioUnitario: 25, subtotal: 100 });
    invariantes(r);
  });

  it("NO se fusiona con línea de cortesía $0 (lo pagado no se vuelve gratis)", () => {
    const carrito: LineaCarrito<U>[] = [
      { productoId: 1, nombre: "Torta", unidad: "entero", cantidad: 2, precioUnitario: 0, subtotal: 0 },
    ];
    const r = agregarLineaPagada<U>(carrito, {
      productoId: 1,
      nombre: "Torta",
      unidad: "entero",
      precioUnitario: 25,
    });
    expect(r).toHaveLength(2);
    expect(r[0]).toMatchObject({ cantidad: 2, precioUnitario: 0, subtotal: 0 });
    expect(r[1]).toMatchObject({ cantidad: 1, precioUnitario: 25, subtotal: 25 });
    invariantes(r);
    expect(r.reduce((s, l) => s + l.subtotal, 0)).toBe(25);
  });
});

describe("cantidadesPorProducto", () => {
  it("agrega cantidades de líneas pagada + cortesía de la misma clave", () => {
    const carrito: LineaCarrito<U>[] = [
      { productoId: 1, nombre: "Torta", unidad: "entero", cantidad: 3, precioUnitario: 25, subtotal: 75 },
      { productoId: 1, nombre: "Torta", unidad: "entero", cantidad: 1, precioUnitario: 0, subtotal: 0 },
      { productoId: 2, nombre: "Pastel", unidad: "porcion", cantidad: 2, precioUnitario: 5, subtotal: 10 },
    ];
    const req = cantidadesPorProducto(carrito);
    expect(req.get("1:entero")).toMatchObject({ productoId: 1, unidad: "entero", cantidad: 4 });
    expect(req.get("2:porcion")).toMatchObject({ cantidad: 2 });
    expect(req.size).toBe(2);
  });

  it("retorna mapa vacío para carrito vacío", () => {
    expect(cantidadesPorProducto<U>([]).size).toBe(0);
  });
});
