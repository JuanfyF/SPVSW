import { useState, useEffect, useRef, useCallback } from "react";
import { useAuthStore } from "../../store/auth";
import { Package } from "lucide-react";

interface Producto {
  id: number;
  nombre: string;
  categoria: string | null;
  tipoVenta: string;
  precioEntero: number | null;
  precioPorcion: number | null;
}

interface StockItem {
  id: number;
  productoId: number;
  unidad: string;
  cantidadInicial: number;
  cantidadAgregada: number;
  conteoFisicoCierre: number | null;
  diferenciaDetectada: number | null;
}

export default function Stock() {
  const { sesionCaja } = useAuthStore();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [stock, setStock] = useState<StockItem[]>([]);
  const [vendido, setVendido] = useState<Record<string, number>>({});
  const [merma, setMerma] = useState<Record<string, number>>({});
  const [cortesia, setCortesia] = useState<Record<string, number>>({});
  const [corte, setCorte] = useState<Record<string, number>>({});
  const [busqueda, setBusqueda] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Modal reposición
  const [modalReposicion, setModalReposicion] = useState(false);
  const [productoReposicion, setProductoReposicion] = useState<Producto | null>(null);
  const [unidadReposicion, setUnidadReposicion] = useState<"entero" | "porcion">("entero");
  const [cantidadReposicion, setCantidadReposicion] = useState("");

  const [modalError, setModalError] = useState("");
  const sesionCajaRef = useRef(sesionCaja);
  sesionCajaRef.current = sesionCaja;

  const cargarDatos = useCallback(async () => {
    const sesionActual = sesionCajaRef.current;
    try {
      // Todas las llamadas IPC en paralelo (1 sola ronda)
      const [productosData, stockData, allMermas, allCortesias, vendidoLote, ajusteCortes] =
        await Promise.all([
          window.pos.productos.listar(),
          sesionActual ? window.pos.stock.obtenerStockPorSesion(sesionActual.id) : [],
          sesionActual ? window.pos.stock.listarMermasPorSesion(sesionActual.id) : [],
          sesionActual ? window.pos.stock.listarCortesiasPorSesion(sesionActual.id) : [],
          sesionActual ? window.pos.stock.calcularVendidoLote(sesionActual.id) : {},
          sesionActual ? window.pos.stock.calcularAjusteCortesLote(sesionActual.id) : {},
        ]);

      setProductos(productosData);
      setStock(stockData);

      const vendidoMap: Record<string, number> = {};
      const mermaMap: Record<string, number> = {};
      const cortesiaMap: Record<string, number> = {};
      const corteMap: Record<string, number> = {};

      for (const s of stockData) {
        const key = `${s.productoId}-${s.unidad}`;
        const lookupKey = `${s.productoId}:${s.unidad}`;
        vendidoMap[key] = (vendidoLote as Record<string, number>)[lookupKey] ?? 0;
        corteMap[key] = (ajusteCortes as Record<string, number>)[lookupKey] ?? 0;

        mermaMap[key] = (allMermas as any[])
          .filter((m) => m.productoId === s.productoId && m.unidad === s.unidad)
          .reduce((sum, m) => sum + m.cantidad, 0);

        cortesiaMap[key] = (allCortesias as any[])
          .filter((c) => c.productoId === s.productoId && c.unidad === s.unidad)
          .reduce((sum, c) => sum + c.cantidad, 0);
      }
      setVendido(vendidoMap);
      setMerma(mermaMap);
      setCortesia(cortesiaMap);
      setCorte(corteMap);
    } catch (err) {
      console.error("Error al cargar datos:", err);
      setError("Error al cargar datos de stock");
    } finally {
      setLoading(false);
    }
  }, [sesionCaja]);

  useEffect(() => {
    const interval = setInterval(() => {
      cargarDatos();
    }, 10000);
    return () => clearInterval(interval);
  }, [cargarDatos]);

  const productosFiltrados = productos.filter((p) =>
    p.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  const getStockProducto = (productoId: number, unidad: string) => {
    return stock.find((s) => s.productoId === productoId && s.unidad === unidad);
  };

  const handleReposicion = async () => {
    if (!productoReposicion || !cantidadReposicion || !sesionCaja) return;
    setLoading(true);
    setModalError("");
    try {
      const cantidad = parseInt(cantidadReposicion, 10);
      if (isNaN(cantidad) || cantidad <= 0) throw new Error("Cantidad inválida");
      await window.pos.stock.registrarReposicion(productoReposicion.id, sesionCaja.id, cantidad, unidadReposicion);
      await cargarDatos();
      setModalReposicion(false);
      setProductoReposicion(null);
      setCantidadReposicion("");
    } catch (err: any) {
      setModalError(err.message || "Error al registrar reposición");
    } finally {
      setLoading(false);
    }
  };

  if (loading && stock.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-on-surface-variant">Cargando...</div>
      </div>
    );
  }

  if (error && stock.length === 0) {
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
          <h1 className="text-headline-lg font-bold text-on-surface">Stock</h1>
          <p className="text-on-surface-variant">
            {sesionCaja ? `Sesión: ${sesionCaja.fecha}` : "Sin sesión activa"}
          </p>
        </div>
        <button
          onClick={() => setModalReposicion(true)}
          className="px-4 py-2 bg-tertiary text-on-tertiary rounded-xl hover:bg-tertiary/90 transition-colors"
        >
          + Reposición
        </button>
      </div>

      {/* Búsqueda */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Buscar productos..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-full px-4 py-3 border border-outline-variant rounded-xl focus:outline-none focus:border-secondary bg-surface-container-lowest"
        />
      </div>

      {/* Lista de productos */}
      <div className="bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-outline-variant">
              <th className="text-left p-4 text-on-surface-variant font-medium">Producto</th>
              <th className="text-center p-4 text-on-surface-variant font-medium">Unidad</th>
              <th className="text-right p-4 text-on-surface-variant font-medium">Inicial</th>
              <th className="text-right p-4 text-on-surface-variant font-medium">Agregada</th>
              <th className="text-right p-4 text-on-surface-variant font-medium">Vendida</th>
              <th className="text-right p-4 text-on-surface-variant font-medium">Disponible</th>
              <th className="text-center p-4 text-on-surface-variant font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {productosFiltrados.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-on-surface-variant">
                  <Package className="w-10 h-10 mx-auto mb-3 text-on-surface-variant/40" />
                  {busqueda ? `No se encontraron productos para "${busqueda}"` : "No hay productos registrados"}
                </td>
              </tr>
            ) : (
              productosFiltrados.map((producto) => {
                const stockEntero = getStockProducto(producto.id, "entero");
                const stockPorcion = getStockProducto(producto.id, "porcion");
                const rows: { unidad: string; label: string; item: StockItem | undefined; key: string }[] = [];

                if (stockEntero || producto.tipoVenta === "entero" || producto.tipoVenta === "ambos") {
                  rows.push({
                    unidad: "entero",
                    label: "Entero",
                    item: stockEntero,
                    key: `${producto.id}-entero`,
                  });
                }
                if (stockPorcion || producto.tipoVenta === "porcion" || producto.tipoVenta === "porcion_llevar" || producto.tipoVenta === "ambos") {
                  rows.push({
                    unidad: "porcion",
                    label: "Porción",
                    item: stockPorcion,
                    key: `${producto.id}-porcion`,
                  });
                }

                if (rows.length === 0) {
                  rows.push({
                    unidad: "entero",
                    label: "-",
                    item: undefined,
                    key: `${producto.id}-empty`,
                  });
                }

                return rows.map((row, idx) => {
                  const inicial = row.item?.cantidadInicial ?? 0;
                  const agregada = row.item?.cantidadAgregada ?? 0;
                  const vendidoCantidad = vendido[row.key] ?? 0;
                  const mermaCantidad = merma[row.key] ?? 0;
                  const cortesiaCantidad = cortesia[row.key] ?? 0;
                  const corteAjuste = corte[row.key] ?? 0;
                  const disponible =
                    inicial + agregada - vendidoCantidad - mermaCantidad - cortesiaCantidad + corteAjuste;

                  return (
                    <tr key={row.key} className="border-b border-outline-variant/50">
                      {idx === 0 && (
                        <td className="p-4" rowSpan={rows.length}>
                          <p className="font-medium text-on-surface">{producto.nombre}</p>
                          <p className="text-xs text-on-surface-variant">{producto.categoria || "-"}</p>
                        </td>
                      )}
                      <td className="p-4 text-center">
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                          row.unidad === "entero"
                            ? "bg-secondary-container text-on-secondary-container"
                            : "bg-tertiary-container text-on-tertiary-container"
                        }`}>
                          {row.label}
                        </span>
                      </td>
                      <td className="p-4 text-right text-on-surface">{inicial}</td>
                      <td className="p-4 text-right text-on-surface">{agregada}</td>
                      <td className="p-4 text-right text-error">{vendidoCantidad}</td>
                      <td className="p-4 text-right font-medium text-on-surface">
                        {disponible}
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex gap-1 justify-center items-center flex-wrap">
                          <button
                            onClick={() => {
                              setProductoReposicion(producto);
                              setUnidadReposicion(row.unidad as "entero" | "porcion");
                              setModalReposicion(true);
                            }}
                            className="px-2 py-1 text-xs bg-surface-container text-on-surface rounded-lg hover:bg-surface-container-high transition-colors whitespace-nowrap"
                          >
                            +Repo
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                });
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal reposición */}
      {modalReposicion && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={(e) => { if (e.target === e.currentTarget) setModalReposicion(false); }}
        >
          <div className="bg-surface-container-lowest rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-xl font-bold text-on-surface mb-4">Registrar Reposición</h2>
            {productoReposicion && (
              <div className="mb-4 p-4 bg-surface-container rounded-xl">
                <p className="font-medium text-on-surface">{productoReposicion.nombre}</p>
                <p className="text-sm text-on-surface-variant">Unidad: {unidadReposicion === "entero" ? "Entero" : "Porción"}</p>
              </div>
            )}
            <div className="mb-4">
              <label className="block text-sm text-on-surface-variant mb-2">Cantidad a agregar</label>
              <input
                type="number"
                value={cantidadReposicion}
                onChange={(e) => setCantidadReposicion(e.target.value)}
                className="w-full px-4 py-3 border border-outline-variant rounded-xl focus:outline-none focus:border-secondary bg-surface"
                min="1"
                max="99999"
              />
            </div>
            {modalError && (
              <div className="mb-4 p-3 bg-error-container text-on-error-container rounded-xl text-center">{modalError}</div>
            )}
            <div className="flex gap-4">
              <button onClick={() => { setModalReposicion(false); setProductoReposicion(null); setCantidadReposicion(""); setModalError(""); }}
                className="flex-1 py-3 border border-outline-variant text-on-surface-variant rounded-xl transition-colors">Cancelar</button>
              <button onClick={handleReposicion} disabled={!cantidadReposicion || loading}
                className="flex-1 py-3 bg-tertiary text-on-tertiary rounded-xl hover:bg-tertiary/90 disabled:opacity-50 transition-colors">
                {loading ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
