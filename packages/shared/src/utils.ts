/**
 * Utilidades compartidas para hashing de PINs y otras funciones.
 */

/**
 * Crea un hash SHA-256 de un PIN usando Web Crypto API.
 * Funciona tanto en browser (renderer) como en Node.js 20+ (main process).
 */
export async function crearHashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Verifica un PIN contra un hash.
 */
export async function verificarPin(pin: string, hash: string): Promise<boolean> {
  const pinHash = await crearHashPin(pin);
  return pinHash === hash;
}

/**
 * Formatea una fecha a YYYY-MM-DD en zona horaria LOCAL.
 * (toISOString usa UTC: en Ecuador UTC-5 devuelve el día anterior tras medianoche)
 */
export function formatearFecha(fecha: Date): string {
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, "0");
  const d = String(fecha.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Formatea una hora a HH:MM en zona horaria LOCAL.
 */
export function formatearHora(fecha: Date): string {
  const h = String(fecha.getHours()).padStart(2, "0");
  const m = String(fecha.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

/**
 * Valida un formato de fecha YYYY-MM-DD.
 */
export function esFormatoFechaValido(fecha: string): boolean {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(fecha)) return false;

  const partes = fecha.split("-");
  const año = parseInt(partes[0] ?? "0", 10);
  const mes = parseInt(partes[1] ?? "0", 10);
  const dia = parseInt(partes[2] ?? "0", 10);
  
  const fechaObj = new Date(año, mes - 1, dia);

  return (
    fechaObj.getFullYear() === año &&
    fechaObj.getMonth() === mes - 1 &&
    fechaObj.getDate() === dia
  );
}

/**
 * Valida un formato de hora HH:MM o HH:MM:SS.
 */
export function esFormatoHoraValido(hora: string): boolean {
  const regex = /^\d{2}:\d{2}(:\d{2})?$/;
  if (!regex.test(hora)) return false;

  const partes = hora.split(":");
  const horas = parseInt(partes[0] ?? "0", 10);
  const minutos = parseInt(partes[1] ?? "0", 10);

  return horas >= 0 && horas <= 23 && minutos >= 0 && minutos <= 59;
}

/**
 * Calcula la diferencia en días entre dos fechas.
 */
export function diferenciaEnDias(fecha1: string, fecha2: string): number {
  const f1 = new Date(fecha1);
  const f2 = new Date(fecha2);
  const diffTime = Math.abs(f2.getTime() - f1.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}
