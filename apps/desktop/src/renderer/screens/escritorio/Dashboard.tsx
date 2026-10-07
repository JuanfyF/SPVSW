import { useEffect, useState, useCallback, useRef } from "react";
import { formatearFecha, formatearMoneda } from "@pos/shared";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../../store/auth";
import {
  AlertTriangle,
  ShoppingCart,
  Banknote,
  ClipboardList,
  TrendingDown,
  CircleDollarSign,
  Package,
  BarChart3,
  Search,
  Users,
} from "lucide-react";

interface ResumenDiario {
  ventasMostrador: {
    efectivo: number; transferencia: number; total: number;
    cantidadEfectivo: number; cantidadTransferencia: number; cantidadTotal: number;
  };
  saldosPedidos: {
    efectivo: number; transferencia: number; total: number;
    cantidadEfectivo: number; cantidadTransferencia: number; cantidadTotal: number;
  };
  pedidos: {
    efectivo: number; transferencia: number; total: number;
    cantidadEfectivo: number; cantidadTransferencia: number; cantidadTotal: number;
  };
  gastos: {
    caja: number; pedidos: number; total: number;
    porCategoria: Array<{
      categoriaId: number;
      categoriaNombre: string;
      total: number;
      cantidad: number;
    }>;
    detalle?: Array<{
      id: number;
      descripcion: string;
      monto: number;
      origen: string;
      categoriaNombre: string;
    }>;
  };
  adelantos: {
    efectivo: number; transferencia: number; total: number;
  };
  devoluciones?: {
    efectivo: number; transferencia: number; total: number;
  };
  multas: number;
  consolidado: {
    ingresosBrutos: number;
    egresosTotales: number;
    ingresoNeto: number;
  };
}

