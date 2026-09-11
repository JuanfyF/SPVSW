import path from "path";
import express from "express";
import { PosDatabase, auditLog, usuarios as usuariosTable } from "@pos/db";
import { eq } from "@pos/db";
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
import { crearRateLimiter, crearHashPin } from "@pos/shared";
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
const rateLimit = crearRateLimiter();
const resetRateLimit = crearRateLimiter({ maxIntentos: 2, ventanaMs: 60 * 60 * 1000 });

export function startLocalServer(opciones: OpcionesServidor) {
  const app = express();
  app.use(express.json({ limit: "1mb" }));

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
        try {
          opciones.db.insert(auditLog).values({
            evento: "login_fallido",
            detalle: JSON.stringify({ intentosRestantes: restantes, ip }),
            origen: "local-server",
          });
        } catch { /* audit logging es best-effort */ }
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

      try {
        opciones.db.insert(auditLog).values({
          evento: "login_exitoso",
          usuarioId: usuario.id,
          detalle: JSON.stringify({ nombre: usuario.nombre, rol: usuario.rol }),
          origen: "local-server",
        });
      } catch { /* audit logging es best-effort */ }

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

  // ─── Restablecer PIN (público, rate-limited) ──────────
  app.post("/auth/restablecer-pin", async (req, res) => {
    try {
      const ip = req.ip || req.socket.remoteAddress || "unknown";
      const { permitido } = resetRateLimit.verificar(ip);
      if (!permitido) {
        return res.status(429).json({ error: "Demasiadas solicitudes. Espere 1 hora." });
      }

      const { usuarioId } = req.body;
      if (!usuarioId) {
        return res.status(400).json({ error: "usuarioId es requerido" });
      }

      const crypto = await import("crypto");
      const pinTemporal = String(crypto.randomInt(100000, 999999));
      const pinHash = await crearHashPin(pinTemporal);
      const expiracion = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      await opciones.db.update(usuariosTable).set({ pinHash }).where(eq(usuariosTable.id, usuarioId));

      try {
        opciones.db.insert(auditLog).values({
          evento: "pin_reset_publico",
          usuarioId,
          detalle: JSON.stringify({ expiracion }),
          origen: "local-server",
        });
      } catch { /* best-effort */ }

      res.json({ pinTemporal, expiracion });
    } catch (error) {
      res.status(500).json({ error: "Error al restablecer PIN" });
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
