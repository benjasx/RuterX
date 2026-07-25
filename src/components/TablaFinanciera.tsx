import { FileText, BarChart3, Truck, Save, CloudUpload } from "lucide-react";

interface Props {
  datosProcesados: any[];
  fechaFormateada: string;
  mostrarGrafico: boolean;
  setMostrarGrafico: (val: boolean) => void;
  tipoMetricaGrafico: "monto" | "kg";
  setTipoMetricaGrafico: (val: "monto" | "kg") => void;
  maxMonto: number;
  maxKg: number;
  totales: { cred: number; ctdo: number; monto: number; kg: number };
  isGenerandoPDF: boolean;
  guardandoNube: boolean;
  formatearMoneda: (val: number) => string;
  formatearNumero: (val: number) => string;
  handleGuardarProgreso: () => void;
  handleExportarPDF: () => void;
  handleGuardarEnNube: () => void;
}

export default function TablaFinanciera({
  datosProcesados,
  fechaFormateada,
  mostrarGrafico,
  setMostrarGrafico,
  tipoMetricaGrafico,
  setTipoMetricaGrafico,
  maxMonto,
  maxKg,
  totales,
  isGenerandoPDF,
  guardandoNube,
  formatearMoneda,
  formatearNumero,
  handleGuardarProgreso,
  handleExportarPDF,
  handleGuardarEnNube,
}: Props) {
  return (
    <div className="flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2 gap-2">
        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
          <FileText size={16} className="text-blue-600" /> Tabla 1: Relación de
          Salida Financiera
        </h3>
        <div className="flex items-center gap-2">
          {mostrarGrafico && (
            <div className="bg-slate-200 p-1 rounded-lg flex text-xs font-semibold">
              <button
                onClick={() => setTipoMetricaGrafico("monto")}
                className={`px-3 py-1 rounded-md transition-all ${tipoMetricaGrafico === "monto" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-600"}`}
              >
                Monto ($)
              </button>
              <button
                onClick={() => setTipoMetricaGrafico("kg")}
                className={`px-3 py-1 rounded-md transition-all ${tipoMetricaGrafico === "kg" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-600"}`}
              >
                Peso (KG)
              </button>
            </div>
          )}
          <button
            onClick={() => setMostrarGrafico(!mostrarGrafico)}
            className="flex items-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors shadow-sm"
          >
            <BarChart3 size={16} />{" "}
            {mostrarGrafico ? "Ocultar Gráfico" : "Ver Gráfico"}
          </button>
        </div>
      </div>

      {mostrarGrafico && (
        <div className="mb-6 p-6 bg-slate-50 rounded-xl border border-slate-200 shadow-sm">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-4 flex items-center gap-2">
            <BarChart3 size={16} className="text-indigo-600" /> Gráfico
          </h4>
          {/* 🚀 AQUÍ ESTÁ EL CAMBIO: Se eliminó max-h-80 y overflow-y-auto */}
          <div className="space-y-3 pr-2">
            {datosProcesados.map((fila, index) => {
              const valorActual =
                tipoMetricaGrafico === "monto" ? fila.totalMonto : fila.kgTotal;
              const maxValor =
                tipoMetricaGrafico === "monto" ? maxMonto : maxKg;
              const porcentaje =
                maxValor > 0 ? (valorActual / maxValor) * 100 : 0;
              return (
                <div key={index} className="flex items-center text-xs">
                  <div className="w-16 font-bold text-slate-700">
                    Un. {fila.unidad}
                  </div>
                  <div className="w-40 truncate text-slate-500 mr-2">
                    {fila.ruta || "Sin ruta"}
                  </div>
                  <div className="flex-1 bg-slate-200 rounded-full h-4 overflow-hidden flex">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${tipoMetricaGrafico === "monto" ? "bg-indigo-600" : "bg-emerald-600"}`}
                      style={{ width: `${porcentaje}%` }}
                    ></div>
                  </div>
                  <div className="w-28 text-right font-bold text-slate-800 ml-3">
                    {tipoMetricaGrafico === "monto"
                      ? formatearMoneda(fila.totalMonto)
                      : `${formatearNumero(fila.kgTotal)} KG`}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
        <table className="w-full text-left border-collapse text-sm whitespace-nowrap bg-white">
          <thead>
            <tr className="bg-slate-800 text-white">
              <th colSpan={7} className="px-6 py-4">
                <div className="flex justify-between items-center">
                  <span className="text-base font-bold tracking-widest uppercase">
                    Relación de Salida
                  </span>
                  <span className="font-medium text-slate-300 text-sm uppercase">
                    {fechaFormateada}
                  </span>
                </div>
              </th>
            </tr>
            <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-bold">
              <th className="px-6 py-3 text-left w-64">Ruta Asignada</th>
              <th className="px-6 py-3 text-center w-24">Unidad</th>
              <th className="px-6 py-3 text-left">Chofer</th>
              <th className="px-6 py-3 text-center">Emb. Crédito</th>
              <th className="px-6 py-3 text-center">Emb. Contado</th>
              <th className="px-6 py-3 text-right">Monto Total</th>
              <th className="px-6 py-3 text-right">Peso (KG)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {datosProcesados.map((fila, index) => (
              <tr
                key={index}
                className="hover:bg-blue-50/50 transition-colors group"
              >
                <td className="px-6 py-3 text-left font-semibold text-slate-700 text-xs uppercase">
                  {fila.ruta || (
                    <span className="text-slate-400 italic font-normal">
                      Sin ruta asignada
                    </span>
                  )}
                </td>
                <td className="px-6 py-3 text-center">
                  <span className="inline-flex items-center justify-center bg-slate-100 text-slate-700 font-bold px-2.5 py-1 rounded-md text-xs">
                    <Truck size={12} className="mr-1.5 opacity-50" />
                    {fila.unidad}
                  </span>
                </td>
                <td className="px-6 py-3 text-left uppercase text-xs font-medium text-slate-700">
                  {fila.chofer}
                </td>
                <td className="px-6 py-3 text-center text-xs">
                  {fila.embCred}
                </td>
                <td className="px-6 py-3 text-center text-xs">
                  {fila.embCtdo}
                </td>
                <td className="px-6 py-3 text-right">
                  {fila.totalMonto > 0 ? (
                    <span className="font-bold text-slate-900">
                      {formatearMoneda(fila.totalMonto)}
                    </span>
                  ) : (
                    <span className="text-slate-400 font-medium">-</span>
                  )}
                </td>
                <td className="px-6 py-3 text-right">
                  {fila.kgTotal > 0 ? (
                    <span className="font-medium text-slate-600">
                      {formatearNumero(fila.kgTotal)}
                    </span>
                  ) : (
                    <span className="text-slate-400 font-medium">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-slate-50 border-t-2 border-slate-200">
            <tr>
              <td colSpan={2} className="px-6 py-4 text-left">
                <div className="flex gap-2">
                  <button
                    onClick={handleGuardarProgreso}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors shadow-sm"
                  >
                    <Save size={16} /> Guardar Progreso
                  </button>
                  <button
                    onClick={handleExportarPDF}
                    disabled={isGenerandoPDF}
                    className="flex items-center gap-2 bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 px-4 py-2 rounded-lg text-sm font-semibold"
                  >
                    <FileText size={16} />{" "}
                    {isGenerandoPDF ? "Generando..." : "Generar PDF"}
                  </button>
                  <button
                    onClick={handleGuardarEnNube}
                    disabled={guardandoNube}
                    className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-semibold"
                  >
                    <CloudUpload size={16} />{" "}
                    {guardandoNube ? "Subiendo..." : "Subir a Nube"}
                  </button>
                </div>
              </td>
              <td className="px-6 py-4 text-right uppercase text-slate-500 font-bold text-xs tracking-wider">
                Totales Generales
              </td>
              <td className="px-6 py-4 text-center font-bold text-slate-800 text-sm">
                {totales.cred}
              </td>
              <td className="px-6 py-4 text-center font-bold text-slate-800 text-sm">
                {totales.ctdo}
              </td>
              <td className="px-6 py-4 text-right font-bold text-blue-700 text-base">
                {formatearMoneda(totales.monto)}
              </td>
              <td className="px-6 py-4 text-right font-bold text-slate-800 text-sm">
                {formatearNumero(totales.kg)}{" "}
                <span className="text-slate-500 text-xs font-normal">KG</span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
