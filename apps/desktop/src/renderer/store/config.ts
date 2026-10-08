import { create } from "zustand";
import { setNombreNegocioPdf } from "@pos/shared";

const MARCA_FALLBACK = "Sweet Bakery";

interface RedLocal {
  ipLocal: string | null;
  urlMovil: string | null;
}

interface ConfigState {
  /** Nombre del negocio; vacío si el wizard de primera instalación no corrió. */
  nombreNegocio: string;
  cargada: boolean;
  red: RedLocal | null;
  /** Carga la configuración y la red local; propaga el nombre a los PDFs. */
  cargar: () => Promise<void>;
  /** Guarda el nombre (propietario) y actualiza el estado local. */
  guardar: (nombreNegocio: string) => Promise<void>;
}

export const useConfigStore = create<ConfigState>((set) => ({
  nombreNegocio: "",
  cargada: false,
  red: null,

  cargar: async () => {
    try {
      const [config, red] = await Promise.all([
        window.pos.configuracion.obtener(),
        window.pos.sistema.getRedLocal().catch(() => ({ ipLocal: null, urlMovil: null })),
      ]);
      const nombre = config.nombreNegocio || "";
      setNombreNegocioPdf(nombre || MARCA_FALLBACK);
      set({ nombreNegocio: nombre, red, cargada: true });
    } catch {
      // Shim/dev-web u error transitorio: no bloquear la app
      setNombreNegocioPdf(MARCA_FALLBACK);
      set({ cargada: true });
    }
  },

  guardar: async (nombreNegocio: string) => {
    await window.pos.configuracion.guardar({ nombreNegocio });
    setNombreNegocioPdf(nombreNegocio);
    set({ nombreNegocio, cargada: true });
  },
}));

/** Nombre a mostrar en UI: el del negocio o la marca por defecto. */
export function nombreVisible(nombreNegocio: string): string {
  return nombreNegocio.trim() || MARCA_FALLBACK;
}
