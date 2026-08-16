import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query"; // 🚀 1. IMPORTAMOS TANSTACK
import { Plus, Trash2, Map } from "lucide-react";
import {
  agregarRutaFirebase,
  eliminarRutaFirebase,
  type Ruta,
} from "../firebase/rutasService";

interface Props {
  listaRutas: Ruta[];
  setListaRutas: React.Dispatch<React.SetStateAction<Ruta[]>>;
}

export default function GestionRutas({ listaRutas, setListaRutas }: Props) {
  const queryClient = useQueryClient(); // 🚀 2. INICIALIZAMOS EL CLIENTE DE CACHÉ

  const [nuevaRuta, setNuevaRuta] = useState("");
  const [cargando, setCargando] = useState(false);

  const handleAgregar = async () => {
    if (!nuevaRuta.trim()) return;

    setCargando(true);

    // 1. FORZAMOS A MAYÚSCULAS ANTES DE GUARDAR
    const rutaEnMayusculas = nuevaRuta.trim().toUpperCase();

    const resultado = await agregarRutaFirebase(rutaEnMayusculas);

    if (resultado.success && resultado.id) {
      // 2. ACTUALIZAMOS EL ESTADO GLOBAL CON LA RUTA EN MAYÚSCULAS
      setListaRutas([
        ...listaRutas,
        { id: resultado.id, nombre: rutaEnMayusculas },
      ]);

      // 🚀 3. INVALIDAMOS LA CACHÉ PARA QUE EL MAPA Y OTROS PANELES SE ACTUALICEN
      queryClient.invalidateQueries({ queryKey: ["rutas"] });

      setNuevaRuta("");
    } else {
      alert("Error al guardar la ruta");
    }
    setCargando(false);
  };

  const handleEliminar = async (id: string) => {
    if (
      window.confirm(
        "¿Seguro que deseas eliminar esta ruta de la base de datos?",
      )
    ) {
      const resultado = await eliminarRutaFirebase(id);
      if (resultado.success) {
        // ACTUALIZAMOS EL ESTADO GLOBAL AL BORRAR
        setListaRutas(listaRutas.filter((r) => r.id !== id));

        // 🚀 3. INVALIDAMOS LA CACHÉ AL ELIMINAR
        queryClient.invalidateQueries({ queryKey: ["rutas"] });
      }
    }
  };

  // NUEVO: Ordenamos las rutas alfabéticamente antes de dibujarlas en la cuadrícula
  const rutasOrdenadas = [...listaRutas].sort((a, b) =>
    a.nombre.localeCompare(b.nombre),
  );

  return (
    <div className="w-full bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col">
      <div className="flex items-center gap-2 mb-6">
        <Map className="text-blue-600 dark:text-blue-400" size={24} />
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Gestión de Rutas</h2>
      </div>

      <div className="flex gap-2 mb-8 max-w-md">
        <input
          type="text"
          value={nuevaRuta}
          onChange={(e) => setNuevaRuta(e.target.value)}
          placeholder="Ej. NUEVA RUTA NORTE"
          className="flex-1 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 uppercase outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={handleAgregar}
          disabled={cargando}
          className="bg-blue-600 hover:bg-blue-700 transition-colors text-white px-4 py-2 rounded-lg disabled:opacity-50 flex items-center justify-center min-w-12.5"
        >
          {cargando ? "..." : <Plus size={18} />}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* CAMBIO: Mapeamos 'rutasOrdenadas' en lugar de 'listaRutas' */}
        {rutasOrdenadas.map((ruta) => (
          <div
            key={ruta.id}
            className="flex items-center justify-between p-3 border rounded-lg bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <span className="font-medium text-slate-700 dark:text-slate-200">{ruta.nombre}</span>
            <button
              onClick={() => handleEliminar(ruta.id)}
              className="text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
              title="Eliminar Ruta"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
