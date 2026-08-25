import { describe, it, expect, beforeEach, vi } from "vitest";
import { crearServicioProductos } from "./index";

function crearMockDb() {
  const limitFn = vi.fn();
  const returningFn = vi.fn();
  const whereResolveFn = vi.fn();

  // where() returns a thenable that also exposes .limit()
  function whereResult(resolveWith: any) {
    return {
      then(onFulfilled: any, onRejected?: any) {
        return Promise.resolve(resolveWith).then(onFulfilled, onRejected);
      },
      limit: limitFn,
    };
  }

  return {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: (...args: any[]) => whereResult(whereResolveFn(...args)),
      }),
    }),
    where: whereResolveFn,
    limit: limitFn,
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: returningFn,
      }),
    }),
    returning: returningFn,
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    }),
    set: vi.fn(),
  };
}

describe("ServicioProductos", () => {
  let servicio: ReturnType<typeof crearServicioProductos>;
  let mockDb: ReturnType<typeof crearMockDb>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = crearMockDb();
    servicio = crearServicioProductos(mockDb as any);
  });

  describe("listar", () => {
    it("debería listar productos activos", async () => {
      const productos = [{ id: 1, nombre: "Torta", activo: true }];
      mockDb.where.mockReturnValue(productos);

      const resultado = await servicio.listar();

      expect(resultado).toHaveLength(1);
      expect(mockDb.select).toHaveBeenCalled();
    });
  });

  describe("obtenerPorId", () => {
    it("debería retornar null si no existe", async () => {
      mockDb.limit.mockResolvedValue([]);

      const resultado = await servicio.obtenerPorId(999);

      expect(resultado).toBeNull();
    });

    it("debería retornar un producto si existe", async () => {
      mockDb.limit.mockResolvedValue([
        { id: 1, nombre: "Torta", activo: true },
      ]);

      const resultado = await servicio.obtenerPorId(1);

      expect(resultado).toBeDefined();
      expect(resultado?.nombre).toBe("Torta");
    });
  });

  describe("crear", () => {
    it("debería crear un producto válido", async () => {
      mockDb.returning.mockResolvedValue([
        { id: 1, nombre: "Torta", tipoVenta: "entero", precioEntero: 25.0 },
      ]);

      const resultado = await servicio.crear({
        nombre: "Torta",
        tipoVenta: "entero",
        precioEntero: 25.0,
        artesanal: true,
      });

      expect(resultado).toBeDefined();
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it("debería fallar si falta precio entero para venta entera", async () => {
      await expect(
        servicio.crear({
          nombre: "Torta",
          tipoVenta: "entero",
          artesanal: true,
        })
      ).rejects.toThrow("Precio entero es requerido");
    });

    it("debería fallar si falta precio porción para venta por porción", async () => {
      await expect(
        servicio.crear({
          nombre: "Torta",
          tipoVenta: "porcion",
          artesanal: true,
        })
      ).rejects.toThrow("Precio porción es requerido");
    });
  });

  describe("buscar", () => {
    it("debería buscar productos por nombre", async () => {
      mockDb.where.mockReturnValue([{ id: 1, nombre: "Torta de chocolate" }]);

      const resultado = await servicio.buscar("chocolate");

      expect(resultado).toHaveLength(1);
      expect(mockDb.select).toHaveBeenCalled();
    });
  });
});
