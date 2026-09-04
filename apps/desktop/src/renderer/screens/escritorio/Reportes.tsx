import { useState, useEffect } from "react";
import {
  formatearReporteDiario,
  formatearReporteRango,
  formatearReportePedidos,
  formatearReporteProductos,
  formatearReporteCierres,
  generarCsv,
  generarPdfDiario,
  generarPdfRango,
  generarPdfPedidos,
  generarPdfCierresHistorial,
  generarPdfProductosTop,
  formatearFecha,
} from "@pos/shared";
import { Search } from "lucide-react";

interface ResumenDiario {
  fecha: string;
  ventas: { efectivo: number; transferencia: number; total: number };
  pedidos: { efectivo: number; transferencia: number; total: number };
  gastos: {
    caja: number; pedidos: number; total: number;
    porCategoria: Array<{
      categoriaId: number;
      categoriaNombre: string;
      total: number;
      cantidad: number;
    }>;
  };
  adelantos: { efectivo: number; transferencia: number; total: number };
  devoluciones: { efectivo: number; transferencia: number; total: number };
  multas: number;
  consolidado: {
    ingresosBrutos: number;
    egresosTotales: number;
    ingresoNeto: number;
  };
}

interface PedidoPendiente {
  id: number;
  cliente: string;
  fechaEntrega: string;
  estado: string;
  totalEstimado: number;
  saldoPendiente: number;
  notas: string | null;
  descripcion: string | null;
}

interface ProductoMasVendido {
  productoId: number;
  nombre: string;
  cantidad: number;
}

