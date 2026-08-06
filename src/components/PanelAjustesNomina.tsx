import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Settings,
  Save,
  Plus,
  Trash2,
  MapPin,
  Percent,
  AlertCircle,
} from "lucide-react";
import {
  obtenerAjustesNomina,
  guardarAjustesNomina,
  type AjustesNomina,
} from "../firebase/ajustesNominaService";

export default function PanelAjustesNomina() {
  const queryClient = useQueryClient();

  const {
    data: ajustesNube,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["ajustes_nomina"],
    queryFn: obtenerAjustesNomina,
  });

  const [ajustes, setAjustes] = useState<AjustesNomina | null>(null);
  const [guardando, setGuardando] = useState(false);

  const [nuevaRuta, setNuevaRuta] = useState("");
  const [nuevoViatico, setNuevoViatico] = useState("");

  useEffect(() => {
    if (ajustesNube) {
      setAjustes(ajustesNube);
    }
  }, [ajustesNube]);

  const handleGuardarTodo = async () => {
    if (!ajustes) return;
    setGuardando(true);
    const exito = await guardarAjustesNomina(ajustes);

    if (exito) {
      alert("Ajustes de nómina guardados correctamente en la nube.");
      queryClient.invalidateQueries({ queryKey: ["ajustes_nomina"] });
    } else {
      alert("Hubo un error al guardar los ajustes.");
    }
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

  if (isLoading || !ajustes) {
    return (
      <div className="flex w-full h-full items-center justify-center bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <p className="text-slate-500 font-bold text-lg animate-pulse flex items-center gap-2">
          <Settings size={24} className="animate-spin" />
          Cargando configuración de nómina...
        </p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <AlertCircle className="text-rose-500 mb-3" size={40} />
        <h3 className="text-lg font-semibold text-slate-700">
          Error al cargar la configuración
        </h3>
      </div>
    );
  }

  return (
    <div className="w-full bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-full overflow-y-auto custom-scrollbar">
      <div className="flex items-center gap-2 mb-6">
        <Settings className="text-blue-600" size={24} />
        <h2 className="text-xl font-bold text-slate-800">
          Reglas de Nómina y Viáticos
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* --- PANEL IZQUIERDO: COMISIONES --- */}
        <div className="space-y-6">
          <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="text-sm font-bold text-slate-700 uppercase flex items-center gap-2 mb-4">
              <Percent size={16} className="text-blue-600" /> Porcentajes de
              Comisión
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
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-slate-700 font-semibold focus:ring-2 focus:ring-blue-500 outline-none transition-shadow bg-white"
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
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-slate-700 font-semibold focus:ring-2 focus:ring-blue-500 outline-none transition-shadow bg-white"
                />
              </div>

              {/* 🚀 NUEVO BLOQUE: COMISIÓN ESPECIAL TLMK */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">
                  Comisión Especial TLMK y TLMK 2 (Ej. 0.001)
                </label>
                <input
                  type="number"
                  step="0.00001"
                  // Si no existe en BD, por defecto muestra 0.001
                  value={
                    ajustes.comisionTLMK !== undefined
                      ? ajustes.comisionTLMK
                      : 0.001
                  }
                  onChange={(e) =>
                    setAjustes({
                      ...ajustes,
                      comisionTLMK: Number(e.target.value),
                    })
                  }
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-slate-700 font-semibold focus:ring-2 focus:ring-blue-500 outline-none transition-shadow bg-white"
                />
              </div>
            </div>
          </div>

          <button
            onClick={handleGuardarTodo}
            disabled={guardando}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold p-3.5 rounded-xl transition-colors shadow-sm disabled:opacity-50"
          >
            <Save size={20} />
            {guardando
              ? "Guardando cambios en la nube..."
              : "Guardar Toda la Configuración"}
          </button>
        </div>

        {/* --- PANEL DERECHO: RUTAS Y VIÁTICOS --- */}
        <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col h-full min-h-100">
          <h3 className="text-sm font-bold text-slate-700 uppercase flex items-center gap-2 mb-4">
            <MapPin size={16} className="text-emerald-600" /> Catálogo de
            Viáticos por Ruta
          </h3>

          <div className="flex gap-2 mb-6 shrink-0">
            <input
              type="text"
              placeholder="Nombre Ruta (Ej. MAZATLAN)"
              value={nuevaRuta}
              onChange={(e) => setNuevaRuta(e.target.value)}
              className="flex-1 p-2.5 border border-slate-300 rounded-lg text-sm font-semibold uppercase outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
            />
            <input
              type="number"
              placeholder="$ Monto"
              value={nuevoViatico}
              onChange={(e) => setNuevoViatico(e.target.value)}
              className="w-28 p-2.5 border border-slate-300 rounded-lg text-sm font-semibold outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
            />
            <button
              onClick={handleAgregarRuta}
              className="bg-emerald-600 hover:bg-emerald-700 text-white p-2.5 rounded-lg transition-colors shadow-sm"
              title="Agregar Viático"
            >
              <Plus size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto bg-white border border-slate-200 rounded-lg custom-scrollbar">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100 sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="p-3 font-bold text-slate-600">Ruta Destino</th>
                  <th className="p-3 font-bold text-slate-600 text-right">
                    Viático ($)
                  </th>
                  <th className="p-3 text-center font-bold text-slate-600 w-20">
                    Acción
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {Object.entries(ajustes.viaticosRutas).length === 0 ? (
                  <tr>
                    <td
                      colSpan={3}
                      className="p-8 text-center text-slate-400 italic"
                    >
                      No hay viáticos registrados por ruta.
                    </td>
                  </tr>
                ) : (
                  Object.entries(ajustes.viaticosRutas)
                    .sort()
                    .map(([ruta, monto]) => (
                      <tr
                        key={ruta}
                        className="hover:bg-slate-50 transition-colors"
                      >
                        <td className="p-3 font-bold text-slate-700">{ruta}</td>
                        <td className="p-3 font-black text-emerald-600 text-right">
                          ${monto}
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => handleEliminarRuta(ruta)}
                            className="text-slate-400 hover:text-rose-600 p-1.5 rounded-md hover:bg-rose-50 transition-colors"
                            title={`Eliminar ${ruta}`}
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
