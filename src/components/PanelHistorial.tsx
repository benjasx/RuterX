import { useState, useEffect } from "react";
import {
  History,
  Truck,
  CalendarCheck,
  AlertCircle,
  Clock,
} from "lucide-react";
import { obtenerHistorialFirebase } from "../firebase/historialService";

interface ChoferStat {
  nombre: string;
  totalViajes: number;
  ultimoViaje: string;
}

export default function PanelHistorial() {
  const [estadisticas, setEstadisticas] = useState<ChoferStat[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const cargarDatos = async () => {
      setCargando(true);
      const datosNube = await obtenerHistorialFirebase();

      const statsMap: Record<string, { total: number; ultimaFecha: string }> =
        {};

      // 🚀 1. CALCULAMOS LA FECHA LÍMITE (HACE 7 DÍAS)
      const fechaLimite = new Date();
      fechaLimite.setDate(fechaLimite.getDate() - 7);
      const fechaLimiteStr = fechaLimite.toISOString().split("T")[0]; // Ej. "2026-07-17"

      // Ordenamos por fecha del más viejo al más nuevo para registrar bien la "última fecha"
      datosNube.sort(
        (a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime(),
      );

      // Hacemos el conteo
      datosNube.forEach((registro) => {
        const fecha = registro.fecha;
        const viajes = registro.viajes || [];

        // 🚀 2. VERIFICAMOS SI EL REPORTE ES DE LOS ÚLTIMOS 7 DÍAS
        const esReciente = fecha >= fechaLimiteStr;

        viajes.forEach((viaje: any) => {
          if (!viaje.chofer || viaje.chofer === "-") return;
          const nombreChofer = viaje.chofer.toUpperCase().trim();

          // Registramos al chofer en la lista aunque su viaje sea viejo
          if (!statsMap[nombreChofer]) {
            statsMap[nombreChofer] = { total: 0, ultimaFecha: "" };
          }

          // 🚀 3. SOLO SUMAMOS EL VIAJE SI OCURRIÓ EN LOS ÚLTIMOS 7 DÍAS
          if (esReciente) {
            statsMap[nombreChofer].total += 1;
          }

          // La fecha del último viaje siempre se actualiza para saber cuándo fue la última vez que lo vimos
          statsMap[nombreChofer].ultimaFecha = fecha;
        });
      });

      // Convertimos el objeto en un arreglo
      const arrayStats = Object.keys(statsMap).map((nombre) => ({
        nombre,
        totalViajes: statsMap[nombre].total,
        ultimoViaje: statsMap[nombre].ultimaFecha,
      }));

      // Ordenamos: los que tienen MENOS viajes recientes aparecen primero
      arrayStats.sort((a, b) => a.totalViajes - b.totalViajes);

      setEstadisticas(arrayStats);
      setCargando(false);
    };

    cargarDatos();
  }, []);

  return (
    <div className="w-full bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col h-full">
      <div className="flex items-center gap-2 mb-2">
        <History className="text-purple-600" size={24} />
        <h2 className="text-xl font-bold text-slate-800">
          Control de Equidad de Choferes
        </h2>
      </div>
      <div className="flex items-start gap-2 mb-6 bg-purple-50 p-3 rounded-lg border border-purple-100">
        <Clock className="text-purple-600 shrink-0 mt-0.5" size={18} />
        <p className="text-sm text-purple-900">
          Esta tabla calcula automáticamente cuántas veces ha salido cada chofer
          basándose <strong>únicamente en los últimos 7 días</strong>. Los
          choferes con <strong>menos viajes recientes</strong> aparecen primero
          en la lista para priorizar su asignación hoy.
        </p>
      </div>

      {cargando ? (
        <div className="flex items-center justify-center p-12 text-slate-500">
          Cargando datos de la nube...
        </div>
      ) : estadisticas.length === 0 ? (
        <div className="p-8 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 flex flex-col items-center text-center">
          <AlertCircle className="text-slate-400 mb-3" size={40} />
          <h3 className="text-lg font-semibold text-slate-700">
            No hay datos suficientes
          </h3>
          <p className="text-sm text-slate-500 max-w-sm">
            Aún no has guardado reportes de salida en la nube. Ve al Generador
            de Salidas y usa el botón "Subir a Nube".
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
          <table className="w-full text-left border-collapse text-sm bg-white">
            <thead>
              <tr className="bg-purple-800 text-white uppercase tracking-wider text-xs">
                <th className="px-6 py-4 font-bold">Nombre del Chofer</th>
                <th className="px-6 py-4 font-bold text-center">
                  Viajes en los Últimos 7 Días
                </th>
                <th className="px-6 py-4 font-bold text-center">
                  Fecha del Último Viaje
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {estadisticas.map((chofer, index) => (
                <tr
                  key={index}
                  className="hover:bg-purple-50 transition-colors"
                >
                  <td className="px-6 py-4 font-bold text-slate-700 text-xs">
                    {chofer.nombre}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                        chofer.totalViajes === 0
                          ? "bg-red-100 text-red-700" // Si no ha viajado en 7 días, se marca en rojo
                          : index < 5
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      <Truck size={14} /> {chofer.totalViajes} viajes
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center text-slate-600 font-medium text-xs flex justify-center items-center gap-2">
                    <CalendarCheck size={14} className="text-purple-400" />
                    {chofer.ultimoViaje}
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
