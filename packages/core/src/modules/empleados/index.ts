/**
 * Módulo: Empleados (AGENT.md sección 1.1)
 *
 * CRUD de empleados con soft delete.
 * Relación 1:1 opcional con usuarios (no todo empleado tiene login).
 */

import { PosDatabase, empleados, eq } from "@pos/db";
import { CrearEmpleadoInput, CrearEmpleadoSchema, ActualizarEmpleadoSchema, IdSchema } from "@pos/shared";

export function crearServicioEmpleados(db: PosDatabase) {
  return {
    /**
     * Lista todos los empleados activos.
     */
    async listar() {
      return db
        .select({
          id: empleados.id,
          usuarioId: empleados.usuarioId,
          nombre: empleados.nombre,
          cargo: empleados.cargo,
          salarioMensual: empleados.salarioMensual,
          activo: empleados.activo,
          actualizadoEn: empleados.actualizadoEn,
        })
        .from(empleados)
        .where(eq(empleados.activo, true));
    },

    /**
     * Obtiene un empleado por ID.
     */
    async obtenerPorId(id: number) {
      IdSchema.parse(id);

      const resultado = await db
        .select()
        .from(empleados)
        .where(eq(empleados.id, id))
        .limit(1);

      return resultado[0] ?? null;
    },

    /**
     * Crea un nuevo empleado.
     */
    async crear(datos: CrearEmpleadoInput) {
      const validados = CrearEmpleadoSchema.parse(datos);

      const resultado = await db
        .insert(empleados)
        .values({
          usuarioId: validados.usuarioId ?? null,
          nombre: validados.nombre,
          cargo: validados.cargo,
          salarioMensual: validados.salarioMensual,
        })
        .returning();

      return resultado[0];
    },

    /**
     * Actualiza un empleado existente.
     */
    async actualizar(
      id: number,
      datos: Partial<Omit<CrearEmpleadoInput, "usuarioId">>
    ) {
      IdSchema.parse(id);
      const validados = ActualizarEmpleadoSchema.parse(datos);

      const resultado = await db
        .update(empleados)
        .set({
          ...validados,
          actualizadoEn: new Date().toISOString(),
        })
        .where(eq(empleados.id, id))
        .returning();

      return resultado[0] ?? null;
    },

    /**
     * Desactiva un empleado (soft delete).
     */
    async desactivar(id: number) {
      IdSchema.parse(id);

      await db
        .update(empleados)
        .set({ activo: false })
        .where(eq(empleados.id, id));
    },

    /**
     * Asocia un empleado con un usuario existente.
     */
    async asociarUsuario(empleadoId: number, usuarioId: number) {
      await db
        .update(empleados)
        .set({ usuarioId })
        .where(eq(empleados.id, empleadoId));
    },
  };
}
