import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as XLSX from "xlsx";
import {
  agregarVacacionFirebase,
  eliminarVacacionFirebase,
} from "../firebase/vacacionesService";
import {
  calcularAntiguedad,
  claseEstadoBadge,
  contarDiasVacaciones,
  estadoEfectivo,
  resumenVacaciones,
  TIPOS_AUSENCIA,
  type TipoAusencia,
} from "../utils/vacacionesUtils";

// Estados posibles de un empleado para el filtro de la tabla de saldo:
// "Disponible" + los tipos de ausencia registrables + los estados manuales del Directorio.
const ESTADOS_FILTRO_SALDO = ["Disponible", ...TIPOS_AUSENCIA, "Inactivo"];
import {
  exportarConstanciaVacacionesPDF,
  exportarListadoVacacionesPDF,
} from "../utils/vacacionesPdfUtils";
import {
  TreePalm,
  CalendarRange,
  Plus,
  Trash2,
  Loader2,
  ShieldAlert,
  Search,
  Users,
  UserCog,
  Download,
  FileText,
  Printer,
} from "lucide-react";

interface PanelVacacionesPersonalProps {
  choferes: any[];
  choferesFiltrados: any[];
  vacaciones: any[];
}

export default function PanelVacacionesPersonal({
  choferes,
  choferesFiltrados,
  vacaciones,
}: PanelVacacionesPersonalProps) {
  const queryClient = useQueryClient();

  const [choferId, setChoferId] = useState("");
  const [tipo, setTipo] = useState<TipoAusencia>("Vacaciones");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [dias, setDias] = useState<number | "">("");
  const [observaciones, setObservaciones] = useState("");

  const [busquedaSaldo, setBusquedaSaldo] = useState("");
  const [filtroEstadoSaldo, setFiltroEstadoSaldo] = useState("Todos");

  const hoyStr = new Date().toLocaleDateString("sv-SE");

  const vacacionesPorChofer = (id: string) =>
    vacaciones.filter((v: any) => v.chofer_id === id);

  const empleadosConEstado = useMemo(() => {
    return choferesFiltrados.map((c: any) => ({
      ...c,
      _estadoActual: estadoEfectivo(c, vacacionesPorChofer(c.id), hoyStr),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [choferesFiltrados, vacaciones, hoyStr]);

  const empleadosConSaldo = useMemo(() => {
    return empleadosConEstado.filter((c: any) => {
      const coincideNombre = (c.nombre || "")
        .toLowerCase()
        .includes(busquedaSaldo.toLowerCase());
      const coincideEstado =
        filtroEstadoSaldo === "Todos" || c._estadoActual === filtroEstadoSaldo;
      return coincideNombre && coincideEstado;
    });
  }, [empleadosConEstado, busquedaSaldo, filtroEstadoSaldo]);

  const choferesSaldo = useMemo(
    () => empleadosConSaldo.filter((c: any) => c.tipo !== "Auxiliar"),
    [empleadosConSaldo],
  );
  const auxiliaresSaldo = useMemo(
    () => empleadosConSaldo.filter((c: any) => c.tipo === "Auxiliar"),
    [empleadosConSaldo],
  );

  const limpiarFormulario = () => {
    setChoferId("");
    setTipo("Vacaciones");
    setFechaInicio("");
    setFechaFin("");
    setDias("");
    setObservaciones("");
  };

  const agregarMutation = useMutation({
    mutationFn: agregarVacacionFirebase,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vacaciones"] });
      limpiarFormulario();
      alert("¡Periodo registrado!");
    },
    onError: () => alert("Error al registrar el periodo."),
  });

  const eliminarMutation = useMutation({
    mutationFn: eliminarVacacionFirebase,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vacaciones"] });
    },
  });

  const handleFechasChange = (inicio: string, fin: string) => {
    setFechaInicio(inicio);
    setFechaFin(fin);
    if (inicio && fin && fin >= inicio) {
      setDias(contarDiasVacaciones(inicio, fin));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const chofer = choferes.find((c: any) => c.id === choferId);
    if (!chofer) return alert("Selecciona un empleado.");
    if (!chofer.fecha_ingreso)
      return alert(
        "Este empleado no tiene fecha de ingreso registrada. Edítalo en el Directorio primero.",
      );
    if (!fechaInicio || !fechaFin)
      return alert("Completa la fecha de inicio y fin.");
    if (fechaFin < fechaInicio)
      return alert("La fecha de fin no puede ser anterior a la de inicio.");

    const nuevoPeriodo = {
      chofer_id: chofer.id,
      chofer_nombre: chofer.nombre || "",
      tipo,
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin,
      dias: Number(dias) || contarDiasVacaciones(fechaInicio, fechaFin),
      observaciones,
    };

    try {
      await agregarMutation.mutateAsync(nuevoPeriodo);
      const resumenActualizado = resumenVacaciones(
        chofer,
        [...vacacionesPorChofer(chofer.id), nuevoPeriodo],
        hoyStr,
      );
      exportarConstanciaVacacionesPDF(chofer, nuevoPeriodo, resumenActualizado);
    } catch {
      // El error ya se notifica en agregarMutation.onError
    }
  };

  const vacacionesOrdenadas = [...vacaciones].sort((a: any, b: any) =>
    (b.fecha_inicio || "").localeCompare(a.fecha_inicio || ""),
  );

  const [busquedaPeriodos, setBusquedaPeriodos] = useState("");

  const periodosFiltrados = useMemo(() => {
    return vacacionesOrdenadas.filter((v: any) =>
      (v.chofer_nombre || "")
        .toLowerCase()
        .includes(busquedaPeriodos.toLowerCase()),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vacaciones, busquedaPeriodos]);

  const exportarExcelPeriodos = () => {
    const dataAExportar = periodosFiltrados.map((v: any) => ({
      Empleado: v.chofer_nombre,
      Tipo: v.tipo || "Vacaciones",
      Del: v.fecha_inicio,
      Al: v.fecha_fin,
      Días: v.dias,
      Observaciones: v.observaciones || "-",
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataAExportar);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Periodos");
    const fecha = new Date().toLocaleDateString("sv-SE");
    XLSX.writeFile(workbook, `Periodos_Vacaciones_${fecha}.xlsx`);
  };

  const handleReimprimirPDF = (periodo: any) => {
    const chofer = choferes.find((c: any) => c.id === periodo.chofer_id);
    if (!chofer)
      return alert("No se encontró el empleado dueño de este periodo.");
    const resumen = resumenVacaciones(
      chofer,
      vacacionesPorChofer(chofer.id),
      hoyStr,
    );
    exportarConstanciaVacacionesPDF(chofer, periodo, resumen);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* FORMULARIO DE ALTA DE PERIODO */}
      <div className="lg:col-span-1 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 h-fit sticky top-6">
        <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-5 flex items-center gap-2">
          <TreePalm size={18} className="text-teal-600 dark:text-teal-400" />{" "}
          Registrar Periodo
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Empleado
            </label>
            <select
              value={choferId}
              onChange={(e) => setChoferId(e.target.value)}
              className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-slate-800 dark:text-slate-100"
              required
            >
              <option value="">Selecciona un empleado</option>
              {choferes.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.nombre || "Sin nombre"}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Tipo
            </label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value as TipoAusencia)}
              className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-slate-800 dark:text-slate-100 cursor-pointer"
              required
            >
              {TIPOS_AUSENCIA.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Del
              </label>
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => handleFechasChange(e.target.value, fechaFin)}
                className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-800 dark:text-slate-100"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Al
              </label>
              <input
                type="date"
                value={fechaFin}
                onChange={(e) => handleFechasChange(fechaInicio, e.target.value)}
                className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-800 dark:text-slate-100"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Días (excluye domingos)
            </label>
            <input
              type="number"
              min={1}
              value={dias}
              onChange={(e) =>
                setDias(e.target.value === "" ? "" : Number(e.target.value))
              }
              className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-slate-800 dark:text-slate-100"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Observaciones
            </label>
            <input
              type="text"
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Opcional"
              className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-800 dark:text-slate-100"
            />
          </div>

          <button
            type="submit"
            disabled={agregarMutation.isPending}
            className="w-full text-white font-bold py-3.5 rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer text-sm bg-teal-600 hover:bg-teal-700 disabled:bg-teal-300"
          >
            {agregarMutation.isPending ? (
              <>
                <Loader2 size={18} className="animate-spin" /> Guardando...
              </>
            ) : (
              <>
                <Plus size={18} /> Registrar Periodo
              </>
            )}
          </button>
        </form>
      </div>

      <div className="lg:col-span-3 flex flex-col gap-6">
        {/* SALDO DE VACACIONES: BUSCADOR + TABLAS POR CHOFERES Y AUXILIARES */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="p-5 border-b border-slate-100 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
              Saldo de Vacaciones
            </h2>
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
                  size={16}
                />
                <input
                  type="text"
                  placeholder="Buscar por nombre..."
                  value={busquedaSaldo}
                  onChange={(e) => setBusquedaSaldo(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-700 dark:text-slate-200 shadow-sm"
                />
              </div>
              <select
                value={filtroEstadoSaldo}
                onChange={(e) => setFiltroEstadoSaldo(e.target.value)}
                className="w-full sm:w-auto px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-700 dark:text-slate-200 cursor-pointer shadow-sm"
              >
                <option value="Todos">Todos los estados</option>
                {ESTADOS_FILTRO_SALDO.map((estado) => (
                  <option key={estado} value={estado}>
                    {estado}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <TablaSaldoVacaciones
            titulo="Choferes"
            icono={<Users size={16} className="text-emerald-600 dark:text-emerald-400" />}
            empleados={choferesSaldo}
            vacacionesPorChofer={vacacionesPorChofer}
            hoyStr={hoyStr}
          />
          <TablaSaldoVacaciones
            titulo="Auxiliares"
            icono={<UserCog size={16} className="text-amber-600 dark:text-amber-400" />}
            empleados={auxiliaresSaldo}
            vacacionesPorChofer={vacacionesPorChofer}
            hoyStr={hoyStr}
          />
        </div>

        {/* TABLA DE PERIODOS REGISTRADOS */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-100 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/50 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 shrink-0">
              <CalendarRange
                size={18}
                className="text-slate-500 dark:text-slate-400"
              />
              Periodos Registrados
            </h2>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative w-full sm:w-64">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
                  size={16}
                />
                <input
                  type="text"
                  placeholder="Buscar por chofer..."
                  value={busquedaPeriodos}
                  onChange={(e) => setBusquedaPeriodos(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-700 dark:text-slate-200 shadow-sm"
                />
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  onClick={exportarExcelPeriodos}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors"
                >
                  <Download size={16} /> Excel
                </button>
                <button
                  onClick={() =>
                    exportarListadoVacacionesPDF(periodosFiltrados, hoyStr)
                  }
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors"
                >
                  <FileText size={16} /> PDF
                </button>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-x-auto">
            {periodosFiltrados.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-16 text-center text-slate-400 dark:text-slate-500">
                <ShieldAlert size={40} className="mb-3 opacity-30" />
                <p className="font-semibold text-sm">
                  {vacacionesOrdenadas.length === 0
                    ? "No hay periodos registrados."
                    : "No se encontraron periodos para ese chofer."}
                </p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest bg-slate-50/50 dark:bg-slate-900/50">
                    <th className="p-4 pl-6">Empleado</th>
                    <th className="p-4 text-center">Tipo</th>
                    <th className="p-4 text-center">Del</th>
                    <th className="p-4 text-center">Al</th>
                    <th className="p-4 text-center">Días</th>
                    <th className="p-4">Observaciones</th>
                    <th className="p-4 text-center pr-6">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-sm">
                  {periodosFiltrados.map((v: any) => {
                    const enCurso =
                      v.fecha_inicio <= hoyStr && hoyStr <= v.fecha_fin;
                    const tipoPeriodo = v.tipo || "Vacaciones";
                    return (
                      <tr
                        key={v.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-900/40 transition-colors group"
                      >
                        <td className="p-4 pl-6 font-bold text-slate-800 dark:text-slate-100 uppercase">
                          {v.chofer_nombre}
                          {enCurso && (
                            <span className="ml-2 text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-teal-100 dark:bg-teal-900/40 text-teal-800 dark:text-teal-300 tracking-wider">
                              En curso
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          <span
                            className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full tracking-wider border ${claseEstadoBadge(tipoPeriodo)}`}
                          >
                            {tipoPeriodo}
                          </span>
                        </td>
                        <td className="p-4 text-center text-slate-600 dark:text-slate-300 font-medium">
                          {v.fecha_inicio}
                        </td>
                        <td className="p-4 text-center text-slate-600 dark:text-slate-300 font-medium">
                          {v.fecha_fin}
                        </td>
                        <td className="p-4 text-center font-bold text-slate-800 dark:text-slate-100">
                          {v.dias}
                        </td>
                        <td className="p-4 text-slate-500 dark:text-slate-400">
                          {v.observaciones || "-"}
                        </td>
                        <td className="p-4 pr-6">
                          <div className="flex items-center justify-center gap-1 opacity-100 lg:opacity-50 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleReimprimirPDF(v)}
                              className="p-2 text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors"
                              title="Volver a generar el PDF de este registro"
                            >
                              <Printer size={18} />
                            </button>
                            <button
                              onClick={() => {
                                if (
                                  confirm(
                                    `¿Eliminar el periodo de ${v.chofer_nombre}?`,
                                  )
                                )
                                  eliminarMutation.mutate(v.id);
                              }}
                              className="p-2 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                              title="Eliminar"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const ITEMS_POR_PAGINA_SALDO = 10;

interface TablaSaldoVacacionesProps {
  titulo: string;
  icono: ReactNode;
  empleados: any[];
  vacacionesPorChofer: (id: string) => any[];
  hoyStr: string;
}

function TablaSaldoVacaciones({
  titulo,
  icono,
  empleados,
  vacacionesPorChofer,
  hoyStr,
}: TablaSaldoVacacionesProps) {
  const [paginaActual, setPaginaActual] = useState(1);

  useEffect(() => {
    setPaginaActual(1);
  }, [empleados]);

  const totalPaginas =
    Math.ceil(empleados.length / ITEMS_POR_PAGINA_SALDO) || 1;
  const empleadosPaginados = empleados.slice(
    (paginaActual - 1) * ITEMS_POR_PAGINA_SALDO,
    paginaActual * ITEMS_POR_PAGINA_SALDO,
  );

  return (
    <div className="border-t border-slate-100 dark:border-slate-700">
      <div className="px-5 py-3 bg-slate-50/50 dark:bg-slate-900/40 flex items-center gap-2">
        {icono}
        <h3 className="text-xs font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest">
          {titulo}
        </h3>
        <span className="text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-black px-2 py-0.5 rounded-md">
          {empleados.length}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700 text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest bg-slate-50/50 dark:bg-slate-900/50">
              <th className="p-4 pl-6">Empleado</th>
              <th className="p-4 text-center">Antigüedad</th>
              <th className="p-4 text-center">Días (pend./derecho)</th>
              <th className="p-4 text-center pr-6">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-sm">
            {empleadosPaginados.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="p-8 text-center text-slate-400 dark:text-slate-500 font-semibold text-xs"
                >
                  No hay empleados que coincidan con la búsqueda.
                </td>
              </tr>
            ) : (
              empleadosPaginados.map((c: any) => {
                const resumen = resumenVacaciones(
                  c,
                  vacacionesPorChofer(c.id),
                  hoyStr,
                );
                const antiguedad = calcularAntiguedad(c.fecha_ingreso, hoyStr);
                const estadoActual = c._estadoActual || "Disponible";
                return (
                  <tr
                    key={c.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-900/40 transition-colors"
                  >
                    <td className="p-4 pl-6 font-bold text-slate-800 dark:text-slate-100 uppercase">
                      {c.nombre || "Sin nombre"}
                    </td>
                    <td className="p-4 text-center text-slate-600 dark:text-slate-300 font-semibold text-xs">
                      {c.fecha_ingreso
                        ? `${antiguedad.anios}a ${antiguedad.meses}m`
                        : "N/A"}
                    </td>
                    <td className="p-4 text-center">
                      {c.fecha_ingreso ? (
                        <div className="flex flex-col items-center">
                          <span className="font-black text-slate-800 dark:text-slate-100 text-sm">
                            {resumen.diasPendientes} / {resumen.diasDerecho}
                          </span>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold uppercase">
                            {resumen.diasTomados} tomados
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                          Sin fecha de ingreso
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-center pr-6">
                      <span
                        className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full tracking-wider border ${claseEstadoBadge(estadoActual)}`}
                      >
                        {estadoActual}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {empleados.length > 0 && (
        <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            Mostrando{" "}
            {Math.min(
              (paginaActual - 1) * ITEMS_POR_PAGINA_SALDO + 1,
              empleados.length,
            )}{" "}
            a{" "}
            {Math.min(paginaActual * ITEMS_POR_PAGINA_SALDO, empleados.length)}{" "}
            de {empleados.length}
          </span>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setPaginaActual((p) => Math.max(1, p - 1))}
              disabled={paginaActual === 1}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Anterior
            </button>

            <span className="text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-200 dark:bg-slate-700 px-3 py-1.5 rounded-lg">
              {paginaActual} / {totalPaginas}
            </span>

            <button
              onClick={() =>
                setPaginaActual((p) => Math.min(totalPaginas, p + 1))
              }
              disabled={paginaActual === totalPaginas}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
