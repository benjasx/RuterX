import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  TrendingUp,
  AlertCircle,
  FileText,
  Fuel,
  Wallet,
  Percent,
  Target,
} from "lucide-react";
import { obtenerRutasFirebase } from "../firebase/rutasService";
import { obtenerAjustesNomina } from "../firebase/ajustesNominaService";
import { obtenerAjustesRentabilidad } from "../firebase/ajustesRentabilidadService";
import {
  calcularSimulacionRentabilidad,
  type SimulacionRentabilidadInput,
} from "../utils/rentabilidadUtils";
import { exportarSimulacionRentabilidadPDF } from "../utils/reportesRentabilidadUtils";

const fMoneda = (n: number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(n);

const fPct = (n: number | null) => (n === null ? "—" : `${n.toFixed(2)}%`);

const inputAmarillo =
  "w-full p-2.5 border rounded-lg font-semibold outline-none focus:ring-2 focus:ring-amber-500 transition-shadow bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700 text-slate-800 dark:text-slate-100";

// Mismo criterio de normalización/matching que calcularFinanzas en
// PanelDistribucion.tsx: la tarifa de viático de la ruta más parecida gana.
const buscarViaticoRuta = (
  rutaNombre: string,
  viaticosRutas: Record<string, number>,
): number => {
  if (!rutaNombre) return 0;
  const normalizar = (s: string) =>
    s
      .toUpperCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .trim();
  const rutaNormalizada = normalizar(rutaNombre);
  for (const [rutaCatalogo, monto] of Object.entries(viaticosRutas)) {
    const catNorm = normalizar(rutaCatalogo);
    if (rutaNormalizada.includes(catNorm) || catNorm.includes(rutaNormalizada)) {
      return monto;
    }
  }
  return 0;
};

const hoyStr = () => new Date().toLocaleDateString("sv-SE");

export default function PanelRentabilidad() {
  const { data: rutas = [], isLoading: cargandoRutas } = useQuery({
    queryKey: ["rutas"],
    queryFn: obtenerRutasFirebase,
  });
  const { data: ajustesNomina, isLoading: cargandoNomina } = useQuery({
    queryKey: ["ajustes_nomina"],
    queryFn: obtenerAjustesNomina,
  });
  const { data: ajustesRentabilidad, isLoading: cargandoRentabilidad } =
    useQuery({
      queryKey: ["ajustes_rentabilidad"],
      queryFn: obtenerAjustesRentabilidad,
    });

  const cargando = cargandoRutas || cargandoNomina || cargandoRentabilidad;

  const [rutaId, setRutaId] = useState("");
  const [ayudante1Va, setAyudante1Va] = useState(true);
  const [ayudante2Va, setAyudante2Va] = useState(true);
  const [viaticoChofer, setViaticoChofer] = useState(0);
  const [viaticoAyudante1, setViaticoAyudante1] = useState(0);
  const [viaticoAyudante2, setViaticoAyudante2] = useState(0);
  const [kilometraje, setKilometraje] = useState(0);
  const [ventaProgramada, setVentaProgramada] = useState(0);
  const [precioDiesel, setPrecioDiesel] = useState(0);
  const [precioDieselInicializado, setPrecioDieselInicializado] =
    useState(false);
  const [isGenerandoPDF, setIsGenerandoPDF] = useState(false);

  useEffect(() => {
    if (ajustesRentabilidad && !precioDieselInicializado) {
      setPrecioDiesel(ajustesRentabilidad.precioDieselDefault);
      setPrecioDieselInicializado(true);
    }
  }, [ajustesRentabilidad, precioDieselInicializado]);

  const rutasOrdenadas = useMemo(
    () => [...rutas].sort((a, b) => a.nombre.localeCompare(b.nombre)),
    [rutas],
  );

  const rutaSeleccionada = rutasOrdenadas.find((r) => r.id === rutaId);

  const handleSeleccionarRuta = (id: string) => {
    setRutaId(id);
    const ruta = rutasOrdenadas.find((r) => r.id === id);
    if (!ruta || !ajustesNomina) return;
    const tarifa = buscarViaticoRuta(ruta.nombre, ajustesNomina.viaticosRutas);
    setViaticoChofer(tarifa);
    setViaticoAyudante1(tarifa);
    setViaticoAyudante2(tarifa);
    setKilometraje(ruta.kilometraje ?? 0);
  };

  const input: SimulacionRentabilidadInput = {
    ruta: rutaSeleccionada?.nombre || "",
    kilometraje,
    viaticoChofer,
    viaticoAyudante1,
    viaticoAyudante2,
    ayudante1Va,
    ayudante2Va,
    ventaProgramada,
    precioDiesel,
  };

  const resultado = useMemo(() => {
    if (!ajustesRentabilidad || !ajustesNomina) return null;
    return calcularSimulacionRentabilidad(
      input,
      ajustesRentabilidad,
      ajustesNomina,
    );
  }, [input, ajustesRentabilidad, ajustesNomina]);

  const handleExportarPDF = async () => {
    if (!resultado || !rutaSeleccionada) return;
    setIsGenerandoPDF(true);
    await exportarSimulacionRentabilidadPDF(
      input,
      resultado,
      rutaSeleccionada.nombre,
      hoyStr(),
    );
    setIsGenerandoPDF(false);
  };

  if (cargando) {
    return (
      <div className="flex w-full h-full items-center justify-center bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
        <p className="text-slate-500 dark:text-slate-400 font-bold text-lg animate-pulse flex items-center gap-2">
          <TrendingUp size={24} className="animate-spin" />
          Cargando calculadora de rentabilidad...
        </p>
      </div>
    );
  }

  return (
    <div className="w-full bg-slate-50/50 dark:bg-slate-900/50 p-6 rounded-xl flex flex-col h-full overflow-y-auto custom-scrollbar">
      <div className="mb-6">
        <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <TrendingUp className="text-blue-600 dark:text-blue-400" size={28} />
          Rentabilidad de Rutas
        </h2>
        <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">
          Selecciona una ruta y ajusta los campos en amarillo para simular su
          rentabilidad.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Panel izquierdo: selección y campos editables */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
              Ruta
            </label>
            <select
              value={rutaId}
              onChange={(e) => handleSeleccionarRuta(e.target.value)}
              className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg font-semibold outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
            >
              <option value="">Selecciona una ruta...</option>
              {rutasOrdenadas.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nombre}
                </option>
              ))}
            </select>

            <div className="flex gap-6 mt-4">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={ayudante1Va}
                  onChange={(e) => setAyudante1Va(e.target.checked)}
                  className="w-4 h-4 cursor-pointer accent-blue-600"
                />
                Ayudante 1 va
              </label>
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={ayudante2Va}
                  onChange={(e) => setAyudante2Va(e.target.checked)}
                  className="w-4 h-4 cursor-pointer accent-blue-600"
                />
                Ayudante 2 va
              </label>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 uppercase">
              Campos editables
            </h3>

            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                Viático Chofer
              </label>
              <input
                type="number"
                step="0.01"
                value={viaticoChofer}
                onChange={(e) => setViaticoChofer(Number(e.target.value))}
                className={inputAmarillo}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                Viático Ayudante 1
              </label>
              <input
                type="number"
                step="0.01"
                disabled={!ayudante1Va}
                value={viaticoAyudante1}
                onChange={(e) => setViaticoAyudante1(Number(e.target.value))}
                className={`${inputAmarillo} disabled:opacity-50`}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                Viático Ayudante 2
              </label>
              <input
                type="number"
                step="0.01"
                disabled={!ayudante2Va}
                value={viaticoAyudante2}
                onChange={(e) => setViaticoAyudante2(Number(e.target.value))}
                className={`${inputAmarillo} disabled:opacity-50`}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                Kilometraje
              </label>
              <input
                type="number"
                step="0.01"
                value={kilometraje}
                onChange={(e) => setKilometraje(Number(e.target.value))}
                className={inputAmarillo}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                Venta Programada
              </label>
              <input
                type="number"
                step="0.01"
                value={ventaProgramada}
                onChange={(e) => setVentaProgramada(Number(e.target.value))}
                className={inputAmarillo}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                Precio del Diésel
              </label>
              <input
                type="number"
                step="0.01"
                value={precioDiesel}
                onChange={(e) => setPrecioDiesel(Number(e.target.value))}
                className={inputAmarillo}
              />
            </div>
          </div>
        </div>

        {/* Panel derecho: resultado */}
        <div className="space-y-4">
          {!resultado ? (
            <div className="p-8 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl bg-white dark:bg-slate-800 flex flex-col items-center text-center">
              <AlertCircle className="text-slate-400 dark:text-slate-500 mb-3" size={40} />
              <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200">
                Cargando parámetros...
              </h3>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400">
                    <Wallet size={22} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase">
                      Gasto Total Ruta
                    </p>
                    <p className="text-lg font-black text-slate-800 dark:text-slate-100 tabular-nums">
                      {fMoneda(resultado.gastoTotalRuta)}
                    </p>
                  </div>
                </div>
                <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
                    <Fuel size={22} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase">
                      $/km
                    </p>
                    <p className="text-lg font-black text-slate-800 dark:text-slate-100 tabular-nums">
                      {resultado.pesosPorKm !== null
                        ? fMoneda(resultado.pesosPorKm)
                        : "—"}
                    </p>
                  </div>
                </div>
                <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400">
                    <Percent size={22} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase">
                      % Gasto vs Contribución
                    </p>
                    <p className="text-lg font-black text-slate-800 dark:text-slate-100 tabular-nums">
                      {fPct(resultado.pctGastoVsContribucion)}
                    </p>
                  </div>
                </div>
                <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-3">
                  <div
                    className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${
                      resultado.esOptima
                        ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400"
                        : "bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    <Target size={22} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase">
                      Estado
                    </p>
                    <p className="text-lg font-black text-slate-800 dark:text-slate-100">
                      {resultado.esOptima === null
                        ? "—"
                        : resultado.esOptima
                          ? "Óptima"
                          : "No óptima"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {[
                      ["Salario Chofer (día)", fMoneda(resultado.salarioChofer)],
                      ["Salario Ayudante 1 (día)", fMoneda(resultado.salarioAyudante1)],
                      ["Salario Ayudante 2 (día)", fMoneda(resultado.salarioAyudante2)],
                      ["Viático Chofer", fMoneda(resultado.viaticoChofer)],
                      ["Viático Ayudante 1", fMoneda(resultado.viaticoAyudante1)],
                      ["Viático Ayudante 2", fMoneda(resultado.viaticoAyudante2)],
                      ["Comisión Chofer", fMoneda(resultado.comisionChofer)],
                      ["Comisión Ayudante", fMoneda(resultado.comisionAyudante)],
                      ["Gasto Combustible", fMoneda(resultado.gastoCombustible)],
                      ["Gasto Legal", fMoneda(resultado.gastoLegal)],
                      ["Gasto Mantenimiento", fMoneda(resultado.gastoMantenimiento)],
                    ].map(([label, valor]) => (
                      <tr key={label}>
                        <td className="px-4 py-2 text-slate-500 dark:text-slate-400">
                          {label}
                        </td>
                        <td className="px-4 py-2 text-right font-bold text-slate-700 dark:text-slate-200 tabular-nums">
                          {valor}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-slate-50 dark:bg-slate-900">
                      <td className="px-4 py-2 font-bold text-slate-700 dark:text-slate-200">
                        Gasto Total Ruta
                      </td>
                      <td className="px-4 py-2 text-right font-black text-slate-800 dark:text-slate-100 tabular-nums">
                        {fMoneda(resultado.gastoTotalRuta)}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 text-slate-500 dark:text-slate-400">
                        Venta Programada
                      </td>
                      <td className="px-4 py-2 text-right font-bold text-slate-700 dark:text-slate-200 tabular-nums">
                        {fMoneda(resultado.ventaProgramada)}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 text-slate-500 dark:text-slate-400">
                        Al Costo/Sin Impuestos
                      </td>
                      <td className="px-4 py-2 text-right font-bold text-slate-700 dark:text-slate-200 tabular-nums">
                        {fMoneda(resultado.cantidadAlCosto)}
                      </td>
                    </tr>
                    <tr className="bg-slate-50 dark:bg-slate-900">
                      <td className="px-4 py-2 font-bold text-slate-700 dark:text-slate-200">
                        Contribución Promedio Real
                      </td>
                      <td className="px-4 py-2 text-right font-black text-slate-800 dark:text-slate-100 tabular-nums">
                        {fMoneda(resultado.contribucionPromedioReal)}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 text-slate-500 dark:text-slate-400">
                        Gasto Total vs Al Costo / vs Contribución
                      </td>
                      <td className="px-4 py-2 text-right font-bold text-slate-700 dark:text-slate-200 tabular-nums">
                        {fPct(resultado.pctGastoVsAlCosto)} /{" "}
                        {fPct(resultado.pctGastoVsContribucion)}
                      </td>
                    </tr>
                    <tr className="bg-emerald-50 dark:bg-emerald-950/30">
                      <td className="px-4 py-2 font-bold text-emerald-800 dark:text-emerald-300">
                        Contribución Real Después de Gastos
                      </td>
                      <td className="px-4 py-2 text-right font-black text-emerald-800 dark:text-emerald-300 tabular-nums">
                        {fMoneda(resultado.contribucionRealDespuesGastos)}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 text-slate-500 dark:text-slate-400">
                        Contribución Real vs Al Costo / vs Contribución
                      </td>
                      <td className="px-4 py-2 text-right font-bold text-slate-700 dark:text-slate-200 tabular-nums">
                        {fPct(resultado.pctContribucionRealVsAlCosto)} /{" "}
                        {fPct(resultado.pctContribucionRealVsContribucion)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <button
                onClick={handleExportarPDF}
                disabled={!rutaSeleccionada || isGenerandoPDF}
                className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-colors shadow-sm ${
                  !rutaSeleccionada || isGenerandoPDF
                    ? "bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed"
                    : "bg-slate-800 hover:bg-slate-900 text-white"
                }`}
              >
                <FileText size={18} /> Exportar PDF
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
