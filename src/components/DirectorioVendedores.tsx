// src/components/DirectorioVendedores.tsx
import { useState, useMemo, useEffect } from "react";
import {
  Search,
  Filter,
  Users,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
  FileText,
  FileSpreadsheet,
} from "lucide-react";

// IMPORTAMOS LAS NUEVAS UTILIDADES
import {
  generarPDFVendedores,
  generarCSVVendedores,
} from "../utils/exportaciones";

interface Props {
  vendedores: any[];
  rutas: any[];
  onEdit: (vendedor: any) => void;
  onDelete: (id: string) => Promise<void>;
}

export default function DirectorioVendedores({
  vendedores,
  rutas,
  onEdit,
  onDelete,
}: Props) {
  const [busqueda, setBusqueda] = useState("");
  const [filtroRuta, setFiltroRuta] = useState("");
  const [paginaActual, setPaginaActual] = useState(1);
  const ITEMS_POR_PAGINA = 8; // Menos items porque las etiquetas de rutas ocupan más espacio

  const vendedoresFiltrados = useMemo(() => {
    return vendedores.filter((vendedor) => {
      const coincideNombre = vendedor.nombre
        .toLowerCase()
        .includes(busqueda.toLowerCase());

      // La lógica cambia ligeramente aquí: comprobamos si el arreglo de rutas del vendedor incluye el filtro
      const coincideRuta =
        filtroRuta === "" ||
        (vendedor.rutas && vendedor.rutas.includes(filtroRuta));

      return coincideNombre && coincideRuta;
    });
  }, [busqueda, filtroRuta, vendedores]);

  useEffect(() => {
    setPaginaActual(1);
  }, [busqueda, filtroRuta]);

  const totalPaginas =
    Math.ceil(vendedoresFiltrados.length / ITEMS_POR_PAGINA) || 1;
  const vendedoresPaginados = vendedoresFiltrados.slice(
    (paginaActual - 1) * ITEMS_POR_PAGINA,
    paginaActual * ITEMS_POR_PAGINA,
  );

  const rutasOrdenadas = [...rutas].sort((a, b) =>
    a.nombre.localeCompare(b.nombre),
  );

  return (
    <div className="w-full bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col h-full">
      {/* CABECERA CON CONTADOR Y BOTONES */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 shrink-0">
        <div className="flex items-center gap-3">
          <Users className="text-blue-600" size={24} />
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-3">
            Directorio de Vendedores
            <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-1 rounded-full border border-blue-200">
              {vendedoresFiltrados.length}
            </span>
          </h2>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => generarCSVVendedores(vendedoresFiltrados)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-100 hover:border-emerald-300 transition-colors text-sm font-semibold"
            title="Exportar a Excel/CSV"
          >
            <FileSpreadsheet size={16} />
            CSV
          </button>
          <button
            onClick={() =>
              generarPDFVendedores(vendedoresFiltrados, filtroRuta)
            }
            className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 hover:border-red-300 transition-colors text-sm font-semibold"
            title="Generar PDF"
          >
            <FileText size={16} />
            PDF
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6 bg-slate-50 p-4 rounded-lg border border-slate-100 shrink-0">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="text-slate-400" size={18} />
          </div>
          <input
            type="text"
            placeholder="Buscar por nombre..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
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
            {rutasOrdenadas.map((r) => (
              <option key={r.id} value={r.nombre}>
                {r.nombre}
              </option>
            ))}
          </select>
        </div>
      </div>

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
                  <td className="py-3 px-4">
                    <p className="font-semibold text-slate-900">
                      {vendedor.nombre}
                    </p>
                  </td>
                  <td className="py-3 px-4">
                    <p className="text-sm text-slate-600">{vendedor.correo}</p>
                    <p className="text-sm text-slate-500">
                      {vendedor.telefono}
                    </p>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex flex-wrap gap-1">
                      {vendedor.rutas &&
                        vendedor.rutas.map((ruta: string) => (
                          <span
                            key={ruta}
                            className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-100 uppercase"
                          >
                            {ruta}
                          </span>
                        ))}
                      {(!vendedor.rutas || vendedor.rutas.length === 0) && (
                        <span className="text-xs text-slate-400 italic">
                          Sin rutas asignadas
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => onEdit(vendedor)}
                      className="text-slate-400 hover:text-blue-600 transition-colors p-2 hover:bg-blue-50 rounded-full"
                    >
                      <Pencil size={18} />
                    </button>
                    <button
                      onClick={() => onDelete(vendedor.id)}
                      className="text-slate-400 hover:text-red-600 transition-colors p-2 hover:bg-red-50 rounded-full"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="text-center py-12 text-slate-500">
                  No se encontraron vendedores.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

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
