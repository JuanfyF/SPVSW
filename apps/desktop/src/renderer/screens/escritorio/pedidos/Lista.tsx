import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  generarPdfPedidos,
  ListarPedidosFechaSchema,
  formatearFecha,
} from "@pos/shared";
import { ClipboardList, Phone } from "lucide-react";

interface Pedido {
  id: number;
  cliente: string;
  telefono: string | null;
  fechaPedido: string;
  fechaEntrega: string;
  estado: string;
  anticipo: number;
  totalEstimado: number;
  saldoPendiente: number;
  descripcion?: string | null;
  notas?: string | null;
}

const estados = [
  { valor: "todos", label: "Todos" },
  { valor: "pendiente", label: "Pendientes" },
  { valor: "en_proceso", label: "En Proceso" },
  { valor: "listo", label: "Listos" },
  { valor: "entregado", label: "Entregados" },
];

const coloresEstado: Record<string, string> = {
  pendiente: "bg-surface-container text-on-surface",
  en_proceso: "bg-secondary-container/30 text-secondary",
  listo: "bg-tertiary-fixed text-tertiary",
  entregado: "bg-tertiary text-on-tertiary",
  cancelado: "bg-error-container text-on-error-container",
};

const hoy = () => formatearFecha(new Date());

export default function Lista() {
  const navigate = useNavigate();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [busqueda, setBusqueda] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filtroFecha, setFiltroFecha] = useState<"hoy" | "rango" | "todos">("hoy");
  const [fechaInicio, setFechaInicio] = useState(hoy());
  const [fechaFin, setFechaFin] = useState(hoy());

  useEffect(() => {
    cargarPedidos();
  }, [filtroFecha, fechaInicio, fechaFin]);

  const cargarPedidos = async () => {
    setLoading(true);
    setError("");
    try {
      let data: Pedido[];
      if (filtroFecha === "hoy") {
        const h = hoy();
        data = await window.pos.pedidos.listarPorFecha(h, h);
      } else if (filtroFecha === "rango") {
        const validado = ListarPedidosFechaSchema.safeParse({
          fechaInicio,
          fechaFin,
        });
        if (!validado.success) {
          setError("Fechas inválidas. Use formato YYYY-MM-DD.");
          setLoading(false);
          return;
        }
        data = await window.pos.pedidos.listarPorFecha(
          validado.data.fechaInicio,
          validado.data.fechaFin
        );
      } else {
        data = await window.pos.pedidos.listarTodos();
      }

      // Cargar detalles para cada pedido (descripción)
      if (data.length > 0) {
        const pedidosConDescripcion = await Promise.all(
          data.map(async (p) => {
            try {
              const detalles = await window.pos.pedidos.obtenerDetalle(p.id) as any[];
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
    } catch (err) {
      console.error("Error al cargar pedidos:", err);
      setError("Error al cargar pedidos");
    } finally {
      setLoading(false);
    }
  };

  const pedidosFiltrados = pedidos.filter((p) => {
    const coincideEstado =
      filtroEstado === "todos" || p.estado === filtroEstado;
    const coincideBusqueda =
      p.cliente.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.id.toString().includes(busqueda);
    return coincideEstado && coincideBusqueda;
  });

  const formatearFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString("es-EC", {
      day: "2-digit",
      month: "short",
    });
  };

  const exportarPdf = async () => {
    if (pedidosFiltrados.length === 0) return;
    try {
      await generarPdfPedidos({
        pedidos: pedidosFiltrados.map(p => ({
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
      console.error("Error al generar PDF:", err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-on-surface-variant">Cargando...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="p-4 bg-error-container text-on-error-container rounded-xl">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-headline-lg font-bold text-on-surface">Pedidos</h1>
          <p className="text-on-surface-variant">{pedidosFiltrados.length} pedidos {filtroFecha === "hoy" ? "de hoy" : filtroFecha === "rango" ? "en rango" : "activos"}</p>
        </div>
        <button
          onClick={() => navigate("/pedidos/nuevo")}
          className="px-4 py-2 bg-secondary text-on-secondary rounded-xl hover:bg-secondary/90 transition-colors"
        >
          + Nuevo Pedido
        </button>
      </div>

      {/* Filtros de fecha */}
      <div className="flex items-end gap-4 mb-4">
        <div className="flex gap-2">
          <button
            onClick={() => setFiltroFecha("hoy")}
            className={`px-4 py-2 rounded-xl transition-colors ${
              filtroFecha === "hoy"
                ? "bg-secondary text-on-secondary"
                : "bg-surface-container text-on-surface-variant"
            }`}
          >
            Hoy
          </button>
          <button
            onClick={() => setFiltroFecha("rango")}
            className={`px-4 py-2 rounded-xl transition-colors ${
              filtroFecha === "rango"
                ? "bg-secondary text-on-secondary"
                : "bg-surface-container text-on-surface-variant"
            }`}
          >
            Por Rango
          </button>
          <button
            onClick={() => setFiltroFecha("todos")}
            className={`px-4 py-2 rounded-xl transition-colors ${
              filtroFecha === "todos"
                ? "bg-secondary text-on-secondary"
                : "bg-surface-container text-on-surface-variant"
            }`}
          >
            Todos
          </button>
        </div>

        {filtroFecha === "rango" && (
          <>
            <div>
              <label className="block text-label-md text-on-surface-variant mb-1">Desde</label>
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="px-3 py-2 border border-outline-variant rounded-xl focus:outline-none focus:border-secondary bg-surface-container-lowest"
              />
            </div>
            <div>
              <label className="block text-label-md text-on-surface-variant mb-1">Hasta</label>
              <input
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                className="px-3 py-2 border border-outline-variant rounded-xl focus:outline-none focus:border-secondary bg-surface-container-lowest"
              />
            </div>
          </>
        )}

        <button
          onClick={exportarPdf}
          disabled={pedidosFiltrados.length === 0}
          className="px-4 py-2 bg-primary text-on-primary rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          Descargar PDF
        </button>
      </div>

      {/* Búsqueda + filtro estado */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Buscar por cliente o #pedido..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full px-4 py-3 border border-outline-variant rounded-xl focus:outline-none focus:border-secondary bg-surface-container-lowest"
          />
        </div>
        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
          className="px-4 py-3 border border-outline-variant rounded-xl focus:outline-none focus:border-secondary bg-surface-container-lowest"
        >
          {estados.map((e) => (
            <option key={e.valor} value={e.valor}>
              {e.label}
            </option>
          ))}
        </select>
      </div>

      {/* Lista de pedidos */}
      {pedidosFiltrados.length === 0 ? (
        <div className="text-center py-12">
          <ClipboardList className="w-10 h-10 text-on-surface-variant" />
          <p className="mt-4 text-on-surface-variant">No hay pedidos para mostrar</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pedidosFiltrados.map((pedido) => (
            <div
              key={pedido.id}
              onClick={() => navigate(`/pedidos/${pedido.id}`)}
              className="bg-surface-container-lowest rounded-2xl p-4 shadow-sm border border-outline-variant cursor-pointer hover:border-secondary/50 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="text-label-md text-on-surface-variant">#{pedido.id}</p>
                  <p className="font-medium text-on-surface">{pedido.cliente}</p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-caption font-medium ${
                    coloresEstado[pedido.estado] || "bg-surface-container text-on-surface-variant"
                  }`}
                >
                  {pedido.estado.replace("_", " ")}
                </span>
              </div>

              <div className="space-y-2 text-label-md">
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Entrega:</span>
                  <span className="text-on-surface">
                    {formatearFecha(pedido.fechaEntrega)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Total:</span>
                  <span className="text-on-surface font-medium">
                    ${pedido.totalEstimado.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-on-surface-variant">Saldo:</span>
                  <div className="flex items-center gap-2">
                    {pedido.saldoPendiente <= 0 && (
                      <span className="text-caption font-medium px-2 py-1 rounded-full bg-tertiary-container text-on-tertiary-container">
                        Pago completo
                      </span>
                    )}
                    <span
                      className={`font-medium ${
                        pedido.saldoPendiente > 0 ? "text-error" : "text-tertiary"
                      }`}
                    >
                      ${pedido.saldoPendiente.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {pedido.telefono && (
                <p className="mt-3 text-label-md text-on-surface-variant flex items-center gap-1">
                  <Phone className="w-4 h-4" /> {pedido.telefono}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
