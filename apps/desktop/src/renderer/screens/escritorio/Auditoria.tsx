import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/auth";
import { formatearFecha } from "@pos/shared";
import { Search, ShieldAlert, ScrollText } from "lucide-react";

interface RegistroAuditoria {
  id: number;
  evento: string;
  detalle: string | null;
  origen: string;
  createdAt: string;
  usuarioId: number | null;
  usuarioNombre: string | null;
  usuarioRol: string | null;
}

const ETIQUETAS_EVENTO: Record<string, string> = {
  login_exitoso: "Inicio de sesión",
  login_fallido: "Inicio de sesión fallido",
  login_bloqueado: "Inicio de sesión bloqueado",
  logout: "Cierre de sesión",
  sesion_expirada: "Sesión expirada",
  pin_reset: "PIN restablecido",
  pin_reset_bloqueado: "Reset de PIN bloqueado",
  pin_reset_publico: "Reset de PIN público",
  pin_cambiado: "PIN cambiado",
  permiso_denegado: "Permiso denegado",
  caja_abierta: "Caja abierta",
  caja_cerrada: "Caja cerrada",
  caja_forzar_cierre: "Cierre forzado",
  caja_revisada: "Cierre revisado",
  venta_creada: "Venta registrada",
  pedido_creado: "Pedido creado",
  pedido_entregado: "Pedido entregado",
  pedido_cancelado: "Pedido cancelado",
  pedido_listo: "Pedido listo",
  pedido_estado_cambiado: "Estado de pedido cambiado",
  pedido_entrega_revertida: "Entrega revertida",
  stock_registrado: "Stock inicial",
  stock_reposicion: "Reposición de stock",
  stock_corte: "Corte registrado",
  stock_merma: "Merma registrada",
  stock_cortesia: "Cortesía registrada",
  stock_conciliado: "Stock conciliado",
  backup: "Backup creado",
  restore: "Backup restaurado",
  usuario_creado: "Usuario creado",
  usuario_actualizado: "Usuario actualizado",
  usuario_desactivado: "Usuario desactivado",
  producto_creado: "Producto creado",
  producto_actualizado: "Producto actualizado",
  producto_desactivado: "Producto desactivado",
  configuracion_guardada: "Configuración guardada",
  gasto_creado: "Gasto registrado",
  categoria_gasto_creada: "Categoría de gasto creada",
  adelanto_registrado: "Adelanto registrado",
  multa_registrada: "Multa registrada",
  empleado_creado: "Empleado creado",
  empleado_actualizado: "Empleado actualizado",
  empleado_desactivado: "Empleado desactivado",
};

function etiquetaEvento(evento: string): string {
  return ETIQUETAS_EVENTO[evento] ?? evento;
}

function colorEvento(evento: string): string {
  if (evento.startsWith("login") || evento.startsWith("pin") || evento === "logout" ||
      evento === "sesion_expirada" || evento === "permiso_denegado") {
    return "bg-error/10 text-error";
  }
  if (evento.startsWith("venta") || evento.startsWith("pedido")) {
    return "bg-tertiary/15 text-tertiary";
  }
  if (evento.startsWith("stock")) {
    return "bg-secondary/15 text-secondary";
  }
  if (evento.startsWith("caja") || evento.startsWith("backup") || evento === "restore") {
    return "bg-primary/10 text-primary";
  }
  return "bg-surface-container-high text-on-surface-variant";
}

