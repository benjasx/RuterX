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
  viajesAsignadosHoy?: any[];
  cargarViajeAsignado?: (viaje: any) => void;
  limpiarEdicion?: () => void; // 🚀 NUEVO
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
  viajesAsignadosHoy,
  cargarViajeAsignado,
  limpiarEdicion,
}: PanelLateralProps) {
  return (
    <aside className="w-80 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 p-4 flex flex-col shrink-0">
      {viajesAsignadosHoy && viajesAsignadosHoy.length > 0 && (
        <select
          onChange={(e) => {
            if (!cargarViajeAsignado || !limpiarEdicion) return;
            if (e.target.value === "") {
              limpiarEdicion(); // Si selecciona la opcion vacía, salimos del modo edición
              return;
            }
            const viaje = viajesAsignadosHoy.find(
              (v: any) => v.id === e.target.value,
            );
            if (viaje) cargarViajeAsignado(viaje);
          }}
          className="w-full p-2 mb-4 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-lg text-indigo-700 dark:text-indigo-300 font-bold text-xs focus:ring-2 focus:ring-indigo-500 cursor-pointer outline-none shadow-sm"
        >
          <option value="">👁️ Ver ruta despachada de hoy...</option>
          {viajesAsignadosHoy.map((v: any) => (
            <option key={v.id} value={v.id}>
              {v.ruta_nombre} (U-{v.unidad_utilizada || "?"})
            </option>
          ))}
        </select>
      )}

      <h3 className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3 px-2">
        Seleccionar Ruta
      </h3>

      <select
        value={rutaSeleccionada}
        onChange={(e) => {
          setCentroMapa(null);
          setRutaSeleccionada(e.target.value);
          if (limpiarEdicion) limpiarEdicion(); // 🚀 Cancelamos el modo edición al elegir una ruta nueva
        }}
        className="w-full p-3 mb-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 font-medium focus:ring-2 focus:ring-blue-500 cursor-pointer outline-none"
      >
        {rutasDisponibles.map((ruta) => (
          <option key={ruta.id} value={ruta.nombre}>
            {ruta.nombre}
          </option>
        ))}
      </select>

      <div className="flex items-center justify-between mb-3 px-1">
        <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">
          <span className="text-blue-600 dark:text-blue-400 font-bold">
            {selectedClienteIds.length}
          </span>{" "}
          de{" "}
          <span className="text-slate-800 dark:text-slate-200 font-bold">
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
            className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-blue-300 dark:hover:border-blue-600 transition-colors cursor-pointer"
          >
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                {cliente.nombre}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
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

      <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex flex-col gap-2 shrink-0">
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
                className="flex-1 flex items-center justify-center gap-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold py-2.5 rounded-lg transition-colors text-sm cursor-pointer"
              >
                <Download size={16} /> Excel
              </button>
              <button
                onClick={exportarPDF}
                className="flex-1 flex items-center justify-center gap-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold py-2.5 rounded-lg transition-colors text-sm cursor-pointer"
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
