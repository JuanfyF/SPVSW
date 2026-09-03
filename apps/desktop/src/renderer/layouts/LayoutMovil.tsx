import { useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../store/auth";
import {
  Home,
  ClipboardList,
  Package,
  User,
} from "lucide-react";

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

  if (!usuario) return null;

  const menuItems = usuario.rol === "pastelera" ? menuItemsPastelera : menuItemsAdmin;

  const handleLogout = async () => {
    await window.pos.auth.logout();
    logout();
    navigate("/movil/login");
  };

  return (
    <div className="flex flex-col h-screen bg-surface">
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
        <Outlet />
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
