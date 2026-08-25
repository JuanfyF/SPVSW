import { describe, it, expect } from "vitest";
import {
  CrearUsuarioSchema,
  CambiarPinSchema,
  CrearProductoSchema,
  CrearVentaSchema,
  CrearPedidoSchema,
  MetodoPagoSchema,
  RolSchema,
  TelefonoSchema,
  UnidadSchema,
} from "./index";

describe("Validaciones Zod", () => {
  describe("CrearUsuarioSchema", () => {
    it("debería validar un usuario válido", () => {
      const resultado = CrearUsuarioSchema.safeParse({
        nombre: "Test User",
        rol: "pastelera",
        pin: "123456",
      });
      expect(resultado.success).toBe(true);
    });

    it("debería aceptar PIN de 4 dígitos (mínimo)", () => {
      const resultado = CrearUsuarioSchema.safeParse({
        nombre: "Test",
        rol: "pastelera",
        pin: "1234",
      });
      expect(resultado.success).toBe(true);
    });

    it("debería aceptar PIN de 6 dígitos (máximo)", () => {
      const resultado = CrearUsuarioSchema.safeParse({
        nombre: "Test",
        rol: "pastelera",
        pin: "123456",
      });
      expect(resultado.success).toBe(true);
    });

    it("debería fallar con PIN muy corto (3 dígitos)", () => {
      const resultado = CrearUsuarioSchema.safeParse({
        nombre: "Test User",
        rol: "pastelera",
        pin: "123",
      });
      expect(resultado.success).toBe(false);
    });

    it("debería fallar con PIN muy largo (7 dígitos)", () => {
      const resultado = CrearUsuarioSchema.safeParse({
        nombre: "Test",
        rol: "pastelera",
        pin: "1234567",
      });
      expect(resultado.success).toBe(false);
    });

    it("debería fallar con PIN que no es número", () => {
      const resultado = CrearUsuarioSchema.safeParse({
        nombre: "Test User",
        rol: "pastelera",
        pin: "abcdef",
      });
      expect(resultado.success).toBe(false);
    });

    it("debería fallar con PIN con caracteres especiales", () => {
      const resultado = CrearUsuarioSchema.safeParse({
        nombre: "Test",
        rol: "pastelera",
        pin: "12-34",
      });
      expect(resultado.success).toBe(false);
    });

    it("debería fallar con nombre vacío", () => {
      const resultado = CrearUsuarioSchema.safeParse({
        nombre: "",
        rol: "pastelera",
        pin: "123456",
      });
      expect(resultado.success).toBe(false);
    });

    it("debería fallar con nombre solo espacios", () => {
      const resultado = CrearUsuarioSchema.safeParse({
        nombre: "   ",
        rol: "pastelera",
        pin: "123456",
      });
      expect(resultado.success).toBe(false);
    });

    it("debería fallar con rol inválido", () => {
      const resultado = CrearUsuarioSchema.safeParse({
        nombre: "Test",
        rol: "invalido",
        pin: "123456",
      });
      expect(resultado.success).toBe(false);
    });

    it("debería aceptar rol propietario", () => {
      const resultado = CrearUsuarioSchema.safeParse({
        nombre: "Admin",
        rol: "propietario",
        pin: "123456",
      });
      expect(resultado.success).toBe(true);
    });

    it("debería aceptar rol cajero", () => {
      const resultado = CrearUsuarioSchema.safeParse({
        nombre: "Cajero",
        rol: "cajero",
        pin: "123456",
      });
      expect(resultado.success).toBe(true);
    });
  });

  describe("CambiarPinSchema", () => {
    it("debería validar PINs que coinciden", () => {
      const resultado = CambiarPinSchema.safeParse({
        nuevoPin: "654321",
        confirmarPin: "654321",
      });
      expect(resultado.success).toBe(true);
    });

    it("debería fallar si los PINs no coinciden", () => {
      const resultado = CambiarPinSchema.safeParse({
        nuevoPin: "654321",
        confirmarPin: "123456",
      });
      expect(resultado.success).toBe(false);
    });

    it("debería fallar con PIN muy corto", () => {
      const resultado = CambiarPinSchema.safeParse({
        nuevoPin: "12",
        confirmarPin: "12",
      });
      expect(resultado.success).toBe(false);
    });

    it("debería fallar con PIN no numérico", () => {
      const resultado = CambiarPinSchema.safeParse({
        nuevoPin: "abcdef",
        confirmarPin: "abcdef",
      });
      expect(resultado.success).toBe(false);
    });

    it("debería fallar con PIN vacío", () => {
      const resultado = CambiarPinSchema.safeParse({
        nuevoPin: "",
        confirmarPin: "",
      });
      expect(resultado.success).toBe(false);
    });
  });

  describe("CrearProductoSchema", () => {
    it("debería validar un producto válido", () => {
      const resultado = CrearProductoSchema.safeParse({
        nombre: "Torta",
        tipoVenta: "entero",
        precioEntero: 25.0,
        artesanal: true,
      });
      expect(resultado.success).toBe(true);
    });

    it("debería fallar con tipo de venta inválido", () => {
      const resultado = CrearProductoSchema.safeParse({
        nombre: "Torta",
        tipoVenta: "invalido",
        artesanal: true,
      });
      expect(resultado.success).toBe(false);
    });

    it("debería fallar con nombre vacío", () => {
      const resultado = CrearProductoSchema.safeParse({
        nombre: "",
        tipoVenta: "entero",
        artesanal: true,
      });
      expect(resultado.success).toBe(false);
    });
  });

  describe("CrearVentaSchema", () => {
    it("debería validar una venta válida", () => {
      const resultado = CrearVentaSchema.safeParse({
        sesionCajaId: 1,
        total: 50.0,
        metodoPago: "efectivo",
        tipoOrigen: "mostrador",
        detalles: [
          {
            productoId: 1,
            unidad: "entero",
            cantidad: 2,
            precioUnitario: 25.0,
            subtotal: 50.0,
          },
        ],
      });
      expect(resultado.success).toBe(true);
    });

    it("debería fallar sin detalles", () => {
      const resultado = CrearVentaSchema.safeParse({
        sesionCajaId: 1,
        total: 50.0,
        metodoPago: "efectivo",
        tipoOrigen: "mostrador",
        detalles: [],
      });
      expect(resultado.success).toBe(false);
    });

    it("debería fallar con total negativo", () => {
      const resultado = CrearVentaSchema.safeParse({
        sesionCajaId: 1,
        total: -10,
        metodoPago: "efectivo",
        tipoOrigen: "mostrador",
        detalles: [
          {
            productoId: 1,
            unidad: "entero",
            cantidad: 1,
            precioUnitario: 25.0,
            subtotal: 25.0,
          },
        ],
      });
      expect(resultado.success).toBe(false);
    });
  });

  describe("CrearPedidoSchema", () => {
    it("debería validar un pedido válido", () => {
      const resultado = CrearPedidoSchema.safeParse({
        cliente: "Juan Pérez",
        fechaPedido: "2024-01-15",
        fechaEntrega: "2024-01-20",
        anticipo: 10.0,
        metodoPagoAnticipo: "efectivo",
        sesionCajaAnticipoId: 1,
        totalEstimado: 100.0,
        detalles: [
          {
            productoId: 1,
            cantidad: 1,
            precioUnitario: 100.0,
            subtotal: 100.0,
          },
        ],
      });
      expect(resultado.success).toBe(true);
    });

    it("debería fallar con fecha inválida", () => {
      const resultado = CrearPedidoSchema.safeParse({
        cliente: "Juan Pérez",
        fechaPedido: "invalid",
        fechaEntrega: "2024-01-20",
        anticipo: 10.0,
        metodoPagoAnticipo: "efectivo",
        sesionCajaAnticipoId: 1,
        totalEstimado: 100.0,
        detalles: [
          {
            productoId: 1,
            cantidad: 1,
            precioUnitario: 100.0,
            subtotal: 100.0,
          },
        ],
      });
      expect(resultado.success).toBe(false);
    });

    it("debería fallar sin cliente", () => {
      const resultado = CrearPedidoSchema.safeParse({
        cliente: "",
        fechaPedido: "2024-01-15",
        fechaEntrega: "2024-01-20",
        anticipo: 10.0,
        metodoPagoAnticipo: "efectivo",
        sesionCajaAnticipoId: 1,
        totalEstimado: 100.0,
        detalles: [
          {
            productoId: 1,
            cantidad: 1,
            precioUnitario: 100.0,
            subtotal: 100.0,
          },
        ],
      });
      expect(resultado.success).toBe(false);
    });
  });

  describe("Enums", () => {
    it("debería validar MetodoPago", () => {
      expect(MetodoPagoSchema.safeParse("efectivo").success).toBe(true);
      expect(MetodoPagoSchema.safeParse("transferencia").success).toBe(true);
      expect(MetodoPagoSchema.safeParse("tarjeta").success).toBe(false);
      expect(MetodoPagoSchema.safeParse("").success).toBe(false);
    });

    it("debería validar Rol", () => {
      expect(RolSchema.safeParse("propietario").success).toBe(true);
      expect(RolSchema.safeParse("cajero").success).toBe(true);
      expect(RolSchema.safeParse("pastelera").success).toBe(true);
      expect(RolSchema.safeParse("administrador").success).toBe(false);
      expect(RolSchema.safeParse("").success).toBe(false);
    });

    it("debería validar Unidad con porcion_llevar", () => {
      expect(UnidadSchema.safeParse("entero").success).toBe(true);
      expect(UnidadSchema.safeParse("porcion").success).toBe(true);
      expect(UnidadSchema.safeParse("porcion_llevar").success).toBe(true);
      expect(UnidadSchema.safeParse("invalido").success).toBe(false);
    });
  });

  describe("CrearPedidoSchema — edge cases", () => {
    it("debería permitir subtotal en $0 (producto personalizado)", () => {
      const resultado = CrearPedidoSchema.safeParse({
        cliente: "Test",
        fechaPedido: "2024-01-15",
        fechaEntrega: "2024-01-20",
        anticipo: 0,
        metodoPagoAnticipo: "efectivo",
        sesionCajaAnticipoId: 1,
        totalEstimado: 0,
        detalles: [
          {
            productoId: 1,
            cantidad: 1,
            precioUnitario: 0,
            subtotal: 0,
          },
        ],
      });
      expect(resultado.success).toBe(true);
    });

    it("debería rechazar totalEstimado negativo", () => {
      const resultado = CrearPedidoSchema.safeParse({
        cliente: "Test",
        fechaPedido: "2024-01-15",
        fechaEntrega: "2024-01-20",
        anticipo: 0,
        metodoPagoAnticipo: "efectivo",
        sesionCajaAnticipoId: 1,
        totalEstimado: -10,
        detalles: [
          {
            productoId: 1,
            cantidad: 1,
            precioUnitario: 10,
            subtotal: 10,
          },
        ],
      });
      expect(resultado.success).toBe(false);
    });
  });

  describe("CrearVentaSchema — porcion_llevar", () => {
    it("debería aceptar unidad porcion_llevar", () => {
      const resultado = CrearVentaSchema.safeParse({
        sesionCajaId: 1,
        total: 25.0,
        metodoPago: "efectivo",
        tipoOrigen: "mostrador",
        detalles: [
          {
            productoId: 1,
            unidad: "porcion_llevar",
            cantidad: 1,
            precioUnitario: 25.0,
            subtotal: 25.0,
          },
        ],
      });
      expect(resultado.success).toBe(true);
    });
  });

  describe("TelefonoSchema", () => {
    it("acepta null (opcional)", () => {
      expect(TelefonoSchema.safeParse(null).success).toBe(true);
    });

    it("acepta undefined (opcional)", () => {
      expect(TelefonoSchema.safeParse(undefined).success).toBe(true);
    });

    it("acepta número válido simple", () => {
      expect(TelefonoSchema.safeParse("0991234567").success).toBe(true);
    });

    it("acepta con prefijo +", () => {
      expect(TelefonoSchema.safeParse("+593991234567").success).toBe(true);
    });

    it("acepta con espacios", () => {
      expect(TelefonoSchema.safeParse("099 123 4567").success).toBe(true);
    });

    it("acepta con guiones", () => {
      expect(TelefonoSchema.safeParse("099-123-4567").success).toBe(true);
    });

    it("acepta con paréntesis", () => {
      expect(TelefonoSchema.safeParse("(099) 123-4567").success).toBe(true);
    });

    it("rechaza muy corto", () => {
      expect(TelefonoSchema.safeParse("123").success).toBe(false);
    });

    it("rechaza letras", () => {
      expect(TelefonoSchema.safeParse("abcdefg").success).toBe(false);
    });
  });

  describe("CrearVentaSchema — cortesía", () => {
    it("acepta tipoOrigen 'cortesia' con total 0", () => {
      const resultado = CrearVentaSchema.safeParse({
        sesionCajaId: 1,
        total: 0,
        metodoPago: "efectivo",
        tipoOrigen: "cortesia",
        detalles: [
          {
            productoId: 1,
            unidad: "entero",
            cantidad: 1,
            precioUnitario: 0,
            subtotal: 0,
          },
        ],
      });
      expect(resultado.success).toBe(true);
    });

    it("acepta tipoOrigen 'mostrador'", () => {
      const resultado = CrearVentaSchema.safeParse({
        sesionCajaId: 1,
        total: 25.0,
        metodoPago: "efectivo",
        tipoOrigen: "mostrador",
        detalles: [
          {
            productoId: 1,
            unidad: "entero",
            cantidad: 1,
            precioUnitario: 25.0,
            subtotal: 25.0,
          },
        ],
      });
      expect(resultado.success).toBe(true);
    });

    it("acepta tipoOrigen 'pedido'", () => {
      const resultado = CrearVentaSchema.safeParse({
        sesionCajaId: 1,
        total: 50.0,
        metodoPago: "transferencia",
        tipoOrigen: "pedido",
        detalles: [
          {
            productoId: 1,
            unidad: "porcion",
            cantidad: 2,
            precioUnitario: 25.0,
            subtotal: 50.0,
          },
        ],
      });
      expect(resultado.success).toBe(true);
    });

    it("rechaza tipoOrigen inválido", () => {
      const resultado = CrearVentaSchema.safeParse({
        sesionCajaId: 1,
        total: 10,
        metodoPago: "efectivo",
        tipoOrigen: "invalido",
        detalles: [],
      });
      expect(resultado.success).toBe(false);
    });
  });
});
