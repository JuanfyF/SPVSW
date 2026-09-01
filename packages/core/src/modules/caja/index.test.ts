import { describe, it, expect, vi } from "vitest";
import { crearServicioCaja } from "./index";

function crearMockDb() {
  const db: any = {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
          orderBy: vi.fn().mockResolvedValue([]),
        }),
      }),
    }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: 1 }]),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    }),
  };
  return db;
}

describe("crearServicioCaja", () => {
  describe("obtenerSesionAbierta", () => {
    it("retorna null si no hay sesión abierta", async () => {
      const mockDb = crearMockDb();
      const servicio = crearServicioCaja(mockDb as any);
      const resultado = await servicio.obtenerSesionAbierta(1);
      expect(resultado).toBeNull();
    });

    it("retorna la sesión si existe una abierta", async () => {
      const mockDb = crearMockDb();
      const sesionEsperada = { id: 5, usuarioId: 1, estado: "abierta", fecha: "2026-08-19" };
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([sesionEsperada]),
          }),
        }),
      });
      const servicio = crearServicioCaja(mockDb as any);
      const resultado = await servicio.obtenerSesionAbierta(1);
      expect(resultado).toEqual(sesionEsperada);
    });
  });

  describe("forzarCierre", () => {
    it("lanza error si la sesión no existe", async () => {
      const mockDb = crearMockDb();
      const servicio = crearServicioCaja(mockDb as any);
      await expect(servicio.forzarCierre(999, 1)).rejects.toThrow("Sesión no encontrada");
    });

    it("retorna exito si sesión ya está cerrada (idempotente)", async () => {
      const mockDb = crearMockDb();
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: 1, estado: "cerrada" }]),
          }),
        }),
      });
      const servicio = crearServicioCaja(mockDb as any);
      const resultado = await servicio.forzarCierre(1, 1);
      expect(resultado).toEqual({ exito: true });
    });

    it("cierra sesión abierta exitosamente", async () => {
      const mockDb = crearMockDb();
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: 1, estado: "abierta" }]),
          }),
        }),
      });
      const servicio = crearServicioCaja(mockDb as any);
      const resultado = await servicio.forzarCierre(1, 1);
      expect(resultado).toEqual({ exito: true });
      expect(mockDb.update).toHaveBeenCalled();
    });
  });

  describe("calcularEfectivoEsperado — modelo canónico", () => {
    // Queries en orden: ventas, anticipos, gastos, adelantos, devoluciones
    function mockDbSecuencia(totales: number[]) {
      let i = 0;
      return {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockImplementation(() =>
              Promise.resolve([{ total: totales[i++] ?? 0 }])
            ),
          }),
        }),
        insert: vi.fn(),
        update: vi.fn(),
      };
    }

    it("pedido $25 (anticipo $10 + saldo $15) entregado hoy = $25, NO $50", async () => {
      // venta de pedido registra SOLO saldo ($15); anticipo se cuenta una vez ($10)
      const mockDb = mockDbSecuencia([15, 10, 0, 0, 0]);
      const servicio = crearServicioCaja(mockDb as any);
      const resultado = await servicio.calcularEfectivoEsperado(1);
      expect(resultado).toBe(25);
    });

    it("resta gastos de caja Y de pedidos (mismo cajón)", async () => {
      const mockDb = mockDbSecuencia([100, 20, 12, 0, 0]); // gastos $8+$4
      const servicio = crearServicioCaja(mockDb as any);
      const resultado = await servicio.calcularEfectivoEsperado(1);
      expect(resultado).toBe(108);
    });

    it("resta adelantos y devoluciones de anticipo en efectivo", async () => {
      const mockDb = mockDbSecuencia([100, 30, 0, 50, 10]);
      const servicio = crearServicioCaja(mockDb as any);
      const resultado = await servicio.calcularEfectivoEsperado(1);
      expect(resultado).toBe(70);
    });

    it("no duplica el saldo: sin query separada de saldos", async () => {
      // Si existiera la query vieja de saldos habría 6 llamadas, no 5
      const mockDb = mockDbSecuencia([15, 10, 0, 0, 0]);
      const servicio = crearServicioCaja(mockDb as any);
      await servicio.calcularEfectivoEsperado(1);
      expect(mockDb.select).toHaveBeenCalledTimes(5);
    });
  });

  describe("forzarCierre", () => {
    it("crea registro de cierre de caja con zeros", async () => {
      const mockDb = crearMockDb();
      // Mock encadenado: select().from().where().limit() se llama 2 veces
      const limitFn = vi.fn()
        .mockResolvedValueOnce([{ id: 1, estado: "abierta" }])  // sesión
        .mockResolvedValueOnce([]);  // cierreCaja existente
      const whereObj = { limit: limitFn };
      const whereFn = vi.fn().mockReturnValue(whereObj);
      const fromObj = { where: whereFn };
      const fromFn = vi.fn().mockReturnValue(fromObj);
      mockDb.select.mockReturnValue({ from: fromFn });

      const servicio = crearServicioCaja(mockDb);
      const resultado = await servicio.forzarCierre(1, 1);
      expect(resultado.exito).toBe(true);
      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockDb.update).toHaveBeenCalled();
    });

    it("lanza error si sesión no existe", async () => {
      const mockDb = crearMockDb();
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });
      const servicio = crearServicioCaja(mockDb);
      await expect(servicio.forzarCierre(999, 1)).rejects.toThrow("Sesión no encontrada");
    });

    it("retorna exito si sesión ya está cerrada (idempotente)", async () => {
      const mockDb = crearMockDb();
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: 1, estado: "cerrada" }]),
          }),
        }),
      });
      const servicio = crearServicioCaja(mockDb);
      const resultado = await servicio.forzarCierre(1, 1);
      expect(resultado).toEqual({ exito: true });
    });
  });
});
