import { describe, it, expect } from "vitest";
import { verificarRuta } from "./route-guard-logic";

describe("verificarRuta", () => {
  describe("pastelera", () => {
    it("bloquea /movil/pedidos/nuevo y redirige a /movil/pedidos", () => {
      const resultado = verificarRuta("/movil/pedidos/nuevo", "pastelera");
      expect(resultado).toBe("/movil/pedidos");
    });

    it("permite /movil/pedidos (lista)", () => {
      const resultado = verificarRuta("/movil/pedidos", "pastelera");
      expect(resultado).toBeNull();
    });

    it("permite /movil/stock", () => {
      const resultado = verificarRuta("/movil/stock", "pastelera");
      expect(resultado).toBeNull();
    });

    it("permite /movil/perfil", () => {
      const resultado = verificarRuta("/movil/perfil", "pastelera");
      expect(resultado).toBeNull();
    });

    it("permite /movil (inicio)", () => {
      const resultado = verificarRuta("/movil", "pastelera");
      expect(resultado).toBeNull();
    });
  });

  describe("propietario", () => {
    it("no bloquea /movil/pedidos/nuevo", () => {
      const resultado = verificarRuta("/movil/pedidos/nuevo", "propietario");
      expect(resultado).toBeNull();
    });

    it("no bloquea ninguna ruta", () => {
      expect(verificarRuta("/movil/pedidos/nuevo", "propietario")).toBeNull();
      expect(verificarRuta("/movil/stock", "propietario")).toBeNull();
      expect(verificarRuta("/movil", "propietario")).toBeNull();
    });
  });

  describe("cajero", () => {
    it("no bloquea /movil/pedidos/nuevo", () => {
      const resultado = verificarRuta("/movil/pedidos/nuevo", "cajero");
      expect(resultado).toBeNull();
    });
  });

  describe("rol vacío o desconocido", () => {
    it("no bloquea nada con rol vacío", () => {
      const resultado = verificarRuta("/movil/pedidos/nuevo", "");
      expect(resultado).toBeNull();
    });

    it("no bloquea nada con rol desconocido", () => {
      const resultado = verificarRuta("/movil/pedidos/nuevo", "otro");
      expect(resultado).toBeNull();
    });
  });

  describe("rutas no restringidas", () => {
    it("retorna null para rutas que no están en el mapa", () => {
      expect(verificarRuta("/otra/ruta", "pastelera")).toBeNull();
      expect(verificarRuta("/", "pastelera")).toBeNull();
      expect(verificarRuta("/venta", "pastelera")).toBeNull();
    });
  });
});
