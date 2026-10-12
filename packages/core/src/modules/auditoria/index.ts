/**
 * Módulo: Auditoría (lectura de audit_log)
 *
 * Consulta de la bitácora de seguridad/eventos con filtros por fecha,
 * evento y usuario. Orden cronológico inverso con límite de seguridad.
 * El gate de acceso (solo propietario) vive en el handler IPC.
 */
import {
  PosDatabase,
  auditLog,
  usuarios,
  eq,
  desc,
  and,
  gte,
  lte,
} from "@pos/db";
import { AuditoriaFiltrosSchema } from "@pos/shared";

/** Máximo de filas por consulta — audit_log no tiene retención. */
export const LIMITE_AUDITORIA = 5000;

export interface RegistroAuditoria {
  id: number;
  evento: string;
  detalle: string | null;
  origen: string;
  createdAt: string;
  usuarioId: number | null;
  usuarioNombre: string | null;
  usuarioRol: string | null;
}

export function crearServicioAuditoria(db: PosDatabase) {
  return {
    /**
     * Lista registros de auditoría con filtros opcionales.
     * Fecha como rango inclusivo (YYYY-MM-DD completo).
     */
    async listar(filtros: unknown = {}): Promise<RegistroAuditoria[]> {
      const validados = AuditoriaFiltrosSchema.parse(filtros ?? {});

      const condiciones = [];
      if (validados.fechaInicio) {
        condiciones.push(gte(auditLog.createdAt, validados.fechaInicio));
      }
      if (validados.fechaFin) {
        condiciones.push(lte(auditLog.createdAt, `${validados.fechaFin} 23:59:59`));
      }
      if (validados.evento) {
        condiciones.push(eq(auditLog.evento, validados.evento));
      }
      if (validados.usuarioId) {
        condiciones.push(eq(auditLog.usuarioId, validados.usuarioId));
      }

      return db
        .select({
          id: auditLog.id,
          evento: auditLog.evento,
          detalle: auditLog.detalle,
          origen: auditLog.origen,
          createdAt: auditLog.createdAt,
          usuarioId: auditLog.usuarioId,
          usuarioNombre: usuarios.nombre,
          usuarioRol: usuarios.rol,
        })
        .from(auditLog)
        .leftJoin(usuarios, eq(auditLog.usuarioId, usuarios.id))
        .where(condiciones.length > 0 ? and(...condiciones) : undefined)
        .orderBy(desc(auditLog.createdAt), desc(auditLog.id))
        .limit(LIMITE_AUDITORIA);
    },
  };
}
