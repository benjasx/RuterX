import { useState, useEffect } from "react";
import { Settings, Save, Plus, Trash2, MapPin, Percent } from "lucide-react";
import {
  obtenerAjustesNomina,
  guardarAjustesNomina,
  type AjustesNomina,
} from "../firebase/ajustesNominaService";

export default function PanelAjustesNomina() {
  const [ajustes, setAjustes] = useState<AjustesNomina | null>(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  // Estados para el formulario de nueva ruta
  const [nuevaRuta, setNuevaRuta] = useState("");
  const [nuevoViatico, setNuevoViatico] = useState("");

  useEffect(() => {
    const cargarAjustes = async () => {
      const data = await obtenerAjustesNomina();
      setAjustes(data);
      setCargando(false);
    };
    cargarAjustes();
  }, []);

  const handleGuardarTodo = async () => {
    if (!ajustes) return;
    setGuardando(true);
    const exito = await guardarAjustesNomina(ajustes);
    if (exito) alert("Ajustes de nómina guardados correctamente en la nube.");
    else alert("Hubo un error al guardar los ajustes.");
    setGuardando(false);
  };

  const handleAgregarRuta = () => {
    if (!nuevaRuta.trim() || !nuevoViatico) return;
    const rutaMayus = nuevaRuta.toUpperCase().trim();

    setAjustes((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        viaticosRutas: {
          ...prev.viaticosRutas,
          [rutaMayus]: Number(nuevoViatico),
        },
      };
    });
    setNuevaRuta("");
    setNuevoViatico("");
  };

  const handleEliminarRuta = (ruta: string) => {
    setAjustes((prev) => {
      if (!prev) return prev;
      const nuevasRutas = { ...prev.viaticosRutas };
      delete nuevasRutas[ruta];
      return { ...prev, viaticosRutas: nuevasRutas };
    });
  };

  if (cargando || !ajustes) {
    return (
      <div className="p-10 text-slate-500">
        Cargando configuración de nómina...
      </div>
    );
  }

  return (
    <div className="w-full bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-full overflow-y-auto">
      <div className="flex items-center gap-2 mb-6">
        <Settings className="text-blue-600" size={24} />
        <h2 className="text-xl font-bold text-slate-800">
          Reglas de Nómina y Viáticos
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* --- PANEL IZQUIERDO: COMISIONES --- */}
        <div className="space-y-6">
          <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
            <h3 className="text-sm font-bold text-slate-700 uppercase flex items-center gap-2 mb-4">
              <Percent size={16} /> Porcentajes de Comisión
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">
                  Comisión para Chofer (Ej. 0.00075)
                </label>
                <input
                  type="number"
                  step="0.00001"
                  value={ajustes.comisionChofer}
                  onChange={(e) =>
                    setAjustes({
                      ...ajustes,
                      comisionChofer: Number(e.target.value),
                    })
                  }
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-slate-700 font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">
                  Comisión para Ayudante (Ej. 0.00035)
                </label>
                <input
                  type="number"
                  step="0.00001"
                  value={ajustes.comisionAyudante}
                  onChange={(e) =>
                    setAjustes({
                      ...ajustes,
                      comisionAyudante: Number(e.target.value),
                    })
                  }
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-slate-700 font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>
          </div>

          <button
            onClick={handleGuardarTodo}
            disabled={guardando}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold p-3 rounded-xl transition-colors"
          >
            <Save size={20} />
            {guardando ? "Guardando..." : "Guardar Toda la Configuración"}
          </button>
        </div>

        {/* --- PANEL DERECHO: RUTAS Y VIÁTICOS --- */}
        <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 flex flex-col h-full">
          <h3 className="text-sm font-bold text-slate-700 uppercase flex items-center gap-2 mb-4">
            <MapPin size={16} /> Catálogo de Viáticos por Ruta
          </h3>

          {/* Formulario rápido para agregar ruta */}
          <div className="flex gap-2 mb-6">
            <input
              type="text"
              placeholder="Nombre Ruta (Ej. MAZATLAN)"
              value={nuevaRuta}
              onChange={(e) => setNuevaRuta(e.target.value)}
              className="flex-1 p-2 border border-slate-300 rounded-lg text-sm font-semibold uppercase"
            />
            <input
              type="number"
              placeholder="$ Monto"
              value={nuevoViatico}
              onChange={(e) => setNuevoViatico(e.target.value)}
              className="w-24 p-2 border border-slate-300 rounded-lg text-sm font-semibold"
            />
            <button
              onClick={handleAgregarRuta}
              className="bg-emerald-600 hover:bg-emerald-700 text-white p-2 rounded-lg"
            >
              <Plus size={20} />
            </button>
          </div>

          {/* Lista de rutas guardadas */}
          <div className="flex-1 overflow-y-auto bg-white border border-slate-200 rounded-lg">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="p-3 font-bold text-slate-600">Ruta Destino</th>
                  <th className="p-3 font-bold text-slate-600 text-right">
                    Viático ($)
                  </th>
                  <th className="p-3 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {Object.entries(ajustes.viaticosRutas).length === 0 ? (
                  <tr>
                    <td
                      colSpan={3}
                      className="p-6 text-center text-slate-400 italic"
                    >
                      No hay rutas registradas.
                    </td>
                  </tr>
                ) : (
                  Object.entries(ajustes.viaticosRutas)
                    .sort()
                    .map(([ruta, monto]) => (
                      <tr key={ruta} className="hover:bg-slate-50">
                        <td className="p-3 font-bold text-slate-700">{ruta}</td>
                        <td className="p-3 font-semibold text-emerald-600 text-right">
                          ${monto}
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => handleEliminarRuta(ruta)}
                            className="text-red-500 hover:text-red-700 p-1 rounded-md hover:bg-red-50"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