function LineaDato({ etiqueta, monto, cantidad }: { etiqueta: string; monto: number; cantidad?: number }) {
  return (
    <div className={`flex justify-between ${monto > 0 ? "text-on-surface-variant" : "text-on-surface-variant/60"}`}>
      <span>{etiqueta}</span>
      <span className="tabular-nums">
        {formatearMoneda(monto)}
        {cantidad != null ? ` (${cantidad})` : ""}
      </span>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { usuario, sesionCaja } = useAuthStore();
  const [resumen, setResumen] = useState<ResumenDiario | null>(null);
  const [pedidosPendientes, setPedidosPendientes] = useState(0);
  const [diferenciasStock, setDiferenciasStock] = useState<Array<{
    productoId: number;
    productoNombre: string;
    unidad: string;
    esperado: number;
    conteoFisico: number;
    diferencia: number;
  }>>([]);
  const [cierresPendientes, setCierresPendientes] = useState<Array<{
    id: number;
    cajeroNombre: string;
    fechaApertura: string;
    diferenciaEfectivo: number;
    tieneDiferenciaStock: boolean;
  }>>([]);
  const [resumenNomina, setResumenNomina] = useState<{
    totalAdelantos: number;
    totalMultas: number;
    empleados: Array<{
      id: number;
      nombre: string;
      adelantos: number;
      multas: number;
    }>;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const gastosCantidad = resumen?.gastos.porCategoria.reduce((acc, cat) => acc + cat.cantidad, 0) ?? 0;
  const cargarDatosRef = useRef<(() => Promise<void>) | null>(null);
  const lastPathnameRef = useRef(location.pathname);

  const cargarDatos = useCallback(async () => {
    try {
      const hoy = formatearFecha(new Date());
      const [resumenDiario, pedidos] = await Promise.all([
        window.pos.reportes.reporteDiario(hoy!),
        window.pos.pedidos.listarActivos(),
      ]);
      setResumen(resumenDiario);
      setPedidosPendientes(pedidos.length);

      // Cargar stock con diferencias
      if (sesionCaja) {
        const stockData = await window.pos.stock.obtenerStockPorSesion(sesionCaja.id);
        const productos = await window.pos.productos.listar();
        const diferencias = stockData
          .filter((s) => s.diferenciaDetectada !== null && s.diferenciaDetectada !== 0)
          .map((s) => {
            const producto = productos.find((p) => p.id === s.productoId);
            const esperado = s.cantidadInicial + s.cantidadAgregada;
            return {
              productoId: s.productoId,
              productoNombre: producto?.nombre ?? `#${s.productoId}`,
              unidad: s.unidad,
              esperado,
              conteoFisico: s.conteoFisicoCierre ?? 0,
              diferencia: s.diferenciaDetectada ?? 0,
            };
          });
        setDiferenciasStock(diferencias);
      }

      // Cargar cierres con diferencias pendientes de revisión
      try {
        const cierresData = await window.pos.reportes.listarCierresPorRango(hoy!, hoy!);
        const pendientes = cierresData.cierres.filter(
          (c) => c.estadoRevision === "pendiente_revision"
        );
        setCierresPendientes(pendientes);
      } catch {
        // Silenciar: no es crítico si falla
      }

      // Cargar resumen de nómina del mes
      try {
        const empleados = await window.pos.nomina.listarEmpleadosActivos();
        const mesActual = hoy!.substring(0, 7); // "YYYY-MM"
        const empleadosConDescuentos = await Promise.all(
          empleados.map(async (emp) => {
            try {
              const descuentos = await window.pos.nomina.calcularDescuentosMes(emp.id, mesActual);
              return {
                id: emp.id,
                nombre: emp.nombre,
                adelantos: descuentos.adelantosMes,
                multas: descuentos.multasMes,
              };
            } catch {
              return { id: emp.id, nombre: emp.nombre, adelantos: 0, multas: 0 };
            }
          })
        );
        const totalAdelantos = empleadosConDescuentos.reduce((sum, e) => sum + e.adelantos, 0);
        const totalMultas = empleadosConDescuentos.reduce((sum, e) => sum + e.multas, 0);
        setResumenNomina({
          totalAdelantos,
          totalMultas,
          empleados: empleadosConDescuentos,
        });
      } catch {
        // Silenciar: no es crítico si falla
      }

      setError("");
    } catch (error) {
      console.error("Error al cargar dashboard:", error);
      setError("Error al cargar datos del dashboard");
    } finally {
      setLoading(false);
    }
  }, [sesionCaja]);

  cargarDatosRef.current = cargarDatos;

  // Cargar datos al montar y al navegar de vuelta
  useEffect(() => {
    cargarDatos();
  }, [location.pathname, cargarDatos]);

  // Detectar cambios de ruta para refrescar al volver al dashboard
  useEffect(() => {
    if (lastPathnameRef.current !== location.pathname) {
      lastPathnameRef.current = location.pathname;
      if (location.pathname === "/") {
        cargarDatosRef.current?.();
      }
    }
  }, [location.pathname]);

  // Auto-refresh cada 3 segundos + al recuperar foco + push notifications del main process
  useEffect(() => {
    const handleRefresh = () => {
      cargarDatosRef.current?.();
    };
    const handleVisibility = () => {
      if (document.visibilityState === "visible") handleRefresh();
    };
    const removeListener = window.pos.onCambio(handleRefresh);
    window.addEventListener('focus', handleRefresh);
    document.addEventListener('visibilitychange', handleVisibility);
    const interval = setInterval(handleRefresh, 30000);
    return () => {
      if (typeof removeListener === "function") removeListener();
      window.removeEventListener('focus', handleRefresh);
      document.removeEventListener('visibilitychange', handleVisibility);
      clearInterval(interval);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-on-surface-variant">Cargando...</div>
      </div>
    );
  }

  if (error) {
    return (
    <div className="p-6 max-w-7xl mx-auto">
        <div className="p-4 bg-error-container text-on-error-container rounded-xl">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-headline-lg font-bold text-on-surface">Dashboard</h1>
          <p className="text-body-md text-on-surface-variant">
            Bienvenido, {usuario?.nombre} •{" "}
            {new Date().toLocaleDateString("es-EC", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
      </div>

      {/* Alerta de sesión sin abrir */}
      {!sesionCaja && (
        <div className="mb-6 p-4 bg-error-container/50 border border-error/30 rounded-xl">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-error" />
            <div>
              <p className="font-semibold text-on-error-container">Caja cerrada</p>
              <p className="text-body-md text-on-error-container/80">
                Debes abrir la caja para realizar ventas
              </p>
            </div>
            <button
              onClick={() => navigate("/caja/apertura")}
              className="ml-auto px-4 py-2 bg-secondary text-on-secondary rounded-xl hover:bg-secondary/90 transition-colors"
            >
              Abrir Caja
            </button>
          </div>
        </div>
      )}

      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
        {/* Héroe: ingreso neto del día */}
        <div className="md:col-span-2 bg-tertiary-fixed rounded-2xl p-6 shadow-sm flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-1">
            <CircleDollarSign className="w-5 h-5 text-on-surface-variant" />
            <span className="text-label-md font-semibold text-on-surface-variant">Ingreso neto del día</span>
          </div>
          <p className={`text-display-price leading-none tabular-nums ${
            (resumen?.consolidado.ingresoNeto ?? 0) > 0
              ? "text-on-surface"
              : (resumen?.consolidado.ingresoNeto ?? 0) < 0
                ? "text-error"
                : "text-on-surface-variant"
          }`}>
            {formatearMoneda(resumen?.consolidado.ingresoNeto ?? 0)}
          </p>
          <p className="mt-2 text-body-md text-on-surface-variant tabular-nums">
            Ingresos {formatearMoneda(resumen?.consolidado.ingresosBrutos ?? 0)} − egresos {formatearMoneda(resumen?.consolidado.egresosTotales ?? 0)}
          </p>
        </div>

        {/* Ventas mostrador */}
        <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm border border-outline-variant hover:shadow-md transition-shadow flex flex-col">
          <div className="flex items-center gap-2 mb-2">
            <ShoppingCart className="w-5 h-5 text-tertiary" />
            <span className="text-label-md font-semibold text-on-surface-variant">Ventas</span>
          </div>
          <p className="text-headline-md font-bold text-on-surface tabular-nums">
            {formatearMoneda(resumen?.ventasMostrador.total ?? 0)}
          </p>
          <div className="mt-2 space-y-0.5 text-caption">
            <LineaDato etiqueta="Efectivo" monto={resumen?.ventasMostrador.efectivo ?? 0} cantidad={resumen?.ventasMostrador.cantidadEfectivo ?? 0} />
            <LineaDato etiqueta="Transferencia" monto={resumen?.ventasMostrador.transferencia ?? 0} cantidad={resumen?.ventasMostrador.cantidadTransferencia ?? 0} />
          </div>
          <p className="mt-auto pt-2 text-caption text-on-surface-variant/70">
            {resumen?.ventasMostrador.cantidadTotal ?? 0} transacción{(resumen?.ventasMostrador.cantidadTotal ?? 0) === 1 ? "" : "es"}
          </p>
        </div>

        {/* Pedidos */}
        <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm border border-outline-variant hover:shadow-md transition-shadow flex flex-col">
          <div className="flex items-center gap-2 mb-2">
            <ClipboardList className="w-5 h-5 text-tertiary" />
            <span className="text-label-md font-semibold text-on-surface-variant">Pedidos</span>
          </div>
          <p className="text-headline-md font-bold text-on-surface tabular-nums">
            {formatearMoneda(resumen?.pedidos.total ?? 0)}
          </p>
          <div className="mt-2 space-y-0.5 text-caption">
            <LineaDato etiqueta="Efectivo" monto={resumen?.pedidos.efectivo ?? 0} cantidad={resumen?.pedidos.cantidadEfectivo ?? 0} />
            <LineaDato etiqueta="Transferencia" monto={resumen?.pedidos.transferencia ?? 0} cantidad={resumen?.pedidos.cantidadTransferencia ?? 0} />
          </div>
          <p className="mt-auto pt-2 text-caption text-on-surface-variant/70">{pedidosPendientes} pedido{pedidosPendientes === 1 ? "" : "s"} activos</p>
        </div>

        {/* Gastos */}
        <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm border border-outline-variant hover:shadow-md transition-shadow flex flex-col">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className={`w-5 h-5 ${(resumen?.gastos.total ?? 0) > 0 ? "text-error" : "text-on-surface-variant"}`} />
            <span className={`text-label-md font-semibold ${(resumen?.gastos.total ?? 0) > 0 ? "text-error" : "text-on-surface-variant"}`}>Gastos</span>
          </div>
          <p className={`text-headline-md font-bold tabular-nums ${(resumen?.gastos.total ?? 0) > 0 ? "text-error" : "text-on-surface-variant"}`}>
            {formatearMoneda(resumen?.gastos.total ?? 0)}
          </p>
          <div className="mt-2 space-y-0.5 text-caption">
            <LineaDato etiqueta="Caja" monto={resumen?.gastos.caja ?? 0} />
            <LineaDato etiqueta="Pedidos" monto={resumen?.gastos.pedidos ?? 0} />
          </div>
          <p className="mt-auto pt-2 text-caption text-on-surface-variant/70">
            {gastosCantidad} gasto{gastosCantidad === 1 ? "" : "s"}
          </p>
        </div>

        {/* Saldos pedidos */}
        <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm border border-outline-variant hover:shadow-md transition-shadow flex flex-col">
          <div className="flex items-center gap-2 mb-2">
            <Banknote className="w-5 h-5 text-tertiary" />
            <span className="text-label-md font-semibold text-on-surface-variant">Saldos pedidos</span>
          </div>
          <p className="text-headline-md font-bold text-on-surface tabular-nums">
            {formatearMoneda(resumen?.saldosPedidos.total ?? 0)}
          </p>
          <div className="mt-2 space-y-0.5 text-caption">
            <LineaDato etiqueta="Efectivo" monto={resumen?.saldosPedidos.efectivo ?? 0} cantidad={resumen?.saldosPedidos.cantidadEfectivo ?? 0} />
            <LineaDato etiqueta="Transferencia" monto={resumen?.saldosPedidos.transferencia ?? 0} cantidad={resumen?.saldosPedidos.cantidadTransferencia ?? 0} />
          </div>
          <p className="mt-auto pt-2 text-caption text-on-surface-variant/70">
            {resumen?.saldosPedidos.cantidadTotal ?? 0} transacción{(resumen?.saldosPedidos.cantidadTotal ?? 0) === 1 ? "" : "es"}
          </p>
        </div>
      </div>

      {/* Gastos de hoy */}
      {resumen && resumen.gastos.total > 0 && (
        <div className="mb-8 bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant">
          <div className="flex items-center gap-3 mb-4">
            <TrendingDown className="w-5 h-5 text-error" />
            <h2 className="text-headline-md font-semibold text-on-surface">Gastos de hoy</h2>
            <span className="ml-auto text-label-md font-bold text-error tabular-nums">
              {formatearMoneda(resumen.gastos.total)}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
            {resumen.gastos.porCategoria.length > 0 && (
              <div>
                <p className="text-label-md font-semibold text-on-surface-variant mb-2">Por categoría</p>
                <div className="space-y-1">
                  {resumen.gastos.porCategoria.map((cat) => (
                    <div key={cat.categoriaId} className="flex justify-between text-body-md text-on-surface">
                      <span>
                        {cat.categoriaNombre} <span className="text-caption text-on-surface-variant">({cat.cantidad})</span>
                      </span>
                      <span className="tabular-nums">{formatearMoneda(cat.total)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {resumen.gastos.detalle && resumen.gastos.detalle.length > 0 && (
              <div>
                <p className="text-label-md font-semibold text-on-surface-variant mb-2">Detalle</p>
                <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                  {resumen.gastos.detalle.map((g) => (
                    <div key={g.id} className="flex justify-between text-body-md text-on-surface gap-2">
                      <span className="truncate">{g.descripcion}</span>
                      <span className="whitespace-nowrap tabular-nums">{formatearMoneda(g.monto)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Accesos rápidos */}
      <div className="mb-8">
        <h2 className="text-headline-md font-semibold text-on-surface mb-4">Accesos Rápidos</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button
            onClick={() => navigate("/venta")}
            className="flex items-center gap-2.5 px-4 py-3 bg-secondary text-on-secondary rounded-xl hover:bg-secondary/90 active:scale-[0.98] transition-all shadow-sm"
          >
            <ShoppingCart className="w-5 h-5 shrink-0" />
            <span className="font-medium whitespace-nowrap">Nueva Venta</span>
          </button>
          <button
            onClick={() => navigate("/pedidos/nuevo")}
            className="flex items-center gap-2.5 px-4 py-3 bg-tertiary text-on-tertiary rounded-xl hover:bg-tertiary/90 active:scale-[0.98] transition-all shadow-sm"
          >
            <ClipboardList className="w-5 h-5 shrink-0" />
            <span className="font-medium whitespace-nowrap">Nuevo Pedido</span>
          </button>
          <button
            onClick={() => navigate("/stock")}
            className="flex items-center gap-2.5 px-4 py-3 bg-surface-container text-on-surface rounded-xl hover:bg-surface-container-high transition-all"
          >
            <Package className="w-5 h-5 shrink-0" />
            <span className="font-medium">Stock</span>
          </button>
          <button
            onClick={() => navigate("/reportes")}
            className="flex items-center gap-2.5 px-4 py-3 bg-surface-container text-on-surface rounded-xl hover:bg-surface-container-high transition-all"
          >
            <BarChart3 className="w-5 h-5 shrink-0" />
            <span className="font-medium">Reportes</span>
          </button>
        </div>
      </div>

      {/* Resumen de pedidos pendientes */}
      <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm border border-outline-variant flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <ClipboardList className="w-5 h-5 shrink-0 text-on-surface-variant" />
          <div className="min-w-0">
            <p className="text-label-md font-semibold text-on-surface">Pedidos Pendientes</p>
            <p className="text-body-md text-on-surface-variant truncate">
              {pedidosPendientes === 0 ? (
                "No hay pedidos pendientes"
              ) : (
                <>
                  <span className="font-semibold text-on-surface tabular-nums">{pedidosPendientes}</span> pedido{pedidosPendientes === 1 ? "" : "s"} activos
                </>
              )}
            </p>
          </div>
        </div>
        {pedidosPendientes > 0 && (
          <button
            onClick={() => navigate("/pedidos")}
            className="px-4 py-2 text-label-md font-medium text-secondary hover:text-secondary/80 transition-colors whitespace-nowrap"
          >
            Ver todos →
          </button>
        )}
      </div>

      {/* Pendientes de revisión */}
      {(diferenciasStock.length > 0 || cierresPendientes.length > 0) && (
        <div className="mt-6 bg-error-container/30 rounded-2xl p-6 shadow-sm border border-error/20">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="w-6 h-6 text-error" />
            <h2 className="text-headline-md font-semibold text-on-surface">Pendientes de revisión</h2>
          </div>
          <p className="text-body-md text-on-surface-variant mb-4">
            Movimientos que requieren tu atención antes del siguiente cierre.
          </p>

          {diferenciasStock.length > 0 && (
            <div className="mb-4">
              <p className="text-label-md font-semibold text-on-surface mb-2">Diferencias de stock</p>
              <div className="space-y-2">
                {diferenciasStock.map((d) => (
                  <div key={`${d.productoId}-${d.unidad}`} className="flex justify-between items-center p-3 bg-surface-container-lowest rounded-xl border border-outline-variant/50">
                    <div>
                      <p className="font-medium text-on-surface">{d.productoNombre}</p>
                      <p className="text-caption text-on-surface-variant tabular-nums">
                        {d.unidad === "entero" ? "Entero" : "Porción"} • Esperado: {d.esperado} • Conteo: {d.conteoFisico}
                      </p>
                    </div>
                    <span className={`text-body-md font-bold tabular-nums ${d.diferencia < 0 ? "text-error" : "text-tertiary"}`}>
                      {d.diferencia > 0 ? "+" : ""}{d.diferencia}
                    </span>
                  </div>
                ))}
              </div>
              <button
                onClick={() => navigate("/stock")}
                className="mt-3 px-4 py-2 text-label-md font-medium text-on-surface-variant hover:text-on-surface transition-colors"
              >
                Ver stock →
              </button>
            </div>
          )}

          {cierresPendientes.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Search className="w-4 h-4 text-error" />
                <p className="text-label-md font-semibold text-on-surface">Cierres de caja</p>
              </div>
              <div className="space-y-2">
                {cierresPendientes.map((c) => (
                  <div key={c.id} className="flex justify-between items-center p-3 bg-surface-container-lowest rounded-xl border border-outline-variant/50">
                    <div>
                      <p className="font-medium text-on-surface">{c.cajeroNombre}</p>
                      <p className="text-caption text-on-surface-variant">
                        {c.fechaApertura}
                        {c.tieneDiferenciaStock && " • Diferencia de stock"}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`font-bold tabular-nums ${c.diferenciaEfectivo !== 0 ? "text-error" : "text-on-surface-variant"}`}>
                        {formatearMoneda(Math.abs(c.diferenciaEfectivo))}
                      </span>
                      <button
                        onClick={() => navigate("/reportes")}
                        className="px-3 py-1 text-xs bg-secondary text-on-secondary rounded-lg hover:bg-secondary/90 transition-colors"
                      >
                        Revisar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Resumen de nómina del mes */}
      {resumenNomina && resumenNomina.empleados.length > 0 && (
        <div className="mt-6 bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant">
          <div className="flex items-center gap-3 mb-4">
            <Users className="w-6 h-6 text-secondary" />
            <h2 className="text-headline-md font-semibold text-on-surface">Nómina del Mes</h2>
            <button
              onClick={() => navigate("/nomina")}
              className="ml-auto text-label-md font-medium text-secondary hover:text-secondary/80 transition-colors"
            >
              Ver nómina completa →
            </button>
          </div>
          <div className="flex gap-8 mb-4">
            <div>
              <p className="text-caption text-on-surface-variant">Adelantos</p>
              <p className={`text-headline-md font-bold tabular-nums ${resumenNomina.totalAdelantos > 0 ? "text-on-surface" : "text-on-surface-variant/60"}`}>
                {formatearMoneda(resumenNomina.totalAdelantos)}
              </p>
            </div>
            <div>
              <p className="text-caption text-on-surface-variant">Multas</p>
              <p className={`text-headline-md font-bold tabular-nums ${resumenNomina.totalMultas > 0 ? "text-error" : "text-on-surface-variant/60"}`}>
                {formatearMoneda(resumenNomina.totalMultas)}
              </p>
            </div>
          </div>
          <table className="w-full text-body-md">
            <thead>
              <tr className="text-caption uppercase text-on-surface-variant">
                <th className="text-left font-medium pb-2">Empleado</th>
                <th className="text-right font-medium pb-2">Adelantos</th>
                <th className="text-right font-medium pb-2">Multas</th>
              </tr>
            </thead>
            <tbody>
              {resumenNomina.empleados.map((emp) => (
                <tr key={emp.id} className="border-t border-outline-variant/50">
                  <td className="py-2.5 text-on-surface">{emp.nombre}</td>
                  <td className={`py-2.5 text-right tabular-nums ${emp.adelantos > 0 ? "text-on-surface" : "text-on-surface-variant/60"}`}>
                    {emp.adelantos > 0 ? formatearMoneda(emp.adelantos) : "—"}
                  </td>
                  <td className={`py-2.5 text-right tabular-nums ${emp.multas > 0 ? "text-error font-medium" : "text-on-surface-variant/60"}`}>
                    {emp.multas > 0 ? formatearMoneda(emp.multas) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
