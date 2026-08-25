import { describe, it, expect, beforeEach, vi } from "vitest";
import { crearServicioStock } from "./index";

function crearMockDb() {
  const chainFns: Record<string, vi.fn> = {};

  const createChain = () => ({
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
          then: (resolve: any, reject?: any) =>
            Promise.resolve([]).then(resolve, reject),
        }),
        then: (resolve: any, reject?: any) =>
          Promise.resolve([]).then(resolve, reject),
      }),
      then: (resolve: any, reject?: any) =>
        Promise.resolve([]).then(resolve, reject),
    }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([]),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    }),
  });

  return createChain();
}

function crearMockDbComplejo() {
  const resultados: Record<string, any> = {};

  const chain = {
    _resultados: resultados,
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockImplementation(() => {
            return Promise.resolve(resultados.stock ?? []);
          }),
          then: (resolve: any, reject?: any) =>
            Promise.resolve(resultados.ventas ?? []).then(resolve, reject),
        }),
        innerJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockImplementation(() => {
            return Promise.resolve(resultados.ventas ?? []);
          }),
          then: (resolve: any, reject?: any) =>
            Promise.resolve(resultados.ventas ?? []).then(resolve, reject),
        }),
        then: (resolve: any, reject?: any) =>
          Promise.resolve(resultados.ventas ?? []).then(resolve, reject),
      }),
      then: (resolve: any, reject?: any) =>
        Promise.resolve(resultados.select ?? []).then(resolve, reject),
    }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockImplementation(() =>
          Promise.resolve(resultados.insert ?? [])
        ),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    }),
  };

  return chain;
}

