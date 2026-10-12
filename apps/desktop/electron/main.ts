/**
 * Electron main process — Sweet Bakery POS.
 *
 * Responsabilidades:
 * - Ciclo de vida de la app (whenReady, window-all-closed)
 * - Inicialización de DB + migraciones + integridad
 * - Seed de usuario propietario
 * - Inicialización de servicios de dominio
 * - Registro de handlers IPC (delegado a módulos en handlers/)
 * - Creación de ventana principal + menú + updater
 * - Servidor local para pasteleras
 *
 * Los handlers IPC están divididos por dominio en handlers/*.ts
 * siguiendo SRP. Este archivo orquesta la inicialización.
 */
import { app, BrowserWindow, dialog, shell } from "electron";
import path from "node:path";
import { randomInt } from "node:crypto";
import { crearMenuPrincipal, setVentanaPrincipal } from "./menu";
import { setupAutoUpdater } from "./updater";
import { initContext, setMainWindow } from "./handlers/context";

// ─── Single-instance lock (D3) ─────────────────────────
// Dos copias = dos servidores locales apuntando a la MISMA SQLite →
// bloqueos y riesgo de corrupción. La segunda instancia solo enfoca
// la ventana existente.
const tieneInstanciaPrincipal = app.requestSingleInstanceLock();
if (!tieneInstanciaPrincipal) {
  app.quit();
}
app.on("second-instance", () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

// Errores no capturados: registrarlos sin tumbar el proceso (POS debe
// seguir operando; un crash total pierde la venta en curso).
process.on("uncaughtException", (err) => {
  console.error("Excepción no capturada:", err);
});
process.on("unhandledRejection", (reason) => {
  console.error("Promesa rechazada sin manejar:", reason);
});

// Desactivar aceleración de hardware y GPU
process.env.ELECTRON_DISABLE_GPU = "1";
app.disableHardwareAcceleration();
app.commandLine.appendSwitch("disable-gpu");
app.commandLine.appendSwitch("disable-software-rasterizer");
app.commandLine.appendSwitch("ozone-platform=x11");
app.commandLine.appendSwitch("in-process-gpu");

import { createDbWithSqlite, migrate } from "@pos/db";
import { usuarios } from "@pos/db";
import { crearHashPin } from "@pos/shared";
import { startLocalServer } from "@pos/local-server";
import {
  crearServicioAuth,
  crearServicioUsuarios,
  crearServicioEmpleados,
  crearServicioProductos,
  crearServicioCaja,
  crearServicioStock,
  crearServicioVentas,
  crearServicioPedidos,
  crearServicioGastos,
  crearServicioNomina,
  crearServicioReportes,
  crearServicioConfiguracion,
  crearServicioAuditoria,
} from "@pos/core";

// ─── Handler imports ─────────────────────────────────
import { registrarAuthHandlers } from "./handlers/auth";
import { registrarUsuariosHandlers } from "./handlers/usuarios";
import { registrarConfiguracionHandlers } from "./handlers/configuracion";
import { registrarEmpleadosHandlers } from "./handlers/empleados";
import { registrarProductosHandlers } from "./handlers/productos";
import { registrarCajaHandlers } from "./handlers/caja";
import { registrarStockHandlers } from "./handlers/stock";
import { registrarVentasHandlers } from "./handlers/ventas";
import { registrarPedidosHandlers } from "./handlers/pedidos";
import { registrarGastosHandlers } from "./handlers/gastos";
import { registrarNominaHandlers } from "./handlers/nomina";
import { registrarReportesHandlers } from "./handlers/reportes";
import { registrarSistemaHandlers } from "./handlers/sistema";
import { registrarAuditoriaHandlers } from "./handlers/auditoria";

let mainWindow: BrowserWindow | null = null;
let db: ReturnType<typeof createDbWithSqlite>["db"] | null = null;
let servidorLocal: ReturnType<typeof startLocalServer> | null = null;

function registrarHandlers() {
  registrarAuthHandlers();
  registrarUsuariosHandlers();
  registrarConfiguracionHandlers();
  registrarEmpleadosHandlers();
  registrarProductosHandlers();
  registrarCajaHandlers();
  registrarStockHandlers();
  registrarVentasHandlers();
  registrarPedidosHandlers();
  registrarGastosHandlers();
  registrarNominaHandlers();
  registrarReportesHandlers();
  registrarSistemaHandlers();
  registrarAuditoriaHandlers();
}

/**
 * Orígenes a los que la ventana principal puede navegar por su cuenta:
 * el dev server de Vite (desarrollo) o el bundle local file:// (producción).
 * Cualquier otro destino se bloquea (will-navigate) — la app es una SPA
 * local y no debe salir a internet sin decisión explícita del usuario.
 */
function esOrigenPermitido(url: string): boolean {
  return url.startsWith("http://localhost:5173") || url.startsWith("file://");
}

async function crearVentanaPrincipal() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Bloquea popups (window.open / target=_blank): los http(s) abren en el
  // navegador del sistema, el resto se deniega. Sin esto, cualquier XSS
  // (ej. recibo) podía abrir ventanas con la app cargada.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http://") || url.startsWith("https://")) {
      void shell.openExternal(url);
    }
    return { action: "deny" };
  });

  // Bloquea navegación de la SPA a orígenes externos (link inyectado,
  // redirección, etc.). In-page (#/) no dispara will-navigate.
  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (!esOrigenPermitido(url)) {
      event.preventDefault();
      console.warn(`[Seguridad] Navegación bloqueada hacia: ${url}`);
    }
  });

  // Content Security Policy (CSP) — OWASP A05
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        // Sincronizado con el meta CSP de src/renderer/index.html
        // (+ frame-ancestors, que los meta ignoran). En desarrollo se
        // permite script inline ('unsafe-inline') porque el preamble de
        // react-refresh de Vite es inline — el build de producción no lo es.
        "Content-Security-Policy": [
          `default-src 'self'; script-src 'self'${process.env.NODE_ENV === "development" ? " 'unsafe-inline'" : ""}; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self' http://localhost:3000; object-src 'none'; base-uri 'self'; frame-ancestors 'none'`
        ],
      },
    });
  });

  setVentanaPrincipal(mainWindow);
  setMainWindow(mainWindow);

  // La ventana destruida no debe quedar referenciada por el menú/contexto
  // (dialogs con parent destruido → crash en algunas plataformas).
  mainWindow.on("closed", () => {
    mainWindow = null;
    setVentanaPrincipal(null);
    setMainWindow(null);
  });

  try {
    if (process.env.NODE_ENV === "development") {
      await mainWindow.loadURL("http://localhost:5173");
    } else {
      await mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
    }
  } catch (err) {
    // Ventana en blanco silenciosa: al menos diagnosticar + avisar.
    console.error("Error al cargar la interfaz:", err);
    await dialog.showErrorBox(
      "Error al cargar",
      "No se pudo cargar la interfaz de la aplicación. Reinicie el programa."
    );
  }
}

