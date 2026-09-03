import { describe, it, expect, vi } from "vitest";
import { crearServicioReportes } from "./index";

describe("reporteDiario - fecha matching", () => {
  it("LIKE con patron de fecha matchea datetime de SQLite", () => {
    const fechaHora = "2026-08-20 10:30:00";
    const fecha = "2026-08-20";
    const matchea = fechaHora.startsWith(fecha);
    expect(matchea).toBe(true);
  });

  it("LIKE no matchea fechas de otros dias", () => {
    const fechaHora = "2026-08-21 10:30:00";
    const fecha = "2026-08-20";
    expect(fechaHora.startsWith(fecha)).toBe(false);
  });

  it("eq no matchea datetime con solo fecha", () => {
    expect("2026-08-20 10:30:00" === "2026-08-20").toBe(false);
    expect("2026-08-20 10:30:00".startsWith("2026-08-20")).toBe(true);
  });
});

describe("reporteDiario - consolidado", () => {
  function mockDbSimple(secuencia: any[]) {
    let callIndex = 0;
    const nextResult = () => Promise.resolve(secuencia[callIndex++] ?? []);

    const whereChain = () => ({
      where: vi.fn().mockReturnValue({
        groupBy: vi.fn().mockImplementation(nextResult),
        then: (r: any, j?: any) => nextResult().then(r, j),
      }),
    });

    const innerJoinChain = () => ({
      innerJoin: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          groupBy: vi.fn().mockImplementation(nextResult),
          then: (r: any, j?: any) => nextResult().then(r, j),
        }),
      }),
    });

    // Simula las 9 queries de reporteDiario:
    // 1. select().from(ventas).where().groupBy()
    // 2. select().from(ventas).where().groupBy() (ventasPorOrigen)
    // 3. select().from(pedidos).where().groupBy()
    // 4. select().from(gastos).where().groupBy()
    // 5. select().from(gastos).innerJoin(catGasto).where().groupBy()
    // 6. select().from(gastos).innerJoin(catGasto).where()  ← sin groupBy
    // 7. select().from(adelantos).where().groupBy()
    // 8. select().from(multas).where()  ← sin groupBy
    // 9. select().from(devolucionesAnticipo).where().groupBy()
    const fromFn = vi.fn()
      // Query 1: ventas
      .mockReturnValueOnce(whereChain())
      // Query 2: ventasPorOrigen (ventas por tipoOrigen)
      .mockReturnValueOnce(whereChain())
      // Query 3: pedidos
      .mockReturnValueOnce(whereChain())
      // Query 4: gastos por origen
      .mockReturnValueOnce(whereChain())
      // Query 5: gastos por categoría (innerJoin)
      .mockReturnValueOnce(innerJoinChain())
      // Query 6: gastos detalle (innerJoin, sin groupBy)
      .mockReturnValueOnce({
        innerJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockImplementation(nextResult),
        }),
      })
      // Query 7: adelantos
      .mockReturnValueOnce(whereChain())
      // Query 8: multas (sin groupBy)
      .mockReturnValueOnce({
        where: vi.fn().mockImplementation(nextResult),
      })
      // Query 9: devoluciones anticipo
      .mockReturnValueOnce(whereChain());

    return {
      select: vi.fn().mockReturnValue({
        from: fromFn,
      }),
    };
  }

  it("ingresoNeto NO incluye multas", async () => {
    const mockDb = mockDbSimple([
      [], // ventas
      [], // ventasPorOrigen
      [], // pedidos
      [], // gastos origen
      [], // gastos categoria
      [], // gastos detalle
      [], // adelantos
      [{ total: 50 }], // multas
      [], // devoluciones
    ]);

    const servicio = crearServicioReportes(mockDb as any);
    const resultado = await servicio.reporteDiario("2026-08-20");

    expect(resultado.multas).toBe(50);
    expect(resultado.consolidado).not.toHaveProperty("multas");
    expect(resultado.consolidado.ingresoNeto).toBe(
      resultado.consolidado.ingresosBrutos - resultado.consolidado.egresosTotales
    );
  });

  it("ingresoNeto = ventas + pedidos - gastos - adelantos (sin multas)", async () => {
    const mockDb = mockDbSimple([
      [{ metodoPago: "efectivo", total: 100, cantidad: 5 }], // ventas
      [{ tipoOrigen: "mostrador", metodoPago: "efectivo", total: 100, cantidad: 5 }], // ventasPorOrigen
      [{ metodoPago: "efectivo", total: 30, cantidad: 2 }], // pedidos
      [
        { origen: "caja", total: 20 },
        { origen: "pedidos", total: 10 },
      ], // gastos origen
      [], // gastos categoria
      [], // gastos detalle
      [{ metodoPago: "efectivo", total: 5 }], // adelantos
      [{ total: 8 }], // multas
      [], // devoluciones
    ]);

    const servicio = crearServicioReportes(mockDb as any);
    const resultado = await servicio.reporteDiario("2026-08-20");

    expect(resultado.consolidado.ingresosBrutos).toBe(130);
    expect(resultado.consolidado.egresosTotales).toBe(35);
    expect(resultado.consolidado.ingresoNeto).toBe(95);
    expect(resultado.multas).toBe(8);
  });

  it("ingresoNeto resta devoluciones de anticipo", async () => {
    const mockDb = mockDbSimple([
      [{ metodoPago: "efectivo", total: 200, cantidad: 10 }], // ventas
      [{ tipoOrigen: "mostrador", metodoPago: "efectivo", total: 200, cantidad: 10 }], // ventasPorOrigen
      [], // pedidos
      [], // gastos origen
      [], // gastos categoria
      [], // gastos detalle
      [], // adelantos
      [{ total: 0 }], // multas
      [{ metodoDevolucion: "efectivo", total: 50 }], // devoluciones
    ]);

    const servicio = crearServicioReportes(mockDb as any);
    const resultado = await servicio.reporteDiario("2026-08-20");

    expect(resultado.devoluciones.efectivo).toBe(50);
    expect(resultado.devoluciones.total).toBe(50);
    expect(resultado.consolidado.ingresoNeto).toBe(150); // 200 - 50
  });
});
