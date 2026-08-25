import { describe, it, expect, vi, beforeEach } from "vitest";

// Test: ventas.crear normaliza porcion_llevar → porcion en ventaDetalle
// We test this by verifying the insert call arguments

describe("crearServicioVentas", () => {
  describe("crear - normalización porcion_llevar", () => {
    it("normaliza porcion_llevar a porcion al guardar ventaDetalle", async () => {
      // Importamos y espiamos
      const mod = await import("./index");
      const crearServicioVentas = mod.crearServicioVentas;

      const insertCalls: any[] = [];

      // Mock DB completo que soporta crear() + verificarStock()
      const mockDb: any = {
        select: vi.fn(),
        insert: vi.fn(),
      };

      // Encadenar select().from()...
      const mockSelect = (retorno: any) => ({
        from: vi.fn().mockReturnValue(retorno),
      });

      // Secuencia de llamadas select():
      // 1. crear() → sesionesCaja.where().limit() → [{id:1, estado:"abierta"}]
      // 2. verificarStock() → productos.where().limit() → [{id:1}]
      // 3. calcularVendido() → ventaDetalle.innerJoin(ventas).where() → [{total:0}]
      // 4. obtenerStockInicial() → stockDiario.where() → [{total:10}]
      // 5. mermas.where() → [{total:0}]
      // 6. cortesias.where() → [{total:0}]
      let callIdx = 0;
      const resultados = [
        [{ id: 1, estado: "abierta" }],  // 1: sesion
        [{ id: 1 }],                       // 2: producto
        [{ total: 0 }],                     // 3: vendido
        [{ total: 10 }],                    // 4: stockInicial
        [{ total: 0 }],                     // 5: mermas
        [{ total: 0 }],                     // 6: cortesias
      ];

      mockDb.select.mockImplementation(() => {
        const idx = callIdx++;
        const data = resultados[idx] ?? [];
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue(data),
              then: (r: any, j?: any) => Promise.resolve(data).then(r, j),
            }),
            innerJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue(data),
            }),
            then: (r: any, j?: any) => Promise.resolve(data).then(r, j),
          }),
        };
      });

      mockDb.insert.mockImplementation(() => ({
        values: vi.fn().mockImplementation((vals: any) => {
          insertCalls.push(vals);
          return {
            returning: vi.fn().mockResolvedValue([{ id: 1 }]),
          };
        }),
      }));

      const servicio = crearServicioVentas(mockDb);
      await servicio.crear({
        sesionCajaId: 1,
        total: 5.0,
        metodoPago: "transferencia",
        tipoOrigen: "mostrador",
        detalles: [
          {
            productoId: 1,
            unidad: "porcion_llevar",
            cantidad: 1,
            precioUnitario: 5.0,
            subtotal: 5.0,
          },
        ],
      });

      // 2 inserts: ventas + ventaDetalle
      expect(insertCalls.length).toBe(2);
      // El segundo insert (ventaDetalle) tiene unidad "porcion" (normalizada)
      expect(insertCalls[1].unidad).toBe("porcion");
    });

    it("no normaliza unidad entero", async () => {
      const mod = await import("./index");
      const crearServicioVentas = mod.crearServicioVentas;

      const insertCalls: any[] = [];
      let callIdx = 0;
      const resultados = [
        [{ id: 1, estado: "abierta" }],
        [{ id: 1 }],
        [{ total: 0 }],
        [{ total: 10 }],
        [{ total: 0 }],
        [{ total: 0 }],
      ];

      const mockDb: any = {
        select: vi.fn().mockImplementation(() => {
          const idx = callIdx++;
          const data = resultados[idx] ?? [];
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue(data),
                then: (r: any, j?: any) => Promise.resolve(data).then(r, j),
              }),
              innerJoin: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue(data),
              }),
              then: (r: any, j?: any) => Promise.resolve(data).then(r, j),
            }),
          };
        }),
        insert: vi.fn().mockImplementation(() => ({
          values: vi.fn().mockImplementation((vals: any) => {
            insertCalls.push(vals);
            return {
              returning: vi.fn().mockResolvedValue([{ id: 1 }]),
            };
          }),
        })),
      };

      const servicio = crearServicioVentas(mockDb);
      await servicio.crear({
        sesionCajaId: 1,
        total: 10.0,
        metodoPago: "efectivo",
        tipoOrigen: "mostrador",
        detalles: [
          {
            productoId: 1,
            unidad: "entero",
            cantidad: 1,
            precioUnitario: 10.0,
            subtotal: 10.0,
          },
        ],
      });

      expect(insertCalls.length).toBe(2);
      expect(insertCalls[1].unidad).toBe("entero");
    });
  });
});
