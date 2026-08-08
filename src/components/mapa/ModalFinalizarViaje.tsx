import { Flag, X, Loader2 } from "lucide-react";
import { LISTA_RUTAS, LISTA_UNIDADES } from "../../utils/mapaUtils";

export default function ModalFinalizarViaje({
  onClose,
  rutaRealChofer,
  setRutaRealChofer,
  unidadChofer,
  setUnidadChofer,
  motivoFinalizacion,
  setMotivoFinalizacion,
  foliosNoEmbarcados,
  setFoliosNoEmbarcados,
  onConfirm,
  isPending,
}: any) {
  return (
    <div className="fixed inset-0 z-9999 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200">
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <Flag size={18} className="text-blue-400" /> Finalizar Recorrido
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-sm text-slate-600 font-medium">
            Confirma los datos finales de la ruta para generar tu reporte de
            cierre.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                Ruta Realizada
              </label>
              <select
                value={rutaRealChofer}
                onChange={(e) => setRutaRealChofer(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 font-medium cursor-pointer text-sm"
              >
                {LISTA_RUTAS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                Unidad
              </label>
              <select
                value={unidadChofer}
                onChange={(e) => setUnidadChofer(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 font-medium cursor-pointer text-sm"
              >
                {LISTA_UNIDADES.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
              Motivo de cierre
            </label>
            <select
              value={motivoFinalizacion}
              onChange={(e) => setMotivoFinalizacion(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 font-medium cursor-pointer text-sm"
            >
              <option value="Término de recorrido">
                Término de recorrido (Ruta completa)
              </option>
              <option value="Falla en la unidad">
                Falla mecánica en la unidad
              </option>
              <option value="Corte de turno / Fin de horario">
                Corte de turno / Fin de horario
              </option>
              <option value="Emergencia médica / Accidente">
                Emergencia / Accidente
              </option>
              <option value="Clima extremo / Bloqueos">
                Clima extremo / Camino bloqueado
              </option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
              Folios no embarcados (Opcional)
            </label>
            <textarea
              value={foliosNoEmbarcados}
              onChange={(e) => setFoliosNoEmbarcados(e.target.value)}
              placeholder="Ej. B1045678, B109556, B987654..."
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 font-medium text-sm resize-none h-16"
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
                <Flag size={18} /> Confirmar Cierre y Descargar PDF
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
