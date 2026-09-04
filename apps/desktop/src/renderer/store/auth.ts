import { create } from "zustand";

interface Usuario {
  id: number;
  nombre: string;
  rol: string;
  debeCambiarPin?: boolean;
}

interface SesionCaja {
  id: number;
  usuarioId: number;
  fecha: string;
  horaApertura: string;
  estado: string;
}

interface AuthState {
  usuario: Usuario | null;
  sesionCaja: SesionCaja | null;
  setUsuario: (usuario: Usuario | null) => void;
  setSesionCaja: (sesion: SesionCaja | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  usuario: null,
  sesionCaja: null,
  setUsuario: (usuario) => set({ usuario }),
  setSesionCaja: (sesion) => set({ sesionCaja: sesion }),
  logout: () => set({ usuario: null, sesionCaja: null }),
}));
