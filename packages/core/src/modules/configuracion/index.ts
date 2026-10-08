/**
 * Módulo: Configuración del negocio
 *
 * Fila única (id = 1) con datos de identidad usados en PDFs, layouts y login.
 * El wizard de primera instalación la llena; si está vacía, la UI usa
 * "Sweet Bakery" como fallback de marca.
 */

import { PosDatabase, configuracion, eq } from "@pos/db";
import { GuardarConfiguracionSchema, GuardarConfiguracionInput } from "@pos/shared";

const FILA_UNICA = 1;

export interface ConfiguracionNegocio {
  nombreNegocio: string;
}

export function crearServicioConfiguracion(db: PosDatabase) {
  return {
    /**
     * Obtiene la configuración del negocio (nombre vacío si nunca se guardó).
     */
    async obtener(): Promise<ConfiguracionNegocio> {
      const filas = await db
        .select()
        .from(configuracion)
        .where(eq(configuracion.id, FILA_UNICA))
        .limit(1);
      return { nombreNegocio: filas[0]?.nombreNegocio ?? "" };
    },

    /**
     * Guarda (inserta o actualiza) la configuración del negocio.
     */
    async guardar(datos: GuardarConfiguracionInput): Promise<ConfiguracionNegocio> {
      const validados = GuardarConfiguracionSchema.parse(datos);
      const existente = await db
        .select({ id: configuracion.id })
        .from(configuracion)
        .where(eq(configuracion.id, FILA_UNICA))
        .limit(1);

      if (existente.length > 0) {
        await db
          .update(configuracion)
          .set({ nombreNegocio: validados.nombreNegocio, actualizadoEn: new Date().toISOString() })
          .where(eq(configuracion.id, FILA_UNICA));
      } else {
        await db
          .insert(configuracion)
          .values({ id: FILA_UNICA, nombreNegocio: validados.nombreNegocio });
      }

      return { nombreNegocio: validados.nombreNegocio };
    },
  };
}
