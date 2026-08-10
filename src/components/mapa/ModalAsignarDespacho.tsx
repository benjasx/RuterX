import { X, Loader2, Send, Save } from "lucide-react";
import { LISTA_UNIDADES, LISTA_RUTAS } from "../../utils/mapaUtils";

interface Props {
  onClose: () => void;
  choferesDisponibles: any[];
  choferSeleccionado: string;
  setChoferSeleccionado: (val: string) => void;
  fechaViaje: string;
  setFechaViaje: (val: string) => void;
  nombreRuta: string;
  setNombreRuta: (val: string) => void;
  unidad: string;
  setUnidad: (val: string) => void;
  onConfirm: () => void;
  isPending: boolean;
  isEditing?: boolean; // 🚀 NUEVO: Saber si estamos editando
}

export default function ModalAsignarDespacho({
  onClose,
  choferesDisponibles,
  choferSeleccionado,
  setChoferSeleccionado,
  fechaViaje,
  setFechaViaje,
  nombreRuta,
  setNombreRuta,
  unidad,
  setUnidad,
  onConfirm,
  isPending,
  isEditing = false,
}: Props) {
  return (
    <div className="fixed inset-0 z-4000 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-slate-700/20">
        {/* ENCABEZADO */}
        <div
          className={`text-white px-5 py-4 flex items-center justify-between ${isEditing ? "bg-indigo-600" : "bg-slate-900"}`}
        >
          <h2 className="text-lg font-bold flex items-center gap-2">
            {isEditing ? <Save size={18} /> : <Send size={18} />}
            {isEditing ? "Actualizar Despacho" : "Asignar Despacho"}
          </h2>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* CUERPO DEL MODAL */}
        <div className="p-6 space-y-4">
          <div className="col-span-2">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Nombre de la Ruta
            </label>
            <select
              value={nombreRuta}
              onChange={(e) => setNombreRuta(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 bg-white cursor-pointer font-semibold text-slate-800"
            >
              <option value="" disabled>
                Selecciona una ruta...
              </option>
              {LISTA_RUTAS.map((ruta, i) => (
                <option key={i} value={ruta}>
                  {ruta}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Chofer Responsable
              </label>
              <select
                value={choferSeleccionado}
                onChange={(e) => setChoferSeleccionado(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 bg-white cursor-pointer"
              >
                {choferesDisponibles.map((c, i) => (
                  <option key={i} value={c.email || c.correo}>
                    {c.nombre} ({c.email || c.correo})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Unidad Asignada
              </label>
              <select
                value={unidad}
                onChange={(e) => setUnidad(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 bg-white cursor-pointer font-semibold"
              >
                {LISTA_UNIDADES.map((u, i) => (
                  <option key={i} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Fecha de Salida
              </label>
              <input
                type="date"
                value={fechaViaje}
                onChange={(e) => setFechaViaje(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>
          </div>

          {/* BOTÓN CONFIRMAR */}
          <button
            onClick={onConfirm}
            disabled={isPending}
            className={`w-full text-white font-bold py-3 rounded-xl transition-colors mt-4 flex items-center justify-center gap-2 shadow-sm ${
              isPending
                ? "bg-slate-400 cursor-not-allowed"
                : isEditing
                  ? "bg-indigo-600 hover:bg-indigo-700 cursor-pointer"
                  : "bg-blue-600 hover:bg-blue-700 cursor-pointer"
            }`}
          >
            {isPending ? (
              <Loader2 size={18} className="animate-spin" />
            ) : isEditing ? (
              <Save size={18} />
            ) : (
              <Send size={18} />
            )}
            {isPending
              ? "Guardando..."
              : isEditing
                ? "Actualizar Ruta"
                : "Confirmar y Enviar"}
          </button>
        </div>
      </div>
    </div>
  );
}
