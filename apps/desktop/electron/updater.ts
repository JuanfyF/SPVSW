/**
 * Auto-updater para Sweet Bakery.
 * Usa electron-updater con GitHub Releases como fuente de actualizaciones.
 *
 * Solo funciona en builds de producción (no en `electron .` directo).
 */

import { autoUpdater, UpdateInfo } from "electron-updater";
import { app, BrowserWindow, dialog } from "electron";
import { formatearNotasRelease } from "@pos/shared";

let mainWindow: BrowserWindow | null = null;

/** Máximo de caracteres de release notes en el diálogo (Linux corta detalles largos). */
const LIMITE_NOTAS = 1200;

function detalleConNotas(info: UpdateInfo): string {
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
    console.log(`[Updater] Actualización disponible: v${info.version}`);
    console.log(`[Updater] Notas: ${detalleConNotas(info).slice(0, 400)}`);

    const response = await dialog.showMessageBox(win, {
      type: "info",
      title: "Actualización disponible",
      message: `Hay una nueva versión de Sweet Bakery disponible (v${info.version}).`,
      detail: detalleConNotas(info),
      buttons: ["Descargar", "Más tarde"],
      defaultId: 0,
      cancelId: 1,
    });

    if (response.response === 0) {
      autoUpdater.downloadUpdate();
    }
  });

  autoUpdater.on("update-not-available", () => {
    console.log("[Updater] La app está actualizada");
  });

  autoUpdater.on("download-progress", (progress) => {
    const percent = Math.round(progress.percent);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.setProgressBar(progress.percent / 100);
      mainWindow.webContents.send("update:progress", {
        percent,
        bytesPerSecond: progress.bytesPerSecond,
        transferred: progress.transferred,
        total: progress.total,
      });
    }
  });

  autoUpdater.on("update-downloaded", async (info: UpdateInfo) => {
    console.log(`[Updater] Descarga completada: v${info.version}`);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.setProgressBar(-1);
    }

    const response = await dialog.showMessageBox(win, {
      type: "info",
      title: "Actualización lista",
      message: "La actualización se ha descargado correctamente.",
      detail: "La app se reiniciará para aplicar la actualización. Los datos no se perderán.",
      buttons: ["Reiniciar ahora", "Reiniciar después"],
      defaultId: 0,
      cancelId: 1,
    });

    if (response.response === 0) {
      autoUpdater.quitAndInstall();
    }
  });

  autoUpdater.on("error", (err: Error) => {
    console.error("[Updater] Error:", err.message);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.setProgressBar(-1);
    }
  });

  // Buscar actualizaciones al iniciar (sin notificación nativa: el diálogo
  // "Actualización disponible" ya informa con el detalle de las notas)
  autoUpdater.checkForUpdates().catch((err) => {
    console.error("[Updater] Error al buscar actualizaciones:", err);
  });
}
