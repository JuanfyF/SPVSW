import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import * as relations from "./relations";

/**
 * No abre la conexión al importar el módulo — la ruta del archivo SQLite
 * depende de app.getPath('userData'), que solo existe dentro del proceso
 * de Electron. apps/desktop llama a createDb(rutaArchivo) al arrancar.
 *
 * TODO(fase 3): agregar pragma de WAL mode y foreign_keys=ON al abrir,
 * son buenas prácticas para SQLite en apps de escritorio con escrituras
 * concurrentes (desktop + local-server escribiendo a la vez).
 */
export function createDb(rutaArchivo: string) {
  const sqlite = new Database(rutaArchivo);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  return drizzle(sqlite, { schema: { ...schema, ...relations } });
}

export function createDbWithSqlite(rutaArchivo: string) {
  const sqlite = new Database(rutaArchivo);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  const drizzleDb = drizzle(sqlite, { schema: { ...schema, ...relations } });
  return { db: drizzleDb, sqlite };
}

export type PosDatabase = ReturnType<typeof createDb>;

export * from "./schema";
export * from "./relations";
