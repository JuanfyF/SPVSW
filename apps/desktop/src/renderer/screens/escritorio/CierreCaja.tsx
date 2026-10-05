import { useState, useEffect, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/auth";
import ConfirmModal from "../../components/ConfirmModal";
import { generarPdfCierreCaja, type DatosCierreCaja, formatearMoneda } from "@pos/shared";
import {
  Check,
  Download,
  Banknote,
  TrendingUp,
  TrendingDown,
  Scale,
  ShoppingCart,
  Cake,
  ClipboardList,
  Receipt,
  ShoppingBag,
  HandCoins,
  Wallet,
  AlertTriangle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Producto } from "@pos/shared";

interface StockItem {
  productoId: number;
  unidad: string;
  cantidadInicial: number;
  cantidadAgregada: number;
}

interface ResumenCaja {
  ventas: { efectivo: number; transferencia: number; total: number };
  pedidos: { efectivo: number; transferencia: number; total: number };
  anticipos: { efectivo: number; transferencia: number; total: number };
  gastos: { caja: number; pedidos: number; total: number };
  adelantos: { efectivo: number; transferencia: number; total: number };
}

// ── Presentación de montos ─────────────────────────────────────

type TonoMonto = "entra" | "sale" | "neutro";

function colorMonto(tono: TonoMonto): string {
  if (tono === "entra") return "text-on-tertiary-container";
  if (tono === "sale") return "text-error";
  return "text-on-surface";
}

/** Detalle: los ceros se atenúan para que los montos reales destaquen. */
function colorFilaMonto(valor: number, tono: TonoMonto): string {
  return valor === 0 ? "text-on-surface-variant" : colorMonto(tono);
}

interface FilaMontoProps {
  label: string;
  valor: number;
  tono?: TonoMonto;
  icono?: LucideIcon;
}

function FilaMonto({ label, valor, tono = "entra", icono: Icono }: FilaMontoProps) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="flex items-center gap-2 text-label-md text-on-surface-variant min-w-0">
        {Icono ? <Icono className="w-4 h-4 shrink-0" aria-hidden="true" /> : null}
        <span className="truncate">{label}</span>
      </span>
      <span className={`text-body-md font-medium tabular-nums text-right shrink-0 ${colorFilaMonto(valor, tono)}`}>
        {formatearMoneda(valor)}
      </span>
    </div>
  );
}

interface BandaTotalProps {
  label: string;
  valor: number;
  tono?: TonoMonto;
  fuerte?: boolean;
}

/** Subtotal en banda con fondo — jerarquía clara sobre las filas de detalle. */
function BandaTotal({ label, valor, tono = "neutro", fuerte = false }: BandaTotalProps) {
  return (
    <div className="flex items-center justify-between gap-3 bg-surface-container rounded-xl px-3 py-2">
      <span className="text-label-md font-medium text-on-surface">{label}</span>
      <span
        className={`tabular-nums text-right shrink-0 font-bold ${fuerte ? "text-headline-md" : "text-body-lg"} ${colorMonto(tono)}`}
      >
        {formatearMoneda(valor)}
      </span>
    </div>
  );
}

/** Sección agrupadora (eyebrow) dentro de una tarjeta. */
function Seccion({ icono: Icono, titulo, children }: { icono: LucideIcon; titulo: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="flex items-center gap-1.5 text-caption font-semibold uppercase tracking-wider text-on-surface-variant mb-2">
        <Icono className="w-3.5 h-3.5" aria-hidden="true" />
        {titulo}
      </h3>
      <div className="space-y-1.5">{children}</div>
    </section>
  );
}

interface LineaFormulaProps {
  signo: "+" | "−";
  label: string;
  valor: number;
  tono?: TonoMonto;
}

/** Línea de la fórmula de efectivo con marcador (+) / (−) en el gutter. */
function LineaFormula({ signo, label, valor, tono = "entra" }: LineaFormulaProps) {
  return (
    <div className="flex items-baseline gap-2 text-body-md">
      <span className="w-6 shrink-0 text-center font-mono text-on-surface-variant" aria-hidden="true">
        {signo}
      </span>
      <span className="flex-1 min-w-0 truncate text-on-surface-variant">{label}</span>
      <span className={`shrink-0 font-medium tabular-nums ${colorFilaMonto(valor, tono)}`}>
        {formatearMoneda(valor)}
      </span>
    </div>
  );
}

