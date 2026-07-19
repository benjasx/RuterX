// src/components/GestionRutas.tsx
import { useState, useEffect } from "react";
import { Plus, Trash2, Map } from "lucide-react";
import {
  obtenerRutasFirebase,
  agregarRutaFirebase,
  eliminarRutaFirebase,
  type Ruta,
} from "../firebase/rutasService";

export default function GestionRutas() {
  const [rutas, setRutas] = useState<Ruta[]>([]);
  const [nuevaRuta, setNuevaRuta] = useState("");
  const [cargando, setCargando] = useState(false);

  // Cargar rutas al iniciar
  useEffect(() => {
    cargarRutas();
  }, []);

  const cargarRutas = async () => {
    const datos = await obtenerRutasFirebase();
    setRutas(datos);
  };

  const handleAgregar = async () => {
    if (!nuevaRuta.trim()) return;

    setCargando(true);
    const resultado = await agregarRutaFirebase(nuevaRuta);

    if (resultado.success && resultado.id) {
      setRutas([...rutas, { id: resultado.id, nombre: nuevaRuta }]);
      setNuevaRuta("");
    } else {
      alert("Error al guardar la ruta");
    }
    setCargando(false);
  };

  const handleEliminar = async (id: string) => {
    if (window.confirm("¿Seguro que deseas eliminar esta ruta?")) {
      const resultado = await eliminarRutaFirebase(id);
      if (resultado.success) {
        setRutas(rutas.filter((r) => r.id !== id));
      } else {
        alert("Error al eliminar la ruta");
      }
    }
  };

  return (
    <div className="w-full bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col">
      <div className="flex items-center gap-2 mb-6">
        <Map className="text-blue-600" size={24} />
        <h2 className="text-xl font-bold text-slate-800">Gestión de Rutas</h2>
      </div>

      {/* Formulario de agregar */}
      <div className="flex gap-2 mb-8 max-w-md">
        <input
          type="text"
          value={nuevaRuta}
          onChange={(e) => setNuevaRuta(e.target.value)}
          placeholder="Ej. Nueva Ruta Norte"
          className="flex-1 border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={handleAgregar}
          disabled={cargando}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
        >
          <Plus size={18} /> {cargando ? "..." : ""}
        </button>
      </div>

      {/* Lista de rutas */}
      <div>
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">
          Rutas Activas ({rutas.length})
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {rutas.map((ruta) => (
            <div
              key={ruta.id}
              className="flex items-center justify-between p-3 border border-slate-200 rounded-lg bg-slate-50 hover:border-slate-300 transition-colors"
            >
              <span className="font-medium text-slate-700">{ruta.nombre}</span>
              <button
                onClick={() => handleEliminar(ruta.id)}
                className="text-slate-400 hover:text-red-600 transition-colors p-2 hover:bg-red-50 rounded-full"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
