interface ConfirmModalProps {
  open: boolean;
  titulo: string;
  mensaje: string;
  textoConfirmar?: string;
  textoCancelar?: string;
  variante?: "peligro" | "advertencia" | "info";
  onConfirmar: () => void;
  onCancelar: () => void;
  cargando?: boolean;
}

export default function ConfirmModal({
  open,
  titulo,
  mensaje,
  textoConfirmar = "Confirmar",
  textoCancelar = "Cancelar",
  variante = "peligro",
  onConfirmar,
  onCancelar,
  cargando = false,
}: ConfirmModalProps) {
  if (!open) return null;

  const colores = {
    peligro: {
      boton: "bg-error text-on-error hover:bg-error/90",
      icono: "⚠️",
    },
    advertencia: {
      boton: "bg-tertiary text-on-tertiary hover:bg-tertiary/90",
      icono: "⚡",
    },
    info: {
      boton: "bg-secondary text-on-secondary hover:bg-secondary/90",
      icono: "ℹ️",
    },
  };

  const color = colores[variante];

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget && !cargando) onCancelar();
      }}
    >
      <div className="bg-surface-container-lowest rounded-2xl p-6 w-full max-w-sm shadow-xl">
        <div className="text-center mb-4">
          <span className="text-3xl">{color.icono}</span>
        </div>
        <h2 className="text-xl font-bold text-on-surface text-center mb-2">
          {titulo}
        </h2>
        <p className="text-on-surface-variant text-center text-sm mb-6 whitespace-pre-line">
          {mensaje}
        </p>
        <div className="flex gap-4">
          <button
            onClick={onCancelar}
            disabled={cargando}
            className="flex-1 py-3 border border-outline-variant text-on-surface-variant rounded-xl hover:bg-surface-container-high transition-colors disabled:opacity-50"
          >
            {textoCancelar}
          </button>
          <button
            onClick={onConfirmar}
            disabled={cargando}
            className={`flex-1 py-3 rounded-xl transition-colors disabled:opacity-50 ${color.boton}`}
          >
            {cargando ? "Procesando..." : textoConfirmar}
          </button>
        </div>
      </div>
    </div>
  );
}