/** Subtotal (=) dentro de la fórmula. */
function LineaFormulaTotal({ label, valor, tono = "neutro" }: { label: string; valor: number; tono?: TonoMonto }) {
  return (
    <div className="flex items-baseline gap-2 border-t border-outline-variant pt-2">
      <span className="w-6 shrink-0 text-center font-mono text-on-surface-variant" aria-hidden="true">
        =
      </span>
      <span className="flex-1 min-w-0 truncate text-label-md font-medium text-on-surface">{label}</span>
      <span className={`shrink-0 text-body-lg font-bold tabular-nums ${colorMonto(tono)}`}>
        {formatearMoneda(valor)}
      </span>
    </div>
  );
}

export default function CierreCaja() {
  const navigate = useNavigate();
  const { usuario, sesionCaja, setSesionCaja } = useAuthStore();
  const [resumen, setResumen] = useState<ResumenCaja | null>(null);
  const [efectivoContado, setEfectivoContado] = useState("");
  const [tieneDiferenciaStock, setTieneDiferenciaStock] = useState(false);
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState("");
  const [modalCerrar, setModalCerrar] = useState(false);

  // Stock
  const [productos, setProductos] = useState<Producto[]>([]);
  const [stock, setStock] = useState<StockItem[]>([]);
  const [vendido, setVendido] = useState<Record<string, number>>({});
  const [merma, setMerma] = useState<Record<string, number>>({});
  const [cortesia, setCortesia] = useState<Record<string, number>>({});
  const [ajusteCortes, setAjusteCortes] = useState<Record<string, number>>({});
  const [conteoFisico, setConteoFisico] = useState<Record<string, string>>({});
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [gastosDetalle, setGastosDetalle] = useState<any[]>([]);
  const [devolucionesEfectivo, setDevolucionesEfectivo] = useState(0);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    if (!sesionCaja) return;
    try {
      const [
        ventas, gastos, adelantos, productosData, stockData, pedidosSesion, devolucionesTotal,
        mermasData, cortesiasData, vendidoLote, ajusteCortes,
      ] = await Promise.all([
        window.pos.ventas.listarPorSesion(sesionCaja.id),
        window.pos.gastos.listarPorSesion(sesionCaja.id),
        window.pos.nomina.listarAdelantosPorSesion(sesionCaja.id),
        window.pos.productos.listar(),
        window.pos.stock.obtenerStockPorSesion(sesionCaja.id),
        window.pos.pedidos.listarPorSesionAnticipo(sesionCaja.id),
        window.pos.caja.obtenerTotalDevoluciones(sesionCaja.id),
        window.pos.stock.listarMermasPorSesion(sesionCaja.id),
        window.pos.stock.listarCortesiasPorSesion(sesionCaja.id),
        window.pos.stock.calcularVendidoLote(sesionCaja.id),
        window.pos.stock.calcularAjusteCortesLote(sesionCaja.id),
      ]);
      setDevolucionesEfectivo(devolucionesTotal ?? 0);

      // Todos los pedidos con anticipo en esta sesión (incluye entregados)
      const anticiposResumen = pedidosSesion.reduce(
        (acc: any, p: any) => ({
          efectivo: acc.efectivo + (p.metodoPagoAnticipo === "efectivo" ? p.anticipo : 0),
          transferencia: acc.transferencia + (p.metodoPagoAnticipo === "transferencia" ? p.anticipo : 0),
          total: acc.total + p.anticipo,
        }),
        { efectivo: 0, transferencia: 0, total: 0 }
      );

      // Ventas de mostrador
      const ventasResumen = ventas
        .filter((v) => v.tipoOrigen === "mostrador")
        .reduce(
          (acc, v) => ({
            efectivo: acc.efectivo + (v.metodoPago === "efectivo" ? v.total : 0),
            transferencia: acc.transferencia + (v.metodoPago === "transferencia" ? v.total : 0),
            total: acc.total + v.total,
          }),
          { efectivo: 0, transferencia: 0, total: 0 }
        );
      // Saldos cobrados al entregar pedidos (la venta registra SOLO el saldo)
      const pedidosResumen = ventas
        .filter((v) => v.tipoOrigen === "pedido")
        .reduce(
          (acc, v) => ({
            efectivo: acc.efectivo + (v.metodoPago === "efectivo" ? v.total : 0),
            transferencia: acc.transferencia + (v.metodoPago === "transferencia" ? v.total : 0),
            total: acc.total + v.total,
          }),
          { efectivo: 0, transferencia: 0, total: 0 }
        );
      const adelantosResumen = adelantos.reduce(
        (acc, a) => ({
          efectivo: acc.efectivo + (a.metodoPago === "efectivo" ? a.monto : 0),
          transferencia: acc.transferencia + (a.metodoPago === "transferencia" ? a.monto : 0),
          total: acc.total + a.monto,
        }),
        { efectivo: 0, transferencia: 0, total: 0 }
      );
      const gastosResumen = gastos.reduce(
        (acc, g) => ({
          caja: acc.caja + (g.origen === "caja" ? g.monto : 0),
          pedidos: acc.pedidos + (g.origen === "pedidos" ? g.monto : 0),
          total: acc.total + g.monto,
        }),
        { caja: 0, pedidos: 0, total: 0 }
      );

      setResumen({
        ventas: ventasResumen,
        pedidos: pedidosResumen,
        anticipos: anticiposResumen,
        gastos: gastosResumen,
        adelantos: adelantosResumen,
      });

      setGastosDetalle(gastos);

      setProductos(productosData);
      setStock(stockData);

      // Calcular vendido por key (productoId-unidad)
      const vendidoMap: Record<string, number> = {};
      const mermaMap: Record<string, number> = {};
      const cortesiaMap: Record<string, number> = {};
      const conteoInicial: Record<string, string> = {};

      for (const s of stockData) {
        const key = `${s.productoId}-${s.unidad}`;
        const lookupKey = `${s.productoId}:${s.unidad}`;
        const v = vendidoLote[lookupKey] ?? 0;
        vendidoMap[key] = v;

        const totalMerma = mermasData
          .filter((m: any) => m.productoId === s.productoId && m.unidad === s.unidad)
          .reduce((sum: number, m: any) => sum + m.cantidad, 0);
        mermaMap[key] = totalMerma;

        const totalCortesia = cortesiasData
          .filter((c: any) => c.productoId === s.productoId && c.unidad === s.unidad)
          .reduce((sum: number, c: any) => sum + c.cantidad, 0);
        cortesiaMap[key] = totalCortesia;

        const corteAjuste = ajusteCortes[lookupKey] ?? 0;
        const esperado =
          s.cantidadInicial +
          s.cantidadAgregada -
          v -
          totalMerma -
          totalCortesia +
          corteAjuste;
        conteoInicial[key] = String(esperado);
      }
      setVendido(vendidoMap);
      setMerma(mermaMap);
      setCortesia(cortesiaMap);
      setAjusteCortes(ajusteCortes);
      setConteoFisico(conteoInicial);
    } catch (err) {
      console.error("Error al cargar datos:", err);
    } finally {
      setLoading(false);
    }
  };

  // Fórmula canónica (idéntica a caja.calcularEfectivoEsperado):
  // ventas(mostrador+saldo) + anticipos - gastos(caja+pedidos) - adelantos - devoluciones
  const efectivoEsperado =
    ((resumen?.ventas.efectivo ?? 0) +
      (resumen?.pedidos.efectivo ?? 0) +
      (resumen?.anticipos.efectivo ?? 0)) -
    (resumen?.gastos.caja ?? 0) -
    (resumen?.gastos.pedidos ?? 0) -
    (resumen?.adelantos.efectivo ?? 0) -
    devolucionesEfectivo;

  const diferencia = (parseFloat(efectivoContado) || 0) - efectivoEsperado;

  // Totales de presentación (espejo de las tarjetas y de la fórmula de efectivo)
  const totalIngresos =
    (resumen?.ventas.total ?? 0) + (resumen?.anticipos.total ?? 0) + (resumen?.pedidos.total ?? 0);
  const totalEgresos = (resumen?.gastos.total ?? 0) + (resumen?.adelantos.total ?? 0);
  const neto = totalIngresos - totalEgresos;
  const ingresosEfectivo =
    (resumen?.ventas.efectivo ?? 0) + (resumen?.anticipos.efectivo ?? 0) + (resumen?.pedidos.efectivo ?? 0);
  const egresosEfectivo =
    (resumen?.gastos.caja ?? 0) +
    (resumen?.gastos.pedidos ?? 0) +
    (resumen?.adelantos.efectivo ?? 0) +
    devolucionesEfectivo;

  // Calcular diferencias de stock
  const diferenciasStock = stock.map((s) => {
    const key = `${s.productoId}-${s.unidad}`;
    const lookupKey = `${s.productoId}:${s.unidad}`;
    const vendidoCantidad = vendido[key] ?? 0;
    // Esperado = inicial + agregada - vendida - mermas - cortesías ± cortes entero↔porción
    const esperado =
      s.cantidadInicial +
      s.cantidadAgregada -
      vendidoCantidad -
      (merma[key] ?? 0) -
      (cortesia[key] ?? 0) +
      (ajusteCortes[lookupKey] ?? 0);
    const raw = conteoFisico[key];
    const fisico = (raw !== undefined && raw !== "" && !isNaN(Number(raw)))
      ? Math.max(0, Math.floor(Number(raw)))
      : 0;
    return {
      ...s,
      key,
      vendido: vendidoCantidad,
      esperado,
      fisico,
      diferencia: fisico - esperado,
    };
  });

  const hayDiferenciasStock = diferenciasStock.some((d) => d.diferencia !== 0);

  const handleCerrar = async () => {
    setModalCerrar(true);
  };

  const exportarPdf = async () => {
    if (!sesionCaja || !resumen) return;
    try {
      // Pedidos entregados en ESTA sesión con sus cobros de saldo
      const pedidosEntregadosSesion =
        await window.pos.pedidos.listarPorSesionEntrega(sesionCaja.id);

      const pedidosEntregados = await Promise.all(
        pedidosEntregadosSesion.map(async (p) => {
          const detallesPedido = await window.pos.pedidos.obtenerDetalle(p.id);
          const principal = detallesPedido[0];
          const productoPrincipal =
            principal?.nombre ?? principal?.descripcionPersonalizada ?? "Pedido";
          // La columna saldoPendiente queda en 0 al entregar; el cobro se reconstruye
          // con la fórmula original (idéntica al monto que registró la venta).
          const cobradoTotal = Math.max(
            (p.totalEstimado ?? 0) - (p.anticipo ?? 0),
            0
          );
          return {
            id: p.id,
            cliente: p.cliente,
            producto: productoPrincipal,
            cantidad: detallesPedido.reduce((sum, d) => sum + d.cantidad, 0),
            total: p.totalEstimado,
            cobradoEfectivo:
              p.metodoPagoSaldo === "efectivo" ? cobradoTotal : 0,
            cobradoTransferencia:
              p.metodoPagoSaldo === "transferencia" ? cobradoTotal : 0,
            saldoPendiente: 0,
          };
        })
      );

      // Calcular transferencia esperada
      const transferenciaEsperada =
        (resumen?.ventas.transferencia ?? 0) +
        (resumen?.anticipos.transferencia ?? 0) +
        (resumen?.pedidos.transferencia ?? 0) -
        (resumen?.adelantos.transferencia ?? 0);

      const datos: DatosCierreCaja = {
        sesionId: sesionCaja.id,
        fechaApertura: sesionCaja.fechaApertura,
        fechaCierre: new Date().toLocaleString("es-EC"),
        cajeroNombre: usuario?.nombre || "N/A",
        ventas: resumen.ventas,
        anticipos: resumen.anticipos,
        pedidos: resumen.pedidos,
        gastos: {
          caja: resumen.gastos.caja,
          pedidos: resumen.gastos.pedidos,
          total: resumen.gastos.total,
          porCategoria: gastosDetalle.reduce((acc: any[], g: any) => {
            const existente = acc.find(a => a.categoriaNombre === g.categoriaNombre);
            if (existente) {
              existente.cantidad++;
              existente.total += g.monto;
            } else {
              acc.push({ categoriaNombre: g.categoriaNombre || "Sin categoría", cantidad: 1, total: g.monto });
            }
            return acc;
          }, []),
        },
        adelantos: resumen.adelantos,
        devoluciones: { efectivo: devolucionesEfectivo, transferencia: 0, total: devolucionesEfectivo },
        pedidosEntregados,
        efectivoEsperado,
        efectivoContado: parseFloat(efectivoContado) || 0,
        diferenciaEfectivo: diferencia,
        transferenciaEsperada,
        transferenciaRecibida: (resumen?.ventas.transferencia ?? 0) + (resumen?.anticipos.transferencia ?? 0) + (resumen?.pedidos.transferencia ?? 0),
      };

      await generarPdfCierreCaja(datos);
    } catch (err: any) {
      console.error("Error al exportar PDF:", err);
      setError(err.message || "Error al generar el PDF");
    }
  };

  const confirmarCerrar = async () => {
    if (!sesionCaja) return;
    setProcesando(true);
    setError("");
    try {
      if (!efectivoContado) throw new Error("Ingresa el efectivo contado");

      // Construir conteo de stock
      const conteoStock = diferenciasStock.map((d) => ({
        productoId: d.productoId,
        unidad: d.unidad,
        conteoFisico: Number(d.fisico) || 0,
      }));

      await window.pos.caja.cerrar({
        sesionCajaId: sesionCaja.id,
        efectivoContado: parseFloat(efectivoContado),
        tieneDiferenciaStock: hayDiferenciasStock,
        conteoStock,
      });
      setSesionCaja(null);
      navigate("/");
    } catch (err: any) {
      setError(err.message || "Error al cerrar la caja");
    } finally {
      setProcesando(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-on-surface-variant">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-headline-lg font-bold text-on-surface">Cierre de Caja</h1>
        <p className="text-on-surface-variant">{sesionCaja?.fecha} - Sesión #{sesionCaja?.id}</p>
      </div>

      {/* Tira KPI — resumen en cifras grandes */}
      <div className="bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant hover:shadow-md transition-shadow mb-6 grid grid-cols-1 sm:grid-cols-3 divide-y divide-outline-variant sm:divide-y-0 sm:divide-x">
        <div className="p-5 flex flex-col gap-1">
          <span className="flex items-center gap-2 text-label-md text-on-surface-variant">
            <TrendingUp className="w-4 h-4 text-on-tertiary-container" aria-hidden="true" />
            Ingresos
          </span>
          <span className="text-headline-lg font-bold text-on-tertiary-container tabular-nums">
            {formatearMoneda(totalIngresos)}
          </span>
        </div>
        <div className="p-5 flex flex-col gap-1">
          <span className="flex items-center gap-2 text-label-md text-on-surface-variant">
            <TrendingDown className="w-4 h-4 text-error" aria-hidden="true" />
            Egresos
          </span>
          <span className="text-headline-lg font-bold text-error tabular-nums">
            {formatearMoneda(totalEgresos)}
          </span>
        </div>
        <div className="p-5 flex flex-col gap-1">
          <span className="flex items-center gap-2 text-label-md text-on-surface-variant">
            <Scale className="w-4 h-4" aria-hidden="true" />
            Neto
          </span>
          <span className={`text-headline-lg font-bold tabular-nums ${neto < 0 ? "text-error" : "text-on-surface"}`}>
            {formatearMoneda(neto)}
          </span>
        </div>
      </div>

      {/* Ingresos / Egresos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant hover:shadow-md transition-shadow">
          <h2 className="flex items-center gap-2 text-headline-md font-semibold text-on-surface mb-5">
            <Banknote className="w-5 h-5 text-on-tertiary-container" aria-hidden="true" />
            Ingresos
          </h2>
          <div className="space-y-5">
            <Seccion icono={ShoppingCart} titulo="Ventas">
              <FilaMonto label="Efectivo" valor={resumen?.ventas.efectivo ?? 0} />
              <FilaMonto label="Transferencia" valor={resumen?.ventas.transferencia ?? 0} />
              <BandaTotal label="Total ventas" valor={resumen?.ventas.total ?? 0} />
            </Seccion>

            <Seccion icono={Cake} titulo="Anticipos de pedidos">
              <FilaMonto label="Efectivo" valor={resumen?.anticipos.efectivo ?? 0} />
              <FilaMonto label="Transferencia" valor={resumen?.anticipos.transferencia ?? 0} />
              <BandaTotal label="Total anticipos" valor={resumen?.anticipos.total ?? 0} />
            </Seccion>

            {(resumen?.pedidos.total ?? 0) > 0 && (
              <Seccion icono={ClipboardList} titulo="Saldos de pedidos">
                <FilaMonto label="Efectivo" valor={resumen?.pedidos.efectivo ?? 0} />
                <FilaMonto label="Transferencia" valor={resumen?.pedidos.transferencia ?? 0} />
                <BandaTotal label="Total saldos" valor={resumen?.pedidos.total ?? 0} />
              </Seccion>
            )}

            <BandaTotal label="Total ingresos" valor={totalIngresos} fuerte />
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant hover:shadow-md transition-shadow">
          <h2 className="flex items-center gap-2 text-headline-md font-semibold text-on-surface mb-5">
            <Receipt className="w-5 h-5 text-error" aria-hidden="true" />
            Egresos
          </h2>
          <div className="space-y-5">
            <Seccion icono={ShoppingBag} titulo="Gastos">
              <FilaMonto label="De caja" valor={resumen?.gastos.caja ?? 0} tono="sale" />
              <FilaMonto label="De pedidos" valor={resumen?.gastos.pedidos ?? 0} tono="sale" />
              {gastosDetalle.length > 0 && (
                <div className="ml-1 pl-4 border-l-2 border-outline-variant/60 space-y-0.5">
                  {gastosDetalle.map((g) => (
                    <div key={g.id} className="flex justify-between items-baseline gap-2 text-caption py-0.5">
                      <span className="text-on-surface-variant truncate">{g.descripcion}</span>
                      <span className="text-on-surface-variant tabular-nums shrink-0">{formatearMoneda(g.monto)}</span>
                    </div>
                  ))}
                </div>
              )}
            </Seccion>

            <Seccion icono={HandCoins} titulo="Adelantos">
              <FilaMonto label="Efectivo" valor={resumen?.adelantos.efectivo ?? 0} tono="sale" />
              <FilaMonto label="Transferencia" valor={resumen?.adelantos.transferencia ?? 0} tono="sale" />
            </Seccion>

            <BandaTotal label="Total egresos" valor={totalEgresos} tono="sale" fuerte />
          </div>
        </div>
      </div>

      {/* Conciliación de efectivo — fórmula vertical */}
      <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant mb-6 hover:shadow-md transition-shadow">
        <h2 className="flex items-center gap-2 text-headline-md font-semibold text-on-surface mb-5">
          <Wallet className="w-5 h-5" aria-hidden="true" />
          Conciliación de Efectivo
        </h2>

        <div className="bg-surface-container rounded-xl p-4 mb-4 space-y-2">
          <h3 className="text-caption font-semibold uppercase tracking-wider text-on-surface-variant mb-3">
            Flujo de efectivo
          </h3>
          <LineaFormula signo="+" label="Ventas en efectivo" valor={resumen?.ventas.efectivo ?? 0} />
          <LineaFormula signo="+" label="Anticipos de pedidos" valor={resumen?.anticipos.efectivo ?? 0} />
          {(resumen?.pedidos.efectivo ?? 0) > 0 && (
            <LineaFormula signo="+" label="Cobro de pedidos entregados" valor={resumen?.pedidos.efectivo ?? 0} />
          )}
          <LineaFormulaTotal label="Ingresos en efectivo" valor={ingresosEfectivo} />
          <LineaFormula signo="−" label="Gastos de caja" valor={resumen?.gastos.caja ?? 0} tono="sale" />
          <LineaFormula signo="−" label="Gastos de pedidos" valor={resumen?.gastos.pedidos ?? 0} tono="sale" />
          <LineaFormula signo="−" label="Adelantos en efectivo" valor={resumen?.adelantos.efectivo ?? 0} tono="sale" />
          {devolucionesEfectivo > 0 && (
            <LineaFormula signo="−" label="Devoluciones de anticipo" valor={devolucionesEfectivo} tono="sale" />
          )}
          <LineaFormulaTotal label="Egresos en efectivo" valor={egresosEfectivo} tono="sale" />
        </div>

        {/* Número héroe: la cifra que cierra la caja */}
        <div className="bg-tertiary-fixed rounded-xl px-4 py-4 mb-5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <span className="flex items-baseline gap-2">
            <span className="w-6 text-center font-mono text-on-surface-variant" aria-hidden="true">
              =
            </span>
            <span className="text-label-md font-semibold text-on-surface">Efectivo esperado en caja</span>
          </span>
          <span className="text-display-price text-on-surface tabular-nums">
            {formatearMoneda(efectivoEsperado)}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
          <div>
            <label htmlFor="efectivo-contado" className="block text-label-md text-on-surface-variant mb-1">
              Efectivo contado a mano *
            </label>
            <input
              id="efectivo-contado"
              type="number"
              value={efectivoContado}
              onChange={(e) => {
                setEfectivoContado(e.target.value);
                if (errores.efectivoContado) setErrores((prev) => { const n = { ...prev }; delete n.efectivoContado; return n; });
              }}
              onBlur={() => {
                const num = parseFloat(efectivoContado);
                if (efectivoContado && (isNaN(num) || num < 0)) {
                  setErrores((prev) => ({ ...prev, efectivoContado: "El efectivo contado no puede ser negativo" }));
                }
              }}
              min="0"
              max="999999"
              step="0.01"
              className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:border-secondary bg-surface text-headline-md tabular-nums ${errores.efectivoContado ? "border-error" : "border-outline-variant"}`}
              placeholder="0,00"
            />
            {errores.efectivoContado && <p className="text-error text-caption mt-1">{errores.efectivoContado}</p>}
          </div>

          <div>
            <span className="block text-label-md text-on-surface-variant mb-1">Diferencia</span>
            {efectivoContado ? (
              <div className={`rounded-xl px-4 py-3 flex items-center justify-between gap-2 ${diferencia >= 0 ? "bg-tertiary-fixed" : "bg-error-container"}`}>
                <span className={`flex items-center gap-1.5 text-label-md font-medium ${diferencia >= 0 ? "text-on-tertiary-container" : "text-error"}`}>
                  {diferencia === 0 ? (
                    <Check className="w-4 h-4" aria-hidden="true" />
                  ) : (
                    <AlertTriangle className="w-4 h-4" aria-hidden="true" />
                  )}
                  {diferencia === 0 ? "Cuadra perfecto" : diferencia > 0 ? "Sobrante" : "Faltante"}
                </span>
                <span className={`text-headline-md font-bold tabular-nums ${diferencia >= 0 ? "text-on-tertiary-container" : "text-error"}`}>
                  {formatearMoneda(Math.abs(diferencia))}
                </span>
              </div>
            ) : (
              <div className="rounded-xl px-4 py-3 bg-surface-container flex items-center justify-between gap-2">
                <span className="text-label-md font-medium text-on-surface-variant">Sin contar aún</span>
                <span className="text-headline-md font-bold text-on-surface-variant/60 tabular-nums">—</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Conteo físico de stock */}
      {diferenciasStock.length > 0 && (
        <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant mb-6 overflow-x-auto hover:shadow-md transition-shadow">
          <h2 className="text-headline-md font-semibold text-on-surface mb-2">Conteo Físico de Stock</h2>
          <p className="text-label-md text-on-surface-variant mb-4">
            Cuenta cuántos productos quedan en la vitrina. El sistema calcula lo esperado automáticamente.
          </p>

          <table className="w-full">
            <thead>
              <tr className="border-b border-outline-variant">
                <th className="text-left p-4 text-on-surface-variant font-medium">Producto</th>
                <th className="text-center p-4 text-on-surface-variant font-medium">Unidad</th>
                <th className="text-right p-4 text-on-surface-variant font-medium">Inicial</th>
                <th className="text-right p-4 text-on-surface-variant font-medium">Agregada</th>
                <th className="text-right p-4 text-on-surface-variant font-medium">Vendida</th>
                <th className="text-right p-4 text-on-surface-variant font-medium">Esperado</th>
                <th className="text-right p-4 text-on-surface-variant font-medium w-28">Físico</th>
                <th className="text-right p-4 text-on-surface-variant font-medium">Diferencia</th>
              </tr>
            </thead>
            <tbody>
              {diferenciasStock.map((d) => (
                <tr key={d.key} className="border-b border-outline-variant/50">
                  <td className="p-4 font-medium text-on-surface">
                    {productos.find((p) => p.id === d.productoId)?.nombre ?? `#${d.productoId}`}
                  </td>
                  <td className="p-4 text-center">
                    <span className={`text-caption font-medium px-2 py-1 rounded-full ${
                      d.unidad === "entero"
                        ? "bg-secondary-container text-on-secondary-container"
                        : "bg-tertiary-container text-on-tertiary-container"
                    }`}>
                      {d.unidad === "entero" ? "Entero" : "Porción"}
                    </span>
                  </td>
                  <td className="p-4 text-right text-on-surface-variant">{d.cantidadInicial}</td>
                  <td className="p-4 text-right text-on-surface-variant">{d.cantidadAgregada}</td>
                  <td className="p-4 text-right text-error">{d.vendido}</td>
                  <td className="p-4 text-right text-on-surface font-medium">{d.esperado}</td>
                  <td className="p-4 text-right">
                    <input
                      type="number"
                      value={conteoFisico[d.key] ?? "0"}
                      onChange={(e) =>
                        setConteoFisico((prev) => ({
                          ...prev,
                          [d.key]: e.target.value,
                        }))
                      }
                      min="0"
                      max="99999"
                      className="w-20 px-2 py-1 text-right border border-outline-variant rounded-lg focus:outline-none focus:border-secondary bg-surface"
                    />
                  </td>
                  <td className={`p-4 text-right font-medium ${d.diferencia === 0 ? "text-tertiary" : d.diferencia > 0 ? "text-tertiary" : "text-error"}`}>
                    {d.diferencia === 0 ? <Check className="w-5 h-5 text-tertiary inline" /> : d.diferencia > 0 ? `+${d.diferencia}` : d.diferencia}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {hayDiferenciasStock && (
            <div className="mt-4 p-3 bg-error-container/30 text-error rounded-xl text-center text-label-md">
              Hay diferencias en el conteo de stock. Se registrarán en el cierre.
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-error-container text-on-error-container rounded-xl text-center">{error}</div>
      )}

      <div className="flex gap-4">
        <button onClick={() => navigate("/")} className="flex-1 py-3 border border-outline-variant text-on-surface-variant rounded-xl hover:bg-surface-container-high transition-colors">
          Volver
        </button>
        <button onClick={exportarPdf} disabled={!resumen} className="flex-1 py-3 bg-surface-container text-on-surface rounded-xl hover:bg-surface-container-high transition-colors flex items-center justify-center gap-2">
          <Download className="w-4 h-4" />
          Descargar PDF
        </button>
        <button onClick={handleCerrar} disabled={!efectivoContado || procesando} className="flex-1 py-3 bg-secondary text-on-secondary rounded-xl hover:bg-secondary/90 disabled:opacity-50 transition-colors">
          {procesando ? "Cerrando..." : "Cerrar Caja"}
        </button>
      </div>

      <ConfirmModal
        open={modalCerrar}
        titulo="Cerrar Caja"
        mensaje={`¿Estás seguro de cerrar la caja?\n\nEfectivo contado: ${formatearMoneda(parseFloat(efectivoContado || "0"))}\nEfectivo esperado: ${formatearMoneda(efectivoEsperado)}\n\nEsta acción es irreversible.`}
        textoConfirmar="Cerrar Caja"
        textoCancelar="Cancelar"
        variante="peligro"
        onConfirmar={confirmarCerrar}
        onCancelar={() => setModalCerrar(false)}
        cargando={procesando}
      />
    </div>
  );
}
