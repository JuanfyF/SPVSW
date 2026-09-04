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
        Concepto: "Pedidos (Anticipos)",
        Efectivo: reporte.pedidos?.efectivo ?? 0,
        Transferencia: reporte.pedidos?.transferencia ?? 0,
        Total: reporte.pedidos?.total ?? 0,
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
      {
        Concepto: "Adelantos",
        Efectivo: reporte.adelantos?.efectivo ?? 0,
        Transferencia: reporte.adelantos?.transferencia ?? 0,
        Total: reporte.adelantos?.total ?? 0,
      },
      {
        Concepto: "Devoluciones",
        Efectivo: reporte.devoluciones?.efectivo ?? 0,
        Transferencia: reporte.devoluciones?.transferencia ?? 0,
        Total: reporte.devoluciones?.total ?? 0,
      },
    ],
    totales: {
      Efectivo:
        reporte.ventas.efectivo +
        (reporte.pedidos?.efectivo ?? 0) -
        reporte.gastos.caja -
        reporte.gastos.pedidos -
        (reporte.adelantos?.efectivo ?? 0) -
        (reporte.devoluciones?.efectivo ?? 0),
      Transferencia:
        reporte.ventas.transferencia +
        (reporte.pedidos?.transferencia ?? 0) -
        (reporte.adelantos?.transferencia ?? 0) -
        (reporte.devoluciones?.transferencia ?? 0),
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

export function formatearReporteNomina(resumenGlobal: {
  totalSalarios: number;
  totalAdelantos: number;
  totalMultas: number;
  totalDescuentos: number;
  netoGlobal: number;
  mes: string;
  empleados: Array<{
    nombre: string;
    salario: number;
    adelantos: number;
    multas: number;
    neto: number;
  }>;
}): DatosExportacion {
  const filas: FilaReporte[] = resumenGlobal.empleados.map((emp) => ({
    Empleado: emp.nombre,
    Salario: emp.salario,
    Adelantos: emp.adelantos > 0 ? -emp.adelantos : 0,
    Multas: emp.multas > 0 ? -emp.multas : 0,
    "Neto a Pagar": emp.neto,
  }));

  return {
    titulo: `Reporte de Nómina — ${resumenGlobal.mes}`,
    filtros: { fecha: resumenGlobal.mes },
    columnas: ["Empleado", "Salario", "Adelantos", "Multas", "Neto a Pagar"],
    filas,
    totales: {
      Salario: resumenGlobal.totalSalarios,
      Adelantos: -resumenGlobal.totalAdelantos,
      Multas: -resumenGlobal.totalMultas,
      "Neto a Pagar": resumenGlobal.netoGlobal,
    },
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

// ── PDF: Cierre de Caja ──────────────────────────────

export interface DatosCierreCaja {
  sesionId: number;
  fechaApertura: string;
  fechaCierre: string;
  cajeroNombre: string;
  ventas: { efectivo: number; transferencia: number; total: number };
  anticipos: { efectivo: number; transferencia: number; total: number };
  pedidos: { efectivo: number; transferencia: number; total: number };
  gastos: { caja: number; pedidos: number; total: number; porCategoria: Array<{ categoriaNombre: string; cantidad: number; total: number }> };
  adelantos: { efectivo: number; transferencia: number; total: number };
  devoluciones: { efectivo: number; transferencia: number; total: number };
  pedidosEntregados: Array<{
    id: number;
    cliente: string;
    producto: string;
    cantidad: number;
    total: number;
    cobradoEfectivo: number;
    cobradoTransferencia: number;
    saldoPendiente: number;
  }>;
  efectivoEsperado: number;
  efectivoContado: number;
  diferenciaEfectivo: number;
  transferenciaEsperada: number;
  transferenciaRecibida: number;
}

export async function generarPdfCierreCaja(data: DatosCierreCaja): Promise<void> {
  const pdfMakeModule = await import("pdfmake/build/pdfmake");
  const pdfMake: any = pdfMakeModule.default || pdfMakeModule;
  const pdfFontsModule = await import("pdfmake/build/vfs_fonts");
  const pdfFonts: any = pdfFontsModule.default || pdfFontsModule;
  pdfMake.vfs = pdfFonts.pdfMake ? pdfFonts.pdfMake.vfs : pdfFonts.vfs;

  const now = new Date();
  const timestamp = now.toLocaleString("es-EC", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });

  const totalIngresos = data.ventas.total + data.anticipos.total + data.pedidos.total;
  const totalEgresos = data.gastos.total + data.adelantos.total + data.devoluciones.total;
  const neto = totalIngresos - totalEgresos;

  const content: any[] = [
    { text: "Sweet Bakery", style: "header" },
    { text: "Reporte de Cierre de Caja", style: "subheader" },
    {
      text: `Sesión #${data.sesionId}  ·  ${data.fechaApertura} → ${data.fechaCierre}  ·  Cajero: ${data.cajeroNombre}`,
      fontSize: 9,
      margin: [0, 0, 0, 10] as [number, number, number, number],
    },
  ];

  // ── Resumen Financiero ──
  content.push({
    text: "RESUMEN FINANCIERO",
    style: "sectionTitle",
  });
  content.push({
    table: {
      widths: ["*", "*", "*"],
      body: [
        [
          { text: "INGRESOS", bold: true, fillColor: "#E8F5E9", color: "#2E7D32", alignment: "center" as const, fontSize: 10 },
          { text: "EGRESOS", bold: true, fillColor: "#FFEBEE", color: "#C62828", alignment: "center" as const, fontSize: 10 },
          { text: "NETO", bold: true, fillColor: "#E3F2FD", color: "#1565C0", alignment: "center" as const, fontSize: 10 },
        ],
        [
          { text: `$${formatNumber(totalIngresos)}`, bold: true, alignment: "center" as const, fontSize: 14, color: "#2E7D32" },
          { text: `$${formatNumber(totalEgresos)}`, bold: true, alignment: "center" as const, fontSize: 14, color: "#C62828" },
          { text: `$${formatNumber(neto)}`, bold: true, alignment: "center" as const, fontSize: 14, color: neto >= 0 ? "#1565C0" : "#C62828" },
        ],
      ],
    },
    margin: [0, 0, 0, 10] as [number, number, number, number],
  });

  // ── Desglose ──
  content.push({ text: "DESGLOSE", style: "sectionTitle" });

  const desgloseRows: any[][] = [];

  // Header
  desgloseRows.push([
    { text: "Concepto", bold: true, fillColor: "#C97B4A", color: "#ffffff", fontSize: 9 },
    { text: "Efectivo", bold: true, fillColor: "#C97B4A", color: "#ffffff", fontSize: 9, alignment: "right" as const },
    { text: "Transferencia", bold: true, fillColor: "#C97B4A", color: "#ffffff", fontSize: 9, alignment: "right" as const },
    { text: "Total", bold: true, fillColor: "#C97B4A", color: "#ffffff", fontSize: 9, alignment: "right" as const },
  ]);

  const addDesgloseRow = (label: string, efectivo: number, transferencia: number, total: number, bold = false) => {
    desgloseRows.push([
      { text: label, bold, fontSize: 9 },
      { text: `$${formatNumber(efectivo)}`, fontSize: 9, alignment: "right" as const },
      { text: `$${formatNumber(transferencia)}`, fontSize: 9, alignment: "right" as const },
      { text: `$${formatNumber(total)}`, bold, fontSize: 9, alignment: "right" as const },
    ]);
  };

  addDesgloseRow("Ventas (Mostrador)", data.ventas.efectivo, data.ventas.transferencia, data.ventas.total);
  addDesgloseRow("Pedidos (Anticipos)", data.anticipos.efectivo, data.anticipos.transferencia, data.anticipos.total);

  if (data.pedidos.total > 0) {
    addDesgloseRow("Pedidos (Saldos cobrados)", data.pedidos.efectivo, data.pedidos.transferencia, data.pedidos.total);
  }

  addDesgloseRow("Gastos (Caja)", data.gastos.caja, 0, data.gastos.caja, true);
  for (const cat of data.gastos.porCategoria) {
    desgloseRows.push([
      { text: `    → ${cat.categoriaNombre} (${cat.cantidad})`, fontSize: 8, color: "#666666" },
      { text: "", fontSize: 8 },
      { text: "", fontSize: 8 },
      { text: `-$${formatNumber(cat.total)}`, fontSize: 8, alignment: "right" as const, color: "#666666" },
    ]);
  }

  if (data.gastos.pedidos > 0) {
    addDesgloseRow("Gastos (Pedidos)", data.gastos.pedidos, 0, data.gastos.pedidos, true);
  }
  if (data.adelantos.total > 0) {
    addDesgloseRow("Adelantos", data.adelantos.efectivo, data.adelantos.transferencia, data.adelantos.total, true);
  }
  if (data.devoluciones.total > 0) {
    addDesgloseRow("Devoluciones", data.devoluciones.efectivo, data.devoluciones.transferencia, data.devoluciones.total, true);
  }

  content.push({
    table: {
      widths: ["*", "auto", "auto", "auto"],
      body: desgloseRows,
    },
    layout: "lightHorizontalLines",
    margin: [0, 0, 0, 10] as [number, number, number, number],
  });

  // ── Pedidos Entregados Hoy ──
  if (data.pedidosEntregados.length > 0) {
    content.push({ text: "PEDIDOS ENTREGADOS HOY", style: "sectionTitle" });

    const pedidosRows: any[][] = [];
    pedidosRows.push([
      { text: "#", bold: true, fillColor: "#C97B4A", color: "#ffffff", fontSize: 8 },
      { text: "Cliente", bold: true, fillColor: "#C97B4A", color: "#ffffff", fontSize: 8 },
      { text: "Producto", bold: true, fillColor: "#C97B4A", color: "#ffffff", fontSize: 8 },
      { text: "Cant.", bold: true, fillColor: "#C97B4A", color: "#ffffff", fontSize: 8, alignment: "right" as const },
      { text: "Total", bold: true, fillColor: "#C97B4A", color: "#ffffff", fontSize: 8, alignment: "right" as const },
      { text: "Efectivo", bold: true, fillColor: "#C97B4A", color: "#ffffff", fontSize: 8, alignment: "right" as const },
      { text: "Transfer.", bold: true, fillColor: "#C97B4A", color: "#ffffff", fontSize: 8, alignment: "right" as const },
      { text: "Saldo", bold: true, fillColor: "#C97B4A", color: "#ffffff", fontSize: 8, alignment: "right" as const },
    ]);

    let totalCobradoEfectivo = 0;
    let totalCobradoTransferencia = 0;
    let totalCobrado = 0;
    let totalPendiente = 0;

    for (const p of data.pedidosEntregados) {
      pedidosRows.push([
        { text: `#${p.id}`, fontSize: 8 },
        { text: p.cliente, fontSize: 8 },
        { text: `${p.producto} (${p.cantidad})`, fontSize: 8 },
        { text: String(p.cantidad), fontSize: 8, alignment: "right" as const },
        { text: `$${formatNumber(p.total)}`, fontSize: 8, alignment: "right" as const },
        { text: `$${formatNumber(p.cobradoEfectivo)}`, fontSize: 8, alignment: "right" as const },
        { text: `$${formatNumber(p.cobradoTransferencia)}`, fontSize: 8, alignment: "right" as const },
        { text: p.saldoPendiente > 0 ? `$${formatNumber(p.saldoPendiente)}` : "$0.00", fontSize: 8, alignment: "right" as const, color: p.saldoPendiente > 0 ? "#C62828" : "#2E7D32" },
      ]);
      totalCobradoEfectivo += p.cobradoEfectivo;
      totalCobradoTransferencia += p.cobradoTransferencia;
      totalCobrado += p.cobradoEfectivo + p.cobradoTransferencia;
      totalPendiente += p.saldoPendiente;
    }

    // Totals row
    pedidosRows.push([
      { text: "TOTALES", bold: true, fontSize: 8 },
      { text: "", fontSize: 8 },
      { text: "", fontSize: 8 },
      { text: "", fontSize: 8 },
      { text: `$${formatNumber(totalCobrado + totalPendiente)}`, bold: true, fontSize: 8, alignment: "right" as const },
      { text: `$${formatNumber(totalCobradoEfectivo)}`, bold: true, fontSize: 8, alignment: "right" as const },
      { text: `$${formatNumber(totalCobradoTransferencia)}`, bold: true, fontSize: 8, alignment: "right" as const },
      { text: `$${formatNumber(totalPendiente)}`, bold: true, fontSize: 8, alignment: "right" as const, color: totalPendiente > 0 ? "#C62828" : "#2E7D32" },
    ]);

    content.push({
      table: {
        widths: ["auto", "auto", "*", "auto", "auto", "auto", "auto", "auto"],
        body: pedidosRows,
      },
      layout: "lightHorizontalLines",
      margin: [0, 0, 0, 10] as [number, number, number, number],
    });

    content.push({
      text: `Cobrado: $${formatNumber(totalCobrado)}  |  Pendiente: $${formatNumber(totalPendiente)}`,
      fontSize: 9,
      bold: true,
      margin: [0, 0, 0, 10] as [number, number, number, number],
    });
  }

  // ── Conciliación de Caja ──
  content.push({ text: "CONCILIACIÓN DE CAJA", style: "sectionTitle" });

  const conciliacionRows: any[][] = [
    [
      { text: "", bold: true, fontSize: 9 },
      { text: "Esperado", bold: true, fillColor: "#C97B4A", color: "#ffffff", fontSize: 9, alignment: "right" as const },
      { text: "Contado", bold: true, fillColor: "#C97B4A", color: "#ffffff", fontSize: 9, alignment: "right" as const },
      { text: "Diferencia", bold: true, fillColor: "#C97B4A", color: "#ffffff", fontSize: 9, alignment: "right" as const },
    ],
    [
      { text: "Efectivo", bold: true, fontSize: 9 },
      { text: `$${formatNumber(data.efectivoEsperado)}`, fontSize: 9, alignment: "right" as const },
      { text: `$${formatNumber(data.efectivoContado)}`, fontSize: 9, alignment: "right" as const },
      { text: `$${formatNumber(data.diferenciaEfectivo)}`, fontSize: 9, alignment: "right" as const, color: data.diferenciaEfectivo !== 0 ? "#C62828" : "#2E7D32" },
    ],
    [
      { text: "Transferencia", bold: true, fontSize: 9 },
      { text: `$${formatNumber(data.transferenciaEsperada)}`, fontSize: 9, alignment: "right" as const },
      { text: `$${formatNumber(data.transferenciaRecibida)}`, fontSize: 9, alignment: "right" as const },
      { text: `$${formatNumber(data.transferenciaRecibida - data.transferenciaEsperada)}`, fontSize: 9, alignment: "right" as const, color: data.transferenciaRecibida !== data.transferenciaEsperada ? "#C62828" : "#2E7D32" },
    ],
    [
      { text: "TOTAL", bold: true, fontSize: 9, fillColor: "#F5F5F5" },
      { text: `$${formatNumber(data.efectivoEsperado + data.transferenciaEsperada)}`, bold: true, fontSize: 9, alignment: "right" as const, fillColor: "#F5F5F5" },
      { text: `$${formatNumber(data.efectivoContado + data.transferenciaRecibida)}`, bold: true, fontSize: 9, alignment: "right" as const, fillColor: "#F5F5F5" },
      { text: `$${formatNumber((data.efectivoContado + data.transferenciaRecibida) - (data.efectivoEsperado + data.transferenciaEsperada))}`, bold: true, fontSize: 9, alignment: "right" as const, fillColor: "#F5F5F5", color: "#C62828" },
    ],
  ];

  content.push({
    table: {
      widths: ["*", "auto", "auto", "auto"],
      body: conciliacionRows,
    },
    layout: "lightHorizontalLines",
    margin: [0, 0, 0, 10] as [number, number, number, number],
  });

  // ── Timestamp ──
  content.push({
    text: `Generado: ${timestamp}`,
    fontSize: 8,
    color: "#888888",
    margin: [0, 0, 0, 5] as [number, number, number, number],
  });

  const docDefinition: any = {
    content,
    styles: {
      header: { fontSize: 18, bold: true, color: "#C97B4A", margin: [0, 0, 0, 5] as [number, number, number, number] },
      subheader: { fontSize: 14, bold: true, margin: [0, 0, 0, 5] as [number, number, number, number] },
      sectionTitle: { fontSize: 11, bold: true, margin: [0, 0, 0, 5] as [number, number, number, number], color: "#C97B4A" },
    },
    defaultStyle: { fontSize: 10 },
    pageSize: "A4",
    pageOrientation: "portrait" as const,
    footer: (currentPage: number, pageCount: number) => ({
      text: `Página ${currentPage} de ${pageCount}  |  Sweet Bakery — Cierre de Caja`,
      alignment: "center" as const,
      fontSize: 8,
      color: "#888888",
      margin: [0, 10, 0, 0] as [number, number, number, number],
    }),
  };

  pdfMake.createPdf(docDefinition).download(`Cierre_Caja_Sesion_${data.sesionId}.pdf`);
}

// ── PDF: Nómina ───────────────────────────────────────

export interface DatosNomina {
  mes: string;
  totalAdelantos: number;
  totalMultas: number;
  netoGlobal: number;
  empleados: Array<{
    nombre: string;
    salario: number;
    adelantos: number;
    multas: number;
    neto: number;
  }>;
}

export async function generarPdfNomina(data: DatosNomina): Promise<void> {
  const pdfMakeModule = await import("pdfmake/build/pdfmake");
  const pdfMake: any = pdfMakeModule.default || pdfMakeModule;
  const pdfFontsModule = await import("pdfmake/build/vfs_fonts");
  const pdfFonts: any = pdfFontsModule.default || pdfFontsModule;
  pdfMake.vfs = pdfFonts.pdfMake ? pdfFonts.pdfMake.vfs : pdfFonts.vfs;

  const now = new Date();
  const timestamp = now.toLocaleString("es-EC", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });

  const content: any[] = [
    { text: "Sweet Bakery", style: "header" },
    { text: "Reporte de Nómina", style: "subheader" },
    {
      text: `Período: ${data.mes}`,
      fontSize: 9,
      margin: [0, 0, 0, 10] as [number, number, number, number],
    },
  ];

  // ── Desglose por empleado ──
  content.push({ text: "DESGLOSE POR EMPLEADO", style: "sectionTitle" });

  for (const emp of data.empleados) {
    const empRows: any[][] = [
      [
        { text: "Concepto", bold: true, fillColor: "#C97B4A", color: "#ffffff", fontSize: 9 },
        { text: "Monto", bold: true, fillColor: "#C97B4A", color: "#ffffff", fontSize: 9, alignment: "right" as const },
      ],
      [
        { text: "Salario", bold: true, fontSize: 9 },
        { text: `$${formatNumber(emp.salario)}`, fontSize: 9, alignment: "right" as const },
      ],
      [
        { text: "Adelantos", fontSize: 9 },
        { text: emp.adelantos > 0 ? `-$${formatNumber(emp.adelantos)}` : "$0.00", fontSize: 9, alignment: "right" as const, color: emp.adelantos > 0 ? "#C62828" : undefined },
      ],
      [
        { text: "Multas", fontSize: 9 },
        { text: emp.multas > 0 ? `-$${formatNumber(emp.multas)}` : "$0.00", fontSize: 9, alignment: "right" as const, color: emp.multas > 0 ? "#C62828" : undefined },
      ],
      [
        { text: "NETO A PAGAR", bold: true, fontSize: 10, fillColor: "#F5F5F5" },
        { text: `$${formatNumber(emp.neto)}`, bold: true, fontSize: 10, alignment: "right" as const, fillColor: "#F5F5F5", color: emp.neto >= 0 ? "#2E7D32" : "#C62828" },
      ],
    ];

    content.push({
      text: emp.nombre,
      bold: true,
      fontSize: 10,
      margin: [0, 5, 0, 3] as [number, number, number, number],
    });

    content.push({
      table: {
        widths: ["*", "auto"],
        body: empRows,
      },
      layout: "lightHorizontalLines",
      margin: [0, 0, 0, 8] as [number, number, number, number],
    });
  }

  // ── Totales ──
  content.push({
    text: "TOTALES",
    style: "sectionTitle",
  });

  const totalesRows: any[][] = [
    [
      { text: "Concepto", bold: true, fillColor: "#C97B4A", color: "#ffffff", fontSize: 9 },
      { text: "Monto", bold: true, fillColor: "#C97B4A", color: "#ffffff", fontSize: 9, alignment: "right" as const },
    ],
    [
      { text: "Total Adelantos", bold: true, fontSize: 9 },
      { text: `-$${formatNumber(data.totalAdelantos)}`, fontSize: 9, alignment: "right" as const, color: "#C62828" },
    ],
    [
      { text: "Total Multas", bold: true, fontSize: 9 },
      { text: `-$${formatNumber(data.totalMultas)}`, fontSize: 9, alignment: "right" as const, color: "#C62828" },
    ],
    [
      { text: "NETO GLOBAL", bold: true, fontSize: 10, fillColor: "#F5F5F5" },
      { text: `$${formatNumber(data.netoGlobal)}`, bold: true, fontSize: 10, alignment: "right" as const, fillColor: "#F5F5F5", color: data.netoGlobal >= 0 ? "#2E7D32" : "#C62828" },
    ],
  ];

  content.push({
    table: {
      widths: ["*", "auto"],
      body: totalesRows,
    },
    layout: "lightHorizontalLines",
    margin: [0, 0, 0, 10] as [number, number, number, number],
  });

  content.push({
    text: `Generado: ${timestamp}`,
    fontSize: 8,
    color: "#888888",
  });

  const docDefinition: any = {
    content,
    styles: {
      header: { fontSize: 18, bold: true, color: "#C97B4A", margin: [0, 0, 0, 5] as [number, number, number, number] },
      subheader: { fontSize: 14, bold: true, margin: [0, 0, 0, 5] as [number, number, number, number] },
      sectionTitle: { fontSize: 11, bold: true, margin: [0, 0, 0, 5] as [number, number, number, number], color: "#C97B4A" },
    },
    defaultStyle: { fontSize: 10 },
    pageSize: "A4",
    pageOrientation: "portrait" as const,
    footer: (currentPage: number, pageCount: number) => ({
      text: `Página ${currentPage} de ${pageCount}  |  Sweet Bakery — Nómina`,
      alignment: "center" as const,
      fontSize: 8,
      color: "#888888",
      margin: [0, 10, 0, 0] as [number, number, number, number],
    }),
  };

  pdfMake.createPdf(docDefinition).download(`Nomina_${data.mes.replace("/", "-")}.pdf`);
}

// ── PDF: Pedidos ──────────────────────────────────────

export interface DatosPedidosPdf {
  pedidos: Array<{
    id: number;
    cliente: string;
    fechaEntrega: string;
    estado: string;
    descripcion?: string | null;
    notas?: string | null;
    totalEstimado: number;
    saldoPendiente: number;
  }>;
}

const ESTADO_LABELS: Record<string, string> = {
  pendiente: "PENDIENTES",
  en_proceso: "EN PROCESO",
  listo: "LISTOS",
  entregado: "ENTREGADOS",
  cancelado: "CANCELADOS",
};

const ESTADO_COLORS: Record<string, string> = {
  pendiente: "#E65100",
  en_proceso: "#1565C0",
  listo: "#2E7D32",
  entregado: "#4E342E",
  cancelado: "#C62828",
};

export async function generarPdfPedidos(data: DatosPedidosPdf): Promise<void> {
  const pdfMakeModule = await import("pdfmake/build/pdfmake");
  const pdfMake: any = pdfMakeModule.default || pdfMakeModule;
  const pdfFontsModule = await import("pdfmake/build/vfs_fonts");
  const pdfFonts: any = pdfFontsModule.default || pdfFontsModule;
  pdfMake.vfs = pdfFonts.pdfMake ? pdfFonts.pdfMake.vfs : pdfFonts.vfs;

  const now = new Date();
  const timestamp = now.toLocaleString("es-EC", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });

  const content: any[] = [
    { text: "Sweet Bakery", style: "header" },
    { text: "Reporte de Pedidos", style: "subheader" },
    {
      text: `Generado: ${timestamp}`,
      fontSize: 8,
      color: "#888888",
      margin: [0, 0, 0, 10] as [number, number, number, number],
    },
  ];

  // Agrupar por estado
  const grupos: Record<string, typeof data.pedidos> = {};
  for (const p of data.pedidos) {
    if (!grupos[p.estado]) grupos[p.estado] = [];
    grupos[p.estado]!.push(p);
  }

  // Orden de estados
  const ordenEstados = ["pendiente", "en_proceso", "listo", "entregado", "cancelado"];

  let totalGeneral = 0;
  let pendienteGeneral = 0;

  for (const estado of ordenEstados) {
    const pedidosGrupo = grupos[estado];
    if (!pedidosGrupo || pedidosGrupo.length === 0) continue;

    const colorEstado = ESTADO_COLORS[estado] || "#333333";
    const labelEstado = ESTADO_LABELS[estado] || estado.toUpperCase();

    content.push({
      text: `${labelEstado} (${pedidosGrupo.length})`,
      style: "sectionTitle",
      color: colorEstado,
    });

    for (const p of pedidosGrupo) {
      // Card header
      content.push({
        text: `#${p.id}  ·  ${p.cliente}  ·  Entrega: ${p.fechaEntrega}`,
        bold: true,
        fontSize: 9,
        margin: [0, 5, 0, 2] as [number, number, number, number],
      });

      const cardRows: any[][] = [
        [
          { text: "Total:", bold: true, fontSize: 8 },
          { text: `$${formatNumber(p.totalEstimado)}`, fontSize: 8 },
          { text: "Saldo pendiente:", bold: true, fontSize: 8 },
          { text: `$${formatNumber(p.saldoPendiente)}`, fontSize: 8, color: p.saldoPendiente > 0 ? "#C62828" : "#2E7D32" },
        ],
      ];

      if (p.descripcion) {
        cardRows.push([
          { text: "Descripción:", bold: true, fontSize: 8 },
          { text: p.descripcion, fontSize: 8, colSpan: 3 as any },
          { text: "", fontSize: 8 },
          { text: "", fontSize: 8 },
        ]);
      }

      if (p.notas) {
        cardRows.push([
          { text: "Notas:", bold: true, fontSize: 8 },
          { text: p.notas, fontSize: 8, colSpan: 3 as any, italics: true },
          { text: "", fontSize: 8 },
          { text: "", fontSize: 8 },
        ]);
      }

      content.push({
        table: {
          widths: ["auto", "*", "auto", "auto"],
          body: cardRows,
        },
        layout: "noBorders",
        margin: [0, 0, 0, 5] as [number, number, number, number],
      });

      // Separator line
      content.push({
        canvas: [{ type: "line", x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: "#CCCCCC" }],
        margin: [0, 0, 0, 3] as [number, number, number, number],
      });

      totalGeneral += p.totalEstimado;
      pendienteGeneral += p.saldoPendiente;
    }
  }

  // Resumen
  content.push({ text: "" }); // spacer
  content.push({
    text: "RESUMEN",
    style: "sectionTitle",
  });

  const resumenRows: any[][] = [
    [
      { text: "Total pedidos", bold: true, fontSize: 9 },
      { text: `${data.pedidos.length}`, fontSize: 9, alignment: "right" as const },
    ],
    [
      { text: "Total general", bold: true, fontSize: 9 },
      { text: `$${formatNumber(totalGeneral)}`, fontSize: 9, alignment: "right" as const },
    ],
    [
      { text: "Total pendiente", bold: true, fontSize: 9, color: pendienteGeneral > 0 ? "#C62828" : undefined },
      { text: `$${formatNumber(pendienteGeneral)}`, fontSize: 9, alignment: "right" as const, color: pendienteGeneral > 0 ? "#C62828" : "#2E7D32", bold: true },
    ],
  ];

  content.push({
    table: {
      widths: ["*", "auto"],
      body: resumenRows,
    },
    layout: "lightHorizontalLines",
    margin: [0, 0, 0, 10] as [number, number, number, number],
  });

  const docDefinition: any = {
    content,
    styles: {
      header: { fontSize: 18, bold: true, color: "#C97B4A", margin: [0, 0, 0, 5] as [number, number, number, number] },
      subheader: { fontSize: 14, bold: true, margin: [0, 0, 0, 5] as [number, number, number, number] },
      sectionTitle: { fontSize: 11, bold: true, margin: [0, 0, 0, 5] as [number, number, number, number], color: "#C97B4A" },
    },
    defaultStyle: { fontSize: 10 },
    pageSize: "A4",
    pageOrientation: "portrait" as const,
    footer: (currentPage: number, pageCount: number) => ({
      text: `Página ${currentPage} de ${pageCount}  |  Sweet Bakery — Pedidos`,
      alignment: "center" as const,
      fontSize: 8,
      color: "#888888",
      margin: [0, 10, 0, 0] as [number, number, number, number],
    }),
  };

  pdfMake.createPdf(docDefinition).download(`Pedidos_${now.toISOString().slice(0, 10)}.pdf`);
}

