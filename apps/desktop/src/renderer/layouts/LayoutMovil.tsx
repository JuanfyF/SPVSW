import { useEffect, useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../store/auth";
import ErrorBoundary from "../components/ErrorBoundary";
import { Clock, Home, ClipboardList, Package, User } from "lucide-react";
import Onboarding, { shouldShowOnboarding } from "../components/Onboarding";

const menuItemsAdmin = [
  { path: "/movil", label: "Inicio", icon: <Home className="w-5 h-5" /> },
  { path: "/movil/pedidos", label: "Pedidos", icon: <ClipboardList className="w-5 h-5" /> },
  { path: "/movil/stock", label: "Stock", icon: <Package className="w-5 h-5" /> },
  { path: "/movil/perfil", label: "Perfil", icon: <User className="w-5 h-5" /> },
];

const menuItemsPastelera = [
  { path: "/movil", label: "Inicio", icon: <Home className="w-5 h-5" /> },
  { path: "/movil/pedidos", label: "Pedidos", icon: <ClipboardList className="w-5 h-5" /> },
  { path: "/movil/stock", label: "Stock", icon: <Package className="w-5 h-5" /> },
  { path: "/movil/perfil", label: "Perfil", icon: <User className="w-5 h-5" /> },
];

export default function LayoutMovil() {
  const navigate = useNavigate();
  const location = useLocation();
  const { usuario, logout } = useAuthStore();

  useEffect(() => {
    if (!usuario) {
      navigate("/movil/login", { replace: true });
    }
  }, [usuario, navigate]);

  useEffect(() => {
    if (usuario?.debeCambiarPin && location.pathname !== "/cambiar-pin") {
      navigate("/cambiar-pin", { replace: true });
    }
  }, [usuario, location.pathname, navigate]);

  useEffect(() => {
    const removeListener = window.pos.onSesionExpirada(() => {
      logout();
      navigate("/movil/login", { replace: true });
    });
    return removeListener;
  }, [logout, navigate]);

  const [mostrarAvisoSesion, setMostrarAvisoSesion] = useState(false);

  useEffect(() => {
    const removeAviso = window.pos.onSesionAviso(() => {
      setMostrarAvisoSesion(true);
    });
    return removeAviso;
  }, []);

  const handleExtenderSesion = async () => {
    await window.pos.extenderSesion();
    setMostrarAvisoSesion(false);
  };

  const [mostrarOnboarding, setMostrarOnboarding] = useState(() => shouldShowOnboarding());

  if (!usuario) return null;

  if (mostrarOnboarding) {
    return <Onboarding onComplete={() => setMostrarOnboarding(false)} />;
  }

  const menuItems = usuario.rol === "pastelera" ? menuItemsPastelera : menuItemsAdmin;

  const handleLogout = async () => {
    await window.pos.auth.logout();
    logout();
    navigate("/movil/login");
  };

  return (
    <div className="flex flex-col h-screen bg-surface">
      {/* Aviso de sesión por expirar */}
      {mostrarAvisoSesion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-surface rounded-2xl p-6 shadow-xl max-w-sm w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <Clock className="w-6 h-6 text-amber-500" />
              <h3 className="text-lg font-bold text-on-surface">Sesión por expirar</h3>
            </div>
            <p className="text-sm text-on-surface-variant mb-6">
              Tu sesión expirará en 1 minuto por inactividad. ¿Deseas mantenerla activa?
            </p>
            <button
              onClick={handleExtenderSesion}
              className="w-full px-4 py-2 bg-secondary text-on-secondary rounded-xl hover:bg-secondary/90 transition-colors"
            >
              Mantener sesión
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-secondary text-on-secondary p-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">Sweet Bakery</h1>
          {usuario && (
            <p className="text-sm text-on-secondary/80">{usuario.nombre}</p>
          )}
        </div>
        <button
          onClick={handleLogout}
          className="text-on-secondary/80 hover:text-on-secondary"
        >
          Salir
        </button>
      </header>

      {/* Contenido */}
      <main className="flex-1 overflow-auto">
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>

      {/* Navegación inferior */}
      <nav className="bg-surface-container-lowest border-t border-outline-variant flex">
        {menuItems.map((item) => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={`flex-1 flex flex-col items-center py-3 transition-colors ${
              location.pathname === item.path
                ? "text-secondary"
                : "text-on-surface-variant"
            }`}
          >
            {item.icon}
            <span className="text-xs mt-1">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
