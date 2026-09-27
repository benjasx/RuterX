import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query"; // 🚀 1. IMPORTAMOS TANSTACK
import { Save, Trash2, Map, ListOrdered } from "lucide-react";
import {
  agregarRutaFirebase,
  eliminarRutaFirebase,
  type Ruta,
} from "../firebase/rutasService";
import { notificarError, confirmar } from "../utils/notificaciones";

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
      notificarError("Error al guardar la ruta");
    }
    setCargando(false);
  };

  const handleEliminar = async (id: string) => {
    const ok = await confirmar({
      mensaje: "¿Seguro que deseas eliminar esta ruta de la base de datos?",
      peligroso: true,
      textoConfirmar: "Eliminar",
    });
    if (ok) {
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

      <div className="flex items-center gap-3 mb-6 bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 rounded-xl px-4 py-3 max-w-md">
        <ListOrdered className="text-blue-600 dark:text-blue-400" size={20} />
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">
            Rutas registradas
          </p>
          <p className="text-lg font-black text-slate-800 dark:text-slate-100">
            {rutasOrdenadas.length}
          </p>
        </div>
      </div>

      <div className="flex gap-2 mb-8 max-w-md">
        <input
          type="text"
          value={nuevaRuta}
          onChange={(e) => setNuevaRuta(e.target.value)}
          placeholder="Ej. NUEVA RUTA NORTE"
          className="flex-1 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 uppercase outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
        />
        <button
          onClick={handleAgregar}
          disabled={cargando}
          className="bg-blue-600 hover:bg-blue-700 transition-colors text-white px-4 py-2 rounded-lg disabled:opacity-50 flex items-center justify-center gap-2 font-medium"
        >
          <Save size={18} /> {cargando ? "..." : "Guardar"}
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
        <table className="w-full text-left border-collapse text-sm bg-white dark:bg-slate-800">
          <thead>
            <tr className="bg-blue-600 text-white uppercase tracking-wider text-xs">
              <th className="px-4 py-3 font-bold text-center w-14">#</th>
              <th className="px-6 py-3 font-bold">Nombre de la Ruta</th>
              <th className="px-6 py-3 font-bold text-center w-24">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {/* CAMBIO: Mapeamos 'rutasOrdenadas' en lugar de 'listaRutas' */}
            {rutasOrdenadas.map((ruta, index) => (
              <tr
                key={ruta.id}
                className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
              >
                <td className="px-4 py-3 text-center">
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 text-xs font-black tabular-nums">
                    {index + 1}
                  </span>
                </td>
                <td className="px-6 py-3 font-medium text-slate-700 dark:text-slate-200">
                  {ruta.nombre}
                </td>
                <td className="px-6 py-3 text-center">
                  <button
                    onClick={() => handleEliminar(ruta.id)}
                    className="text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                    title="Eliminar Ruta"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
