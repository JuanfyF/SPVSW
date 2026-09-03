import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/auth";
import ConfirmModal from "../../components/ConfirmModal";
import { Users } from "lucide-react";

interface Usuario {
  id: number;
  nombre: string;
  rol: string;
  activo: boolean;
  actualizadoEn: string;
}

const ROLES = [
  { valor: "pastelera", label: "Pastelera" },
  { valor: "cajero", label: "Cajero/a" },
  { valor: "propietario", label: "Propietario" },
];

const esRolAdmin = (rol: string) => rol === "propietario" || rol === "cajero";

export default function Usuarios() {
  const { usuario } = useAuthStore();
  const navigate = useNavigate();
  const esAdmin = usuario ? esRolAdmin(usuario.rol) : false;

  useEffect(() => {
    if (usuario && !esAdmin) {
      navigate("/");
    }
  }, [usuario, esAdmin, navigate]);

  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Modal crear
  const [modalCrear, setModalCrear] = useState(false);
  const [nombreCrear, setNombreCrear] = useState("");
  const [rolCrear, setRolCrear] = useState("pastelera");
  const [pinCrear, setPinCrear] = useState("");
  const [pinConfirmar, setPinConfirmar] = useState("");
  const [modalError, setModalError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [errores, setErrores] = useState<Record<string, string>>({});

  // Modal cambiar PIN
  const [modalPin, setModalPin] = useState(false);
  const [usuarioPin, setUsuarioPin] = useState<Usuario | null>(null);
  const [nuevoPin, setNuevoPin] = useState("");
  const [nuevoPinConfirmar, setNuevoPinConfirmar] = useState("");
  const [pinError, setPinError] = useState("");

  // Modal desactivar
  const [modalDesactivar, setModalDesactivar] = useState(false);
  const [usuarioDesactivar, setUsuarioDesactivar] = useState<Usuario | null>(null);

  const adminsActivos = usuarios.filter((u) => esRolAdmin(u.rol) && u.activo).length;

  useEffect(() => {
    cargarUsuarios();
  }, []);

  const cargarUsuarios = async () => {
    try {
      setLoading(true);
      const data = await window.pos.usuarios.listar();
      setUsuarios(data);
    } catch (err) {
      setError("Error al cargar usuarios");
    } finally {
      setLoading(false);
    }
  };

  const handleCrear = async () => {
    setModalError("");

    if (!nombreCrear.trim()) {
      setModalError("Nombre es requerido");
      return;
    }
    if (pinCrear.length < 4) {
      setModalError("PIN debe tener al menos 4 dígitos");
      return;
    }
    if (pinCrear.length > 6) {
      setModalError("PIN no puede tener más de 6 dígitos");
      return;
    }
    if (pinCrear !== pinConfirmar) {
      setModalError("Los PINs no coinciden");
      return;
    }

    setGuardando(true);
    try {
      await window.pos.usuarios.crear({
        nombre: nombreCrear.trim(),
        rol: rolCrear,
        pin: pinCrear,
      });
      setModalCrear(false);
      setNombreCrear("");
      setRolCrear("pastelera");
      setPinCrear("");
      setPinConfirmar("");
      setErrores({});
      await cargarUsuarios();
    } catch (err: any) {
      setModalError(err.message || "Error al crear usuario");
    } finally {
      setGuardando(false);
    }
  };

  const handleCambiarPin = async () => {
    if (!usuarioPin) return;
    setPinError("");

    if (nuevoPin.length < 4) {
      setPinError("PIN debe tener al menos 4 dígitos");
      return;
    }
    if (nuevoPin.length > 6) {
      setPinError("PIN no puede tener más de 6 dígitos");
      return;
    }
    if (nuevoPin !== nuevoPinConfirmar) {
      setPinError("Los PINs no coinciden");
      return;
    }

    setGuardando(true);
    try {
      await window.pos.usuarios.cambiarPin(usuarioPin.id, nuevoPin);
      setModalPin(false);
      setUsuarioPin(null);
      setNuevoPin("");
      setNuevoPinConfirmar("");
    } catch (err: any) {
      setPinError(err.message || "Error al cambiar PIN");
    } finally {
      setGuardando(false);
    }
  };

  const handleDesactivar = async (u: Usuario) => {
    if (u.id === usuario?.id) {
      setError("No puedes desactivar tu propio usuario");
      return;
    }
    setUsuarioDesactivar(u);
    setModalDesactivar(true);
  };

  const confirmarDesactivar = async () => {
    if (!usuarioDesactivar) return;
    try {
      await window.pos.usuarios.desactivar(usuarioDesactivar.id);
      await cargarUsuarios();
    } catch (err: any) {
      setError(err.message || "Error al desactivar usuario");
    }
    setModalDesactivar(false);
    setUsuarioDesactivar(null);
  };

  const getRolLabel = (rol: string) => {
    return ROLES.find((r) => r.valor === rol)?.label ?? rol;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-on-surface-variant">Cargando usuarios...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">Usuarios</h1>
          <p className="text-on-surface-variant mt-1">Gestiona los PINs de acceso al sistema</p>
        </div>
        {esAdmin && (
          <button
            onClick={() => setModalCrear(true)}
            className="px-6 py-3 bg-secondary text-on-secondary rounded-xl hover:bg-secondary/90 transition-colors font-medium"
          >
            + Nuevo Usuario
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-error-container text-on-error-container rounded-xl">
          {error}
          <button onClick={() => setError("")} className="ml-2 underline">Cerrar</button>
        </div>
      )}

      <div className="bg-surface-container-lowest rounded-2xl shadow-sm overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-outline-variant">
              <th className="text-left p-4 text-on-surface-variant font-medium">Nombre</th>
              <th className="text-left p-4 text-on-surface-variant font-medium">Rol</th>
              <th className="text-left p-4 text-on-surface-variant font-medium">Estado</th>
              <th className="text-right p-4 text-on-surface-variant font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u) => (
              <tr key={u.id} className="border-b border-outline-variant/50 hover:bg-surface-container/50">
                <td className="px-6 py-4">
                  <div className="font-medium text-on-surface">{u.nombre}</div>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                    esRolAdmin(u.rol)
                      ? "bg-secondary-container text-on-secondary-container"
                      : "bg-tertiary-container text-on-tertiary-container"
                  }`}>
                    {getRolLabel(u.rol)}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                    u.activo
                      ? "bg-tertiary-container text-on-tertiary-container"
                      : "bg-error-container text-on-error-container"
                  }`}>
                    {u.activo ? "Activo" : "Inactivo"}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  {esAdmin && (
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => {
                          setUsuarioPin(u);
                          setNuevoPin("");
                          setNuevoPinConfirmar("");
                          setPinError("");
                          setModalPin(true);
                        }}
                        className="px-3 py-1.5 text-sm border border-outline-variant text-on-surface-variant rounded-lg hover:bg-surface-container-high transition-colors"
                      >
                        Cambiar PIN
                      </button>
                      {u.activo && u.id !== usuario?.id && (
                        <button
                          onClick={() => handleDesactivar(u)}
                          disabled={esRolAdmin(u.rol) && adminsActivos <= 1}
                          className="px-3 py-1.5 text-sm text-error border border-error/30 rounded-lg hover:bg-error-container/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title={esRolAdmin(u.rol) && adminsActivos <= 1 ? "No se puede desactivar el último admin/cajero" : ""}
                        >
                          Desactivar
                        </button>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {usuarios.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-on-surface-variant">
                  <Users className="w-10 h-10 mx-auto mb-3 text-on-surface-variant/40" />
                  No hay usuarios registrados
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Crear Usuario */}
      {modalCrear && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => { setModalCrear(false); setErrores({}); }}>
          <div className="bg-surface-container-lowest rounded-2xl shadow-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-on-surface mb-4">Nuevo Usuario</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-on-surface-variant mb-1">Nombre</label>
                <input
                  type="text"
                  value={nombreCrear}
                  onChange={(e) => {
                    setNombreCrear(e.target.value);
                    if (errores.nombre) setErrores((prev) => { const { nombre: _, ...rest } = prev; return rest; });
                  }}
                  onBlur={() => {
                    if (!nombreCrear.trim()) {
                      setErrores((prev) => ({ ...prev, nombre: "El nombre es requerido" }));
                    } else {
                      setErrores((prev) => { const { nombre: _, ...rest } = prev; return rest; });
                    }
                  }}
                  className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:border-secondary bg-surface ${errores.nombre ? "border-error" : "border-outline-variant"}`}
                  placeholder="Nombre del usuario"
                  maxLength={100}
                />
                {errores.nombre && <p className="text-error text-xs mt-1">{errores.nombre}</p>}
              </div>

              <div>
                <label className="block text-sm text-on-surface-variant mb-1">Rol</label>
                <select
                  value={rolCrear}
                  onChange={(e) => setRolCrear(e.target.value)}
                  className="w-full px-4 py-3 border border-outline-variant rounded-xl focus:outline-none focus:border-secondary bg-surface"
                >
                  {ROLES.map((r) => (
                    <option key={r.valor} value={r.valor}>{r.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-on-surface-variant mb-1">PIN (4-6 dígitos)</label>
                <input
                  type="password"
                  value={pinCrear}
                  onChange={(e) => {
                    setPinCrear(e.target.value.replace(/\D/g, "").slice(0, 6));
                    if (errores.pin) setErrores((prev) => { const { pin: _, ...rest } = prev; return rest; });
                  }}
                  onBlur={() => {
                    if (pinCrear.length < 4) {
                      setErrores((prev) => ({ ...prev, pin: "PIN debe tener al menos 4 dígitos" }));
                    } else {
                      setErrores((prev) => { const { pin: _, ...rest } = prev; return rest; });
                    }
                  }}
                  className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:border-secondary bg-surface ${errores.pin ? "border-error" : "border-outline-variant"}`}
                  placeholder="****"
                  maxLength={6}
                />
                {errores.pin && <p className="text-error text-xs mt-1">{errores.pin}</p>}
              </div>

              <div>
                <label className="block text-sm text-on-surface-variant mb-1">Confirmar PIN</label>
                <input
                  type="password"
                  value={pinConfirmar}
                  onChange={(e) => {
                    setPinConfirmar(e.target.value.replace(/\D/g, "").slice(0, 6));
                    if (errores.pinConfirmar) setErrores((prev) => { const { pinConfirmar: _, ...rest } = prev; return rest; });
                  }}
                  onBlur={() => {
                    if (pinConfirmar && pinCrear !== pinConfirmar) {
                      setErrores((prev) => ({ ...prev, pinConfirmar: "Los PINs no coinciden" }));
                    } else {
                      setErrores((prev) => { const { pinConfirmar: _, ...rest } = prev; return rest; });
                    }
                  }}
                  className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:border-secondary bg-surface ${errores.pinConfirmar ? "border-error" : "border-outline-variant"}`}
                  placeholder="****"
                  maxLength={6}
                />
                {errores.pinConfirmar && <p className="text-error text-xs mt-1">{errores.pinConfirmar}</p>}
              </div>
            </div>

            {modalError && (
              <div className="mt-4 p-3 bg-error-container text-on-error-container rounded-xl text-center">
                {modalError}
              </div>
            )}

            <div className="flex gap-4 mt-6">
              <button
                onClick={() => {
                  setModalCrear(false);
                  setNombreCrear("");
                  setRolCrear("pastelera");
                  setPinCrear("");
                  setPinConfirmar("");
                  setModalError("");
                  setErrores({});
                }}
                className="flex-1 py-3 border border-outline-variant text-on-surface-variant rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCrear}
                disabled={guardando}
                className="flex-1 py-3 bg-secondary text-on-secondary rounded-xl hover:bg-secondary/90 disabled:opacity-50 transition-colors"
              >
                {guardando ? "Creando..." : "Crear"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Cambiar PIN */}
      {modalPin && usuarioPin && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setModalPin(false)}>
          <div className="bg-surface-container-lowest rounded-2xl shadow-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-on-surface mb-1">Cambiar PIN</h2>
            <p className="text-on-surface-variant text-sm mb-4">Usuario: {usuarioPin.nombre}</p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-on-surface-variant mb-1">Nuevo PIN (4-6 dígitos)</label>
                <input
                  type="password"
                  value={nuevoPin}
                  onChange={(e) => setNuevoPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="w-full px-4 py-3 border border-outline-variant rounded-xl focus:outline-none focus:border-secondary bg-surface"
                  placeholder="****"
                  maxLength={6}
                />
              </div>

              <div>
                <label className="block text-sm text-on-surface-variant mb-1">Confirmar nuevo PIN</label>
                <input
                  type="password"
                  value={nuevoPinConfirmar}
                  onChange={(e) => setNuevoPinConfirmar(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="w-full px-4 py-3 border border-outline-variant rounded-xl focus:outline-none focus:border-secondary bg-surface"
                  placeholder="****"
                  maxLength={6}
                />
              </div>
            </div>

            {pinError && (
              <div className="mt-4 p-3 bg-error-container text-on-error-container rounded-xl text-center">
                {pinError}
              </div>
            )}

            <div className="flex gap-4 mt-6">
              <button
                onClick={() => {
                  setModalPin(false);
                  setUsuarioPin(null);
                  setNuevoPin("");
                  setNuevoPinConfirmar("");
                  setPinError("");
                }}
                className="flex-1 py-3 border border-outline-variant text-on-surface-variant rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCambiarPin}
                disabled={guardando}
                className="flex-1 py-3 bg-secondary text-on-secondary rounded-xl hover:bg-secondary/90 disabled:opacity-50 transition-colors"
              >
                {guardando ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={modalDesactivar}
        titulo="Desactivar Usuario"
        mensaje={`¿Desactivar usuario "${usuarioDesactivar?.nombre}"?\n\nNo podrá iniciar sesión hasta que se reactive.`}
        textoConfirmar="Desactivar"
        textoCancelar="Cancelar"
        variante="peligro"
        onConfirmar={confirmarDesactivar}
        onCancelar={() => { setModalDesactivar(false); setUsuarioDesactivar(null); }}
      />
    </div>
  );
}