/** Timestamp UTC de SQLite ("YYYY-MM-DD HH:MM:SS") → fecha/hora local. */
function formatearFechaHoraLocal(createdAt: string): string {
  const fecha = new Date(`${createdAt.replace(" ", "T")}Z`);
  if (isNaN(fecha.getTime())) return createdAt;
  return fecha.toLocaleString("es-EC", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

/** JSON del detalle → "clave: valor · clave: valor" legible (truncado). */
function formatearDetalle(detalle: string | null): string {
  if (!detalle) return "—";
  try {
    const obj = JSON.parse(detalle);
    const texto = Object.entries(obj)
      .map(([k, v]) => `${k}: ${String(v)}`)
      .join(" · ");
    return texto.length > 180 ? `${texto.slice(0, 180)}…` : texto;
  } catch {
    return detalle;
  }
}

export default function Auditoria() {
  const navigate = useNavigate();
  const { usuario } = useAuthStore();
  const hoy = formatearFecha(new Date());
  const [fechaInicio, setFechaInicio] = useState(hoy);
  const [fechaFin, setFechaFin] = useState(hoy);
  const [registros, setRegistros] = useState<RegistroAuditoria[]>([]);
  const [filtroEvento, setFiltroEvento] = useState("todos");
  const [filtroUsuario, setFiltroUsuario] = useState("todos");
  const [busqueda, setBusqueda] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [cargado, setCargado] = useState(false);

  const cargar = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await window.pos.auditoria.listar({ fechaInicio, fechaFin });
      setRegistros(data);
      setCargado(true);
    } catch (err) {
      console.error("Error al cargar auditoría:", err);
      setError("Error al cargar el registro de auditoría");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (usuario?.rol !== "propietario") return;
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const eventosUnicos = useMemo(
    () => [...new Set(registros.map((r) => r.evento))].sort(),
    [registros]
  );
  const usuariosUnicos = useMemo(() => {
    const mapa = new Map<number, string>();
    registros.forEach((r) => {
      if (r.usuarioId && r.usuarioNombre) mapa.set(r.usuarioId, r.usuarioNombre);
    });
    return [...mapa.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [registros]);

  const registrosFiltrados = useMemo(() => {
    return registros.filter((r) => {
      if (filtroEvento !== "todos" && r.evento !== filtroEvento) return false;
      if (filtroUsuario !== "todos" && String(r.usuarioId) !== filtroUsuario) return false;
      if (busqueda.trim()) {
        const q = busqueda.trim().toLowerCase();
        const objetivo = [
          etiquetaEvento(r.evento),
          r.evento,
          r.usuarioNombre ?? "",
          r.detalle ?? "",
        ].join(" ").toLowerCase();
        if (!objetivo.includes(q)) return false;
      }
      return true;
    });
  }, [registros, filtroEvento, filtroUsuario, busqueda]);

  if (usuario?.rol !== "propietario") {
    return (
      <div className="p-6 min-h-full flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 rounded-full bg-error-container text-on-error-container flex items-center justify-center mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h1 className="text-headline-lg font-bold text-on-surface mb-2">
          Sección restringida
        </h1>
        <p className="text-on-surface font-medium">
          Esta sección es exclusiva del propietario.
        </p>
        <p className="text-caption text-on-surface-variant mt-1 max-w-sm">
          El registro de auditoría contiene actividad sensible del negocio
          (sesiones, ventas, permisos y cambios de configuración).
        </p>
        <button
          onClick={() => navigate("/")}
          className="mt-6 px-6 py-3 bg-secondary text-on-secondary rounded-xl hover:bg-secondary/90 transition-colors font-medium"
        >
          Volver al Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-headline-lg font-bold text-on-surface">Auditoría</h1>
        <p className="text-on-surface-variant">
          Registro de actividad del sistema — quién hizo qué y cuándo
        </p>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-end gap-4 mb-4">
        <div>
          <label className="block text-sm text-on-surface-variant mb-2">Fecha inicio</label>
          <input
            type="date"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
            className="px-4 py-2 border border-outline-variant rounded-xl focus:outline-none focus:border-secondary bg-surface-container-lowest"
          />
        </div>
        <div>
          <label className="block text-sm text-on-surface-variant mb-2">Fecha fin</label>
          <input
            type="date"
            value={fechaFin}
            onChange={(e) => setFechaFin(e.target.value)}
            className="px-4 py-2 border border-outline-variant rounded-xl focus:outline-none focus:border-secondary bg-surface-container-lowest"
          />
        </div>
        <button
          onClick={cargar}
          disabled={loading}
          className="px-4 py-2 bg-secondary text-on-secondary rounded-xl hover:bg-secondary/90 disabled:opacity-50 transition-colors"
        >
          {loading ? "Cargando…" : "Buscar"}
        </button>

        {cargado && registros.length > 0 && (
          <>
            <div>
              <label className="block text-sm text-on-surface-variant mb-2">Evento</label>
              <select
                value={filtroEvento}
                onChange={(e) => setFiltroEvento(e.target.value)}
                className="px-4 py-2 border border-outline-variant rounded-xl focus:outline-none focus:border-secondary bg-surface-container-lowest"
              >
                <option value="todos">Todos</option>
                {eventosUnicos.map((ev) => (
                  <option key={ev} value={ev}>{etiquetaEvento(ev)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-on-surface-variant mb-2">Usuario</label>
              <select
                value={filtroUsuario}
                onChange={(e) => setFiltroUsuario(e.target.value)}
                className="px-4 py-2 border border-outline-variant rounded-xl focus:outline-none focus:border-secondary bg-surface-container-lowest"
              >
                <option value="todos">Todos</option>
                {usuariosUnicos.map(([id, nombre]) => (
                  <option key={id} value={String(id)}>{nombre}</option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm text-on-surface-variant mb-2">Buscar</label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                <input
                  type="text"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Evento, usuario o detalle…"
                  className="w-full pl-9 pr-4 py-2 border border-outline-variant rounded-xl focus:outline-none focus:border-secondary bg-surface-container-lowest"
                />
              </div>
            </div>
          </>
        )}
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-error-container text-on-error-container rounded-xl text-sm">
          {error}
        </div>
      )}

      {loading && (
        <div className="p-8 text-center text-on-surface-variant">Cargando registros…</div>
      )}

      {!loading && cargado && (
        <>
          <p className="text-caption text-on-surface-variant mb-3">
            {registrosFiltrados.length} de {registros.length} registros
          </p>

          <div className="bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant overflow-x-auto hover:shadow-md transition-shadow">
            <table className="w-full">
              <thead>
                <tr className="border-b border-outline-variant">
                  <th className="text-left p-4 text-on-surface-variant font-medium">Fecha y hora</th>
                  <th className="text-left p-4 text-on-surface-variant font-medium">Evento</th>
                  <th className="text-left p-4 text-on-surface-variant font-medium">Usuario</th>
                  <th className="text-left p-4 text-on-surface-variant font-medium">Detalle</th>
                  <th className="text-center p-4 text-on-surface-variant font-medium">Origen</th>
                </tr>
              </thead>
              <tbody>
                {registrosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center">
                      <ScrollText className="w-10 h-10 mx-auto mb-2 text-on-surface-variant/40" />
                      <p className="text-on-surface-variant">
                        No hay registros en el rango seleccionado
                      </p>
                    </td>
                  </tr>
                ) : (
                  registrosFiltrados.map((r) => (
                    <tr key={r.id} className="border-b border-outline-variant/50">
                      <td className="p-3 text-sm text-on-surface whitespace-nowrap">
                        {formatearFechaHoraLocal(r.createdAt)}
                      </td>
                      <td className="p-3 text-sm">
                        <span className={`text-caption px-2 py-1 rounded-full whitespace-nowrap ${colorEvento(r.evento)}`}>
                          {etiquetaEvento(r.evento)}
                        </span>
                      </td>
                      <td className="p-3 text-sm text-on-surface">
                        {r.usuarioNombre ?? "—"}
                        {r.usuarioRol && (
                          <span className="text-caption text-on-surface-variant ml-1">({r.usuarioRol})</span>
                        )}
                      </td>
                      <td className="p-3 text-sm text-on-surface-variant max-w-[380px] truncate">
                        {formatearDetalle(r.detalle)}
                      </td>
                      <td className="p-3 text-center">
                        <span className="text-caption text-on-surface-variant">{r.origen}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
