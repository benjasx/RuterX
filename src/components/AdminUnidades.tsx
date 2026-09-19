import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  obtenerUnidadesFirebase,
  agregarUnidadFirebase,
  actualizarUnidadFirebase,
} from "../firebase/unidadesService";
import { obtenerMantenimientosFirebase } from "../firebase/mantenimientosUnidadesService";
import { disponibilidadEfectiva } from "../utils/unidadesUtils";
import PanelMantenimientosUnidades from "./PanelMantenimientosUnidades";
import {
  notificarExito,
  notificarError,
  notificarAdvertencia,
} from "../utils/notificaciones";
import {
  Car,
  PlusCircle,
  Loader2,
  ShieldAlert,
  Edit2,
  X,
  Save,
  Search,
  ChevronLeft,
  ChevronRight,
  Wrench,
  Truck,
} from "lucide-react";

const ITEMS_POR_PAGINA = 10;

const claseDisponibilidadBadge = (disponibilidad: string): string => {
  switch (disponibilidad) {
    case "Disponible":
      return "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800";
    case "En mantenimiento":
      return "bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800";
    case "Fuera de servicio":
      return "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800";
    case "Baja":
      return "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700";
    default:
      return "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800";
  }
};

export default function AdminUnidades() {
  const queryClient = useQueryClient();

  const [pestana, setPestana] = useState<"unidades" | "mantenimientos">(
    "unidades",
  );

  // Estados del formulario
  const [editingId, setEditingId] = useState<string | null>(null);
  const [numero, setNumero] = useState("");
  const [tipo, setTipo] = useState("");
  const [capacidadKg, setCapacidadKg] = useState<number | "">("");
  const [capacidadM3, setCapacidadM3] = useState<number | "">("");
  const [estado, setEstado] = useState("Disponible");
  const [motivoFueraServicio, setMotivoFueraServicio] = useState("");

  const [busqueda, setBusqueda] = useState("");
  const [filtroDisponibilidad, setFiltroDisponibilidad] = useState("Todas");
  const [paginaActual, setPaginaActual] = useState(1);

  const { data: unidades = [], isLoading } = useQuery({
    queryKey: ["unidades"],
    queryFn: obtenerUnidadesFirebase,
  });

  const { data: mantenimientos = [] } = useQuery({
    queryKey: ["mantenimientosUnidades"],
    queryFn: obtenerMantenimientosFirebase,
  });

  const hoyStr = new Date().toLocaleDateString("sv-SE");
  const mantenimientosPorUnidad = (id: string) =>
    mantenimientos.filter((m: any) => m.unidad_id === id);

  const unidadesConDisponibilidad = unidades.map((u: any) => ({
    ...u,
    _disponibilidad: disponibilidadEfectiva(
      u,
      mantenimientosPorUnidad(u.id),
      hoyStr,
    ),
  }));

  const unidadesFiltradas = unidadesConDisponibilidad.filter((u: any) => {
    const coincideNumero = (u.numero || "")
      .toLowerCase()
      .includes(busqueda.toLowerCase());
    const coincideDisponibilidad =
      filtroDisponibilidad === "Todas" ||
      u._disponibilidad === filtroDisponibilidad;
    return coincideNumero && coincideDisponibilidad;
  });

  useEffect(() => {
    setPaginaActual(1);
  }, [busqueda, filtroDisponibilidad]);

  const totalPaginas =
    Math.ceil(unidadesFiltradas.length / ITEMS_POR_PAGINA) || 1;
  const unidadesPaginadas = unidadesFiltradas.slice(
    (paginaActual - 1) * ITEMS_POR_PAGINA,
    paginaActual * ITEMS_POR_PAGINA,
  );

  const limpiarFormulario = () => {
    setEditingId(null);
    setNumero("");
    setTipo("");
    setCapacidadKg("");
    setCapacidadM3("");
    setEstado("Disponible");
    setMotivoFueraServicio("");
  };

  const agregarMutation = useMutation({
    mutationFn: agregarUnidadFirebase,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["unidades"] });
      limpiarFormulario();
      notificarExito("¡Unidad registrada con éxito!");
    },
    onError: () => notificarError("Error al registrar la unidad."),
  });

  const actualizarMutation = useMutation({
    mutationFn: (data: any) => actualizarUnidadFirebase(editingId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["unidades"] });
      limpiarFormulario();
      notificarExito("¡Unidad actualizada correctamente!");
    },
    onError: () => notificarError("Error al actualizar la unidad."),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!numero.trim() || !tipo.trim())
      return notificarAdvertencia("Completa el número y el tipo de unidad.");
    if (capacidadKg === "" || capacidadM3 === "")
      return notificarAdvertencia("Completa ambas capacidades.");

    const numeroDuplicado = unidades.some(
      (u: any) =>
        u.id !== editingId &&
        u.estado !== "Baja" &&
        (u.numero || "").trim().toLowerCase() === numero.trim().toLowerCase(),
    );
    if (numeroDuplicado)
      return notificarAdvertencia(
        "Ya existe una unidad activa con ese número.",
      );

    const dataToSend = {
      numero: numero.trim(),
      tipo: tipo.trim(),
      capacidad_kg: Number(capacidadKg),
      capacidad_m3: Number(capacidadM3),
      estado,
      motivo_fuera_servicio:
        estado === "Fuera de servicio" ? motivoFueraServicio.trim() : "",
    };

    if (editingId) {
      actualizarMutation.mutate(dataToSend);
    } else {
      agregarMutation.mutate(dataToSend);
    }
  };

  const handleEdit = (u: any) => {
    setEditingId(u.id);
    setNumero(u.numero || "");
    setTipo(u.tipo || "");
    setCapacidadKg(u.capacidad_kg ?? "");
    setCapacidadM3(u.capacidad_m3 ?? "");
    setEstado(u.estado || "Disponible");
    setMotivoFueraServicio(u.motivo_fuera_servicio || "");
  };

  const unidadesOrdenadas = [...unidadesPaginadas].sort((a: any, b: any) =>
    (a.numero || "").localeCompare(b.numero || "", undefined, {
      numeric: true,
    }),
  );

  return (
    <div className="w-full bg-slate-50/50 dark:bg-slate-900/50 p-6 rounded-xl flex flex-col h-full overflow-y-auto custom-scrollbar">
      {/* Cabecera Principal */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6 pb-4 border-b border-slate-200 dark:border-slate-700">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-3">
            <Truck className="text-blue-600 dark:text-blue-400" size={28} />
            Gestión de Unidades
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">
            Administra los vehículos, su disponibilidad y sus mantenimientos
            programados.
          </p>
        </div>
      </div>

      {/* BARRA DE PESTAÑAS */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setPestana("unidades")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-colors cursor-pointer ${
            pestana === "unidades"
              ? "bg-blue-600 text-white shadow-sm"
              : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
          }`}
        >
          <Car size={16} /> Unidades
        </button>
        <button
          onClick={() => setPestana("mantenimientos")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-colors cursor-pointer ${
            pestana === "mantenimientos"
              ? "bg-orange-600 text-white shadow-sm"
              : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
          }`}
        >
          <Wrench size={16} /> Mantenimientos
        </button>
      </div>

      {pestana === "mantenimientos" ? (
        <PanelMantenimientosUnidades
          unidades={unidades}
          mantenimientos={mantenimientos}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* FORMULARIO DE REGISTRO/EDICIÓN */}
          <div className="lg:col-span-1 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 h-fit sticky top-6">
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-5 flex items-center gap-2">
              {editingId ? (
                <>
                  <Edit2 size={18} className="text-amber-500" /> Editando Unidad
                </>
              ) : (
                <>
                  <PlusCircle
                    size={18}
                    className="text-blue-600 dark:text-blue-400"
                  />{" "}
                  Nueva Unidad
                </>
              )}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Número de Unidad
                </label>
                <input
                  type="text"
                  value={numero}
                  onChange={(e) => setNumero(e.target.value)}
                  placeholder="Ej. 01"
                  className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-slate-800 dark:text-slate-100"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Tipo
                </label>
                <input
                  type="text"
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value)}
                  placeholder="Ej. Fotón, Isuzu"
                  className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-800 dark:text-slate-100"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    Capacidad (kg)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={capacidadKg}
                    onChange={(e) =>
                      setCapacidadKg(
                        e.target.value === "" ? "" : Number(e.target.value),
                      )
                    }
                    className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-800 dark:text-slate-100"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    Capacidad (m³)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={capacidadM3}
                    onChange={(e) =>
                      setCapacidadM3(
                        e.target.value === "" ? "" : Number(e.target.value),
                      )
                    }
                    className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-800 dark:text-slate-100"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Estado
                </label>
                <select
                  value={estado}
                  onChange={(e) => setEstado(e.target.value)}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-800 dark:text-slate-100 cursor-pointer uppercase"
                >
                  <option value="Disponible">Disponible</option>
                  <option value="Fuera de servicio">Fuera de servicio</option>
                  <option value="Baja">Baja</option>
                </select>
              </div>

              {estado === "Fuera de servicio" && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    Motivo (opcional)
                  </label>
                  <input
                    type="text"
                    value={motivoFueraServicio}
                    onChange={(e) => setMotivoFueraServicio(e.target.value)}
                    placeholder="Ej. Llanta ponchada"
                    className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-800 dark:text-slate-100"
                  />
                </div>
              )}

              <div className="pt-2 flex flex-col gap-2">
                <button
                  type="submit"
                  disabled={
                    agregarMutation.isPending || actualizarMutation.isPending
                  }
                  className={`w-full text-white font-bold py-3.5 rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer text-sm ${editingId ? "bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300" : "bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400"}`}
                >
                  {agregarMutation.isPending || actualizarMutation.isPending ? (
                    <>
                      <Loader2 size={18} className="animate-spin" /> Guardando...
                    </>
                  ) : editingId ? (
                    <>
                      <Save size={18} /> Actualizar Unidad
                    </>
                  ) : (
                    <>
                      <PlusCircle size={18} /> Registrar Unidad
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

          {/* TABLA DE UNIDADES Y CONTROLES */}
          <div className="lg:col-span-3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-100 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex flex-col">
                <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
                  Directorio de Unidades
                </h2>
                <span className="text-[10px] bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-black px-2.5 py-1 rounded-md tracking-widest w-fit mt-1.5 uppercase">
                  {unidadesFiltradas.length} Registros Encontrados
                </span>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="relative w-full sm:w-64">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
                    size={16}
                  />
                  <input
                    type="text"
                    placeholder="Buscar por número..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-700 dark:text-slate-200 shadow-sm"
                  />
                </div>

                <select
                  value={filtroDisponibilidad}
                  onChange={(e) => setFiltroDisponibilidad(e.target.value)}
                  className="w-full sm:w-auto px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-700 dark:text-slate-200 cursor-pointer shadow-sm"
                >
                  <option value="Todas">Todas las disponibilidades</option>
                  <option value="Disponible">Disponible</option>
                  <option value="En mantenimiento">En mantenimiento</option>
                  <option value="Fuera de servicio">Fuera de servicio</option>
                  <option value="Baja">Baja</option>
                </select>
              </div>
            </div>

            <div className="flex-1 overflow-x-auto min-h-100">
              {isLoading ? (
                <div className="flex items-center justify-center h-full p-16 text-slate-400 dark:text-slate-500 gap-3 font-medium">
                  <Loader2 className="animate-spin" size={24} /> Cargando
                  unidades...
                </div>
              ) : unidades.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full p-16 text-center text-slate-400 dark:text-slate-500">
                  <ShieldAlert size={48} className="mb-4 opacity-30" />
                  <p className="font-semibold text-base">
                    No hay unidades registradas todavía.
                  </p>
                </div>
              ) : unidadesFiltradas.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full p-16 text-center text-slate-400 dark:text-slate-500">
                  <Search size={48} className="mb-4 opacity-30" />
                  <p className="font-semibold text-base">
                    No se encontraron unidades.
                  </p>
                  <p className="text-sm mt-1">
                    Intenta con otro número o ajusta los filtros.
                  </p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700 text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest bg-slate-50/50 dark:bg-slate-900/50">
                      <th className="p-4 pl-6">Número</th>
                      <th className="p-4">Tipo</th>
                      <th className="p-4 text-center">Cap. (kg)</th>
                      <th className="p-4 text-center">Cap. (m³)</th>
                      <th className="p-4 text-center">Disponibilidad</th>
                      <th className="p-4 text-center pr-6">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-sm">
                    {unidadesOrdenadas.map((u: any) => (
                      <tr
                        key={u.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-900/50 transition-colors group"
                      >
                        <td className="p-4 pl-6 font-bold text-slate-800 dark:text-slate-100">
                          {u.numero}
                        </td>
                        <td className="p-4 font-medium text-slate-600 dark:text-slate-300">
                          {u.tipo}
                        </td>
                        <td className="p-4 text-center text-slate-600 dark:text-slate-300">
                          {u.capacidad_kg}
                        </td>
                        <td className="p-4 text-center text-slate-600 dark:text-slate-300">
                          {u.capacidad_m3}
                        </td>
                        <td className="p-4 text-center">
                          <span
                            className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full tracking-wider border ${claseDisponibilidadBadge(u._disponibilidad)}`}
                            title={u.motivo_fuera_servicio || undefined}
                          >
                            {u._disponibilidad}
                          </span>
                        </td>
                        <td className="p-4 pr-6">
                          <div className="flex items-center justify-center gap-2 opacity-100 lg:opacity-50 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleEdit(u)}
                              className="p-2 text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors"
                              title="Editar"
                            >
                              <Edit2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* FOOTER: CONTROLES DE PAGINACIÓN */}
            {unidadesFiltradas.length > 0 && (
              <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                  Mostrando{" "}
                  {Math.min(
                    (paginaActual - 1) * ITEMS_POR_PAGINA + 1,
                    unidadesFiltradas.length,
                  )}{" "}
                  a{" "}
                  {Math.min(
                    paginaActual * ITEMS_POR_PAGINA,
                    unidadesFiltradas.length,
                  )}{" "}
                  de {unidadesFiltradas.length}
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
      )}
    </div>
  );
}
