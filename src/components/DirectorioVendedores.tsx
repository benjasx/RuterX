import { useState, useMemo, useEffect } from "react";
import {
  Search,
  Filter,
  Briefcase, // Cambié el icono por un maletín para vendedores
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2, // Agregado para eliminar
} from "lucide-react";

// Interfaz para saber qué datos recibimos
export interface DatosVendedor {
  id: string;
  nombre: string;
  correo: string;
  telefono: string;
  rutas: string[];
}

interface DirectorioVendedoresProps {
  vendedores: DatosVendedor[];
  rutas: any[];
  onEdit: (vendedor: DatosVendedor) => void;
  onDelete: (id: string) => void;
}

export default function DirectorioVendedores({
  vendedores,
  onEdit,
  rutas,
  onDelete,
}: DirectorioVendedoresProps) {
  const [busquedaNombre, setBusquedaNombre] = useState("");
  const [filtroRuta, setFiltroRuta] = useState("");

  const [paginaActual, setPaginaActual] = useState(1);
  const ITEMS_POR_PAGINA = 13;

  // Lógica de filtrado
  const vendedoresFiltrados = useMemo(() => {
    return vendedores.filter((vendedor) => {
      // 1. Filtro por nombre
      const coincideNombre = vendedor.nombre
        .toLowerCase()
        .includes(busquedaNombre.toLowerCase());

      // 2. Filtro por ruta (buscamos dentro del arreglo de rutas del vendedor)
      const coincideRuta =
        filtroRuta === "" ||
        vendedor.rutas.some(
          (r) => r.toLowerCase() === filtroRuta.toLowerCase(),
        );

      return coincideNombre && coincideRuta;
    });
  }, [busquedaNombre, filtroRuta, vendedores]);

  // Regresar a la página 1 si se busca o se filtra algo nuevo
  useEffect(() => {
    setPaginaActual(1);
  }, [busquedaNombre, filtroRuta, vendedores]);

  // Paginación
  const totalPaginas =
    Math.ceil(vendedoresFiltrados.length / ITEMS_POR_PAGINA) || 1;
  const vendedoresPaginados = vendedoresFiltrados.slice(
    (paginaActual - 1) * ITEMS_POR_PAGINA,
    paginaActual * ITEMS_POR_PAGINA,
  );

  return (
    <div className="w-full bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col h-full">
      <div className="flex items-center gap-2 mb-6 shrink-0">
        <Briefcase className="text-blue-600" size={24} />
        <h2 className="text-xl font-bold text-slate-800">
          Directorio de Vendedores
        </h2>
      </div>

      {/* BARRA DE BÚSQUEDA Y FILTROS */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6 bg-slate-50 p-4 rounded-lg border border-slate-100 shrink-0">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="text-slate-400" size={18} />
          </div>
          <input
            type="text"
            placeholder="Buscar por nombre..."
            value={busquedaNombre}
            onChange={(e) => setBusquedaNombre(e.target.value)}
            className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>

        <div className="relative w-full sm:w-64">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Filter className="text-slate-400" size={18} />
          </div>
          <select
            value={filtroRuta}
            onChange={(e) => setFiltroRuta(e.target.value)}
            className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm appearance-none bg-white"
          >
            <option value="">Todas las rutas</option>
            {/* CORRECCIÓN: Le decimos a React que use el .id y el .nombre */}
            {rutas.map((r) => (
              <option key={r.id} value={r.nombre}>
                {r.nombre}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* TABLA DE VENDEDORES */}
      <div className="flex-1 overflow-y-auto rounded-lg border border-slate-200 shadow-sm">
        <table className="w-full text-left border-collapse min-w-200">
          <thead className="bg-slate-50">
            <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <th className="px-6 py-3 text-left">Vendedor</th>
              <th className="px-6 py-3 text-left">Contacto</th>
              <th className="px-6 py-3 text-left">Rutas Asignadas</th>
              <th className="px-6 py-3 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-100">
            {vendedoresPaginados.length > 0 ? (
              vendedoresPaginados.map((vendedor) => (
                <tr
                  key={vendedor.id}
                  className="hover:bg-slate-50 transition-colors"
                >
                  {/* Nombre */}
                  <td className="py-4 px-6 font-semibold text-slate-900">
                    {vendedor.nombre}
                  </td>

                  {/* Contacto */}
                  <td className="py-4 px-6 text-slate-600">
                    {vendedor.correo && (
                      <div className="mb-1 text-sm">{vendedor.correo}</div>
                    )}
                    {vendedor.telefono && (
                      <div className="text-xs text-slate-500">
                        {vendedor.telefono}
                      </div>
                    )}
                    {!vendedor.correo && !vendedor.telefono && (
                      <span className="italic text-slate-400 text-xs">
                        Sin datos
                      </span>
                    )}
                  </td>

                  {/* Rutas (Píldoras) */}
                  <td className="py-4 px-6">
                    <div className="flex flex-wrap gap-1.5">
                      {vendedor.rutas.length > 0 ? (
                        vendedor.rutas.map((ruta) => (
                          <span
                            key={ruta}
                            className="inline-flex items-center px-2 py-1 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100 uppercase"
                          >
                            {ruta}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-400 italic">
                          Ninguna
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Acciones */}
                  <td className="py-4 px-6">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => onEdit(vendedor)}
                        className="text-slate-400 hover:text-blue-600 transition-colors p-2 hover:bg-blue-50 rounded-full"
                        title="Editar"
                      >
                        <Pencil size={18} />
                      </button>
                      <button
                        onClick={() => onDelete(vendedor.id)}
                        className="text-slate-400 hover:text-red-600 transition-colors p-2 hover:bg-red-50 rounded-full"
                        title="Eliminar"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="text-center py-12 text-slate-500">
                  No se encontraron vendedores con esos filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* PAGINACIÓN */}
      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4 shrink-0">
        <p className="text-sm text-slate-600">
          Mostrando página <span className="font-bold">{paginaActual}</span> de{" "}
          <span className="font-bold">{totalPaginas}</span>
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => setPaginaActual((prev) => Math.max(prev - 1, 1))}
            disabled={paginaActual === 1}
            className="p-2 rounded-lg border border-slate-300 disabled:opacity-50 hover:bg-slate-50 transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={() =>
              setPaginaActual((prev) => Math.min(prev + 1, totalPaginas))
            }
            disabled={paginaActual === totalPaginas}
            className="p-2 rounded-lg border border-slate-300 disabled:opacity-50 hover:bg-slate-50 transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
