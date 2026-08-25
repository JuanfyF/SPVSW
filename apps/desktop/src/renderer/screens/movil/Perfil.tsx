import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/auth";

export default function Perfil() {
  const navigate = useNavigate();
  const { usuario, sesionCaja, logout } = useAuthStore();

  const handleLogout = async () => {
    await window.pos.auth.logout();
    logout();
    navigate("/login");
  };

  return (
    <div className="p-4">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-on-surface">Perfil</h1>
      </div>

      {/* Información del usuario */}
      <div className="bg-surface-container-lowest p-6 rounded-xl mb-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 bg-secondary/10 rounded-full flex items-center justify-center">
            <span className="text-3xl text-secondary">👤</span>
          </div>
          <div>
            <h2 className="text-lg font-bold text-on-surface">
              {usuario?.nombre}
            </h2>
            <p className="text-on-surface-variant capitalize">{usuario?.rol}</p>
          </div>
        </div>

        <div className="space-y-3 pt-4 border-t border-outline-variant">
          <div className="flex justify-between">
            <span className="text-on-surface-variant">ID de usuario:</span>
            <span className="text-on-surface">{usuario?.id}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-on-surface-variant">Rol:</span>
            <span className="text-on-surface capitalize">{usuario?.rol}</span>
          </div>
        </div>
      </div>

      {/* Estado de sesión */}
      <div className="bg-surface-container-lowest p-6 rounded-xl mb-6">
        <h3 className="font-semibold text-on-surface mb-4">Sesión de Caja</h3>
        {sesionCaja ? (
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-on-surface-variant">Estado:</span>
              <span className="px-2 py-1 bg-tertiary/10 text-tertiary rounded-full text-sm">
                Abierta
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-on-surface-variant">Sesión #:</span>
              <span className="text-on-surface">{sesionCaja.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-on-surface-variant">Fecha:</span>
              <span className="text-on-surface">{sesionCaja.fecha}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-on-surface-variant">Hora apertura:</span>
              <span className="text-on-surface">{sesionCaja.horaApertura}</span>
            </div>
          </div>
        ) : (
          <p className="text-on-surface-variant text-center py-4">
            No hay sesión de caja activa
          </p>
        )}
      </div>

      {/* Acciones */}
      <div className="space-y-3">
        <button
          onClick={handleLogout}
          className="w-full py-3 bg-error/10 text-error rounded-xl font-medium"
        >
          Cerrar Sesión
        </button>
      </div>
    </div>
  );
}
