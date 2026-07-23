// src/components/GestionRutas.tsx
import { useState } from "react";
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
      }
    }
  };

  // NUEVO: Ordenamos las rutas alfabéticamente antes de dibujarlas en la cuadrícula
  const rutasOrdenadas = [...listaRutas].sort((a, b) =>
    a.nombre.localeCompare(b.nombre),
  );

  return (
    <div className="w-full bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col">
      <div className="flex items-center gap-2 mb-6">
        <Map className="text-blue-600" size={24} />
        <h2 className="text-xl font-bold text-slate-800">Gestión de Rutas</h2>
      </div>

      <div className="flex gap-2 mb-8 max-w-md">
        <input
          type="text"
          value={nuevaRuta}
          onChange={(e) => setNuevaRuta(e.target.value)}
          placeholder="Ej. NUEVA RUTA NORTE"
          className="flex-1 border border-slate-300 rounded-lg px-3 py-2 uppercase"
        />
        <button
          onClick={handleAgregar}
          disabled={cargando}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg"
        >
          {cargando ? "..." : <Plus size={18} />}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* CAMBIO: Mapeamos 'rutasOrdenadas' en lugar de 'listaRutas' */}
        {rutasOrdenadas.map((ruta) => (
          <div
            key={ruta.id}
            className="flex items-center justify-between p-3 border rounded-lg bg-slate-50"
          >
            <span className="font-medium text-slate-700">{ruta.nombre}</span>
            <button
              onClick={() => handleEliminar(ruta.id)}
              className="text-red-600"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
