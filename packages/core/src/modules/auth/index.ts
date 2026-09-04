/**
 * Módulo: Auth (AGENT.md sección 1.1)
 *
 * Autenticación por PIN individual contra hash almacenado.
 * Un solo usuario logueado a la vez en la app de escritorio.
 *
 * SEGURIDAD: PINs se hashean con PBKDF2 + salt (ver @pos/shared/utils).
 * Los hashes legacy SHA-256 se migran automáticamente al primer login exitoso.
 * PINs temporales expiran en 24 horas.
 */

import { PosDatabase, usuarios, pinResetLog, eq, sql } from "@pos/db";
import { crearHashPin, verificarPin } from "@pos/shared";
import { CrearUsuarioInput, CrearUsuarioSchema, LoginSchema } from "@pos/shared";

const PIN_TEMPORAL_EXPIRACION_MS = 24 * 60 * 60 * 1000; // 24 horas
const PIN_TEMPORALDigitos = 6;

function generarPinAleatorio(): string {
  const min = Math.pow(10, PIN_TEMPORALDigitos - 1);
  const max = Math.pow(10, PIN_TEMPORALDigitos) - 1;
  return String(Math.floor(Math.random() * (max - min + 1)) + min);
}

export function crearServicioAuth(db: PosDatabase) {
  return {
    /**
     * Valida PIN contra hash almacenado.
     * Migra automáticamente hashes legacy SHA-256 → PBKDF2 al verificar.
     * Retorna el usuario si es válido, null si no.
     * Si debeCambiarPin=true, retorna forzarCambio=true.
     */
    async login(pin: string) {
      const validados = LoginSchema.parse({ pin });
      const todosUsuarios = await db
        .select()
        .from(usuarios)
        .where(eq(usuarios.activo, true));

      for (const u of todosUsuarios) {
        const resultado = await verificarPin(pin, u.pinHash);
        if (resultado.valido) {
          // Migrar hash legacy SHA-256 → PBKDF2
          if (resultado.necesitaMigracion) {
            const nuevoHash = await crearHashPin(pin);
            await db
              .update(usuarios)
              .set({ pinHash: nuevoHash })
              .where(eq(usuarios.id, u.id));
          }

          // Verificar si el PIN temporal expiró
          if (u.debeCambiarPin) {
            const logActivo = await db
              .select()
              .from(pinResetLog)
              .where(
                sql`${pinResetLog.usuarioId} = ${u.id} AND ${pinResetLog.utilizado} = false`
              )
              .limit(1);

            if (logActivo.length > 0 && logActivo[0]) {
              const expiracion = new Date(logActivo[0].expiracion);
              if (expiracion < new Date()) {
                // PIN temporal expirado — marcar como utilizado
                await db
                  .update(pinResetLog)
                  .set({ utilizado: true })
                  .where(eq(pinResetLog.id, logActivo[0].id));
                return null; // PIN expirado, necesita nuevo reset
              }
            }
          }

          return {
            id: u.id,
            nombre: u.nombre,
            rol: u.rol,
            debeCambiarPin: u.debeCambiarPin,
          };
        }
      }

      return null;
    },

    /**
     * Restablece el PIN de un usuario. Genera un PIN temporal aleatorio,
     * lo almacena en la tabla de auditoría y retorna el PIN en texto plano.
     */
    async restablecerPin(usuarioId: number) {
      const usuario = await db
        .select()
        .from(usuarios)
        .where(eq(usuarios.id, usuarioId))
        .limit(1);

      if (usuario.length === 0) {
        throw new Error("Usuario no encontrado");
      }

      const pinTemporal = generarPinAleatorio();
      const pinTemporalHash = await crearHashPin(pinTemporal);
      const expiracion = new Date(Date.now() + PIN_TEMPORAL_EXPIRACION_MS).toISOString();

      // Registrar en log de auditoría
      await db.insert(pinResetLog).values({
        usuarioId,
        pinTemporalHash,
        expiracion,
        utilizado: false,
      });

      // Actualizar PIN del usuario y marcar que debe cambiarlo
      await db
        .update(usuarios)
        .set({
          pinHash: pinTemporalHash,
          debeCambiarPin: true,
        })
        .where(eq(usuarios.id, usuarioId));

      return {
        pinTemporal,
        expiracion,
        nombre: usuario[0]!.nombre,
      };
    },

    /**
     * Marca un PIN temporal como utilizado después de cambiarlo.
     */
    async marcarPinTemporalUtilizado(usuarioId: number) {
      await db
        .update(pinResetLog)
        .set({ utilizado: true })
        .where(
          sql`${pinResetLog.usuarioId} = ${usuarioId} AND ${pinResetLog.utilizado} = false`
        );
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
