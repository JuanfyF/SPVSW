import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../../store/auth";
import ConfirmModal from "../../components/ConfirmModal";
import { Package } from "lucide-react";

const RECARGO_LLEVAR = 0.10; // Costo del repostero para llevar

interface Producto {
  id: number;
  nombre: string;
  categoria: string | null;
  tipoVenta: string;
  precioEntero: number | null;
  precioPorcion: number | null;
}

interface CarritoItem {
  productoId: number;
  nombre: string;
  unidad: "entero" | "porcion" | "porcion_llevar";
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

export default function VentaMostrador() {
  const navigate = useNavigate();
  const location = useLocation();
  const { usuario, sesionCaja } = useAuthStore();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [stockDisponible, setStockDisponible] = useState<Record<string, number>>({});
  const [carrito, setCarrito] = useState<CarritoItem[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [metodoPago, setMetodoPago] = useState<"efectivo" | "transferencia">("efectivo");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [modalCobrar, setModalCobrar] = useState(false);

  const cargarProductos = useCallback(async () => {
    try {
      const data = await window.pos.productos.listar();
      setProductos(data);

      if (sesionCaja) {
        const [stockData, allMermas, allCortesias, vendidoLote, ajusteCortes] = await Promise.all([
          window.pos.stock.obtenerStockPorSesion(sesionCaja.id),
          window.pos.stock.listarMermasPorSesion(sesionCaja.id),
          window.pos.stock.listarCortesiasPorSesion(sesionCaja.id),
          window.pos.stock.calcularVendidoLote(sesionCaja.id),
          window.pos.stock.calcularAjusteCortesLote(sesionCaja.id),
        ]);
        const dispMap: Record<string, number> = {};

        for (const s of stockData) {
          const key = `${s.productoId}:${s.unidad}`;
          const vendido = vendidoLote[key] ?? 0;
          const ajusteCorte = ajusteCortes[key] ?? 0;

          const totalMerma = allMermas
            .filter((m: any) => m.productoId === s.productoId && m.unidad === s.unidad)
            .reduce((sum: number, m: any) => sum + m.cantidad, 0);
          const totalCortesia = allCortesias
            .filter((c: any) => c.productoId === s.productoId && c.unidad === s.unidad)
            .reduce((sum: number, c: any) => sum + c.cantidad, 0);

          const stockKey = `${s.productoId}-${s.unidad}`;
          dispMap[stockKey] =
            s.cantidadInicial +
            s.cantidadAgregada -
            vendido -
            totalMerma -
            totalCortesia +
            ajusteCorte;
        }

        setStockDisponible(dispMap);
      }
    } catch (err) {
      console.error("Error al cargar productos:", err);
      setError("Error al cargar productos");
    }
  }, [sesionCaja]);

  useEffect(() => {
    cargarProductos();
  }, [location.pathname, cargarProductos]);

  useEffect(() => {
    const interval = setInterval(() => {
      cargarProductos();
    }, 10000);
    return () => clearInterval(interval);
  }, [cargarProductos]);

  const getDisponible = (productoId: number, unidad?: string): number => {
    if (!sesionCaja || Object.keys(stockDisponible).length === 0) return Infinity;
    if (unidad) {
      return stockDisponible[`${productoId}-${unidad}`] ?? 0;
    }
    // Total de todas las unidades
    let total = 0;
    for (const key of Object.keys(stockDisponible)) {
      if (key.startsWith(`${productoId}-`)) {
        total += stockDisponible[key] ?? 0;
      }
    }
    return total;
  };

  const tieneStock = (producto: Producto): boolean => {
    if (!sesionCaja || Object.keys(stockDisponible).length === 0) return true;
    if (producto.tipoVenta === "entero") return getDisponible(producto.id, "entero") > 0;
    if (producto.tipoVenta === "porcion" || producto.tipoVenta === "porcion_llevar") return getDisponible(producto.id, "porcion") > 0;
    return getDisponible(producto.id, "entero") > 0 || getDisponible(producto.id, "porcion") > 0;
  };

  const productosFiltrados = productos.filter((p) => {
    const coincideBusqueda = p.nombre.toLowerCase().includes(busqueda.toLowerCase());
    return coincideBusqueda;
  });

  const agregarAlCarrito = (producto: Producto, unidad: "entero" | "porcion" | "porcion_llevar") => {
    let precio: number | null;
    if (unidad === "entero") {
      precio = producto.precioEntero;
    } else {
      precio = producto.precioPorcion;
    }
    if (precio === null || precio === undefined) return;

    // Para llevar: +$0.10
    if (unidad === "porcion_llevar") {
      precio = precio + RECARGO_LLEVAR;
    }

    setCarrito((prev) => {
      const existente = prev.find(
        (item) => item.productoId === producto.id && item.unidad === unidad
      );

      if (existente) {
        return prev.map((item) =>
          item.productoId === producto.id && item.unidad === unidad
            ? {
                ...item,
                cantidad: item.cantidad + 1,
                subtotal: (item.cantidad + 1) * item.precioUnitario,
              }
            : item
        );
      } else {
        return [
          ...prev,
          {
            productoId: producto.id,
            nombre: producto.nombre,
            unidad,
            cantidad: 1,
            precioUnitario: precio,
            subtotal: precio,
          },
        ];
      }
    });
  };

  const agregarCortesia = (producto: Producto) => {
    // Determinar la unidad disponible
    let unidad: "entero" | "porcion" = "entero";
    if (producto.precioPorcion && (!producto.precioEntero || getDisponible(producto.id, "porcion") > 0)) {
      unidad = "porcion";
    }

    setCarrito((prev) => {
      const existente = prev.find(
        (item) => item.productoId === producto.id && item.unidad === unidad
      );

      if (existente) {
        return prev.map((item) =>
          item.productoId === producto.id && item.unidad === unidad
            ? {
                ...item,
                cantidad: item.cantidad + 1,
                subtotal: 0,
              }
            : item
        );
      } else {
        return [
          ...prev,
          {
            productoId: producto.id,
            nombre: producto.nombre,
            unidad,
            cantidad: 1,
            precioUnitario: 0,
            subtotal: 0,
          },
        ];
      }
    });
  };

  const eliminarDelCarrito = (index: number) => {
    setCarrito((prev) => prev.filter((_, i) => i !== index));
  };

  const actualizarCantidad = (index: number, cantidad: number) => {
    if (cantidad <= 0) {
      eliminarDelCarrito(index);
      return;
    }

    setCarrito((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              cantidad,
              subtotal: cantidad * item.precioUnitario,
            }
          : item
      )
    );
  };

  const total = carrito.reduce((sum, item) => sum + item.subtotal, 0);

  const handleCobrar = () => {
    if (carrito.length === 0) {
      setError("Agrega al menos un producto al carrito");
      return;
    }
    if (!sesionCaja) {
      setError("Debes tener una sesión de caja abierta");
      return;
    }
    if (!usuario) {
      setError("Debes estar autenticado");
      return;
    }
    if (total < 0 || isNaN(total)) {
      setError("El total no puede ser negativo");
      return;
    }
    setModalCobrar(true);
  };

  const confirmarCobrar = async () => {
    if (!sesionCaja) {
      setError("Sesión de caja no disponible");
      return;
    }

    setLoading(true);
    setError("");

    // Determinar tipo de origen: cortesía si todo es $0, mostrador si hay cobro
    const esCortesia = total === 0;

    try {
      // Verificar stock antes de confirmar la venta
      for (const item of carrito) {
        const resultado = await window.pos.stock.verificarDisponibilidad(
          item.productoId,
          sesionCaja.id,
          item.unidad,
          item.cantidad
        );
        if (!resultado.suficiente) {
          throw new Error(
            `Stock insuficiente para "${item.nombre}": ` +
            `disponible ${resultado.disponible}, solicitado ${item.cantidad}`
          );
        }
      }

      await window.pos.ventas.crear({
        sesionCajaId: sesionCaja.id,
        total,
        metodoPago: esCortesia ? "efectivo" : metodoPago,
        tipoOrigen: esCortesia ? "cortesia" : "mostrador",
        detalles: carrito.map((item) => ({
          productoId: item.productoId,
          unidad: item.unidad,
          cantidad: item.cantidad,
          precioUnitario: item.precioUnitario,
          subtotal: item.subtotal,
        })),
      });

      setCarrito([]);
      setModalCobrar(false);
      await cargarProductos();
    } catch (err: any) {
      setError(err.message || "Error al procesar la venta");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full">
      {/* Panel de productos */}
      <div className="flex-1 p-6 overflow-auto">
        <div className="mb-6">
          <h1 className="text-headline-lg font-bold text-on-surface mb-4">Venta de Mostrador</h1>
          <input
            type="text"
            placeholder="Buscar productos..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full px-4 py-3 border border-outline-variant rounded-xl focus:outline-none focus:border-secondary bg-surface-container-lowest"
          />
        </div>

        {/* Lista de productos */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {productosFiltrados.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <Package className="w-10 h-10 mx-auto mb-3 text-on-surface-variant/40" />
                <p className="text-on-surface-variant">
                  {busqueda ? `No se encontraron productos para "${busqueda}"` : "No hay productos disponibles en stock"}
                </p>
              </div>
            ) : (
              productosFiltrados.map((producto) => {
                const stockEntero = getDisponible(producto.id, "entero");
                const stockPorcion = getDisponible(producto.id, "porcion");
                return (
                  <div
                    key={producto.id}
                    className="bg-surface-container-lowest rounded-2xl p-4 shadow-sm border border-outline-variant overflow-hidden hover:shadow-md transition-shadow"
                  >
                    <h3 className="font-medium text-on-surface mb-1">{producto.nombre}</h3>
                    {producto.categoria && (
                      <p className="text-label-md text-on-surface-variant mb-1">{producto.categoria}</p>
                    )}
                    {sesionCaja && Object.keys(stockDisponible).length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {stockEntero !== Infinity && (
                          <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-label-md font-bold ${
                            stockEntero === 0
                              ? "bg-error-container text-on-error-container"
                              : stockEntero <= 3
                                ? "bg-surface-container-high text-tertiary"
                                : "bg-tertiary-fixed text-tertiary"
                          }`}>
                            <span className="text-caption opacity-70">Ent:</span> {stockEntero}
                          </span>
                        )}
                        {stockPorcion !== Infinity && (
                          <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-label-md font-bold ${
                            stockPorcion === 0
                              ? "bg-error-container text-on-error-container"
                              : stockPorcion <= 3
                                ? "bg-surface-container-high text-tertiary"
                                : "bg-secondary-fixed text-secondary"
                          }`}>
                            <span className="text-caption opacity-70">Porc:</span> {stockPorcion}
                          </span>
                        )}
                      </div>
                    )}
                    <div className="space-y-2">
                      {producto.precioEntero && (
                        <button
                          onClick={() => agregarAlCarrito(producto, "entero")}
                          disabled={stockEntero !== Infinity && stockEntero <= 0}
                          className="w-full py-2 bg-surface-container text-on-surface rounded-xl hover:bg-surface-container-high transition-colors text-label-md disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Entero ${producto.precioEntero.toFixed(2)}
                        </button>
                      )}
                      {producto.precioPorcion && (
                        <>
                          <button
                            onClick={() => agregarAlCarrito(producto, "porcion")}
                            disabled={stockPorcion !== Infinity && stockPorcion <= 0}
                            className="w-full py-2 bg-surface-container text-on-surface rounded-xl hover:bg-surface-container-high transition-colors text-label-md disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Porción (servir) ${producto.precioPorcion.toFixed(2)}
                          </button>
                          <button
                            onClick={() => agregarAlCarrito(producto, "porcion_llevar")}
                            disabled={stockPorcion !== Infinity && stockPorcion <= 0}
                            className="w-full py-2 bg-surface-container text-on-surface rounded-xl hover:bg-surface-container-high transition-colors text-label-md disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Porción (llevar) ${(producto.precioPorcion + RECARGO_LLEVAR).toFixed(2)}
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => agregarCortesia(producto)}
                        disabled={!tieneStock(producto)}
                        className="w-full py-2 bg-tertiary-fixed/30 text-tertiary rounded-xl hover:bg-tertiary-fixed/50 transition-colors text-label-md disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Cortesía (gratis)
                      </button>
                    </div>
                  </div>
                );
              })
            )}
        </div>
      </div>

      {/* Panel del carrito */}
      <div className="w-96 bg-surface-container-lowest border-l border-outline-variant flex flex-col">
        <div className="p-4 border-b border-outline-variant">
          <h2 className="text-headline-md font-semibold text-on-surface">Carrito</h2>
        </div>

        {/* Items del carrito */}
        <div className="flex-1 overflow-auto p-4">
          {carrito.length === 0 ? (
            <p className="text-center text-on-surface-variant py-8">
              Agrega productos para comenzar
            </p>
          ) : (
            <div className="space-y-3">
              {carrito.map((item, index) => (
                <div
                  key={index}
                  className="p-3 bg-surface-container rounded-xl"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-medium text-on-surface">{item.nombre}</p>
                      <p className="text-label-md text-on-surface-variant">
                        {item.unidad === "entero" ? "Entero" : item.unidad === "porcion_llevar" ? "Porción (llevar)" : "Porción (servir)"} • $
                        {item.precioUnitario.toFixed(2)}
                      </p>
                    </div>
                    <button
                      onClick={() => eliminarDelCarrito(index)}
                      className="p-2 text-error/60 hover:text-error min-w-[44px] min-h-[44px] flex items-center justify-center"
                    >
                      ×
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => actualizarCantidad(index, item.cantidad - 1)}
                      className="w-11 h-11 bg-surface rounded-xl border border-outline-variant flex items-center justify-center hover:bg-surface-container-high transition-colors"
                    >
                      -
                    </button>
                    <span className="w-8 text-center text-on-surface">{item.cantidad}</span>
                    <button
                      onClick={() => actualizarCantidad(index, item.cantidad + 1)}
                      className="w-11 h-11 bg-surface rounded-xl border border-outline-variant flex items-center justify-center hover:bg-surface-container-high transition-colors"
                    >
                      +
                    </button>
                    <span className="ml-auto font-medium text-on-surface">
                      ${item.subtotal.toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Método de pago y total */}
        <div className="p-4 border-t border-outline-variant">
          <div className="mb-4">
            <p className="text-label-md text-on-surface-variant mb-2">Método de pago</p>
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

          <div className="flex justify-between items-center mb-4">
            <span className="text-headline-md font-semibold text-on-surface">Total</span>
            <span className="text-headline-lg font-bold text-on-surface">
              ${total.toFixed(2)}
            </span>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-error-container text-on-error-container rounded-xl text-center text-label-md">
              {error}
            </div>
          )}

          <button
            onClick={handleCobrar}
            disabled={carrito.length === 0 || loading}
            className="w-full py-3 bg-secondary text-on-secondary rounded-xl hover:bg-secondary/90 disabled:opacity-50 font-medium transition-colors"
          >
            {loading ? "Procesando..." : "Cobrar"}
          </button>
        </div>
      </div>

      <ConfirmModal
        open={modalCobrar}
        titulo="Confirmar Venta"
        mensaje={`Cobrar $${total.toFixed(2)}\nMétodo: ${metodoPago === "efectivo" ? "Efectivo" : "Transferencia"}\nArtículos: ${carrito.length}`}
        textoConfirmar="Cobrar"
        textoCancelar="Cancelar"
        variante="advertencia"
        onConfirmar={confirmarCobrar}
        onCancelar={() => setModalCobrar(false)}
        cargando={loading}
      />
    </div>
  );
}
