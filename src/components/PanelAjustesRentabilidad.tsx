import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { SlidersHorizontal, Save, AlertCircle } from "lucide-react";
import {
  obtenerAjustesRentabilidad,
  guardarAjustesRentabilidad,
  type AjustesRentabilidad,
} from "../firebase/ajustesRentabilidadService";
import { notificarExito, notificarError } from "../utils/notificaciones";

const CAMPOS: {
  clave: keyof AjustesRentabilidad;
  label: string;
  step: string;
}[] = [
  {
    clave: "salarioSemanalChofer",
    label: "Salario Semanal Chofer (Ej. 2500)",
    step: "0.01",
  },
  {
    clave: "salarioSemanalAyudante",
    label: "Salario Semanal Ayudante (Ej. 1951.60)",
    step: "0.01",
  },
  {
    clave: "rendimientoKmPorLitro",
    label: "Rendimiento Promedio (km/lt) (Ej. 4.21)",
    step: "0.01",
  },
  {
    clave: "gastoLegalDiario",
    label: "Gasto Legal Promedio por Día (Ej. 160.53)",
    step: "0.01",
  },
  {
    clave: "gastoMantenimientoDiario",
    label: "Gasto Mantenimiento Promedio por Día (Ej. 415.88)",
    step: "0.01",
  },
  {
    clave: "pctPromedioContribucion",
    label: "% Promedio de Contribución (Ej. 7.40)",
    step: "0.01",
  },
  {
    clave: "pctPromedioCostoSinImpuesto",
    label: "% Promedio al Costo S/Impuesto (Ej. 13.22)",
    step: "0.01",
  },
  {
    clave: "precioDieselDefault",
    label: "Precio del Diésel por Defecto (Ej. 28.43)",
    step: "0.01",
  },
  {
    clave: "metaGastoOperativoPct",
    label: "Meta de Gasto Operativo (%) (Ej. 40)",
    step: "1",
  },
];

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

      <div className="bg-slate-50 dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm max-w-2xl">
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

      <button
        onClick={handleGuardar}
        disabled={guardando}
        className="mt-6 w-full max-w-2xl flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold p-3.5 rounded-xl transition-colors shadow-sm disabled:opacity-50"
      >
        <Save size={20} />
        {guardando ? "Guardando cambios en la nube..." : "Guardar Ajustes de Rentabilidad"}
      </button>
    </div>
  );
}
