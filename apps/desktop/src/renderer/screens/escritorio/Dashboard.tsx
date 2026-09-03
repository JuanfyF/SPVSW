import { useEffect, useState, useCallback, useRef } from "react";
import { formatearFecha } from "@pos/shared";
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
  ventas: {
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
  consolidado: {
    ingresosBrutos: number;
    egresosTotales: number;
    ingresoNeto: number;
  };
  devoluciones?: {
    efectivo: number; transferencia: number; total: number;
  };
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
    const interval = setInterval(handleRefresh, 3000);
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        {/* Ventas mostrador */}
        <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between gap-3 mb-4">
            <ShoppingCart className="w-8 h-8 text-tertiary" />
            <span className="text-label-md text-tertiary font-medium">Ventas</span>
          </div>
          <p className="text-headline-lg font-bold text-on-surface">
            ${resumen?.ventasMostrador.total.toFixed(2) ?? "0.00"}
          </p>
          <div className="mt-2 text-body-md text-on-surface-variant">
            <p>Efectivo: ${resumen?.ventasMostrador.efectivo.toFixed(2) ?? "0.00"} ({resumen?.ventasMostrador.cantidadEfectivo ?? 0})</p>
            <p>Transferencia: ${resumen?.ventasMostrador.transferencia.toFixed(2) ?? "0.00"} ({resumen?.ventasMostrador.cantidadTransferencia ?? 0})</p>
          </div>
          <p className="mt-2 text-caption text-on-surface-variant">{resumen?.ventasMostrador.cantidadTotal ?? 0} transacciones</p>
        </div>

        {/* Saldos pedidos */}
        <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between gap-3 mb-4">
            <Banknote className="w-8 h-8 text-tertiary" />
            <span className="text-label-md text-tertiary font-medium">Saldos pedidos</span>
          </div>
          <p className="text-headline-lg font-bold text-on-surface">
            ${resumen?.saldosPedidos.total.toFixed(2) ?? "0.00"}
          </p>
          <div className="mt-2 text-body-md text-on-surface-variant">
            <p>Efectivo: ${resumen?.saldosPedidos.efectivo.toFixed(2) ?? "0.00"} ({resumen?.saldosPedidos.cantidadEfectivo ?? 0})</p>
            <p>Transferencia: ${resumen?.saldosPedidos.transferencia.toFixed(2) ?? "0.00"} ({resumen?.saldosPedidos.cantidadTransferencia ?? 0})</p>
          </div>
          <p className="mt-2 text-caption text-on-surface-variant">{resumen?.saldosPedidos.cantidadTotal ?? 0} transacciones</p>
        </div>

        {/* Pedidos */}
        <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between gap-3 mb-4">
            <ClipboardList className="w-8 h-8 text-tertiary" />
            <span className="text-label-md text-tertiary font-medium">Pedidos</span>
          </div>
          <p className="text-headline-lg font-bold text-on-surface">
            ${resumen?.pedidos.total.toFixed(2) ?? "0.00"}
          </p>
          <div className="mt-2 text-body-md text-on-surface-variant">
            <p>Efectivo: ${resumen?.pedidos.efectivo.toFixed(2) ?? "0.00"} ({resumen?.pedidos.cantidadEfectivo ?? 0})</p>
            <p>Transferencia: ${resumen?.pedidos.transferencia.toFixed(2) ?? "0.00"} ({resumen?.pedidos.cantidadTransferencia ?? 0})</p>
          </div>
          <p className="mt-2 text-caption text-on-surface-variant">{pedidosPendientes} pedidos activos</p>
        </div>

        {/* Gastos */}
        <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between gap-3 mb-4">
            <TrendingDown className="w-8 h-8 text-error" />
            <span className="text-label-md text-error font-medium">Gastos</span>
          </div>
          <p className="text-headline-lg font-bold text-error">
            ${resumen?.gastos.total.toFixed(2) ?? "0.00"}
          </p>
          <div className="mt-2 text-body-md text-on-surface-variant">
            <p>Caja: ${resumen?.gastos.caja.toFixed(2) ?? "0.00"}</p>
            <p>Pedidos: ${resumen?.gastos.pedidos.toFixed(2) ?? "0.00"}</p>
          </div>
          {resumen?.gastos.detalle && resumen.gastos.detalle.length > 0 && (
            <div className="mt-3 pt-3 border-t border-outline-variant max-h-32 overflow-y-auto">
              {resumen.gastos.detalle.map((g) => (
                <div key={g.id} className="flex justify-between text-caption text-on-surface-variant py-0.5">
                  <span className="truncate mr-2">{g.descripcion}</span>
                  <span className="whitespace-nowrap">${g.monto.toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
          {resumen?.gastos.porCategoria && resumen.gastos.porCategoria.length > 0 && (
            <div className="mt-3 pt-3 border-t border-outline-variant">
              <p className="text-caption font-medium text-on-surface-variant mb-1">Por categoría:</p>
              {resumen.gastos.porCategoria.map((cat) => (
                <div key={cat.categoriaId} className="flex justify-between text-caption text-on-surface-variant">
                  <span>{cat.categoriaNombre} ({cat.cantidad})</span>
                  <span>${cat.total.toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Ingreso neto */}
        <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between gap-3 mb-4">
            <CircleDollarSign className="w-8 h-8 text-tertiary" />
            <span className="text-label-md text-tertiary font-medium">Ingreso Neto</span>
          </div>
          <p className={`text-headline-lg font-bold ${
            (resumen?.consolidado.ingresoNeto ?? 0) >= 0
              ? "text-tertiary"
              : "text-error"
          }`}>
            ${resumen?.consolidado.ingresoNeto.toFixed(2) ?? "0.00"}
          </p>
          <p className="mt-2 text-body-md text-on-surface-variant">ingreso del día</p>
        </div>
      </div>

      {/* Accesos rápidos */}
      <div className="mb-8">
        <h2 className="text-headline-md font-semibold text-on-surface mb-4">Accesos Rápidos</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button
            onClick={() => navigate("/venta")}
            className="p-4 bg-secondary text-on-secondary rounded-2xl hover:bg-secondary/90 active:scale-[0.98] transition-all shadow-sm"
          >
            <ShoppingCart className="w-6 h-6 mb-2" />
            <span className="font-medium">Nueva Venta</span>
          </button>
          <button
            onClick={() => navigate("/pedidos/nuevo")}
            className="p-4 bg-tertiary text-on-tertiary rounded-2xl hover:bg-tertiary/90 active:scale-[0.98] transition-all shadow-sm"
          >
            <ClipboardList className="w-6 h-6 mb-2" />
            <span className="font-medium">Nuevo Pedido</span>
          </button>
          <button
            onClick={() => navigate("/stock")}
            className="p-4 bg-surface-container text-on-surface rounded-2xl hover:bg-surface-container-high transition-all"
          >
            <Package className="w-6 h-6 mb-2" />
            <span className="font-medium">Stock</span>
          </button>
          <button
            onClick={() => navigate("/reportes")}
            className="p-4 bg-surface-container text-on-surface rounded-2xl hover:bg-surface-container-high transition-all"
          >
            <BarChart3 className="w-6 h-6 mb-2" />
            <span className="font-medium">Reportes</span>
          </button>
        </div>
      </div>

      {/* Resumen de pedidos pendientes */}
      <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant">
        <h2 className="text-headline-md font-semibold text-on-surface mb-4">Pedidos Pendientes</h2>
        {pedidosPendientes === 0 ? (
          <div className="flex flex-col items-center py-4">
            <ClipboardList className="w-10 h-10 mb-2 text-on-surface-variant/40" />
            <p className="text-on-surface-variant text-center">
              No hay pedidos pendientes
            </p>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-4xl font-bold text-secondary">{pedidosPendientes}</p>
            <p className="text-on-surface-variant">pedidos activos</p>
            <button
              onClick={() => navigate("/pedidos")}
              className="mt-4 px-4 py-2 text-secondary hover:text-secondary/80 transition-colors"
            >
              Ver todos →
            </button>
          </div>
        )}
      </div>

      {/* Diferencias de stock pendientes */}
      {diferenciasStock.length > 0 && (
        <div className="mt-6 bg-surface-container rounded-2xl p-6 shadow-sm border border-outline-variant">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="w-6 h-6 text-error" />
            <h2 className="text-headline-md font-semibold text-on-surface">Diferencias de Stock Pendientes</h2>
          </div>
          <p className="text-body-md text-on-surface-variant mb-4">
            Se detectaron diferencias durante el cierre de caja. Revisa el conteo físico.
          </p>
          <div className="space-y-2">
            {diferenciasStock.map((d) => (
              <div key={`${d.productoId}-${d.unidad}`} className="flex justify-between items-center p-3 bg-surface-container-lowest rounded-xl border border-outline-variant/50">
                <div>
                  <p className="font-medium text-on-surface">{d.productoNombre}</p>
                  <p className="text-caption text-on-surface-variant">
                    {d.unidad === "entero" ? "Entero" : "Porción"} • Esperado: {d.esperado} • Conteo: {d.conteoFisico}
                  </p>
                </div>
                <span className={`text-lg font-bold ${d.diferencia < 0 ? "text-error" : "text-tertiary"}`}>
                  {d.diferencia > 0 ? "+" : ""}{d.diferencia}
                </span>
              </div>
            ))}
          </div>
          <button
            onClick={() => navigate("/stock")}
            className="mt-4 px-4 py-2 text-on-surface-variant hover:text-on-surface transition-colors"
          >
            Ver stock →
          </button>
        </div>
      )}

      {/* Cierres de caja con diferencias pendientes de revisión */}
      {cierresPendientes.length > 0 && (
        <div className="mt-6 bg-error-container/30 rounded-2xl p-6 shadow-sm border border-error/20">
          <div className="flex items-center gap-3 mb-4">
            <Search className="w-6 h-6 text-error" />
            <h2 className="text-headline-md font-semibold text-on-surface">Diferencias Pendientes de Revisión</h2>
          </div>
          <p className="text-body-md text-on-surface-variant mb-4">
            Cierres de caja con diferencias que aún no han sido revisados.
          </p>
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
                  <span className={`font-bold ${c.diferenciaEfectivo !== 0 ? "text-error" : "text-on-surface-variant"}`}>
                    ${Math.abs(c.diferenciaEfectivo).toFixed(2)}
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

      {/* Resumen de nómina del mes */}
      {resumenNomina && resumenNomina.empleados.length > 0 && (
        <div className="mt-6 bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant">
          <div className="flex items-center gap-3 mb-4">
            <Users className="w-6 h-6 text-secondary" />
            <h2 className="text-headline-md font-semibold text-on-surface">Nómina del Mes</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="p-3 bg-surface-container rounded-xl">
              <p className="text-caption text-on-surface-variant">Adelantos</p>
              <p className="text-headline-md font-bold text-on-surface">
                ${resumenNomina.totalAdelantos.toFixed(2)}
              </p>
            </div>
            <div className="p-3 bg-surface-container rounded-xl">
              <p className="text-caption text-on-surface-variant">Multas</p>
              <p className="text-headline-md font-bold text-error">
                ${resumenNomina.totalMultas.toFixed(2)}
              </p>
            </div>
          </div>
          <div className="space-y-2">
            {resumenNomina.empleados.map((emp) => (
              <div key={emp.id} className="flex justify-between items-center p-3 bg-surface-container-lowest rounded-xl border border-outline-variant/50">
                <p className="font-medium text-on-surface">{emp.nombre}</p>
                <div className="flex gap-4 text-caption">
                  {emp.adelantos > 0 && (
                    <span className="text-on-surface-variant">Adelantos: ${emp.adelantos.toFixed(2)}</span>
                  )}
                  {emp.multas > 0 && (
                    <span className="text-error">Multas: ${emp.multas.toFixed(2)}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={() => navigate("/nomina")}
            className="mt-4 px-4 py-2 text-on-surface-variant hover:text-on-surface transition-colors"
          >
            Ver nómina completa →
          </button>
        </div>
      )}
    </div>
  );
}