// ── PDF: Reporte Diario ───────────────────────────────

export interface DatosReporteDiario {
  fecha: string;
  ventas: { efectivo: number; transferencia: number; total: number };
  pedidos: { efectivo: number; transferencia: number; total: number };
  gastos: {
    caja: number; pedidos: number; total: number;
    porCategoria: Array<{ categoriaNombre: string; cantidad: number; total: number }>;
  };
  adelantos: { efectivo: number; transferencia: number; total: number };
  devoluciones?: { efectivo: number; transferencia: number; total: number };
  multas: number;
  consolidado: { ingresosBrutos: number; egresosTotales: number; ingresoNeto: number };
}

export async function generarPdfDiario(data: DatosReporteDiario): Promise<void> {
  const pdfMakeModule = await import("pdfmake/build/pdfmake");
  const pdfMake: any = pdfMakeModule.default || pdfMakeModule;
  const pdfFontsModule = await import("pdfmake/build/vfs_fonts");
  const pdfFonts: any = pdfFontsModule.default || pdfFontsModule;
  pdfMake.vfs = pdfFonts.pdfMake ? pdfFonts.pdfMake.vfs : pdfFonts.vfs;

  const now = new Date();
  const timestamp = now.toLocaleString("es-EC", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });

  const content: any[] = [
    { text: "Sweet Bakery", style: "header" },
    { text: `Reporte Diario de Caja`, style: "subheader" },
    { text: `Fecha: ${data.fecha}`, fontSize: 9, margin: [0, 0, 0, 10] as [number, number, number, number] },
  ];

  // ── Resumen Financiero ──
  const totalIngresos = data.ventas.total + data.pedidos.total;
  const totalEgresos = data.gastos.total + data.adelantos.total + (data.devoluciones?.total ?? 0);
  const neto = data.consolidado.ingresoNeto;

  content.push({ text: "RESUMEN FINANCIERO", style: "sectionTitle" });
  content.push({
    table: {
      widths: ["*", "*", "*"],
      body: [
        [
          { text: "INGRESOS", bold: true, fillColor: "#E8F5E9", color: "#2E7D32", alignment: "center" as const, fontSize: 10 },
          { text: "EGRESOS", bold: true, fillColor: "#FFEBEE", color: "#C62828", alignment: "center" as const, fontSize: 10 },
          { text: "NETO", bold: true, fillColor: "#E3F2FD", color: "#1565C0", alignment: "center" as const, fontSize: 10 },
        ],
        [
          { text: `$${formatNumber(totalIngresos)}`, bold: true, alignment: "center" as const, fontSize: 14, color: "#2E7D32" },
          { text: `$${formatNumber(totalEgresos)}`, bold: true, alignment: "center" as const, fontSize: 14, color: "#C62828" },
          { text: `$${formatNumber(neto)}`, bold: true, alignment: "center" as const, fontSize: 14, color: neto >= 0 ? "#1565C0" : "#C62828" },
        ],
      ],
    },
    margin: [0, 0, 0, 10] as [number, number, number, number],
  });

  // ── Desglose ──
  content.push({ text: "DESGLOSE", style: "sectionTitle" });
  const rows: any[][] = [];
  rows.push([
    { text: "Concepto", bold: true, fillColor: "#C97B4A", color: "#ffffff", fontSize: 9 },
    { text: "Efectivo", bold: true, fillColor: "#C97B4A", color: "#ffffff", fontSize: 9, alignment: "right" as const },
    { text: "Transferencia", bold: true, fillColor: "#C97B4A", color: "#ffffff", fontSize: 9, alignment: "right" as const },
    { text: "Total", bold: true, fillColor: "#C97B4A", color: "#ffffff", fontSize: 9, alignment: "right" as const },
  ]);
  const addRow = (label: string, ef: number, tr: number, tot: number, bold = false) => {
    rows.push([
      { text: label, bold, fontSize: 9 },
      { text: `$${formatNumber(ef)}`, fontSize: 9, alignment: "right" as const },
      { text: `$${formatNumber(tr)}`, fontSize: 9, alignment: "right" as const },
      { text: `$${formatNumber(tot)}`, bold, fontSize: 9, alignment: "right" as const },
    ]);
  };
  addRow("Ventas (Mostrador)", data.ventas.efectivo, data.ventas.transferencia, data.ventas.total);
  addRow("Pedidos (Anticipos)", data.pedidos.efectivo, data.pedidos.transferencia, data.pedidos.total);
  addRow("Gastos (Caja)", data.gastos.caja, 0, data.gastos.caja, true);
  for (const cat of data.gastos.porCategoria) {
    rows.push([
      { text: `    → ${cat.categoriaNombre} (${cat.cantidad})`, fontSize: 8, color: "#666666" },
      { text: "", fontSize: 8 }, { text: "", fontSize: 8 },
      { text: `-$${formatNumber(cat.total)}`, fontSize: 8, alignment: "right" as const, color: "#666666" },
    ]);
  }
  if (data.gastos.pedidos > 0) addRow("Gastos (Pedidos)", data.gastos.pedidos, 0, data.gastos.pedidos, true);
  if (data.adelantos.total > 0) addRow("Adelantos", data.adelantos.efectivo, data.adelantos.transferencia, data.adelantos.total, true);
  if (data.multas > 0) addRow("Multas (descuento a empleado)", 0, 0, data.multas, true);
  if ((data.devoluciones?.total ?? 0) > 0) addRow("Devoluciones anticipo", data.devoluciones!.efectivo, data.devoluciones!.transferencia, data.devoluciones!.total, true);
  addRow("INGRESO NETO", data.consolidado.ingresoNeto - data.consolidado.egresosTotales + data.consolidado.egresosTotales - data.consolidado.egresosTotales, 0, data.consolidado.ingresoNeto, true);

  content.push({ table: { widths: ["*", "auto", "auto", "auto"], body: rows }, layout: "lightHorizontalLines", margin: [0, 0, 0, 10] as [number, number, number, number] });
  content.push({ text: `Generado: ${timestamp}`, fontSize: 8, color: "#888888" });

  const docDefinition: any = {
    content,
    styles: {
      header: { fontSize: 18, bold: true, color: "#C97B4A", margin: [0, 0, 0, 5] as [number, number, number, number] },
      subheader: { fontSize: 14, bold: true, margin: [0, 0, 0, 5] as [number, number, number, number] },
      sectionTitle: { fontSize: 11, bold: true, margin: [0, 0, 0, 5] as [number, number, number, number], color: "#C97B4A" },
    },
    defaultStyle: { fontSize: 10 },
    pageSize: "A4", pageOrientation: "portrait" as const,
    footer: (currentPage: number, pageCount: number) => ({
      text: `Página ${currentPage} de ${pageCount}  |  Sweet Bakery — Reporte Diario`,
      alignment: "center" as const, fontSize: 8, color: "#888888", margin: [0, 10, 0, 0] as [number, number, number, number],
    }),
  };
  pdfMake.createPdf(docDefinition).download(`Reporte_Diario_${data.fecha}.pdf`);
}

