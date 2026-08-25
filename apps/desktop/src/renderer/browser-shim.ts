/**
 * Browser shim: reemplaza window.pos.* (Electron IPC) con llamadas HTTP
 * al local-server (puerto 3000). Se carga solo cuando no estamos en Electron.
 *
 * Solo implementa los métodos que usan las pantallas móviles.
 */
(function () {
  // Si ya estamos en Electron, no hacer nada
  if (window.pos) return;

  const BASE = "http://" + location.hostname + ":3000";

  let _token: string | null = localStorage.getItem("pos_token");

  async function api(
    method: string,
    path: string,
    body?: unknown
  ): Promise<any> {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (_token) headers["Authorization"] = `Bearer ${_token}`;

    const res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || `Error ${res.status}`);
    }

    return res.json();
  }

  window.pos = {
    auth: {
      async login(pin: string) {
        const { token, usuario } = await api("POST", "/auth/login", { pin });
        _token = token;
        localStorage.setItem("pos_token", token);

        // Obtener sesión de caja abierta
        let sesionAbierta = null;
        try {
          const data = await api("GET", "/auth/sesion-activa");
          sesionAbierta = data.sesionAbierta ?? null;
        } catch (_) {}

        return { usuario, sesionAbierta };
      },
      async logout() {
        await api("POST", "/auth/logout");
        _token = null;
        localStorage.removeItem("pos_token");
        return true;
      },
      async getUsuarioActual() {
        if (!_token) return null;
        try {
          const data = await api("GET", "/auth/sesion-activa");
          return data.usuario;
        } catch {
          return null;
        }
      },
    },

    productos: {
      async listar() {
        const data = await api("GET", "/api/productos");
        return data.productos;
      },
    },

    pedidos: {
      async listarActivos() {
        const data = await api("GET", "/api/pedidos");
        return data.pedidos;
      },
      async obtenerPorId(id: number) {
        const data = await api("GET", `/api/pedidos/${id}`);
        return data.pedido;
      },
      async obtenerDetalle(id: number) {
        const data = await api("GET", `/api/pedidos/${id}`);
        return data.detalles;
      },
      async marcarListo(pedidoId: number) {
        await api("PATCH", `/api/pedidos/${pedidoId}/estado`, { estado: "listo" });
      },
      async actualizarEstado(pedidoId: number, estado: string) {
        await api("PATCH", `/api/pedidos/${pedidoId}/estado`, { estado });
        return { exito: true };
      },
      async crear(datos: any) {
        const data = await api("POST", "/api/pedidos", datos);
        return data.pedido;
      },
    },

    stock: {
      async obtenerStockPorSesion(sesionCajaId: number) {
        const data = await api("GET", `/api/stock?sesionCajaId=${sesionCajaId}`);
        return data.stock;
      },
      async calcularVendidoLote(sesionCajaId: number) {
        const data = await api("GET", `/api/stock/vendido-lote?sesionCajaId=${sesionCajaId}`);
        return data.vendido;
      },
      async verificarDisponibilidad(
        productoId: number,
        sesionCajaId: number,
        unidad: string,
        cantidad: number
      ) {
        return api(
          "GET",
          `/api/stock/disponibilidad?productoId=${productoId}&sesionCajaId=${sesionCajaId}&unidad=${unidad}&cantidad=${cantidad}`
        );
      },
    },
  } as any;
})();
