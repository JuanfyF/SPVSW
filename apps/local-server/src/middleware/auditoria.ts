import { PosDatabase, auditLog } from "@pos/db";

/**
 * Auditoría del servidor local (origen "local-server").
 *
 * AGENT.md §2.7/§5.1 — eventos del servidor LAN (mobile) con el mismo formato
 * de nombres que desktop, para que la pantalla Auditoría los etiquete igual.
 *
 * drizzle con better-sqlite3 es perezoso: SIN await/then la query no se
 * ejecuta nunca — por eso se resuelve la promesa en fire-and-forget.
 * El logger es best-effort: un fallo de auditoría nunca rompe la operación.
 */
let db: PosDatabase | null = null;

export function registrarAuditoriaLocalServer(database: PosDatabase): void {
  db = database;
}

export function logAuditoriaLS(
  evento: string,
  usuarioId?: number,
  detalle?: Record<string, unknown>
): void {
  if (!db) return;
  try {
    void Promise.resolve(
      db.insert(auditLog).values({
        evento,
        usuarioId,
        detalle: detalle ? JSON.stringify(detalle) : undefined,
        origen: "local-server",
      })
    ).catch((err) => {
      console.error(`[Auditoria] No se pudo registrar "${evento}":`, err);
    });
  } catch (err) {
    console.error(`[Auditoria] No se pudo registrar "${evento}":`, err);
  }
}
