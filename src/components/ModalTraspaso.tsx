import { Users, X, Plus } from "lucide-react";

interface Props {
  mostrar: boolean;
  onClose: () => void;
  unidad: string;
  setUnidad: (val: string) => void;
  chofer: string;
  setChofer: (val: string) => void;
  ruta: string;
  setRuta: (val: string) => void;
  onConfirm: () => void;
}

export default function ModalTraspaso({
  mostrar,
  onClose,
  unidad,
  setUnidad,
  chofer,
  setChofer,
  ruta,
  setRuta,
  onConfirm,
}: Props) {
  if (!mostrar) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-slate-800 px-6 py-4 flex justify-between items-center">
          <h3 className="font-bold text-white tracking-wide flex items-center gap-2">
            <Users size={18} /> Agregar Traspaso
          </h3>
          <button onClick={onClose} className="text-slate-400 dark:text-slate-500 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4 bg-slate-50 dark:bg-slate-900">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
              Número de Unidad
            </label>
            <input
              type="text"
              placeholder="Ej. 17"
              value={unidad}
              onChange={(e) => setUnidad(e.target.value)}
              className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
              Nombre del Chofer
            </label>
            <input
              type="text"
              placeholder="Chofer..."
              value={chofer}
              onChange={(e) => setChofer(e.target.value)}
              className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm uppercase bg-white dark:bg-slate-800"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
              Ruta del Traspaso
            </label>
            <input
              type="text"
              placeholder="Vallarta..."
              value={ruta}
              onChange={(e) => setRuta(e.target.value)}
              className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm uppercase bg-white dark:bg-slate-800"
            />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 px-6 py-4 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 font-semibold rounded-lg text-xs"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-xs flex items-center gap-2"
          >
            <Plus size={14} /> Confirmar Traspaso
          </button>
        </div>
      </div>
    </div>
  );
}