app.whenReady().then(async () => {
  if (!tieneInstanciaPrincipal) return;

  const dbPath = path.join(app.getPath("userData"), "pos.sqlite");

  const { db: dbInstance } = createDbWithSqlite(dbPath);
  db = dbInstance;

  // Migraciones + verificación de integridad
  try {
    const migrationsFolder = process.env.NODE_ENV === "development"
      ? path.join(__dirname, "../../../packages/db/drizzle")
      : path.join(process.resourcesPath, "drizzle");
    migrate(db, { migrationsFolder });
    console.log("Migraciones ejecutadas correctamente");

    try {
      const { sql } = await import("drizzle-orm");
      const resultado = db.all(sql.raw("PRAGMA integrity_check"));
      const primeraFila = resultado[0] as { integrity_check: string } | undefined;
      if (primeraFila?.integrity_check !== "ok") {
        console.error("ADVERTENCIA: Integridad de DB comprometida:", primeraFila);
      }
    } catch (err) {
      console.error("Error verificando integridad de DB:", err);
    }
  } catch (error) {
    console.error("Error al ejecutar migraciones:", error);
    await dialog.showErrorBox(
      "Error de Base de Datos",
      `No se pudo actualizar la base de datos: ${error}\n\nLa aplicación se cerrará.`
    );
    app.quit();
    return;
  }

  // Inicializar servicios de dominio
  const servicios = {
    auth: crearServicioAuth(db),
    usuarios: crearServicioUsuarios(db),
    empleados: crearServicioEmpleados(db),
    productos: crearServicioProductos(db),
    caja: crearServicioCaja(db),
    stock: crearServicioStock(db),
    ventas: crearServicioVentas(db),
    pedidos: crearServicioPedidos(db),
    gastos: crearServicioGastos(db),
    nomina: crearServicioNomina(db),
    reportes: crearServicioReportes(db),
    configuracion: crearServicioConfiguracion(db),
    auditoria: crearServicioAuditoria(db),
  };

  // Inicializar contexto de handlers
  initContext({ servicios, db, mainWindow });

  // Crear usuario propietario por defecto si la DB está vacía
  try {
    const existingUsers = await db.select().from(usuarios).limit(1);
    if (existingUsers.length === 0) {
      const pinAleatorio = String(randomInt(100000, 999999));
      const pinHash = await crearHashPin(pinAleatorio);
      await db.insert(usuarios).values({
        nombre: "Propietario",
        rol: "propietario",
        pinHash,
      });
      console.log("=== USUARIO PROPIETARIO CREADO ===");
      await dialog.showMessageBox({
        type: "info",
        title: "PIN de acceso",
        message: `Tu PIN de acceso es: ${pinAleatorio}`,
        detail: "Guarde este PIN. Se recomienda cambiarlo después del primer inicio.",
        buttons: ["Entendido"],
      });
      console.log("===================================");
    }
  } catch (err) {
    console.error("Error al crear usuario propietario:", err);
  }

  registrarHandlers();
  crearMenuPrincipal();

  // Servidor local para pasteleras (mobile). Si el puerto está ocupado,
  // avisar al usuario: sin esto solo queda un console.error invisible.
  servidorLocal = startLocalServer({ port: 3000, db });
  servidorLocal.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE") {
      dialog.showErrorBox(
        "Puerto 3000 en uso",
        "El servidor local para los teléfonos de las pasteleras no pudo iniciarse " +
          "porque el puerto 3000 ya está ocupado por otro programa.\n\n" +
          "El escritorio seguirá funcionando, pero el móvil no podrá conectarse."
      );
    }
  });

  await crearVentanaPrincipal();

  if (mainWindow) {
    setupAutoUpdater(mainWindow);
  }
});

// El servidor debe cerrarse al salir: el puerto queda retenido si no.
app.on("before-quit", () => {
  servidorLocal?.close();
  servidorLocal = null;
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// Crash del proceso de render: registrar el motivo y recargar (la sesión
// de escritorio vive en el main process, no se pierde).
app.on("render-process-gone", (_event, _webContents, details) => {
  console.error("Proceso de renderizado terminado:", details.reason);
  if (details.reason !== "clean-exit" && mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.reload();
  }
});
