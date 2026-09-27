import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  TrendingUp,
  AlertCircle,
  FileText,
  FileSpreadsheet,
  Fuel,
  Wallet,
  Gauge,
  Users,
  Coins,
} from "lucide-react";
import { obtenerUnidadesFirebase } from "../firebase/unidadesService";
import { obtenerAjustesNomina } from "../firebase/ajustesNominaService";
import { obtenerAjustesRentabilidad } from "../firebase/ajustesRentabilidadService";
import { LISTA_RUTAS } from "../utils/mapaUtils";
import {
  calcularSimulacionRentabilidad,
  buscarValorPorRuta,
  type SimulacionRentabilidadInput,
} from "../utils/rentabilidadUtils";
import {
  exportarSimulacionRentabilidadPDF,
  exportarSimulacionRentabilidadExcel,
} from "../utils/reportesRentabilidadUtils";

const fMoneda = (n: number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(n);

const fPct = (n: number | null) => (n === null ? "—" : `${n.toFixed(2)}%`);

const inputAmarillo =
  "w-full p-2.5 border rounded-lg font-semibold outline-none focus:ring-2 focus:ring-amber-500 transition-shadow bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700 text-slate-800 dark:text-slate-100";

// Muestra el campo vacío cuando el valor es 0: si no, al borrar el "0" para
// escribir un valor nuevo, Number("") vuelve a dar 0 y React lo muestra de
// nuevo como "0" antes de que se pueda teclear nada.
const valorInput = (n: number) => (n === 0 ? "" : n);
const parseInput = (valor: string) => (valor === "" ? 0 : Number(valor));

const hoyStr = () => new Date().toLocaleDateString("sv-SE");

// Cachea en el navegador la simulación en curso (unidad/ruta/campos
// editables) para no perderla al cambiar de sub-vista del panel admin.
// No es historial ni se guarda en Firestore — solo el borrador local.
const LS_BORRADOR = "rentabilidad_borrador";

interface BorradorSimulacion {
  unidadId: string;
  ruta: string;
  ayudante1Va: boolean;
  ayudante2Va: boolean;
  costoPorKm: number;
  kmTrayecto: number;
  permisoDescarga: number;
  viaticoChofer: number;
  viaticoAyudante1: number;
  viaticoAyudante2: number;
  ventaProgramada: number;
}

const cargarBorrador = (): Partial<BorradorSimulacion> => {
  try {
    const guardado = localStorage.getItem(LS_BORRADOR);
    return guardado ? JSON.parse(guardado) : {};
  } catch {
    return {};
  }
};

const SEMAFORO_LABEL: Record<string, string> = {
  RENTABLE: "RENTABLE",
  REVISAR: "REVISAR",
  NO_RENTABLE: "NO RENTABLE",
};

// Clases completas y estáticas (Tailwind no genera CSS para clases armadas
// por interpolación de string).
const SEMAFORO_ICONO_CLASES: Record<string, string> = {
  RENTABLE: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400",
  REVISAR: "bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400",
  NO_RENTABLE: "bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400",
  default: "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400",
};

// Banner "hero" del resultado: fondo, borde y texto según el semáforo.
const SEMAFORO_BANNER_CLASES: Record<string, string> = {
  RENTABLE:
    "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900",
  REVISAR:
    "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900",
  NO_RENTABLE: "bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900",
  default: "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700",
};

// Color de la barra de costo dentro del banner, según el semáforo.
const SEMAFORO_BARRA_CLASES: Record<string, string> = {
  RENTABLE: "bg-emerald-500",
  REVISAR: "bg-amber-500",
  NO_RENTABLE: "bg-rose-500",
  default: "bg-slate-400",
};

interface CategoriaCosto {
  nombre: string;
  icono: typeof Users;
  clases: string;
  filas: [string, number][];
}

// Clases completas y estáticas por categoría del desglose de costo.
const CATEGORIA_CLASES: Record<string, string> = {
  blue: "bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400",
  amber: "bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400",
  violet: "bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400",
  sky: "bg-sky-100 dark:bg-sky-900/40 text-sky-600 dark:text-sky-400",
};

export default function PanelRentabilidad() {
  const { data: unidades = [], isLoading: cargandoUnidades } = useQuery({
    queryKey: ["unidades"],
    queryFn: obtenerUnidadesFirebase,
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

  const cargando = cargandoUnidades || cargandoNomina || cargandoRentabilidad;

  const [borradorInicial] = useState(cargarBorrador);
  const [unidadId, setUnidadId] = useState(borradorInicial.unidadId ?? "");
  const [ruta, setRuta] = useState(borradorInicial.ruta ?? "");
  const [ayudante1Va, setAyudante1Va] = useState(
    borradorInicial.ayudante1Va ?? true,
  );
  const [ayudante2Va, setAyudante2Va] = useState(
    borradorInicial.ayudante2Va ?? true,
  );
  const [costoPorKm, setCostoPorKm] = useState(borradorInicial.costoPorKm ?? 0);
  const [kmTrayecto, setKmTrayecto] = useState(borradorInicial.kmTrayecto ?? 0);
  const [permisoDescarga, setPermisoDescarga] = useState(
    borradorInicial.permisoDescarga ?? 0,
  );
  const [viaticoChofer, setViaticoChofer] = useState(
    borradorInicial.viaticoChofer ?? 0,
  );
  const [viaticoAyudante1, setViaticoAyudante1] = useState(
    borradorInicial.viaticoAyudante1 ?? 0,
  );
  const [viaticoAyudante2, setViaticoAyudante2] = useState(
    borradorInicial.viaticoAyudante2 ?? 0,
  );
  const [ventaProgramada, setVentaProgramada] = useState(
    borradorInicial.ventaProgramada ?? 0,
  );
  const [isGenerandoPDF, setIsGenerandoPDF] = useState(false);
  const [isGenerandoExcel, setIsGenerandoExcel] = useState(false);

  const unidadesOrdenadas = useMemo(
    () => [...unidades].sort((a, b) => (a.numero || "").localeCompare(b.numero || "")),
    [unidades],
  );

  const unidadSeleccionada = unidadesOrdenadas.find((u) => u.id === unidadId);

  const handleSeleccionarUnidad = (id: string) => {
    setUnidadId(id);
    if (!ajustesRentabilidad) return;
    setCostoPorKm(ajustesRentabilidad.costoPorKmUnidades[id] ?? 0);
  };

  const handleSeleccionarRuta = (nombre: string) => {
    setRuta(nombre);
    if (!ajustesNomina || !ajustesRentabilidad) return;
    const tarifaViatico = buscarValorPorRuta(nombre, ajustesNomina.viaticosRutas);
    setViaticoChofer(tarifaViatico);
    setViaticoAyudante1(tarifaViatico);
    setViaticoAyudante2(tarifaViatico);
    setKmTrayecto(buscarValorPorRuta(nombre, ajustesRentabilidad.kmPromedioRutas));
    setPermisoDescarga(
      buscarValorPorRuta(nombre, ajustesRentabilidad.permisoDescargaRutas),
    );
  };

  const input: SimulacionRentabilidadInput = {
    unidadId,
    ruta,
    costoPorKm,
    kmTrayecto,
    permisoDescarga,
    viaticoChofer,
    viaticoAyudante1,
    viaticoAyudante2,
    ayudante1Va,
    ayudante2Va,
    ventaProgramada,
  };

  useEffect(() => {
    try {
      localStorage.setItem(LS_BORRADOR, JSON.stringify(input));
    } catch {
      // localStorage no disponible (modo privado, cuota llena, etc.):
      // la simulación sigue funcionando, solo no se cachea.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    unidadId,
    ruta,
    costoPorKm,
    kmTrayecto,
    permisoDescarga,
    viaticoChofer,
    viaticoAyudante1,
    viaticoAyudante2,
    ayudante1Va,
    ayudante2Va,
    ventaProgramada,
  ]);

  const resultado = useMemo(() => {
    if (!ajustesRentabilidad || !ajustesNomina) return null;
    return calcularSimulacionRentabilidad(
      input,
      ajustesRentabilidad,
      ajustesNomina,
    );
  }, [input, ajustesRentabilidad, ajustesNomina]);

  const handleExportarPDF = async () => {
    if (!resultado || !unidadSeleccionada || !ruta) return;
    setIsGenerandoPDF(true);
    await exportarSimulacionRentabilidadPDF(
      input,
      resultado,
      unidadSeleccionada,
      ruta,
      hoyStr(),
    );
    setIsGenerandoPDF(false);
  };

  const handleExportarExcel = () => {
    if (!resultado || !unidadSeleccionada || !ruta) return;
    setIsGenerandoExcel(true);
    exportarSimulacionRentabilidadExcel(
      input,
      resultado,
      unidadSeleccionada,
      ruta,
      hoyStr(),
    );
    setIsGenerandoExcel(false);
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

  const semaforoKey = resultado?.semaforo ?? "default";
  const semaforoIconoClases =
    SEMAFORO_ICONO_CLASES[semaforoKey] ?? SEMAFORO_ICONO_CLASES.default;
  const semaforoBannerClases =
    SEMAFORO_BANNER_CLASES[semaforoKey] ?? SEMAFORO_BANNER_CLASES.default;
  const semaforoBarraClases =
    SEMAFORO_BARRA_CLASES[semaforoKey] ?? SEMAFORO_BARRA_CLASES.default;

  const pctCosto =
    resultado && resultado.ventaProgramada > 0
      ? Math.min(100, (resultado.totalCosto / resultado.ventaProgramada) * 100)
      : 0;

  const categorias: CategoriaCosto[] = resultado
    ? [
        {
          nombre: "Sueldos (día)",
          icono: Users,
          clases: CATEGORIA_CLASES.blue,
          filas: [
            ["Chofer", resultado.salarioChofer],
            ["Ayudante 1", resultado.salarioAyudante1],
            ["Ayudante 2", resultado.salarioAyudante2],
            ["Vendedor", resultado.salarioVendedor],
          ],
        },
        {
          nombre: "Viáticos",
          icono: Wallet,
          clases: CATEGORIA_CLASES.amber,
          filas: [
            ["Chofer", resultado.viaticoChofer],
            ["Ayudante 1", resultado.viaticoAyudante1],
            ["Ayudante 2", resultado.viaticoAyudante2],
          ],
        },
        {
          nombre: "Comisiones",
          icono: Coins,
          clases: CATEGORIA_CLASES.violet,
          filas: [
            ["Chofer", resultado.comisionChofer],
            ["Ayudante 1", resultado.comisionAyudante1],
            ["Ayudante 2", resultado.comisionAyudante2],
            ["Vendedor", resultado.comisionVendedor],
          ],
        },
        {
          nombre: "Otros costos",
          icono: Fuel,
          clases: CATEGORIA_CLASES.sky,
          filas: [
            [
              `Combustible (${input.kmTrayecto} km × ${fMoneda(input.costoPorKm)})`,
              resultado.gastoCombustible,
            ],
            ["Permiso de descarga", resultado.permisoDescarga],
          ],
        },
      ]
    : [];

  return (
    <div className="w-full bg-slate-50/50 dark:bg-slate-900/50 p-6 rounded-xl flex flex-col">
      <div className="mb-6">
        <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <TrendingUp className="text-blue-600 dark:text-blue-400" size={28} />
          Rentabilidad de Rutas
        </h2>
        <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">
          Selecciona una unidad y una ruta, y ajusta los campos en amarillo
          para simular su rentabilidad.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Panel izquierdo: selección y campos editables */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                  Unidad
                </label>
                <select
                  value={unidadId}
                  onChange={(e) => handleSeleccionarUnidad(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg font-semibold outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                >
                  <option value="">Selecciona una unidad...</option>
                  {unidadesOrdenadas.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.numero} — {u.tipo}
                    </option>
                  ))}
                </select>
                {unidadSeleccionada && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 font-medium">
                    Capacidad: {Number(unidadSeleccionada.capacidad_kg).toLocaleString("es-MX")} kg
                    {" / "}
                    {Number(unidadSeleccionada.capacidad_m3).toLocaleString("es-MX")} m³
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                  Ruta
                </label>
                <select
                  value={ruta}
                  onChange={(e) => handleSeleccionarRuta(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg font-semibold outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                >
                  <option value="">Selecciona una ruta...</option>
                  {LISTA_RUTAS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-6 pt-1">
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

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                  Costo por KM
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={valorInput(costoPorKm)}
                  onChange={(e) => setCostoPorKm(parseInput(e.target.value))}
                  className={inputAmarillo}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                  Km Trayecto
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={valorInput(kmTrayecto)}
                  onChange={(e) => setKmTrayecto(parseInput(e.target.value))}
                  className={inputAmarillo}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                  Permiso Descarga
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={valorInput(permisoDescarga)}
                  onChange={(e) => setPermisoDescarga(parseInput(e.target.value))}
                  className={inputAmarillo}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                  Viático Chofer
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={valorInput(viaticoChofer)}
                  onChange={(e) => setViaticoChofer(parseInput(e.target.value))}
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
                  value={valorInput(viaticoAyudante1)}
                  onChange={(e) => setViaticoAyudante1(parseInput(e.target.value))}
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
                  value={valorInput(viaticoAyudante2)}
                  onChange={(e) => setViaticoAyudante2(parseInput(e.target.value))}
                  className={`${inputAmarillo} disabled:opacity-50`}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                Venta Programada
              </label>
              <input
                type="number"
                step="0.01"
                value={valorInput(ventaProgramada)}
                onChange={(e) => setVentaProgramada(parseInput(e.target.value))}
                className={`${inputAmarillo} border-2 text-lg`}
              />
            </div>
          </div>
        </div>

        {/* Panel derecho: resultado */}
        <div className="space-y-4 lg:sticky lg:top-0">
          {!resultado ? (
            <div className="p-8 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl bg-white dark:bg-slate-800 flex flex-col items-center text-center">
              <AlertCircle className="text-slate-400 dark:text-slate-500 mb-3" size={40} />
              <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200">
                Cargando parámetros...
              </h3>
            </div>
          ) : (
            <>
              {/* Hero: semáforo, rentabilidad y comparación venta vs costo */}
              <div className={`rounded-2xl p-6 border ${semaforoBannerClases}`}>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${semaforoIconoClases}`}
                    >
                      <Gauge size={28} />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Semáforo de rentabilidad
                      </p>
                      <p className="text-2xl font-black text-slate-800 dark:text-slate-100">
                        {resultado.semaforo === null
                          ? "Sin datos"
                          : SEMAFORO_LABEL[resultado.semaforo]}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-8">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Rentabilidad
                      </p>
                      <p className="text-3xl font-black text-slate-800 dark:text-slate-100 tabular-nums">
                        {fPct(resultado.rentabilidadPct)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Utilidad de ruta
                      </p>
                      <p className="text-3xl font-black text-slate-800 dark:text-slate-100 tabular-nums">
                        {fMoneda(resultado.utilidadRuta)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-5">
                  <div className="flex justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    <span>Costo total {fMoneda(resultado.totalCosto)}</span>
                    <span>Venta programada {fMoneda(resultado.ventaProgramada)}</span>
                  </div>
                  <div className="h-3 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${semaforoBarraClases}`}
                      style={{ width: `${pctCosto}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400">
                    <Wallet size={22} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase">
                      Total Costo
                    </p>
                    <p className="text-lg font-black text-slate-800 dark:text-slate-100 tabular-nums">
                      {fMoneda(resultado.totalCosto)}
                    </p>
                  </div>
                </div>
                <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
                    <Fuel size={22} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase">
                      Gasto Combustible
                    </p>
                    <p className="text-lg font-black text-slate-800 dark:text-slate-100 tabular-nums">
                      {fMoneda(resultado.gastoCombustible)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Desglose de costo agrupado por categoría */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
                {categorias.map((cat) => {
                  const subtotal = cat.filas.reduce((acc, [, v]) => acc + v, 0);
                  const Icono = cat.icono;
                  return (
                    <div
                      key={cat.nombre}
                      className="border-b border-slate-100 dark:border-slate-700 last:border-b-0"
                    >
                      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50/70 dark:bg-slate-900/40">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-6 h-6 rounded-md flex items-center justify-center ${cat.clases}`}
                          >
                            <Icono size={14} />
                          </span>
                          <span className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                            {cat.nombre}
                          </span>
                        </div>
                        <span className="text-sm font-black text-slate-700 dark:text-slate-200 tabular-nums">
                          {fMoneda(subtotal)}
                        </span>
                      </div>
                      <table className="w-full text-sm">
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                          {cat.filas.map(([label, valor]) => (
                            <tr key={label}>
                              <td className="pl-11 pr-4 py-1.5 text-slate-500 dark:text-slate-400">
                                {label}
                              </td>
                              <td className="px-4 py-1.5 text-right font-semibold text-slate-700 dark:text-slate-200 tabular-nums">
                                {fMoneda(valor)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })}
              </div>

              {/* Resumen final: total, venta, margen y utilidad */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    <tr className="bg-slate-50 dark:bg-slate-900">
                      <td className="px-4 py-2 font-bold text-slate-700 dark:text-slate-200">
                        TOTAL COSTO
                      </td>
                      <td className="px-4 py-2 text-right font-black text-slate-800 dark:text-slate-100 tabular-nums">
                        {fMoneda(resultado.totalCosto)}
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
                        Margen Bruto $
                      </td>
                      <td className="px-4 py-2 text-right font-bold text-slate-700 dark:text-slate-200 tabular-nums">
                        {fMoneda(resultado.margenBruto)}
                      </td>
                    </tr>
                    <tr className="bg-emerald-50 dark:bg-emerald-950/30">
                      <td className="px-4 py-2 font-bold text-emerald-800 dark:text-emerald-300">
                        UTILIDAD RUTA
                      </td>
                      <td className="px-4 py-2 text-right font-black text-emerald-800 dark:text-emerald-300 tabular-nums">
                        {fMoneda(resultado.utilidadRuta)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleExportarPDF}
                  disabled={!unidadSeleccionada || !ruta || isGenerandoPDF}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-colors shadow-sm ${
                    !unidadSeleccionada || !ruta || isGenerandoPDF
                      ? "bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed"
                      : "bg-slate-800 hover:bg-slate-900 text-white"
                  }`}
                >
                  <FileText size={18} /> Exportar PDF
                </button>
                <button
                  onClick={handleExportarExcel}
                  disabled={!unidadSeleccionada || !ruta || isGenerandoExcel}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-colors shadow-sm ${
                    !unidadSeleccionada || !ruta || isGenerandoExcel
                      ? "bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed"
                      : "bg-emerald-700 hover:bg-emerald-800 text-white"
                  }`}
                >
                  <FileSpreadsheet size={18} /> Exportar Excel
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
