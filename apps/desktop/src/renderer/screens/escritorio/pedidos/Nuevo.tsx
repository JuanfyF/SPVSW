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
  const [errores, setErrores] = useState<Record<string, string>>({});

  // Formulario
  const [cliente, setCliente] = useState("");
  const [telefono, setTelefono] = useState("");
  const [fechaEntrega, setFechaEntrega] = useState("");
  const [horaEntrega, setHoraEntrega] = useState("12:00");
  const [anticipo, setAnticipo] = useState("");
  const [metodoPago, setMetodoPago] = useState<"efectivo" | "transferencia">("efectivo");
  const [detalles, setDetalles] = useState<DetallePedido[]>([]);
  const [esPersonalizado, setEsPersonalizado] = useState(false);
  const [descripcionPersonalizada, setDescripcionPersonalizada] = useState("");
  const [productoSeleccionado, setProductoSeleccionado] = useState<string>("");
  const [unidadProducto, setUnidadProducto] = useState<"entero" | "porcion">("entero");
  const [cantidad, setCantidad] = useState("1");
  const [descripcionProducto, setDescripcionProducto] = useState("");
  const [totalManual, setTotalManual] = useState("");

  useEffect(() => {
    cargarProductos();
  }, []);

  const cargarProductos = async () => {
    try {
      const data = await window.pos.productos.listar();
      setProductos(data);
    } catch (err) {
      console.error("Error al cargar productos:", err);
      setError("Error al cargar productos");
    }
  };

  const totalCalculado = detalles.reduce((sum, d) => sum + d.subtotal, 0);
  const totalEstimado = totalManual ? parseFloat(totalManual) || 0 : totalCalculado;
  const saldoPendiente = totalEstimado - (parseFloat(anticipo) || 0);

  const agregarDetalle = () => {
    if (esPersonalizado) {
      if (!descripcionPersonalizada || !cantidad) return;
      const precio = 0; // Personalizado sin precio fijo
      setDetalles([
        ...detalles,
        {
          productoId: null,
          descripcionPersonalizada,
          unidad: "entero",
          cantidad: parseInt(cantidad, 10),
          precioUnitario: precio,
          subtotal: precio * parseInt(cantidad, 10),
        },
      ]);
      setDescripcionPersonalizada("");
    } else {
      if (!productoSeleccionado || !cantidad) return;
      const producto = productos.find((p) => p.id === parseInt(productoSeleccionado, 10));
      if (!producto) return;
      const precio =
        unidadProducto === "porcion"
          ? (producto.precioPorcion ?? producto.precioEntero ?? 0)
          : (producto.precioEntero ?? producto.precioPorcion ?? 0);
      setDetalles([
        ...detalles,
        {
          productoId: producto.id,
          descripcionPersonalizada: descripcionProducto,
          unidad: unidadProducto,
          cantidad: parseInt(cantidad, 10),
          precioUnitario: precio,
          subtotal: precio * parseInt(cantidad, 10),
        },
      ]);
      setProductoSeleccionado("");
      setDescripcionProducto("");
    }
    setCantidad("1");
  };

  const eliminarDetalle = (index: number) => {
    setDetalles(detalles.filter((_, i) => i !== index));
  };

  const handleCrear = async () => {
    if (!sesionCaja || !usuario) return;

    setLoading(true);
    setError("");

    try {
      if (!cliente || !cliente.trim()) throw new Error("El nombre del cliente es requerido");
      if (cliente.trim().length > 150) throw new Error("El nombre del cliente no puede tener más de 150 caracteres");
      if (!fechaEntrega) throw new Error("La fecha de entrega es requerida");
      if (detalles.length === 0) throw new Error("Debe agregar al menos un producto");
      const anticipoNum = parseFloat(anticipo) || 0;
      if (isNaN(anticipoNum) || anticipoNum < 0) throw new Error("El anticipo no puede ser negativo");
      if (totalEstimado <= 0 || isNaN(totalEstimado)) throw new Error("El total estimado debe ser mayor a $0");
      if (anticipoNum > totalEstimado) throw new Error("El anticipo no puede exceder el total estimado");

      await window.pos.pedidos.crear({
        cliente: cliente.trim(),
        telefono: telefono || null,
        fechaPedido: formatearFecha(new Date()),
        fechaEntrega,
        horaEntrega,
        anticipo: anticipoNum,
        metodoPagoAnticipo: metodoPago,
        sesionCajaAnticipoId: sesionCaja.id,
        totalEstimado,
        notas: null,
        detalles,
      });

      navigate("/pedidos");
    } catch (err: any) {
      setError(err.message || "Error al crear el pedido");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto ">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-on-surface">Nuevo Pedido</h1>
        <p className="text-on-surface-variant">Crea un nuevo pedido para un cliente</p>
      </div>

      {/* Formulario */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Datos del cliente */}
        <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant">
          <h2 className="text-lg font-semibold text-on-surface mb-4">
            Datos del Cliente
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-on-surface-variant mb-1">
                Nombre *
              </label>
              <input
                type="text"
                value={cliente}
                onChange={(e) => {
                  setCliente(e.target.value);
                  if (errores.cliente) setErrores((prev) => ({ ...prev, cliente: "" }));
                }}
                onBlur={() => {
                  if (!cliente.trim()) {
                    setErrores((prev) => ({ ...prev, cliente: "El nombre del cliente es requerido" }));
                  }
                }}
                maxLength={150}
                className={`w-full px-4 py-2 border rounded-xl focus:outline-none focus:border-secondary bg-surface ${
                  errores.cliente ? "border-error" : "border-outline-variant"
                }`}
              />
              {errores.cliente && (
                <p className="text-error text-xs mt-1">{errores.cliente}</p>
              )}
            </div>
            <div>
              <label className="block text-sm text-on-surface-variant mb-1">
                Teléfono
              </label>
              <input
                type="tel"
                value={telefono}
                onChange={(e) => {
                  setTelefono(e.target.value);
                  if (errores.telefono) setErrores((prev) => ({ ...prev, telefono: "" }));
                }}
                onBlur={() => {
                  if (telefono && !/^\+?[\d\s\-()]{7,15}$/.test(telefono)) {
                    setErrores((prev) => ({ ...prev, telefono: "Teléfono inválido (7-15 dígitos)" }));
                  }
                }}
                maxLength={15}
                className={`w-full px-4 py-2 border rounded-xl focus:outline-none focus:border-secondary bg-surface ${
                  errores.telefono ? "border-error" : "border-outline-variant"
                }`}
              />
              {errores.telefono && (
                <p className="text-error text-xs mt-1">{errores.telefono}</p>
              )}
            </div>
            <div>
              <label className="block text-sm text-on-surface-variant mb-1">
                Fecha de entrega *
              </label>
              <input
                type="date"
                value={fechaEntrega}
                onChange={(e) => {
                  setFechaEntrega(e.target.value);
                  if (errores.fechaEntrega) setErrores((prev) => ({ ...prev, fechaEntrega: "" }));
                }}
                onBlur={() => {
                  if (fechaEntrega) {
                    const hoy = formatearFecha(new Date());
                    if (fechaEntrega < hoy!) {
                      setErrores((prev) => ({ ...prev, fechaEntrega: "La fecha de entrega no puede ser en el pasado" }));
                    }
                  }
                }}
                min={formatearFecha(new Date())}
                className={`w-full px-4 py-2 border rounded-xl focus:outline-none focus:border-secondary bg-surface ${
                  errores.fechaEntrega ? "border-error" : "border-outline-variant"
                }`}
              />
              {errores.fechaEntrega && (
                <p className="text-error text-xs mt-1">{errores.fechaEntrega}</p>
              )}
            </div>
            <div>
              <label className="block text-sm text-on-surface-variant mb-1">Hora de entrega *</label>
              <input
                type="time"
                value={horaEntrega}
                onChange={(e) => setHoraEntrega(e.target.value)}
                className="w-full px-4 py-3 border border-outline-variant rounded-xl focus:outline-none focus:border-secondary bg-surface"
              />
            </div>
          </div>
        </div>

        {/* Anticipo y Total */}
        <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant">
          <h2 className="text-lg font-semibold text-on-surface mb-4">Anticipo</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-on-surface-variant mb-1">
                Total a cobrar
              </label>
              <input
                type="number"
                value={totalManual}
                onChange={(e) => setTotalManual(e.target.value)}
                placeholder={totalCalculado.toFixed(2)}
                min="0"
                step="0.01"
                max="999999"
                className="w-full px-4 py-2 border border-outline-variant rounded-xl focus:outline-none focus:border-secondary bg-surface text-lg font-bold"
              />
              <p className="text-xs text-on-surface-variant mt-1">
                Total de productos: ${totalCalculado.toFixed(2)}
              </p>
            </div>
            <div>
              <label className="block text-sm text-on-surface-variant mb-1">
                Monto del anticipo
              </label>
              <input
                type="number"
                value={anticipo}
                onChange={(e) => setAnticipo(e.target.value)}
                min="0"
                step="0.01"
                max="999999"
                className="w-full px-4 py-2 border border-outline-variant rounded-xl focus:outline-none focus:border-secondary bg-surface"
              />
            </div>
            <div>
              <label className="block text-sm text-on-surface-variant mb-1">
                Método de pago
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setMetodoPago("efectivo")}
                  className={`flex-1 py-2 rounded-xl transition-colors ${
                    metodoPago === "efectivo"
                      ? "bg-secondary text-on-secondary"
                      : "bg-surface-container text-on-surface-variant"
                  }`}
                >
                  Efectivo
                </button>
                <button
                  onClick={() => setMetodoPago("transferencia")}
                  className={`flex-1 py-2 rounded-xl transition-colors ${
                    metodoPago === "transferencia"
                      ? "bg-secondary text-on-secondary"
                      : "bg-surface-container text-on-surface-variant"
                  }`}
                >
                  Transferencia
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Agregar productos */}
      <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant mb-6">
        <h2 className="text-lg font-semibold text-on-surface mb-4">
          Agregar Productos
        </h2>

        <div className="flex items-end gap-4 mb-4">
          <div className="flex-1">
            <label className="block text-sm text-on-surface-variant mb-1">
              Tipo
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setEsPersonalizado(false)}
                className={`flex-1 py-2 rounded-xl transition-colors ${
                  !esPersonalizado
                    ? "bg-secondary text-on-secondary"
                    : "bg-surface-container text-on-surface-variant"
                }`}
              >
                Producto
              </button>
              <button
                onClick={() => setEsPersonalizado(true)}
                className={`flex-1 py-2 rounded-xl transition-colors ${
                  esPersonalizado
                    ? "bg-secondary text-on-secondary"
                    : "bg-surface-container text-on-surface-variant"
                }`}
              >
                Personalizado
              </button>
            </div>
          </div>

          {!esPersonalizado && (
            <>
              <div className="flex-1">
                <label className="block text-sm text-on-surface-variant mb-1">
                  Producto
                </label>
                <select
                  value={productoSeleccionado}
                  onChange={(e) => setProductoSeleccionado(e.target.value)}
                  className="w-full px-4 py-2 border border-outline-variant rounded-xl focus:outline-none focus:border-secondary bg-surface"
                >
                  <option value="">Seleccionar...</option>
                  {productos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div className="w-36">
                <label className="block text-sm text-on-surface-variant mb-1">
                  Unidad
                </label>
                <select
                  value={unidadProducto}
                  onChange={(e) => setUnidadProducto(e.target.value as "entero" | "porcion")}
                  className="w-full px-4 py-2 border border-outline-variant rounded-xl focus:outline-none focus:border-secondary bg-surface"
                >
                  <option value="entero">Entero</option>
                  <option value="porcion">Porción</option>
                </select>
              </div>
            </>
          )}

          <div className="w-24">
            <label className="block text-sm text-on-surface-variant mb-1">
              Cantidad
            </label>
            <input
              type="number"
              value={cantidad}
              onChange={(e) => {
                setCantidad(e.target.value);
                if (errores.cantidad) setErrores((prev) => ({ ...prev, cantidad: "" }));
              }}
              onBlur={() => {
                if (parseInt(cantidad, 10) < 1) {
                  setErrores((prev) => ({ ...prev, cantidad: "Cantidad mínima es 1" }));
                }
              }}
              min="1"
              max="9999"
              className={`w-full px-4 py-2 border rounded-xl focus:outline-none focus:border-secondary bg-surface ${
                errores.cantidad ? "border-error" : "border-outline-variant"
              }`}
            />
            {errores.cantidad && (
              <p className="text-error text-xs mt-1">{errores.cantidad}</p>
            )}
          </div>

          <button
            onClick={agregarDetalle}
            className="px-4 py-2 bg-tertiary text-on-tertiary rounded-xl hover:bg-tertiary/90 transition-colors"
          >
            Agregar
          </button>
        </div>

        {/* Descripción - fila completa */}
        <div className="mb-4">
          <label className="block text-sm text-on-surface-variant mb-1">
            {esPersonalizado ? "Descripción del personalizado" : "Descripción (opcional)"}
          </label>
              <textarea
                value={esPersonalizado ? descripcionPersonalizada : descripcionProducto}
                onChange={(e) => esPersonalizado ? setDescripcionPersonalizada(e.target.value) : setDescripcionProducto(e.target.value)}
                placeholder={esPersonalizado ? "Ej: Torta 3 pisos, diseño floral" : "Detalles del producto..."}
                rows={3}
                maxLength={500}
                className="w-full px-4 py-3 text-lg border border-outline-variant rounded-xl focus:outline-none focus:border-secondary bg-surface resize-y"
              />
        </div>

        {/* Detalles agregados */}
        {detalles.length > 0 && (
          <div className="space-y-2">
            {detalles.map((detalle, index) => (
              <div
                key={index}
                className="flex items-center gap-4 p-3 bg-surface-container rounded-xl"
              >
                <div className="flex-1">
                  <p className="font-medium text-on-surface">
                    {detalle.productoId
                      ? productos.find((p) => p.id === detalle.productoId)?.nombre
                      : detalle.descripcionPersonalizada}
                  </p>
                  {detalle.descripcionPersonalizada && (
                    <p className="text-sm text-on-surface-variant italic">
                      {detalle.descripcionPersonalizada}
                    </p>
                  )}
                  <p className="text-sm text-on-surface-variant">
                    {detalle.cantidad} x ${detalle.precioUnitario.toFixed(2)} ({detalle.unidad})
                  </p>
                </div>
                <p className="font-medium text-on-surface">
                  ${detalle.subtotal.toFixed(2)}
                </p>
                <button
                  onClick={() => eliminarDetalle(index)}
                  className="p-2 text-error/60 hover:text-error min-w-[44px] min-h-[44px] flex items-center justify-center"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Resumen */}
      <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant mb-6">
        <h2 className="text-lg font-semibold text-on-surface mb-4">Resumen del Pedido</h2>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-on-surface-variant">Total:</span>
            <span className="text-on-surface font-medium">
              ${totalEstimado.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-on-surface-variant">Anticipo:</span>
            <span className="font-medium text-tertiary">
              ${(parseFloat(anticipo) || 0).toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between border-t border-outline-variant pt-3">
            <span className="text-on-surface font-medium">Saldo pendiente:</span>
            <span
              className={`font-bold ${
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
        <div className="mb-4 p-3 bg-error-container text-on-error-container rounded-xl text-center">
          {error}
        </div>
      )}

      {/* Botones */}
      <div className="flex gap-4">
        <button
          onClick={() => navigate("/pedidos")}
          className="flex-1 py-3 border border-outline-variant text-on-surface-variant rounded-xl hover:bg-surface-container transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={handleCrear}
          disabled={loading || detalles.length === 0}
          className="flex-1 py-3 bg-secondary text-on-secondary rounded-xl hover:bg-secondary/90 disabled:opacity-50 transition-colors"
        >
          {loading ? "Creando..." : "Crear Pedido"}
        </button>
      </div>
    </div>
  );
}
