import { describe, it, expect, beforeEach, vi } from "vitest";
import { crearServicioEmpleados } from "./index";

function crearMockDb() {
  const limitFn = vi.fn();
  const returningFn = vi.fn();
  const whereResolveFn = vi.fn();

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
        where: vi.fn().mockReturnValue({
          returning: returningFn,
        }),
      }),
    }),
    set: vi.fn(),
  };
}

describe("ServicioEmpleados", () => {
  let servicio: ReturnType<typeof crearServicioEmpleados>;
  let mockDb: ReturnType<typeof crearMockDb>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = crearMockDb();
    servicio = crearServicioEmpleados(mockDb as any);
  });

  describe("listar", () => {
    it("debería listar empleados activos", async () => {
      const empleados = [{ id: 1, nombre: "Ana", activo: true }];
      mockDb.where.mockReturnValue(empleados);

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

    it("debería retornar un empleado si existe", async () => {
      mockDb.limit.mockResolvedValue([
        { id: 1, nombre: "Ana", activo: true },
      ]);

      const resultado = await servicio.obtenerPorId(1);

      expect(resultado).toBeDefined();
      expect(resultado?.nombre).toBe("Ana");
    });

    it("debería lanzar error con id inválido", async () => {
      await expect(servicio.obtenerPorId(-1)).rejects.toThrow();
    });
  });

  describe("crear", () => {
    it("debería crear un empleado", async () => {
      mockDb.returning.mockResolvedValue([
        { id: 1, nombre: "Ana", cargo: "Pastelera", salarioMensual: 500 },
      ]);

      const resultado = await servicio.crear({
        nombre: "Ana",
        cargo: "Pastelera",
        salarioMensual: 500,
      });

      expect(resultado.nombre).toBe("Ana");
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it("debería crear empleado con usuarioId", async () => {
      mockDb.returning.mockResolvedValue([
        { id: 1, nombre: "Ana", usuarioId: 5 },
      ]);

      const resultado = await servicio.crear({
        nombre: "Ana",
        cargo: "Pastelera",
        salarioMensual: 500,
        usuarioId: 5,
      });

      expect(resultado.usuarioId).toBe(5);
    });

    it("debería lanzar error con datos inválidos", async () => {
      await expect(
        servicio.crear({ nombre: "", cargo: "Pastelera", salarioMensual: 500 })
      ).rejects.toThrow();
    });

    it("debería lanzar error con salario negativo", async () => {
      await expect(
        servicio.crear({ nombre: "Ana", cargo: "Pastelera", salarioMensual: -100 })
      ).rejects.toThrow();
    });

    it("debería lanzar error sin nombre", async () => {
      await expect(
        servicio.crear({ nombre: "", cargo: "Pastelera", salarioMensual: 500 })
      ).rejects.toThrow();
    });
  });

  describe("actualizar", () => {
    it("debería actualizar un empleado", async () => {
      mockDb.returning.mockResolvedValue([
        { id: 1, nombre: "Ana García", actualizadoEn: "2026-09-10" },
      ]);

      const resultado = await servicio.actualizar(1, { nombre: "Ana García" });

      expect(resultado).toBeDefined();
      expect(mockDb.update).toHaveBeenCalled();
    });

    it("debería retornar null si el empleado no existe", async () => {
      mockDb.returning.mockResolvedValue([]);

      const resultado = await servicio.actualizar(999, { nombre: "X" });

      expect(resultado).toBeNull();
    });

    it("debería aceptar update parcial", async () => {
      mockDb.returning.mockResolvedValue([{ id: 1, cargo: "Gerente" }]);

      const resultado = await servicio.actualizar(1, { cargo: "Gerente" });

      expect(resultado).toBeDefined();
    });
  });

  describe("desactivar", () => {
    it("debería desactivar un empleado", async () => {
      await servicio.desactivar(1);

      expect(mockDb.update).toHaveBeenCalled();
    });
  });

  describe("asociarUsuario", () => {
    it("debería asociar un empleado con un usuario", async () => {
      await servicio.asociarUsuario(1, 5);

      expect(mockDb.update).toHaveBeenCalled();
    });
  });
});
