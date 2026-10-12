import { Response } from "express";

/**
 * Clasificación de errores para las respuestas HTTP (Fase D — auditoría):
 * - ZodError (validación de entrada) → 400
 * - Error de dominio (mensaje legible de @pos/core) → 409
 * - Cualquier otro (DB, bug) → 500 con mensaje genérico
 *
 * El filtro de dominio evita filtrar mensajes de drizzle/SQLite (pueden
 * contener nombres de columnas o SQL): solo se reenvían mensajes que
 * parecen frases de negocio en español.
 */

const PATRON_ERROR_DB =
  /\b(sql|sqlite|database|constraint|column|table|foreign|primary|select|insert|update|delete|where|join|drizzle)\b/i;

export function esErrorValidacion(error: unknown): boolean {
  return (
    typeof error === "object" && error !== null && Array.isArray((error as any).issues)
  );
}

export function esErrorDominio(error: unknown): error is Error {
  if (!(error instanceof Error)) return false;
  if (esErrorValidacion(error)) return false;
  const msg = error.message.trim();
  if (!msg || msg.length > 200) return false;
  if (PATRON_ERROR_DB.test(msg)) return false;
  // Mensajes tipo "TypeError: ..." / "SqliteError: ..." no son de dominio
  if (/^[A-Za-z]+Error\b/.test(msg)) return false;
  return true;
}

/**
 * Responde a un catch de ruta con la semántica correcta.
 * Los errores de dominio (409) exponen el mensaje legible de core;
 * el resto usa mensajeGenerico sin fugar detalles internos.
 */
export function responderError(
  res: Response,
  error: unknown,
  mensajeGenerico: string,
  contexto?: string
): void {
  if (esErrorValidacion(error)) {
    res.status(400).json({ error: "Datos inválidos" });
    return;
  }
  if (esErrorDominio(error)) {
    res.status(409).json({ error: error.message });
    return;
  }
  if (contexto) {
    console.error(`${contexto}:`, error instanceof Error ? error.message : error);
  }
  res.status(500).json({ error: mensajeGenerico });
}

/**
 * Parsea un query-param a id positivo. Retorna null si no es válido
 * (en vez de NaN → 500).
 */
export function parseIdQuery(valor: unknown): number | null {
  if (typeof valor !== "string" || !/^\d+$/.test(valor)) return null;
  const n = parseInt(valor, 10);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

/**
 * Parsea un query-param a número finito (entero o decimal).
 */
export function parseNumeroQuery(valor: unknown): number | null {
  if (typeof valor !== "string" || valor.trim() === "") return null;
  const n = Number(valor);
  return Number.isFinite(n) ? n : null;
}
