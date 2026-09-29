/**
 * Utilidades para limpiar errores IPC de Electron.
 * Electron envuelve errores con:
 *   "Error invoking remote method '<canal>': Error: <mensaje>"
 * El usuario solo debe ver "<mensaje>".
 */

/**
 * Limpia el prefijo que Electron agrega a los errores IPC.
 * Retorna solo el mensaje real para que el usuario vea un texto útil.
 */
export function limpiarErrorIPC(err: unknown, canal: string): Error {
  const msg = err instanceof Error ? err.message : String(err);
  const prefijo = `Error invoking remote method '${canal}': `;
  let limpio = msg.startsWith(prefijo) ? msg.slice(prefijo.length) : msg;
  limpio = limpio.replace(/^Error:\s*/, "");
  return new Error(limpio);
}

/**
 * Limpia el prefijo IPC de un string de error sin importar el canal.
 * Útil para ErrorBoundary u otros contextos donde no se conoce el canal.
 */
export function limpiarMensajeError(msg: string): string {
  const match = msg.match(
    /^Error invoking remote method '[^']+':\s*(?:Error:\s*)?/
  );
  return match ? msg.slice(match[0].length) : msg;
}
