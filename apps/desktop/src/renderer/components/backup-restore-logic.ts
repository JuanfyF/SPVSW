import { copyFileSync, existsSync, unlinkSync } from "fs";
import { join } from "path";

interface BackupOptions {
  dbPath: string;
  rutaDestino: string;
  sqlite: { pragma: (sql: string) => void; close: () => void };
}

interface RestoreOptions {
  dbPath: string;
  rutaBackup: string;
  crearDb: (path: string) => { db: unknown; sqlite: unknown };
}

export function ejecutarBackup(opts: BackupOptions): { ok: boolean; ruta: string } {
  const { dbPath, rutaDestino, sqlite } = opts;
  const walPath = dbPath + "-wal";
  const shmPath = dbPath + "-shm";

  // Forzar checkpoint para que todo esté en el archivo principal
  sqlite.pragma("wal_checkpoint(TRUNCATE)");
  sqlite.close();

  copyFileSync(dbPath, rutaDestino);

  // Copiar WAL y SHM si existen
  if (existsSync(walPath)) {
    copyFileSync(walPath, rutaDestino + "-wal");
  }
  if (existsSync(shmPath)) {
    copyFileSync(shmPath, rutaDestino + "-shm");
  }

  return { ok: true, ruta: rutaDestino };
}

export function ejecutarRestore(opts: RestoreOptions): { ok: boolean } {
  const { dbPath, rutaBackup, crearDb } = opts;
  const walPath = dbPath + "-wal";
  const shmPath = dbPath + "-shm";

  // Verificar que el backup existe
  if (!existsSync(rutaBackup)) {
    throw new Error("El archivo de backup no existe");
  }

  // Restaurar archivos
  copyFileSync(rutaBackup, dbPath);
  if (existsSync(rutaBackup + "-wal")) {
    copyFileSync(rutaBackup + "-wal", walPath);
  } else if (existsSync(walPath)) {
    unlinkSync(walPath);
  }
  if (existsSync(rutaBackup + "-shm")) {
    copyFileSync(rutaBackup + "-shm", shmPath);
  } else if (existsSync(shmPath)) {
    unlinkSync(shmPath);
  }

  // Reconectar
  crearDb(dbPath);

  return { ok: true };
}

export function generarNombreBackup(fechaIso?: string): string {
  const fecha = (fechaIso ?? new Date().toISOString()).slice(0, 10);
  return `sweet-bakery-backup-${fecha}.sqlite`;
}
