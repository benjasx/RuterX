import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  SlidersHorizontal,
  Save,
  Plus,
  Trash2,
  Truck,
  MapPin,
  AlertCircle,
} from "lucide-react";
import {
  obtenerAjustesRentabilidad,
  guardarAjustesRentabilidad,
  type AjustesRentabilidad,
} from "../firebase/ajustesRentabilidadService";
import { obtenerUnidadesFirebase } from "../firebase/unidadesService";
import { LISTA_RUTAS } from "../utils/mapaUtils";
import { notificarExito, notificarError } from "../utils/notificaciones";

const CAMPOS: {
  clave:
    | "salarioDiarioChofer"
    | "salarioDiarioAyudante"
    | "salarioDiarioVendedor"
    | "comisionVendedor"
    | "margenPct"
    | "metaRentablePct"
    | "metaRevisarPct";
  label: string;
  step: string;
}[] = [
  {
    clave: "salarioDiarioChofer",
    label: "Sueldo Base Diario Chofer",
    step: "0.01",
  },
  {
    clave: "salarioDiarioAyudante",
    label: "Sueldo Base Diario Ayudante (Aux. 1 y 2)",
    step: "0.01",
  },
  {
    clave: "salarioDiarioVendedor",
    label: "Sueldo Base Diario Vendedor",
    step: "0.01",
  },
  {
    clave: "comisionVendedor",
    label: "Comisión Vendedor (Ej. 0.02 = 2%)",
    step: "0.0001",
  },
  {
    clave: "margenPct",
    label: "Margen % (Ej. 8.47)",
    step: "0.01",
  },
  {
    clave: "metaRentablePct",
    label: "Meta \"Rentable\" (%)",
    step: "0.01",
  },
  {
    clave: "metaRevisarPct",
    label: "Meta \"Revisar\" (%)",
    step: "0.01",
  },
];

