/**
 * Módulo: Usuarios (AGENT.md sección 1.1)
 *
 * CRUD de usuarios con control de acceso por rol.
 */

import { PosDatabase, usuarios, auditLog, eq, and, count, sql } from "@pos/db";
import { CrearUsuarioInput, CrearUsuarioSchema, CambiarPinSchema, ActualizarUsuarioSchema, IdSchema } from "@pos/shared";
import { crearHashPin } from "@pos/shared";

/** Actor autenticado que ejecuta la operación (para control de acceso). */
export interface ActorUsuario {
  id: number;
  rol: string;
}

export function crearServicioUsuarios(db: PosDatabase) {
  /**
   * Denegación de gestión sobre la cuenta del propietario.
   * Regla: el cajero gestiona usuarios, salvo la cuenta del propietario.
   */
  function denegarGestionPropietario(actor: ActorUsuario, operacion: string) {
    try {
      db.insert(auditLog).values({
        evento: "permiso_denegado",
        usuarioId: actor.id,
        detalle: JSON.stringify({ operacion, motivo: "gestion_propietario_restringida" }),
        origen: "core",
      });
    } catch { /* audit logging es best-effort */ }
    throw new Error("El cajero no puede gestionar la cuenta del propietario");
  }

  function esCajero(actor: ActorUsuario) {
    return actor.rol === "cajero";
  }

  return {
    /**
     * Lista todos los usuarios activos.
     */
    async listar() {
      return db
        .select({
          id: usuarios.id,
          nombre: usuarios.nombre,
          rol: usuarios.rol,
          activo: usuarios.activo,
          actualizadoEn: usuarios.actualizadoEn,
        })
        .from(usuarios)
        .where(eq(usuarios.activo, true));
    },

    /**
     * Obtiene un usuario por ID (sin pinHash por seguridad).
     */
    async obtenerPorId(id: number) {
      IdSchema.parse(id);
      const resultado = await db
        .select({
          id: usuarios.id,
          nombre: usuarios.nombre,
          rol: usuarios.rol,
          activo: usuarios.activo,
          actualizadoEn: usuarios.actualizadoEn,
        })
        .from(usuarios)
        .where(eq(usuarios.id, id))
        .limit(1);

      return resultado[0] ?? null;
    },

    /**
     * Crea un nuevo usuario (retorna sin pinHash).
     */
    async crear(datos: CrearUsuarioInput, actor: ActorUsuario) {
      const validados = CrearUsuarioSchema.parse(datos);
      if (esCajero(actor) && validados.rol === "propietario") {
        denegarGestionPropietario(actor, "crear_propietario");
      }
      const pinHash = await crearHashPin(validados.pin);

      const existente = await db.select({ id: usuarios.id }).from(usuarios).where(eq(usuarios.nombre, validados.nombre)).limit(1);
      if (existente.length > 0) throw new Error("Ya existe un usuario con ese nombre");

      const resultado = await db
        .insert(usuarios)
        .values({
          nombre: validados.nombre,
          rol: validados.rol,
          pinHash,
        })
        .returning({ id: usuarios.id, nombre: usuarios.nombre, rol: usuarios.rol, activo: usuarios.activo });

      return resultado[0];
    },

    /**
     * Actualiza un usuario existente (retorna sin pinHash).
     */
    async actualizar(
      id: number,
      datos: Partial<Pick<CrearUsuarioInput, "nombre" | "rol">>,
      actor: ActorUsuario
    ) {
      IdSchema.parse(id);
      if (esCajero(actor)) {
        if (datos.rol === "propietario") {
          denegarGestionPropietario(actor, "ascender_a_propietario");
        }
        const objetivo = await this.obtenerPorId(id);
        if (objetivo?.rol === "propietario") {
          denegarGestionPropietario(actor, "actualizar_propietario");
        }
      }
      const validados = ActualizarUsuarioSchema.parse(datos);
      const resultado = await db
        .update(usuarios)
        .set({
          ...validados,
          actualizadoEn: new Date().toISOString(),
        })
        .where(eq(usuarios.id, id))
        .returning({ id: usuarios.id, nombre: usuarios.nombre, rol: usuarios.rol, activo: usuarios.activo });

      return resultado[0] ?? null;
    },

    /**
     * Desactiva un usuario (soft delete).
     * No permite desactivar el último usuario admin/cajero activo.
     */
    async desactivar(id: number, actor: ActorUsuario) {
      IdSchema.parse(id);
      const usuario = await this.obtenerPorId(id);
      if (!usuario) return;

      if (esCajero(actor) && usuario.rol === "propietario") {
        denegarGestionPropietario(actor, "desactivar_propietario");
      }

      const esAdmin = usuario.rol === "propietario" || usuario.rol === "cajero";
      if (esAdmin) {
        const resultado = await db
          .select({ total: count() })
          .from(usuarios)
          .where(
            and(
              eq(usuarios.activo, true),
              sql`${usuarios.rol} IN ('propietario', 'cajero')`
            )
          );

        if ((resultado[0]?.total ?? 0) <= 1) {
          throw new Error("No se puede desactivar el último usuario admin/cajero");
        }
      }

      await db
        .update(usuarios)
        .set({ activo: false })
        .where(eq(usuarios.id, id));
    },

    /**
     * Cambia el PIN de un usuario y limpia la bandera debeCambiarPin.
     */
    async cambiarPin(id: number, nuevoPin: string, actor: ActorUsuario) {
      CambiarPinSchema.parse({ nuevoPin, confirmarPin: nuevoPin });
      const existe = await db
        .select({ id: usuarios.id, rol: usuarios.rol })
        .from(usuarios)
        .where(eq(usuarios.id, id))
        .limit(1);
      const [usuario] = existe;
      if (!usuario) {
        throw new Error("Usuario no encontrado");
      }
      if (esCajero(actor) && usuario.rol === "propietario") {
        denegarGestionPropietario(actor, "cambiar_pin_propietario");
      }
      const pinHash = await crearHashPin(nuevoPin);
      await db
        .update(usuarios)
        .set({ pinHash, debeCambiarPin: false })
        .where(eq(usuarios.id, id));

      try {
        await db.insert(auditLog).values({
          evento: "pin_cambiado",
          usuarioId: id,
          detalle: JSON.stringify({ metodo: "cambiarPin" }),
          origen: "core",
        });
      } catch { /* best-effort */ }
    },
  };
}
