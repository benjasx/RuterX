import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  agregarMantenimientoFirebase,
  actualizarMantenimientoFirebase,
  eliminarMantenimientoFirebase,
} from "../firebase/mantenimientosUnidadesService";
import { TIPOS_MANTENIMIENTO, type TipoMantenimiento } from "../utils/unidadesUtils";
import {
  notificarExito,
  notificarError,
  notificarAdvertencia,
  confirmar,
} from "../utils/notificaciones";
import {
  Wrench,
  Plus,
  Save,
  X,
  Edit2,
  Trash2,
  Loader2,
  ShieldAlert,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface PanelMantenimientosUnidadesProps {
  unidades: any[];
  mantenimientos: any[];
}

const ITEMS_POR_PAGINA = 10;

export default function PanelMantenimientosUnidades({
  unidades,
  mantenimientos,
}: PanelMantenimientosUnidadesProps) {
  const queryClient = useQueryClient();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [unidadId, setUnidadId] = useState("");
  const [tipo, setTipo] = useState<TipoMantenimiento>("Preventivo");
  const [descripcion, setDescripcion] = useState("");
  const [taller, setTaller] = useState("");
  const [costo, setCosto] = useState<number | "">("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");

  const [busqueda, setBusqueda] = useState("");
  const [paginaActual, setPaginaActual] = useState(1);

  const hoyStr = new Date().toLocaleDateString("sv-SE");

  const limpiarFormulario = () => {
    setEditingId(null);
    setUnidadId("");
    setTipo("Preventivo");
    setDescripcion("");
    setTaller("");
    setCosto("");
    setFechaInicio("");
    setFechaFin("");
  };

  const agregarMutation = useMutation({
    mutationFn: agregarMantenimientoFirebase,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mantenimientosUnidades"] });
      limpiarFormulario();
      notificarExito("¡Mantenimiento programado!");
    },
    onError: () => notificarError("Error al programar el mantenimiento."),
  });

  const actualizarMutation = useMutation({
    mutationFn: (data: any) => actualizarMantenimientoFirebase(editingId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mantenimientosUnidades"] });
      limpiarFormulario();
      notificarExito("¡Mantenimiento actualizado!");
    },
    onError: () => notificarError("Error al actualizar el mantenimiento."),
  });

  const eliminarMutation = useMutation({
    mutationFn: eliminarMantenimientoFirebase,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mantenimientosUnidades"] });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const unidad = unidades.find((u: any) => u.id === unidadId);
    if (!unidad) return notificarAdvertencia("Selecciona una unidad.");
    if (!descripcion.trim())
      return notificarAdvertencia("Describe el mantenimiento.");
    if (!fechaInicio || !fechaFin)
      return notificarAdvertencia("Completa la fecha de inicio y fin.");
    if (fechaFin < fechaInicio)
      return notificarAdvertencia(
        "La fecha de fin no puede ser anterior a la de inicio.",
      );

    const dataToSend = {
      unidad_id: unidad.id,
      unidad_numero: unidad.numero,
      tipo,
      descripcion: descripcion.trim(),
      taller: taller.trim(),
      costo: costo === "" ? 0 : Number(costo),
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin,
    };

    if (editingId) {
      actualizarMutation.mutate(dataToSend);
    } else {
      agregarMutation.mutate(dataToSend);
    }
  };

  const handleEdit = (m: any) => {
    setEditingId(m.id);
    setUnidadId(m.unidad_id || "");
    setTipo(m.tipo || "Preventivo");
    setDescripcion(m.descripcion || "");
    setTaller(m.taller || "");
    setCosto(m.costo || "");
    setFechaInicio(m.fecha_inicio || "");
    setFechaFin(m.fecha_fin || "");
  };

  const mantenimientosOrdenados = useMemo(
    () =>
      [...mantenimientos].sort((a: any, b: any) =>
        (b.fecha_inicio || "").localeCompare(a.fecha_inicio || ""),
      ),
    [mantenimientos],
  );

  const mantenimientosFiltrados = useMemo(
    () =>
      mantenimientosOrdenados.filter((m: any) =>
        (m.unidad_numero || "")
          .toLowerCase()
          .includes(busqueda.toLowerCase()),
      ),
    [mantenimientosOrdenados, busqueda],
  );

  useEffect(() => {
    setPaginaActual(1);
  }, [busqueda]);

  const totalPaginas =
    Math.ceil(mantenimientosFiltrados.length / ITEMS_POR_PAGINA) || 1;
  const mantenimientosPaginados = mantenimientosFiltrados.slice(
    (paginaActual - 1) * ITEMS_POR_PAGINA,
    paginaActual * ITEMS_POR_PAGINA,
  );

  const unidadesOrdenadas = useMemo(
    () =>
      [...unidades].sort((a: any, b: any) =>
        (a.numero || "").localeCompare(b.numero || "", undefined, {
          numeric: true,
        }),
      ),
    [unidades],
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* FORMULARIO DE PROGRAMACIÓN */}
      <div className="lg:col-span-1 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 h-fit sticky top-6">
        <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-5 flex items-center gap-2">
          <Wrench size={18} className="text-orange-600 dark:text-orange-400" />{" "}
          {editingId ? "Editar Mantenimiento" : "Programar Mantenimiento"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Unidad
            </label>
            <select
              value={unidadId}
              onChange={(e) => setUnidadId(e.target.value)}
              className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-slate-800 dark:text-slate-100"
              required
            >
              <option value="">Selecciona una unidad</option>
              {unidadesOrdenadas.map((u: any) => (
                <option key={u.id} value={u.id}>
                  {u.numero} {u.tipo ? `— ${u.tipo}` : ""}
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
              onChange={(e) => setTipo(e.target.value as TipoMantenimiento)}
              className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-slate-800 dark:text-slate-100 cursor-pointer"
              required
            >
              {TIPOS_MANTENIMIENTO.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Descripción
            </label>
            <input
              type="text"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Ej. Cambio de frenos"
              className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-800 dark:text-slate-100"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Del
              </label>
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
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
                onChange={(e) => setFechaFin(e.target.value)}
                className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-800 dark:text-slate-100"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Taller (opcional)
            </label>
            <input
              type="text"
              value={taller}
              onChange={(e) => setTaller(e.target.value)}
              placeholder="Ej. Taller Hernández"
              className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-800 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Costo (opcional)
            </label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={costo}
              onChange={(e) =>
                setCosto(e.target.value === "" ? "" : Number(e.target.value))
              }
              placeholder="0.00"
              className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-800 dark:text-slate-100"
            />
          </div>

          <div className="pt-2 flex flex-col gap-2">
            <button
              type="submit"
              disabled={agregarMutation.isPending || actualizarMutation.isPending}
              className={`w-full text-white font-bold py-3.5 rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer text-sm ${editingId ? "bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300" : "bg-orange-600 hover:bg-orange-700 disabled:bg-orange-300"}`}
            >
              {agregarMutation.isPending || actualizarMutation.isPending ? (
                <>
                  <Loader2 size={18} className="animate-spin" /> Guardando...
                </>
              ) : editingId ? (
                <>
                  <Save size={18} /> Actualizar Mantenimiento
                </>
              ) : (
                <>
                  <Plus size={18} /> Programar Mantenimiento
                </>
              )}
            </button>

            {editingId && (
              <button
                type="button"
                onClick={limpiarFormulario}
                className="w-full bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer text-sm"
              >
                <X size={18} /> Cancelar Edición
              </button>
            )}
          </div>
        </form>
      </div>

      {/* HISTORIAL DE MANTENIMIENTOS */}
      <div className="lg:col-span-3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col">
        <div className="p-5 border-b border-slate-100 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
            Historial de Mantenimientos
          </h2>
          <div className="relative w-full sm:w-64">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
              size={16}
            />
            <input
              type="text"
              placeholder="Buscar por número de unidad..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-700 dark:text-slate-200 shadow-sm"
            />
          </div>
        </div>

        <div className="flex-1 overflow-x-auto">
          {mantenimientosFiltrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-16 text-center text-slate-400 dark:text-slate-500">
              <ShieldAlert size={40} className="mb-3 opacity-30" />
              <p className="font-semibold text-sm">
                {mantenimientos.length === 0
                  ? "No hay mantenimientos programados."
                  : "No se encontraron mantenimientos para esa unidad."}
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest bg-slate-50/50 dark:bg-slate-900/50">
                  <th className="p-4 pl-6">Unidad</th>
                  <th className="p-4 text-center">Tipo</th>
                  <th className="p-4">Descripción</th>
                  <th className="p-4">Taller</th>
                  <th className="p-4 text-center">Costo</th>
                  <th className="p-4 text-center">Del</th>
                  <th className="p-4 text-center">Al</th>
                  <th className="p-4 text-center pr-6">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-sm">
                {mantenimientosPaginados.map((m: any) => {
                  const enCurso =
                    m.fecha_inicio <= hoyStr && hoyStr <= m.fecha_fin;
                  return (
                    <tr
                      key={m.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-900/40 transition-colors group"
                    >
                      <td className="p-4 pl-6 font-bold text-slate-800 dark:text-slate-100">
                        {m.unidad_numero}
                        {enCurso && (
                          <span className="ml-2 text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-300 tracking-wider">
                            En curso
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full tracking-wider border bg-slate-50 dark:bg-slate-900/40 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700">
                          {m.tipo || "Preventivo"}
                        </span>
                      </td>
                      <td className="p-4 text-slate-600 dark:text-slate-300">
                        {m.descripcion}
                      </td>
                      <td className="p-4 text-slate-500 dark:text-slate-400">
                        {m.taller || "-"}
                      </td>
                      <td className="p-4 text-center font-semibold text-slate-700 dark:text-slate-200">
                        {m.costo ? `$${Number(m.costo).toLocaleString("es-MX")}` : "-"}
                      </td>
                      <td className="p-4 text-center text-slate-600 dark:text-slate-300 font-medium">
                        {m.fecha_inicio}
                      </td>
                      <td className="p-4 text-center text-slate-600 dark:text-slate-300 font-medium">
                        {m.fecha_fin}
                      </td>
                      <td className="p-4 pr-6">
                        <div className="flex items-center justify-center gap-1 opacity-100 lg:opacity-50 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleEdit(m)}
                            className="p-2 text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={async () => {
                              const ok = await confirmar({
                                mensaje: `¿Eliminar este mantenimiento de la unidad ${m.unidad_numero}?`,
                                peligroso: true,
                                textoConfirmar: "Eliminar",
                              });
                              if (ok) eliminarMutation.mutate(m.id);
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

        {mantenimientosFiltrados.length > 0 && (
          <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              Mostrando{" "}
              {Math.min(
                (paginaActual - 1) * ITEMS_POR_PAGINA + 1,
                mantenimientosFiltrados.length,
              )}{" "}
              a{" "}
              {Math.min(
                paginaActual * ITEMS_POR_PAGINA,
                mantenimientosFiltrados.length,
              )}{" "}
              de {mantenimientosFiltrados.length}
            </span>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setPaginaActual((p) => Math.max(1, p - 1))}
                disabled={paginaActual === 1}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={14} /> Anterior
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
                Siguiente <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
