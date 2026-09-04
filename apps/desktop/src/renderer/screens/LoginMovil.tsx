import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/auth";
import { KeyRound, Copy, Check } from "lucide-react";

export default function LoginMovil() {
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

  const handleSubmit = async (pinToSubmit?: string) => {
    setError("");
    setLoading(true);

    try {
      const resultado = await window.pos.auth.login(pinToSubmit ?? pin, "pastelera");
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
          navigate("/movil");
        }
      } else {
        setError("PIN incorrecto o expirado");
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

  const abrirRecuperacion = async () => {
    setModalRecuperacion(true);
    setPinTemporal(null);
    setErrorReset("");
    setCopiado(false);
    try {
      const lista = await window.pos.usuarios.listar();
      setUsuarios(lista.filter((u) => u.rol === "pastelera"));
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
      <div className="bg-surface-container-lowest rounded-3xl shadow-xl p-8 w-full max-w-sm max-h-[90vh] overflow-y-auto">
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

        <button
          onClick={abrirRecuperacion}
          className="mt-4 w-full py-2 text-sm text-secondary hover:text-secondary/80 transition-colors flex items-center justify-center gap-2"
        >
          <KeyRound className="w-4 h-4" />
          ¿Olvidaste tu PIN?
        </button>
      </div>

      {/* Modal de recuperación de PIN */}
      {modalRecuperacion && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={cerrarRecuperacion}>
          <div className="bg-surface-container-lowest rounded-2xl shadow-xl p-6 w-full max-w-sm max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-on-surface mb-4">Recuperar PIN</h2>

            {!pinTemporal ? (
              <>
                <p className="text-on-surface-variant text-sm mb-4">
                  Selecciona tu nombre para generar un PIN temporal.
                </p>

                <select
                  value={usuarioSeleccionado ?? ""}
                  onChange={(e) => setUsuarioSeleccionado(Number(e.target.value) || null)}
                  className="w-full p-3 border border-outline-variant rounded-xl bg-surface text-on-surface text-sm mb-4"
                >
                  <option value="">Seleccionar nombre...</option>
                  {usuarios.map((u) => (
                    <option key={u.id} value={u.id}>{u.nombre}</option>
                  ))}
                </select>

                {errorReset && (
                  <div className="mb-4 p-3 bg-error-container text-on-error-container rounded-xl text-center text-sm">
                    {errorReset}
                  </div>
                )}

                <div className="flex gap-3 mt-4">
                  <button
                    onClick={cerrarRecuperacion}
                    className="flex-1 py-3 border border-outline-variant text-on-surface-variant rounded-xl text-sm"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleRestablecerPin}
                    disabled={!usuarioSeleccionado || cargandoReset}
                    className="flex-1 py-3 bg-secondary text-on-secondary rounded-xl text-sm disabled:opacity-50"
                  >
                    {cargandoReset ? "Generando..." : "Restablecer"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-on-surface-variant text-sm mb-2">
                  Tu PIN temporal es:
                </p>

                <div className="flex items-center justify-center gap-3 mb-4">
                  <div className="text-2xl font-mono font-bold text-primary tracking-widest">
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

                <p className="text-on-surface-variant text-xs text-center mb-1">
                  Usa este PIN para iniciar sesión. Cámbialo después.
                </p>
                <p className="text-on-surface-variant/60 text-xs text-center mb-4">
                  Expira: {expiracion ? new Date(expiracion).toLocaleString("es-EC") : ""}
                </p>

                <button
                  onClick={cerrarRecuperacion}
                  className="w-full py-3 bg-secondary text-on-secondary rounded-xl text-sm"
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
