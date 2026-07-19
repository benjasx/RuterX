import { useState } from "react";
import { Map, Plus, Trash2 } from "lucide-react";
import { RUTAS as initialRutas } from "../data/mockRutas";

export default function GestionRutas() {
  const [rutas, setRutas] = useState<string[]>(initialRutas);
  const [nuevaRuta, setNuevaRuta] = useState("");

  const handleAgregarRuta = (e: React.FormEvent) => {
    e.preventDefault();
    if (nuevaRuta.trim() && !rutas.includes(nuevaRuta)) {
      setRutas([...rutas, nuevaRuta]);
      setNuevaRuta("");
    }
  };

  const handleEliminarRuta = (rutaAEliminar: string) => {
    setRutas(rutas.filter((r) => r !== rutaAEliminar));
  };

  return (
    <div className="flex-1 w-full h-full bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col">
      <div className="flex items-center gap-2 mb-6">
        <Map className="text-blue-600" size={24} />
        <h2 className="text-xl font-bold text-slate-800">Gestión de Rutas</h2>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Formulario */}
        <div className="w-full lg:w-1/3">
          <form onSubmit={handleAgregarRuta} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Nombre de la nueva ruta
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  value={nuevaRuta}
                  onChange={(e) => setNuevaRuta(e.target.value)}
                  className="flex-1 border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ej. Nueva Ruta Norte"
                />
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                >
                  <Plus size={20} />
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Lista de Rutas */}
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">
            Rutas Activas ({rutas.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {rutas.map((ruta) => (
              <div
                key={ruta}
                className="flex items-center justify-between bg-slate-50 border border-slate-200 p-3 rounded-lg hover:border-blue-200 transition-colors"
              >
                <span className="font-medium text-slate-700">{ruta}</span>
                <button
                  onClick={() => handleEliminarRuta(ruta)}
                  className="text-slate-400 hover:text-red-600 transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
