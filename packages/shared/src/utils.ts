/**
 * Utilidades compartidas para hashing de PINs y otras funciones.
 *
 * SEGURIDAD: PINs se hashean con PBKDF2 (Web Crypto API) + salt aleatorio.
 * Formato nuevo: pbkdf2:{salt_hex}:{key_hex}
 * Formato legacy: sha256_hex (sin salt) — se migra automáticamente al verificar.
 *
 * Usa crypto.subtle (Web Crypto API) que funciona tanto en browser (renderer)
 * como en Node.js (main process) — compatible con bundlers como Vite.
 */

const SALT_BYTES = 16;
const KEY_LENGTH = 64;
const PBKDF2_ITERATIONS = 600000;

/**
 * Crea un hash PBKDF2 de un PIN con salt aleatorio.
 * Retorna formato: "pbkdf2:{salt_hex}:{key_hex}"
 */
export async function crearHashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(pin),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    KEY_LENGTH * 8
  );

  const keyArray = Array.from(new Uint8Array(derivedBits));
  const keyHex = keyArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  const saltHex = Array.from(salt).map((b) => b.toString(16).padStart(2, "0")).join("");

  return `pbkdf2:${saltHex}:${keyHex}`;
}

/**
 * Verifica un PIN contra un hash (PBKDF2 o legacy SHA-256).
 * Si el hash es legacy (sin formato pbkdf2), verifica con SHA-256 y retorna
 * `{ valido, necesitaMigracion: true }` para que el caller re-hashee.
 */
export async function verificarPin(
  pin: string,
  hash: string
): Promise<{ valido: boolean; necesitaMigracion?: boolean }> {
  if (hash.startsWith("pbkdf2:")) {
    const [, saltHex, keyHex] = hash.split(":");
    if (!saltHex || !keyHex) return { valido: false };

    const encoder = new TextEncoder();
    const salt = new Uint8Array(saltHex.match(/.{2}/g)!.map((b) => parseInt(b, 16)));
    const storedKey = new Uint8Array(keyHex.match(/.{2}/g)!.map((b) => parseInt(b, 16)));

    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      encoder.encode(pin),
      "PBKDF2",
      false,
      ["deriveBits"]
    );

    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        salt,
        iterations: PBKDF2_ITERATIONS,
        hash: "SHA-256",
      },
      keyMaterial,
      KEY_LENGTH * 8
    );

    const derivedKey = new Uint8Array(derivedBits);
    let match = false;
    if (derivedKey.length === storedKey.length) {
      try {
        const { timingSafeEqual } = await import("crypto");
        match = timingSafeEqual(Buffer.from(derivedKey), Buffer.from(storedKey));
      } catch {
        match = derivedKey.every((b, i) => b === storedKey[i]);
      }
    }

    return { valido: match };
  }

  // Legacy SHA-256 sin salt (solo para migración)
  return legacyVerificarPin(pin, hash);
}

/**
 * Legacy: verifica con SHA-256 sin salt (Web Crypto API).
 */
async function legacyVerificarPin(pin: string, hash: string): Promise<{ valido: boolean; necesitaMigracion: boolean }> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const pinHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  const match = pinHash === hash;
  return { valido: match, necesitaMigracion: match };
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

