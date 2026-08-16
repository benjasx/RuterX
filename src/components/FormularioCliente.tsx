import { UserPlus, X, Loader2 } from "lucide-react";
import type { Vendedor as DatosVendedor } from "../types/index";

interface FormularioClienteProps {
  idEditando: string | null;
  nombre: string;
  setNombre: (val: string) => void;
  domicilio: string;
  setDomicilio: (val: string) => void;
  vendedorSeleccionado: string;
  setVendedorSeleccionado: (val: string) => void;
  ruta: string;
  setRuta: (val: string) => void;
  latitud: string;
  setLatitud: (val: string) => void;
  longitud: string;
  setLongitud: (val: string) => void;
  vendedores: DatosVendedor[];
  rutas: any[];
  guardando: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onCancelarEdicion: () => void;
}

export default function FormularioCliente({
  idEditando,
  nombre,
  setNombre,
  domicilio,
  setDomicilio,
  vendedorSeleccionado,
  setVendedorSeleccionado,
  ruta,
  setRuta,
  latitud,
  setLatitud,
  longitud,
  setLongitud,
  vendedores,
  rutas,
  guardando,
  onSubmit,
  onCancelarEdicion,
}: FormularioClienteProps) {
  const opcionesVendedores = [
    "Seleccionar Vendedor...",
    ...vendedores.map((v) => v.nombre),
  ];

  return (
    <div className="w-full xl:w-100 shrink-0 bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col">
      <div className="flex items-center gap-2 mb-6">
        <UserPlus className="text-blue-600 dark:text-blue-400" size={24} />
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
          {idEditando ? "Editar Cliente" : "Agregar Cliente"}
        </h2>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
            Nombre
          </label>
          <input
            type="text"
            required
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Ej. Abarrotes El Sol"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
            Domicilio
          </label>
          <input
            type="text"
            required
            value={domicilio}
            onChange={(e) => setDomicilio(e.target.value)}
            className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Ej. Av. Principal 123"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
            Vendedor
          </label>
          <select
            required
            value={vendedorSeleccionado}
            onChange={(e) => setVendedorSeleccionado(e.target.value)}
            className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            {opcionesVendedores.map((v, i) => (
              <option key={i} value={v === "Seleccionar Vendedor..." ? "" : v}>
                {v}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
            Ruta
          </label>
          <select
            required
            value={ruta}
            onChange={(e) => setRuta(e.target.value)}
            className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="">Seleccionar Ruta...</option>
            {rutas.map((r) => (
              <option key={r.id} value={r.nombre}>
                {r.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
              Latitud
            </label>
            <input
              type="number"
              step="any"
              required
              placeholder="ej. 19.432608"
              value={latitud}
              onChange={(e) => setLatitud(e.target.value)}
              className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
              Longitud
            </label>
            <input
              type="number"
              step="any"
              required
              placeholder="ej. -99.133209"
              value={longitud}
              onChange={(e) => setLongitud(e.target.value)}
              className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={guardando}
          className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
        >
          {guardando ? (
            <>
              <Loader2 size={18} className="animate-spin" /> Procesando...
            </>
          ) : idEditando ? (
            "Actualizar Cliente"
          ) : (
            "Guardar Cliente"
          )}
        </button>

        {idEditando && (
          <button
            type="button"
            onClick={onCancelarEdicion}
            className="w-full text-slate-500 dark:text-slate-400 text-sm flex justify-center items-center gap-1 hover:text-slate-700 dark:hover:text-slate-200 transition-colors mt-2 cursor-pointer"
          >
            <X size={16} /> Cancelar edición
          </button>
        )}
      </form>
    </div>
  );
}
