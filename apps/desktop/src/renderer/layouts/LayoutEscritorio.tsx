import { useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../store/auth";
import {
  LayoutDashboard,
  ShoppingCart,
  Cake,
  ClipboardList,
  Package,
  TrendingDown,
  Users,
  BarChart3,
  KeyRound,
  HardDrive,
  HelpCircle,
} from "lucide-react";

const menuItemsAdmin = [
  { path: "/", label: "Dashboard", icon: <LayoutDashboard className="w-5 h-5" /> },
  { path: "/venta", label: "Venta", icon: <ShoppingCart className="w-5 h-5" /> },
  { path: "/productos", label: "Productos", icon: <Cake className="w-5 h-5" /> },
  { path: "/pedidos", label: "Pedidos", icon: <ClipboardList className="w-5 h-5" /> },
  { path: "/stock", label: "Stock", icon: <Package className="w-5 h-5" /> },
  { path: "/gastos", label: "Gastos", icon: <TrendingDown className="w-5 h-5" /> },
  { path: "/nomina", label: "Nómina", icon: <Users className="w-5 h-5" /> },
  { path: "/reportes", label: "Reportes", icon: <BarChart3 className="w-5 h-5" /> },
  { path: "/usuarios", label: "Usuarios", icon: <KeyRound className="w-5 h-5" /> },
  { path: "/backup", label: "Backup", icon: <HardDrive className="w-5 h-5" /> },
  { path: "/ayuda", label: "Ayuda", icon: <HelpCircle className="w-5 h-5" /> },
];

const menuItemsPastelera = [
  { path: "/stock", label: "Stock", icon: <Package className="w-5 h-5" /> },
  { path: "/pedidos", label: "Pedidos", icon: <ClipboardList className="w-5 h-5" /> },
  { path: "/ayuda", label: "Ayuda", icon: <HelpCircle className="w-5 h-5" /> },
];

const rutasRestringidasPastelera = [
  "/",
  "/venta",
  "/productos",
  "/gastos",
  "/nomina",
  "/reportes",
  "/usuarios",
  "/backup",
  "/caja/apertura",
  "/caja/cierre",
];

export default function LayoutEscritorio() {
  const navigate = useNavigate();
  const location = useLocation();
  const { usuario, sesionCaja, logout } = useAuthStore();

  const esAdmin = usuario?.rol === "propietario" || usuario?.rol === "cajero";
  const menuItems = esAdmin ? menuItemsAdmin : menuItemsPastelera;

  useEffect(() => {
    if (!usuario) {
      navigate("/login", { replace: true });
    }
  }, [usuario, navigate]);

  // Redirigir a cambio de PIN forzado si el usuario tiene PIN temporal
  useEffect(() => {
    if (usuario?.debeCambiarPin && location.pathname !== "/cambiar-pin") {
      navigate("/cambiar-pin", { replace: true });
    }
  }, [usuario, location.pathname, navigate]);

  useEffect(() => {
    if (usuario && !esAdmin && rutasRestringidasPastelera.includes(location.pathname)) {
      navigate("/stock", { replace: true });
    }
  }, [usuario, esAdmin, location.pathname, navigate]);

  // Listener para sesión expirada por inactividad (15 min)
  useEffect(() => {
    const removeListener = window.pos.onSesionExpirada(() => {
      logout();
      navigate("/login", { replace: true });
    });
    return removeListener;
  }, [logout, navigate]);

  if (!usuario) return null;

  const handleLogout = async () => {
    await window.pos.auth.logout();
    logout();
    navigate("/login");
  };

  return (
    <div className="flex h-screen bg-surface">
      {/* Sidebar */}
      <aside className="w-64 bg-surface-container-low border-r border-outline-variant flex flex-col h-full overflow-hidden">
        {/* Logo */}
        <div className="p-6 border-b border-outline-variant shrink-0">
          <div className="flex items-center gap-3">
            <img
              src="./logo-sweet-bakery.jpg"
              alt="Sweet Bakery"
              className="w-12 h-12 rounded-full object-cover"
            />
            <div>
              <h1 className="text-lg font-bold text-primary">Sweet Bakery</h1>
              {usuario && (
                <p className="text-sm text-on-surface-variant">{usuario.nombre}</p>
              )}
            </div>
          </div>
        </div>

        {/* Menú - scrollable */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto min-h-0">
          {menuItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                location.pathname === item.path
                  ? "bg-secondary text-on-secondary shadow-md"
                  : "text-on-surface-variant hover:bg-secondary-container/30"
              }`}
            >
              {item.icon}
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Caja — solo admin */}
        {esAdmin && (
          <div className="p-4 border-t border-outline-variant shrink-0">
            {sesionCaja ? (
              <div className="space-y-2">
                <div className="text-sm text-on-surface-variant">
                  <p>Sesión abierta</p>
                  <p className="font-medium text-on-surface">{sesionCaja.fecha}</p>
                </div>
                <button
                  onClick={() => navigate("/caja/cierre")}
                  className="w-full px-4 py-2 bg-tertiary text-on-tertiary rounded-xl hover:bg-tertiary/90 transition-colors"
                >
                  Cerrar Caja
                </button>
              </div>
            ) : (
              <button
                onClick={() => navigate("/caja/apertura")}
                className="w-full px-4 py-2 bg-secondary text-on-secondary rounded-xl hover:bg-secondary/90 transition-colors"
              >
                Abrir Caja
              </button>
            )}
          </div>
        )}

        {/* Logout */}
        <div className="p-4 border-t border-outline-variant shrink-0">
          <button
            onClick={handleLogout}
            className="w-full px-4 py-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high rounded-xl transition-colors"
          >
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Contenido principal */}
      <main className="flex-1 min-h-0 overflow-auto bg-surface">
        <Outlet />
      </main>
    </div>
  );
}
