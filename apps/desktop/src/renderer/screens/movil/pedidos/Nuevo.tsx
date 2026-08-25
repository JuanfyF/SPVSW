import { useState, useEffect } from "react";
import { formatearFecha } from "@pos/shared";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../../store/auth";

interface Producto {
  id: number;
  nombre: string;
  precioEntero: number | null;
  precioPorcion: number | null;
}

interface DetallePedido {
  productoId: number | null;
  descripcionPersonalizada: string;
  unidad: "entero" | "porcion";
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

export default function Nuevo() {
  const navigate = useNavigate();
  const { usuario, sesionCaja } = useAuthStore();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Formulario
  const [cliente, setCliente] = useState("");
  const [telefono, setTelefono] = useState("");
  const [fechaEntrega, setFechaEntrega] = useState("");
  const [horaEntrega, setHoraEntrega] = useState("12:00");
  const [anticipo, setAnticipo] = useState("");
  const [notas, setNotas] = useState("");
  const [detalles, setDetalles] = useState<DetallePedido[]>([]);

  // Para agregar producto
  const [productoSeleccionado, setProductoSeleccionado] = useState<string>("");
  const [unidadProducto, setUnidadProducto] = useState<"entero" | "porcion">("entero");
  const [cantidad, setCantidad] = useState("1");
  const [precioCustom, setPrecioCustom] = useState("");
  const [descripcionProducto, setDescripcionProducto] = useState("");

  useEffect(() => {
    cargarProductos();
  }, []);

  const cargarProductos = async () => {
    try {
      const data = await window.pos.productos.listar();
      setProductos(data);
    } catch (err) {
      console.error("Error al cargar productos:", err);
    }
  };

  const totalEstimado = detalles.reduce((sum, d) => sum + d.subtotal, 0);
  const saldoPendiente = totalEstimado - (parseFloat(anticipo) || 0);

  const agregarDetalle = () => {
    if (!productoSeleccionado || !cantidad) return;
    const producto = productos.find((p) => p.id === parseInt(productoSeleccionado, 10));
    if (!producto) return;
    const precioCustomNum = parseFloat(precioCustom);
    const precio = !isNaN(precioCustomNum) && precioCustomNum >= 0
      ? precioCustomNum
      : (unidadProducto === "porcion"
          ? (producto.precioPorcion ?? producto.precioEntero ?? 0)
          : (producto.precioEntero ?? producto.precioPorcion ?? 0));
    const cant = parseInt(cantidad, 10);

    setDetalles([
      ...detalles,
      {
        productoId: producto.id,
        descripcionPersonalizada: descripcionProducto,
        unidad: unidadProducto,
        cantidad: cant,
        precioUnitario: precio,
        subtotal: precio * cant,
      },
    ]);
    setProductoSeleccionado("");
    setUnidadProducto("entero");
    setCantidad("1");
    setPrecioCustom("");
    setDescripcionProducto("");
  };

  const eliminarDetalle = (index: number) => {
    setDetalles(detalles.filter((_, i) => i !== index));
  };

  const handleCrear = async () => {
    if (!sesionCaja || !usuario) return;

    setLoading(true);
    setError("");

    try {
      if (!cliente.trim()) throw new Error("El nombre del cliente es requerido");
      if (!fechaEntrega) throw new Error("La fecha de entrega es requerida");
      if (detalles.length === 0) throw new Error("Agrega al menos un producto");

      const anticipoNum = parseFloat(anticipo) || 0;
      if (anticipoNum < 0) throw new Error("El anticipo no puede ser negativo");
      if (totalEstimado <= 0) throw new Error("El total estimado debe ser mayor a $0");
      if (anticipoNum > totalEstimado) throw new Error("El anticipo no puede exceder el total estimado");

      // Verificar stock para productos
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

      await window.pos.pedidos.crear({
        cliente,
        telefono: telefono || null,
        fechaPedido: formatearFecha(new Date()),
        fechaEntrega,
        horaEntrega,
        anticipo: anticipoNum,
        metodoPagoAnticipo: "efectivo",
        sesionCajaAnticipoId: sesionCaja.id,
        totalEstimado,
        notas: notas || null,
        detalles,
      });

      navigate("/movil/pedidos");
    } catch (err: any) {
      setError(err.message || "Error al crear el pedido");
    } finally {
      setLoading(false);
    }
  };

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
        <h1 className="text-xl font-bold text-on-surface">Nuevo Pedido</h1>
      </div>

      {/* Formulario */}
      <div className="space-y-4 mb-4">
        <div>
          <label className="block text-sm text-on-surface-variant mb-1">
            Cliente *
          </label>
          <input
            type="text"
            value={cliente}
            onChange={(e) => setCliente(e.target.value)}
            maxLength={150}
            className="w-full px-4 py-2 border border-outline-variant rounded-xl"
          />
        </div>

        <div>
          <label className="block text-sm text-on-surface-variant mb-1">
            Teléfono
          </label>
          <input
            type="tel"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            maxLength={15}
            className="w-full px-4 py-2 border border-outline-variant rounded-xl"
          />
        </div>

        <div>
          <label className="block text-sm text-on-surface-variant mb-1">
            Fecha de entrega *
          </label>
          <input
            type="date"
            value={fechaEntrega}
            onChange={(e) => setFechaEntrega(e.target.value)}
            className="w-full px-4 py-2 border border-outline-variant rounded-xl"
          />
        </div>

        <div>
          <label className="block text-sm text-on-surface-variant mb-1">Hora de entrega *</label>
          <input
            type="time"
            value={horaEntrega}
            onChange={(e) => setHoraEntrega(e.target.value)}
            className="w-full px-4 py-2 border border-outline-variant rounded-xl"
          />
        </div>

        <div>
          <label className="block text-sm text-on-surface-variant mb-1">
            Anticipo
          </label>
          <input
            type="number"
            value={anticipo}
            onChange={(e) => setAnticipo(e.target.value)}
            min="0"
            className="w-full px-4 py-2 border border-outline-variant rounded-xl"
          />
        </div>

        <div>
          <label className="block text-sm text-on-surface-variant mb-1">
            Notas
          </label>
          <textarea
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            rows={2}
            maxLength={500}
            className="w-full px-4 py-2 border border-outline-variant rounded-xl"
          />
        </div>
      </div>

      {/* Agregar producto */}
      <div className="bg-surface-container-lowest p-4 rounded-xl mb-4">
        <h2 className="font-semibold text-on-surface mb-3">Agregar Producto</h2>
        <div className="flex gap-2 mb-3">
          <select
            value={productoSeleccionado}
            onChange={(e) => setProductoSeleccionado(e.target.value)}
            className="flex-1 px-3 py-2 border border-outline-variant rounded-xl text-sm"
          >
            <option value="">Producto...</option>
            {productos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
          <select
            value={unidadProducto}
            onChange={(e) => setUnidadProducto(e.target.value as "entero" | "porcion")}
            className="w-24 px-2 py-2 border border-outline-variant rounded-xl text-sm"
          >
            <option value="entero">Entero</option>
            <option value="porcion">Porción</option>
          </select>
          <input
            type="number"
            value={cantidad}
            onChange={(e) => setCantidad(e.target.value)}
            min="1"
            max="9999"
            className="w-16 px-2 py-2 border border-outline-variant rounded-xl text-sm"
          />
          <button
            onClick={agregarDetalle}
            className="px-3 py-2 bg-tertiary text-on-secondary rounded-xl text-sm"
          >
            +
          </button>
        </div>
        <textarea
          value={descripcionProducto}
          onChange={(e) => setDescripcionProducto(e.target.value)}
          placeholder="Descripción (opcional)..."
          rows={2}
          maxLength={500}
          className="w-full px-3 py-2 border border-outline-variant rounded-xl text-sm resize-y"
        />
        <div className="mt-2">
          <label className="block text-xs text-on-surface-variant mb-1">
            Precio unitario (dejar vacío para usar precio del catálogo)
          </label>
          <input
            type="number"
            value={precioCustom}
            onChange={(e) => setPrecioCustom(e.target.value)}
            placeholder={
              productoSeleccionado
                ? `$${(productos.find((p) => p.id === parseInt(productoSeleccionado, 10))?.precioEntero ?? productos.find((p) => p.id === parseInt(productoSeleccionado, 10))?.precioPorcion ?? 0).toFixed(2)}`
                : "0.00"
            }
            min="0"
            step="0.01"
            className="w-full px-3 py-2 border border-outline-variant rounded-xl text-sm"
          />
        </div>

        {detalles.length > 0 && (
          <div className="mt-3 space-y-2">
            {detalles.map((detalle, index) => (
              <div
                key={index}
                className="flex justify-between items-center p-2 bg-surface-container rounded-xl"
              >
                <div>
                  <p className="text-sm font-medium text-on-surface">
                    {productos.find((p) => p.id === detalle.productoId)?.nombre}
                  </p>
                  <p className="text-xs text-on-surface-variant">
                    {detalle.cantidad} x ${detalle.precioUnitario.toFixed(2)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-on-surface">
                    ${detalle.subtotal.toFixed(2)}
                  </span>
                  <button
                    onClick={() => eliminarDetalle(index)}
                    className="p-2 text-error min-w-[44px] min-h-[44px] flex items-center justify-center"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Resumen */}
      <div className="bg-surface-container-lowest p-4 rounded-xl mb-4">
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-on-surface-variant">Total:</span>
            <span className="font-medium text-on-surface">
              ${totalEstimado.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-on-surface-variant">Saldo:</span>
            <span
              className={`font-medium ${
                saldoPendiente > 0 ? "text-error" : "text-tertiary"
              }`}
            >
              ${saldoPendiente.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 bg-error/10 text-error rounded-xl text-center text-sm">
          {error}
        </div>
      )}

      {/* Botón crear */}
      <button
        onClick={handleCrear}
        disabled={loading || !cliente.trim() || !fechaEntrega || detalles.length === 0}
        className="w-full py-3 bg-secondary text-on-secondary rounded-xl disabled:opacity-50"
      >
        {loading ? "Creando..." : "Crear Pedido"}
      </button>
    </div>
  );
}