// ── PDF: Reporte por Rango ────────────────────────────

export interface DatosReporteRango {
  fechaInicio: string;
  fechaFin: string;
  ventas: { efectivo: number; transferencia: number; total: number };
  pedidos?: { efectivo: number; transferencia: number; total: number };
  gastos: { caja: number; pedidos: number; total: number };
  adelantos?: { efectivo: number; transferencia: number; total: number };
  devoluciones?: { efectivo: number; transferencia: number; total: number };
  consolidado?: { ingresoNeto: number };
}

export async function generarPdfRango(data: DatosReporteRango): Promise<void> {
  const pdfMakeModule = await import("pdfmake/build/pdfmake");
  const pdfMake: any = pdfMakeModule.default || pdfMakeModule;
  const pdfFontsModule = await import("pdfmake/build/vfs_fonts");
  const pdfFonts: any = pdfFontsModule.default || pdfFontsModule;
  pdfMake.vfs = pdfFonts.pdfMake ? pdfFonts.pdfMake.vfs : pdfFonts.vfs;

  const now = new Date();
  const timestamp = now.toLocaleString("es-EC", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });

  const neto = data.consolidado?.ingresoNeto ?? (data.ventas.total + (data.pedidos?.total ?? 0) - data.gastos.total - (data.adelantos?.total ?? 0) - (data.devoluciones?.total ?? 0));

  const content: any[] = [
    { text: "Sweet Bakery", style: "header" },
    { text: "Reporte por Rango de Fechas", style: "subheader" },
    { text: `Desde: ${data.fechaInicio}  |  Hasta: ${data.fechaFin}`, fontSize: 9, margin: [0, 0, 0, 10] as [number, number, number, number] },
  ];

  // ── Resumen Financiero ──
  content.push({ text: "RESUMEN FINANCIERO", style: "sectionTitle" });
  const totalIngresos = data.ventas.total + (data.pedidos?.total ?? 0);
  const totalEgresos = data.gastos.total + (data.adelantos?.total ?? 0) + (data.devoluciones?.total ?? 0);
  content.push({
    table: {
      widths: ["*", "*", "*"],
      body: [
        [
          { text: "INGRESOS", bold: true, fillColor: "#E8F5E9", color: "#2E7D32", alignment: "center" as const, fontSize: 10 },
          { text: "EGRESOS", bold: true, fillColor: "#FFEBEE", color: "#C62828", alignment: "center" as const, fontSize: 10 },
          { text: "NETO", bold: true, fillColor: "#E3F2FD", color: "#1565C0", alignment: "center" as const, fontSize: 10 },
        ],
        [
          { text: `$${formatNumber(totalIngresos)}`, bold: true, alignment: "center" as const, fontSize: 14, color: "#2E7D32" },
          { text: `$${formatNumber(totalEgresos)}`, bold: true, alignment: "center" as const, fontSize: 14, color: "#C62828" },
          { text: `$${formatNumber(neto)}`, bold: true, alignment: "center" as const, fontSize: 14, color: neto >= 0 ? "#1565C0" : "#C62828" },
        ],
      ],
    },
    margin: [0, 0, 0, 10] as [number, number, number, number],
  });

  // ── Desglose ──
  content.push({ text: "DESGLOSE", style: "sectionTitle" });
  const rows: any[][] = [];
  rows.push([
    { text: "Concepto", bold: true, fillColor: "#C97B4A", color: "#ffffff", fontSize: 9 },
    { text: "Efectivo", bold: true, fillColor: "#C97B4A", color: "#ffffff", fontSize: 9, alignment: "right" as const },
    { text: "Transferencia", bold: true, fillColor: "#C97B4A", color: "#ffffff", fontSize: 9, alignment: "right" as const },
    { text: "Total", bold: true, fillColor: "#C97B4A", color: "#ffffff", fontSize: 9, alignment: "right" as const },
  ]);
  const addRow = (label: string, ef: number, tr: number, tot: number, bold = false) => {
    rows.push([
      { text: label, bold, fontSize: 9 },
      { text: `$${formatNumber(ef)}`, fontSize: 9, alignment: "right" as const },
      { text: `$${formatNumber(tr)}`, fontSize: 9, alignment: "right" as const },
      { text: `$${formatNumber(tot)}`, bold, fontSize: 9, alignment: "right" as const },
    ]);
  };
  addRow("Ventas", data.ventas.efectivo, data.ventas.transferencia, data.ventas.total);
  if (data.pedidos && data.pedidos.total > 0) addRow("Pedidos (Anticipos)", data.pedidos.efectivo, data.pedidos.transferencia, data.pedidos.total);
  addRow("Gastos (Caja)", data.gastos.caja, 0, data.gastos.caja, true);
  if (data.gastos.pedidos > 0) addRow("Gastos (Pedidos)", data.gastos.pedidos, 0, data.gastos.pedidos, true);
  if (data.adelantos && data.adelantos.total > 0) addRow("Adelantos", data.adelantos.efectivo, data.adelantos.transferencia, data.adelantos.total, true);
  if (data.devoluciones && data.devoluciones.total > 0) addRow("Devoluciones", data.devoluciones.efectivo, data.devoluciones.transferencia, data.devoluciones.total, true);

  content.push({ table: { widths: ["*", "auto", "auto", "auto"], body: rows }, layout: "lightHorizontalLines", margin: [0, 0, 0, 10] as [number, number, number, number] });
  content.push({ text: `Generado: ${timestamp}`, fontSize: 8, color: "#888888" });

  const docDefinition: any = {
    content,
    styles: {
      header: { fontSize: 18, bold: true, color: "#C97B4A", margin: [0, 0, 0, 5] as [number, number, number, number] },
      subheader: { fontSize: 14, bold: true, margin: [0, 0, 0, 5] as [number, number, number, number] },
      sectionTitle: { fontSize: 11, bold: true, margin: [0, 0, 0, 5] as [number, number, number, number], color: "#C97B4A" },
    },
    defaultStyle: { fontSize: 10 },
    pageSize: "A4", pageOrientation: "portrait" as const,
    footer: (currentPage: number, pageCount: number) => ({
      text: `Página ${currentPage} de ${pageCount}  |  Sweet Bakery — Reporte por Rango`,
      alignment: "center" as const, fontSize: 8, color: "#888888", margin: [0, 10, 0, 0] as [number, number, number, number],
    }),
  };
  pdfMake.createPdf(docDefinition).download(`Reporte_Rango_${data.fechaInicio}_a_${data.fechaFin}.pdf`);
}

