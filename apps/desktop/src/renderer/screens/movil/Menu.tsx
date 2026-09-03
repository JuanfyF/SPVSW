import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/auth";
import {
  CircleDollarSign,
  AlertTriangle,
  ClipboardList,
  Package,
  User,
} from "lucide-react";

export default function Menu() {
  const navigate = useNavigate();
  const { usuario, sesionCaja } = useAuthStore();
  const esAdmin = usuario?.rol === "propietario" || usuario?.rol === "cajero";
  const [pedidosPendientes, setPedidosPendientes] = useState(0);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      const pedidos = await window.pos.pedidos.listarActivos();
      setPedidosPendientes(pedidos.length);
    } catch (err) {
      console.error("Error al cargar datos:", err);
    }
  };

  return (
    <div className="p-4">
      {/* Bienvenida */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-on-surface">
          Hola, {usuario?.nombre}
        </h1>
        <p className="text-on-surface-variant">
          {new Date().toLocaleDateString("es-EC", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
        </p>
        <p className="text-sm text-on-surface-variant/60 mt-1">
          {esAdmin ? "Administrador" : "Pastelera"}
        </p>
      </div>

      {/* Estado de caja — solo admin */}
      {esAdmin && (
        <div
          className={`p-4 rounded-xl mb-6 ${
            sesionCaja ? "bg-tertiary-fixed" : "bg-error-container"
          }`}
        >
          <div className="flex items-center gap-3">
            {sesionCaja ? <CircleDollarSign className="w-6 h-6 text-tertiary" /> : <AlertTriangle className="w-6 h-6 text-error" />}
            <div>
              <p
                className={`font-medium ${
                  sesionCaja ? "text-tertiary" : "text-error"
                }`}
              >
                {sesionCaja ? "Caja Abierta" : "Caja Cerrada"}
              </p>
              <p className="text-sm text-on-surface-variant">
                {sesionCaja
                  ? `Sesión #${sesionCaja.id} • ${sesionCaja.fecha}`
                  : "Abrir caja para iniciar ventas"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Menú */}
      <div className="grid grid-cols-2 gap-4">
        {esAdmin && (
          <button
            onClick={() => navigate("/movil/pedidos/nuevo")}
            className="p-6 bg-secondary text-on-secondary rounded-2xl text-center"
          >
          <ClipboardList className="w-8 h-8 mb-2" />
          <span className="font-medium">Pedidos</span>
            <span className="font-medium">Nuevo Pedido</span>
          </button>
        )}

        <button
          onClick={() => navigate("/movil/pedidos")}
          className="p-6 bg-surface-container text-on-surface rounded-2xl text-center relative"
        >
          <ClipboardList className="w-8 h-8 mb-2" />
          {pedidosPendientes > 0 && (
            <span className="absolute top-2 right-2 bg-error text-on-error text-xs px-2 py-1 rounded-full">
              {pedidosPendientes}
            </span>
          )}
        </button>

        <button
          onClick={() => navigate("/movil/stock")}
          className="p-6 bg-surface-container text-on-surface rounded-2xl text-center"
        >
          <Package className="w-8 h-8 mb-2" />
          <span className="font-medium">Stock</span>
        </button>

        <button
          onClick={() => navigate("/movil/perfil")}
          className="p-6 bg-surface-container text-on-surface rounded-2xl text-center"
        >
          <User className="w-8 h-8 mb-2" />
          <span className="font-medium">Perfil</span>
        </button>
      </div>
    </div>
  );
}
