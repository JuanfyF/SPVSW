import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/auth";

export default function LoginMovil() {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setUsuario, setSesionCaja } = useAuthStore();

  const handleSubmit = async (pinToSubmit?: string) => {
    setError("");
    setLoading(true);

    try {
      const resultado = await window.pos.auth.login(pinToSubmit ?? pin);
      const { usuario, sesionAbierta } = resultado;
      if (usuario) {
        setUsuario(usuario);
        // Si hay sesión de caja abierta, cargarla
        if (sesionAbierta) {
          setSesionCaja(sesionAbierta);
        }
        navigate("/movil");
      } else {
        setError("PIN incorrecto");
      }
    } catch (err) {
      setError("Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (value: string) => {
    if (pin.length < 6) {
      const newPin = pin + value;
      setPin(newPin);
      if (newPin.length === 6) {
        handleSubmit(newPin);
      }
    }
  };

  const handleDelete = () => {
    setPin(pin.slice(0, -1));
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div className="bg-surface-container-lowest rounded-3xl shadow-xl p-8 w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <img
            src="/logo-sweet-bakery.jpg"
            alt="Sweet Bakery"
            className="w-20 h-20 rounded-full object-cover mx-auto mb-4 shadow-lg"
          />
          <h1 className="text-2xl font-bold text-primary">Pastelera</h1>
          <p className="text-on-surface-variant mt-2">Ingresa tu PIN para acceder</p>
        </div>

        {/* PIN Display */}
        <div className="flex justify-center gap-3 mb-8">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all ${
                i < pin.length
                  ? "bg-secondary border-secondary shadow-md"
                  : "border-outline-variant"
              }`}
            >
              {i < pin.length && (
                <div className="w-3 h-3 bg-on-secondary rounded-full" />
              )}
            </div>
          ))}
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 bg-error-container text-on-error-container rounded-xl text-center text-sm">
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
              className="h-14 text-xl font-semibold text-on-surface bg-surface-container hover:bg-surface-container-high rounded-xl transition-colors disabled:opacity-50"
            >
              {num}
            </button>
          ))}
          <button
            onClick={handleDelete}
            disabled={loading}
            className="h-14 text-lg text-on-surface-variant hover:text-on-surface disabled:opacity-50"
          >
            ←
          </button>
          <button
            onClick={() => handleKeyPress("0")}
            disabled={loading}
            className="h-14 text-xl font-semibold text-on-surface bg-surface-container hover:bg-surface-container-high rounded-xl transition-colors disabled:opacity-50"
          >
            0
          </button>
          <div />
        </div>

        {loading && (
          <div className="mt-4 text-center text-on-surface-variant text-sm">
            Verificando...
          </div>
        )}
      </div>
    </div>
  );
}