// ── PDF: Historial de Cierres ─────────────────────────

export interface DatosCierresHistorial {
  fechaInicio: string;
  fechaFin: string;
  cierres: Array<{
    fechaApertura: string;
    cajeroNombre: string;
    ventasEfectivo: number;
    ventasTransferencia: number;
    pedidosEfectivo: number;
    pedidosTransferencia: number;
    gastosCaja: number;
    adelantosEfectivo: number;
    adelantosTransferencia: number;
    devolucionesAnticipoEfectivo?: number;
    efectivoEsperado: number;
    efectivoContado?: number;
    diferenciaEfectivo?: number;
    tieneDiferenciaStock: boolean;
    estadoRevision: string;
  }>;
  totales: {
    ventasEfectivo: number; ventasTransferencia: number;
    pedidosEfectivo: number; pedidosTransferencia: number;
    gastosCaja: number;
    adelantosEfectivo: number; adelantosTransferencia: number;
    devolucionesAnticipoEfectivo?: number;
    efectivoEsperado: number; efectivoContado: number; diferenciaEfectivo: number;
  };
}

export async function generarPdfCierresHistorial(data: DatosCierresHistorial): Promise<void> {
  const pdfMakeModule = await import("pdfmake/build/pdfmake");
  const pdfMake: any = pdfMakeModule.default || pdfMakeModule;
  const pdfFontsModule = await import("pdfmake/build/vfs_fonts");
  const pdfFonts: any = pdfFontsModule.default || pdfFontsModule;
  pdfMake.vfs = pdfFonts.pdfMake ? pdfFonts.pdfMake.vfs : pdfFonts.vfs;

  const now = new Date();
  const timestamp = now.toLocaleString("es-EC", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });

  const content: any[] = [
    { text: "Sweet Bakery", style: "header" },
    { text: "Historial de Cierres de Caja", style: "subheader" },
    { text: `Desde: ${data.fechaInicio}  |  Hasta: ${data.fechaFin}`, fontSize: 9, margin: [0, 0, 0, 10] as [number, number, number, number] },
  ];

  // ── Resumen General ──
  content.push({ text: "RESUMEN GENERAL", style: "sectionTitle" });
  const totalNeto = data.totales.ventasEfectivo + data.totales.ventasTransferencia + data.totales.pedidosEfectivo + data.totales.pedidosTransferencia - data.totales.gastosCaja - data.totales.adelantosEfectivo - data.totales.adelantosTransferencia - (data.totales.devolucionesAnticipoEfectivo ?? 0);
  content.push({
    table: {
      widths: ["*", "*", "*"],
      body: [
        [
          { text: "TOTAL INGRESOS", bold: true, fillColor: "#E8F5E9", color: "#2E7D32", alignment: "center" as const, fontSize: 9 },
          { text: "TOTAL EGRESOS", bold: true, fillColor: "#FFEBEE", color: "#C62828", alignment: "center" as const, fontSize: 9 },
          { text: "NETO", bold: true, fillColor: "#E3F2FD", color: "#1565C0", alignment: "center" as const, fontSize: 9 },
        ],
        [
          { text: `$${formatNumber(data.totales.ventasEfectivo + data.totales.ventasTransferencia + data.totales.pedidosEfectivo + data.totales.pedidosTransferencia)}`, bold: true, alignment: "center" as const, fontSize: 12, color: "#2E7D32" },
          { text: `$${formatNumber(data.totales.gastosCaja + data.totales.adelantosEfectivo + data.totales.adelantosTransferencia + (data.totales.devolucionesAnticipoEfectivo ?? 0))}`, bold: true, alignment: "center" as const, fontSize: 12, color: "#C62828" },
          { text: `$${formatNumber(totalNeto)}`, bold: true, alignment: "center" as const, fontSize: 12, color: totalNeto >= 0 ? "#1565C0" : "#C62828" },
        ],
      ],
    },
    margin: [0, 0, 0, 10] as [number, number, number, number],
  });

  // ── Detalle por Cierre ──
  content.push({ text: "DETALLE POR CIERRE", style: "sectionTitle" });

  for (const c of data.cierres) {
    content.push({
      text: `${c.fechaApertura}  —  Cajero: ${c.cajeroNombre}`,
      bold: true, fontSize: 9, margin: [0, 5, 0, 3] as [number, number, number, number],
    });

    const rows: any[][] = [
      [
        { text: "Concepto", bold: true, fillColor: "#C97B4A", color: "#ffffff", fontSize: 8 },
        { text: "Efectivo", bold: true, fillColor: "#C97B4A", color: "#ffffff", fontSize: 8, alignment: "right" as const },
        { text: "Transferencia", bold: true, fillColor: "#C97B4A", color: "#ffffff", fontSize: 8, alignment: "right" as const },
      ],
      [{ text: "Ventas", fontSize: 8 }, { text: `$${formatNumber(c.ventasEfectivo)}`, fontSize: 8, alignment: "right" as const }, { text: `$${formatNumber(c.ventasTransferencia)}`, fontSize: 8, alignment: "right" as const }],
      [{ text: "Pedidos", fontSize: 8 }, { text: `$${formatNumber(c.pedidosEfectivo)}`, fontSize: 8, alignment: "right" as const }, { text: `$${formatNumber(c.pedidosTransferencia)}`, fontSize: 8, alignment: "right" as const }],
      [{ text: "Gastos", bold: true, fontSize: 8 }, { text: `-$${formatNumber(c.gastosCaja)}`, fontSize: 8, alignment: "right" as const, color: "#C62828" }, { text: "", fontSize: 8 }],
      [{ text: "Adelantos", fontSize: 8 }, { text: `-$${formatNumber(c.adelantosEfectivo)}`, fontSize: 8, alignment: "right" as const, color: "#C62828" }, { text: `-$${formatNumber(c.adelantosTransferencia)}`, fontSize: 8, alignment: "right" as const, color: "#C62828" }],
      [{ text: "Diferencia", bold: true, fontSize: 8 }, { text: c.diferenciaEfectivo != null ? `$${formatNumber(c.diferenciaEfectivo)}` : "-", fontSize: 8, alignment: "right" as const, color: (c.diferenciaEfectivo ?? 0) !== 0 ? "#C62828" : "#2E7D32" }, { text: c.tieneDiferenciaStock ? "Dif. Stock" : "", fontSize: 8, alignment: "right" as const, color: "#C62828" }],
    ];

    content.push({
      table: { widths: ["*", "auto", "auto"], body: rows },
      layout: "lightHorizontalLines",
      margin: [0, 0, 0, 8] as [number, number, number, number],
    });
  }

  content.push({ text: `Generado: ${timestamp}`, fontSize: 8, color: "#888888" });

  const docDefinition: any = {
    content,
    styles: {
      header: { fontSize: 18, bold: true, color: "#C97B4A", margin: [0, 0, 0, 5] as [number, number, number, number] },
      subheader: { fontSize: 14, bold: true, margin: [0, 0, 0, 5] as [number, number, number, number] },
      sectionTitle: { fontSize: 11, bold: true, margin: [0, 0, 0, 5] as [number, number, number, number], color: "#C97B4A" },
    },
    defaultStyle: { fontSize: 10 },
    pageSize: "A4", pageOrientation: "landscape" as const,
    footer: (currentPage: number, pageCount: number) => ({
      text: `Página ${currentPage} de ${pageCount}  |  Sweet Bakery — Historial de Cierres`,
      alignment: "center" as const, fontSize: 8, color: "#888888", margin: [0, 10, 0, 0] as [number, number, number, number],
    }),
  };
  pdfMake.createPdf(docDefinition).download(`Cierres_${data.fechaInicio}_a_${data.fechaFin}.pdf`);
}

