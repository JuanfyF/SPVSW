import { describe, it, expect, beforeEach, vi } from "vitest";
import { crearServicioNomina } from "./index";

function crearMockDb() {
  const returningFn = vi.fn();

  const mockDb = {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: (..._args: any[]) => {
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
          };
        },
      }),
    }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: returningFn,
      }),
    }),
    returning: returningFn,
    _whereResults: [] as any[],
    _limitResults: [] as any[],
  };

  return mockDb;
}

describe("ServicioNomina", () => {
  let servicio: ReturnType<typeof crearServicioNomina>;
  let mockDb: ReturnType<typeof crearMockDb>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = crearMockDb();
    servicio = crearServicioNomina(mockDb as any);
  });

  describe("registrarAdelanto", () => {
    it("debería registrar un adelanto", async () => {
      mockDb._limitResults = [[{ id: 1, activo: true }]];
      mockDb.returning.mockResolvedValue([{ id: 1, monto: 100 }]);

      const resultado = await servicio.registrarAdelanto({
        empleadoId: 1,
        sesionCajaId: 1,
        fecha: "2026-09-10",
        monto: 100,
        metodoPago: "efectivo",
        mesADescontar: "2026-09",
        registradoPor: 1,
      });

      expect(resultado.monto).toBe(100);
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it("debería lanzar error si el empleado no existe", async () => {
      mockDb._limitResults = [[]];

      await expect(
        servicio.registrarAdelanto({
          empleadoId: 999,
          sesionCajaId: 1,
          fecha: "2026-09-10",
          monto: 100,
          metodoPago: "efectivo",
          mesADescontar: "2026-09",
          registradoPor: 1,
        })
      ).rejects.toThrow("Empleado no encontrado");
    });

    it("debería lanzar error si el empleado está inactivo", async () => {
      mockDb._limitResults = [[{ id: 1, activo: false }]];

      await expect(
        servicio.registrarAdelanto({
          empleadoId: 1,
          sesionCajaId: 1,
          fecha: "2026-09-10",
          monto: 100,
          metodoPago: "efectivo",
          mesADescontar: "2026-09",
          registradoPor: 1,
        })
      ).rejects.toThrow("no está activo");
    });

    it("debería lanzar error con método de pago inválido", async () => {
      await expect(
        servicio.registrarAdelanto({
          empleadoId: 1,
          sesionCajaId: 1,
          fecha: "2026-09-10",
          monto: 100,
          metodoPago: "crypto" as any,
          mesADescontar: "2026-09",
          registradoPor: 1,
        })
      ).rejects.toThrow();
    });

    it("debería lanzar error con monto negativo", async () => {
      await expect(
        servicio.registrarAdelanto({
          empleadoId: 1,
          sesionCajaId: 1,
          fecha: "2026-09-10",
          monto: -50,
          metodoPago: "efectivo",
          mesADescontar: "2026-09",
          registradoPor: 1,
        })
      ).rejects.toThrow();
    });
  });

  describe("registrarMulta", () => {
    it("debería registrar una multa", async () => {
      mockDb._limitResults = [[{ id: 1 }]];
      mockDb.returning.mockResolvedValue([{ id: 1, monto: 50 }]);

      const resultado = await servicio.registrarMulta({
        empleadoId: 1,
        fecha: "2026-09-10",
        monto: 50,
        motivo: "Tardanza",
        mesADescontar: "2026-09",
        registradoPor: 1,
      });

      expect(resultado.monto).toBe(50);
    });

    it("debería lanzar error si el empleado no existe", async () => {
      mockDb._limitResults = [[]];

      await expect(
        servicio.registrarMulta({
          empleadoId: 999,
          fecha: "2026-09-10",
          monto: 50,
          motivo: "Tardanza",
          mesADescontar: "2026-09",
          registradoPor: 1,
        })
      ).rejects.toThrow("Empleado no encontrado");
    });

    it("debería lanzar error sin motivo", async () => {
      await expect(
        servicio.registrarMulta({
          empleadoId: 1,
          fecha: "2026-09-10",
          monto: 50,
          motivo: "",
          mesADescontar: "2026-09",
          registradoPor: 1,
        })
      ).rejects.toThrow();
    });
  });

  describe("listarAdelantosPorEmpleado", () => {
    it("debería listar adelantos de un empleado", async () => {
      mockDb._whereResults = [[{ id: 1, monto: 100 }]];

      const resultado = await servicio.listarAdelantosPorEmpleado(1);

      expect(resultado).toHaveLength(1);
    });
  });

  describe("listarAdelantosPorSesion", () => {
    it("debería listar adelantos de una sesión", async () => {
      mockDb._whereResults = [[{ id: 1, sesionCajaId: 1 }]];

      const resultado = await servicio.listarAdelantosPorSesion(1);

      expect(resultado).toHaveLength(1);
    });
  });

  describe("listarMultasPorEmpleado", () => {
    it("debería listar multas de un empleado", async () => {
      mockDb._whereResults = [[{ id: 1, monto: 50 }]];

      const resultado = await servicio.listarMultasPorEmpleado(1);

      expect(resultado).toHaveLength(1);
    });
  });

  describe("calcularDescuentosMes", () => {
    it("debería calcular descuentos con adelantos y multas", async () => {
      // Query 1: .where(eq(...)).limit(1) → _whereResults (dummy) + _limitResults
      // Query 2: .where(and(...)) → _whereResults
      // Query 3: .where(and(...)) → _whereResults
      mockDb._whereResults = [
        undefined,        // dummy for query 1 (consumed by .where() before .limit())
      ];
      mockDb._limitResults = [
        [{ salarioMensual: 500 }],  // employee
      ];
      // After query 1, query 2 and 3 use .where() without .limit()
      // But we need to push results after the first query uses them
      // Let's use a different approach - push all whereResults upfront
      mockDb._whereResults = [
        undefined,        // dummy for query 1
        [{ total: 100 }], // adelantos
        [{ total: 50 }],  // multas
      ];

      const resultado = await servicio.calcularDescuentosMes(1, "2026-09");

      expect(resultado.salario).toBe(500);
      expect(resultado.adelantosMes).toBe(100);
      expect(resultado.multasMes).toBe(50);
      expect(resultado.totalDescuentos).toBe(150);
      expect(resultado.neto).toBe(350);
    });

    it("debería calcular sin descuentos", async () => {
      mockDb._whereResults = [
        undefined,        // dummy for query 1
        [{ total: 0 }],
        [{ total: 0 }],
      ];
      mockDb._limitResults = [[{ salarioMensual: 500 }]];

      const resultado = await servicio.calcularDescuentosMes(1, "2026-09");

      expect(resultado.neto).toBe(500);
      expect(resultado.totalDescuentos).toBe(0);
    });

    it("debería retornar salario 0 si el empleado no existe", async () => {
      mockDb._whereResults = [
        undefined,        // dummy for query 1
        [{ total: 0 }],
        [{ total: 0 }],
      ];
      mockDb._limitResults = [[]];

      const resultado = await servicio.calcularDescuentosMes(999, "2026-09");

      expect(resultado.salario).toBe(0);
      expect(resultado.neto).toBe(0);
    });

    it("debería lanzar error con mes inválido", async () => {
      await expect(
        servicio.calcularDescuentosMes(1, "fecha-invalida")
      ).rejects.toThrow();
    });
  });

  describe("listarEmpleadosActivos", () => {
    it("debería listar empleados activos", async () => {
      mockDb._whereResults = [[{ id: 1, activo: true }]];

      const resultado = await servicio.listarEmpleadosActivos();

      expect(resultado).toHaveLength(1);
    });
  });

  describe("crearEmpleado", () => {
    it("debería crear un empleado", async () => {
      mockDb.returning.mockResolvedValue([
        { id: 1, nombre: "Ana", cargo: "Pastelera" },
      ]);

      const resultado = await servicio.crearEmpleado({
        nombre: "Ana",
        cargo: "Pastelera",
        salarioMensual: 500,
      });

      expect(resultado.nombre).toBe("Ana");
    });

    it("debería crear empleado con usuarioId válido", async () => {
      mockDb._limitResults = [[{ id: 5 }]];
      mockDb.returning.mockResolvedValue([
        { id: 1, nombre: "Ana", usuarioId: 5 },
      ]);

      const resultado = await servicio.crearEmpleado({
        nombre: "Ana",
        cargo: "Pastelera",
        salarioMensual: 500,
        usuarioId: 5,
      });

      expect(resultado.usuarioId).toBe(5);
    });

    it("debería lanzar error si usuarioId no existe", async () => {
      mockDb._limitResults = [[]];

      await expect(
        servicio.crearEmpleado({
          nombre: "Ana",
          cargo: "Pastelera",
          salarioMensual: 500,
          usuarioId: 999,
        })
      ).rejects.toThrow("Usuario no encontrado");
    });

    it("debería crear empleado sin usuarioId", async () => {
      mockDb.returning.mockResolvedValue([
        { id: 1, nombre: "Ana", usuarioId: null },
      ]);

      const resultado = await servicio.crearEmpleado({
        nombre: "Ana",
        cargo: "Pastelera",
        salarioMensual: 500,
      });

      expect(resultado.usuarioId).toBeNull();
    });

    it("debería lanzar error con nombre vacío", async () => {
      await expect(
        servicio.crearEmpleado({
          nombre: "",
          cargo: "Pastelera",
          salarioMensual: 500,
        })
      ).rejects.toThrow();
    });

    it("debería lanzar error con salario negativo", async () => {
      await expect(
        servicio.crearEmpleado({
          nombre: "Ana",
          cargo: "Pastelera",
          salarioMensual: -100,
        })
      ).rejects.toThrow();
    });
  });
});
