import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/auth";
import { KeyRound, Copy, Check } from "lucide-react";

export default function Login() {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setUsuario, setSesionCaja } = useAuthStore();

  // Estado para recuperación de PIN
  const [modalRecuperacion, setModalRecuperacion] = useState(false);
  const [usuarios, setUsuarios] = useState<Array<{ id: number; nombre: string; rol: string }>>([]);
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState<number | null>(null);
  const [pinTemporal, setPinTemporal] = useState<string | null>(null);
  const [expiracion, setExpiracion] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [cargandoReset, setCargandoReset] = useState(false);
  const [errorReset, setErrorReset] = useState("");

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
        // Si debe cambiar PIN, redirigir a pantalla de cambio forzado
        if (usuario.debeCambiarPin) {
          navigate("/cambiar-pin");
        } else {
          navigate("/");
        }
      } else {
        setError("PIN incorrecto o expirado");
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

  const abrirRecuperacion = async () => {
    setModalRecuperacion(true);
    setPinTemporal(null);
    setErrorReset("");
    setCopiado(false);
    try {
      const lista = await window.pos.usuarios.listar();
      setUsuarios(lista);
    } catch {
      setErrorReset("Error al cargar usuarios");
    }
  };

  const cerrarRecuperacion = () => {
    setModalRecuperacion(false);
    setUsuarioSeleccionado(null);
    setPinTemporal(null);
    setExpiracion(null);
    setCopiado(false);
    setErrorReset("");
  };

  const handleRestablecerPin = async () => {
    if (!usuarioSeleccionado) return;
    setCargandoReset(true);
    setErrorReset("");
    try {
      const resultado = await window.pos.auth.restablecerPin(usuarioSeleccionado);
      setPinTemporal(resultado.pinTemporal);
      setExpiracion(resultado.expiracion);
    } catch (err: any) {
      setErrorReset(err?.message || "Error al restablecer PIN");
    } finally {
      setCargandoReset(false);
    }
  };

  const copiarPin = async () => {
    if (pinTemporal) {
      await navigator.clipboard.writeText(pinTemporal);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div className="bg-surface-container-lowest rounded-3xl shadow-xl p-10 w-full max-w-lg max-h-[90vh] overflow-y-auto">
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

        <button
          onClick={abrirRecuperacion}
          className="mt-2 w-full py-2 text-sm text-secondary hover:text-secondary/80 transition-colors flex items-center justify-center gap-2"
        >
          <KeyRound className="w-4 h-4" />
          ¿Olvidaste tu PIN?
        </button>
      </div>

      {/* Modal de recuperación de PIN */}
      {modalRecuperacion && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={cerrarRecuperacion}>
          <div className="bg-surface-container-lowest rounded-2xl shadow-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-on-surface mb-4">Recuperar PIN</h2>

            {!pinTemporal ? (
              <>
                <p className="text-on-surface-variant text-sm mb-4">
                  Selecciona tu nombre y se generará un PIN temporal nuevo.
                </p>

                <select
                  value={usuarioSeleccionado ?? ""}
                  onChange={(e) => setUsuarioSeleccionado(Number(e.target.value) || null)}
                  className="w-full p-3 border border-outline-variant rounded-xl bg-surface text-on-surface mb-4"
                >
                  <option value="">Seleccionar usuario...</option>
                  {usuarios.map((u) => (
                    <option key={u.id} value={u.id}>{u.nombre} ({u.rol})</option>
                  ))}
                </select>

                {errorReset && (
                  <div className="mb-4 p-3 bg-error-container text-on-error-container rounded-xl text-center text-sm">
                    {errorReset}
                  </div>
                )}

                <div className="flex gap-4 mt-6">
                  <button
                    onClick={cerrarRecuperacion}
                    className="flex-1 py-3 border border-outline-variant text-on-surface-variant rounded-xl hover:bg-surface-container-high transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleRestablecerPin}
                    disabled={!usuarioSeleccionado || cargandoReset}
                    className="flex-1 py-3 bg-secondary text-on-secondary rounded-xl hover:bg-secondary/90 disabled:opacity-50 transition-colors"
                  >
                    {cargandoReset ? "Generando..." : "Restablecer PIN"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-on-surface-variant text-sm mb-2">
                  Tu PIN temporal es:
                </p>

                <div className="flex items-center justify-center gap-3 mb-4">
                  <div className="text-3xl font-mono font-bold text-primary tracking-widest">
                    {pinTemporal}
                  </div>
                  <button
                    onClick={copiarPin}
                    className="p-2 rounded-lg hover:bg-surface-container transition-colors"
                    title="Copiar PIN"
                  >
                    {copiado ? (
                      <Check className="w-5 h-5 text-tertiary" />
                    ) : (
                      <Copy className="w-5 h-5 text-on-surface-variant" />
                    )}
                  </button>
                </div>

                <p className="text-on-surface-variant text-sm text-center mb-1">
                  Usa este PIN para iniciar sesión. Cámbialo inmediatamente después.
                </p>
                <p className="text-on-surface-variant/60 text-xs text-center mb-6">
                  Expira: {expiracion ? new Date(expiracion).toLocaleString("es-EC") : ""}
                </p>

                <button
                  onClick={cerrarRecuperacion}
                  className="w-full py-3 bg-secondary text-on-secondary rounded-xl hover:bg-secondary/90 transition-colors"
                >
                  Cerrar
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
