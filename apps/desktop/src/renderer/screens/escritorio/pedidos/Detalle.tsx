import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuthStore } from "../../../store/auth";
import ConfirmModal from "../../../components/ConfirmModal";

interface Pedido {
  id: number;
  cliente: string;
  telefono: string | null;
  fechaPedido: string;
  fechaEntrega: string;
  estado: string;
  anticipo: number;
  metodoPagoAnticipo: string;
  totalEstimado: number;
  saldoPendiente: number;
  metodoPagoSaldo: string | null;
  notas: string | null;
}

interface DetallePedido {
  id: number;
  productoId: number | null;
  descripcionPersonalizada: string | null;
  unidad: "entero" | "porcion";
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

const coloresEstado: Record<string, string> = {
  pendiente: "bg-surface-container text-on-surface",
  en_proceso: "bg-secondary-container/30 text-secondary",
  listo: "bg-tertiary-fixed text-tertiary",
  entregado: "bg-tertiary text-on-tertiary",
  cancelado: "bg-error-container text-on-error-container",
};

export default function Detalle() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { usuario, sesionCaja } = useAuthStore();
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [detalles, setDetalles] = useState<DetallePedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [accionLoading, setAccionLoading] = useState(false);
  const [modalMarcarListo, setModalMarcarListo] = useState(false);
  const [modalEntrega, setModalEntrega] = useState(false);
  const [metodoPagoSaldo, setMetodoPagoSaldo] = useState<"efectivo" | "transferencia">("efectivo");
  const [modalCancelacion, setModalCancelacion] = useState(false);
  const [motivoCancelacion, setMotivoCancelacion] = useState("");
  const [metodoDevolucion, setMetodoDevolucion] = useState<"efectivo" | "transferencia">("efectivo");
  const [modalDeshacer, setModalDeshacer] = useState(false);
  const [error, setError] = useState("");
  const [modalError, setModalError] = useState("");

  const esAdmin = usuario?.rol === "propietario" || usuario?.rol === "cajero";

  useEffect(() => {
    if (id) cargarPedido(parseInt(id, 10));
  }, [id]);

