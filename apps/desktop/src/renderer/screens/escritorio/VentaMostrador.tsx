import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../../store/auth";
import ConfirmModal from "../../components/ConfirmModal";
import { Package, Printer, ShoppingBag, Star } from "lucide-react";
import { imprimirRecibo, formatearMoneda, type DatosRecibo } from "@pos/shared";
import type { Producto } from "@pos/shared";

const RECARGO_LLEVAR = 0.10; // Costo del repostero para llevar

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
  const [categoriaSel, setCategoriaSel] = useState("");
  const [metodoPago, setMetodoPago] = useState<"efectivo" | "transferencia">("efectivo");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [modalCobrar, setModalCobrar] = useState(false);
  const [ultimaVenta, setUltimaVenta] = useState<DatosRecibo | null>(null);

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

  const categorias = (() => {
    const set = new Set<string>();
    for (const p of productos) {
      const c = p.categoria?.trim();
      if (c) set.add(c);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "es"));
  })();
  const haySinCategoria = productos.some((p) => !p.categoria?.trim());

  const conteoCategoria = (cat: string) =>
    productos.filter((p) => (p.categoria?.trim() || "") === cat).length;

  const productosFiltrados = productos.filter((p) => {
    const coincideBusqueda = p.nombre.toLowerCase().includes(busqueda.toLowerCase());
    if (!coincideBusqueda) return false;
    const cat = p.categoria?.trim() || "";
    if (categoriaSel === "__otros__") return cat === "";
    if (categoriaSel) return cat === categoriaSel;
    return true;
  });

  const buscando = busqueda.trim().length > 0;

  const secciones: { titulo: string | null; productos: Producto[] }[] = (() => {
    if (buscando) return [{ titulo: null, productos: productosFiltrados }];
    const mapa = new Map<string, Producto[]>();
    for (const p of productosFiltrados) {
      const cat = p.categoria?.trim() || "Otros";
      const arr = mapa.get(cat) ?? [];
      arr.push(p);
      mapa.set(cat, arr);
    }
    return Array.from(mapa, ([titulo, prods]) => ({ titulo, productos: prods }));
  })();

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
  const cantidadArticulos = carrito.reduce((sum, item) => sum + item.cantidad, 0);

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

      const resultado = await window.pos.ventas.crear({
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

      setUltimaVenta({
        ventaId: resultado?.id ?? Date.now(),
        fecha: new Date().toLocaleString("es-EC"),
        cajero: usuario?.nombre ?? "N/A",
        metodoPago: esCortesia ? "cortesia" : metodoPago,
        items: carrito.map((item) => ({
          nombre: item.nombre,
          unidad: item.unidad,
          cantidad: item.cantidad,
          precioUnitario: item.precioUnitario,
          subtotal: item.subtotal,
        })),
        total,
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
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header fijo: título, búsqueda y filtros */}
        <div className="p-6 pb-4 shrink-0">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-headline-lg font-bold text-on-surface">Venta de Mostrador</h1>
            {ultimaVenta && (
              <button
                onClick={() => {
                  imprimirRecibo(ultimaVenta);
                  setUltimaVenta(null);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-secondary text-on-secondary rounded-xl hover:bg-secondary/90 transition-colors text-sm"
                aria-label="Imprimir recibo de la última venta"
              >
                <Printer className="w-4 h-4" />
                Imprimir Último Recibo
              </button>
            )}
          </div>
          <input
            type="text"
            placeholder="Buscar productos..."
            aria-label="Buscar productos por nombre"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full px-4 py-3 border border-outline-variant rounded-xl focus:outline-none focus:border-secondary bg-surface-container-lowest"
          />
          {(categorias.length > 0 || haySinCategoria) && (
            <div
              className="flex flex-wrap gap-2 mt-3"
              role="group"
              aria-label="Filtrar por categoría"
            >
              <button
                onClick={() => setCategoriaSel("")}
                aria-pressed={categoriaSel === ""}
                className={`px-3.5 py-1.5 rounded-full text-label-md transition-colors ${
                  categoriaSel === ""
                    ? "bg-secondary text-on-secondary"
                    : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
                }`}
              >
                Todas <span className="opacity-70">({productos.length})</span>
              </button>
              {categorias.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoriaSel(cat)}
                  aria-pressed={categoriaSel === cat}
                  className={`px-3.5 py-1.5 rounded-full text-label-md transition-colors ${
                    categoriaSel === cat
                      ? "bg-secondary text-on-secondary"
                      : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
                  }`}
                >
                  {cat} <span className="opacity-70">({conteoCategoria(cat)})</span>
                </button>
              ))}
              {haySinCategoria && (
                <button
                  onClick={() => setCategoriaSel("__otros__")}
                  aria-pressed={categoriaSel === "__otros__"}
                  className={`px-3.5 py-1.5 rounded-full text-label-md transition-colors ${
                    categoriaSel === "__otros__"
                      ? "bg-secondary text-on-secondary"
                      : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
                  }`}
                >
                  Otros <span className="opacity-70">({conteoCategoria("")})</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Lista de productos */}
        <div className="flex-1 overflow-auto px-6 pb-6">
          {productosFiltrados.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-10 h-10 mx-auto mb-3 text-on-surface-variant/40" />
                <p className="text-on-surface-variant">
                  {busqueda
                    ? `No se encontraron productos para "${busqueda}"`
                    : categoriaSel
                      ? "No hay productos en esta categoría"
                      : "No hay productos disponibles en stock"}
                </p>
            </div>
          ) : (
            secciones.map((sec) => (
              <section key={sec.titulo ?? "__busqueda__"}>
                {sec.titulo && (
                  <div className="sticky top-0 z-10 bg-surface -mx-1 px-1 pt-1 pb-2.5 mb-3 flex items-baseline justify-between gap-3 border-b border-outline-variant/50">
                    <h2 className="text-caption font-semibold uppercase tracking-wider text-on-surface-variant">
                      {sec.titulo}
                    </h2>
                    <span className="text-caption text-on-surface-variant/70 tabular-nums">
                      {sec.productos.length} productos
                    </span>
                  </div>
                )}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
            {sec.productos.map((producto) => {
              const stockEntero = getDisponible(producto.id, "entero");
              const stockPorcion = getDisponible(producto.id, "porcion");
              const principal: "entero" | "porcion" = producto.precioEntero ? "entero" : "porcion";
              const precioPrincipal =
                principal === "entero" ? producto.precioEntero : producto.precioPorcion;
              const stockPrincipal = principal === "entero" ? stockEntero : stockPorcion;
              const hayStock = sesionCaja && Object.keys(stockDisponible).length > 0;
              const agotado =
                hayStock &&
                (stockEntero === Infinity || stockEntero <= 0) &&
                (stockPorcion === Infinity || stockPorcion <= 0);
              return (
                <div
                  key={producto.id}
                  className="bg-surface-container-lowest rounded-2xl p-4 shadow-sm border border-outline-variant overflow-hidden hover:shadow-md transition-shadow flex flex-col"
                >
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <div className="min-w-0">
                      <h3 className="font-medium text-on-surface leading-snug">
                        {producto.nombre}
                      </h3>
                      {buscando && producto.categoria && (
                        <p className="text-caption text-on-surface-variant mt-0.5">
                          {producto.categoria}
                        </p>
                      )}
                    </div>
                    {hayStock && (
                      <div className="flex flex-wrap gap-1.5 shrink-0 justify-end">
                        {agotado ? (
                          <span className="inline-flex px-2 py-0.5 rounded-full text-caption font-bold bg-error-container text-on-error-container">
                            Agotado
                          </span>
                        ) : (
                          <>
                            {stockEntero !== Infinity && (
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-caption font-bold ${
                                  stockEntero === 0
                                    ? "bg-error-container text-on-error-container"
                                    : stockEntero <= 3
                                      ? "bg-surface-container-high text-tertiary"
                                      : "bg-tertiary-fixed text-tertiary"
                                }`}
                              >
                                <span className="opacity-70">Ent:</span> {stockEntero}
                              </span>
                            )}
                            {stockPorcion !== Infinity && (
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-caption font-bold ${
                                  stockPorcion === 0
                                    ? "bg-error-container text-on-error-container"
                                    : stockPorcion <= 3
                                      ? "bg-surface-container-high text-tertiary"
                                      : "bg-secondary-fixed text-secondary"
                                }`}
                              >
                                <span className="opacity-70">Porc:</span> {stockPorcion}
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {precioPrincipal && (
                    <button
                      onClick={() => agregarAlCarrito(producto, principal)}
                      disabled={stockPrincipal !== Infinity && stockPrincipal <= 0}
                      className="w-full text-left bg-secondary/10 hover:bg-secondary/20 border border-secondary/25 rounded-xl px-3 py-2.5 mb-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label={`Agregar ${producto.nombre} ${
                        principal === "entero" ? "entero" : "porción servir"
                      } al carrito`}
                    >
                      <span className="block text-caption font-semibold uppercase tracking-wide text-on-surface-variant">
                        {principal === "entero" ? "Entero" : "Porción servir"}
                      </span>
                      <span className="block text-headline-md font-bold text-on-surface tabular-nums">
                        {formatearMoneda(precioPrincipal)}
                      </span>
                    </button>
                  )}

                  {producto.precioPorcion && principal === "entero" && (
                    <div className="flex flex-wrap gap-1.5 mb-1.5">
                      <button
                        onClick={() => agregarAlCarrito(producto, "porcion")}
                        disabled={stockPorcion !== Infinity && stockPorcion <= 0}
                        className="px-2.5 py-1.5 rounded-lg bg-surface-container border border-outline-variant text-caption text-on-surface hover:bg-surface-container-high transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Porción servir {formatearMoneda(producto.precioPorcion)}
                      </button>
                      <button
                        onClick={() => agregarAlCarrito(producto, "porcion_llevar")}
                        disabled={stockPorcion !== Infinity && stockPorcion <= 0}
                        className="px-2.5 py-1.5 rounded-lg bg-surface-container border border-outline-variant text-caption text-on-surface hover:bg-surface-container-high transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Porción llevar {formatearMoneda(producto.precioPorcion + RECARGO_LLEVAR)}
                      </button>
                    </div>
                  )}

                  {producto.precioPorcion && principal === "porcion" && (
                    <button
                      onClick={() => agregarAlCarrito(producto, "porcion_llevar")}
                      disabled={stockPorcion !== Infinity && stockPorcion <= 0}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-surface-container border border-outline-variant text-caption text-on-surface hover:bg-surface-container-high transition-colors mb-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Porción llevar {formatearMoneda(producto.precioPorcion + RECARGO_LLEVAR)}
                    </button>
                  )}

                  {producto.precioPorcion && (
                    <p className="text-caption text-on-surface-variant/80 mb-2">
                      +{formatearMoneda(RECARGO_LLEVAR)} por llevar
                    </p>
                  )}

                  <button
                    onClick={() => agregarCortesia(producto)}
                    disabled={!tieneStock(producto)}
                    className="mt-auto pt-2 flex items-center gap-1.5 self-start text-caption text-on-surface-variant hover:text-tertiary transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-on-surface-variant"
                    aria-label={`Agregar ${producto.nombre} como cortesía`}
                  >
                    <Star className="w-3.5 h-3.5" />
                    Cortesía
                  </button>
                </div>
              );
            })}
                </div>
              </section>
            ))
          )}
        </div>
      </div>

      {/* Panel del carrito */}
      <div className="w-96 bg-surface-container-lowest border-l border-outline-variant flex flex-col">
        <div className="p-4 border-b border-outline-variant flex items-center justify-between">
          <h2 className="text-headline-md font-semibold text-on-surface">Carrito</h2>
          {carrito.length > 0 && (
            <span className="text-caption text-on-surface-variant bg-surface-container px-2.5 py-1 rounded-full tabular-nums">
              {cantidadArticulos} {cantidadArticulos === 1 ? "artículo" : "artículos"}
            </span>
          )}
        </div>

        {/* Items del carrito */}
        <div className="flex-1 overflow-auto p-4">
          {carrito.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-14 px-4">
              <ShoppingBag className="w-10 h-10 mb-3 text-on-surface-variant/40" />
              <p className="text-body-md text-on-surface-variant">Tu carrito está vacío</p>
              <p className="text-caption text-on-surface-variant/70 mt-1">
                Toca un producto para agregarlo
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {carrito.map((item, index) => (
                <div
                  key={index}
                  className="p-3 bg-surface-container rounded-xl"
                >
                  <div className="flex justify-between items-start mb-1.5">
                    <div className="min-w-0 pr-2">
                      <p className="font-medium text-on-surface leading-snug">{item.nombre}</p>
                      <p className="text-caption text-on-surface-variant mt-0.5">
                        {item.unidad === "entero"
                          ? "Entero"
                          : item.unidad === "porcion_llevar"
                            ? "Porción llevar"
                            : "Porción servir"}{" "}
                        • {formatearMoneda(item.precioUnitario)}
                      </p>
                    </div>
                    <button
                      onClick={() => eliminarDelCarrito(index)}
                      className="p-2 text-error/60 hover:text-error min-w-[44px] min-h-[44px] flex items-center justify-center shrink-0"
                      aria-label={`Quitar ${item.nombre} del carrito`}
                    >
                      ×
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => actualizarCantidad(index, item.cantidad - 1)}
                      className="w-11 h-11 bg-surface rounded-xl border border-outline-variant flex items-center justify-center hover:bg-surface-container-high transition-colors"
                      aria-label="Disminuir cantidad"
                    >
                      -
                    </button>
                    <span className="w-8 text-center text-on-surface tabular-nums">{item.cantidad}</span>
                    <button
                      onClick={() => actualizarCantidad(index, item.cantidad + 1)}
                      className="w-11 h-11 bg-surface rounded-xl border border-outline-variant flex items-center justify-center hover:bg-surface-container-high transition-colors"
                      aria-label="Aumentar cantidad"
                    >
                      +
                    </button>
                    <span className="ml-auto font-medium text-on-surface tabular-nums">
                      {formatearMoneda(item.subtotal)}
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

          <div className="bg-tertiary-fixed rounded-xl px-4 py-3 mb-4 flex items-baseline justify-between gap-2">
            <span className="text-label-md font-semibold text-on-surface">Total</span>
            <span
              className={`text-display-price font-bold tabular-nums leading-none ${
                total > 0 ? "text-on-surface" : "text-on-surface-variant/60"
              }`}
            >
              {formatearMoneda(total)}
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
        mensaje={`Cobrar ${formatearMoneda(total)}\nMétodo: ${metodoPago === "efectivo" ? "Efectivo" : "Transferencia"}\nArtículos: ${cantidadArticulos}`}
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
