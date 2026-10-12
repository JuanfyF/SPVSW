import path from "path";
import express from "express";
import { PosDatabase } from "@pos/db";
import {
  crearServicioAuth,
  crearServicioStock,
  crearServicioPedidos,
  crearServicioProductos,
  crearServicioCaja,
  crearServicioGastos,
  crearServicioNomina,
  crearServicioVentas,
  crearServicioUsuarios,
} from "@pos/core";
import { crearRateLimiter, rateLimitPinReset } from "@pos/shared";
import { stockRoutes, stockAdminRoutes } from "./routes/stock.routes";
import { pedidosRoutes, pedidosAdminRoutes } from "./routes/pedidos.routes";
import { gastosRoutes } from "./routes/gastos.routes";
import { nominaRoutes } from "./routes/nomina.routes";
import { ventasRoutes } from "./routes/ventas.routes";
import { cajaRoutes } from "./routes/caja.routes";
import {
  authMiddleware,
  crearSesion,
  eliminarSesion,
  requerirRol,
} from "./middleware/auth";
import {
  logAuditoriaLS,
  registrarAuditoriaLocalServer,
} from "./middleware/auditoria";

/**
 * IMPORTANTE (AGENT.md 5.1 — configuración de seguridad):
 * Este servidor escucha en 0.0.0.0 para acceso LAN (mobile).
 * CORS restringe orígenes a localhost y rangos LAN privados.
 * Toda ruta /api valida el PIN/rol antes de ejecutar cualquier acción.
 *
 * AGENT.md §2.7 — Roles en local-server:
 * - Pastelera: stock (merma, cortesía, reposición), pedidos (solo lectura producción)
 * - Administrador: acceso total (misma interfaz, pero puede gestionar todo)
 */

interface OpcionesServidor {
  port: number;
  db: PosDatabase;
}

// ─── Rate limiting para login ──────────────────────────
// El reset de PIN usa rateLimitPinReset (@pos/shared): instancia compartida
// con el handler IPC de desktop porque ambos corren en el MISMO proceso.
const rateLimit = crearRateLimiter();
const recoveryListRate = crearRateLimiter();

