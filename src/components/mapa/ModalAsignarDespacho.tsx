import { Send, X, Loader2 } from "lucide-react";

export default function ModalAsignarDespacho({
  onClose,
  choferesDisponibles,
  choferSeleccionado,
  setChoferSeleccionado,
  fechaViaje,
  setFechaViaje,
  onConfirm,
  isPending,
}: any) {
  return (
    <div className="fixed inset-0 z-9999 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-200">
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <Send size={18} className="text-blue-400" /> Asignar Despacho
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
              Chofer Responsable
            </label>
            <select
              value={choferSeleccionado}
              onChange={(e) => setChoferSeleccionado(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 font-medium cursor-pointer"
            >
              {choferesDisponibles.length > 0 ? (
                choferesDisponibles.map((chofer: any) => {
                  const valorEmail = chofer.email || chofer.correo;
                  const textoMostrar = chofer.nombre
                    ? `${chofer.nombre} (${valorEmail})`
                    : valorEmail;
                  return (
                    <option key={chofer.id} value={valorEmail}>
                      {textoMostrar}
                    </option>
                  );
                })
              ) : (
                <option value="" disabled>
                  No hay choferes registrados
                </option>
              )}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
              Fecha de Salida
            </label>
            <input
              type="date"
              value={fechaViaje}
              onChange={(e) => setFechaViaje(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 font-medium"
            />
          </div>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-3 rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2 mt-2 cursor-pointer"
          >
            {isPending ? (
              <>
                <Loader2 size={18} className="animate-spin" /> Procesando...
              </>
            ) : (
              <>
                <Send size={18} /> Confirmar y Enviar
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
