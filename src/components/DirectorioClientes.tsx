import { useState, useMemo, useEffect } from "react";
import {
  Search,
  Filter,
  ListTodo,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
  FileText,
  FileSpreadsheet,
  Loader2,
} from "lucide-react";

import {
  generarPDFDirectorio,
  generarCSVDirectorio,
} from "../utils/exportaciones";

interface Props {
  clientes: any[];
  rutas: any[];
  onEdit: (cliente: any) => void;
  onDelete: (id: string) => Promise<void>;
}

export default function DirectorioClientes({
  clientes = [],
  rutas = [],
  onEdit,
  onDelete,
}: Props) {
  const [busquedaNombre, setBusquedaNombre] = useState("");
  const [filtroRuta, setFiltroRuta] = useState("");
  const [paginaActual, setPaginaActual] = useState(1);
  const [eliminandoId, setEliminandoId] = useState<string | null>(null);

  const ITEMS_POR_PAGINA = 13;

  // Filtrado 100% local en memoria (0 consumo de lectura en BD)
  const clientesFiltrados = useMemo(() => {
    const busqueda = busquedaNombre.toLowerCase();
    return clientes.filter((cliente) => {
      const nombreSeguro = (cliente.nombre || "").toLowerCase();
      const rutaSegura = cliente.ruta || "";

      const coincideNombre = nombreSeguro.includes(busqueda);
      const coincideRuta = filtroRuta === "" || rutaSegura === filtroRuta;

      return coincideNombre && coincideRuta;
    });
  }, [busquedaNombre, filtroRuta, clientes]);

  useEffect(() => {
    setPaginaActual(1);
  }, [busquedaNombre, filtroRuta]);

  const totalPaginas =
    Math.ceil(clientesFiltrados.length / ITEMS_POR_PAGINA) || 1;
  const clientesPaginados = useMemo(() => {
    return clientesFiltrados.slice(
      (paginaActual - 1) * ITEMS_POR_PAGINA,
      paginaActual * ITEMS_POR_PAGINA,
    );
  }, [clientesFiltrados, paginaActual]);

  const rutasOrdenadas = useMemo(() => {
    return [...rutas].sort((a, b) =>
      (a.nombre || "").localeCompare(b.nombre || ""),
    );
  }, [rutas]);

  const handleConfirmarEliminar = async (id: string) => {
    setEliminandoId(id);
    try {
      await onDelete(id);
    } finally {
      setEliminandoId(null);
    }
  };

  return (
    <div className="w-full bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col h-full">
      {/* Encabezado y Exportaciones */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 shrink-0">
        <div className="flex items-center gap-3">
          <ListTodo className="text-blue-600" size={24} />
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-3">
            Directorio de Clientes
            <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-1 rounded-full border border-blue-200">
              {clientesFiltrados.length}
            </span>
          </h2>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => generarCSVDirectorio(clientesFiltrados)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-100 hover:border-emerald-300 transition-colors text-sm font-semibold cursor-pointer"
            title="Exportar a Excel/CSV"
          >
            <FileSpreadsheet size={16} />
            CSV
          </button>
          <button
            onClick={() => generarPDFDirectorio(clientesFiltrados, filtroRuta)}
            className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 hover:border-red-300 transition-colors text-sm font-semibold cursor-pointer"
            title="Generar PDF"
          >
            <FileText size={16} />
            PDF
          </button>
        </div>
      </div>

      {/* Buscador y Filtro */}
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
            className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm appearance-none bg-white cursor-pointer"
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

      {/* Tabla de Clientes */}
      <div className="flex-1 overflow-y-auto rounded-lg border border-slate-200 shadow-sm">
        <table className="w-full text-left border-collapse min-w-200">
          <thead className="bg-slate-50">
            <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <th className="px-6 py-3 text-left">Cliente</th>
              <th className="px-6 py-3 text-left">Ruta</th>
              <th className="px-6 py-3 text-left">Vendedor</th>
              <th className="px-6 py-3 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-100">
            {clientesPaginados.length > 0 ? (
              clientesPaginados.map((cliente) => (
                <tr
                  key={cliente.id}
                  className="hover:bg-slate-50 transition-colors"
                >
                  <td className="py-3 px-4">
                    <p className="font-semibold text-slate-900">
                      {cliente.nombre}
                    </p>
                    <p className="text-sm text-slate-500">
                      {cliente.descripcion}
                    </p>
                  </td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {cliente.ruta}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-600">
                    {cliente.vendedor}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => onEdit(cliente)}
                      className="text-slate-400 hover:text-blue-600 transition-colors p-2 hover:bg-blue-50 rounded-full cursor-pointer"
                      title="Editar"
                    >
                      <Pencil size={18} />
                    </button>
                    <button
                      onClick={() => handleConfirmarEliminar(cliente.id)}
                      disabled={eliminandoId === cliente.id}
                      className="text-slate-400 hover:text-red-600 transition-colors p-2 hover:bg-red-50 rounded-full cursor-pointer disabled:opacity-50"
                      title="Eliminar"
                    >
                      {eliminandoId === cliente.id ? (
                        <Loader2
                          size={18}
                          className="animate-spin text-red-600"
                        />
                      ) : (
                        <Trash2 size={18} />
                      )}
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="text-center py-12 text-slate-500">
                  No se encontraron clientes.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4 shrink-0">
        <p className="text-sm text-slate-600">
          Mostrando página <span className="font-bold">{paginaActual}</span> de{" "}
          <span className="font-bold">{totalPaginas}</span>
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => setPaginaActual((prev) => Math.max(prev - 1, 1))}
            disabled={paginaActual === 1}
            className="p-2 rounded-lg border border-slate-300 disabled:opacity-50 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={() =>
              setPaginaActual((prev) => Math.min(prev + 1, totalPaginas))
            }
            disabled={paginaActual === totalPaginas}
            className="p-2 rounded-lg border border-slate-300 disabled:opacity-50 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
