import { describe, it, expect, vi, beforeEach } from "vitest";
import { crearServicioPedidos, montoCobradoEntrega } from "./index";

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

describe("listarPorSesionEntrega", () => {
  it("consulta pedidos por sesión de entrega y devuelve el resultado", async () => {
    const entregados = [
      { id: 1, cliente: "Ana", sesionCajaEntregaId: 7, estado: "entregado" },
      { id: 2, cliente: "Luis", sesionCajaEntregaId: 7, estado: "entregado" },
    ];
    const fromSpy = vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(entregados),
    });
    const mockDb = {
      ...crearMockDb(),
      select: vi.fn().mockReturnValue({ from: fromSpy }),
    };

    const servicio = crearServicioPedidos(mockDb as any);
    const resultado = await servicio.listarPorSesionEntrega(7);

    expect(resultado).toEqual(entregados);
    expect(mockDb.select).toHaveBeenCalled();
    expect(fromSpy).toHaveBeenCalledTimes(1);
    expect(fromSpy.mock.results[0].value.where).toHaveBeenCalledWith(
      expect.anything()
    );
  });
});

describe("obtenerResumen", () => {
  function mockDbResumen(pedido: any, devoluciones: any[] = []) {
    let llamada = 0;
    return {
      ...crearMockDb(),
      select: vi.fn().mockImplementation(() => {
        llamada++;
        if (llamada === 1) {
          // obtenerPorId: from().where().limit()
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([pedido]),
              }),
            }),
          };
        }
        if (llamada === 2) {
          // obtenerDetalle: from().leftJoin().where()
          return {
            from: vi.fn().mockReturnValue({
              leftJoin: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue([
                  { id: 11, cantidad: 2, precioUnitario: 25, subtotal: 50, descripcionPersonalizada: null, nombre: "Torta" },
                ]),
              }),
            }),
          };
        }
        // devolucionesAnticipo: from().where()
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(devoluciones),
          }),
        };
      }),
    };
  }

  it("entregado devuelve saldo 0 aunque total − anticipo > 0 (saldado)", async () => {
    const mockDb = mockDbResumen({
      id: 1,
      estado: "entregado",
      totalEstimado: 50,
      anticipo: 20,
      saldoPendiente: 0,
    });

    const servicio = crearServicioPedidos(mockDb as any);
    const resumen = await servicio.obtenerResumen(1);

    expect(resumen).not.toBeNull();
    expect(resumen!.pedido.id).toBe(1);
    expect(resumen!.totalPagado).toBe(20);
    expect(resumen!.saldoPendiente).toBe(0);
  });

  it("cancelado devuelve saldo 0 aunque haya devoluciones", async () => {
    const mockDb = mockDbResumen(
      { id: 2, estado: "cancelado", totalEstimado: 100, anticipo: 40, saldoPendiente: 0 },
      [{ id: 1, monto: 40 }]
    );

    const servicio = crearServicioPedidos(mockDb as any);
    const resumen = await servicio.obtenerResumen(2);

    expect(resumen!.saldoPendiente).toBe(0);
    expect(resumen!.totalPagado).toBe(0);
  });

  it("pedido activo recalcula total − anticipo + devoluciones", async () => {
    const mockDb = mockDbResumen({
      id: 3,
      estado: "pendiente",
      totalEstimado: 50,
      anticipo: 20,
      saldoPendiente: 30,
    });

    const servicio = crearServicioPedidos(mockDb as any);
    const resumen = await servicio.obtenerResumen(3);

    expect(resumen!.saldoPendiente).toBe(30);
  });

  it("pedido activo con devoluciones suma el monto devuelto", async () => {
    const mockDb = mockDbResumen(
      { id: 4, estado: "listo", totalEstimado: 50, anticipo: 20, saldoPendiente: 30 },
      [{ id: 1, monto: 10 }]
    );

    const servicio = crearServicioPedidos(mockDb as any);
    const resumen = await servicio.obtenerResumen(4);

    expect(resumen!.saldoPendiente).toBe(40); // 50 − 20 + 10
    expect(resumen!.totalPagado).toBe(10); // 20 − 10
  });
});

describe("montoCobradoEntrega", () => {
  it("usa la columna saldoPendiente como fuente canónica", () => {
    expect(montoCobradoEntrega({ totalEstimado: 100, anticipo: 30, saldoPendiente: 70 })).toBe(70);
  });

  it("devuelve 0 cuando el saldo ya está saldado (sin venta fantasma)", () => {
    expect(montoCobradoEntrega({ totalEstimado: 50, anticipo: 50, saldoPendiente: 0 })).toBe(0);
  });

  it("nunca devuelve negativos si la columna está corrupta", () => {
    expect(montoCobradoEntrega({ totalEstimado: 50, anticipo: 60, saldoPendiente: -10 })).toBe(0);
  });

  it("recalcula total − anticipo solo cuando la columna es null (legacy)", () => {
    expect(montoCobradoEntrega({ totalEstimado: 50, anticipo: 20, saldoPendiente: null })).toBe(30);
    expect(montoCobradoEntrega({ totalEstimado: 50, anticipo: 20, saldoPendiente: undefined })).toBe(30);
  });

  it("recálculo legacy con anticipo mayor al total devuelve 0", () => {
    expect(montoCobradoEntrega({ totalEstimado: 30, anticipo: 50, saldoPendiente: null })).toBe(0);
  });

  it("campos faltantes se tratan como 0", () => {
    expect(montoCobradoEntrega({})).toBe(0);
    expect(montoCobradoEntrega({ saldoPendiente: 0 })).toBe(0);
  });
});