  const cargarPedido = async (pedidoId: number) => {
    try {
      const [pedidoData, detallesData] = await Promise.all([
        window.pos.pedidos.obtenerPorId(pedidoId),
        window.pos.pedidos.obtenerDetalle(pedidoId),
      ]);
      setPedido(pedidoData);
      setDetalles(detallesData);
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
    try {
      await window.pos.pedidos.marcarListo(pedido.id);
      setModalMarcarListo(false);
      await cargarPedido(pedido.id);
    } catch (err: any) {
      setError(err.message || "Error al marcar como listo");
    } finally {
      setAccionLoading(false);
    }
  };

  const handleEntregar = async () => {
    if (!pedido || !sesionCaja) return;
    setAccionLoading(true);
    try {
      // Verificar stock antes de entregar
      const detallesConProducto = detalles.filter((d) => d.productoId !== null);
      if (detallesConProducto.length > 0) {
        const productos = await window.pos.productos.listar();
        for (const detalle of detallesConProducto) {
          const resultado = await window.pos.stock.verificarDisponibilidad(
            detalle.productoId!,
            sesionCaja.id,
            detalle.unidad,
            detalle.cantidad
          );
          if (!resultado.suficiente) {
            const producto = productos.find((p) => p.id === detalle.productoId);
            throw new Error(
              `Stock insuficiente para "${producto?.nombre ?? `#${detalle.productoId}`}": ` +
              `disponible ${resultado.disponible}, solicitado ${detalle.cantidad}`
            );
          }
        }
      }

      await window.pos.pedidos.entregar(
        pedido.id,
        sesionCaja.id,
        pedido.saldoPendiente > 0 ? metodoPagoSaldo : undefined
      );
      setModalEntrega(false);
      await cargarPedido(pedido.id);
    } catch (err: any) {
      setError(err.message || "Error al entregar pedido");
    } finally {
      setAccionLoading(false);
    }
  };

  const handleCancelar = async () => {
    if (!pedido || !usuario) return;
    if (!motivoCancelacion.trim()) { setModalError("El motivo es requerido"); return; }
    setAccionLoading(true);
    try {
      await window.pos.pedidos.cancelar(
        pedido.id,
        motivoCancelacion,
        metodoDevolucion,
        usuario.id,
        sesionCaja?.id
      );
      setModalCancelacion(false);
      await cargarPedido(pedido.id);
    } catch (err: any) {
      setError(err.message || "Error al cancelar pedido");
    } finally {
      setAccionLoading(false);
    }
  };

  const handleDeshacerEntrega = async () => {
    if (!pedido) return;
    setAccionLoading(true);
    try {
      await window.pos.pedidos.revertirEntrega(pedido.id);
      setModalDeshacer(false);
      await cargarPedido(pedido.id);
    } catch (err: any) {
      setError(err.message || "Error al deshacer entrega");
    } finally {
      setAccionLoading(false);
    }
  };

  const formatearFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString("es-EC", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
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
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-on-surface-variant">Pedido no encontrado</p>
          <button
            onClick={() => navigate("/pedidos")}
            className="mt-4 px-4 py-2 text-secondary hover:text-secondary/80"
          >
            Volver a pedidos
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto ">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <button
            onClick={() => navigate("/pedidos")}
            className="text-on-surface-variant hover:text-secondary mb-2"
          >
            ← Volver a pedidos
          </button>
          <h1 className="text-2xl font-bold text-on-surface">
            Pedido #{pedido.id}
          </h1>
          <p className="text-on-surface-variant">
            Creado el {formatearFecha(pedido.fechaPedido)}
          </p>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-sm font-medium ${
            coloresEstado[pedido.estado] || "bg-surface-container text-on-surface-variant"
          }`}
        >
          {pedido.estado.replace("_", " ")}
        </span>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-error-container text-on-error-container rounded-xl flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError("")} className="text-on-error-container hover:opacity-80">×</button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Datos del cliente */}
        <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant">
          <h2 className="text-lg font-semibold text-on-surface mb-4">
            Datos del Cliente
          </h2>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-on-surface-variant">Nombre</p>
              <p className="font-medium text-on-surface">{pedido.cliente}</p>
            </div>
            {esAdmin && pedido.telefono && (
              <div>
                <p className="text-sm text-on-surface-variant">Teléfono</p>
                <p className="font-medium text-on-surface">📱 {pedido.telefono}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-on-surface-variant">Fecha de entrega</p>
              <p className="font-medium text-on-surface">
                {formatearFecha(pedido.fechaEntrega)}
              </p>
            </div>
            {pedido.notas && (
              <div>
                <p className="text-sm text-on-surface-variant">Notas</p>
                <p className="text-on-surface">{pedido.notas}</p>
              </div>
            )}
          </div>
        </div>

        {/* Resumen de pago — solo admin */}
        {esAdmin && (
          <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant">
            <h2 className="text-lg font-semibold text-on-surface mb-4">
              Resumen de Pago
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Total estimado:</span>
                <span className="font-medium text-on-surface">
                  ${pedido.totalEstimado.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Anticipo:</span>
                <span className="font-medium text-tertiary">
                  ${pedido.anticipo.toFixed(2)} ({pedido.metodoPagoAnticipo})
                </span>
              </div>
              <div className="flex justify-between border-t border-outline-variant pt-3">
                <span className="text-on-surface font-medium">Saldo pendiente:</span>
                <div className="flex items-center gap-2">
                  {pedido.saldoPendiente <= 0 && (
                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-tertiary-container text-on-tertiary-container">
                      Pago completo
                    </span>
                  )}
                  <span
                    className={`font-bold ${
                      pedido.saldoPendiente > 0 ? "text-error" : "text-tertiary"
                    }`}
                  >
                    ${pedido.saldoPendiente.toFixed(2)}
                    {pedido.metodoPagoSaldo && (
                      <span className="text-sm font-normal ml-1">({pedido.metodoPagoSaldo})</span>
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Detalles del pedido */}
      <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant mb-6">
        <h2 className="text-lg font-semibold text-on-surface mb-4">
          Productos
        </h2>
        <div className="space-y-3">
          {detalles.map((detalle) => (
            <div
              key={detalle.id}
              className="flex items-center gap-4 p-3 bg-surface-container rounded-xl"
            >
              <div className="flex-1">
                <p className="font-medium text-on-surface">
                  {detalle.productoId
                    ? `Producto #${detalle.productoId}`
                    : detalle.descripcionPersonalizada || "Personalizado"}
                </p>
                <p className="text-sm text-on-surface-variant">
                  {detalle.cantidad} x ${detalle.precioUnitario.toFixed(2)}
                </p>
              </div>
              <p className="font-medium text-on-surface">
                ${detalle.subtotal.toFixed(2)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Acciones — solo admin */}
      {esAdmin && pedido.estado !== "entregado" && pedido.estado !== "cancelado" && (
        <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant">
          <h2 className="text-lg font-semibold text-on-surface mb-4">Acciones</h2>
          <div className="flex gap-4">
            {pedido.estado === "pendiente" && (
              <button
                onClick={async () => {
                  if (!pedido) return;
                  setAccionLoading(true);
                  try {
                    await window.pos.pedidos.actualizarEstado(pedido.id, "en_proceso");
                    await cargarPedido(pedido.id);
                  } catch (err: any) {
                    setError(err.message || "Error al iniciar preparación");
                  } finally {
                    setAccionLoading(false);
                  }
                }}
                disabled={accionLoading}
                className="flex-1 py-3 bg-secondary text-on-secondary rounded-xl hover:bg-secondary/90 disabled:opacity-50 transition-colors"
              >
                {accionLoading ? "Procesando..." : "Iniciar Preparación"}
              </button>
            )}
            {pedido.estado === "en_proceso" && (
              <button
                onClick={handleMarcarListo}
                disabled={accionLoading}
                className="flex-1 py-3 bg-secondary text-on-secondary rounded-xl hover:bg-secondary/90 disabled:opacity-50 transition-colors"
              >
                {accionLoading ? "Procesando..." : "Marcar como Listo"}
              </button>
            )}
            {pedido.estado === "listo" && (
              <button
                onClick={() => setModalEntrega(true)}
                disabled={accionLoading}
                className="flex-1 py-3 bg-tertiary text-on-tertiary rounded-xl hover:bg-tertiary/90 disabled:opacity-50 transition-colors"
              >
                Entregar Pedido
              </button>
            )}
            <button
              onClick={() => setModalCancelacion(true)}
              disabled={accionLoading}
              className="flex-1 py-3 border border-error/30 text-error rounded-xl hover:bg-error-container/50 disabled:opacity-50 transition-colors"
            >
              Cancelar Pedido
            </button>
          </div>
        </div>
      )}

      {/* Deshacer entrega — solo admin */}
      {esAdmin && pedido.estado === "entregado" && (
        <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant">
          <h2 className="text-lg font-semibold text-on-surface mb-4">Acciones</h2>
          <button
            onClick={() => setModalDeshacer(true)}
            disabled={accionLoading}
            className="px-6 py-3 border border-error/30 text-error rounded-xl hover:bg-error-container/50 disabled:opacity-50 transition-colors"
          >
            Deshacer Entrega
          </button>
        </div>
      )}

      {/* Modal de entrega */}
      {modalEntrega && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={(e) => { if (e.target === e.currentTarget) setModalEntrega(false); }}
          onKeyDown={(e) => { if (e.key === "Escape") setModalEntrega(false); }}
          tabIndex={0}
        >
          <div className="bg-surface-container-lowest rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-xl font-bold text-on-surface mb-4">
              Entregar Pedido
            </h2>

            {pedido.saldoPendiente > 0 && (
              <div className="mb-4">
                <p className="text-on-surface-variant mb-2">
                  Saldo pendiente: ${pedido.saldoPendiente.toFixed(2)}
                </p>
                <p className="text-sm text-on-surface-variant mb-2">
                  Selecciona método de pago para el saldo:
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setMetodoPagoSaldo("efectivo")}
                    className={`flex-1 py-2 rounded-xl transition-colors ${
                      metodoPagoSaldo === "efectivo"
                        ? "bg-secondary text-on-secondary"
                        : "bg-surface-container text-on-surface-variant"
                    }`}
                  >
                    Efectivo
                  </button>
                  <button
                    onClick={() => setMetodoPagoSaldo("transferencia")}
                    className={`flex-1 py-2 rounded-xl transition-colors ${
                      metodoPagoSaldo === "transferencia"
                        ? "bg-secondary text-on-secondary"
                        : "bg-surface-container text-on-surface-variant"
                    }`}
                  >
                    Transferencia
                  </button>
                </div>
              </div>
            )}

            <div className="flex gap-4">
              <button
                onClick={() => setModalEntrega(false)}
                className="flex-1 py-3 border border-outline-variant text-on-surface-variant rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleEntregar}
                disabled={accionLoading}
                className="flex-1 py-3 bg-tertiary text-on-tertiary rounded-xl hover:bg-tertiary/90 disabled:opacity-50 transition-colors"
              >
                {accionLoading ? "Procesando..." : "Confirmar Entrega"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de cancelación */}
      {modalCancelacion && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={(e) => { if (e.target === e.currentTarget) setModalCancelacion(false); }}
          onKeyDown={(e) => { if (e.key === "Escape") setModalCancelacion(false); }}
          tabIndex={0}
        >
          <div className="bg-surface-container-lowest rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-xl font-bold text-error mb-4">
              Cancelar Pedido
            </h2>

            <div className="mb-4">
              <label className="block text-sm text-on-surface-variant mb-1">
                Motivo de cancelación *
              </label>
              <textarea
                value={motivoCancelacion}
                onChange={(e) => { setMotivoCancelacion(e.target.value); setModalError(""); }}
                maxLength={255}
                rows={3}
                className="w-full px-4 py-2 border border-outline-variant rounded-xl focus:outline-none focus:border-secondary bg-surface"
              />
              {modalError && (
                <p className="text-sm text-error mt-1">{modalError}</p>
              )}
            </div>

            {pedido.anticipo > 0 && (
              <div className="mb-4">
                <p className="text-sm text-on-surface-variant mb-2">
                  Devolver anticipo de ${pedido.anticipo.toFixed(2)} via:
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setMetodoDevolucion("efectivo")}
                    className={`flex-1 py-2 rounded-xl transition-colors ${
                      metodoDevolucion === "efectivo"
                        ? "bg-secondary text-on-secondary"
                        : "bg-surface-container text-on-surface-variant"
                    }`}
                  >
                    Efectivo
                  </button>
                  <button
                    onClick={() => setMetodoDevolucion("transferencia")}
                    className={`flex-1 py-2 rounded-xl transition-colors ${
                      metodoDevolucion === "transferencia"
                        ? "bg-secondary text-on-secondary"
                        : "bg-surface-container text-on-surface-variant"
                    }`}
                  >
                    Transferencia
                  </button>
                </div>
              </div>
            )}

            <div className="flex gap-4">
              <button
                onClick={() => {
                  setModalCancelacion(false);
                  setMotivoCancelacion("");
                  setModalError("");
                }}
                className="flex-1 py-3 border border-outline-variant text-on-surface-variant rounded-xl transition-colors"
              >
                Volver
              </button>
              <button
                onClick={handleCancelar}
                disabled={!motivoCancelacion || accionLoading}
                className="flex-1 py-3 bg-error text-on-error rounded-xl hover:bg-error/90 disabled:opacity-50 transition-colors"
              >
                {accionLoading ? "Procesando..." : "Confirmar Cancelación"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de deshacer entrega */}
      {modalDeshacer && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={(e) => { if (e.target === e.currentTarget) setModalDeshacer(false); }}
          onKeyDown={(e) => { if (e.key === "Escape") setModalDeshacer(false); }}
          tabIndex={0}
        >
          <div className="bg-surface-container-lowest rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-xl font-bold text-on-surface mb-4">
              Deshacer Entrega
            </h2>
            <p className="text-on-surface-variant mb-4">
              ¿Estás seguro de deshacer la entrega del pedido #{pedido?.id}? El pedido volverá a estado <strong>listo</strong> y se deshará el cobro del saldo.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setModalDeshacer(false)}
                className="flex-1 py-3 border border-outline-variant text-on-surface-variant rounded-xl transition-colors"
              >
                Volver
              </button>
              <button
                onClick={handleDeshacerEntrega}
                disabled={accionLoading}
                className="flex-1 py-3 bg-error text-on-error rounded-xl hover:bg-error/90 disabled:opacity-50 transition-colors"
              >
                {accionLoading ? "Procesando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={modalMarcarListo}
        titulo="Marcar como Listo"
        mensaje={`¿Marcar el pedido #${pedido?.id} como listo para entregar?\n\nCliente: ${pedido?.cliente}`}
        textoConfirmar="Marcar Listo"
        textoCancelar="Cancelar"
        variante="info"
        onConfirmar={confirmarMarcarListo}
        onCancelar={() => setModalMarcarListo(false)}
      />
    </div>
  );
}
