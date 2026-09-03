import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../../store/auth";
import { ClipboardList } from "lucide-react";

interface Pedido {
  id: number;
  cliente: string;
  telefono: string | null;
  fechaEntrega: string;
  estado: string;
  totalEstimado: number;
  saldoPendiente: number;
}

const coloresEstado: Record<string, string> = {
  pendiente: "bg-surface-container text-on-surface",
  en_proceso: "bg-secondary/20 text-on-surface",
  listo: "bg-tertiary/20 text-tertiary",
  entregado: "bg-tertiary text-on-secondary",
  cancelado: "bg-error/20 text-error",
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
      setPedidos(data);
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
        <h1 className="text-xl font-bold text-on-surface">Pedidos</h1>
        {esAdmin && (
          <button
            onClick={() => navigate("/movil/pedidos/nuevo")}
            className="px-3 py-2 bg-secondary text-on-secondary rounded-xl text-sm"
          >
            + Nuevo
          </button>
        )}
      </div>

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
              ? "Todos"
              : estado.replace("_", " ")}
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
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-medium text-on-surface">{pedido.cliente}</p>
                  <p className="text-sm text-on-surface-variant">#{pedido.id}</p>
                </div>
                <span
                  className={`px-2 py-1 rounded-full text-xs ${
                    coloresEstado[pedido.estado] || "bg-surface-container text-on-surface"
                  }`}
                >
                  {pedido.estado.replace("_", " ")}
                </span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-on-surface-variant">
                  Entrega:{" "}
                  {new Date(pedido.fechaEntrega).toLocaleDateString("es-EC", {
                    day: "2-digit",
                    month: "short",
                  })}
                </span>
                {esAdmin && (
                  <span className="font-medium text-on-surface">
                    ${pedido.totalEstimado.toFixed(2)}
                  </span>
                )}
              </div>

              {esAdmin && pedido.saldoPendiente > 0 && (
                <p className="mt-2 text-sm text-error">
                  Saldo: ${pedido.saldoPendiente.toFixed(2)}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