const CatalogoPorClave = ({
  titulo,
  icono,
  catalogo,
  onAgregar,
  onEliminar,
  unidad,
}: {
  titulo: string;
  icono: React.ReactNode;
  catalogo: Record<string, number>;
  onAgregar: (clave: string, valor: number) => void;
  onEliminar: (clave: string) => void;
  unidad: "dinero" | "km";
}) => {
  const [rutaElegida, setRutaElegida] = useState("");
  const [nuevoValor, setNuevoValor] = useState("");

  const handleAgregar = () => {
    if (!rutaElegida || !nuevoValor) return;
    onAgregar(rutaElegida.toUpperCase().trim(), Number(nuevoValor));
    setRutaElegida("");
    setNuevoValor("");
  };

  const etiquetaColumna = unidad === "dinero" ? "Monto ($)" : "Km promedio";
  const formatearValor = (v: number) => (unidad === "dinero" ? `$${v}` : `${v} km`);

  return (
    <div className="bg-slate-50 dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col h-full min-h-100">
      <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 uppercase flex items-center gap-2 mb-4">
        {icono} {titulo}
      </h3>

      <div className="flex gap-2 mb-6 shrink-0">
        <select
          value={rutaElegida}
          onChange={(e) => setRutaElegida(e.target.value)}
          className="flex-1 p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg text-sm font-semibold outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
        >
          <option value="">Selecciona una ruta...</option>
          {LISTA_RUTAS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <input
          type="number"
          placeholder={unidad === "dinero" ? "$ Monto" : "Km"}
          value={nuevoValor}
          onChange={(e) => setNuevoValor(e.target.value)}
          className="w-28 p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg text-sm font-semibold outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
        />
        <button
          onClick={handleAgregar}
          className="bg-emerald-600 hover:bg-emerald-700 text-white p-2.5 rounded-lg transition-colors shadow-sm"
          title="Agregar"
        >
          <Plus size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg custom-scrollbar">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-100 dark:bg-slate-700 sticky top-0 z-10 shadow-sm">
            <tr>
              <th className="p-3 font-bold text-slate-600 dark:text-slate-300">Ruta</th>
              <th className="p-3 font-bold text-slate-600 dark:text-slate-300 text-right">
                {etiquetaColumna}
              </th>
              <th className="p-3 text-center font-bold text-slate-600 dark:text-slate-300 w-20">
                Acción
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {Object.entries(catalogo).length === 0 ? (
              <tr>
                <td
                  colSpan={3}
                  className="p-8 text-center text-slate-400 dark:text-slate-500 italic"
                >
                  Sin registros todavía.
                </td>
              </tr>
            ) : (
              Object.entries(catalogo)
                .sort()
                .map(([clave, valor]) => (
                  <tr
                    key={clave}
                    className="hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
                  >
                    <td className="p-3 font-bold text-slate-700 dark:text-slate-200">{clave}</td>
                    <td className="p-3 font-black text-emerald-600 dark:text-emerald-400 text-right">
                      {formatearValor(valor)}
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => onEliminar(clave)}
                        className="text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 p-1.5 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                        title={`Eliminar ${clave}`}
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
  );
};

export default function PanelAjustesRentabilidad() {
  const queryClient = useQueryClient();

  const {
    data: ajustesNube,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["ajustes_rentabilidad"],
    queryFn: obtenerAjustesRentabilidad,
  });

  const { data: unidades = [] } = useQuery({
    queryKey: ["unidades"],
    queryFn: obtenerUnidadesFirebase,
  });

  const [ajustes, setAjustes] = useState<AjustesRentabilidad | null>(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (ajustesNube) setAjustes(ajustesNube);
  }, [ajustesNube]);

  const handleGuardar = async () => {
    if (!ajustes) return;
    setGuardando(true);
    const exito = await guardarAjustesRentabilidad(ajustes);
    if (exito) {
      notificarExito("Ajustes de rentabilidad guardados correctamente.");
      queryClient.invalidateQueries({ queryKey: ["ajustes_rentabilidad"] });
    } else {
      notificarError("Hubo un error al guardar los ajustes.");
    }
    setGuardando(false);
  };

  if (isLoading || !ajustes) {
    return (
      <div className="flex w-full h-full items-center justify-center bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
        <p className="text-slate-500 dark:text-slate-400 font-bold text-lg animate-pulse flex items-center gap-2">
          <SlidersHorizontal size={24} className="animate-spin" />
          Cargando ajustes de rentabilidad...
        </p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
        <AlertCircle className="text-rose-500 mb-3" size={40} />
        <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200">
          Error al cargar la configuración
        </h3>
      </div>
    );
  }

  return (
    <div className="w-full bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 h-full overflow-y-auto custom-scrollbar">
      <div className="flex items-center gap-2 mb-6">
        <SlidersHorizontal className="text-blue-600 dark:text-blue-400" size={24} />
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
          Ajustes de Rentabilidad
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* --- COLUMNA IZQUIERDA: SUELDOS/COMISIONES + COSTO POR KM --- */}
        <div className="space-y-6">
          <div className="bg-slate-50 dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 uppercase mb-4">
              Sueldos, Comisiones y Metas
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {CAMPOS.map(({ clave, label, step }) => (
                <div key={clave}>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                    {label}
                  </label>
                  <input
                    type="number"
                    step={step}
                    value={ajustes[clave]}
                    onChange={(e) =>
                      setAjustes({
                        ...ajustes,
                        [clave]: Number(e.target.value),
                      })
                    }
                    className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-200 font-semibold focus:ring-2 focus:ring-blue-500 outline-none transition-shadow bg-white dark:bg-slate-800"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 uppercase flex items-center gap-2 mb-4">
              <Truck size={16} className="text-blue-600 dark:text-blue-400" /> Costo por KM de
              Unidades
            </h3>
            <div className="max-h-96 overflow-y-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg custom-scrollbar">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-100 dark:bg-slate-700 sticky top-0 z-10 shadow-sm">
                  <tr>
                    <th className="p-3 font-bold text-slate-600 dark:text-slate-300">Unidad</th>
                    <th className="p-3 font-bold text-slate-600 dark:text-slate-300 text-right">
                      $ / KM
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {unidades.length === 0 ? (
                    <tr>
                      <td
                        colSpan={2}
                        className="p-8 text-center text-slate-400 dark:text-slate-500 italic"
                      >
                        No hay unidades registradas.
                      </td>
                    </tr>
                  ) : (
                    [...unidades]
                      .sort((a, b) =>
                        (a.numero || "").localeCompare(b.numero || ""),
                      )
                      .map((unidad) => (
                        <tr
                          key={unidad.id}
                          className="hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
                        >
                          <td className="p-3 font-bold text-slate-700 dark:text-slate-200">
                            {unidad.numero} — {unidad.tipo}
                          </td>
                          <td className="p-3 text-right">
                            <input
                              type="number"
                              step="0.01"
                              value={ajustes.costoPorKmUnidades[unidad.id] ?? 0}
                              onChange={(e) =>
                                setAjustes({
                                  ...ajustes,
                                  costoPorKmUnidades: {
                                    ...ajustes.costoPorKmUnidades,
                                    [unidad.id]: Number(e.target.value),
                                  },
                                })
                              }
                              className="w-28 p-2 border border-slate-300 dark:border-slate-600 rounded-lg text-right font-semibold outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                            />
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <button
            onClick={handleGuardar}
            disabled={guardando}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold p-3.5 rounded-xl transition-colors shadow-sm disabled:opacity-50"
          >
            <Save size={20} />
            {guardando
              ? "Guardando cambios en la nube..."
              : "Guardar Toda la Configuración"}
          </button>
        </div>

        {/* --- COLUMNA DERECHA: CATÁLOGOS POR RUTA --- */}
        <div className="space-y-6">
          <CatalogoPorClave
            titulo="Km Promedio por Ruta"
            icono={<MapPin size={16} className="text-emerald-600 dark:text-emerald-400" />}
            catalogo={ajustes.kmPromedioRutas}
            unidad="km"
            onAgregar={(clave, km) =>
              setAjustes((prev) =>
                prev
                  ? {
                      ...prev,
                      kmPromedioRutas: { ...prev.kmPromedioRutas, [clave]: km },
                    }
                  : prev,
              )
            }
            onEliminar={(clave) =>
              setAjustes((prev) => {
                if (!prev) return prev;
                const nuevo = { ...prev.kmPromedioRutas };
                delete nuevo[clave];
                return { ...prev, kmPromedioRutas: nuevo };
              })
            }
          />

          <CatalogoPorClave
            titulo="Permiso de Descarga por Ruta"
            icono={<MapPin size={16} className="text-amber-600 dark:text-amber-400" />}
            catalogo={ajustes.permisoDescargaRutas}
            unidad="dinero"
            onAgregar={(clave, monto) =>
              setAjustes((prev) =>
                prev
                  ? {
                      ...prev,
                      permisoDescargaRutas: {
                        ...prev.permisoDescargaRutas,
                        [clave]: monto,
                      },
                    }
                  : prev,
              )
            }
            onEliminar={(clave) =>
              setAjustes((prev) => {
                if (!prev) return prev;
                const nuevo = { ...prev.permisoDescargaRutas };
                delete nuevo[clave];
                return { ...prev, permisoDescargaRutas: nuevo };
              })
            }
          />
        </div>
      </div>
    </div>
  );
}
