import { useState, useEffect } from "react";
import { useAuthStore } from "../../store/auth";

interface Producto {
  id: number;
  nombre: string;
  categoria: string | null;
}

interface StockItem {
  id: number;
  productoId: number;
  sesionCajaId: number;
  unidad: string;
  fecha: string;
  cantidadInicial: number;
  cantidadAgregada: number;
  conteoFisicoCierre: number | null;
  diferenciaDetectada: number | null;
  actualizadoEn: string;
}

export default function Stock() {
  const { sesionCaja } = useAuthStore();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [stock, setStock] = useState<StockItem[]>([]);
  const [vendido, setVendido] = useState<Record<string, number>>({});
  const [busqueda, setBusqueda] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      const [productosData, stockData, vendidoLote] = await Promise.all([
        window.pos.productos.listar(),
        sesionCaja ? window.pos.stock.obtenerStockPorSesion(sesionCaja.id) : [],
        sesionCaja ? window.pos.stock.calcularVendidoLote(sesionCaja.id) : {},
      ]);
      setProductos(productosData);
      setStock(stockData);

      const vendidoMap: Record<string, number> = {};
      for (const s of stockData) {
        const key = `${s.productoId}-${s.unidad}`;
        const lookupKey = `${s.productoId}:${s.unidad}`;
        vendidoMap[key] = (vendidoLote as Record<string, number>)[lookupKey] ?? 0;
      }
      setVendido(vendidoMap);
    } catch (err) {
      console.error("Error al cargar datos:", err);
    } finally {
      setLoading(false);
    }
  };

  const productosFiltrados = productos.filter((p) =>
    p.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  const getStockProducto = (productoId: number) => {
    return stock.filter((s) => s.productoId === productoId);
  };

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
      <div className="mb-4">
        <h1 className="text-xl font-bold text-on-surface">Stock</h1>
        <p className="text-on-surface-variant">
          {sesionCaja ? `Sesión: ${sesionCaja.fecha}` : "Sin sesión activa"}
        </p>
      </div>

      {/* Búsqueda */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Buscar productos..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-full px-4 py-3 border border-outline-variant rounded-xl"
        />
      </div>

      {/* Lista */}
      {productosFiltrados.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-on-surface-variant">No hay productos</p>
        </div>
      ) : (
        <div className="space-y-3">
          {productosFiltrados.map((producto) => {
            const stockEntries = getStockProducto(producto.id);

            return (
              <div
                key={producto.id}
                className="bg-surface-container-lowest p-4 rounded-xl shadow-sm border border-outline-variant"
              >
                <div className="mb-2">
                  <p className="font-medium text-on-surface">
                    {producto.nombre}
                  </p>
                  {producto.categoria && (
                    <p className="text-sm text-on-surface-variant">
                      {producto.categoria}
                    </p>
                  )}
                </div>

                {stockEntries.length === 0 ? (
                  <p className="text-sm text-on-surface-variant">Sin stock registrado</p>
                ) : (
                  <div className="space-y-2">
                    {stockEntries.map((stockItem) => {
                      const key = `${stockItem.productoId}-${stockItem.unidad}`;
                      const inicial = stockItem.cantidadInicial;
                      const agregada = stockItem.cantidadAgregada;
                      const total = inicial + agregada;
                      const vendidoCantidad = vendido[key] ?? 0;
                      const disponible = total - vendidoCantidad;

                      return (
                        <div key={key} className="p-2 bg-surface-container rounded">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-on-surface capitalize">
                              {stockItem.unidad}
                            </span>
                            <span className={`text-lg font-bold ${disponible > 0 ? "text-on-surface" : "text-error"}`}>
                              {disponible}
                            </span>
                          </div>
                          <div className="flex justify-between text-xs text-on-surface-variant mt-1">
                            <span>Inicial: {inicial}</span>
                            <span>Vendido: {vendidoCantidad}</span>
                            <span>Agregada: {agregada}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