export default function Reportes() {
  const [fechaSeleccionada, setFechaSeleccionada] = useState(
    formatearFecha(new Date())
  );
  const [fechaInicio, setFechaInicio] = useState(
    formatearFecha(new Date())
  );
  const [fechaFin, setFechaFin] = useState(
    formatearFecha(new Date())
  );
  const [resumenDiario, setResumenDiario] = useState<ResumenDiario | null>(null);
  const [resumenRango, setResumenRango] = useState<ResumenDiario | null>(null);
  const [pedidosPendientes, setPedidosPendientes] = useState<PedidoPendiente[]>([]);
  const [productosMasVendidos, setProductosMasVendidos] = useState<ProductoMasVendido[]>([]);
  const [cierres, setCierres] = useState<any>(null);
  const [filtroCajero, setFiltroCajero] = useState<string>("todos");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"diario" | "rango" | "cierres" | "pedidos" | "productos">("diario");

  useEffect(() => {
    cargarReporteDiario();
  }, [fechaSeleccionada]);

  const cargarReporteDiario = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await window.pos.reportes.reporteDiario(fechaSeleccionada);
      setResumenDiario(data);
    } catch (err) {
      console.error("Error al cargar reporte:", err);
      setError("Error al cargar reporte diario");
    } finally {
      setLoading(false);
    }
  };

  const cargarReporteRango = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await window.pos.reportes.reportePorFechas(fechaInicio, fechaFin);
      setResumenRango(data as any);
    } catch (err) {
      console.error("Error al cargar reporte:", err);
      setError("Error al cargar reporte por rango");
    } finally {
      setLoading(false);
    }
  };

  const cargarPedidosPendientes = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await window.pos.reportes.reportePedidosPendientes();
      setPedidosPendientes(data);
    } catch (err) {
      console.error("Error al cargar pedidos:", err);
      setError("Error al cargar pedidos pendientes");
    } finally {
      setLoading(false);
    }
  };

  const cargarProductosMasVendidos = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await window.pos.reportes.reporteProductosMasVendidos(
        fechaInicio,
        fechaFin
      );
      setProductosMasVendidos(data);
    } catch (err) {
      console.error("Error al cargar productos:", err);
      setError("Error al cargar productos más vendidos");
    } finally {
      setLoading(false);
    }
  };

  const cargarCierres = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await window.pos.reportes.listarCierresPorRango(fechaInicio, fechaFin);
      setCierres(data);
      setFiltroCajero("todos");
    } catch (err) {
      console.error("Error al cargar cierres:", err);
      setError("Error al cargar historial de cierres");
    } finally {
      setLoading(false);
    }
  };

  const cierresFiltrados = cierres
    ? {
        ...cierres,
        cierres: filtroCajero === "todos"
          ? cierres.cierres
          : cierres.cierres.filter((c: any) => c.cajeroNombre === filtroCajero),
      }
    : null;

  const cajerosUnicos = cierres
    ? [...new Set(cierres.cierres.map((c: any) => c.cajeroNombre).filter(Boolean))]
    : [];

  const descargarCsv = (contenido: string, nombreArchivo: string) => {
    const blob = new Blob([contenido], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = nombreArchivo;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportarDiario = () => {
    if (!resumenDiario) return;
    const datos = formatearReporteDiario(resumenDiario);
    const csv = generarCsv(datos);
    descargarCsv(csv, `reporte-diario-${fechaSeleccionada}.csv`);
  };

  const exportarRango = () => {
    if (!resumenRango) return;
    const datos = formatearReporteRango(resumenRango);
    const csv = generarCsv(datos);
    descargarCsv(csv, `reporte-rango-${fechaInicio}-${fechaFin}.csv`);
  };

  const exportarPedidos = () => {
    if (pedidosPendientes.length === 0) return;
    const datos = formatearReportePedidos(pedidosPendientes);
    const csv = generarCsv(datos);
    descargarCsv(csv, `pedidos-pendientes.csv`);
  };

  const exportarProductos = () => {
    if (productosMasVendidos.length === 0) return;
    const datos = formatearReporteProductos(productosMasVendidos);
    const csv = generarCsv(datos);
    descargarCsv(csv, `productos-top-${fechaInicio}-${fechaFin}.csv`);
  };

  const exportarCierres = () => {
    if (!cierresFiltrados) return;
    const datos = formatearReporteCierres(cierresFiltrados);
    const csv = generarCsv(datos);
    descargarCsv(csv, `cierres-${fechaInicio}-${fechaFin}.csv`);
  };

  const exportarPdfDiario = async () => {
    if (!resumenDiario) return;
    try {
      await generarPdfDiario(resumenDiario);
    } catch (err) {
      console.error("Error al generar PDF diario:", err);
    }
  };

  const exportarPdfRango = async () => {
    if (!resumenRango) return;
    try {
      await generarPdfRango(resumenRango);
    } catch (err) {
      console.error("Error al generar PDF rango:", err);
    }
  };

  const exportarPdfCierres = async () => {
    if (!cierresFiltrados) return;
    try {
      await generarPdfCierresHistorial(cierresFiltrados);
    } catch (err) {
      console.error("Error al generar PDF cierres:", err);
    }
  };

  const exportarPdfPedidos = async () => {
    if (pedidosPendientes.length === 0) return;
    try {
      await generarPdfPedidos({
        pedidos: pedidosPendientes.map(p => ({
          id: p.id,
          cliente: p.cliente,
          fechaEntrega: p.fechaEntrega,
          estado: p.estado,
          descripcion: p.descripcion,
          notas: p.notas,
          totalEstimado: p.totalEstimado,
          saldoPendiente: p.saldoPendiente,
        })),
      });
    } catch (err) {
      console.error("Error al generar PDF pedidos:", err);
    }
  };

  const exportarPdfProductos = async () => {
    if (productosMasVendidos.length === 0) return;
    try {
      await generarPdfProductosTop({ productos: productosMasVendidos, fechaInicio, fechaFin });
    } catch (err) {
      console.error("Error al generar PDF productos:", err);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className=" text-headline-lg  font-bold text-on-surface">Reportes</h1>
        <p className="text-on-surface-variant">Análisis de ventas y operaciones</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab("diario")}
          className={`px-4 py-2 rounded-xl transition-colors ${
            activeTab === "diario"
              ? "bg-secondary text-on-secondary"
              : "bg-surface-container text-on-surface-variant"
          }`}
        >
          Diario
        </button>
        <button
          onClick={() => setActiveTab("rango")}
          className={`px-4 py-2 rounded-xl transition-colors ${
            activeTab === "rango"
              ? "bg-secondary text-on-secondary"
              : "bg-surface-container text-on-surface-variant"
          }`}
        >
          Por Rango
        </button>
        <button
          onClick={() => {
            setActiveTab("cierres");
            cargarCierres();
          }}
          className={`px-4 py-2 rounded-xl transition-colors ${
            activeTab === "cierres"
              ? "bg-secondary text-on-secondary"
              : "bg-surface-container text-on-surface-variant"
          }`}
        >
          Cierres Histórico
        </button>
        <button
          onClick={() => {
            setActiveTab("pedidos");
            cargarPedidosPendientes();
          }}
          className={`px-4 py-2 rounded-xl transition-colors ${
            activeTab === "pedidos"
              ? "bg-secondary text-on-secondary"
              : "bg-surface-container text-on-surface-variant"
          }`}
        >
          Pedidos Pendientes
        </button>
        <button
          onClick={() => {
            setActiveTab("productos");
            cargarProductosMasVendidos();
          }}
          className={`px-4 py-2 rounded-xl transition-colors ${
            activeTab === "productos"
              ? "bg-secondary text-on-secondary"
              : "bg-surface-container text-on-surface-variant"
          }`}
        >
          Productos Top
        </button>
      </div>

      {loading && (
        <div className="text-center py-12">
          <div className="text-on-surface-variant">Cargando...</div>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-error-container text-on-error-container rounded-xl text-center">
          {error}
        </div>
      )}

      {/* Reporte Diario */}
      {activeTab === "diario" && !loading && (
        <div>
          <div className="flex items-end gap-4 mb-6">
            <div>
              <label className="block text-sm text-on-surface-variant mb-2">
                Seleccionar fecha
              </label>
              <input
                type="date"
                value={fechaSeleccionada}
                onChange={(e) => setFechaSeleccionada(e.target.value)}
                className="px-4 py-2 border border-outline-variant rounded-xl focus:outline-none focus:border-secondary bg-surface-container-lowest"
              />
            </div>
            <button
              onClick={exportarDiario}
              disabled={!resumenDiario}
              className="px-4 py-2 bg-tertiary text-on-tertiary rounded-xl hover:bg-tertiary/90 disabled:opacity-50 transition-colors"
            >
              Descargar CSV
            </button>
            <button
              onClick={() => exportarPdfDiario()}
              disabled={!resumenDiario}
              className="px-4 py-2 bg-primary text-on-primary rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              Descargar PDF
            </button>
          </div>

          {resumenDiario && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant hover:shadow-md transition-shadow">
                <h3 className="text-label-md text-on-surface-variant mb-2">Ventas</h3>
                <p className="text-3xl font-bold text-on-surface">
                  ${resumenDiario.ventas.total.toFixed(2)}
                </p>
                <div className="mt-2 text-sm text-on-surface-variant">
                  <p>Efectivo: ${resumenDiario.ventas.efectivo.toFixed(2)}</p>
                  <p>Transferencia: ${resumenDiario.ventas.transferencia.toFixed(2)}</p>
                </div>
              </div>

              <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant hover:shadow-md transition-shadow">
                <h3 className="text-label-md text-on-surface-variant mb-2">Gastos</h3>
                <p className="text-3xl font-bold text-error">
                  ${resumenDiario.gastos.total.toFixed(2)}
                </p>
                <div className="mt-2 text-sm text-on-surface-variant">
                  <p>Caja: ${resumenDiario.gastos.caja.toFixed(2)}</p>
                  <p>Pedidos: ${resumenDiario.gastos.pedidos.toFixed(2)}</p>
                </div>
                {resumenDiario.gastos.porCategoria && resumenDiario.gastos.porCategoria.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-outline-variant">
                    <p className="text-caption font-medium text-on-surface-variant mb-1">Por categoría:</p>
                    {resumenDiario.gastos.porCategoria.map((cat) => (
                      <div key={cat.categoriaId} className="flex justify-between text-caption text-on-surface-variant">
                        <span>{cat.categoriaNombre} ({cat.cantidad})</span>
                        <span>${cat.total.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant hover:shadow-md transition-shadow">
                <h3 className="text-label-md text-on-surface-variant mb-2">Adelantos</h3>
                <p className="text-3xl font-bold text-error">
                  ${resumenDiario.adelantos.total.toFixed(2)}
                </p>
              </div>

              <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant hover:shadow-md transition-shadow">
                <h3 className="text-label-md text-on-surface-variant mb-2">Ingreso Neto</h3>
                <p
                  className={`text-3xl font-bold ${
                    resumenDiario.consolidado.ingresoNeto >= 0
                      ? "text-tertiary"
                      : "text-error"
                  }`}
                >
                  ${resumenDiario.consolidado.ingresoNeto.toFixed(2)}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Reporte por Rango */}
      {activeTab === "rango" && !loading && (
        <div>
          <div className="flex items-end gap-4 mb-6">
            <div>
              <label className="block text-sm text-on-surface-variant mb-2">
                Fecha inicio
              </label>
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="px-4 py-2 border border-outline-variant rounded-xl focus:outline-none focus:border-secondary bg-surface-container-lowest"
              />
            </div>
            <div>
              <label className="block text-sm text-on-surface-variant mb-2">
                Fecha fin
              </label>
              <input
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                className="px-4 py-2 border border-outline-variant rounded-xl focus:outline-none focus:border-secondary bg-surface-container-lowest"
              />
            </div>
            <button
              onClick={cargarReporteRango}
              className="px-4 py-2 bg-secondary text-on-secondary rounded-xl hover:bg-secondary/90 transition-colors"
            >
              Generar
            </button>
            <button
              onClick={exportarRango}
              disabled={!resumenRango}
              className="px-4 py-2 bg-tertiary text-on-tertiary rounded-xl hover:bg-tertiary/90 disabled:opacity-50 transition-colors"
            >
              Descargar CSV
            </button>
            <button
              onClick={() => exportarPdfRango()}
              disabled={!resumenRango}
              className="px-4 py-2 bg-primary text-on-primary rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              Descargar PDF
            </button>
          </div>

          {resumenRango && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant hover:shadow-md transition-shadow">
                <h3 className="text-label-md text-on-surface-variant mb-2">Total Ventas</h3>
                <p className="text-3xl font-bold text-on-surface">
                  ${resumenRango.ventas.total.toFixed(2)}
                </p>
              </div>

              <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant hover:shadow-md transition-shadow">
                <h3 className="text-label-md text-on-surface-variant mb-2">Pedidos (Anticipos)</h3>
                <p className="text-3xl font-bold text-on-surface">
                  ${resumenRango.pedidos?.total?.toFixed(2) ?? "0.00"}
                </p>
              </div>

              <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant hover:shadow-md transition-shadow">
                <h3 className="text-label-md text-on-surface-variant mb-2">Total Gastos</h3>
                <p className="text-3xl font-bold text-error">
                  ${resumenRango.gastos.total.toFixed(2)}
                </p>
              </div>

              <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant hover:shadow-md transition-shadow">
                <h3 className="text-label-md text-on-surface-variant mb-2">Adelantos</h3>
                <p className="text-3xl font-bold text-on-surface">
                  ${resumenRango.adelantos?.total?.toFixed(2) ?? "0.00"}
                </p>
              </div>

              <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant hover:shadow-md transition-shadow">
                <h3 className="text-label-md text-on-surface-variant mb-2">Ingreso Neto</h3>
                <p
                  className={`text-3xl font-bold ${
                    resumenRango.consolidado.ingresoNeto >= 0
                      ? "text-tertiary"
                      : "text-error"
                  }`}
                >
                  ${resumenRango.consolidado.ingresoNeto.toFixed(2)}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Cierres Histórico */}
      {activeTab === "cierres" && !loading && (
        <div>
          <div className="flex items-end gap-4 mb-4">
            <div>
              <label className="block text-sm text-on-surface-variant mb-2">
                Fecha inicio
              </label>
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="px-4 py-2 border border-outline-variant rounded-xl focus:outline-none focus:border-secondary bg-surface-container-lowest"
              />
            </div>
            <div>
              <label className="block text-sm text-on-surface-variant mb-2">
                Fecha fin
              </label>
              <input
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                className="px-4 py-2 border border-outline-variant rounded-xl focus:outline-none focus:border-secondary bg-surface-container-lowest"
              />
            </div>
            {cajerosUnicos.length > 1 && (
              <div>
                <label className="block text-sm text-on-surface-variant mb-2">
                  Cajero
                </label>
                <select
                  value={filtroCajero}
                  onChange={(e) => setFiltroCajero(e.target.value)}
                  className="px-4 py-2 border border-outline-variant rounded-xl focus:outline-none focus:border-secondary bg-surface-container-lowest"
                >
                  <option value="todos">Todos</option>
                  {cajerosUnicos.map((nombre) => (
                    <option key={nombre} value={nombre}>{nombre}</option>
                  ))}
                </select>
              </div>
            )}
            <button
              onClick={cargarCierres}
              className="px-4 py-2 bg-secondary text-on-secondary rounded-xl hover:bg-secondary/90 transition-colors"
            >
              Generar
            </button>
            <button
              onClick={exportarCierres}
              disabled={!cierresFiltrados}
              className="px-4 py-2 bg-tertiary text-on-tertiary rounded-xl hover:bg-tertiary/90 disabled:opacity-50 transition-colors"
            >
              Descargar CSV
            </button>
            <button
              onClick={() => exportarPdfCierres()}
              disabled={!cierresFiltrados}
              className="px-4 py-2 bg-primary text-on-primary rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              Descargar PDF
            </button>
          </div>

          {cierresFiltrados && (
            <>
              {/* Totales del rango */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-surface-container-lowest rounded-xl p-4 shadow-sm border border-outline-variant">
                  <p className="text-label-md text-on-surface-variant">Ventas Totales</p>
                  <p className="text-xl font-bold text-on-surface">
                    ${(cierresFiltrados.totales.ventasEfectivo + cierresFiltrados.totales.ventasTransferencia).toFixed(2)}
                  </p>
                </div>
                <div className="bg-surface-container-lowest rounded-xl p-4 shadow-sm border border-outline-variant">
                  <p className="text-label-md text-on-surface-variant">Gastos</p>
                  <p className="text-xl font-bold text-error">
                    ${cierresFiltrados.totales.gastosCaja.toFixed(2)}
                  </p>
                </div>
                <div className="bg-surface-container-lowest rounded-xl p-4 shadow-sm border border-outline-variant">
                  <p className="text-label-md text-on-surface-variant">Efectivo Esperado</p>
                  <p className="text-xl font-bold text-on-surface">
                    ${cierresFiltrados.totales.efectivoEsperado.toFixed(2)}
                  </p>
                </div>
                <div className="bg-surface-container-lowest rounded-xl p-4 shadow-sm border border-outline-variant">
                  <p className="text-label-md text-on-surface-variant">Diferencia Total</p>
                  <p className={`text-xl font-bold ${cierresFiltrados.totales.diferenciaEfectivo !== 0 ? "text-error" : "text-tertiary"}`}>
                    ${cierresFiltrados.totales.diferenciaEfectivo.toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Tabla de cierres */}
              <div className="bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant overflow-x-auto hover:shadow-md transition-shadow">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-outline-variant">
                      <th className="text-left p-4 text-on-surface-variant font-medium">Fecha</th>
                      <th className="text-left p-4 text-on-surface-variant font-medium">Cajero</th>
                      <th className="text-right p-4 text-on-surface-variant font-medium">Ventas</th>
                      <th className="text-right p-4 text-on-surface-variant font-medium">Pedidos</th>
                      <th className="text-right p-4 text-on-surface-variant font-medium">Gastos</th>
                      <th className="text-right p-4 text-on-surface-variant font-medium">Devoluciones</th>
                      <th className="text-right p-4 text-on-surface-variant font-medium">Esperado</th>
                      <th className="text-right p-4 text-on-surface-variant font-medium">Contado</th>
                      <th className="text-right p-4 text-on-surface-variant font-medium">Diferencia</th>
                      <th className="text-center p-4 text-on-surface-variant font-medium">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cierresFiltrados.cierres.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="p-8 text-center">
                          <Search className="w-10 h-10 mx-auto mb-2 text-on-surface-variant/40" />
                          <p className="text-on-surface-variant">
                            No hay cierres en el rango seleccionado
                          </p>
                        </td>
                      </tr>
                    ) : (
                      cierresFiltrados.cierres.map((c: any) => (
                        <tr key={c.id} className="border-b border-outline-variant/50">
                          <td className="p-3 text-sm text-on-surface">{c.fechaApertura}</td>
                          <td className="p-3 text-sm text-on-surface">{c.cajeroNombre}</td>
                          <td className="p-3 text-sm text-right text-on-surface">
                            ${(c.ventasEfectivo + c.ventasTransferencia).toFixed(2)}
                          </td>
                          <td className="p-3 text-sm text-right text-on-surface">
                            ${(c.pedidosEfectivo + c.pedidosTransferencia).toFixed(2)}
                          </td>
                          <td className="p-3 text-sm text-right text-error">
                            ${c.gastosCaja.toFixed(2)}
                          </td>
                          <td className="p-3 text-sm text-right text-on-surface-variant">
                            ${(c.devolucionesAnticipoEfectivo ?? 0).toFixed(2)}
                          </td>
                          <td className="p-3 text-sm text-right text-on-surface">
                            ${c.efectivoEsperado.toFixed(2)}
                          </td>
                          <td className="p-3 text-sm text-right text-on-surface">
                            {c.efectivoContado != null ? `$${c.efectivoContado.toFixed(2)}` : "-"}
                          </td>
                          <td className={`p-3 text-sm text-right font-medium ${
                            (c.diferenciaEfectivo ?? 0) !== 0 ? "text-error" : "text-tertiary"
                          }`}>
                            {c.diferenciaEfectivo != null ? `$${c.diferenciaEfectivo.toFixed(2)}` : "-"}
                          </td>
                          <td className="p-3 text-center">
                            <span className={`text-caption px-2 py-1 rounded-full ${
                              c.estadoRevision === "revisada"
                                ? "bg-tertiary/20 text-tertiary"
                                : "bg-surface-container-high text-on-surface-variant"
                            }`}>
                              {c.estadoRevision}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* Pedidos Pendientes */}
      {activeTab === "pedidos" && !loading && (
        <div>
          <div className="flex justify-end gap-2 mb-4">
            <button
              onClick={exportarPedidos}
              disabled={pedidosPendientes.length === 0}
              className="px-4 py-2 bg-tertiary text-on-tertiary rounded-xl hover:bg-tertiary/90 disabled:opacity-50 transition-colors"
            >
              Descargar CSV
            </button>
            <button
              onClick={() => exportarPdfPedidos()}
              disabled={pedidosPendientes.length === 0}
              className="px-4 py-2 bg-primary text-on-primary rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              Descargar PDF
            </button>
          </div>
          <div className="bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant hover:shadow-md transition-shadow">
          <table className="w-full">
            <thead>
              <tr className="border-b border-outline-variant">
                <th className="text-left p-4 text-on-surface-variant font-medium">#</th>
                <th className="text-left p-4 text-on-surface-variant font-medium">
                  Cliente
                </th>
                <th className="text-left p-4 text-on-surface-variant font-medium">
                  Entrega
                </th>
                <th className="text-left p-4 text-on-surface-variant font-medium">
                  Estado
                </th>
                <th className="text-right p-4 text-on-surface-variant font-medium">
                  Total
                </th>
                <th className="text-right p-4 text-on-surface-variant font-medium">
                  Saldo
                </th>
              </tr>
            </thead>
            <tbody>
              {pedidosPendientes.map((pedido) => (
                <tr key={pedido.id} className="border-b border-outline-variant/50">
                  <td className="p-4 text-on-surface">#{pedido.id}</td>
                  <td className="p-4 font-medium text-on-surface">
                    {pedido.cliente}
                  </td>
                  <td className="p-4 text-on-surface">
                    {new Date(pedido.fechaEntrega).toLocaleDateString("es-EC")}
                  </td>
                  <td className="p-4">
                    <span className="px-2 py-1 rounded-full text-caption bg-surface-container text-on-surface">
                      {pedido.estado}
                    </span>
                  </td>
                  <td className="p-4 text-right text-on-surface">
                    ${pedido.totalEstimado.toFixed(2)}
                  </td>
                  <td className="p-4 text-right font-medium text-error">
                    ${pedido.saldoPendiente.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </div>
      )}

      {/* Productos Más Vendidos */}
      {activeTab === "productos" && !loading && (
        <div>
          <div className="flex items-end gap-4 mb-6">
            <div>
              <label className="block text-sm text-on-surface-variant mb-2">
                Fecha inicio
              </label>
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="px-4 py-2 border border-outline-variant rounded-xl focus:outline-none focus:border-secondary bg-surface-container-lowest"
              />
            </div>
            <div>
              <label className="block text-sm text-on-surface-variant mb-2">
                Fecha fin
              </label>
              <input
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                className="px-4 py-2 border border-outline-variant rounded-xl focus:outline-none focus:border-secondary bg-surface-container-lowest"
              />
            </div>
            <button
              onClick={cargarProductosMasVendidos}
              className="px-4 py-2 bg-secondary text-on-secondary rounded-xl hover:bg-secondary/90 transition-colors"
            >
              Generar
            </button>
            <button
              onClick={exportarProductos}
              disabled={productosMasVendidos.length === 0}
              className="px-4 py-2 bg-tertiary text-on-tertiary rounded-xl hover:bg-tertiary/90 disabled:opacity-50 transition-colors"
            >
              Descargar CSV
            </button>
            <button
              onClick={() => exportarPdfProductos()}
              disabled={productosMasVendidos.length === 0}
              className="px-4 py-2 bg-primary text-on-primary rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              Descargar PDF
            </button>
          </div>

          <div className="bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant hover:shadow-md transition-shadow">
            <table className="w-full">
              <thead>
                <tr className="border-b border-outline-variant">
                  <th className="text-left p-4 text-on-surface-variant font-medium">
                    #
                  </th>
                  <th className="text-left p-4 text-on-surface-variant font-medium">
                    Producto
                  </th>
                  <th className="text-right p-4 text-on-surface-variant font-medium">
                    Unidades Vendidas
                  </th>
                </tr>
              </thead>
              <tbody>
                {productosMasVendidos.map((producto, index) => (
                  <tr key={producto.productoId} className="border-b border-outline-variant/50">
                    <td className="p-4 text-on-surface">{index + 1}</td>
                    <td className="p-4 font-medium text-on-surface">
                      {producto.nombre}
                    </td>
                    <td className="p-4 text-right text-on-surface">
                      {producto.cantidad}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
