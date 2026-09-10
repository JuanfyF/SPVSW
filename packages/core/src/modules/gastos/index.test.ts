import { describe, it, expect, beforeEach, vi } from "vitest";
import { crearServicioGastos } from "./index";

function crearMockDb() {
  const returningFn = vi.fn();

  const mockDb = {
    select: vi.fn().mockReturnValue({
      from: (..._args: any[]) => {
        const fromResult = mockDb._fromResults.shift();
        return {
          then(onFulfilled: any, onRejected?: any) {
            return Promise.resolve(fromResult).then(onFulfilled, onRejected);
          },
          where: (..._whereArgs: any[]) => {
            const whereResult = mockDb._whereResults.shift();
            return {
              then(onFulfilled: any, onRejected?: any) {
                return Promise.resolve(whereResult).then(onFulfilled, onRejected);
              },
              limit(_n?: number) {
                const limitResult = mockDb._limitResults.shift();
                return {
                  then(onFulfilled: any, onRejected?: any) {
                    return Promise.resolve(limitResult).then(onFulfilled, onRejected);
                  },
                };
              },
              groupBy(_col: any) {
                return {
                  then(onFulfilled: any, onRejected?: any) {
                    return Promise.resolve(whereResult).then(onFulfilled, onRejected);
                  },
                };
              },
            };
          },
        };
      },
    }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: returningFn,
      }),
    }),
    returning: returningFn,
    _whereResults: [] as any[],
    _limitResults: [] as any[],
    _fromResults: [] as any[],
  };

  return mockDb;
}

