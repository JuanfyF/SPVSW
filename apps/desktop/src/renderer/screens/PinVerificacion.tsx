import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/auth";
import { KeyRound } from "lucide-react";

export default function PinVerificacion() {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setUsuario, setSesionCaja } = useAuthStore();

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError("");
    setLoading(true);

    try {
      const resultado = await window.pos.auth.login(pin);
      const { usuario, sesionAbierta } = resultado;
      if (usuario) {
        setUsuario(usuario);
        // Si hay sesión de caja abierta, cargarla
        if (sesionAbierta) {
          setSesionCaja(sesionAbierta);
        }
        navigate(-1); // Volver a la pantalla anterior
      } else {
        setError("PIN incorrecto");
      }
    } catch (err) {
      setError("Error al verificar PIN");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (value: string) => {
    if (pin.length < 6) {
      const newPin = pin + value;
      setPin(newPin);
      if (newPin.length === 6) {
        handleSubmit();
      }
    }
  };

  const handleDelete = () => {
    setPin(pin.slice(0, -1));
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div className="bg-surface-container-lowest rounded-3xl shadow-xl p-8 w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <img
            src="./logo-sweet-bakery.jpg"
            alt="Sweet Bakery"
            className="w-20 h-20 rounded-full object-cover mx-auto mb-4 shadow-lg"
          />
          <h1 className="text-2xl font-bold text-primary">Verificación de PIN</h1>
          <p className="text-on-surface-variant mt-2">Confirma tu identidad para continuar</p>
        </div>

        {/* PIN Display */}
        <div className="flex justify-center gap-3 mb-8">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className={`w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all ${
                i < pin.length
                  ? "bg-secondary border-secondary shadow-md"
                  : "border-outline-variant"
              }`}
            >
              {i < pin.length && (
                <div className="w-4 h-4 bg-on-secondary rounded-full" />
              )}
            </div>
          ))}
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 bg-error-container text-on-error-container rounded-xl text-center">
            {error}
          </div>
        )}

        {/* Numeric keypad */}
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              onClick={() => handleKeyPress(num.toString())}
              disabled={loading}
              className="h-16 text-2xl font-semibold text-on-surface bg-surface-container hover:bg-surface-container-high rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {num}
            </button>
          ))}
          <button
            onClick={handleDelete}
            disabled={loading}
            className="h-16 text-xl text-on-surface-variant hover:text-on-surface disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ←
          </button>
          <button
            onClick={() => handleKeyPress("0")}
            disabled={loading}
            className="h-16 text-2xl font-semibold text-on-surface bg-surface-container hover:bg-surface-container-high rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            0
          </button>
          <div /> {/* Empty space */}
        </div>

        {/* Loading indicator */}
        {loading && (
          <div className="mt-4 text-center text-on-surface-variant">
            Verificando...
          </div>
        )}

        {/* Cancel button */}
        <button
          onClick={() => navigate(-1)}
          className="mt-6 w-full py-3 text-on-surface-variant hover:text-on-surface"
        >
          Cancelar
        </button>

        <button
          onClick={() => navigate("/login")}
          className="mt-2 w-full py-2 text-sm text-secondary hover:text-secondary/80 transition-colors flex items-center justify-center gap-2"
        >
          <KeyRound className="w-4 h-4" />
          ¿Olvidaste tu PIN? Volver al login
        </button>
      </div>
    </div>
  );
}
