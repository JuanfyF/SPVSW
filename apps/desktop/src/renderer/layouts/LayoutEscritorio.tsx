import { useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../store/auth";

const menuItemsAdmin = [
  { path: "/", label: "Dashboard", icon: "📊" },
  { path: "/venta", label: "Venta", icon: "🛒" },
  { path: "/productos", label: "Productos", icon: "🧁" },
  { path: "/pedidos", label: "Pedidos", icon: "📋" },
  { path: "/stock", label: "Stock", icon: "📦" },
  { path: "/gastos", label: "Gastos", icon: "💸" },
  { path: "/nomina", label: "Nómina", icon: "👥" },
  { path: "/reportes", label: "Reportes", icon: "📈" },
  { path: "/usuarios", label: "Usuarios", icon: "🔑" },
  { path: "/backup", label: "Backup", icon: "💾" },
];

const menuItemsPastelera = [
  { path: "/stock", label: "Stock", icon: "📦" },
  { path: "/pedidos", label: "Pedidos", icon: "📋" },
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

  useEffect(() => {
    if (usuario && !esAdmin && rutasRestringidasPastelera.includes(location.pathname)) {
      navigate("/stock", { replace: true });
    }
  }, [usuario, esAdmin, location.pathname, navigate]);

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
              <span className="text-xl">{item.icon}</span>
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
