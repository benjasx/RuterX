import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import * as XLSX from "xlsx";
import {
  TrendingUp,
  AlertCircle,
  FileSpreadsheet,
  FileText,
  CircleDollarSign,
  Wallet,
  Percent,
  Target,
} from "lucide-react";
import { obtenerDistribucionPorRango } from "../firebase/distribucionService";
import { obtenerAjustesNomina } from "../firebase/ajustesNominaService";
import {
  calcularRentabilidad,
  type RentabilidadViaje,
} from "../utils/rentabilidadUtils";
import { exportarRentabilidadPDF } from "../utils/reportesRentabilidadUtils";

const fMoneda = (n: number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(n);

const fPct = (n: number) => `${n.toFixed(1)}%`;

export default function PanelRentabilidad() {
  const hoy = new Date();
  const hace7Dias = new Date();
  hace7Dias.setDate(hoy.getDate() - 7);

  const [fechaInicio, setFechaInicio] = useState(
    hace7Dias.toISOString().split("T")[0],
  );
  const [fechaFin, setFechaFin] = useState(hoy.toISOString().split("T")[0]);
  const [isGenerandoPDF, setIsGenerandoPDF] = useState(false);

  const {
    data: registros = [],
    isLoading: cargandoDistribucion,
    isError,
  } = useQuery({
    queryKey: ["distribucion_rango", fechaInicio, fechaFin],
    queryFn: () => obtenerDistribucionPorRango(fechaInicio, fechaFin),
  });

  const { data: ajustesNomina, isLoading: cargandoAjustes } = useQuery({
    queryKey: ["ajustes_nomina"],
    queryFn: obtenerAjustesNomina,
  });

  const cargando = cargandoDistribucion || cargandoAjustes;
  const metaGastoOperativoPct = ajustesNomina?.metaGastoOperativoPct ?? 40;

  const viajes = useMemo(() => {
    const lista: RentabilidadViaje[] = [];

    registros.forEach((registro: any) => {
      (registro.filas || []).forEach((fila: any) => {
        if (!fila.chofer || fila.chofer === "-" || !fila.chofer.trim()) {
          return;
        }
        const rentabilidad = calcularRentabilidad(
          fila,
          registro.fecha,
          metaGastoOperativoPct,
        );
        if (rentabilidad) lista.push(rentabilidad);
      });
    });

    return lista.sort((a, b) => {
      if (a.fecha !== b.fecha) return b.fecha.localeCompare(a.fecha);
      return a.ruta.localeCompare(b.ruta);
    });
  }, [registros, metaGastoOperativoPct]);

  const resumen = useMemo(() => {
    if (viajes.length === 0) return null;
    const ventaTotal = viajes.reduce((acc, v) => acc + v.venta, 0);
    const gastoTotal = viajes.reduce((acc, v) => acc + v.gastoOperativo, 0);
    const rentabilidadTotal = viajes.reduce(
      (acc, v) => acc + v.rentabilidad,
      0,
    );
    const optimas = viajes.filter((v) => v.esOptima).length;

    return {
      ventaTotal,
      gastoTotal,
      rentabilidadTotal,
      pctGastoPromedio: (gastoTotal / ventaTotal) * 100,
      pctRentabilidadPromedio: (rentabilidadTotal / ventaTotal) * 100,
      optimas,
      total: viajes.length,
    };
  }, [viajes]);

  const exportarRentabilidadExcel = () => {
    const filas = viajes.map((v) => ({
      Fecha: v.fecha,
      Ruta: v.ruta,
      Chofer: v.chofer,
      Unidad: v.unidad,
      Venta: v.venta,
      "Gasto Operativo": v.gastoOperativo,
      "% Gasto": Number(v.pctGasto.toFixed(2)),
      Rentabilidad: v.rentabilidad,
      "% Rentabilidad": Number(v.pctRentabilidad.toFixed(2)),
      Estado: v.esOptima ? "Óptima" : "No óptima",
    }));

    const hoja = XLSX.utils.json_to_sheet(filas);
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, "Rentabilidad");
    XLSX.writeFile(libro, `Rentabilidad_Rutas_${fechaInicio}_a_${fechaFin}.xlsx`);
  };

  const handleDescargarPDF = async () => {
    if (!resumen) return;
    setIsGenerandoPDF(true);
    await exportarRentabilidadPDF(viajes, resumen, fechaInicio, fechaFin);
    setIsGenerandoPDF(false);
  };

  if (isError) {
    return (
      <div className="w-full bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 h-full flex flex-col items-center justify-center">
        <AlertCircle className="text-rose-500 mb-3" size={40} />
        <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200">
          Error al cargar los datos
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Hubo un problema al conectar con la base de datos.
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
          Por cada viaje, % de la venta que se fue en gasto operativo
          (viático + comisiones) contra la meta configurada (
          {metaGastoOperativoPct}% gasto / {100 - metaGastoOperativoPct}%
          rentabilidad).
        </p>
      </div>

      {/* Resumen del rango */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
            <CircleDollarSign size={24} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase">
              Venta Total
            </p>
            <p className="text-xl lg:text-2xl font-black text-slate-800 dark:text-slate-100 tabular-nums">
              {fMoneda(resumen?.ventaTotal ?? 0)}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400">
            <Wallet size={24} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase">
              Gasto Operativo Total
            </p>
            <p className="text-xl lg:text-2xl font-black text-slate-800 dark:text-slate-100 tabular-nums">
              {fMoneda(resumen?.gastoTotal ?? 0)}{" "}
              <span className="text-sm text-slate-500 dark:text-slate-400 font-bold">
                ({fPct(resumen?.pctGastoPromedio ?? 0)})
              </span>
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400">
            <Percent size={24} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase">
              Rentabilidad Total
            </p>
            <p className="text-xl lg:text-2xl font-black text-slate-800 dark:text-slate-100 tabular-nums">
              {fMoneda(resumen?.rentabilidadTotal ?? 0)}{" "}
              <span className="text-sm text-slate-500 dark:text-slate-400 font-bold">
                ({fPct(resumen?.pctRentabilidadPromedio ?? 0)})
              </span>
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${
              resumen && resumen.optimas === resumen.total
                ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400"
                : "bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400"
            }`}
          >
            <Target size={24} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase">
              Rutas Óptimas
            </p>
            <p className="text-xl lg:text-2xl font-black text-slate-800 dark:text-slate-100 tabular-nums">
              {resumen ? `${resumen.optimas} de ${resumen.total}` : "0 de 0"}
            </p>
          </div>
        </div>
      </div>

      {/* Filtros de fecha + exportación */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm mb-6">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 rounded-t-2xl border-b bg-blue-50 dark:bg-blue-950/40 border-blue-100 dark:border-blue-900">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-blue-800 dark:text-blue-300">
              Desde:
            </span>
            <input
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              className="px-2 py-1 rounded-md text-sm border-none shadow-sm text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 cursor-pointer focus:ring-2 outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-blue-800 dark:text-blue-300">
              Hasta:
            </span>
            <input
              type="date"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              className="px-2 py-1 rounded-md text-sm border-none shadow-sm text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 cursor-pointer focus:ring-2 outline-none"
            />
          </div>
        </div>

        <div className="p-4 flex flex-wrap gap-3">
          <button
            onClick={exportarRentabilidadExcel}
            disabled={cargando || viajes.length === 0}
            className={`flex-1 min-w-[160px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-colors shadow-sm ${
              cargando || viajes.length === 0
                ? "bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed"
                : "bg-emerald-700 hover:bg-emerald-800 text-white"
            }`}
          >
            <FileSpreadsheet size={18} /> Excel
          </button>

          <button
            onClick={handleDescargarPDF}
            disabled={cargando || viajes.length === 0 || isGenerandoPDF}
            className={`flex-1 min-w-[160px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-colors shadow-sm ${
              cargando || viajes.length === 0 || isGenerandoPDF
                ? "bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed"
                : "bg-slate-800 hover:bg-slate-900 text-white"
            }`}
          >
            <FileText size={18} /> PDF
          </button>
        </div>
      </div>

      {cargando ? (
        <div className="flex flex-col flex-1 items-center justify-center p-12 text-slate-500 dark:text-slate-400 font-bold animate-pulse gap-2 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
          <TrendingUp size={24} /> Calculando rentabilidad...
        </div>
      ) : viajes.length === 0 ? (
        <div className="p-8 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl bg-white dark:bg-slate-800 flex flex-col items-center text-center">
          <AlertCircle className="text-slate-400 dark:text-slate-500 mb-3" size={40} />
          <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200">
            No hay viajes con venta registrada en este rango de fechas
          </h3>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
          <table className="w-full text-left border-collapse text-sm bg-white dark:bg-slate-800">
            <thead>
              <tr className="bg-slate-800 text-white uppercase tracking-wider text-xs">
                <th className="px-4 py-4 font-bold">Fecha</th>
                <th className="px-4 py-4 font-bold">Ruta</th>
                <th className="px-4 py-4 font-bold">Chofer</th>
                <th className="px-4 py-4 font-bold">Unidad</th>
                <th className="px-4 py-4 font-bold text-right">Venta</th>
                <th className="px-4 py-4 font-bold text-right">
                  Gasto Operativo
                </th>
                <th className="px-4 py-4 font-bold text-right">% Gasto</th>
                <th className="px-4 py-4 font-bold text-right">
                  Rentabilidad
                </th>
                <th className="px-4 py-4 font-bold text-right">
                  % Rentabilidad
                </th>
                <th className="px-4 py-4 font-bold text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {viajes.map((v, index) => (
                <tr
                  key={`${v.fecha}-${v.ruta}-${index}`}
                  className="hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
                >
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                    {v.fecha}
                  </td>
                  <td className="px-4 py-3 font-bold text-slate-700 dark:text-slate-200">
                    {v.ruta}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                    {v.chofer}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                    {v.unidad}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-700 dark:text-slate-200">
                    {fMoneda(v.venta)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-700 dark:text-slate-200">
                    {fMoneda(v.gastoOperativo)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-700 dark:text-slate-200">
                    {fPct(v.pctGasto)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-700 dark:text-slate-200">
                    {fMoneda(v.rentabilidad)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-700 dark:text-slate-200">
                    {fPct(v.pctRentabilidad)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex items-center justify-center px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide border ${
                        v.esOptima
                          ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                          : "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800"
                      }`}
                    >
                      {v.esOptima ? "Óptima" : "No óptima"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
