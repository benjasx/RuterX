import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  agregarVacacionFirebase,
  eliminarVacacionFirebase,
} from "../firebase/vacacionesService";
import {
  calcularAntiguedad,
  claseEstadoBadge,
  contarDiasVacaciones,
  resumenVacaciones,
  TIPOS_AUSENCIA,
  type TipoAusencia,
} from "../utils/vacacionesUtils";
import { exportarConstanciaVacacionesPDF } from "../utils/vacacionesPdfUtils";
import {
  TreePalm,
  CalendarRange,
  Plus,
  Trash2,
  Loader2,
  ShieldAlert,
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

  const hoyStr = new Date().toLocaleDateString("sv-SE");

  const vacacionesPorChofer = (id: string) =>
    vacaciones.filter((v: any) => v.chofer_id === id);

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
        {/* TARJETAS DE SALDO POR EMPLEADO */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-5">
          <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-4">
            Saldo de Vacaciones
          </h2>
          {choferesFiltrados.length === 0 ? (
            <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-6">
              No hay empleados que coincidan con la búsqueda.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {choferesFiltrados.map((c: any) => {
                const resumen = resumenVacaciones(
                  c,
                  vacacionesPorChofer(c.id),
                  hoyStr,
                );
                const antiguedad = calcularAntiguedad(c.fecha_ingreso, hoyStr);
                return (
                  <div
                    key={c.id}
                    className="border border-slate-200 dark:border-slate-700 rounded-xl p-4 bg-slate-50/60 dark:bg-slate-900/40"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="font-bold text-sm text-slate-800 dark:text-slate-100 uppercase">
                        {c.nombre || "Sin nombre"}
                      </span>
                      {resumen.tipoActivoHoy && (
                        <span
                          className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md tracking-wider shrink-0 border ${claseEstadoBadge(resumen.tipoActivoHoy)}`}
                        >
                          {resumen.tipoActivoHoy}
                        </span>
                      )}
                    </div>
                    {!c.fecha_ingreso ? (
                      <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                        Sin fecha de ingreso registrada.
                      </p>
                    ) : (
                      <>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-2">
                          {antiguedad.anios} año(s) {antiguedad.meses} mes(es)
                          de antigüedad
                        </p>
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-black text-slate-800 dark:text-slate-100">
                            {resumen.diasPendientes} / {resumen.diasDerecho}
                          </span>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold uppercase">
                            pendientes · {resumen.diasTomados} tomados
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* TABLA DE PERIODOS REGISTRADOS */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-100 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/50">
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <CalendarRange
                size={18}
                className="text-slate-500 dark:text-slate-400"
              />
              Periodos Registrados
            </h2>
          </div>

          <div className="flex-1 overflow-x-auto">
            {vacacionesOrdenadas.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-16 text-center text-slate-400 dark:text-slate-500">
                <ShieldAlert size={40} className="mb-3 opacity-30" />
                <p className="font-semibold text-sm">
                  No hay periodos registrados.
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
                  {vacacionesOrdenadas.map((v: any) => {
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
                          <div className="flex items-center justify-center opacity-100 lg:opacity-50 group-hover:opacity-100 transition-opacity">
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
