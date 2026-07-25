import { Users, UserCheck, FileText, Truck } from "lucide-react";

interface Props {
  datosProcesados: any[];
  fechaFormateada: string;
  archivoAyudantes: string;
  isGenerandoPDF: boolean;
  handleAyudantesFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleExportarPDFTripulacion: () => void;
  handleCambiarAyudante1: (unidad: string, valor: string) => void;
  handleCambiarAyudante2: (unidad: string, valor: string) => void;
}

export default function TablaTripulacion({
  datosProcesados,
  fechaFormateada,
  archivoAyudantes,
  isGenerandoPDF,
  handleAyudantesFileUpload,
  handleExportarPDFTripulacion,
  handleCambiarAyudante1,
  handleCambiarAyudante2,
}: Props) {
  return (
    <div className="flex flex-col mt-4">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
          <Users size={16} className="text-emerald-600" /> Tabla 2: Control de
          Tripulación y Ayudantes
        </h3>
        <label className="flex items-center gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 px-3.5 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-colors shadow-sm">
          <UserCheck size={16} />{" "}
          {archivoAyudantes
            ? "Ayudantes Cargados ✓"
            : "Cargar Ayudantes (.xlsx)"}
          <input
            type="file"
            accept=".xlsx, .xls"
            onChange={handleAyudantesFileUpload}
            className="hidden"
          />
        </label>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
        <table className="w-full text-left border-collapse text-sm whitespace-nowrap bg-white">
          <thead>
            <tr className="bg-emerald-800 text-white">
              <th colSpan={7} className="px-6 py-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold tracking-widest uppercase">
                    Asignación de Tripulación y Embarques
                  </span>
                  <div className="flex items-center gap-4">
                    <span className="font-medium text-emerald-200 text-sm uppercase">
                      {fechaFormateada}
                    </span>
                    <button
                      onClick={handleExportarPDFTripulacion}
                      disabled={isGenerandoPDF}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shadow-sm bg-red-50 text-red-700 border border-red-200 hover:bg-red-100"
                    >
                      <FileText size={14} />{" "}
                      {isGenerandoPDF ? "Generando..." : "Generar PDF"}
                    </button>
                  </div>
                </div>
              </th>
            </tr>
            <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-bold">
              <th className="px-4 py-3 text-center w-20">Unidad</th>
              <th className="px-4 py-3 text-left w-56">Ruta Asignada</th>
              <th className="px-4 py-3 text-left w-56">Chofer</th>
              <th className="px-4 py-3 text-center">Emb. Crédito</th>
              <th className="px-4 py-3 text-center">Emb. Contado</th>
              <th className="px-4 py-3 text-left">Ayudante 1</th>
              <th className="px-4 py-3 text-left">Ayudante 2</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {datosProcesados.map((fila, index) => (
              <tr
                key={index}
                className="hover:bg-emerald-50/50 transition-colors"
              >
                <td className="px-4 py-3 text-center">
                  <span className="inline-flex items-center justify-center bg-slate-100 text-slate-700 font-bold px-2.5 py-1 rounded-md text-xs">
                    <Truck size={12} className="mr-1.5 opacity-50" />
                    {fila.unidad}
                  </span>
                </td>
                <td className="px-4 py-3 font-semibold text-slate-700 text-xs uppercase">
                  {fila.ruta || (
                    <span className="text-slate-400 italic font-normal">
                      Sin ruta asignada
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 uppercase text-xs font-medium text-slate-700">
                  {fila.chofer}
                </td>
                <td className="px-4 py-3 text-center text-xs">
                  {fila.embCred}
                </td>
                <td className="px-4 py-3 text-center text-xs">
                  {fila.embCtdo}
                </td>
                <td className="px-3 py-2">
                  <input
                    type="text"
                    placeholder="Ayudante 1..."
                    value={fila.ayudante1}
                    onChange={(e) =>
                      handleCambiarAyudante1(fila.unidad, e.target.value)
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-1.5 text-xs uppercase text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="text"
                    placeholder="Ayudante 2..."
                    value={fila.ayudante2}
                    onChange={(e) =>
                      handleCambiarAyudante2(fila.unidad, e.target.value)
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-1.5 text-xs uppercase text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
