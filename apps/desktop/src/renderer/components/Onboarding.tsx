import { useState } from "react";
import { ChevronRight, ChevronLeft, Check, ShoppingCart, Package, DollarSign, HelpCircle } from "lucide-react";

const ONBOARDING_KEY = "sweetbakery_onboarding_completado";

export function shouldShowOnboarding(): boolean {
  try {
    return localStorage.getItem(ONBOARDING_KEY) !== "true";
  } catch {
    return false;
  }
}

export function completeOnboarding(): void {
  try {
    localStorage.setItem(ONBOARDING_KEY, "true");
  } catch {
    // localStorage no disponible
  }
}

interface Paso {
  icono: React.ReactNode;
  titulo: string;
  descripcion: string;
}

const pasos: Paso[] = [
  {
    icono: <ShoppingCart className="w-12 h-12 text-secondary" />,
    titulo: "Bienvenido a Sweet Bakery",
    descripcion: "Tu sistema de punto de venta para pastelería artesanal. Vamos a mostrarte cómo funciona.",
  },
  {
    icono: <Package className="w-12 h-12 text-secondary" />,
    titulo: "Tu PIN de acceso",
    descripcion: "Usa tu PIN de 6 dígitos para entrar al sistema. Si no lo sabes, pregunta al propietario.",
  },
  {
    icono: <DollarSign className="w-12 h-12 text-secondary" />,
    titulo: "Abrir caja primero",
    descripcion: "Antes de vender, abre la caja del día con el monto inicial de efectivo. Esto es obligatorio.",
  },
  {
    icono: <ShoppingCart className="w-12 h-12 text-secondary" />,
    titulo: "Realizar ventas",
    descripcion: "Selecciona los productos, ingresa la cantidad y cobra al cliente. El stock se descuenta automáticamente.",
  },
  {
    icono: <HelpCircle className="w-12 h-12 text-secondary" />,
    titulo: "¿Necesitas ayuda?",
    descripcion: "Consulta la sección de Ayuda en el menú lateral para ver guías detalladas de cada función.",
  },
];

export default function Onboarding({ onComplete }: { onComplete: () => void }) {
  const [pasoActual, setPasoActual] = useState(0);
  const totalPasos = pasos.length;
  const paso = pasos[pasoActual];

  const handleSiguiente = () => {
    if (pasoActual < totalPasos - 1) {
      setPasoActual(pasoActual + 1);
    } else {
      completeOnboarding();
      onComplete();
    }
  };

  const handleAnterior = () => {
    if (pasoActual > 0) {
      setPasoActual(pasoActual - 1);
    }
  };

  const handleSaltar = () => {
    completeOnboarding();
    onComplete();
  };

  return (
    <div className="fixed inset-0 bg-surface z-50 flex items-center justify-center p-4">
      <div className="bg-surface-container-lowest rounded-3xl shadow-xl p-10 w-full max-w-lg text-center">
        {/* Icono */}
        <div className="flex justify-center mb-6">
          {paso.icono}
        </div>

        {/* Título */}
        <h1 className="text-2xl font-bold text-on-surface mb-3">{paso.titulo}</h1>

        {/* Descripción */}
        <p className="text-on-surface-variant mb-8">{paso.descripcion}</p>

        {/* Indicador de pasos */}
        <div className="flex justify-center gap-2 mb-8">
          {pasos.map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-all ${
                i === pasoActual ? "bg-secondary w-6" : "bg-outline-variant"
              }`}
            />
          ))}
        </div>

        {/* Botones */}
        <div className="flex gap-3">
          {pasoActual > 0 ? (
            <button
              onClick={handleAnterior}
              className="flex-1 py-3 border border-outline-variant text-on-surface-variant rounded-xl hover:bg-surface-container transition-colors flex items-center justify-center gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Anterior
            </button>
          ) : (
            <button
              onClick={handleSaltar}
              className="flex-1 py-3 border border-outline-variant text-on-surface-variant rounded-xl hover:bg-surface-container transition-colors"
            >
              Saltar
            </button>
          )}

          <button
            onClick={handleSiguiente}
            className="flex-1 py-3 bg-secondary text-on-secondary rounded-xl hover:bg-secondary/90 transition-colors flex items-center justify-center gap-2"
          >
            {pasoActual === totalPasos - 1 ? (
              <>
                <Check className="w-4 h-4" />
                ¡Listo!
              </>
            ) : (
              <>
                Siguiente
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
