import { describe, it, expect, vi } from "vitest";

vi.mock("electron", () => ({
  app: { isPackaged: true },
  dialog: { showMessageBox: vi.fn() },
  BrowserWindow: class {},
}));
vi.mock("electron-updater", () => ({
  autoUpdater: {
    autoDownload: true,
    autoInstallOnAppQuit: false,
    on: vi.fn(),
    checkForUpdates: vi.fn().mockResolvedValue(undefined),
    downloadUpdate: vi.fn(),
    quitAndInstall: vi.fn(),
  },
}));

import { detalleConNotas } from "./updater";
import type { UpdateInfo } from "electron-updater";

function info(conReleaseNotes?: UpdateInfo["releaseNotes"]): UpdateInfo {
  return { version: "0.2.5", releaseNotes: conReleaseNotes } as UpdateInfo;
}

describe("detalleConNotas", () => {
  it("sin notas retorna solo el call-to-action", () => {
    const resultado = detalleConNotas(info(undefined));
    expect(resultado).toContain("¿Desea descargar e instalar");
    expect(resultado).not.toContain("undefined");
  });

  it("notas como string se formatean y añaden CTA", () => {
    const resultado = detalleConNotas(info("# Changelog\n- Fix importante"));
    expect(resultado).toContain("Fix importante");
    expect(resultado).toContain("¿Desea descargar");
  });

  it("notas como array de objetos se unen", () => {
    const resultado = detalleConNotas(
      info([
        { note: "Parte 1" },
        { note: "Parte 2" },
      ] as UpdateInfo["releaseNotes"])
    );
    expect(resultado).toContain("Parte 1");
    expect(resultado).toContain("Parte 2");
  });

  it("notas largas se recortan a LIMITE_NOTAS + elipsis", () => {
    const largas = "x".repeat(5000);
    const resultado = detalleConNotas(info(largas));
    // 1200 de notas + CTA (el CTA no cuenta para el corte)
    const cuerpo = resultado.replace("…\n\n¿Desea descargar e instalar la actualización ahora? La app se reiniciará.", "");
    expect(cuerpo).toHaveLength(1200);
    expect(resultado).toContain("…");
  });

  it("notas vacías o solo whitespace tratan como sin notas", () => {
    const resultado = detalleConNotas(info("   \n  "));
    expect(resultado).toBe("¿Desea descargar e instalar la actualización ahora? La app se reiniciará.");
  });
});
