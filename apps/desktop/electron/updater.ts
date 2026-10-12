/**
 * Auto-updater para Sweet Bakery.
 * Usa electron-updater con GitHub Releases como fuente de actualizaciones.
 *
 * Solo funciona en builds de producción (no en `electron .` directo).
 *
 * Hardening (Fase C — auditoría):
 * - Reintentos con espera si el chequeo inicial falla (red caída al arrancar)
 * - Re-chequeo periódico cada 6 h (el arranque puede ocurrir con el
 *   internet del local todavía caído)
 * - Diálogos sin depender de que la ventana siga viva
 * - quitAndInstall silencioso + relanzado forzado
 */

import { autoUpdater, UpdateInfo } from "electron-updater";
import { app, BrowserWindow, dialog, MessageBoxOptions } from "electron";
import { formatearNotasRelease } from "@pos/shared";

let mainWindow: BrowserWindow | null = null;

/** Máximo de caracteres de release notes en el diálogo (Linux corta detalles largos). */
const LIMITE_NOTAS = 1200;

/** Espera antes de reintentar un chequeo fallido (5 min). */
const REINTENTO_INICIAL_MS = 5 * 60 * 1000;
/** Máximo de reintentos del chequeo inicial. */
const MAX_REINTENTOS_INICIALES = 2;
/** Re-chequeo periódico una vez arrancada la app (6 h). */
const REINTENTO_PERIODICO_MS = 6 * 60 * 60 * 1000;

let reintentosIniciales = 0;
let intervaloPeriodico: ReturnType<typeof setInterval> | null = null;

export function detalleConNotas(info: UpdateInfo): string {
  const crudas = info.releaseNotes;
  const texto = Array.isArray(crudas)
    ? crudas.map((n) => n.note).join("\n\n")
    : crudas;
  const notas = formatearNotasRelease(texto);
  const cta = "¿Desea descargar e instalar la actualización ahora? La app se reiniciará.";
  if (!notas) return cta;
  const recortadas = notas.length > LIMITE_NOTAS
    ? `${notas.slice(0, LIMITE_NOTAS)}…`
    : notas;
  return `${recortadas}\n\n${cta}`;
}

/** Diálogo con ventana viva si existe; sin parent si fue destruida. */
async function mostrarDialogo(
  opciones: MessageBoxOptions
): Promise<number> {
  const padre = mainWindow && !mainWindow.isDestroyed() ? mainWindow : undefined;
  const resultado = padre
    ? await dialog.showMessageBox(padre, opciones)
    : await dialog.showMessageBox(opciones);
  return resultado.response;
}

function limpiarProgreso(): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.setProgressBar(-1);
  }
}

function chequear(): void {
  autoUpdater.checkForUpdates().catch((err) => {
    console.error("[Updater] Error al buscar actualizaciones:", err instanceof Error ? err.message : err);
    if (reintentosIniciales < MAX_REINTENTOS_INICIALES) {
      reintentosIniciales++;
      console.log(`[Updater] Reintento ${reintentosIniciales}/${MAX_REINTENTOS_INICIALES} en ${REINTENTO_INICIAL_MS / 60000} min`);
      const timer = setTimeout(chequear, REINTENTO_INICIAL_MS);
      if (typeof timer === "object" && "unref" in timer) timer.unref();
    }
  });
}

function iniciarRechequeoPeriodico(): void {
  if (intervaloPeriodico) return;
  intervaloPeriodico = setInterval(() => {
    autoUpdater.checkForUpdates().catch((err) => {
      console.error("[Updater] Error en re-chequeo periódico:", err instanceof Error ? err.message : err);
    });
  }, REINTENTO_PERIODICO_MS);
  if (typeof intervaloPeriodico === "object" && "unref" in intervaloPeriodico) {
    intervaloPeriodico.unref();
  }
}

/**
 * Configurar y ejecutar auto-updater.
 */
export function setupAutoUpdater(win: BrowserWindow) {
  mainWindow = win;

  // No configurar en modo desarrollo
  if (process.env.NODE_ENV === "development" || !app.isPackaged) {
    console.log("[Updater] Deshabilitado en modo desarrollo");
    return;
  }

  // Configuración
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  // Eventos
  autoUpdater.on("update-available", async (info: UpdateInfo) => {
    iniciarRechequeoPeriodico();
    console.log(`[Updater] Actualización disponible: v${info.version}`);

    const respuesta = await mostrarDialogo({
      type: "info",
      title: "Actualización disponible",
      message: `Hay una nueva versión de Sweet Bakery disponible (v${info.version}).`,
      detail: detalleConNotas(info),
      buttons: ["Descargar", "Más tarde"],
      defaultId: 0,
      cancelId: 1,
    });

    if (respuesta === 0) {
      autoUpdater.downloadUpdate();
    }
  });

  autoUpdater.on("update-not-available", () => {
    iniciarRechequeoPeriodico();
    console.log("[Updater] La app está actualizada");
  });

  autoUpdater.on("download-progress", (progress) => {
    const percent = Math.round(progress.percent);
    if (mainWindow && !mainWindow.isDestroyed()) {
      // Solo la taskbar: la API IPC update:progress no tenía consumidor.
      mainWindow.setProgressBar(progress.percent / 100);
    }
    if (percent % 25 === 0) {
      console.log(`[Updater] Descarga: ${percent}%`);
    }
  });

  autoUpdater.on("update-downloaded", async (info: UpdateInfo) => {
    console.log(`[Updater] Descarga completada: v${info.version}`);
    limpiarProgreso();

    const respuesta = await mostrarDialogo({
      type: "info",
      title: "Actualización lista",
      message: "La actualización se ha descargado correctamente.",
      detail: "La app se reiniciará para aplicar la actualización. Los datos no se perderán.",
      buttons: ["Reiniciar ahora", "Reiniciar después"],
      defaultId: 0,
      cancelId: 1,
    });

    if (respuesta === 0) {
      // Silencioso + relanzar después de instalar (evita el diálogo extra
      // del instalador y asegura que la app vuelva sola).
      autoUpdater.quitAndInstall(true, true);
    }
  });

  autoUpdater.on("error", (err: Error) => {
    console.error("[Updater] Error:", err.message);
    limpiarProgreso();
  });

  // Buscar actualizaciones al iniciar (sin notificación nativa: el diálogo
  // "Actualización disponible" ya informa con el detalle de las notas).
  // Si falla (red caída al arranque), reintenta con espera.
  chequear();
}
