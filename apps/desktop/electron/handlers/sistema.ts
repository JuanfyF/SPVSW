/**
 * Handlers IPC de sistema (backup, restore, ruta DB, versión).
 */
import { app } from "electron";
import path from "node:path";
import { ipcMain } from "electron";
import { ctx } from "./context";

export function registrarSistemaHandlers() {

  ipcMain.handle("sistema:getDbPath", ctx.safeHandler(async () => {
    return path.join(app.getPath("userData"), "pos.sqlite");
  }, { auth: true }));

  ipcMain.handle("sistema:getVersion", async () => {
    return app.getVersion();
  });

  ipcMain.handle("sistema:backup", ctx.safeHandler(async (_event, rutaDestino: string) => {
    const db = ctx.getDb();
    const usuarioActual = ctx.getUsuarioActual();
    if (!db) throw new Error("Base de datos no inicializada");
    const fs = await import("fs");
    const crypto = await import("crypto");
    const currentDbPath = path.join(app.getPath("userData"), "pos.sqlite");
    const walPath = currentDbPath + "-wal";
    const shmPath = currentDbPath + "-shm";

    const rutaResuelta = path.isAbsolute(rutaDestino)
      ? path.resolve(rutaDestino)
      : path.resolve(app.getPath("documents"), rutaDestino);
    const directoriosPermitidos = [
      path.resolve(app.getPath("userData")),
      path.resolve(app.getPath("desktop")),
      path.resolve(app.getPath("documents")),
      path.resolve(app.getPath("downloads")),
    ];
    const rutaPermitida = directoriosPermitidos.some((dir) =>
      rutaResuelta.startsWith(dir + path.sep) || rutaResuelta === dir
    );
    if (!rutaPermitida) {
      throw new Error("Ruta de backup no permitida. Use Documents, Desktop o Downloads.");
    }

    const { createDbWithSqlite: createDbFn } = await import("@pos/db");
    const { sqlite: tempSqlite } = createDbFn(currentDbPath);
    tempSqlite.pragma("wal_checkpoint(TRUNCATE)");
    tempSqlite.close();

    fs.copyFileSync(currentDbPath, rutaResuelta);
    if (fs.existsSync(walPath)) {
      fs.copyFileSync(walPath, rutaResuelta + "-wal");
    }
    if (fs.existsSync(shmPath)) {
      fs.copyFileSync(shmPath, rutaResuelta + "-shm");
    }

    const hash = crypto.createHash("sha256");
    hash.update(fs.readFileSync(rutaResuelta));
    const sha256 = hash.digest("hex");
    fs.writeFileSync(rutaResuelta + ".sha256", sha256);

    ctx.logAuditoria("backup", usuarioActual?.id, { ruta: rutaResuelta, sha256 });

    return { ok: true, ruta: rutaResuelta, sha256 };
  }, { admin: true }));

  ipcMain.handle("sistema:restore", ctx.safeHandler(async (_event, rutaBackup: string) => {
    const usuarioActual = ctx.getUsuarioActual();
    const fs = await import("fs");
    const crypto = await import("crypto");
    const currentDbPath = path.join(app.getPath("userData"), "pos.sqlite");
    const walPath = currentDbPath + "-wal";
    const shmPath = currentDbPath + "-shm";

    const rutaResuelta = path.resolve(rutaBackup);
    const directoriosPermitidos = [
      path.resolve(app.getPath("userData")),
      path.resolve(app.getPath("desktop")),
      path.resolve(app.getPath("documents")),
      path.resolve(app.getPath("downloads")),
    ];
    const rutaPermitida = directoriosPermitidos.some((dir) =>
      rutaResuelta.startsWith(dir + path.sep) || rutaResuelta === dir
    );
    if (!rutaPermitida) {
      throw new Error("Ruta de backup no permitida. Use Documents, Desktop o Downloads.");
    }

    if (!fs.existsSync(rutaResuelta)) {
      throw new Error("El archivo de backup no existe");
    }

    const rutaSha256 = rutaResuelta + ".sha256";
    if (fs.existsSync(rutaSha256)) {
      const hashAlmacenado = fs.readFileSync(rutaSha256, "utf-8").trim();
      const hashCalc = crypto.createHash("sha256");
      hashCalc.update(fs.readFileSync(rutaResuelta));
      const sha256Calculado = hashCalc.digest("hex");
      if (hashAlmacenado !== sha256Calculado) {
        throw new Error("El backup está corrupto o fue manipulado (SHA-256 no coincide).");
      }
    }

    fs.copyFileSync(rutaResuelta, currentDbPath);
    if (fs.existsSync(rutaResuelta + "-wal")) {
      fs.copyFileSync(rutaResuelta + "-wal", walPath);
    } else if (fs.existsSync(walPath)) {
      fs.unlinkSync(walPath);
    }
    if (fs.existsSync(rutaResuelta + "-shm")) {
      fs.copyFileSync(rutaResuelta + "-shm", shmPath);
    } else if (fs.existsSync(shmPath)) {
      fs.unlinkSync(shmPath);
    }

    ctx.logAuditoria("restore", usuarioActual?.id, { ruta: rutaResuelta });

    return { ok: true };
  }, { admin: true }));
}