describe("ServicioGastos", () => {
  let servicio: ReturnType<typeof crearServicioGastos>;
  let mockDb: ReturnType<typeof crearMockDb>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = crearMockDb();
    servicio = crearServicioGastos(mockDb as any);
  });

  describe("crear", () => {
    it("debería crear un gasto con saldo suficiente", async () => {
      // 8 total queries: 3 existence checks + 5 balance
      // Each .from() shifts from _fromResults
      // Each .where() shifts from _whereResults
      // Each .limit() shifts from _limitResults
      mockDb._fromResults = [
        undefined, undefined, undefined, // 3 existence checks
        undefined, undefined, undefined, undefined, undefined, // 5 balance queries
      ];
      mockDb._whereResults = [
        undefined, undefined, undefined, // 3 existence checks (consumed but not used)
        [{ total: 500 }],   // ventas
        [{ total: 100 }],   // anticipos
        [{ total: 50 }],    // gastos existentes
        [{ total: 0 }],     // adelantos
        [{ total: 0 }],     // devoluciones
      ];
      mockDb._limitResults = [
        [{ id: 1 }],  // categoría
        [{ id: 1 }],  // sesión
        [{ id: 1 }],  // usuario
      ];
      mockDb.returning.mockResolvedValue([{ id: 1, monto: 100 }]);

      const resultado = await servicio.crear({
        fecha: "2026-09-10",
        sesionCajaId: 1,
        categoriaId: 1,
        descripcion: "Insumos",
        monto: 100,
        origen: "caja",
        registradoPor: 1,
      });

      expect(resultado.monto).toBe(100);
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it("debería lanzar error si la categoría no existe", async () => {
      mockDb._fromResults = [undefined]; // 1 query
      mockDb._whereResults = [undefined]; // consumed by .where()
      mockDb._limitResults = [[]]; // categoría no encontrada

      await expect(
        servicio.crear({
          fecha: "2026-09-10",
          sesionCajaId: 1,
          categoriaId: 999,
          descripcion: "Insumos",
          monto: 100,
          origen: "caja",
          registradoPor: 1,
        })
      ).rejects.toThrow("Categoría de gasto no encontrada");
    });

    it("debería lanzar error si la sesión no existe", async () => {
      mockDb._fromResults = [undefined, undefined]; // 2 queries
      mockDb._whereResults = [undefined, undefined];
      mockDb._limitResults = [
        [{ id: 1 }],  // categoría
        [],           // sesión no encontrada
      ];

      await expect(
        servicio.crear({
          fecha: "2026-09-10",
          sesionCajaId: 999,
          categoriaId: 1,
          descripcion: "Insumos",
          monto: 100,
          origen: "caja",
          registradoPor: 1,
        })
      ).rejects.toThrow("Sesión de caja no encontrada");
    });

    it("debería lanzar error si el usuario no existe", async () => {
      mockDb._fromResults = [undefined, undefined, undefined];
      mockDb._whereResults = [undefined, undefined, undefined];
      mockDb._limitResults = [
        [{ id: 1 }],  // categoría
        [{ id: 1 }],  // sesión
        [],           // usuario no encontrado
      ];

      await expect(
        servicio.crear({
          fecha: "2026-09-10",
          sesionCajaId: 1,
          categoriaId: 1,
          descripcion: "Insumos",
          monto: 100,
          origen: "caja",
          registradoPor: 999,
        })
      ).rejects.toThrow("Usuario no encontrado");
    });

    it("debería lanzar error si el saldo es insuficiente", async () => {
      // efectivoEsperado = 50 + 0 - 0 - 0 - 0 = 50, monto = 200 > 50
      mockDb._fromResults = [
        undefined, undefined, undefined, // 3 existence
        undefined, undefined, undefined, undefined, undefined, // 5 balance
      ];
      mockDb._whereResults = [
        undefined, undefined, undefined,
        [{ total: 50 }],    // ventas
        [{ total: 0 }],     // anticipos
        [{ total: 0 }],     // gastos
        [{ total: 0 }],     // adelantos
        [{ total: 0 }],     // devoluciones
      ];
      mockDb._limitResults = [
        [{ id: 1 }],  // categoría
        [{ id: 1 }],  // sesión
        [{ id: 1 }],  // usuario
      ];

      await expect(
        servicio.crear({
          fecha: "2026-09-10",
          sesionCajaId: 1,
          categoriaId: 1,
          descripcion: "Equipo caro",
          monto: 200,
          origen: "caja",
          registradoPor: 1,
        })
      ).rejects.toThrow("Saldo insuficiente");
    });

    it("debería lanzar error con monto negativo", async () => {
      await expect(
        servicio.crear({
          fecha: "2026-09-10",
          sesionCajaId: 1,
          categoriaId: 1,
          descripcion: "Insumos",
          monto: -100,
          origen: "caja",
          registradoPor: 1,
        })
      ).rejects.toThrow();
    });

    it("debería lanzar error con origen inválido", async () => {
      await expect(
        servicio.crear({
          fecha: "2026-09-10",
          sesionCajaId: 1,
          categoriaId: 1,
          descripcion: "Insumos",
          monto: 100,
          origen: "invalido" as any,
          registradoPor: 1,
        })
      ).rejects.toThrow();
    });

    it("debería lanzar error con fecha inválida", async () => {
      await expect(
        servicio.crear({
          fecha: "no-es-fecha",
          sesionCajaId: 1,
          categoriaId: 1,
          descripcion: "Insumos",
          monto: 100,
          origen: "caja",
          registradoPor: 1,
        })
      ).rejects.toThrow();
    });
  });

  describe("listarPorSesion", () => {
    it("debería listar gastos de una sesión", async () => {
      mockDb._fromResults = [undefined];
      mockDb._whereResults = [[{ id: 1, sesionCajaId: 1 }]];

      const resultado = await servicio.listarPorSesion(1);

      expect(resultado).toHaveLength(1);
    });

    it("debería retornar array vacío si no hay gastos", async () => {
      mockDb._fromResults = [undefined];
      mockDb._whereResults = [[]];

      const resultado = await servicio.listarPorSesion(999);

      expect(resultado).toHaveLength(0);
    });
  });

  describe("listarPorCategoria", () => {
    it("debería listar gastos por categoría", async () => {
      mockDb._fromResults = [undefined];
      mockDb._whereResults = [[{ id: 1, categoriaId: 1 }]];

      const resultado = await servicio.listarPorCategoria(1);

      expect(resultado).toHaveLength(1);
    });

    it("debería filtrar por sesión cuando se proporciona", async () => {
      mockDb._fromResults = [undefined];
      mockDb._whereResults = [[{ id: 1, categoriaId: 1, sesionCajaId: 1 }]];

      const resultado = await servicio.listarPorCategoria(1, 1);

      expect(resultado).toHaveLength(1);
    });
  });

  describe("obtenerTotalPorOrigen", () => {
    it("debería retornar totales por origen", async () => {
      mockDb._fromResults = [undefined];
      mockDb._whereResults = [[
        { origen: "caja", total: 100 },
        { origen: "pedidos", total: 50 },
      ]];

      const resultado = await servicio.obtenerTotalPorOrigen(1);

      expect(resultado.caja).toBe(100);
      expect(resultado.pedidos).toBe(50);
    });

    it("debería retornar 0 cuando no hay gastos", async () => {
      mockDb._fromResults = [undefined];
      mockDb._whereResults = [[]];

      const resultado = await servicio.obtenerTotalPorOrigen(1);

      expect(resultado.caja).toBe(0);
      expect(resultado.pedidos).toBe(0);
    });
  });

  describe("listarCategorias", () => {
    it("debería listar categorías", async () => {
      mockDb._fromResults = [[{ id: 1, nombre: "Insumos" }]];

      const resultado = await servicio.listarCategorias();

      expect(resultado).toHaveLength(1);
    });
  });

  describe("crearCategoria", () => {
    it("debería crear una categoría", async () => {
      mockDb._limitResults = [[]];
      mockDb.returning.mockResolvedValue([{ id: 1, nombre: "Insumos" }]);

      const resultado = await servicio.crearCategoria("Insumos");

      expect(resultado.nombre).toBe("Insumos");
    });

    it("debería lanzar error si la categoría ya existe", async () => {
      mockDb._limitResults = [[{ id: 1 }]];

      await expect(servicio.crearCategoria("Insumos")).rejects.toThrow(
        "Ya existe una categoría"
      );
    });
  });

  describe("obtenerPorId", () => {
    it("debería retornar un gasto si existe", async () => {
      mockDb._limitResults = [[{ id: 1, monto: 100 }]];

      const resultado = await servicio.obtenerPorId(1);

      expect(resultado).toBeDefined();
      expect(resultado?.monto).toBe(100);
    });

    it("debería retornar null si no existe", async () => {
      mockDb._limitResults = [[]];

      const resultado = await servicio.obtenerPorId(999);

      expect(resultado).toBeNull();
    });
  });
});
