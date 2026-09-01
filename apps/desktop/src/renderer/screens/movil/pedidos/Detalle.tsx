import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ConfirmModal from "../../../components/ConfirmModal";
import { useAuthStore } from "../../../store/auth";

interface Pedido {
  id: number;
  cliente: string;
  telefono: string | null;
  fechaEntrega: string;
  estado: string;
  anticipo: number;
  totalEstimado: number;
  saldoPendiente: number;
  notas: string | null;
}

interface DetallePedido {
  id: number;
  productoId: number | null;
  descripcionPersonalizada: string | null;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

interface Producto {
  id: number;
  nombre: string;
  categoria: string | null;
}

const coloresEstado: Record<string, string> = {
  pendiente: "bg-surface-container text-on-surface",
  en_proceso: "bg-secondary/20 text-on-surface",
  listo: "bg-tertiary/20 text-tertiary",
  entregado: "bg-tertiary text-on-secondary",
  cancelado: "bg-error/20 text-error",
};

export default function Detalle() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { usuario } = useAuthStore();
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [detalles, setDetalles] = useState<DetallePedido[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [accionLoading, setAccionLoading] = useState(false);
  const [error, setError] = useState("");
  const [modalMarcarListo, setModalMarcarListo] = useState(false);
  const [modalMarcarEnProceso, setModalMarcarEnProceso] = useState(false);
  const [modalEntregar, setModalEntregar] = useState(false);
  const pedidoVersionRef = useRef(0);

  const esPastelera = usuario?.rol === "pastelera";

  useEffect(() => {
    if (id) cargarPedido(parseInt(id, 10));
  }, [id]);

  const cargarPedido = async (pedidoId: number) => {
    const version = ++pedidoVersionRef.current;
    try {
      const [pedidoData, detallesData, productosData] = await Promise.all([
        window.pos.pedidos.obtenerPorId(pedidoId),
        window.pos.pedidos.obtenerDetalle(pedidoId),
        window.pos.productos.listar(),
      ]);
      if (version !== pedidoVersionRef.current) return;
      setPedido(pedidoData);
      setDetalles(detallesData);
      setProductos(productosData);
    } catch (err) {
      console.error("Error al cargar pedido:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarcarListo = () => {
    setModalMarcarListo(true);
  };

  const confirmarMarcarListo = async () => {
    if (!pedido) return;
    setAccionLoading(true);
    setModalMarcarListo(false);
    try {
      await window.pos.pedidos.marcarListo(pedido.id);
      await cargarPedido(pedido.id);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAccionLoading(false);
    }
  };

  const handleMarcarEnProceso = () => {
    setModalMarcarEnProceso(true);
  };

  const confirmarEnProceso = async () => {
    if (!pedido) return;
    setAccionLoading(true);
    setModalMarcarEnProceso(false);
    try {
      await window.pos.pedidos.actualizarEstado(pedido.id, "en_proceso");
      await cargarPedido(pedido.id);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAccionLoading(false);
    }
  };

  const handleEntregar = () => {
    setModalEntregar(true);
  };

  const confirmarEntregar = async () => {
    if (!pedido) return;
    setAccionLoading(true);
    setModalEntregar(false);
    try {
      await window.pos.pedidos.entregar(pedido.id);
      await cargarPedido(pedido.id);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAccionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-on-surface-variant">Cargando...</div>
      </div>
    );
  }

  if (!pedido) {
    return (
      <div className="p-4 text-center">
        <p className="text-on-surface-variant">Pedido no encontrado</p>
        <button
          onClick={() => navigate("/movil/pedidos")}
          className="mt-4 text-secondary"
        >
          Volver
        </button>
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* Header */}
      <div className="mb-4">
        <button
          onClick={() => navigate("/movil/pedidos")}
          className="text-on-surface-variant mb-2"
        >
          ← Volver
        </button>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-xl font-bold text-on-surface">
              Pedido #{pedido.id}
            </h1>
            <p className="text-on-surface-variant">{pedido.cliente}</p>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-sm ${
              coloresEstado[pedido.estado] || "bg-surface-container text-on-surface"
            }`}
          >
            {pedido.estado.replace("_", " ")}
          </span>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-error/10 text-error rounded-xl flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError("")} className="text-error hover:text-error/80">×</button>
        </div>
      )}

      {/* Info */}
      <div className="bg-surface-container-lowest p-4 rounded-xl mb-4">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-on-surface-variant">Entrega:</span>
            <span className="text-on-surface">
              {new Date(pedido.fechaEntrega).toLocaleDateString("es-EC", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </span>
          </div>
          {pedido.telefono && !esPastelera && (
            <div className="flex justify-between">
              <span className="text-on-surface-variant">Teléfono:</span>
              <span className="text-on-surface">📱 {pedido.telefono}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-on-surface-variant">Total:</span>
            <span className="font-medium text-on-surface">
              ${pedido.totalEstimado.toFixed(2)}
            </span>
          </div>
          {!esPastelera && (
            <>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Anticipo:</span>
                <span className="text-tertiary">${pedido.anticipo.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Saldo:</span>
                <span
                  className={`font-medium ${
                    pedido.saldoPendiente > 0 ? "text-error" : "text-tertiary"
                  }`}
                >
                  ${pedido.saldoPendiente.toFixed(2)}
                </span>
              </div>
            </>
          )}
        </div>

        {pedido.notas && (
          <div className="mt-3 pt-3 border-t border-outline-variant">
            <p className="text-sm text-on-surface-variant">Notas:</p>
            <p className="text-on-surface">{pedido.notas}</p>
          </div>
        )}
      </div>

      {/* Productos */}
      <div className="bg-surface-container-lowest p-4 rounded-xl mb-4">
        <h2 className="font-semibold text-on-surface mb-3">Productos</h2>
        <div className="space-y-3">
          {detalles.map((detalle) => {
            const producto = detalle.productoId ? productos.find((p) => p.id === detalle.productoId) : null;
            return (
              <div key={detalle.id} className="p-3 bg-surface-container rounded-xl">
                <div className="flex justify-between items-start mb-1">
                  <div className="flex-1">
                    <p className="font-medium text-on-surface">
                      {producto?.nombre ?? (detalle.productoId ? `Producto #${detalle.productoId}` : "Personalizado")}
                    </p>
                    {producto?.categoria && (
                      <p className="text-xs text-on-surface-variant">{producto.categoria}</p>
                    )}
                    {detalle.descripcionPersonalizada && (
                      <p className="text-sm text-on-surface-variant mt-1 italic">
                        {detalle.descripcionPersonalizada}
                      </p>
                    )}
                  </div>
                  {!esPastelera && (
                    <span className="font-medium text-on-surface ml-2">
                      ${detalle.subtotal.toFixed(2)}
                    </span>
                  )}
                </div>
                {!esPastelera && (
                  <p className="text-sm text-on-surface-variant">
                    {detalle.cantidad} x ${detalle.precioUnitario.toFixed(2)}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Acciones */}
      {pedido.estado !== "entregado" && pedido.estado !== "cancelado" && (
        <div className="space-y-3">
          {pedido.estado === "pendiente" && (
            <button
              onClick={handleMarcarEnProceso}
              disabled={accionLoading}
              className="w-full py-3 bg-secondary text-on-secondary rounded-xl"
            >
              {accionLoading ? "Procesando..." : "Iniciar Preparación"}
            </button>
          )}
          {pedido.estado === "en_proceso" && (
            <button
              onClick={handleMarcarListo}
              disabled={accionLoading}
              className="w-full py-3 bg-tertiary text-on-secondary rounded-xl"
            >
              {accionLoading ? "Procesando..." : "Marcar como Listo"}
            </button>
          )}
          {pedido.estado === "listo" && !esPastelera && (
            <button
              onClick={handleEntregar}
              className="w-full py-3 bg-tertiary text-on-secondary rounded-xl"
            >
              Entregar
            </button>
          )}
        </div>
      )}

      <ConfirmModal
        open={modalMarcarListo}
        titulo="Marcar como Listo"
        mensaje={`¿Marcar el pedido #${pedido?.id} como listo?\n\nCliente: ${pedido?.cliente}`}
        textoConfirmar="Marcar Listo"
        textoCancelar="Cancelar"
        variante="info"
        onConfirmar={confirmarMarcarListo}
        onCancelar={() => setModalMarcarListo(false)}
      />

      <ConfirmModal
        open={modalMarcarEnProceso}
        titulo="Iniciar Preparación"
        mensaje={`¿Iniciar preparación del pedido #${pedido?.id}?\n\nCliente: ${pedido?.cliente}`}
        textoConfirmar="Iniciar"
        textoCancelar="Cancelar"
        variante="info"
        onConfirmar={confirmarEnProceso}
        onCancelar={() => setModalMarcarEnProceso(false)}
      />

      <ConfirmModal
        open={modalEntregar}
        titulo="Entregar Pedido"
        mensaje={`¿Confirmar entrega del pedido #${pedido?.id}?\n\nCliente: ${pedido?.cliente}\nSaldo pendiente: $${pedido?.saldoPendiente?.toFixed(2) ?? "0.00"}`}
        textoConfirmar="Confirmar Entrega"
        textoCancelar="Cancelar"
        variante="info"
        onConfirmar={confirmarEntregar}
        onCancelar={() => setModalEntregar(false)}
      />
    </div>
  );
}
