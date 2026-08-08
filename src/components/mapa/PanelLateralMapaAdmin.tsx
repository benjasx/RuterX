import { Route, Send, Download, FileText, Loader2 } from "lucide-react";

interface PanelLateralProps {
  rutaSeleccionada: string;
  setRutaSeleccionada: (ruta: string) => void;
  rutasDisponibles: any[];
  clientesDeRuta: any[];
  selectedClienteIds: string[];
  toggleCliente: (id: string) => void;
  seleccionarTodos: () => void;
  deseleccionarTodos: () => void;
  rutaOptima: any[] | null;
  trazarRutaOptima: () => void;
  cargandoRuta: boolean;
  setMostrarModalDespacho: (val: boolean) => void;
  exportarExcel: () => void;
  exportarPDF: () => void;
  setCentroMapa: (val: null) => void;
}

export default function PanelLateralMapaAdmin({
  rutaSeleccionada,
  setRutaSeleccionada,
  rutasDisponibles,
  clientesDeRuta,
  selectedClienteIds,
  toggleCliente,
  seleccionarTodos,
  deseleccionarTodos,
  rutaOptima,
  trazarRutaOptima,
  cargandoRuta,
  setMostrarModalDespacho,
  exportarExcel,
  exportarPDF,
  setCentroMapa,
}: PanelLateralProps) {
  return (
    <aside className="w-80 bg-white rounded-xl shadow-sm border border-slate-100 p-4 flex flex-col shrink-0">
      <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 px-2">
        Seleccionar Ruta
      </h3>
      <select
        value={rutaSeleccionada}
        onChange={(e) => {
          setCentroMapa(null);
          setRutaSeleccionada(e.target.value);
        }}
        className="w-full p-3 mb-4 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium focus:ring-2 focus:ring-blue-500 cursor-pointer outline-none"
      >
        {rutasDisponibles.map((ruta) => (
          <option key={ruta.id} value={ruta.nombre}>
            {ruta.nombre}
          </option>
        ))}
      </select>

      <div className="flex items-center justify-between mb-3 px-1">
        <span className="text-sm text-slate-500 font-medium">
          <span className="text-blue-600 font-bold">
            {selectedClienteIds.length}
          </span>{" "}
          de{" "}
          <span className="text-slate-800 font-bold">
            {clientesDeRuta.length}
          </span>
        </span>
        <div className="flex gap-2">
          <button
            onClick={seleccionarTodos}
            className="text-xs text-blue-600 font-semibold underline cursor-pointer"
          >
            Todos
          </button>
          <button
            onClick={deseleccionarTodos}
            className="text-xs text-red-500 font-semibold underline cursor-pointer"
          >
            Ninguno
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 space-y-2 custom-scrollbar mb-4">
        {clientesDeRuta.map((cliente) => (
          <label
            key={cliente.id}
            className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg hover:border-blue-300 transition-colors cursor-pointer"
          >
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-slate-800">
                {cliente.nombre}
              </span>
              <span className="text-xs text-slate-500">
                {cliente.descripcion}
              </span>
            </div>
            <input
              type="checkbox"
              checked={selectedClienteIds.includes(cliente.id)}
              onChange={() => toggleCliente(cliente.id)}
              className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
          </label>
        ))}
      </div>

      <div className="pt-4 border-t border-slate-100 flex flex-col gap-2 shrink-0">
        {!rutaOptima ? (
          <button
            onClick={trazarRutaOptima}
            disabled={selectedClienteIds.length < 2 || cargandoRuta}
            className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-bold py-3 rounded-lg transition-colors shadow-sm cursor-pointer"
          >
            {cargandoRuta ? (
              <>
                <Loader2 size={18} className="animate-spin" /> Generando...
              </>
            ) : (
              <>
                <Route size={18} /> Trazar Ruta Óptima
              </>
            )}
          </button>
        ) : (
          <>
            <button
              onClick={() => setMostrarModalDespacho(true)}
              className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-lg transition-colors shadow-sm mb-2 shadow-emerald-600/30 cursor-pointer"
            >
              <Send size={18} /> Asignar a Chofer
            </button>
            <div className="flex gap-2">
              <button
                onClick={exportarExcel}
                className="flex-1 flex items-center justify-center gap-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-2.5 rounded-lg transition-colors text-sm cursor-pointer"
              >
                <Download size={16} /> Excel
              </button>
              <button
                onClick={exportarPDF}
                className="flex-1 flex items-center justify-center gap-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-2.5 rounded-lg transition-colors text-sm cursor-pointer"
              >
                <FileText size={16} /> PDF
              </button>
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
