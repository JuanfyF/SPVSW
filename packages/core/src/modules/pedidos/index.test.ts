import { describe, it, expect, vi, beforeEach } from "vitest";
import { crearServicioPedidos } from "./index";

function crearMockDb() {
  const selectChain = {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([]),
        orderBy: vi.fn().mockResolvedValue([]),
      }),
    }),
  };

  const updateChain = {
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    }),
  };

  return {
    select: vi.fn().mockReturnValue(selectChain),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: 1 }]),
      }),
    }),
    update: vi.fn().mockReturnValue(updateChain),
    delete: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    }),
  };
}

describe("crearServicioPedidos", () => {
  describe("revertirEntrega", () => {
    it("lanza error si el pedido no existe", async () => {
      const mockDb = crearMockDb();
      // obtenerPorId retorna []
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      const servicio = crearServicioPedidos(mockDb as any);
      await expect(servicio.revertirEntrega(999)).rejects.toThrow("Pedido no encontrado");
    });

    it("revierte un pedido entregado a estado listo con saldo restaurado", async () => {
      const mockDb = crearMockDb();
      const pedidoExistente = {
        id: 1,
        estado: "entregado",
        totalEstimado: 50,
        anticipo: 20,
        saldoPendiente: 0,
        metodoPagoSaldo: "efectivo",
        sesionCajaEntregaId: 3,
      };

      // obtenerPorId
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([pedidoExistente]),
          }),
        }),
      });

      const servicio = crearServicioPedidos(mockDb as any);
      await servicio.revertirEntrega(1);

      // Verificar que se llamó update
      expect(mockDb.update).toHaveBeenCalled();
      const setCall = mockDb.update.mock.results[0].value.set;
      expect(setCall).toHaveBeenCalledWith({
        estado: "listo",
        metodoPagoSaldo: null,
        sesionCajaEntregaId: null,
        saldoPendiente: 30, // 50 - 20
      });
    });

    it("calcula saldo pendiente correcto cuando anticipo es 0", async () => {
      const mockDb = crearMockDb();
      const pedidoExistente = {
        id: 2,
        estado: "entregado",
        totalEstimado: 100,
        anticipo: 0,
        saldoPendiente: 100,
        metodoPagoSaldo: "transferencia",
        sesionCajaEntregaId: 5,
      };

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([pedidoExistente]),
          }),
        }),
      });

      const servicio = crearServicioPedidos(mockDb as any);
      await servicio.revertirEntrega(2);

      const setCall = mockDb.update.mock.results[0].value.set;
      expect(setCall).toHaveBeenCalledWith({
        estado: "listo",
        metodoPagoSaldo: null,
        sesionCajaEntregaId: null,
        saldoPendiente: 100, // 100 - 0
      });
    });

    it("calcula saldo pendiente correcto cuando anticipo cubre el total", async () => {
      const mockDb = crearMockDb();
      const pedidoExistente = {
        id: 3,
        estado: "entregado",
        totalEstimado: 30,
        anticipo: 30,
        saldoPendiente: 0,
        metodoPagoSaldo: null,
        sesionCajaEntregaId: 7,
      };

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([pedidoExistente]),
          }),
        }),
      });

      const servicio = crearServicioPedidos(mockDb as any);
      await servicio.revertirEntrega(3);

      const setCall = mockDb.update.mock.results[0].value.set;
      expect(setCall).toHaveBeenCalledWith({
        estado: "listo",
        metodoPagoSaldo: null,
        sesionCajaEntregaId: null,
        saldoPendiente: 0, // Math.max(30 - 30, 0)
      });
    });
  });
});
