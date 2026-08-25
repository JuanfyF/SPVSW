/**
 * Módulo: Usuarios (AGENT.md sección 1.1)
 *
 * CRUD de usuarios con control de acceso por rol.
 */

import { PosDatabase, usuarios, eq, and, count, sql } from "@pos/db";
import { CrearUsuarioInput, CrearUsuarioSchema, CambiarPinSchema, ActualizarUsuarioSchema, IdSchema } from "@pos/shared";
import { crearHashPin } from "@pos/shared";

export function crearServicioUsuarios(db: PosDatabase) {
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
     * Obtiene un usuario por ID.
     */
    async obtenerPorId(id: number) {
      IdSchema.parse(id);
      const resultado = await db
        .select()
        .from(usuarios)
        .where(eq(usuarios.id, id))
        .limit(1);

      return resultado[0] ?? null;
    },

    /**
     * Crea un nuevo usuario.
     */
    async crear(datos: CrearUsuarioInput) {
      const validados = CrearUsuarioSchema.parse(datos);
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
        .returning();

      return resultado[0];
    },

    /**
     * Actualiza un usuario existente.
     */
    async actualizar(
      id: number,
      datos: Partial<Pick<CrearUsuarioInput, "nombre" | "rol">>
    ) {
      IdSchema.parse(id);
      const validados = ActualizarUsuarioSchema.parse(datos);
      const resultado = await db
        .update(usuarios)
        .set({
          ...validados,
          actualizadoEn: new Date().toISOString(),
        })
        .where(eq(usuarios.id, id))
        .returning();

      return resultado[0] ?? null;
    },

    /**
     * Desactiva un usuario (soft delete).
     * No permite desactivar el último usuario admin/cajero activo.
     */
    async desactivar(id: number) {
      IdSchema.parse(id);
      const usuario = await this.obtenerPorId(id);
      if (!usuario) return;

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
     * Cambia el PIN de un usuario.
     */
    async cambiarPin(id: number, nuevoPin: string) {
      CambiarPinSchema.parse({ nuevoPin, confirmarPin: nuevoPin });
      const pinHash = await crearHashPin(nuevoPin);
      await db
        .update(usuarios)
        .set({ pinHash })
        .where(eq(usuarios.id, id));
    },
  };
}
