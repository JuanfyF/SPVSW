import { useState, useEffect, useRef } from "react";
import { formatearFecha, generarPdfNomina } from "@pos/shared";
import { useAuthStore } from "../../store/auth";
import ConfirmModal from "../../components/ConfirmModal";
import { Banknote, AlertTriangle } from "lucide-react";

interface Empleado {
  id: number;
  nombre: string;
  cargo: string;
  salarioMensual: number;
}

interface Adelanto {
  id: number;
  empleadoId: number;
  fecha: string;
  monto: number;
  metodoPago: string;
  mesADescontar: string;
  descripcion: string | null;
}

interface Multa {
  id: number;
  empleadoId: number;
  fecha: string;
  monto: number;
  motivo: string;
  mesADescontar: string;
}

export default function Nomina() {
  const { usuario, sesionCaja } = useAuthStore();
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState<string>("");
  const [adelantos, setAdelantos] = useState<Adelanto[]>([]);
  const [multas, setMultas] = useState<Multa[]>([]);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [modalAdelanto, setModalAdelanto] = useState(false);
  const [modalMulta, setModalMulta] = useState(false);
  const [modalCrear, setModalCrear] = useState(false);
  const [modalConfirmarAdelanto, setModalConfirmarAdelanto] = useState(false);
  const [modalConfirmarMulta, setModalConfirmarMulta] = useState(false);
  const [error, setError] = useState("");
  const [modalError, setModalError] = useState("");
  const [errores, setErrores] = useState<Record<string, string>>({});
  const empleadoVersionRef = useRef(0);

  // Formulario crear empleado
  const [usuarios, setUsuarios] = useState<{ id: number; nombre: string }[]>([]);
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState<string>("");
  const [nombre, setNombre] = useState("");
  const [cargo, setCargo] = useState("cajero");
  const [salario, setSalario] = useState("");

  // Formulario adelanto
  const [montoAdelanto, setMontoAdelanto] = useState("");
  const [metodoPagoAdelanto, setMetodoPagoAdelanto] = useState<"efectivo" | "transferencia">("efectivo");
  const [mesADescontarAdelanto, setMesADescontarAdelanto] = useState("");
  const [descripcionAdelanto, setDescripcionAdelanto] = useState("");

  // Formulario multa
  const [montoMulta, setMontoMulta] = useState("");
  const [motivoMulta, setMotivoMulta] = useState("");
  const [mesADescontarMulta, setMesADescontarMulta] = useState("");

  useEffect(() => {
    cargarEmpleados();
  }, []);

  useEffect(() => {
    if (empleadoSeleccionado) {
      cargarDatosEmpleado(parseInt(empleadoSeleccionado, 10));
    }
  }, [empleadoSeleccionado]);

  const cargarEmpleados = async () => {
    try {
      const data = await window.pos.nomina.listarEmpleadosActivos();
      setEmpleados(data);
    } catch (err) {
      console.error("Error al cargar empleados:", err);
      setError("Error al cargar empleados");
    } finally {
      setLoading(false);
    }
  };

  const cargarDatosEmpleado = async (empleadoId: number) => {
    const version = ++empleadoVersionRef.current;
    try {
      const [adelantosData, multasData] = await Promise.all([
        window.pos.nomina.listarAdelantosPorEmpleado(empleadoId),
        window.pos.nomina.listarMultasPorEmpleado(empleadoId),
      ]);
      if (version !== empleadoVersionRef.current) return;
      setAdelantos(adelantosData);
      setMultas(multasData);
    } catch (err) {
      console.error("Error al cargar datos del empleado:", err);
      setError("Error al cargar datos del empleado");
    }
  };

  const cargarUsuarios = async () => {
    try {
      const data = await window.pos.usuarios.listar();
      setUsuarios(data.filter(u => u.activo).map(u => ({ id: u.id, nombre: u.nombre })));
    } catch (err) {
      console.error("Error al cargar usuarios:", err);
    }
  };

  const handleCrearEmpleado = async () => {
    const nombreFinal = nombre.trim() || (usuarioSeleccionado ? usuarios.find(u => u.id === parseInt(usuarioSeleccionado))?.nombre || "" : "");
    if (!nombreFinal) return;
    setGuardando(true);
    setModalError("");
    try {
      const salarioNum = salario ? parseFloat(salario) : 0;
      if (salario && (isNaN(salarioNum) || salarioNum < 0)) throw new Error("Salario inválido");
      await window.pos.nomina.crearEmpleado({
        nombre: nombreFinal,
        cargo,
        salarioMensual: salarioNum || 0,
        usuarioId: usuarioSeleccionado ? parseInt(usuarioSeleccionado) : null,
      });
      await cargarEmpleados();
      setModalCrear(false);
      setUsuarioSeleccionado("");
      setNombre("");
      setCargo("cajero");
      setSalario("");
    } catch (err: any) {
      setModalError(err.message || "Error al crear empleado");
    } finally {
      setGuardando(false);
    }
  };

  const handleCrearAdelanto = () => {
    if (!empleadoSeleccionado || !sesionCaja || !usuario) return;
    setModalConfirmarAdelanto(true);
  };

  const confirmarAdelanto = async () => {
    if (!empleadoSeleccionado || !sesionCaja || !usuario) return;

    setGuardando(true);
    setModalError("");

    try {
      const montoNum = parseFloat(montoAdelanto);
      if (isNaN(montoNum) || montoNum <= 0)
        throw new Error("El monto debe ser un número positivo");
      if (!mesADescontarAdelanto)
        throw new Error("El mes a descontar es requerido");
      if (descripcionAdelanto && descripcionAdelanto.length > 255)
        throw new Error("La descripción no puede tener más de 255 caracteres");

      await window.pos.nomina.registrarAdelanto({
        empleadoId: parseInt(empleadoSeleccionado, 10),
        sesionCajaId: sesionCaja.id,
        fecha: formatearFecha(new Date()),
        monto: montoNum,
        metodoPago: metodoPagoAdelanto,
        mesADescontar: mesADescontarAdelanto,
        descripcion: descripcionAdelanto || null,
        registradoPor: usuario.id,
      });

      await cargarDatosEmpleado(parseInt(empleadoSeleccionado, 10));
      setModalAdelanto(false);
      setModalConfirmarAdelanto(false);
      setMontoAdelanto("");
      setDescripcionAdelanto("");
    } catch (err: any) {
      setModalError(err.message || "Error al crear el adelanto");
    } finally {
      setGuardando(false);
    }
  };

  const handleCrearMulta = () => {
    if (!empleadoSeleccionado || !usuario) return;
    setModalConfirmarMulta(true);
  };

  const confirmarMulta = async () => {
    if (!empleadoSeleccionado || !usuario) return;

    setGuardando(true);
    setModalError("");

    try {
      const montoNum = parseFloat(montoMulta);
      if (isNaN(montoNum) || montoNum <= 0)
        throw new Error("El monto debe ser un número positivo");
      if (!motivoMulta || !motivoMulta.trim()) throw new Error("El motivo es requerido");
      if (motivoMulta.trim().length > 255) throw new Error("El motivo no puede tener más de 255 caracteres");
      if (!mesADescontarMulta) throw new Error("El mes a descontar es requerido");

      await window.pos.nomina.registrarMulta({
        empleadoId: parseInt(empleadoSeleccionado, 10),
        fecha: formatearFecha(new Date()),
        monto: montoNum,
        motivo: motivoMulta.trim(),
        mesADescontar: mesADescontarMulta,
        registradoPor: usuario.id,
      });

      await cargarDatosEmpleado(parseInt(empleadoSeleccionado, 10));
      setModalMulta(false);
      setModalConfirmarMulta(false);
      setMontoMulta("");
      setMotivoMulta("");
    } catch (err: any) {
      setModalError(err.message || "Error al crear la multa");
    } finally {
      setGuardando(false);
    }
  };

  const totalAdelantos = adelantos.reduce((sum, a) => sum + a.monto, 0);
  const totalMultas = multas.reduce((sum, m) => sum + m.monto, 0);

  // Resumen mensual (por empleado)
  const [mesResumenIndividual, setMesResumenIndividual] = useState("");
  const [resumenMensual, setResumenMensual] = useState<{
    salario: number;
    adelantosMes: number;
    multasMes: number;
    totalDescuentos: number;
    neto: number;
  } | null>(null);
  const [cargandoResumen, setCargandoResumen] = useState(false);

  // Resumen global (todos los empleados)
  const [mesResumenGlobal, setMesResumenGlobal] = useState("");
  const [resumenGlobal, setResumenGlobal] = useState<{
    totalSalarios: number;
    totalAdelantos: number;
    totalMultas: number;
    totalDescuentos: number;
    netoGlobal: number;
    empleados: Array<{
      id: number;
      nombre: string;
      salario: number;
      adelantos: number;
      multas: number;
      neto: number;
    }>;
  } | null>(null);
  const [cargandoGlobal, setCargandoGlobal] = useState(false);

  const calcularResumenMensual = async () => {
    if (!empleadoSeleccionado || !mesResumenIndividual) return;
    setCargandoResumen(true);
    try {
      const resumen = await window.pos.nomina.calcularDescuentosMes(
        parseInt(empleadoSeleccionado, 10),
        mesResumenIndividual
      );
      setResumenMensual(resumen);
    } catch (err: any) {
      console.error("Error al calcular resumen:", err);
      setResumenMensual(null);
    } finally {
      setCargandoResumen(false);
    }
  };

  const calcularResumenGlobal = async () => {
    if (!mesResumenGlobal || empleados.length === 0) return;
    setCargandoGlobal(true);
    try {
      const empleadosConDescuentos = await Promise.all(
        empleados.map(async (emp) => {
          try {
            const resumen = await window.pos.nomina.calcularDescuentosMes(emp.id, mesResumenGlobal);
            return {
              id: emp.id,
              nombre: emp.nombre,
              salario: resumen.salario,
              adelantos: resumen.adelantosMes,
              multas: resumen.multasMes,
              neto: resumen.neto,
            };
          } catch {
            return { id: emp.id, nombre: emp.nombre, salario: 0, adelantos: 0, multas: 0, neto: 0 };
          }
        })
      );

      const totalSalarios = empleadosConDescuentos.reduce((sum, e) => sum + e.salario, 0);
      const totalAdelantosGlobal = empleadosConDescuentos.reduce((sum, e) => sum + e.adelantos, 0);
      const totalMultasGlobal = empleadosConDescuentos.reduce((sum, e) => sum + e.multas, 0);
      const totalDescuentosGlobal = totalAdelantosGlobal + totalMultasGlobal;

      setResumenGlobal({
        totalSalarios,
        totalAdelantos: totalAdelantosGlobal,
        totalMultas: totalMultasGlobal,
        totalDescuentos: totalDescuentosGlobal,
        netoGlobal: totalSalarios - totalDescuentosGlobal,
        empleados: empleadosConDescuentos,
      });
    } catch (err: any) {
      console.error("Error al calcular resumen global:", err);
      setResumenGlobal(null);
    } finally {
      setCargandoGlobal(false);
    }
  };

  const exportarPdfGlobal = async () => {
    if (!resumenGlobal || !mesResumenGlobal) return;
    try {
      await generarPdfNomina({
        mes: mesResumenGlobal,
        totalAdelantos: resumenGlobal.totalAdelantos,
        totalMultas: resumenGlobal.totalMultas,
        netoGlobal: resumenGlobal.netoGlobal,
        empleados: resumenGlobal.empleados,
      });
    } catch (err: any) {
      console.error("Error al exportar PDF global:", err);
      alert("Error al generar el PDF. Intente de nuevo.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-on-surface-variant">Cargando...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="p-4 bg-error-container text-on-error-container rounded-xl">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-headline-lg font-bold text-on-surface">Nómina</h1>
        <p className="text-on-surface-variant">Gestión de adelantos y multas</p>
      </div>

      {/* Selector de empleado */}
      <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant mb-6 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-headline-md font-semibold text-on-surface">
            Seleccionar Empleado
          </h2>
          <button
            onClick={() => { setModalCrear(true); cargarUsuarios(); }}
            className="px-4 py-2 bg-secondary text-on-secondary rounded-xl hover:bg-secondary/90 transition-colors text-label-md"
          >
            + Crear Empleado
          </button>
        </div>
        <select
          value={empleadoSeleccionado}
          onChange={(e) => setEmpleadoSeleccionado(e.target.value)}
          className="w-full px-4 py-3 border border-outline-variant rounded-xl focus:outline-none focus:border-secondary bg-surface"
        >
          <option value="">Seleccionar empleado...</option>
          {empleados.map((e) => (
            <option key={e.id} value={e.id}>
              {e.nombre} - {e.cargo}
            </option>
          ))}
        </select>
      </div>

      {/* Resumen Global */}
      <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant mb-6 hover:shadow-md transition-shadow">
        <h2 className="text-headline-md font-semibold text-on-surface mb-4">
          Resumen Global del Mes
        </h2>
        <div className="flex gap-4 items-end mb-4">
          <div className="flex-1">
            <label className="block text-label-md text-on-surface-variant mb-1">
              Mes (YYYY-MM)
            </label>
            <input
              type="month"
              value={mesResumenGlobal}
              onChange={(e) => setMesResumenGlobal(e.target.value)}
              className="w-full px-4 py-2 border border-outline-variant rounded-xl focus:outline-none focus:border-secondary bg-surface"
            />
          </div>
          <button
            onClick={calcularResumenGlobal}
            disabled={!mesResumenGlobal || cargandoGlobal}
            className="px-4 py-2 bg-secondary text-on-secondary rounded-xl hover:bg-secondary/90 disabled:opacity-50 transition-colors"
          >
            {cargandoGlobal ? "Calculando..." : "Calcular Global"}
          </button>
          {resumenGlobal && (
            <button
              onClick={() => exportarPdfGlobal()}
              className="px-4 py-2 bg-surface-container text-on-surface rounded-xl hover:bg-surface-container-high transition-colors"
            >
              Descargar PDF
            </button>
          )}
        </div>

        {resumenGlobal && (
          <div className="p-4 bg-surface-container rounded-xl">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div>
                <p className="text-label-md text-on-surface-variant">Total Salarios</p>
                <p className="text-headline-md font-bold text-on-surface">
                  ${resumenGlobal.totalSalarios.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-label-md text-on-surface-variant">Total Adelantos</p>
                <p className="text-headline-md font-bold text-tertiary">
                  -${resumenGlobal.totalAdelantos.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-label-md text-on-surface-variant">Total Multas</p>
                <p className="text-headline-md font-bold text-error">
                  -${resumenGlobal.totalMultas.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-label-md text-on-surface-variant">Neto Global</p>
                <p className={`text-headline-md font-bold ${resumenGlobal.netoGlobal >= 0 ? "text-tertiary" : "text-error"}`}>
                  ${resumenGlobal.netoGlobal.toFixed(2)}
                </p>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-outline-variant">
              <p className="text-caption text-on-surface-variant">
                Total descuentos: ${resumenGlobal.totalDescuentos.toFixed(2)} • {empleados.length} empleados
              </p>
            </div>

            {/* Desglose por empleado */}
            <div className="mt-4 space-y-2">
              <p className="text-label-md font-medium text-on-surface-variant">Desglose por empleado:</p>
              {resumenGlobal.empleados.map((emp) => (
                <div key={emp.id} className="flex justify-between items-center p-3 bg-surface-container-lowest rounded-xl border border-outline-variant/50">
                  <div>
                    <p className="font-medium text-on-surface">{emp.nombre}</p>
                    <p className="text-caption text-on-surface-variant">
                      Salario: ${emp.salario.toFixed(2)}
                    </p>
                  </div>
                  <div className="flex gap-4 text-caption">
                    {emp.adelantos > 0 && (
                      <span className="text-tertiary">Adelantos: -${emp.adelantos.toFixed(2)}</span>
                    )}
                    {emp.multas > 0 && (
                      <span className="text-error">Multas: -${emp.multas.toFixed(2)}</span>
                    )}
                    <span className={`font-medium ${emp.neto >= 0 ? "text-on-surface" : "text-error"}`}>
                      Neto: ${emp.neto.toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {empleadoSeleccionado && (
        <>
          {/* Resumen */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <Banknote className="w-8 h-8 text-tertiary" />
                <span className="text-label-md text-tertiary font-medium">Adelantos</span>
              </div>
              <p className="text-3xl font-bold text-tertiary">
                ${totalAdelantos.toFixed(2)}
              </p>
              <p className="mt-2 text-label-md text-on-surface-variant">
                {adelantos.length} adelantos registrados
              </p>
            </div>

            <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <AlertTriangle className="w-8 h-8 text-error" />
                <span className="text-label-md text-error font-medium">Multas</span>
              </div>
              <p className="text-3xl font-bold text-error">
                ${totalMultas.toFixed(2)}
              </p>
              <p className="mt-2 text-label-md text-on-surface-variant">
                {multas.length} multas registradas
              </p>
            </div>
          </div>

          {/* Resumen mensual */}
          <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant mb-6 hover:shadow-md transition-shadow">
            <h2 className="text-headline-md font-semibold text-on-surface mb-4">
              Resumen Mensual
            </h2>
            <div className="flex gap-4 items-end mb-4">
              <div className="flex-1">
                <label className="block text-label-md text-on-surface-variant mb-1">
                  Mes (YYYY-MM)
                </label>
                <input
                  type="month"
                  value={mesResumenIndividual}
                  onChange={(e) => setMesResumenIndividual(e.target.value)}
                  className="w-full px-4 py-2 border border-outline-variant rounded-xl focus:outline-none focus:border-secondary bg-surface"
                />
              </div>
              <button
                onClick={calcularResumenMensual}
                disabled={!mesResumenIndividual || cargandoResumen}
                className="px-4 py-2 bg-secondary text-on-secondary rounded-xl hover:bg-secondary/90 disabled:opacity-50 transition-colors"
              >
                {cargandoResumen ? "Calculando..." : "Calcular"}
              </button>
            </div>

            {resumenMensual && (
              <div className="p-4 bg-surface-container rounded-xl">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-label-md text-on-surface-variant">Salario</p>
                    <p className="text-headline-md font-bold text-on-surface">
                      ${resumenMensual.salario.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-label-md text-on-surface-variant">Adelantos</p>
                    <p className="text-headline-md font-bold text-tertiary">
                      -${resumenMensual.adelantosMes.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-label-md text-on-surface-variant">Multas</p>
                    <p className="text-headline-md font-bold text-error">
                      -${resumenMensual.multasMes.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-label-md text-on-surface-variant">Neto a pagar</p>
                    <p className={`text-headline-md font-bold ${resumenMensual.neto >= 0 ? "text-tertiary" : "text-error"}`}>
                      ${resumenMensual.neto.toFixed(2)}
                    </p>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-outline-variant">
                  <p className="text-caption text-on-surface-variant">
                    Total descuentos: ${resumenMensual.totalDescuentos.toFixed(2)}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Acciones */}
          <div className="flex gap-4 mb-6">
            <button
              onClick={() => setModalAdelanto(true)}
              className="px-4 py-2 bg-tertiary text-on-tertiary rounded-xl hover:bg-tertiary/90 transition-colors"
            >
              + Nuevo Adelanto
            </button>
            <button
              onClick={() => setModalMulta(true)}
              className="px-4 py-2 bg-error text-on-error rounded-xl hover:bg-error/90 transition-colors"
            >
              + Nueva Multa
            </button>
          </div>

          {/* Historial */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Adelantos */}
            <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant hover:shadow-md transition-shadow">
              <h2 className="text-headline-md font-semibold text-on-surface mb-4">
                Historial de Adelantos
              </h2>
              {adelantos.length === 0 ? (
                <div className="flex flex-col items-center py-4">
                  <Banknote className="w-10 h-10 mb-2 text-on-surface-variant/40" />
                  <p className="text-on-surface-variant text-center">
                    No hay adelantos registrados
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {adelantos.map((adelanto) => (
                    <div
                      key={adelanto.id}
                      className="p-3 bg-surface-container rounded-xl"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-on-surface">
                            ${adelanto.monto.toFixed(2)}
                          </p>
                          <p className="text-label-md text-on-surface-variant">
                            {new Date(adelanto.fecha).toLocaleDateString("es-EC")} •{" "}
                            {adelanto.metodoPago}
                          </p>
                        </div>
                        <span className="text-label-md text-on-surface-variant">
                          Desc: {adelanto.mesADescontar}
                        </span>
                      </div>
                      {adelanto.descripcion && (
                        <p className="mt-2 text-label-md text-on-surface-variant">
                          {adelanto.descripcion}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Multas */}
            <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant hover:shadow-md transition-shadow">
              <h2 className="text-headline-md font-semibold text-on-surface mb-4">
                Historial de Multas
              </h2>
              {multas.length === 0 ? (
                <div className="flex flex-col items-center py-4">
                  <AlertTriangle className="w-10 h-10 mb-2 text-on-surface-variant/40" />
                  <p className="text-on-surface-variant text-center">
                    No hay multas registradas
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {multas.map((multa) => (
                    <div
                      key={multa.id}
                      className="p-3 bg-error-container/30 rounded-xl"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-error">
                            ${multa.monto.toFixed(2)}
                          </p>
                          <p className="text-label-md text-on-surface-variant">
                            {new Date(multa.fecha).toLocaleDateString("es-EC")}
                          </p>
                        </div>
                        <span className="text-label-md text-on-surface-variant">
                          Desc: {multa.mesADescontar}
                        </span>
                      </div>
                      <p className="mt-2 text-label-md text-on-surface">{multa.motivo}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Modal adelanto */}
      {modalAdelanto && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={(e) => { if (e.target === e.currentTarget) { setModalAdelanto(false); setMesADescontarAdelanto(""); setErrores(prev => { const { montoAdelanto, mesADescontarAdelanto, ...rest } = prev; return rest; }); } }}
          onKeyDown={(e) => { if (e.key === "Escape") { setModalAdelanto(false); setMesADescontarAdelanto(""); setErrores(prev => { const { montoAdelanto, mesADescontarAdelanto, ...rest } = prev; return rest; }); } }}
          tabIndex={0}
        >
          <div className="bg-surface-container-lowest rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-xl font-bold text-on-surface mb-4">
              Nuevo Adelanto
            </h2>

            <div className="space-y-4 mb-4">
              <div>
                <label className="block text-label-md text-on-surface-variant mb-1">
                  Monto *
                </label>
                <input
                  type="number"
                  value={montoAdelanto}
                  onChange={(e) => setMontoAdelanto(e.target.value)}
                  onBlur={() => {
                    const val = parseFloat(montoAdelanto);
                    if (isNaN(val) || val <= 0) {
                      setErrores(prev => ({ ...prev, montoAdelanto: "El monto debe ser mayor a 0" }));
                    } else {
                      setErrores(prev => { const { montoAdelanto: _, ...rest } = prev; return rest; });
                    }
                  }}
                  min="0"
                  max="999999"
                  step="0.01"
                  className={`w-full px-4 py-2 border rounded-xl focus:outline-none focus:border-secondary bg-surface ${errores.montoAdelanto ? "border-error" : "border-outline-variant"}`}
                />
                {errores.montoAdelanto && <p className="text-error text-caption mt-1">{errores.montoAdelanto}</p>}
              </div>

              <div>
                <label className="block text-label-md text-on-surface-variant mb-1">
                  Método de pago
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setMetodoPagoAdelanto("efectivo")}
                    className={`flex-1 py-2 rounded-xl transition-colors ${
                      metodoPagoAdelanto === "efectivo"
                        ? "bg-secondary text-on-secondary"
                        : "bg-surface-container text-on-surface-variant"
                    }`}
                  >
                    Efectivo
                  </button>
                  <button
                    onClick={() => setMetodoPagoAdelanto("transferencia")}
                    className={`flex-1 py-2 rounded-xl transition-colors ${
                      metodoPagoAdelanto === "transferencia"
                        ? "bg-secondary text-on-secondary"
                        : "bg-surface-container text-on-surface-variant"
                    }`}
                  >
                    Transferencia
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-label-md text-on-surface-variant mb-1">
                  Mes a descontar (YYYY-MM) *
                </label>
                <input
                  type="month"
                  value={mesADescontarAdelanto}
                  onChange={(e) => setMesADescontarAdelanto(e.target.value)}
                  onBlur={() => {
                    if (!mesADescontarAdelanto) {
                      setErrores(prev => ({ ...prev, mesADescontarAdelanto: "El mes es requerido" }));
                    } else {
                      setErrores(prev => { const { mesADescontarAdelanto: _, ...rest } = prev; return rest; });
                    }
                  }}
                  className={`w-full px-4 py-2 border rounded-xl focus:outline-none focus:border-secondary bg-surface ${errores.mesADescontarAdelanto ? "border-error" : "border-outline-variant"}`}
                />
                {errores.mesADescontarAdelanto && <p className="text-error text-caption mt-1">{errores.mesADescontarAdelanto}</p>}
              </div>

              <div>
                <label className="block text-label-md text-on-surface-variant mb-1">
                  Descripción
                </label>
                <input
                  type="text"
                  value={descripcionAdelanto}
                  onChange={(e) => setDescripcionAdelanto(e.target.value)}
                  maxLength={255}
                  className="w-full px-4 py-2 border border-outline-variant rounded-xl focus:outline-none focus:border-secondary bg-surface"
                />
              </div>
            </div>

            {modalError && (
              <div className="mb-4 p-3 bg-error-container text-on-error-container rounded-xl text-center">
                {modalError}
              </div>
            )}

            <div className="flex gap-4">
              <button
                onClick={() => {
                  setModalAdelanto(false);
                  setMontoAdelanto("");
                  setDescripcionAdelanto("");
                  setModalError("");
                  setErrores(prev => { const { montoAdelanto, mesADescontarAdelanto, ...rest } = prev; return rest; });
                }}
                className="flex-1 py-3 border border-outline-variant text-on-surface-variant rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCrearAdelanto}
                disabled={!montoAdelanto || !mesADescontarAdelanto || guardando}
                className="flex-1 py-3 bg-tertiary text-on-tertiary rounded-xl hover:bg-tertiary/90 disabled:opacity-50 transition-colors"
              >
                {guardando ? "Creando..." : "Crear Adelanto"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal multa */}
      {modalMulta && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={(e) => { if (e.target === e.currentTarget) { setModalMulta(false); setMesADescontarMulta(""); setErrores(prev => { const { montoMulta, motivoMulta, ...rest } = prev; return rest; }); } }}
          onKeyDown={(e) => { if (e.key === "Escape") { setModalMulta(false); setMesADescontarMulta(""); setErrores(prev => { const { montoMulta, motivoMulta, ...rest } = prev; return rest; }); } }}
          tabIndex={0}
        >
          <div className="bg-surface-container-lowest rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-xl font-bold text-error mb-4">Nueva Multa</h2>

            <div className="space-y-4 mb-4">
              <div>
                <label className="block text-label-md text-on-surface-variant mb-1">
                  Monto *
                </label>
                <input
                  type="number"
                  value={montoMulta}
                  onChange={(e) => setMontoMulta(e.target.value)}
                  onBlur={() => {
                    const val = parseFloat(montoMulta);
                    if (isNaN(val) || val <= 0) {
                      setErrores(prev => ({ ...prev, montoMulta: "El monto debe ser mayor a 0" }));
                    } else {
                      setErrores(prev => { const { montoMulta: _, ...rest } = prev; return rest; });
                    }
                  }}
                  min="0"
                  max="999999"
                  step="0.01"
                  className={`w-full px-4 py-2 border rounded-xl focus:outline-none focus:border-secondary bg-surface ${errores.montoMulta ? "border-error" : "border-outline-variant"}`}
                />
                {errores.montoMulta && <p className="text-error text-caption mt-1">{errores.montoMulta}</p>}
              </div>

              <div>
                <label className="block text-label-md text-on-surface-variant mb-1">
                  Motivo *
                </label>
                <textarea
                  value={motivoMulta}
                  onChange={(e) => setMotivoMulta(e.target.value)}
                  onBlur={() => {
                    if (!motivoMulta.trim()) {
                      setErrores(prev => ({ ...prev, motivoMulta: "El motivo es requerido" }));
                    } else {
                      setErrores(prev => { const { motivoMulta: _, ...rest } = prev; return rest; });
                    }
                  }}
                  rows={2}
                  maxLength={255}
                  className={`w-full px-4 py-2 border rounded-xl focus:outline-none focus:border-secondary bg-surface ${errores.motivoMulta ? "border-error" : "border-outline-variant"}`}
                />
                {errores.motivoMulta && <p className="text-error text-caption mt-1">{errores.motivoMulta}</p>}
              </div>

              <div>
                <label className="block text-label-md text-on-surface-variant mb-1">
                  Mes a descontar (YYYY-MM) *
                </label>
                <input
                  type="month"
                  value={mesADescontarMulta}
                  onChange={(e) => setMesADescontarMulta(e.target.value)}
                  className="w-full px-4 py-2 border border-outline-variant rounded-xl focus:outline-none focus:border-secondary bg-surface"
                />
              </div>
            </div>

            {modalError && (
              <div className="mb-4 p-3 bg-error-container text-on-error-container rounded-xl text-center">
                {modalError}
              </div>
            )}

            <div className="flex gap-4">
              <button
                onClick={() => {
                  setModalMulta(false);
                  setMontoMulta("");
                  setMotivoMulta("");
                  setModalError("");
                  setErrores(prev => { const { montoMulta, motivoMulta, ...rest } = prev; return rest; });
                }}
                className="flex-1 py-3 border border-outline-variant text-on-surface-variant rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCrearMulta}
                disabled={!montoMulta || !motivoMulta || !mesADescontarMulta || guardando}
                className="flex-1 py-3 bg-error text-on-error rounded-xl hover:bg-error/90 disabled:opacity-50 transition-colors"
              >
                {guardando ? "Creando..." : "Crear Multa"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal crear empleado */}
      {modalCrear && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={(e) => { if (e.target === e.currentTarget) { setModalCrear(false); setErrores(prev => { const { salario, ...rest } = prev; return rest; }); } }}
        >
          <div className="bg-surface-container-lowest rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-xl font-bold text-on-surface mb-4">Nuevo Empleado</h2>

            <div className="mb-3">
              <label className="block text-label-md text-on-surface-variant mb-1">Vincular a usuario (opcional)</label>
              <select
                value={usuarioSeleccionado}
                onChange={(e) => {
                  setUsuarioSeleccionado(e.target.value);
                  if (e.target.value) {
                    const user = usuarios.find(u => u.id === parseInt(e.target.value));
                    if (user) setNombre(user.nombre);
                  }
                }}
                className="w-full px-4 py-3 border border-outline-variant rounded-xl focus:outline-none focus:border-secondary bg-surface"
              >
                <option value="">Sin usuario vinculado</option>
                {usuarios.map((u) => (
                  <option key={u.id} value={u.id}>{u.nombre}</option>
                ))}
              </select>
            </div>

            <div className="mb-3">
              <label className="block text-label-md text-on-surface-variant mb-1">Nombre *</label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Nombre del empleado"
                className="w-full px-4 py-3 border border-outline-variant rounded-xl focus:outline-none focus:border-secondary bg-surface"
              />
            </div>

            <div className="mb-3">
              <label className="block text-label-md text-on-surface-variant mb-1">Cargo *</label>
              <select
                value={cargo}
                onChange={(e) => setCargo(e.target.value)}
                className="w-full px-4 py-3 border border-outline-variant rounded-xl focus:outline-none focus:border-secondary bg-surface"
              >
                <option value="cajero">Cajero</option>
                <option value="pastelera">Pastelera</option>
                <option value="repartidor">Repartidor</option>
                <option value="otro">Otro</option>
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-label-md text-on-surface-variant mb-1">Salario mensual</label>
              <input
                type="number"
                value={salario}
                onChange={(e) => setSalario(e.target.value)}
                onBlur={() => {
                  const val = parseFloat(salario);
                  if (salario !== "" && (isNaN(val) || val < 0)) {
                    setErrores(prev => ({ ...prev, salario: "El salario no puede ser negativo" }));
                  } else {
                    setErrores(prev => { const { salario: _, ...rest } = prev; return rest; });
                  }
                }}
                placeholder="0.00"
                min="0"
                max="999999"
                step="0.01"
                className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:border-secondary bg-surface ${errores.salario ? "border-error" : "border-outline-variant"}`}
              />
              {errores.salario && <p className="text-error text-caption mt-1">{errores.salario}</p>}
            </div>

            {modalError && (
              <div className="mb-4 p-3 bg-error-container text-on-error-container rounded-xl text-center">
                {modalError}
              </div>
            )}

            <div className="flex gap-4">
              <button
                onClick={() => { setModalCrear(false); setUsuarioSeleccionado(""); setNombre(""); setCargo("cajero"); setSalario(""); setModalError(""); setErrores(prev => { const { salario, ...rest } = prev; return rest; }); }}
                className="flex-1 py-3 border border-outline-variant text-on-surface-variant rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCrearEmpleado}
                disabled={(!nombre.trim() && !usuarioSeleccionado) || guardando}
                className="flex-1 py-3 bg-secondary text-on-secondary rounded-xl hover:bg-secondary/90 disabled:opacity-50 transition-colors"
              >
                {guardando ? "Creando..." : "Crear Empleado"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={modalConfirmarAdelanto}
        titulo="Registrar Adelanto"
        mensaje={`¿Registrar adelanto de $${(parseFloat(montoAdelanto) || 0).toFixed(2)}?\n\nEmpleado: ${empleados.find(e => e.id === parseInt(empleadoSeleccionado))?.nombre}\nMes a descontar: ${mesADescontarAdelanto}\nMétodo: ${metodoPagoAdelanto}`}
        textoConfirmar="Registrar Adelanto"
        textoCancelar="Cancelar"
        variante="advertencia"
        onConfirmar={confirmarAdelanto}
        onCancelar={() => setModalConfirmarAdelanto(false)}
        cargando={guardando}
      />

      <ConfirmModal
        open={modalConfirmarMulta}
        titulo="Registrar Multa"
        mensaje={`¿ Registrar multa de $${(parseFloat(montoMulta) || 0).toFixed(2)}?\n\nEmpleado: ${empleados.find(e => e.id === parseInt(empleadoSeleccionado))?.nombre}\nMotivo: ${motivoMulta}\nMes a descontar: ${mesADescontarMulta}`}
        textoConfirmar="Registrar Multa"
        textoCancelar="Cancelar"
        variante="peligro"
        onConfirmar={confirmarMulta}
        onCancelar={() => setModalConfirmarMulta(false)}
        cargando={guardando}
      />
    </div>
  );
}
