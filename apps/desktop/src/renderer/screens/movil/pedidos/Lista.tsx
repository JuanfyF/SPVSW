import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../../store/auth";
import { formatearMoneda, formatearFecha } from "@pos/shared";
import { ClipboardList, CalendarDays, Check, Phone } from "lucide-react";

interface Pedido {
  id: number;
  cliente: string;
  telefono: string | null;
  fechaEntrega: string;
  estado: string;
  anticipo: number;
  totalEstimado: number;
  saldoPendiente: number;
  descripcion?: string | null;
}

const coloresEstado: Record<string, string> = {
  pendiente: "bg-surface-container text-on-surface",
  en_proceso: "bg-secondary/20 text-on-surface",
  listo: "bg-tertiary/20 text-tertiary",
  entregado: "bg-tertiary text-on-secondary",
  cancelado: "bg-error/20 text-error",
};

const formatearEstado = (estado: string) => {
  const texto = estado.replace("_", " ");
  return texto.charAt(0).toUpperCase() + texto.slice(1);
};

export default function Lista() {
  const navigate = useNavigate();
  const { usuario } = useAuthStore();
  const esAdmin = usuario?.rol === "propietario" || usuario?.rol === "cajero";
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    cargarPedidos();
  }, []);

  const cargarPedidos = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await window.pos.pedidos.listarActivos();
      if (data.length > 0) {
        const pedidosConDescripcion = await Promise.all(
          data.map(async (p) => {
            try {
              const detalles = (await window.pos.pedidos.obtenerDetalle(p.id)) as any[];
              const descripcion = detalles
                .map((d: any) => d.descripcionPersonalizada || d.nombre || "")
                .filter(Boolean)
                .join(" | ");
              return { ...p, descripcion };
            } catch {
              return p;
            }
          })
        );
        setPedidos(pedidosConDescripcion);
      } else {
        setPedidos(data);
      }
    } catch (err: any) {
      setError("Error al cargar pedidos");
      console.error("Error al cargar pedidos:", err);
    } finally {
      setLoading(false);
    }
  };

  const pedidosFiltrados = pedidos.filter(
    (p) => filtroEstado === "todos" || p.estado === filtroEstado
  );

  const resumen = pedidosFiltrados.reduce(
    (acc, p) => {
      acc.porCobrar += p.saldoPendiente > 0 ? p.saldoPendiente : 0;
      acc.cobrado += p.totalEstimado - p.saldoPendiente;
      return acc;
    },
    { porCobrar: 0, cobrado: 0 }
  );

  const conteos: Record<string, number> = { todos: pedidos.length };
  pedidos.forEach((p) => {
    conteos[p.estado] = (conteos[p.estado] || 0) + 1;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-on-surface-variant">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-xl font-bold text-on-surface">Pedidos</h1>
          <p className="text-sm text-on-surface-variant">
            {pedidosFiltrados.length} pedidos
          </p>
        </div>
        {esAdmin && (
          <button
            onClick={() => navigate("/movil/pedidos/nuevo")}
            className="px-3 py-2 bg-secondary text-on-secondary rounded-xl text-sm"
          >
            + Nuevo
          </button>
        )}
      </div>

      {/* Franja de resumen */}
      {esAdmin && pedidosFiltrados.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-surface-container-lowest rounded-xl p-3 shadow-sm border border-outline-variant">
            <p className="text-caption text-on-surface-variant">Por cobrar</p>
            <p
              className={`text-base font-semibold tabular-nums ${
                resumen.porCobrar > 0 ? "text-error" : "text-on-surface-variant/60"
              }`}
            >
              {formatearMoneda(resumen.porCobrar)}
            </p>
          </div>
          <div className="bg-surface-container-lowest rounded-xl p-3 shadow-sm border border-outline-variant">
            <p className="text-caption text-on-surface-variant">Cobrado</p>
            <p
              className={`text-base font-semibold tabular-nums ${
                resumen.cobrado > 0 ? "text-on-surface" : "text-on-surface-variant/60"
              }`}
            >
              {formatearMoneda(resumen.cobrado)}
            </p>
          </div>
          <div className="bg-surface-container-lowest rounded-xl p-3 shadow-sm border border-outline-variant">
            <p className="text-caption text-on-surface-variant">Pedidos</p>
            <p className="text-base font-semibold text-on-surface tabular-nums">
              {pedidosFiltrados.length}
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-error-container text-on-error-container rounded-xl text-sm">
          {error}
          <button onClick={cargarPedidos} className="ml-2 underline">Reintentar</button>
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-2 mb-4 overflow-x-auto">
        {["todos", "pendiente", "en_proceso", "listo"].map((estado) => (
          <button
            key={estado}
            onClick={() => setFiltroEstado(estado)}
            className={`px-3 py-1 rounded-full text-sm whitespace-nowrap ${
              filtroEstado === estado
                ? "bg-secondary text-on-secondary"
                : "bg-surface-container text-on-surface"
            }`}
          >
            {estado === "todos"
              ? `Todos (${conteos.todos ?? 0})`
              : `${formatearEstado(estado)} (${conteos[estado] ?? 0})`}
          </button>
        ))}
      </div>

      {/* Lista */}
      {pedidosFiltrados.length === 0 ? (
        <div className="text-center py-12">
          <ClipboardList className="w-10 h-10 text-on-surface-variant" />
          <p className="mt-4 text-on-surface-variant">No hay pedidos</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pedidosFiltrados.map((pedido) => (
            <div
              key={pedido.id}
              onClick={() => navigate(`/movil/pedidos/${pedido.id}`)}
              className="bg-surface-container-lowest p-4 rounded-xl shadow-sm border border-outline-variant"
            >
              <div className="flex justify-between items-start gap-2">
                <div className="min-w-0">
                  <p className="text-caption text-on-surface-variant">#{pedido.id}</p>
                  <p className="text-base font-semibold text-on-surface truncate">
                    {pedido.cliente}
                  </p>
                  {pedido.descripcion && (
                    <p className="text-xs text-on-surface-variant truncate">
                      {pedido.descripcion}
                    </p>
                  )}
                </div>
                <span
                  className={`shrink-0 px-2 py-1 rounded-full text-xs ${
                    coloresEstado[pedido.estado] || "bg-surface-container text-on-surface"
                  }`}
                >
                  {formatearEstado(pedido.estado)}
                </span>
              </div>

              <div className="mt-2 flex justify-between items-center gap-2">
                <span className="text-xs text-on-surface-variant flex items-center gap-1 min-w-0">
                  <CalendarDays className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">
                    {new Date(pedido.fechaEntrega + "T12:00:00").toLocaleDateString("es-EC", {
                      day: "2-digit",
                      month: "short",
                    })}
                  </span>
                  {pedido.fechaEntrega === formatearFecha(new Date()) && (
                    <span className="px-1.5 py-0.5 rounded-full bg-secondary/15 text-secondary text-xs font-medium">
                      Hoy
                    </span>
                  )}
                </span>
                {esAdmin && (
                  <span className="text-sm font-semibold text-on-surface tabular-nums shrink-0">
                    {formatearMoneda(pedido.totalEstimado)}
                  </span>
                )}
              </div>

              {esAdmin && (
                <div
                  className={`mt-2 flex justify-between items-center px-3 py-2 rounded-xl ${
                    pedido.saldoPendiente > 0 ? "bg-error-container/40" : "bg-tertiary-fixed"
                  }`}
                >
                  <span
                    className={`text-xs font-medium flex items-center gap-1 ${
                      pedido.saldoPendiente > 0
                        ? "text-on-error-container"
                        : "text-on-tertiary-container"
                    }`}
                  >
                    {pedido.saldoPendiente > 0 ? "Saldo pendiente" : "Pagado"}
                    {pedido.saldoPendiente <= 0 && <Check className="w-3.5 h-3.5" />}
                  </span>
                  {pedido.saldoPendiente > 0 && (
                    <span className="text-base font-bold text-error tabular-nums">
                      {formatearMoneda(pedido.saldoPendiente)}
                    </span>
                  )}
                </div>
              )}

              {pedido.telefono && (
                <p className="mt-2 text-xs text-on-surface-variant flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5" />
                  <span className="tabular-nums">{pedido.telefono}</span>
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
