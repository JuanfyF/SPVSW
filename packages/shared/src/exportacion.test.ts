import { describe, it, expect } from "vitest";
import {
  formatearReporteCierres,
  formatearReporteDiario,
  formatearReporteProductos,
  generarCsv,
} from "./exportacion";

describe("formatearReporteCierres", () => {
  const mockData = {
    fechaInicio: "2026-01-01",
    fechaFin: "2026-01-31",
    cierres: [
      {
        id: 1,
        fechaApertura: "2026-01-15",
        cajeroNombre: "Juan Pérez",
        ventasEfectivo: 100,
        ventasTransferencia: 50,
        pedidosEfectivo: 80,
        pedidosTransferencia: 30,
        gastosCaja: 20,
        adelantosEfectivo: 10,
        adelantosTransferencia: 5,
        efectivoEsperado: 235,
        efectivoContado: 230,
        diferenciaEfectivo: -5,
        tieneDiferenciaStock: false,
        estadoRevision: "revisada",
      },
      {
        id: 2,
        fechaApertura: "2026-01-16",
        cajeroNombre: "María López",
        ventasEfectivo: 150,
        ventasTransferencia: 0,
        pedidosEfectivo: 0,
        pedidosTransferencia: 0,
        gastosCaja: 10,
        adelantosEfectivo: 0,
        adelantosTransferencia: 0,
        efectivoEsperado: 140,
        efectivoContado: 140,
        diferenciaEfectivo: 0,
        tieneDiferenciaStock: true,
        estadoRevision: "pendiente",
      },
    ],
    totales: {
      ventasEfectivo: 250,
      ventasTransferencia: 50,
      pedidosEfectivo: 80,
      pedidosTransferencia: 30,
      gastosCaja: 30,
      adelantosEfectivo: 10,
      adelantosTransferencia: 5,
      efectivoEsperado: 375,
      efectivoContado: 370,
      diferenciaEfectivo: -5,
    },
  };

  it("genera titulo con rango de fechas", () => {
    const resultado = formatearReporteCierres(mockData);
    expect(resultado.titulo).toContain("2026-01-01");
    expect(resultado.titulo).toContain("2026-01-31");
  });

  it("tiene las 14 columnas correctas", () => {
    const resultado = formatearReporteCierres(mockData);
    expect(resultado.columnas).toHaveLength(14);
    expect(resultado.columnas).toContain("Fecha");
    expect(resultado.columnas).toContain("Cajero");
    expect(resultado.columnas).toContain("Devoluciones");
    expect(resultado.columnas).toContain("Diferencia");
    expect(resultado.columnas).toContain("Estado");
  });

  it("genera filas por cada cierre", () => {
    const resultado = formatearReporteCierres(mockData);
    expect(resultado.filas).toHaveLength(2);
    expect(resultado.filas[0]!["Cajero"]).toBe("Juan Pérez");
    expect(resultado.filas[1]!["Cajero"]).toBe("María López");
  });

  it("calcula adelantos como suma de efectivo + transferencia", () => {
    const resultado = formatearReporteCierres(mockData);
    expect(resultado.filas[0]!["Adelantos"]).toBe(15); // 10 + 5
  });

  it("mapea tieneDiferenciaStock a Sí/No", () => {
    const resultado = formatearReporteCierres(mockData);
    expect(resultado.filas[0]!["Dif. Stock"]).toBe("No");
    expect(resultado.filas[1]!["Dif. Stock"]).toBe("Sí");
  });

  it("incluye devolucionesAnticipoEfectivo en columnas y filas", () => {
    const dataConDevoluciones = {
      ...mockData,
      cierres: [
        { ...mockData.cierres[0], devolucionesAnticipoEfectivo: 15 },
        { ...mockData.cierres[1], devolucionesAnticipoEfectivo: 0 },
      ],
      totales: { ...mockData.totales, devolucionesAnticipoEfectivo: 15 },
    };
    const resultado = formatearReporteCierres(dataConDevoluciones);
    expect(resultado.columnas).toContain("Devoluciones");
    expect(resultado.filas[0]!["Devoluciones"]).toBe(15);
    expect(resultado.filas[1]!["Devoluciones"]).toBe(0);
    expect(resultado.totales!["Devoluciones"]).toBe(15);
  });

  it("maneja devolucionesAnticipoEfectivo null/undefined como 0", () => {
    const resultado = formatearReporteCierres(mockData);
    expect(resultado.filas[0]!["Devoluciones"]).toBe(0);
  });

  it("maneja efectivoContado null como 0", () => {
    const dataConNull = {
      ...mockData,
      cierres: [
        {
          ...mockData.cierres[0],
          efectivoContado: null,
          diferenciaEfectivo: null,
        },
      ],
    };
    const resultado = formatearReporteCierres(dataConNull);
    expect(resultado.filas[0]!["Efectivo Contado"]).toBe(0);
    expect(resultado.filas[0]!["Diferencia"]).toBe(0);
  });

  it("agrega totales correctamente", () => {
    const resultado = formatearReporteCierres(mockData);
    expect(resultado.totales).toBeDefined();
    expect(resultado.totales!["Ventas Efectivo"]).toBe(250);
    expect(resultado.totales!["Gastos"]).toBe(30);
    expect(resultado.totales!["Adelantos"]).toBe(15); // 10 + 5
    expect(resultado.totales!["Efectivo Esperado"]).toBe(375);
  });

  it("retorna array vacío de cierres", () => {
    const dataVacia = { ...mockData, cierres: [] };
    const resultado = formatearReporteCierres(dataVacia);
    expect(resultado.filas).toHaveLength(0);
  });
});

describe("generarCsv", () => {
  it("genera CSV con encabezados y filas", () => {
    const datos = {
      titulo: "Test",
      filtros: {},
      columnas: ["Nombre", "Valor"],
      filas: [
        { Nombre: "A", Valor: 10 },
        { Nombre: "B", Valor: 20 },
      ],
    };
    const csv = generarCsv(datos);
    expect(csv).toContain("Nombre,Valor");
    expect(csv).toContain("A,10");
    expect(csv).toContain("B,20");
  });

  it("agrega fila de totales cuando existen", () => {
    const datos = {
      titulo: "Test",
      filtros: {},
      columnas: ["Item", "Total"],
      filas: [{ Item: "X", Total: 100 }],
      totales: { Total: 100 },
    };
    const csv = generarCsv(datos);
    expect(csv).toContain("Total");
  });

  it("no agrega totales cuando no existen", () => {
    const datos = {
      titulo: "Test",
      filtros: {},
      columnas: ["Item"],
      filas: [{ Item: "X" }],
    };
    const csv = generarCsv(datos);
    expect(csv).not.toContain("Total");
  });
});
