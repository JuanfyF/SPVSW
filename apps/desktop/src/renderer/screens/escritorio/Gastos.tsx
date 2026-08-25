import { useState, useEffect } from "react";
import { formatearFecha } from "@pos/shared";
import { useAuthStore } from "../../store/auth";

interface CategoriaGasto {
  id: number;
  nombre: string;
}

interface Gasto {
  id: number;
  fecha: string;
  categoriaId: number;
  descripcion: string;
  monto: number;
  origen: string;
}

export default function Gastos() {
  const { usuario, sesionCaja } = useAuthStore();
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [categorias, setCategorias] = useState<CategoriaGasto[]>([]);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [modalNuevo, setModalNuevo] = useState(false);
  const [modalCategoria, setModalCategoria] = useState(false);
  const [nuevaCategoria, setNuevaCategoria] = useState("");
  const [error, setError] = useState("");
  const [modalError, setModalError] = useState("");
  const [errores, setErrores] = useState<Record<string, string>>({});

  // Formulario
  const [categoriaId, setCategoriaId] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [monto, setMonto] = useState("");
  const [origen, setOrigen] = useState<"caja" | "pedidos">("caja");

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      const [gastosData, categoriasData] = await Promise.all([
        sesionCaja ? window.pos.gastos.listarPorSesion(sesionCaja.id) : [],
        window.pos.gastos.listarCategorias(),
      ]);
      setGastos(gastosData);
      setCategorias(categoriasData);
    } catch (err) {
      console.error("Error al cargar datos:", err);
      setError("Error al cargar datos de gastos");
    } finally {
      setLoading(false);
    }
  };

  const handleCrear = async () => {
    if (!sesionCaja || !usuario) return;

    setGuardando(true);
    setModalError("");

    try {
      if (!categoriaId) throw new Error("Selecciona una categoría");
      const catId = parseInt(categoriaId, 10);
      if (isNaN(catId) || catId <= 0) throw new Error("Categoría inválida");

      if (!descripcion || !descripcion.trim()) throw new Error("La descripción es requerida");
      if (descripcion.trim().length > 255) throw new Error("La descripción no puede tener más de 255 caracteres");

      if (!monto) throw new Error("El monto es requerido");
      const montoNum = parseFloat(monto);
      if (isNaN(montoNum) || montoNum <= 0)
        throw new Error("El monto debe ser un número positivo");

      await window.pos.gastos.crear({
        fecha: formatearFecha(new Date()),
        sesionCajaId: sesionCaja.id,
        categoriaId: catId,
        descripcion: descripcion.trim(),
        monto: montoNum,
        origen,
        registradoPor: usuario.id,
      });

      await cargarDatos();
      setModalNuevo(false);
      setCategoriaId("");
      setDescripcion("");
      setMonto("");
    } catch (err: any) {
      setModalError(err.message || "Error al crear el gasto");
    } finally {
      setGuardando(false);
    }
  };

  const totalGastos = gastos.reduce((sum, g) => sum + g.monto, 0);

  const handleCrearCategoria = async () => {
    if (!nuevaCategoria.trim()) return;
    try {
      await window.pos.gastos.crearCategoria(nuevaCategoria.trim());
      const cats = await window.pos.gastos.listarCategorias();
      setCategorias(cats);
      setNuevaCategoria("");
      setModalCategoria(false);
    } catch (err: any) {
      setModalError(err.message || "Error al crear categoría");
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
      <div className="p-6 ">
        <div className="p-4 bg-error-container text-on-error-container rounded-xl">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 ">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">Gastos</h1>
          <p className="text-on-surface-variant">
            Total: ${totalGastos.toFixed(2)} • {gastos.length} gastos registrados
          </p>
        </div>
        <button
          onClick={() => setModalNuevo(true)}
          className="px-4 py-2 bg-secondary text-on-secondary rounded-xl hover:bg-secondary/90 transition-colors"
        >
          + Nuevo Gasto
        </button>
      </div>

      {/* Lista de gastos */}
      {gastos.length === 0 ? (
        <div className="text-center py-12">
          <span className="text-4xl">💸</span>
          <p className="mt-4 text-on-surface-variant">No hay gastos registrados</p>
        </div>
      ) : (
        <div className="bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-outline-variant">
                <th className="text-left p-4 text-on-surface-variant font-medium">
                  Descripción
                </th>
                <th className="text-left p-4 text-on-surface-variant font-medium">
                  Categoría
                </th>
                <th className="text-left p-4 text-on-surface-variant font-medium">
                  Origen
                </th>
                <th className="text-right p-4 text-on-surface-variant font-medium">
                  Monto
                </th>
              </tr>
            </thead>
            <tbody>
              {gastos.map((gasto) => (
                <tr key={gasto.id} className="border-b border-outline-variant/50">
                  <td className="p-4">
                    <p className="font-medium text-on-surface">{gasto.descripcion}</p>
                    <p className="text-sm text-on-surface-variant">
                      {new Date(gasto.fecha).toLocaleDateString("es-EC")}
                    </p>
                  </td>
                  <td className="p-4 text-on-surface">
                    {categorias.find((c) => c.id === gasto.categoriaId)?.nombre || "-"}
                  </td>
                  <td className="p-4">
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        gasto.origen === "caja"
                          ? "bg-surface-container text-on-surface"
                          : "bg-tertiary-fixed text-tertiary"
                      }`}
                    >
                      {gasto.origen === "caja" ? "Caja" : "Pedidos"}
                    </span>
                  </td>
                  <td className="p-4 text-right font-medium text-on-surface">
                    ${gasto.monto.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal nuevo gasto */}
      {modalNuevo && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={(e) => { if (e.target === e.currentTarget) { setModalNuevo(false); setErrores({}); } }}
          onKeyDown={(e) => { if (e.key === "Escape") { setModalNuevo(false); setErrores({}); } }}
          tabIndex={0}
        >
          <div className="bg-surface-container-lowest rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-xl font-bold text-on-surface mb-4">
              Nuevo Gasto
            </h2>

            <div className="space-y-4 mb-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm text-on-surface-variant">
                    Categoría *
                  </label>
                  <button
                    onClick={() => setModalCategoria(true)}
                    className="text-xs text-secondary hover:text-secondary/80"
                  >
                    + Nueva
                  </button>
                </div>
                <select
                  value={categoriaId}
                  onChange={(e) => setCategoriaId(e.target.value)}
                  className="w-full px-4 py-2 border border-outline-variant rounded-xl focus:outline-none focus:border-secondary bg-surface"
                >
                  <option value="">Seleccionar...</option>
                  {categorias.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-on-surface-variant mb-1">
                  Descripción *
                </label>
                <input
                  type="text"
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  onBlur={() => {
                    if (!descripcion.trim()) {
                      setErrores((prev) => ({ ...prev, descripcion: "La descripción es requerida" }));
                    } else {
                      setErrores((prev) => { const { descripcion: _, ...rest } = prev; return rest; });
                    }
                  }}
                  maxLength={255}
                  className={`w-full px-4 py-2 border rounded-xl focus:outline-none focus:border-secondary bg-surface ${errores.descripcion ? "border-error" : "border-outline-variant"}`}
                />
                {errores.descripcion && (
                  <p className="text-error text-xs mt-1">{errores.descripcion}</p>
                )}
              </div>

              <div>
                <label className="block text-sm text-on-surface-variant mb-1">
                  Monto *
                </label>
                <input
                  type="number"
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                  onBlur={() => {
                    const num = parseFloat(monto);
                    if (!monto || isNaN(num) || num <= 0) {
                      setErrores((prev) => ({ ...prev, monto: "El monto debe ser mayor a 0" }));
                    } else {
                      setErrores((prev) => { const { monto: _, ...rest } = prev; return rest; });
                    }
                  }}
                  min="0.01"
                  step="0.01"
                  max="999999"
                  className={`w-full px-4 py-2 border rounded-xl focus:outline-none focus:border-secondary bg-surface ${errores.monto ? "border-error" : "border-outline-variant"}`}
                />
                {errores.monto && (
                  <p className="text-error text-xs mt-1">{errores.monto}</p>
                )}
              </div>

              <div>
                <label className="block text-sm text-on-surface-variant mb-1">
                  Origen
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setOrigen("caja")}
                    className={`flex-1 py-2 rounded-xl transition-colors ${
                      origen === "caja"
                        ? "bg-secondary text-on-secondary"
                        : "bg-surface-container text-on-surface-variant"
                    }`}
                  >
                    Caja
                  </button>
                  <button
                    onClick={() => setOrigen("pedidos")}
                    className={`flex-1 py-2 rounded-xl transition-colors ${
                      origen === "pedidos"
                        ? "bg-secondary text-on-secondary"
                        : "bg-surface-container text-on-surface-variant"
                    }`}
                  >
                    Pedidos
                  </button>
                </div>
              </div>
            </div>

            {modalError && (
              <div className="mb-4 p-3 bg-error-container text-on-error-container rounded-xl text-center">
                {modalError}
              </div>
            )}

            <div className="flex gap-4">
              <button
                onClick={() => {
                  setModalNuevo(false);
                  setCategoriaId("");
                  setDescripcion("");
                  setMonto("");
                  setModalError("");
                  setErrores({});
                }}
                className="flex-1 py-3 border border-outline-variant text-on-surface-variant rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCrear}
                disabled={!categoriaId || !descripcion || !monto || guardando}
                className="flex-1 py-3 bg-secondary text-on-secondary rounded-xl hover:bg-secondary/90 disabled:opacity-50 transition-colors"
              >
                {guardando ? "Creando..." : "Crear Gasto"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal crear categoría */}
      {modalCategoria && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={(e) => { if (e.target === e.currentTarget) { setModalCategoria(false); setErrores({}); } }}
        >
          <div className="bg-surface-container-lowest rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h2 className="text-xl font-bold text-on-surface mb-4">Nueva Categoría</h2>
            <input
              type="text"
              value={nuevaCategoria}
              onChange={(e) => setNuevaCategoria(e.target.value)}
              onBlur={() => {
                if (!nuevaCategoria.trim()) {
                  setErrores((prev) => ({ ...prev, nuevaCategoria: "El nombre es requerido" }));
                } else {
                  setErrores((prev) => { const { nuevaCategoria: _, ...rest } = prev; return rest; });
                }
              }}
              maxLength={100}
              placeholder="Nombre de la categoría"
              className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:border-secondary bg-surface mb-4 ${errores.nuevaCategoria ? "border-error" : "border-outline-variant"}`}
              autoFocus
            />
            {errores.nuevaCategoria && (
              <p className="text-error text-xs mt-1 mb-2">{errores.nuevaCategoria}</p>
            )}
            <div className="flex gap-4">
              <button
                onClick={() => { setModalCategoria(false); setNuevaCategoria(""); setErrores({}); }}
                className="flex-1 py-3 border border-outline-variant text-on-surface-variant rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCrearCategoria}
                disabled={!nuevaCategoria.trim()}
                className="flex-1 py-3 bg-secondary text-on-secondary rounded-xl hover:bg-secondary/90 disabled:opacity-50 transition-colors"
              >
                Crear
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
