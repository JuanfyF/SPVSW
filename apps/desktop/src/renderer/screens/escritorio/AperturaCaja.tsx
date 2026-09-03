import { useState, useEffect } from "react";
import { formatearFecha, formatearHora } from "@pos/shared";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/auth";
import ConfirmModal from "../../components/ConfirmModal";
import { CircleDollarSign } from "lucide-react";

interface Producto {
  id: number;
  nombre: string;
  categoria: string | null;
  tipoVenta: string;
}

export default function AperturaCaja() {
  const navigate = useNavigate();
  const { usuario, setSesionCaja } = useAuthStore();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [stockInicial, setStockInicial] = useState<Record<number, { entero: string; porcion: string }>>({});
  const [loading, setLoading] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [paso, setPaso] = useState<"abrir" | "stock">("abrir");
  const [sesionLocal, setSesionLocal] = useState<{ id: number } | null>(null);
  const [modalAbrir, setModalAbrir] = useState(false);
  const [sesionStale, setSesionStale] = useState<{ id: number } | null>(null);

  useEffect(() => {
    cargarProductos();
  }, []);

  const cargarProductos = async () => {
    try {
      const data = await window.pos.productos.listar();
      setProductos(data);
      const initial: Record<number, { entero: string; porcion: string }> = {};
      for (const p of data) {
        initial[p.id] = { entero: "0", porcion: "0" };
      }
      setStockInicial(initial);
    } catch (err) {
      console.error("Error al cargar productos:", err);
    } finally {
      setCargando(false);
    }
  };

  const handleAbrir = () => {
    if (!usuario) return;
    setModalAbrir(true);
  };

  const confirmarAbrir = async () => {
    if (!usuario) return;

    setLoading(true);
    setError("");
    setSesionStale(null);

    try {
      const hoy = formatearFecha(new Date());
      const hora = formatearHora(new Date());

      const sesion = await window.pos.caja.abrir({
        usuarioId: usuario.id,
        fecha: hoy!,
        horaApertura: hora!,
      });

      setSesionCaja(sesion);
      setSesionLocal({ id: sesion.id });
      setPaso("stock");
    } catch (err: any) {
      const msg = err.message || "Error al abrir la caja";
      if (msg.includes("Ya existe una sesión abierta")) {
        // Obtener la sesión stale para ofrecer forzar cierre
        const sesionAbierta = await window.pos.caja.obtenerSesionAbierta(usuario.id);
        if (sesionAbierta) {
          setSesionStale({ id: sesionAbierta.id });
        }
        setError("Ya existe una sesión abierta. Puedes forzar el cierre de la sesión anterior.");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForzarCierre = async () => {
    if (!usuario || !sesionStale) return;
    setLoading(true);
    setError("");
    try {
      await window.pos.caja.forzarCierre(sesionStale.id, usuario.id);
      setSesionStale(null);
      setError("");
      // Ahora sí puede abrir
      await confirmarAbrir();
    } catch (err: any) {
      setError(err.message || "Error al forzar cierre");
    } finally {
      setLoading(false);
    }
  };

  const handleGuardarStock = async () => {
    if (!sesionLocal) {
      setError("No hay sesión de caja abierta. Vuelve a abrir caja.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const hoy = formatearFecha(new Date());
      const sesionCajaId = sesionLocal.id;

      for (const producto of productos) {
        const stock = stockInicial[producto.id];
        if (!stock) continue;

        const entero = parseInt(stock.entero || "0", 10);
        const porcion = parseInt(stock.porcion || "0", 10);

        if (!isNaN(entero) && entero > 0) {
          await window.pos.stock.registrarStock({
            productoId: producto.id,
            sesionCajaId,
            unidad: "entero",
            fecha: hoy,
            cantidadInicial: entero,
          });
        }

        if (!isNaN(porcion) && porcion > 0) {
          await window.pos.stock.registrarStock({
            productoId: producto.id,
            sesionCajaId,
            unidad: "porcion",
            fecha: hoy,
            cantidadInicial: porcion,
          });
        }
      }

      navigate("/");
    } catch (err: any) {
      setError(err.message || "Error al guardar stock");
    } finally {
      setLoading(false);
    }
  };

  if (cargando) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-on-surface-variant">Cargando productos...</div>
      </div>
    );
  }

  // Paso 2: Stock inicial
  if (paso === "stock") {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-headline-lg font-bold text-on-surface">Stock Inicial del Día</h1>
          <p className="text-on-surface-variant">
            Registra cuántos productos salen a la vitrina. Puedes poner 0 si no sales con ese producto.
          </p>
        </div>

        <div className="bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant overflow-x-auto hover:shadow-md transition-shadow">
          <table className="w-full">
            <thead>
              <tr className="border-b border-outline-variant">
                <th className="text-left p-4 text-on-surface-variant font-medium">Producto</th>
                <th className="text-center p-4 text-on-surface-variant font-medium w-28">Enteros</th>
                <th className="text-center p-4 text-on-surface-variant font-medium w-28">Porciones</th>
              </tr>
            </thead>
            <tbody>
              {productos.map((producto) => {
                const stock = stockInicial[producto.id] || { entero: "0", porcion: "0" };
                const muestraEntero = producto.tipoVenta === "entero" || producto.tipoVenta === "ambos";
                const muestraPorcion = producto.tipoVenta === "porcion" || producto.tipoVenta === "porcion_llevar" || producto.tipoVenta === "ambos";
                return (
                  <tr key={producto.id} className="border-b border-outline-variant/50">
                    <td className="p-4 font-medium text-on-surface">{producto.nombre}</td>
                    <td className="p-4 text-center">
                      {muestraEntero ? (
                        <input
                          type="number"
                          value={stock.entero}
                          onChange={(e) =>
                            setStockInicial((prev) => ({
                              ...prev,
                              [producto.id]: { ...prev[producto.id], entero: e.target.value },
                            }))
                          }
                          min="0"
                          max="99999"
                          className="w-20 px-3 py-2 text-center border border-outline-variant rounded-xl focus:outline-none focus:border-secondary bg-surface"
                        />
                      ) : (
                        <span className="text-on-surface-variant text-label-md">-</span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      {muestraPorcion ? (
                        <input
                          type="number"
                          value={stock.porcion}
                          onChange={(e) =>
                            setStockInicial((prev) => ({
                              ...prev,
                              [producto.id]: { ...prev[producto.id], porcion: e.target.value },
                            }))
                          }
                          min="0"
                          max="99999"
                          className="w-20 px-3 py-2 text-center border border-outline-variant rounded-xl focus:outline-none focus:border-secondary bg-surface"
                        />
                      ) : (
                        <span className="text-on-surface-variant text-label-md">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-error-container text-on-error-container rounded-xl text-center">
            {error}
          </div>
        )}

        <div className="flex gap-4 mt-6">
          <button
            onClick={() => {
              setSesionCaja(null);
              setSesionLocal(null);
              setPaso("abrir");
            }}
            className="flex-1 py-3 border border-outline-variant text-on-surface-variant rounded-xl hover:bg-surface-container transition-colors"
          >
            Volver
          </button>
          <button
            onClick={handleGuardarStock}
            disabled={loading}
            className="flex-1 py-3 bg-tertiary text-on-tertiary rounded-xl hover:bg-tertiary/90 disabled:opacity-50 transition-colors"
          >
            {loading ? "Guardando..." : "Guardar y Empezar"}
          </button>
        </div>
      </div>
    );
  }

  // Paso 1: Abrir caja
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-headline-lg font-bold text-on-surface">Apertura de Caja</h1>
        <p className="text-on-surface-variant">
          {new Date().toLocaleDateString("es-EC", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      <div className="max-w-md mx-auto">
        <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant hover:shadow-md transition-shadow">
          <div className="text-center mb-6">
            <div className="w-20 h-20 bg-tertiary-fixed rounded-full flex items-center justify-center mx-auto mb-4">
              <CircleDollarSign className="w-10 h-10 text-on-tertiary" />
            </div>
            <h2 className="text-xl font-semibold text-on-surface">Abrir Caja</h2>
            <p className="text-on-surface-variant mt-2">
              Inicia una nueva sesión de caja para el día de hoy
            </p>
          </div>

          <div className="space-y-4 mb-6">
            <div className="p-4 bg-surface-container rounded-xl">
              <p className="text-label-md text-on-surface-variant">Fecha</p>
              <p className="font-medium text-on-surface">
                {new Date().toLocaleDateString("es-EC")}
              </p>
            </div>
            <div className="p-4 bg-surface-container rounded-xl">
              <p className="text-label-md text-on-surface-variant">Hora de apertura</p>
              <p className="font-medium text-on-surface">
                {new Date().toLocaleTimeString("es-EC", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
            <div className="p-4 bg-surface-container rounded-xl">
              <p className="text-label-md text-on-surface-variant">Cajero</p>
              <p className="font-medium text-on-surface">{usuario?.nombre}</p>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-error-container text-on-error-container rounded-xl text-center">
              {error}
              {sesionStale && (
                <button
                  onClick={handleForzarCierre}
                  disabled={loading}
                  className="mt-3 px-4 py-2 bg-error text-on-error rounded-lg hover:bg-error/90 disabled:opacity-50 transition-colors text-label-md"
                >
                  {loading ? "Cerrando..." : "Forzar Cierre y Abrir Nueva"}
                </button>
              )}
            </div>
          )}

          <div className="flex gap-4">
            <button
              onClick={() => navigate("/")}
              className="flex-1 py-3 border border-outline-variant text-on-surface-variant rounded-xl hover:bg-surface-container transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleAbrir}
              disabled={loading}
              className="flex-1 py-3 bg-tertiary text-on-tertiary rounded-xl hover:bg-tertiary/90 disabled:opacity-50 transition-colors"
            >
              {loading ? "Abriendo..." : "Abrir Caja"}
            </button>
          </div>
        </div>
      </div>

      <ConfirmModal
        open={modalAbrir}
        titulo="Abrir Caja"
        mensaje={`¿Abrir sesión de caja?\n\nFecha: ${new Date().toLocaleDateString("es-EC")}\nHora: ${new Date().toLocaleTimeString("es-EC")}\nCajero: ${usuario?.nombre}`}
        textoConfirmar="Abrir Caja"
        textoCancelar="Cancelar"
        variante="info"
        onConfirmar={confirmarAbrir}
        onCancelar={() => setModalAbrir(false)}
        cargando={loading}
      />
    </div>
  );
}
