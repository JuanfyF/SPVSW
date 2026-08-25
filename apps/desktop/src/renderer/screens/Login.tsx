import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/auth";

export default function Login() {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setUsuario, setSesionCaja } = useAuthStore();

  const handleSubmit = useCallback(async (pinToSubmit: string) => {
    setError("");
    setLoading(true);

    try {
      const resultado = await window.pos.auth.login(pinToSubmit);
      const { usuario, sesionAbierta } = resultado;
      if (usuario) {
        setUsuario(usuario);
        // Si hay sesión de caja abierta, cargarla
        if (sesionAbierta) {
          setSesionCaja(sesionAbierta);
        }
        navigate("/");
      } else {
        setError("PIN incorrecto");
        setPin("");
      }
    } catch (err) {
      setError("Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  }, [setUsuario, setSesionCaja, navigate]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (loading) return;

      if (e.key >= "0" && e.key <= "9") {
        setPin((prev) => {
          if (prev.length < 5) return prev + e.key;
          const full = prev + e.key;
          setTimeout(() => handleSubmit(full), 0);
          return full;
        });
      } else if (e.key === "Backspace") {
        setPin((prev) => prev.slice(0, -1));
      } else if (e.key === "Enter" && pin.length === 6) {
        handleSubmit(pin);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [loading, pin, handleSubmit]);

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
      <div className="bg-surface-container-lowest rounded-3xl shadow-xl p-10 w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-8">
          <img
            src="./logo-sweet-bakery.jpg"
            alt="Sweet Bakery"
            className="w-28 h-28 rounded-full object-cover mx-auto mb-4 shadow-lg"
          />
          <h1 className="text-3xl font-bold text-primary">Sweet Bakery</h1>
          <p className="text-on-surface-variant mt-2">Acceso de Escritorio</p>
          <p className="text-on-surface-variant/60 text-sm mt-1">Propietario / Cajero</p>
        </div>

        {/* PIN Display */}
        <div className="flex justify-center gap-3 mb-6">
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

        <p className="text-center text-on-surface-variant/50 text-xs mb-4">
          Usa el teclado numérico o haz clic en los botones
        </p>

        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 bg-error-container text-on-error-container rounded-xl text-center">
            {error}
          </div>
        )}

        {/* Numeric keypad */}
        <div className="grid grid-cols-3 gap-3 max-w-xs mx-auto">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              onClick={() => handleKeyPress(num.toString())}
              disabled={loading}
              className="h-14 text-xl font-semibold text-on-surface bg-surface-container hover:bg-surface-container-high rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {num}
            </button>
          ))}
          <button
            onClick={handleDelete}
            disabled={loading}
            className="h-14 text-lg text-on-surface-variant hover:text-on-surface disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ←
          </button>
          <button
            onClick={() => handleKeyPress("0")}
            disabled={loading}
            className="h-14 text-xl font-semibold text-on-surface bg-surface-container hover:bg-surface-container-high rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            0
          </button>
          <div />
        </div>

        {loading && (
          <div className="mt-4 text-center text-on-surface-variant">
            Verificando...
          </div>
        )}

        <button
          onClick={() => navigate("/movil/login")}
          className="mt-6 w-full py-2 text-sm text-on-surface-variant/60 hover:text-on-surface-variant transition-colors"
        >
          ¿Eres pastelera? Accede aquí
        </button>
      </div>
    </div>
  );
}
