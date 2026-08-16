import { useState } from "react";
import {
  DatabaseBackup,
  Download,
  ShieldAlert,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import {
  respaldarTodaLaBaseDatos,
  type ResumenRespaldo,
} from "../firebase/backupService";
import { esAdmin } from "../utils/roles";

interface PanelRespaldoProps {
  usuarioEmail?: string | null;
}

export default function PanelRespaldo({ usuarioEmail }: PanelRespaldoProps) {
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resumen, setResumen] = useState<ResumenRespaldo[] | null>(null);
  const [ultimoRespaldo, setUltimoRespaldo] = useState<string | null>(() =>
    localStorage.getItem("ultimoRespaldoFirestore"),
  );

  if (!esAdmin(usuarioEmail)) {
    return (
      <div className="w-full bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 h-full flex flex-col items-center justify-center">
        <ShieldAlert className="text-rose-500 mb-3" size={40} />
        <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200">
          Acceso restringido
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Esta sección es exclusiva para el administrador.
        </p>
      </div>
    );
  }

  const handleRespaldar = async () => {
    setCargando(true);
    setError(null);
    try {
      const { datos, resumen: nuevoResumen, fecha } =
        await respaldarTodaLaBaseDatos();

      const blob = new Blob([JSON.stringify(datos, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const nombreArchivo = `respaldo_firestore_${fecha
        .slice(0, 16)
        .replace(/[:T]/g, "-")}.json`;

      const link = document.createElement("a");
      link.href = url;
      link.download = nombreArchivo;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      localStorage.setItem("ultimoRespaldoFirestore", fecha);
      setUltimoRespaldo(fecha);
      setResumen(nuevoResumen);
    } catch (err) {
      console.error("Error al generar el respaldo: ", err);
      setError(
        "No se pudo generar el respaldo. Revisa la conexión e intenta de nuevo.",
      );
    } finally {
      setCargando(false);
    }
  };

  const totalDocumentos = resumen?.reduce((acc, r) => acc + r.documentos, 0);

  return (
    <div className="w-full bg-slate-50/50 dark:bg-slate-900/50 p-6 rounded-xl flex flex-col h-full overflow-y-auto custom-scrollbar">
      <div className="mb-6">
        <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <DatabaseBackup className="text-blue-600 dark:text-blue-400" size={28} />
          Respaldo de la Base de Datos
        </h2>
        <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">
          Descarga una copia completa de todas las colecciones de Firestore
          en un archivo JSON.
        </p>
      </div>

      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
            Último respaldo generado
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {ultimoRespaldo
              ? new Date(ultimoRespaldo).toLocaleString("es-MX")
              : "Aún no se ha generado ningún respaldo en este equipo."}
          </p>
        </div>

        <button
          onClick={handleRespaldar}
          disabled={cargando}
          className={`flex items-center justify-center gap-2 px-5 py-3 rounded-lg text-sm font-bold transition-colors shadow-sm w-full sm:w-auto shrink-0 ${
            cargando
              ? "bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed"
              : "bg-blue-700 hover:bg-blue-800 text-white"
          }`}
        >
          {cargando ? (
            <>
              <Loader2 size={18} className="animate-spin" /> Generando
              respaldo...
            </>
          ) : (
            <>
              <Download size={18} /> Generar y descargar respaldo
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2 mb-6 bg-rose-50 dark:bg-rose-950/40 p-3 rounded-lg border border-rose-100 dark:border-rose-900">
          <AlertCircle className="text-rose-500 shrink-0 mt-0.5" size={18} />
          <p className="text-sm text-rose-800">{error}</p>
        </div>
      )}

      {resumen && (
        <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
          <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/40 px-4 py-3 border-b border-emerald-100 dark:border-emerald-900">
            <CheckCircle2 className="text-emerald-600 dark:text-emerald-400" size={18} />
            <p className="text-sm text-emerald-800 dark:text-emerald-300 font-semibold">
              Respaldo descargado con éxito — {totalDocumentos} documentos en
              total.
            </p>
          </div>
          <table className="w-full text-left border-collapse text-sm bg-white dark:bg-slate-800">
            <thead>
              <tr className="bg-slate-800 text-white uppercase tracking-wider text-xs">
                <th className="px-6 py-4 font-bold">Colección</th>
                <th className="px-6 py-4 font-bold text-center">
                  Documentos respaldados
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {resumen.map((r) => (
                <tr key={r.coleccion} className="hover:bg-slate-50 dark:hover:bg-slate-900">
                  <td className="px-6 py-4 font-bold text-slate-700 dark:text-slate-200 text-xs">
                    {r.coleccion}
                  </td>
                  <td className="px-6 py-4 text-center text-slate-600 dark:text-slate-300 font-medium tabular-nums">
                    {r.documentos}
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
