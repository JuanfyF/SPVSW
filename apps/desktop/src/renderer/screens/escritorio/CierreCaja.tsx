import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/auth";
import ConfirmModal from "../../components/ConfirmModal";

interface Producto {
  id: number;
  nombre: string;
  categoria: string | null;
}

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
    <div className="p-6 max-w-4xl mx-auto ">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-on-surface">Cierre de Caja</h1>
        <p className="text-on-surface-variant">{sesionCaja?.fecha} - Sesión #{sesionCaja?.id}</p>
      </div>

      {/* Resumen financiero */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant">
          <h2 className="text-lg font-semibold text-on-surface mb-4">Ingresos</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-on-surface-variant">Ventas efectivo:</span>
              <span className="font-medium text-on-surface">${resumen?.ventas.efectivo.toFixed(2) ?? "0.00"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-on-surface-variant">Ventas transferencia:</span>
              <span className="font-medium text-on-surface">${resumen?.ventas.transferencia.toFixed(2) ?? "0.00"}</span>
            </div>
            <div className="flex justify-between border-t border-outline-variant pt-3">
              <span className="text-on-surface-variant font-medium">Total ventas:</span>
              <span className="font-bold text-on-surface">${resumen?.ventas.total.toFixed(2) ?? "0.00"}</span>
            </div>
            <div className="flex justify-between pt-2">
              <span className="text-on-surface-variant">Anticipos pedidos efectivo:</span>
              <span className="font-medium text-on-surface">${resumen?.anticipos.efectivo.toFixed(2) ?? "0.00"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-on-surface-variant">Anticipos pedidos transferencia:</span>
              <span className="font-medium text-on-surface">${resumen?.anticipos.transferencia.toFixed(2) ?? "0.00"}</span>
            </div>
            <div className="flex justify-between border-t border-outline-variant pt-3">
              <span className="text-on-surface-variant font-medium">Total anticipos:</span>
              <span className="font-bold text-on-surface">${resumen?.anticipos.total.toFixed(2) ?? "0.00"}</span>
            </div>
            {(resumen?.pedidos.total ?? 0) > 0 && (
              <>
                <div className="flex justify-between pt-2">
                  <span className="text-on-surface-variant">Saldos pedidos efectivo:</span>
                  <span className="font-medium text-on-surface">${resumen?.pedidos.efectivo.toFixed(2) ?? "0.00"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Saldos pedidos transferencia:</span>
                  <span className="font-medium text-on-surface">${resumen?.pedidos.transferencia.toFixed(2) ?? "0.00"}</span>
                </div>
                <div className="flex justify-between border-t border-outline-variant pt-3">
                  <span className="text-on-surface-variant font-medium">Total saldos:</span>
                  <span className="font-bold text-on-surface">${resumen?.pedidos.total.toFixed(2) ?? "0.00"}</span>
                </div>
              </>
            )}
            <div className="flex justify-between border-t border-outline-variant pt-3">
              <span className="text-on-surface font-medium">Total ingresos:</span>
              <span className="font-bold text-on-surface">${((resumen?.ventas.total ?? 0) + (resumen?.anticipos.total ?? 0) + (resumen?.pedidos.total ?? 0)).toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant">
          <h2 className="text-lg font-semibold text-on-surface mb-4">Egresos</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-on-surface-variant">Gastos caja:</span>
              <span className="font-medium text-error">${resumen?.gastos.caja.toFixed(2) ?? "0.00"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-on-surface-variant">Gastos pedidos:</span>
              <span className="font-medium text-error">${resumen?.gastos.pedidos.toFixed(2) ?? "0.00"}</span>
            </div>
            {gastosDetalle.length > 0 && (
              <div className="pt-2 border-t border-outline-variant">
                {gastosDetalle.map((g) => (
                  <div key={g.id} className="flex justify-between text-sm py-1">
                    <span className="text-on-surface-variant truncate mr-2">{g.descripcion}</span>
                    <span className="whitespace-nowrap text-error">${g.monto.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-on-surface-variant">Adelantos efectivo:</span>
              <span className="font-medium text-error">${resumen?.adelantos.efectivo.toFixed(2) ?? "0.00"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-on-surface-variant">Adelantos transferencia:</span>
              <span className="font-medium text-error">${resumen?.adelantos.transferencia.toFixed(2) ?? "0.00"}</span>
            </div>
            <div className="flex justify-between border-t border-outline-variant pt-3">
              <span className="text-on-surface font-medium">Total egresos:</span>
              <span className="font-bold text-error">${((resumen?.gastos.total ?? 0) + (resumen?.adelantos.total ?? 0)).toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Conciliación de efectivo */}
      <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant mb-6">
        <h2 className="text-lg font-semibold text-on-surface mb-4">Conciliación de Efectivo</h2>
        
        {/* Resumen detallado de efectivo */}
        <div className="bg-surface-container rounded-xl p-4 mb-4">
          <h3 className="text-sm font-medium text-on-surface-variant mb-3">Resumen del Flujo de Efectivo</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-on-surface-variant">+ Ventas en efectivo (mostrador):</span>
              <span className="font-medium text-tertiary">${resumen?.ventas.efectivo.toFixed(2) ?? "0.00"}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-on-surface-variant">+ Anticipos pedidos en efectivo:</span>
              <span className="font-medium text-tertiary">${resumen?.anticipos.efectivo.toFixed(2) ?? "0.00"}</span>
            </div>
            {(resumen?.pedidos.efectivo ?? 0) > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-on-surface-variant">+ Cobro pedidos entregados (efectivo):</span>
                <span className="font-medium text-tertiary">${resumen?.pedidos.efectivo.toFixed(2) ?? "0.00"}</span>
              </div>
            )}
            <div className="flex justify-between text-sm border-t border-outline-variant pt-2">
              <span className="text-on-surface font-medium">Total ingresos efectivo:</span>
              <span className="font-bold text-tertiary">${((resumen?.ventas.efectivo ?? 0) + (resumen?.anticipos.efectivo ?? 0) + (resumen?.pedidos.efectivo ?? 0)).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm mt-2">
              <span className="text-on-surface-variant">- Gastos de caja:</span>
              <span className="font-medium text-error">${resumen?.gastos.caja.toFixed(2) ?? "0.00"}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-on-surface-variant">- Gastos de pedidos:</span>
              <span className="font-medium text-error">${resumen?.gastos.pedidos.toFixed(2) ?? "0.00"}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-on-surface-variant">- Adelantos en efectivo:</span>
              <span className="font-medium text-error">${resumen?.adelantos.efectivo.toFixed(2) ?? "0.00"}</span>
            </div>
            {devolucionesEfectivo > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-on-surface-variant">- Devoluciones de anticipo (efectivo):</span>
                <span className="font-medium text-error">${devolucionesEfectivo.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm border-t border-outline-variant pt-2">
              <span className="text-on-surface font-medium">Total egresos efectivo:</span>
              <span className="font-bold text-error">${((resumen?.gastos.caja ?? 0) + (resumen?.gastos.pedidos ?? 0) + (resumen?.adelantos.efectivo ?? 0) + devolucionesEfectivo).toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center p-4 bg-surface-container rounded-xl">
            <span className="text-on-surface">Efectivo esperado en caja:</span>
            <span className="text-2xl font-bold text-on-surface">${efectivoEsperado.toFixed(2)}</span>
          </div>

          <div>
            <label className="block text-sm text-on-surface-variant mb-1">Efectivo contado a mano *</label>
            <input
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
              className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:border-secondary bg-surface text-lg ${errores.efectivoContado ? "border-error" : "border-outline-variant"}`}
              placeholder="0.00"
            />
            {errores.efectivoContado && <p className="text-error text-xs mt-1">{errores.efectivoContado}</p>}
          </div>

          {efectivoContado && (
            <div className={`p-4 rounded-xl ${diferencia === 0 ? "bg-tertiary-fixed" : diferencia > 0 ? "bg-tertiary-fixed" : "bg-error-container"}`}>
              <div className="flex justify-between items-center">
                <span className={`font-medium ${diferencia === 0 ? "text-tertiary" : diferencia > 0 ? "text-tertiary" : "text-error"}`}>
                  {diferencia === 0 ? "Cuadra perfecto" : diferencia > 0 ? "Sobrante" : "Faltante"}
                </span>
                <span className={`text-2xl font-bold ${diferencia === 0 ? "text-tertiary" : diferencia > 0 ? "text-tertiary" : "text-error"}`}>
                  ${Math.abs(diferencia).toFixed(2)}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Conteo físico de stock */}
      {diferenciasStock.length > 0 && (
        <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant mb-6 overflow-x-auto">
          <h2 className="text-lg font-semibold text-on-surface mb-2">Conteo Físico de Stock</h2>
          <p className="text-sm text-on-surface-variant mb-4">
            Cuenta cuántos productos quedan en la vitrina. El sistema calcula lo esperado automáticamente.
          </p>

          <table className="w-full">
            <thead>
              <tr className="border-b border-outline-variant">
                <th className="text-left p-3 text-on-surface-variant font-medium">Producto</th>
                <th className="text-center p-3 text-on-surface-variant font-medium">Unidad</th>
                <th className="text-right p-3 text-on-surface-variant font-medium">Inicial</th>
                <th className="text-right p-3 text-on-surface-variant font-medium">Agregada</th>
                <th className="text-right p-3 text-on-surface-variant font-medium">Vendida</th>
                <th className="text-right p-3 text-on-surface-variant font-medium">Esperado</th>
                <th className="text-right p-3 text-on-surface-variant font-medium w-28">Físico</th>
                <th className="text-right p-3 text-on-surface-variant font-medium">Diferencia</th>
              </tr>
            </thead>
            <tbody>
              {diferenciasStock.map((d) => (
                <tr key={d.key} className="border-b border-outline-variant/50">
                  <td className="p-3 font-medium text-on-surface">
                    {productos.find((p) => p.id === d.productoId)?.nombre ?? `#${d.productoId}`}
                  </td>
                  <td className="p-3 text-center">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                      d.unidad === "entero"
                        ? "bg-secondary-container text-on-secondary-container"
                        : "bg-tertiary-container text-on-tertiary-container"
                    }`}>
                      {d.unidad === "entero" ? "Entero" : "Porción"}
                    </span>
                  </td>
                  <td className="p-3 text-right text-on-surface-variant">{d.cantidadInicial}</td>
                  <td className="p-3 text-right text-on-surface-variant">{d.cantidadAgregada}</td>
                  <td className="p-3 text-right text-error">{d.vendido}</td>
                  <td className="p-3 text-right text-on-surface font-medium">{d.esperado}</td>
                  <td className="p-3 text-right">
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
                  <td className={`p-3 text-right font-medium ${d.diferencia === 0 ? "text-tertiary" : d.diferencia > 0 ? "text-tertiary" : "text-error"}`}>
                    {d.diferencia === 0 ? "✓" : d.diferencia > 0 ? `+${d.diferencia}` : d.diferencia}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {hayDiferenciasStock && (
            <div className="mt-4 p-3 bg-error-container/30 text-error rounded-xl text-center text-sm">
              Hay diferencias en el conteo de stock. Se registrarán en el cierre.
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-error-container text-on-error-container rounded-xl text-center">{error}</div>
      )}

      <div className="flex gap-4">
        <button onClick={() => navigate("/")} className="flex-1 py-3 border border-outline-variant text-on-surface-variant rounded-xl hover:bg-surface-container transition-colors">
          Volver
        </button>
        <button onClick={handleCerrar} disabled={!efectivoContado || procesando} className="flex-1 py-3 bg-secondary text-on-secondary rounded-xl hover:bg-secondary/90 disabled:opacity-50 transition-colors">
          {procesando ? "Cerrando..." : "Cerrar Caja"}
        </button>
      </div>

      <ConfirmModal
        open={modalCerrar}
        titulo="Cerrar Caja"
        mensaje={`¿Estás seguro de cerrar la caja?\n\nEfectivo contado: $${parseFloat(efectivoContado || "0").toFixed(2)}\nEfectivo esperado: $${efectivoEsperado.toFixed(2)}\n\nEsta acción es irreversible.`}
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
