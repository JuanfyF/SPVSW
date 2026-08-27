import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/auth";

export default function BackupRestore() {
  const navigate = useNavigate();
  const { usuario } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  if (usuario?.rol !== "propietario") {
    return (
      <div className="p-6">
        <p className="text-error">Solo el propietario puede acceder a esta sección.</p>
        <button onClick={() => navigate("/")} className="mt-4 btn-primary">
          Volver
        </button>
      </div>
    );
  }

  const handleBackup = async () => {
    setLoading(true);
    setMensaje("");
    setError("");
    try {
      const fecha = new Date().toISOString().slice(0, 10);
      const rutaDestino = `sweet-bakery-backup-${fecha}.sqlite`;
      const result = await window.pos.sistema.backup(rutaDestino);
      if (result.ok) {
        setMensaje(`Backup creado exitosamente en:\n${result.ruta}`);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al crear backup");
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    setLoading(true);
    setMensaje("");
    setError("");
    try {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".sqlite";
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) {
          setLoading(false);
          return;
        }

        try {
          // En Electron, el File object tiene una propiedad `path` con la ruta real del disco
          const rutaBackup = (file as File & { path: string }).path;
          if (!rutaBackup) {
            setError("No se pudo obtener la ruta del archivo. Usa la versión de escritorio.");
            setLoading(false);
            return;
          }

          const result = await window.pos.sistema.restore(rutaBackup);
          if (result.ok) {
            setMensaje("Base de datos restaurada exitosamente. Reiniciando...");
            setTimeout(() => {
              window.location.reload();
            }, 2000);
          }
        } catch (err: unknown) {
          setError(err instanceof Error ? err.message : "Error al restaurar backup");
          setLoading(false);
        }
      };
      input.click();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al restaurar backup");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate("/")}
          className="text-on-surface-variant hover:text-on-surface"
        >
          ← Volver
        </button>
        <h1 className="text-2xl font-bold text-on-surface">Backup y Restore</h1>
      </div>

      <div className="space-y-6">
        {/* Backup */}
        <div className="bg-surface-container rounded-xl p-6">
          <h2 className="text-lg font-semibold text-on-surface mb-2">
            Crear Backup
          </h2>
          <p className="text-sm text-on-surface-variant mb-4">
            Guarda una copia de seguridad de la base de datos actual.
          </p>
          <button
            onClick={handleBackup}
            disabled={loading}
            className="bg-primary text-on-primary px-6 py-3 rounded-lg font-medium hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Creando backup..." : "Crear Backup"}
          </button>
        </div>

        {/* Restore */}
        <div className="bg-surface-container rounded-xl p-6">
          <h2 className="text-lg font-semibold text-on-surface mb-2">
            Restaurar Backup
          </h2>
          <p className="text-sm text-on-surface-variant mb-4">
            Restaura la base de datos desde un archivo de backup anterior.
            <strong className="text-error block mt-1">
              ⚠️ Esto sobreescribirá todos los datos actuales.
            </strong>
          </p>
          <button
            onClick={handleRestore}
            disabled={loading}
            className="bg-error text-on-error px-6 py-3 rounded-lg font-medium hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Restaurando..." : "Restaurar Backup"}
          </button>
        </div>

        {/* Mensajes */}
        {mensaje && (
          <div className="bg-tertiary-container text-on-tertiary-container p-4 rounded-lg">
            {mensaje}
          </div>
        )}
        {error && (
          <div className="bg-error-container text-on-error-container p-4 rounded-lg">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
