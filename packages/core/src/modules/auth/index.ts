/**
 * Módulo: Auth (AGENT.md sección 1.1)
 *
 * Autenticación por PIN individual contra hash almacenado.
 * Un solo usuario logueado a la vez en la app de escritorio.
 */

import { PosDatabase, usuarios, eq } from "@pos/db";
import { crearHashPin, verificarPin } from "@pos/shared";
import { CrearUsuarioInput, CrearUsuarioSchema, LoginSchema } from "@pos/shared";

export function crearServicioAuth(db: PosDatabase) {
  return {
    /**
     * Valida PIN contra hash almacenado.
     * Retorna el usuario si es válido, null si no.
     */
    async login(pin: string) {
      const validados = LoginSchema.parse({ pin });
      const todosUsuarios = await db
        .select()
        .from(usuarios)
        .where(eq(usuarios.activo, true));

      for (const u of todosUsuarios) {
        const valido = await verificarPin(pin, u.pinHash);
        if (valido) {
          return {
            id: u.id,
            nombre: u.nombre,
            rol: u.rol,
          };
        }
      }

      return null;
    },

    /**
     * Crea un nuevo usuario con PIN hasheado.
     */
    async crear(datos: CrearUsuarioInput) {
      const validados = CrearUsuarioSchema.parse(datos);
      const pinHash = await crearHashPin(validados.pin);

      const resultado = await db
        .insert(usuarios)
        .values({
          nombre: validados.nombre,
          rol: validados.rol,
          pinHash,
        })
        .returning();

      return resultado[0];
    },

    /**
     * Desactiva un usuario (soft delete).
     */
    async desactivar(usuarioId: number) {
      await db
        .update(usuarios)
        .set({ activo: false })
        .where(eq(usuarios.id, usuarioId));
    },
  };
}
