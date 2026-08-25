import { useState, useEffect } from "react";
import ConfirmModal from "../../components/ConfirmModal";

interface Producto {
  id: number;
  nombre: string;
  categoria: string | null;
  tipoVenta: string;
  precioEntero: number | null;
  precioPorcion: number | null;
  artesanal: boolean;
  activo: boolean;
  actualizadoEn: string;
}

interface FormularioProducto {
  nombre: string;
  categoria: string;
  tipoVenta: string;
  precioEntero: string;
  precioPorcion: string;
  artesanal: boolean;
}

const formularioVacio: FormularioProducto = {
  nombre: "",
  categoria: "",
  tipoVenta: "entero",
  precioEntero: "",
  precioPorcion: "",
  artesanal: false,
};

export default function Productos() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [modal, setModal] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [formulario, setFormulario] = useState<FormularioProducto>(formularioVacio);
  const [error, setError] = useState("");
  const [modalError, setModalError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [modalToggle, setModalToggle] = useState(false);
  const [productoToggle, setProductoToggle] = useState<Producto | null>(null);
  const [modalEliminar, setModalEliminar] = useState(false);
  const [productoEliminar, setProductoEliminar] = useState<Producto | null>(null);

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
    } finally {
      setLoading(false);
    }
  };

  const productosFiltrados = productos.filter((p) =>
    p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    (p.categoria && p.categoria.toLowerCase().includes(busqueda.toLowerCase()))
  );

  const abrirCrear = () => {
    setEditandoId(null);
    setFormulario(formularioVacio);
    setError("");
    setModalError("");
    setErrores({});
    setModal(true);
  };

  const abrirEditar = (producto: Producto) => {
    setEditandoId(producto.id);
    setFormulario({
      nombre: producto.nombre,
      categoria: producto.categoria || "",
      tipoVenta: producto.tipoVenta,
      precioEntero: producto.precioEntero?.toString() || "",
      precioPorcion: producto.precioPorcion?.toString() || "",
      artesanal: producto.artesanal,
    });
    setError("");
    setModalError("");
    setErrores({});
    setModal(true);
  };

  const guardar = async () => {
    setModalError("");
    if (!formulario.nombre.trim()) {
      setModalError("El nombre es requerido");
      return;
    }
    if (formulario.nombre.trim().length > 150) {
      setModalError("El nombre no puede tener más de 150 caracteres");
      return;
    }
    if (formulario.categoria.trim().length > 100) {
      setModalError("La categoría no puede tener más de 100 caracteres");
      return;
    }
    if (formulario.tipoVenta !== "personalizado") {
      if (formulario.tipoVenta === "entero" || formulario.tipoVenta === "ambos") {
        if (!formulario.precioEntero) {
          setModalError("El precio entero es requerido");
          return;
        }
        const pe = parseFloat(formulario.precioEntero);
        if (isNaN(pe) || pe <= 0) {
          setModalError("El precio entero debe ser un número positivo");
          return;
        }
      }
      if (formulario.tipoVenta === "porcion" || formulario.tipoVenta === "ambos") {
        if (!formulario.precioPorcion) {
          setModalError("El precio porción es requerido");
          return;
        }
        const pp = parseFloat(formulario.precioPorcion);
        if (isNaN(pp) || pp <= 0) {
          setModalError("El precio porción debe ser un número positivo");
          return;
        }
      }
    }

    setGuardando(true);
    try {
      const datos = {
        nombre: formulario.nombre.trim(),
        categoria: formulario.categoria.trim() || null,
        tipoVenta: formulario.tipoVenta,
        precioEntero: formulario.precioEntero ? parseFloat(formulario.precioEntero) : null,
        precioPorcion: formulario.precioPorcion ? parseFloat(formulario.precioPorcion) : null,
        artesanal: formulario.artesanal,
      };

      if (editandoId) {
        await window.pos.productos.actualizar(editandoId, datos);
      } else {
        await window.pos.productos.crear(datos);
      }
      setModal(false);
      await cargarProductos();
    } catch (err: any) {
      setModalError(err.message || "Error al guardar producto");
    } finally {
      setGuardando(false);
    }
  };

  const toggleActivo = async (producto: Producto) => {
    try {
      if (producto.activo) {
        await window.pos.productos.desactivar(producto.id);
      } else {
        await window.pos.productos.actualizar(producto.id, { activo: true } as any);
      }
      await cargarProductos();
    } catch (err: any) {
      console.error("Error al cambiar estado:", err);
    }
  };

  const confirmarToggle = async () => {
    if (!productoToggle) return;
    await toggleActivo(productoToggle);
    setModalToggle(false);
    setProductoToggle(null);
  };

  const eliminarProducto = async (producto: Producto) => {
    setProductoEliminar(producto);
    setModalEliminar(true);
  };

  const confirmarEliminar = async () => {
    if (!productoEliminar) return;
    try {
      await window.pos.productos.desactivar(productoEliminar.id);
      await cargarProductos();
    } catch (err: any) {
      setError(err.message || "Error al eliminar producto");
    }
    setModalEliminar(false);
    setProductoEliminar(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-on-surface-variant">Cargando productos...</div>
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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">Productos</h1>
          <p className="text-on-surface-variant">Gestiona los productos de la pastelería</p>
        </div>
        <button
          onClick={abrirCrear}
          className="px-4 py-2 bg-secondary text-on-secondary rounded-xl hover:bg-secondary/90 transition-colors"
        >
          + Nuevo Producto
        </button>
      </div>

      {/* Búsqueda */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Buscar por nombre o categoría..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-full px-4 py-3 border border-outline-variant rounded-xl focus:outline-none focus:border-secondary bg-surface-container-lowest"
        />
      </div>

      {/* Tabla */}
      <div className="bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant overflow-x-auto">
        <table className="w-full">
          <thead className="bg-surface-container">
            <tr>
              <th className="text-left p-4 text-on-surface-variant font-medium">Nombre</th>
              <th className="text-left p-4 text-on-surface-variant font-medium">Categoría</th>
              <th className="text-left p-4 text-on-surface-variant font-medium">Tipo</th>
              <th className="text-right p-4 text-on-surface-variant font-medium">Precio Entero</th>
              <th className="text-right p-4 text-on-surface-variant font-medium">Precio Porción</th>
              <th className="text-center p-4 text-on-surface-variant font-medium">Estado</th>
              <th className="text-center p-4 text-on-surface-variant font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {productosFiltrados.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-on-surface-variant">
                  {busqueda ? `No se encontraron productos para "${busqueda}"` : "No hay productos registrados"}
                </td>
              </tr>
            ) : (
              productosFiltrados.map((producto) => (
                <tr
                  key={producto.id}
                  className={`border-b border-outline-variant/50 ${!producto.activo ? "opacity-50" : ""}`}
                >
                  <td className="p-4">
                    <p className="font-medium text-on-surface">{producto.nombre}</p>
                    {producto.artesanal && (
                      <span className="text-xs text-tertiary">Artesanal</span>
                    )}
                  </td>
                  <td className="p-4 text-on-surface-variant">{producto.categoria || "-"}</td>
                  <td className="p-4 text-on-surface-variant capitalize">{producto.tipoVenta}</td>
                  <td className="p-4 text-right text-on-surface">
                    {producto.precioEntero != null ? `$${producto.precioEntero.toFixed(2)}` : "-"}
                  </td>
                  <td className="p-4 text-right text-on-surface">
                    {producto.precioPorcion != null ? `$${producto.precioPorcion.toFixed(2)}` : "-"}
                  </td>
                  <td className="p-4 text-center">
                    <button
                      onClick={() => { setProductoToggle(producto); setModalToggle(true); }}
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        producto.activo
                          ? "bg-tertiary-fixed text-tertiary"
                          : "bg-error-container text-on-error-container"
                      }`}
                    >
                      {producto.activo ? "Activo" : "Inactivo"}
                    </button>
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex gap-2 justify-center">
                      <button
                        onClick={() => abrirEditar(producto)}
                        className="px-3 py-1 text-sm bg-surface-container text-on-surface rounded-lg hover:bg-surface-container-high transition-colors"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => eliminarProducto(producto)}
                        className="px-3 py-1 text-sm text-error border border-error/30 rounded-lg hover:bg-error-container/30 transition-colors"
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal crear/editar */}
      {modal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={(e) => { if (e.target === e.currentTarget) setModal(false); }}
          onKeyDown={(e) => { if (e.key === "Escape") setModal(false); }}
        >
          <div className="bg-surface-container-lowest rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl">
            <h2 className="text-xl font-bold text-on-surface mb-4">
              {editandoId ? "Editar Producto" : "Nuevo Producto"}
            </h2>

            {modalError && (
              <div className="mb-4 p-3 bg-error-container text-on-error-container rounded-xl text-sm">
                {modalError}
              </div>
            )}

            <div className="space-y-4">
              {/* Nombre */}
              <div>
                <label className="block text-sm text-on-surface-variant mb-1">Nombre *</label>
                <input
                  type="text"
                  value={formulario.nombre}
                  onChange={(e) => {
                    setFormulario({ ...formulario, nombre: e.target.value });
                    if (errores.nombre) setErrores((prev) => { const n = { ...prev }; delete n.nombre; return n; });
                  }}
                  onBlur={() => {
                    const err: Record<string, string> = {};
                    if (!formulario.nombre.trim()) err.nombre = "El nombre es requerido";
                    else if (formulario.nombre.trim().length > 150) err.nombre = "Máximo 150 caracteres";
                    if (err.nombre) setErrores((prev) => ({ ...prev, ...err }));
                  }}
                  maxLength={150}
                  className={`w-full px-4 py-2 border rounded-xl focus:outline-none focus:border-secondary bg-surface ${errores.nombre ? "border-error" : "border-outline-variant"}`}
                  placeholder="Ej: Tres Leches"
                />
                {errores.nombre && <p className="text-error text-xs mt-1">{errores.nombre}</p>}
              </div>

              {/* Categoría */}
              <div>
                <label className="block text-sm text-on-surface-variant mb-1">Categoría</label>
                <input
                  type="text"
                  value={formulario.categoria}
                  onChange={(e) => setFormulario({ ...formulario, categoria: e.target.value })}
                  maxLength={100}
                  className="w-full px-4 py-2 border border-outline-variant rounded-xl focus:outline-none focus:border-secondary bg-surface"
                  placeholder="Ej: Tortas, Galletas, Postres"
                />
              </div>

              {/* Tipo de venta */}
              <div>
                <label className="block text-sm text-on-surface-variant mb-1">Tipo de venta *</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: "entero", label: "Entero" },
                    { value: "porcion", label: "Porción" },
                    { value: "ambos", label: "Ambos" },
                  ].map((opcion) => (
                    <button
                      key={opcion.value}
                      onClick={() => setFormulario({ ...formulario, tipoVenta: opcion.value })}
                      className={`py-2 rounded-xl text-sm transition-colors ${
                        formulario.tipoVenta === opcion.value
                          ? "bg-secondary text-on-secondary"
                          : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
                      }`}
                    >
                      {opcion.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Precios */}
              {(formulario.tipoVenta === "entero" || formulario.tipoVenta === "ambos") && (
                <div>
                  <label className="block text-sm text-on-surface-variant mb-1">Precio Entero *</label>
                  <input
                    type="number"
                    value={formulario.precioEntero}
                    onChange={(e) => {
                      setFormulario({ ...formulario, precioEntero: e.target.value });
                      if (errores.precioEntero) setErrores((prev) => { const n = { ...prev }; delete n.precioEntero; return n; });
                    }}
                    onBlur={() => {
                      if (formulario.tipoVenta === "entero" || formulario.tipoVenta === "ambos") {
                        const val = parseFloat(formulario.precioEntero);
                        if (!formulario.precioEntero || isNaN(val) || val <= 0) {
                          setErrores((prev) => ({ ...prev, precioEntero: "Se requiere un precio para venta entera" }));
                        }
                      }
                    }}
                    min="0.01"
                    max="999999"
                    step="0.01"
                    className={`w-full px-4 py-2 border rounded-xl focus:outline-none focus:border-secondary bg-surface ${errores.precioEntero ? "border-error" : "border-outline-variant"}`}
                    placeholder="0.00"
                  />
                  {errores.precioEntero && <p className="text-error text-xs mt-1">{errores.precioEntero}</p>}
                </div>
              )}

              {(formulario.tipoVenta === "porcion" || formulario.tipoVenta === "ambos") && (
                <div>
                  <label className="block text-sm text-on-surface-variant mb-1">Precio Porción *</label>
                  <input
                    type="number"
                    value={formulario.precioPorcion}
                    onChange={(e) => {
                      setFormulario({ ...formulario, precioPorcion: e.target.value });
                      if (errores.precioPorcion) setErrores((prev) => { const n = { ...prev }; delete n.precioPorcion; return n; });
                    }}
                    onBlur={() => {
                      if (formulario.tipoVenta === "porcion" || formulario.tipoVenta === "ambos") {
                        const val = parseFloat(formulario.precioPorcion);
                        if (!formulario.precioPorcion || isNaN(val) || val <= 0) {
                          setErrores((prev) => ({ ...prev, precioPorcion: "Se requiere un precio por porción" }));
                        }
                      }
                    }}
                    min="0.01"
                    max="999999"
                    step="0.01"
                    className={`w-full px-4 py-2 border rounded-xl focus:outline-none focus:border-secondary bg-surface ${errores.precioPorcion ? "border-error" : "border-outline-variant"}`}
                    placeholder="0.00"
                  />
                  {errores.precioPorcion && <p className="text-error text-xs mt-1">{errores.precioPorcion}</p>}
                </div>
              )}

              {/* Artesanal */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setFormulario({ ...formulario, artesanal: !formulario.artesanal })}
                  className={`w-12 h-6 rounded-full transition-colors relative ${
                    formulario.artesanal ? "bg-tertiary" : "bg-outline-variant"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-sm ${
                      formulario.artesanal ? "translate-x-6" : "translate-x-0.5"
                    }`}
                  />
                </button>
                <span className="text-sm text-on-surface-variant">Producto artesanal</span>
              </div>
            </div>

            {/* Botones */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setModal(false); setModalError(""); setErrores({}); }}
                className="flex-1 py-2 border border-outline-variant text-on-surface-variant rounded-xl hover:bg-surface-container transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={guardar}
                disabled={guardando}
                className="flex-1 py-2 bg-secondary text-on-secondary rounded-xl hover:bg-secondary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editandoId ? "Guardar Cambios" : "Crear Producto"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={modalToggle}
        titulo={productoToggle?.activo ? "Desactivar Producto" : "Activar Producto"}
        mensaje={`¿${productoToggle?.activo ? "Desactivar" : "Activar"} "${productoToggle?.nombre}"?\n\n${productoToggle?.activo ? "El producto no aparecerá en la pantalla de ventas." : "El producto volverá a aparecer en ventas."}`}
        textoConfirmar={productoToggle?.activo ? "Desactivar" : "Activar"}
        textoCancelar="Cancelar"
        variante={productoToggle?.activo ? "peligro" : "info"}
        onConfirmar={confirmarToggle}
        onCancelar={() => { setModalToggle(false); setProductoToggle(null); }}
      />

      <ConfirmModal
        open={modalEliminar}
        titulo="Eliminar Producto"
        mensaje={`¿Eliminar "${productoEliminar?.nombre}"?\n\nEsta acción no se puede deshacer.`}
        textoConfirmar="Eliminar"
        textoCancelar="Cancelar"
        variante="peligro"
        onConfirmar={confirmarEliminar}
        onCancelar={() => { setModalEliminar(false); setProductoEliminar(null); }}
      />
    </div>
  );
}
