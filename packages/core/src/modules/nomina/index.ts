/**
 * Módulo: Nómina (AGENT.md sección 2.4)
 *
 * Adelantos de sueldo (movimiento de dinero) y multas (descuento contable).
 * El adelanto toca la caja; la multa solo afecta la nómina.
 */

import {
  PosDatabase,
  adelantosSueldo,
  multasEmpleado,
  empleados,
  usuarios,
  eq,
  and,
  sql,
} from "@pos/db";
import {
  CrearEmpleadoSchema,
  IdSchema,
  MesSchema,
  RegistrarAdelantoSueldoInput,
  RegistrarAdelantoSueldoSchema,
  RegistrarMultaInput,
  RegistrarMultaSchema,
} from "@pos/shared";

export function crearServicioNomina(db: PosDatabase) {
  return {
    /**
     * Registra un adelanto de sueldo (movimiento de dinero real).
     */
    async registrarAdelanto(datos: RegistrarAdelantoSueldoInput) {
      const validados = RegistrarAdelantoSueldoSchema.parse(datos);

      // Verificar que el empleado exista
      const empleado = await db
        .select()
        .from(empleados)
        .where(eq(empleados.id, validados.empleadoId))
        .limit(1);

      if (empleado.length === 0) {
        throw new Error("Empleado no encontrado");
      }

      // Verificar que el empleado esté activo
      if (!empleado[0]?.activo) {
        throw new Error("El empleado no está activo");
      }

      const resultado = await db
        .insert(adelantosSueldo)
        .values({
          empleadoId: validados.empleadoId,
          sesionCajaId: validados.sesionCajaId,
          fecha: validados.fecha,
          monto: validados.monto,
          metodoPago: validados.metodoPago,
          mesADescontar: validados.mesADescontar,
          descripcion: validados.descripcion ?? null,
          registradoPor: validados.registradoPor,
        })
        .returning();

      return resultado[0];
    },

    /**
     * Registra una multa (descuento contable, no toca caja).
     */
    async registrarMulta(datos: RegistrarMultaInput) {
      const validados = RegistrarMultaSchema.parse(datos);

      // Verificar que el empleado exista
      const empleado = await db
        .select()
        .from(empleados)
        .where(eq(empleados.id, validados.empleadoId))
        .limit(1);

      if (empleado.length === 0) {
        throw new Error("Empleado no encontrado");
      }

      const resultado = await db
        .insert(multasEmpleado)
        .values({
          empleadoId: validados.empleadoId,
          fecha: validados.fecha,
          monto: validados.monto,
          motivo: validados.motivo,
          mesADescontar: validados.mesADescontar,
          registradoPor: validados.registradoPor,
        })
        .returning();

      return resultado[0];
    },

    /**
     * Lista adelantos de un empleado.
     */
    async listarAdelantosPorEmpleado(empleadoId: number) {
      IdSchema.parse(empleadoId);
      return db
        .select()
        .from(adelantosSueldo)
        .where(eq(adelantosSueldo.empleadoId, empleadoId));
    },

    /**
     * Lista adelantos registrados en una sesión de caja.
     */
    async listarAdelantosPorSesion(sesionCajaId: number) {
      IdSchema.parse(sesionCajaId);
      return db
        .select()
        .from(adelantosSueldo)
        .where(eq(adelantosSueldo.sesionCajaId, sesionCajaId));
    },

    /**
     * Lista multas de un empleado.
     */
    async listarMultasPorEmpleado(empleadoId: number) {
      IdSchema.parse(empleadoId);
      return db
        .select()
        .from(multasEmpleado)
        .where(eq(multasEmpleado.empleadoId, empleadoId));
    },

    /**
     * Calcula el total de descuentos de un empleado en un mes.
     */
    async calcularDescuentosMes(
      empleadoId: number,
      mes: string
    ): Promise<{ salario: number; adelantosMes: number; multasMes: number; totalDescuentos: number; neto: number }> {
      IdSchema.parse(empleadoId);
      MesSchema.parse(mes);

      const empleado = await db
        .select({ salarioMensual: empleados.salarioMensual })
        .from(empleados)
        .where(eq(empleados.id, empleadoId))
        .limit(1);

      const salario = empleado[0]?.salarioMensual ?? 0;

      const adelantos = await db
        .select({ total: sql<number>`coalesce(sum(${adelantosSueldo.monto}), 0)` })
        .from(adelantosSueldo)
        .where(
          and(
            eq(adelantosSueldo.empleadoId, empleadoId),
            eq(adelantosSueldo.mesADescontar, mes)
          )
        );

      const multas = await db
        .select({ total: sql<number>`coalesce(sum(${multasEmpleado.monto}), 0)` })
        .from(multasEmpleado)
        .where(
          and(
            eq(multasEmpleado.empleadoId, empleadoId),
            eq(multasEmpleado.mesADescontar, mes)
          )
        );

      const adelantosMes = adelantos[0]?.total ?? 0;
      const multasMes = multas[0]?.total ?? 0;
      const totalDescuentos = adelantosMes + multasMes;

      return {
        salario,
        adelantosMes,
        multasMes,
        totalDescuentos,
        neto: salario - totalDescuentos,
      };
    },

    /**
     * Lista empleados activos.
     */
    async listarEmpleadosActivos() {
      return db
        .select()
        .from(empleados)
        .where(eq(empleados.activo, true));
    },

    /**
     * Crea un nuevo empleado.
     */
    async crearEmpleado(datos: { nombre: string; cargo: string; salarioMensual: number; usuarioId?: number }) {
      const validados = CrearEmpleadoSchema.parse(datos);

      if (validados.usuarioId) {
        const existeUsuario = await db.select({ id: usuarios.id }).from(usuarios).where(eq(usuarios.id, validados.usuarioId!)).limit(1);
        if (existeUsuario.length === 0) throw new Error("Usuario no encontrado");
      }

      const resultado = await db
        .insert(empleados)
        .values({
          nombre: validados.nombre,
          cargo: validados.cargo,
          salarioMensual: validados.salarioMensual,
          usuarioId: validados.usuarioId ?? null,
        })
        .returning();
      return resultado[0];
    },
  };
}