// ── PDF: Productos Más Vendidos ────────────────────────

export interface DatosProductosTop {
  productos: Array<{ nombre: string; cantidad: number }>;
  fechaInicio?: string;
  fechaFin?: string;
}

export async function generarPdfProductosTop(data: DatosProductosTop): Promise<void> {
  const pdfMakeModule = await import("pdfmake/build/pdfmake");
  const pdfMake: any = pdfMakeModule.default || pdfMakeModule;
  const pdfFontsModule = await import("pdfmake/build/vfs_fonts");
  const pdfFonts: any = pdfFontsModule.default || pdfFontsModule;
  pdfMake.vfs = pdfFonts.pdfMake ? pdfFonts.pdfMake.vfs : pdfFonts.vfs;

  const now = new Date();
  const timestamp = now.toLocaleString("es-EC", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });

  const content: any[] = [
    { text: "Sweet Bakery", style: "header" },
    { text: "Productos Más Vendidos", style: "subheader" },
  ];

  if (data.fechaInicio && data.fechaFin) {
    content.push({ text: `Desde: ${data.fechaInicio}  |  Hasta: ${data.fechaFin}`, fontSize: 9, margin: [0, 0, 0, 10] as [number, number, number, number] });
  } else {
    content.push({ text: "", margin: [0, 0, 0, 5] as [number, number, number, number] });
  }

  // ── Ranking ──
  content.push({ text: "RANKING DE PRODUCTOS", style: "sectionTitle" });

  const rows: any[][] = [
    [
      { text: "#", bold: true, fillColor: "#C97B4A", color: "#ffffff", fontSize: 9, alignment: "center" as const },
      { text: "Producto", bold: true, fillColor: "#C97B4A", color: "#ffffff", fontSize: 9 },
      { text: "Unidades Vendidas", bold: true, fillColor: "#C97B4A", color: "#ffffff", fontSize: 9, alignment: "right" as const },
    ],
  ];

  let totalUnidades = 0;
  data.productos.forEach((p, i) => {
    totalUnidades += p.cantidad;
    rows.push([
      { text: `${i + 1}`, fontSize: 9, alignment: "center" as const },
      { text: p.nombre, fontSize: 9 },
      { text: String(p.cantidad), bold: true, fontSize: 9, alignment: "right" as const },
    ]);
  });

  rows.push([
    { text: "TOTAL", bold: true, fontSize: 9, fillColor: "#F5F5F5" },
    { text: "", fontSize: 9, fillColor: "#F5F5F5" },
    { text: String(totalUnidades), bold: true, fontSize: 9, alignment: "right" as const, fillColor: "#F5F5F5" },
  ]);

  content.push({
    table: { widths: ["auto", "*", "auto"], body: rows },
    layout: "lightHorizontalLines",
    margin: [0, 0, 0, 10] as [number, number, number, number],
  });

  content.push({ text: `Generado: ${timestamp}`, fontSize: 8, color: "#888888" });

  const docDefinition: any = {
    content,
    styles: {
      header: { fontSize: 18, bold: true, color: "#C97B4A", margin: [0, 0, 0, 5] as [number, number, number, number] },
      subheader: { fontSize: 14, bold: true, margin: [0, 0, 0, 5] as [number, number, number, number] },
      sectionTitle: { fontSize: 11, bold: true, margin: [0, 0, 0, 5] as [number, number, number, number], color: "#C97B4A" },
    },
    defaultStyle: { fontSize: 10 },
    pageSize: "A4", pageOrientation: "portrait" as const,
    footer: (currentPage: number, pageCount: number) => ({
      text: `Página ${currentPage} de ${pageCount}  |  Sweet Bakery — Productos Más Vendidos`,
      alignment: "center" as const, fontSize: 8, color: "#888888", margin: [0, 10, 0, 0] as [number, number, number, number],
    }),
  };
  pdfMake.createPdf(docDefinition).download(`Productos_Top_${now.toISOString().slice(0, 10)}.pdf`);
}
