import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/auth";
import { Lock } from "lucide-react";

export default function CambiarPinForzado() {
  const [nuevoPin, setNuevoPin] = useState("");
  const [confirmarPin, setConfirmarPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { usuario, setUsuario } = useAuthStore();

  const handleSubmit = async () => {
    setError("");

    if (nuevoPin.length < 4 || nuevoPin.length > 6) {
      setError("El PIN debe tener entre 4 y 6 dígitos");
      return;
    }

    if (nuevoPin === "123456" || nuevoPin === "000000") {
      setError("Elige un PIN más seguro");
      return;
    }

    if (nuevoPin !== confirmarPin) {
      setError("Los PINs no coinciden");
      return;
    }

    if (!usuario) {
      setError("No hay usuario logueado");
      return;
    }

    setLoading(true);
    try {
      await window.pos.usuarios.cambiarPin(usuario.id, nuevoPin);
      // Actualizar el estado del usuario para limpiar debeCambiarPin
      setUsuario({ ...usuario, debeCambiarPin: false });
      navigate("/");
    } catch (err: any) {
      setError(err?.message || "Error al cambiar PIN");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (value: string) => {
    if (nuevoPin.length < 6) {
      setNuevoPin((prev) => prev + value);
    }
  };

  const handleKeyPressConfirmar = (value: string) => {
    if (confirmarPin.length < 6) {
      setConfirmarPin((prev) => prev + value);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div className="bg-surface-container-lowest rounded-3xl shadow-xl p-10 w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-secondary-container rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-secondary" />
          </div>
          <h1 className="text-2xl font-bold text-on-surface">Cambia tu PIN</h1>
          <p className="text-on-surface-variant mt-2 text-sm">
            Debes establecer un nuevo PIN para continuar.
            <br />
            No uses PINs fáciles de adivinar.
          </p>
        </div>

        {/* Nuevo PIN */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-on-surface mb-2">Nuevo PIN</label>
          <div className="flex justify-center gap-2">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all ${
                  i < nuevoPin.length
                    ? "bg-secondary border-secondary shadow-md"
                    : "border-outline-variant"
                }`}
              >
                {i < nuevoPin.length && (
                  <div className="w-3 h-3 bg-on-secondary rounded-full" />
                )}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2 max-w-[200px] mx-auto mt-3">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <button
                key={num}
                onClick={() => handleKeyPress(num.toString())}
                disabled={loading}
                className="h-10 text-sm font-semibold text-on-surface bg-surface-container hover:bg-surface-container-high rounded-lg transition-colors disabled:opacity-50"
              >
                {num}
              </button>
            ))}
            <button
              onClick={() => setNuevoPin((prev) => prev.slice(0, -1))}
              disabled={loading}
              className="h-10 text-sm text-on-surface-variant"
            >
              ←
            </button>
            <button
              onClick={() => handleKeyPress("0")}
              disabled={loading}
              className="h-10 text-sm font-semibold text-on-surface bg-surface-container hover:bg-surface-container-high rounded-lg transition-colors disabled:opacity-50"
            >
              0
            </button>
            <div />
          </div>
        </div>

        {/* Confirmar PIN */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-on-surface mb-2">Confirmar PIN</label>
          <div className="flex justify-center gap-2">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all ${
                  i < confirmarPin.length
                    ? "bg-tertiary border-tertiary shadow-md"
                    : "border-outline-variant"
                }`}
              >
                {i < confirmarPin.length && (
                  <div className="w-3 h-3 bg-on-tertiary rounded-full" />
                )}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2 max-w-[200px] mx-auto mt-3">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <button
                key={num}
                onClick={() => handleKeyPressConfirmar(num.toString())}
                disabled={loading}
                className="h-10 text-sm font-semibold text-on-surface bg-surface-container hover:bg-surface-container-high rounded-lg transition-colors disabled:opacity-50"
              >
                {num}
              </button>
            ))}
            <button
              onClick={() => setConfirmarPin((prev) => prev.slice(0, -1))}
              disabled={loading}
              className="h-10 text-sm text-on-surface-variant"
            >
              ←
            </button>
            <button
              onClick={() => handleKeyPressConfirmar("0")}
              disabled={loading}
              className="h-10 text-sm font-semibold text-on-surface bg-surface-container hover:bg-surface-container-high rounded-lg transition-colors disabled:opacity-50"
            >
              0
            </button>
            <div />
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 bg-error-container text-on-error-container rounded-xl text-center text-sm">
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={loading || nuevoPin.length < 4 || confirmarPin.length < 4}
          className="w-full py-3 bg-secondary text-on-secondary rounded-xl font-semibold hover:bg-secondary/90 disabled:opacity-50 transition-colors"
        >
          {loading ? "Guardando..." : "Guardar nuevo PIN"}
        </button>
      </div>
    </div>
  );
}