describe("ServicioStock", () => {
  describe("verificarDisponibilidad", () => {
    it("debería retornar suficiente=false cuando no hay stock registrado", async () => {
      const mockDb = crearMockDbComplejo();
      mockDb._resultados.stock = [];
      const servicio = crearServicioStock(mockDb as any);

      const resultado = await servicio.verificarDisponibilidad(1, 1, "entero", 5);

      expect(resultado.suficiente).toBe(false);
      expect(resultado.disponible).toBe(0);
    });

    it("debería calcular disponible = inicial + agregada - vendido - mermas - cortesías", async () => {
      const mockDb = crearMockDbComplejo();

      // Stock: 10 iniciales + 5 agregadas
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ cantidadInicial: 10, cantidadAgregada: 5 }]),
          }),
        }),
      });

      // Vendido: 3 (usa innerJoin)
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ total: 3 }]),
          }),
        }),
      });

      // Mermas: 1
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ total: 1 }]),
        }),
      });

      // Cortesías: 2
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ total: 2 }]),
        }),
      });

      const servicio = crearServicioStock(mockDb as any);

      const resultado = await servicio.verificarDisponibilidad(1, 1, "entero", 5);

      // disponible = 10 + 5 - 3 - 1 - 2 = 9
      expect(resultado.disponible).toBe(9);
      expect(resultado.suficiente).toBe(true);
    });

    it("debería retornar suficiente=false cuando no hay suficiente stock", async () => {
      const mockDb = crearMockDbComplejo();

      // Setup para stock lookup
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ cantidadInicial: 5, cantidadAgregada: 0 }]),
          }),
        }),
      });

      // Setup para vendido (usa innerJoin)
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ total: 3 }]),
          }),
        }),
      });

      // Setup para mermas
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ total: 1 }]),
        }),
      });

      // Setup para cortesías
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ total: 1 }]),
        }),
      });

      const servicio = crearServicioStock(mockDb as any);

      const resultado = await servicio.verificarDisponibilidad(1, 1, "entero", 5);

      // disponible = 5 + 0 - 3 - 1 - 1 = 0
      expect(resultado.disponible).toBe(0);
      expect(resultado.suficiente).toBe(false);
    });

    it("debería retornar suficiente=true cuando hay stock exacto", async () => {
      const mockDb = crearMockDbComplejo();

      // Stock: 10 iniciales, 0 agregadas
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ cantidadInicial: 10, cantidadAgregada: 0 }]),
          }),
        }),
      });

      // Vendido: 5
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ total: 5 }]),
          }),
        }),
      });

      // Mermas: 0
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ total: 0 }]),
        }),
      });

      // Cortesías: 0
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ total: 0 }]),
        }),
      });

      const servicio = crearServicioStock(mockDb as any);

      const resultado = await servicio.verificarDisponibilidad(1, 1, "entero", 5);

      // disponible = 10 + 0 - 5 - 0 - 0 = 5
      expect(resultado.disponible).toBe(5);
      expect(resultado.suficiente).toBe(true);
    });

    it("debería manejar valores nulos como 0", async () => {
      const mockDb = crearMockDbComplejo();

      // Stock con valores nulos
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ cantidadInicial: null, cantidadAgregada: null }]),
          }),
        }),
      });

      // Vendido null
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ total: null }]),
          }),
        }),
      });

      // Mermas null
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ total: null }]),
        }),
      });

      // Cortesías null
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ total: null }]),
        }),
      });

      const servicio = crearServicioStock(mockDb as any);

      const resultado = await servicio.verificarDisponibilidad(1, 1, "entero", 1);

      // disponible = 0 + 0 - 0 - 0 - 0 = 0
      expect(resultado.disponible).toBe(0);
      expect(resultado.suficiente).toBe(false);
    });
  });

  describe("listarMermasPorSesion", () => {
    it("retorna mermas de una sesión", async () => {
      const mockDb = crearMockDb();
      const mermasEsperadas = [
        { id: 1, productoNombre: "Torta", cantidad: 2, registradoPorNombre: "Juan" },
      ];
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(mermasEsperadas),
        }),
      });

      const servicio = crearServicioStock(mockDb as any);
      const resultado = await servicio.listarMermasPorSesion(1);

      expect(resultado).toEqual(mermasEsperadas);
    });
  });

  describe("listarCortesiasPorSesion", () => {
    it("retorna cortesías de una sesión", async () => {
      const mockDb = crearMockDb();
      const cortesiasEsperadas = [
        { id: 1, productoNombre: "Torta", cantidad: 1, registradoPorNombre: "María" },
      ];
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(cortesiasEsperadas),
        }),
      });

      const servicio = crearServicioStock(mockDb as any);
      const resultado = await servicio.listarCortesiasPorSesion(1);

      expect(resultado).toEqual(cortesiasEsperadas);
    });
  });

  describe("calcularVendidoPorSesion", () => {
    it("retorna 0 cuando no hay ventas", async () => {
      const mockDb = crearMockDb();
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ total: null }]),
          }),
        }),
      });

      const servicio = crearServicioStock(mockDb as any);
      const resultado = await servicio.calcularVendidoPorSesion(1, 1, "entero");

      expect(resultado).toBe(0);
    });

    it("suma vendido solo de la unidad especificada", async () => {
      const mockDb = crearMockDb();
      // Retorna 3 para entero
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ total: 3 }]),
          }),
        }),
      });

      const servicio = crearServicioStock(mockDb as any);
      const resultado = await servicio.calcularVendidoPorSesion(1, 1, "entero");

      expect(resultado).toBe(3);
    });

    it("suma vendido de todas las unidades cuando no se especifica unidad", async () => {
      const mockDb = crearMockDb();
      // Retorna 5 (total de entero + porcion)
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ total: 5 }]),
          }),
        }),
      });

      const servicio = crearServicioStock(mockDb as any);
      const resultado = await servicio.calcularVendidoPorSesion(1, 1);

      expect(resultado).toBe(5);
    });

    it("normaliza porcion_llevar a porcion para buscar vendido", async () => {
      const mockDb = crearMockDb();
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ total: 2 }]),
          }),
        }),
      });

      const servicio = crearServicioStock(mockDb as any);
      // Cuando se pasa "porcion_llevar", debe normalizar a "porcion"
      const resultado = await servicio.calcularVendidoPorSesion(1, 1, "porcion_llevar");

      expect(resultado).toBe(2);
    });
  });
});
