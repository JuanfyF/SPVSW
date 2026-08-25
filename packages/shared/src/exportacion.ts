/**
 * Utilidades de exportación para reportes.
 *
 * AGENT.md §2.6 — Descarga del reporte consultado en dos formatos:
 * - PDF (para archivo/impresión, relevante para la conservación de 7 años que exige el SRI)
 * - Excel/CSV (para seguir analizando los datos)
 *
 * El botón de descarga exporta exactamente el rango y filtros que el usuario tiene
 * aplicados en pantalla, no todo el historial completo.
 */

import Papa from "papaparse";

// ── Tipos ──────────────────────────────────────────────

export type FormatoExportacion = "pdf" | "csv";

export interface FiltrosReporte {
  fechaInicio?: string;
  fechaFin?: string;
  fecha?: string;
  cajero?: string;
}

export interface FilaReporte {
  [key: string]: string | number;
}

export interface DatosExportacion {
  titulo: string;
  filtros: FiltrosReporte;
  columnas: string[];
  filas: FilaReporte[];
  totales?: Record<string, number>;
}

// ── Helpers ────────────────────────────────────────────

function formatNumber(value: number): string {
  return value.toLocaleString("es-EC", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// ── CSV ────────────────────────────────────────────────

export function generarCsv(datos: DatosExportacion): string {
  const dataWithTotals = [...datos.filas];

  if (datos.totales) {
    const totalRow: FilaReporte = { "": "TOTALES" };
    for (const [key, value] of Object.entries(datos.totales)) {
      totalRow[key] = formatNumber(value);
    }
    dataWithTotals.push(totalRow);
  }

  return Papa.unparse(dataWithTotals, {
    columns: datos.columnas,
  });
}

// ── Helpers para formatear datos de reportes ───────────

export function formatearReporteDiario(reporte: any): DatosExportacion {
  const filas: FilaReporte[] = [
    {
      Concepto: "Ventas (Mostrador)",
      Efectivo: reporte.ventas.efectivo,
      Transferencia: reporte.ventas.transferencia,
      Total: reporte.ventas.total,
    },
    {
      Concepto: "Pedidos (Anticipos)",
      Efectivo: reporte.pedidos.efectivo,
      Transferencia: reporte.pedidos.transferencia,
      Total: reporte.pedidos.total,
    },
    {
      Concepto: "Gastos (Caja)",
      Efectivo: reporte.gastos.caja,
      Transferencia: 0,
      Total: reporte.gastos.caja,
    },
    {
      Concepto: "Gastos (Pedidos)",
      Efectivo: reporte.gastos.pedidos,
      Transferencia: 0,
      Total: reporte.gastos.pedidos,
    },
  ];

  // Agregar gastos por categoría
  if (reporte.gastos.porCategoria && reporte.gastos.porCategoria.length > 0) {
    for (const cat of reporte.gastos.porCategoria) {
      filas.push({
        Concepto: `  → ${cat.categoriaNombre} (${cat.cantidad} gastos)`,
        Efectivo: 0,
        Transferencia: 0,
        Total: cat.total,
      });
    }
  }

  filas.push(
    {
      Concepto: "Adelantos",
      Efectivo: reporte.adelantos.efectivo,
      Transferencia: reporte.adelantos.transferencia,
      Total: reporte.adelantos.total,
    },
    {
      Concepto: "Multas (descuento a empleado)",
      Efectivo: 0,
      Transferencia: 0,
      Total: reporte.multas,
    },
    {
      Concepto: "Devoluciones anticipo",
      Efectivo: reporte.devoluciones?.efectivo ?? 0,
      Transferencia: reporte.devoluciones?.transferencia ?? 0,
      Total: reporte.devoluciones?.total ?? 0,
    },
    {
      Concepto: "INGRESO NETO",
      Efectivo:
        reporte.ventas.efectivo +
        reporte.pedidos.efectivo -
        reporte.gastos.caja -
        reporte.gastos.pedidos -
        reporte.adelantos.efectivo -
        (reporte.devoluciones?.efectivo ?? 0),
      Transferencia:
        reporte.ventas.transferencia +
        reporte.pedidos.transferencia -
        reporte.adelantos.transferencia -
        (reporte.devoluciones?.transferencia ?? 0),
      Total: reporte.consolidado.ingresoNeto,
    }
  );

  return {
    titulo: `Reporte Diario de Caja — ${reporte.fecha}`,
    filtros: { fecha: reporte.fecha },
    columnas: ["Concepto", "Efectivo", "Transferencia", "Total"],
    filas,
    totales: {
      Efectivo:
        reporte.ventas.efectivo +
        reporte.pedidos.efectivo -
        reporte.gastos.caja -
        reporte.gastos.pedidos -
        reporte.adelantos.efectivo,
      Transferencia:
        reporte.ventas.transferencia +
        reporte.pedidos.transferencia -
        reporte.adelantos.transferencia,
      Total: reporte.consolidado.ingresoNeto,
    },
  };
}

export function formatearReporteRango(reporte: any): DatosExportacion {
  return {
    titulo: `Reporte por Rango de Fechas`,
    filtros: {
      fechaInicio: reporte.fechaInicio,
      fechaFin: reporte.fechaFin,
    },
    columnas: ["Concepto", "Efectivo", "Transferencia", "Total"],
    filas: [
      {
        Concepto: "Ventas",
        Efectivo: reporte.ventas.efectivo,
        Transferencia: reporte.ventas.transferencia,
        Total: reporte.ventas.total,
      },
      {
        Concepto: "Gastos (Caja)",
        Efectivo: reporte.gastos.caja,
        Transferencia: 0,
        Total: reporte.gastos.caja,
      },
      {
        Concepto: "Gastos (Pedidos)",
        Efectivo: reporte.gastos.pedidos,
        Transferencia: 0,
        Total: reporte.gastos.pedidos,
      },
    ],
    totales: {
      Efectivo: reporte.ventas.efectivo - reporte.gastos.caja - reporte.gastos.pedidos,
      Transferencia: reporte.ventas.transferencia,
      Total: reporte.consolidado?.ingresoNeto ?? (reporte.ventas.total - reporte.gastos.total),
    },
  };
}

/**
 * Formatea el reporte histórico de cierres de caja por rango.
 * AGENT.md §2.6 — Detalle de cada cierre con totales agregados.
 */
export function formatearReporteCierres(data: any): DatosExportacion {
  const filas: FilaReporte[] = data.cierres.map((c: any) => ({
    Fecha: c.fechaApertura,
    Cajero: c.cajeroNombre,
    "Ventas Efectivo": c.ventasEfectivo,
    "Ventas Transferencia": c.ventasTransferencia,
    "Pedidos Efectivo": c.pedidosEfectivo,
    "Pedidos Transferencia": c.pedidosTransferencia,
    Gastos: c.gastosCaja,
    Adelantos: c.adelantosEfectivo + c.adelantosTransferencia,
    Devoluciones: c.devolucionesAnticipoEfectivo ?? 0,
    "Efectivo Esperado": c.efectivoEsperado,
    "Efectivo Contado": c.efectivoContado ?? 0,
    Diferencia: c.diferenciaEfectivo ?? 0,
    "Dif. Stock": c.tieneDiferenciaStock ? "Sí" : "No",
    Estado: c.estadoRevision,
  }));

  return {
    titulo: `Historial de Cierres de Caja — ${data.fechaInicio} al ${data.fechaFin}`,
    filtros: { fechaInicio: data.fechaInicio, fechaFin: data.fechaFin },
    columnas: [
      "Fecha", "Cajero", "Ventas Efectivo", "Ventas Transferencia",
      "Pedidos Efectivo", "Pedidos Transferencia", "Gastos", "Adelantos", "Devoluciones",
      "Efectivo Esperado", "Efectivo Contado", "Diferencia", "Dif. Stock", "Estado",
    ],
    filas,
    totales: {
      "Ventas Efectivo": data.totales.ventasEfectivo,
      "Ventas Transferencia": data.totales.ventasTransferencia,
      "Pedidos Efectivo": data.totales.pedidosEfectivo,
      "Pedidos Transferencia": data.totales.pedidosTransferencia,
      Gastos: data.totales.gastosCaja,
      Adelantos: data.totales.adelantosEfectivo + data.totales.adelantosTransferencia,
      Devoluciones: data.totales.devolucionesAnticipoEfectivo ?? 0,
      "Efectivo Esperado": data.totales.efectivoEsperado,
      "Efectivo Contado": data.totales.efectivoContado,
      Diferencia: data.totales.diferenciaEfectivo,
    },
  };
}

export function formatearReportePedidos(pedidos: any[]): DatosExportacion {
  return {
    titulo: "Reporte de Pedidos Pendientes",
    filtros: {},
    columnas: ["ID", "Cliente", "Fecha Entrega", "Estado", "Descripción", "Total", "Saldo Pendiente"],
    filas: pedidos.map((p) => ({
      ID: p.id,
      Cliente: p.cliente,
      "Fecha Entrega": p.fechaEntrega,
      Estado: p.estado,
      Descripción: p.descripcion || p.notas || "-",
      Total: p.totalEstimado,
      "Saldo Pendiente": p.saldoPendiente,
    })),
  };
}

export function formatearReporteProductos(productos: any[]): DatosExportacion {
  return {
    titulo: "Productos Más Vendidos",
    filtros: {},
    columnas: ["Producto", "Unidades Vendidas"],
    filas: productos.map((p) => ({
      Producto: p.nombre,
      "Unidades Vendidas": p.cantidad,
    })),
  };
}

// ── PDF ────────────────────────────────────────────────

export async function generarPdf(datos: DatosExportacion): Promise<void> {
  const pdfMakeModule = await import("pdfmake/build/pdfmake");
  const pdfMake: any = pdfMakeModule.default || pdfMakeModule;
  const pdfFontsModule = await import("pdfmake/build/vfs_fonts");
  const pdfFonts: any = pdfFontsModule.default || pdfFontsModule;
  pdfMake.vfs = pdfFonts.pdfMake ? pdfFonts.pdfMake.vfs : pdfFonts.vfs;

  const tableBody: any[][] = [];

  // Header
  tableBody.push(
    datos.columnas.map((col) => ({
      text: col,
      bold: true,
      fillColor: "#C97B4A",
      color: "#ffffff",
      fontSize: 9,
    }))
  );

  // Rows
  for (const fila of datos.filas) {
    tableBody.push(
      datos.columnas.map((col) => ({
        text: String(fila[col] ?? ""),
        fontSize: 9,
      }))
    );
  }

  // Totals
  if (datos.totales) {
    const totalRow: any[] = [{ text: "TOTALES", bold: true, fontSize: 9 }];
    for (let i = 1; i < datos.columnas.length; i++) {
      const key = datos.columnas[i]!;
      totalRow.push({
        text: datos.totales[key] != null ? formatNumber(datos.totales[key]!) : "",
        bold: true,
        fontSize: 9,
      });
    }
    tableBody.push(totalRow);
  }

  const now = new Date();
  const timestamp = now.toLocaleString("es-EC", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });

  const docDefinition: any = {
    content: [
      { text: "Sweet Bakery", style: "header" },
      { text: datos.titulo, style: "subheader" },
      {
        text: Object.entries(datos.filtros)
          .filter(([, v]) => v)
          .map(([k, v]) => `${k}: ${v}`)
          .join("  |  "),
        fontSize: 9,
        margin: [0, 0, 0, 5] as [number, number, number, number],
      },
      {
        text: `Generado: ${timestamp}`,
        fontSize: 8,
        color: "#888888",
        margin: [0, 0, 0, 10] as [number, number, number, number],
      },
      {
        table: {
          widths: datos.columnas.map(() => "*"),
          body: tableBody,
        },
        layout: "lightHorizontalLines",
      },
    ],
    styles: {
      header: { fontSize: 18, bold: true, color: "#C97B4A", margin: [0, 0, 0, 5] as [number, number, number, number] },
      subheader: { fontSize: 14, bold: true, margin: [0, 0, 0, 5] as [number, number, number, number] },
    },
    defaultStyle: { fontSize: 10 },
    pageSize: "A4",
    pageOrientation: "landscape" as const,
    footer: (currentPage: number, pageCount: number) => ({
      text: `Página ${currentPage} de ${pageCount}  |  Sweet Bakery — ${datos.titulo}`,
      alignment: "center" as const,
      fontSize: 8,
      color: "#888888",
      margin: [0, 10, 0, 0] as [number, number, number, number],
    }),
  };

  pdfMake.createPdf(docDefinition).download(`${datos.titulo.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`);
}
