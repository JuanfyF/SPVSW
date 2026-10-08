import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Store, Smartphone, Check, Copy, ChevronRight, ChevronLeft } from "lucide-react";
import { completeOnboarding } from "./Onboarding";
import { useConfigStore } from "../store/config";

interface Props {
  onComplete: () => void;
}

type Paso = 0 | 1 | 2;

/**
 * Asistente de primera instalación (solo propietario, nombre vacío).
 * Paso 1: nombre del negocio · Paso 2: celular de pasteleras (URL + QR) · Paso 3: listo.
 */
export default function ConfiguracionInicial({ onComplete }: Props) {
  const [paso, setPaso] = useState<Paso>(0);
  const [nombre, setNombre] = useState("");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const { red, guardar } = useConfigStore();

  const handleGuardarNombre = async () => {
    const limpio = nombre.trim();
    if (!limpio) {
      setError("El nombre del negocio es requerido");
      return;
    }
    if (limpio.length > 100) {
      setError("El nombre no puede tener más de 100 caracteres");
      return;
    }
    setGuardando(true);
    setError("");
    try {
      await guardar(limpio);
      setPaso(1);
    } catch (err: any) {
      setError(err?.message || "Error al guardar. Intente de nuevo.");
    } finally {
      setGuardando(false);
    }
  };

  const handleCopiar = async () => {
    if (!red?.urlMovil) return;
    try {
      await navigator.clipboard.writeText(red.urlMovil);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Clipboard no disponible
    }
  };

  const handleFinalizar = () => {
    // El tutorial de 5 pasos queda disponible en Ayuda
    completeOnboarding();
    onComplete();
  };

  return (
    <div className="fixed inset-0 bg-surface z-50 flex items-center justify-center p-4">
      <div className="bg-surface-container-lowest rounded-3xl shadow-xl p-10 w-full max-w-lg">
        {/* Indicador de pasos */}
        <div className="flex justify-center gap-2 mb-8">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all ${
                i === paso ? "bg-secondary w-6" : "bg-outline-variant w-2"
              }`}
            />
          ))}
        </div>

        {paso === 0 && (
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <Store className="w-12 h-12 text-secondary" />
            </div>
            <h1 className="text-2xl font-bold text-on-surface mb-3">
              ¡Bienvenido! Configure su pastelería
            </h1>
            <p className="text-on-surface-variant mb-8">
              Este nombre se usará en los comprobantes, reportes y encabezados del sistema.
            </p>
            <input
              type="text"
              value={nombre}
              onChange={(e) => {
                setNombre(e.target.value);
                setError("");
              }}
              onKeyDown={(e) => e.key === "Enter" && handleGuardarNombre()}
              placeholder="Ej: Dulce Tentación"
              maxLength={100}
              autoFocus
              className="w-full px-4 py-3 border border-outline-variant rounded-xl focus:outline-none focus:border-secondary bg-surface text-center text-lg mb-2"
            />
            {error && <p className="text-error text-sm mb-4">{error}</p>}
            <button
              onClick={handleGuardarNombre}
              disabled={guardando}
              className="w-full mt-4 py-3 bg-secondary text-on-secondary rounded-xl hover:bg-secondary/90 transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {guardando ? "Guardando..." : "Continuar"}
              {!guardando && <ChevronRight className="w-4 h-4" />}
            </button>
          </div>
        )}

        {paso === 1 && (
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <Smartphone className="w-12 h-12 text-secondary" />
            </div>
            <h1 className="text-2xl font-bold text-on-surface mb-3">
              Celular de pasteleras
            </h1>
            <p className="text-on-surface-variant mb-6">
              Las pasteleras acceden desde el navegador de su celular (misma WiFi que esta
              computadora) a:
            </p>

            {red?.urlMovil ? (
              <>
                <div className="bg-surface-container rounded-2xl p-4 mb-4">
                  <p className="font-mono text-sm text-on-surface break-all mb-4">
                    {red.urlMovil}
                  </p>
                  <div className="flex justify-center mb-3">
                    <div className="bg-white p-3 rounded-xl">
                      <QRCodeSVG value={red.urlMovil} size={148} />
                    </div>
                  </div>
                  <p className="text-caption text-on-surface-variant">
                    O escanee el código QR con la cámara del celular
                  </p>
                </div>
                <button
                  onClick={handleCopiar}
                  className="inline-flex items-center gap-2 px-4 py-2 border border-outline-variant text-on-surface-variant rounded-xl hover:bg-surface-container transition-colors"
                >
                  {copiado ? <Check className="w-4 h-4 text-tertiary" /> : <Copy className="w-4 h-4" />}
                  {copiado ? "Copiado" : "Copiar enlace"}
                </button>
              </>
            ) : (
              <p className="text-on-surface-variant bg-surface-container rounded-2xl p-4">
                No se pudo detectar la dirección de red. Verifique la conexión WiFi y
                consulte esta sección después en Ayuda → Celular de pasteleras.
              </p>
            )}

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setPaso(0)}
                className="flex-1 py-3 border border-outline-variant text-on-surface-variant rounded-xl hover:bg-surface-container transition-colors flex items-center justify-center gap-2"
              >
                <ChevronLeft className="w-4 h-4" />
                Anterior
              </button>
              <button
                onClick={() => setPaso(2)}
                className="flex-1 py-3 bg-secondary text-on-secondary rounded-xl hover:bg-secondary/90 transition-colors font-medium flex items-center justify-center gap-2"
              >
                Continuar
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {paso === 2 && (
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 rounded-full bg-tertiary-fixed text-on-tertiary-container flex items-center justify-center">
                <Check className="w-8 h-8" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-on-surface mb-3">¡Listo!</h1>
            <p className="text-on-surface-variant mb-2">
              Su sistema <strong>{nombre.trim()}</strong> está configurado.
            </p>
            <p className="text-caption text-on-surface-variant mb-8">
              El tutorial de uso (caja, ventas) está siempre disponible en la sección
              Ayuda del menú.
            </p>
            <button
              onClick={handleFinalizar}
              className="w-full py-3 bg-secondary text-on-secondary rounded-xl hover:bg-secondary/90 transition-colors font-medium"
            >
              Entrar al sistema
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