export function startLocalServer(opciones: OpcionesServidor) {
  const app = express();
  app.use(express.json({ limit: "1mb" }));

  registrarAuditoriaLocalServer(opciones.db);

  // Security headers (OWASP A05)
  app.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    res.setHeader("Content-Security-Policy", "default-src 'self'; font-src 'self' https://fonts.gstatic.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data:");
    next();
  });

  // CORS restringido: solo localhost y rangos LAN privados
  app.use((_req, res, next) => {
    const origin = _req.headers.origin || "";
    const permitido =
      origin === "http://localhost:5173" ||
      origin === "http://127.0.0.1:5173" ||
      /^https?:\/\/(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$/.test(origin);

    if (permitido || !origin) {
      res.header("Access-Control-Allow-Origin", origin || "http://localhost:5173");
    }
    res.header("Access-Control-Allow-Headers", "Authorization, Content-Type");
    res.header("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
    if (_req.method === "OPTIONS") return res.sendStatus(204);
    next();
  });

  // Servicios
  const servicios = {
    auth: crearServicioAuth(opciones.db),
    stock: crearServicioStock(opciones.db),
    pedidos: crearServicioPedidos(opciones.db),
    productos: crearServicioProductos(opciones.db),
    gastos: crearServicioGastos(opciones.db),
    nomina: crearServicioNomina(opciones.db),
    ventas: crearServicioVentas(opciones.db),
    caja: crearServicioCaja(opciones.db),
  };

  // ─── Login (con rate limiting) ────────────────────────
  app.post("/auth/login", async (req, res) => {
    try {
      const ip = req.ip || req.socket.remoteAddress || "unknown";
      const { permitido, restantes } = rateLimit.verificar(ip);

      if (!permitido) {
        return res.status(429).json({
          error: "Demasiados intentos. Espere 15 minutos.",
        });
      }

      const { pin, rol } = req.body;
      if (!pin) {
        return res.status(400).json({ error: "PIN es requerido" });
      }

      const usuario = await servicios.auth.login(pin);
      if (!usuario) {
        logAuditoriaLS("login_fallido", undefined, { intentosRestantes: restantes, ip });
        return res.status(401).json({
          error: "PIN incorrecto",
        });
      }

      // Filtrar por rol si se especifica (AGENT.md 5.1 — defensa en profundidad)
      if (rol && usuario.rol !== rol) {
        return res.status(403).json({ error: "PIN no corresponde al rol solicitado" });
      }

      const token = crearSesion({
        usuarioId: usuario.id,
        nombre: usuario.nombre,
        rol: usuario.rol as "propietario" | "cajero" | "pastelera",
      });

      logAuditoriaLS("login_exitoso", usuario.id, {
        nombre: usuario.nombre,
        rol: usuario.rol,
      });

      res.json({ token, usuario });
    } catch (error) {
      res.status(500).json({ error: "Error al iniciar sesión" });
    }
  });

  // ─── Logout ───────────────────────────────────────────
  app.post("/auth/logout", (req, res) => {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      eliminarSesion(authHeader.slice(7));
    }
    res.json({ mensaje: "Sesión cerrada" });
  });

  // ─── Sesión activa (para el shim del navegador) ──────
  app.get("/auth/sesion-activa", authMiddleware(servicios.auth), async (req, res) => {
    try {
      const usuario = (req as any).usuario as { usuarioId: number; nombre: string; rol: string };
      const sesionAbierta = await servicios.caja.obtenerSesionAbierta(usuario.usuarioId);
      res.json({ usuario: { id: usuario.usuarioId, nombre: usuario.nombre, rol: usuario.rol }, sesionAbierta });
    } catch (error) {
      res.json({ usuario: (req as any).usuario, sesionAbierta: null });
    }
  });

  // ─── Todas las rutas /api requieren autenticación ─────
  app.use("/api", authMiddleware(servicios.auth));

  // ─── Stock: ambos roles (pastelera y administrador) ───
  app.use("/api/stock", stockRoutes(servicios.stock));

  // ─── Stock admin: disponibilidad ──────────────────────
  app.use("/api/stock", stockAdminRoutes(servicios.stock));

  // ─── Pedidos: ambos roles ─────────────────────────────
  app.use("/api/pedidos", pedidosRoutes(servicios.pedidos));

  // ─── Pedidos admin: creación ──────────────────────────
  app.use("/api/pedidos", pedidosAdminRoutes(servicios.pedidos));

  // ─── Productos (catálogo): ambos roles ────────────────
  app.get("/api/productos", async (req, res) => {
    try {
      const productos = await servicios.productos.listar();
      res.json({ productos });
    } catch (error) {
      res.status(500).json({ error: "Error al obtener productos" });
    }
  });

  // ─── Usuarios (solo pasteleras, para recuperación PIN) ─
  app.get("/api/usuarios", authMiddleware(servicios.auth), requerirRol("propietario", "cajero"), async (_req, res) => {
    try {
      const usuariosService = crearServicioUsuarios(opciones.db);
      const todos = await usuariosService.listar();
      const pasteleras = todos
        .filter((u: any) => u.rol === "pastelera")
        .map((u: any) => ({ id: u.id, nombre: u.nombre, rol: u.rol }));
      res.json({ usuarios: pasteleras });
    } catch (error) {
      res.status(500).json({ error: "Error al obtener usuarios" });
    }
  });

  // ─── Listado público para recuperación de PIN (solo pasteleras) ─
  // Espejo de IPC usuarios:listarPublico — la pantalla de login móvil
  // lo pide ANTES de autenticarse.
  app.get("/auth/usuarios-recuperacion", async (_req, res) => {
    try {
      const { permitido } = recoveryListRate.verificar("pin-recovery");
      if (!permitido) {
        return res.status(429).json({ error: "Demasiadas solicitudes. Espere 15 minutos." });
      }
      const usuariosService = crearServicioUsuarios(opciones.db);
      const todos = await usuariosService.listar();
      const pasteleras = todos
        .filter((u: any) => u.rol === "pastelera" && u.activo)
        .map((u: any) => ({ id: u.id, nombre: u.nombre, rol: u.rol }));
      res.json({ usuarios: pasteleras });
    } catch (error) {
      res.status(500).json({ error: "Error al obtener usuarios" });
    }
  });

  // ─── Restablecer PIN (público, rate-limited, solo pastelera) ─
  // La validación de rol/IdSchema y el registro en pinResetLog (expiración
  // real de 24 h + debeCambiarPin) viven en @pos/core.restablecerPinPublico.
  app.post("/auth/restablecer-pin", async (req, res) => {
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    try {
      const { permitido } = rateLimitPinReset.verificar("pin-reset-publico");
      if (!permitido) {
        return res.status(429).json({ error: "Demasiadas solicitudes. Espere 1 hora." });
      }

      const { usuarioId } = req.body;
      const resultado = await servicios.auth.restablecerPinPublico(usuarioId);

      logAuditoriaLS("pin_reset_publico", undefined, {
        usuarioResetId: typeof usuarioId === "number" ? usuarioId : undefined,
        expiracion: resultado.expiracion,
        ip,
      });

      res.json(resultado);
    } catch (error) {
      // ZodError (usuarioId inválido) → 400; resto (no existe / rol no
      // permitido / inactivo) → mismo mensaje genérico, sin enumeración.
      const esErrorValidacion =
        typeof error === "object" && error !== null && "issues" in error;
      if (esErrorValidacion) {
        return res.status(400).json({ error: "usuarioId inválido" });
      }
      logAuditoriaLS("permiso_denegado", undefined, {
        operacion: "reset_pin_publico",
        ip,
      });
      res.status(403).json({ error: "No se puede restablecer este PIN" });
    }
  });

  // ─── Gastos: propietario y cajero ─────────────────────
  app.use("/api/gastos", gastosRoutes(servicios.gastos));

  // ─── Nómina: solo propietario ─────────────────────────
  app.use("/api/nomina", nominaRoutes(servicios.nomina));

  // ─── Ventas: propietario y cajero ─────────────────────
  app.use("/api/ventas", ventasRoutes(servicios.ventas));

  // ─── Caja: propietario y cajero ───────────────────────
  app.use("/api/caja", cajaRoutes(servicios.caja));

  // ─── SPA estática para mobile (producción) ─────────────
  const distPath = path.resolve(__dirname, "../dist");
  app.use(express.static(distPath));

  // Redirect /movil/* → /#/movil/* (createHashRouter requiere hash)
  app.get("/movil*", (req, res) => {
    res.redirect(302, `/#${req.path}`);
  });

  // SPA fallback
  app.get("*", (req, res) => {
    if (!req.path.startsWith("/api") && !req.path.startsWith("/auth")) {
      res.sendFile(path.join(distPath, "index.html"));
    }
  });

  // ─── Escuchar en todas las interfaces (0.0.0.0) ───────
  const server = app.listen(opciones.port, "0.0.0.0", () => {
    console.log(`Servidor local escuchando en http://0.0.0.0:${opciones.port}`);
  });

  server.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE") {
      console.error(`Puerto ${opciones.port} ya en uso. El servidor API no se inició.`);
    } else {
      console.error("Error en local-server:", err);
    }
  });

  return server;
}
