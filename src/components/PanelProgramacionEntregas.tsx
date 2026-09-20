import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase/config";
import {
  DIAS_PROGRAMACION,
  obtenerProgramacionFirebase,
  agregarFilaProgramacionFirebase,
  actualizarFilaProgramacionFirebase,
  eliminarFilaProgramacionFirebase,
  type DiaProgramacion,
  type FilaProgramacionEntrega,
} from "../firebase/programacionEntregasService";
import { LISTA_RUTAS } from "../utils/mapaUtils";
import { exportarProgramacionEntregasPDF } from "../utils/reportesProgramacionEntregasUtils";
import {
  notificarExito,
  notificarError,
  notificarAdvertencia,
  confirmar,
} from "../utils/notificaciones";
import {
  CalendarClock,
  PlusCircle,
  Loader2,
  Trash2,
  Save,
  X,
  ArrowUp,
  ArrowDown,
  Pencil,
  FileText,
} from "lucide-react";

const fMoneda = (n: number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(n);

interface FormularioDia {
  ruta: string;
  monto: string;
}

export default function PanelProgramacionEntregas() {
  const queryClient = useQueryClient();

  const { data: filas = [], isLoading } = useQuery({
    queryKey: ["programacionEntregas"],
    queryFn: obtenerProgramacionFirebase,
  });

  // Escucha en vivo: si alguien más agrega/edita/elimina una fila mientras
  // este panel está abierto, la caché se actualiza sola, sin toast (mismo
  // patrón que AdminUnidades.tsx, ver specs/06-programacion-entregas.md).
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "programacionEntregas"),
      (snapshot) => {
        const docs = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as FilaProgramacionEntrega[];
        queryClient.setQueryData(["programacionEntregas"], docs);
      },
    );
    return () => unsub();
  }, [queryClient]);

  const [formularios, setFormularios] = useState<
    Record<string, FormularioDia>
  >({});
  const getFormulario = (dia: string): FormularioDia =>
    formularios[dia] || { ruta: "", monto: "" };
  const setFormulario = (dia: string, datos: Partial<FormularioDia>) =>
    setFormularios((prev) => ({
      ...prev,
      [dia]: { ...getFormulario(dia), ...datos },
    }));

  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [montoEditado, setMontoEditado] = useState("");

  const agregarMutation = useMutation({
    mutationFn: agregarFilaProgramacionFirebase,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["programacionEntregas"] });
      notificarExito("Ruta agregada a la programación.");
    },
    onError: () => notificarError("Error al agregar la fila."),
  });

  const actualizarMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<Pick<FilaProgramacionEntrega, "monto_minimo" | "orden">>;
    }) => actualizarFilaProgramacionFirebase(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["programacionEntregas"] });
    },
    onError: () => notificarError("Error al actualizar la fila."),
  });

  const eliminarMutation = useMutation({
    mutationFn: eliminarFilaProgramacionFirebase,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["programacionEntregas"] });
      notificarExito("Fila eliminada.");
    },
    onError: () => notificarError("Error al eliminar la fila."),
  });

  const filasPorDia = (dia: DiaProgramacion) =>
    filas.filter((f) => f.dia === dia).sort((a, b) => a.orden - b.orden);

  const handleAgregar = (dia: DiaProgramacion) => {
    const form = getFormulario(dia);
    if (!form.ruta) return notificarAdvertencia("Selecciona una ruta.");
    const monto = Number(form.monto);
    if (form.monto.trim() === "" || Number.isNaN(monto) || monto < 0)
      return notificarAdvertencia("Captura un monto mínimo válido.");

    const filasDelDia = filasPorDia(dia);
    const ordenMax =
      filasDelDia.length > 0
        ? Math.max(...filasDelDia.map((f) => f.orden))
        : 0;

    agregarMutation.mutate({
      dia,
      ruta_nombre: form.ruta.toUpperCase(),
      monto_minimo: monto,
      orden: ordenMax + 1,
    });
    setFormulario(dia, { ruta: "", monto: "" });
  };

  const handleEditarMonto = (fila: FilaProgramacionEntrega) => {
    setEditandoId(fila.id!);
    setMontoEditado(String(fila.monto_minimo));
  };

  const handleGuardarMonto = (fila: FilaProgramacionEntrega) => {
    const monto = Number(montoEditado);
    if (montoEditado.trim() === "" || Number.isNaN(monto) || monto < 0)
      return notificarAdvertencia("Captura un monto mínimo válido.");
    actualizarMutation.mutate({
      id: fila.id!,
      data: { monto_minimo: monto },
    });
    setEditandoId(null);
  };

  const handleEliminar = async (fila: FilaProgramacionEntrega) => {
    const ok = await confirmar({
      mensaje: `¿Eliminar "${fila.ruta_nombre}" de ${fila.dia}?`,
      textoConfirmar: "Eliminar",
      peligroso: true,
    });
    if (ok) eliminarMutation.mutate(fila.id!);
  };

  const handleMover = (
    dia: DiaProgramacion,
    fila: FilaProgramacionEntrega,
    direccion: "arriba" | "abajo",
  ) => {
    const filasDelDia = filasPorDia(dia);
    const index = filasDelDia.findIndex((f) => f.id === fila.id);
    const indexVecino = direccion === "arriba" ? index - 1 : index + 1;
    if (indexVecino < 0 || indexVecino >= filasDelDia.length) return;

    const vecino = filasDelDia[indexVecino];
    actualizarMutation.mutate({ id: fila.id!, data: { orden: vecino.orden } });
    actualizarMutation.mutate({ id: vecino.id!, data: { orden: fila.orden } });
  };

  const handleExportarPDF = () => {
    const filasAgrupadas = Object.fromEntries(
      DIAS_PROGRAMACION.map((dia) => [dia, filasPorDia(dia)]),
    ) as Record<DiaProgramacion, FilaProgramacionEntrega[]>;
    const fecha = new Date().toLocaleDateString("sv-SE");
    exportarProgramacionEntregasPDF(filasAgrupadas, fecha);
  };

  return (
    <div className="w-full bg-slate-50/50 dark:bg-slate-900/50 p-6 rounded-xl flex flex-col h-full overflow-y-auto custom-scrollbar">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6 pb-4 border-b border-slate-200 dark:border-slate-700">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-3">
            <CalendarClock
              className="text-blue-600 dark:text-blue-400"
              size={28}
            />
            Programación de Entregas
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">
            Monto mínimo de venta por ruta para poder despachar, organizado
            por día de la semana.
          </p>
        </div>

        <button
          onClick={handleExportarPDF}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors"
        >
          <FileText size={16} /> Exportar PDF
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-full p-16 text-slate-400 dark:text-slate-500 gap-3 font-medium">
          <Loader2 className="animate-spin" size={24} /> Cargando
          programación...
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 gap-4">
          {DIAS_PROGRAMACION.map((dia) => {
            const filasDelDia = filasPorDia(dia);
            const form = getFormulario(dia);

            return (
              <div
                key={dia}
                className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden"
              >
                <div className="p-3 bg-slate-800 dark:bg-slate-900 text-center">
                  <h2 className="text-sm font-black text-white uppercase tracking-wider">
                    {dia}
                  </h2>
                </div>

                <div className="flex-1 divide-y divide-slate-100 dark:divide-slate-700">
                  {filasDelDia.length === 0 ? (
                    <p className="p-4 text-xs text-center text-slate-400 dark:text-slate-500 font-medium">
                      Sin rutas programadas.
                    </p>
                  ) : (
                    filasDelDia.map((fila, index) => (
                      <div key={fila.id} className="p-3 group">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                          {fila.ruta_nombre}
                        </p>

                        {editandoId === fila.id ? (
                          <div className="flex items-center gap-1 mt-1.5">
                            <input
                              type="number"
                              min={0}
                              value={montoEditado}
                              onChange={(e) => setMontoEditado(e.target.value)}
                              autoFocus
                              className="w-full p-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-slate-800 dark:text-slate-100"
                            />
                            <button
                              onClick={() => handleGuardarMonto(fila)}
                              className="p-1.5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg transition-colors"
                              title="Guardar"
                            >
                              <Save size={14} />
                            </button>
                            <button
                              onClick={() => setEditandoId(null)}
                              className="p-1.5 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                              title="Cancelar"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                              {fMoneda(fila.monto_minimo)}
                            </span>
                            <div className="flex items-center gap-0.5 opacity-100 lg:opacity-50 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => handleMover(dia, fila, "arriba")}
                                disabled={index === 0}
                                className="p-1 text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 disabled:opacity-30 disabled:cursor-not-allowed rounded transition-colors"
                                title="Subir"
                              >
                                <ArrowUp size={14} />
                              </button>
                              <button
                                onClick={() => handleMover(dia, fila, "abajo")}
                                disabled={index === filasDelDia.length - 1}
                                className="p-1 text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 disabled:opacity-30 disabled:cursor-not-allowed rounded transition-colors"
                                title="Bajar"
                              >
                                <ArrowDown size={14} />
                              </button>
                              <button
                                onClick={() => handleEditarMonto(fila)}
                                className="p-1 text-slate-400 dark:text-slate-500 hover:text-amber-600 dark:hover:text-amber-400 rounded transition-colors"
                                title="Editar monto"
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                onClick={() => handleEliminar(fila)}
                                className="p-1 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 rounded transition-colors"
                                title="Eliminar"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>

                <div className="p-3 border-t border-slate-100 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/50 space-y-2">
                  <select
                    value={form.ruta}
                    onChange={(e) =>
                      setFormulario(dia, { ruta: e.target.value })
                    }
                    className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-slate-800 dark:text-slate-100"
                  >
                    <option value="">Selecciona una ruta...</option>
                    {LISTA_RUTAS.map((nombreRuta) => (
                      <option key={nombreRuta} value={nombreRuta}>
                        {nombreRuta.toUpperCase()}
                      </option>
                    ))}
                  </select>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min={0}
                      placeholder="Monto mínimo"
                      value={form.monto}
                      onChange={(e) =>
                        setFormulario(dia, { monto: e.target.value })
                      }
                      className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-800 dark:text-slate-100"
                    />
                    <button
                      onClick={() => handleAgregar(dia)}
                      disabled={agregarMutation.isPending}
                      className="shrink-0 p-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors cursor-pointer"
                      title="Agregar ruta"
                    >
                      <PlusCircle size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
