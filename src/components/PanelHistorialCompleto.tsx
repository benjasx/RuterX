import { useState, useEffect } from "react";
import {
  ClipboardList,
  Calendar,
  Truck,
  User,
  MapPin,
  Users,
  AlertCircle,
} from "lucide-react";
import { obtenerHistorialFirebase } from "../firebase/historialService";

interface ViajeDetalle {
  fecha: string;
  unidad: string;
  ruta: string;
  chofer: string;
  ayudante1: string;
  ayudante2: string;
}

export default function PanelHistorialCompleto() {
  const [viajes, setViajes] = useState<ViajeDetalle[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const cargarDatos = async () => {
      setCargando(true);
      const datosNube = await obtenerHistorialFirebase();

      // 1. Calculamos la fecha de hace 7 días
      const fechaLimite = new Date();
      fechaLimite.setDate(fechaLimite.getDate() - 7);
      const fechaLimiteStr = fechaLimite.toISOString().split("T")[0];

      let historialAplanado: ViajeDetalle[] = [];

      // 2. Extraemos y filtramos solo los de los últimos 7 días
      datosNube.forEach((registro) => {
        const fecha = registro.fecha;
        if (fecha >= fechaLimiteStr) {
          const viajesDelDia = registro.viajes || [];

          viajesDelDia.forEach((viaje: any) => {
            if (
              viaje.chofer &&
              viaje.chofer.trim() !== "" &&
              viaje.chofer !== "-"
            ) {
              historialAplanado.push({
                fecha: fecha,
                unidad: viaje.unidad || "-",
                ruta: viaje.ruta || "SIN RUTA",
                chofer: viaje.chofer,
                ayudante1: viaje.ayudante1 || "-",
                ayudante2: viaje.ayudante2 || "-",
              });
            }
          });
        }
      });

      // 3. Ordenamos: Primero los más recientes (por fecha) y luego por número de unidad
      historialAplanado.sort((a, b) => {
        if (a.fecha !== b.fecha) {
          return new Date(b.fecha).getTime() - new Date(a.fecha).getTime(); // Fecha descendente
        }
        return parseInt(a.unidad) - parseInt(b.unidad); // Unidad ascendente
      });

      setViajes(historialAplanado);
      setCargando(false);
    };

    cargarDatos();
  }, []);

  return (
    <div className="w-full bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col h-full">
      <div className="flex items-center gap-2 mb-2">
        <ClipboardList className="text-blue-600" size={24} />
        <h2 className="text-xl font-bold text-slate-800">
          Historial Completo de Salidas
        </h2>
      </div>
      <p className="text-sm text-slate-500 mb-6">
        Consulta el registro detallado de todas las rutas, choferes y auxiliares
        que han sido asignados en los <strong>últimos 7 días</strong>.
      </p>

      {cargando ? (
        <div className="flex items-center justify-center p-12 text-slate-500">
          Cargando historial completo de la nube...
        </div>
      ) : viajes.length === 0 ? (
        <div className="p-8 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 flex flex-col items-center text-center">
          <AlertCircle className="text-slate-400 mb-3" size={40} />
          <h3 className="text-lg font-semibold text-slate-700">
            No hay salidas recientes
          </h3>
          <p className="text-sm text-slate-500 max-w-sm">
            No se encontraron registros de viajes en los últimos 7 días.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm max-h-[70vh] overflow-y-auto relative">
          <table className="w-full text-left border-collapse text-sm bg-white">
            <thead className="sticky top-0 z-10 shadow-sm">
              <tr className="bg-slate-800 text-white uppercase tracking-wider text-xs">
                <th className="px-4 py-3 font-bold flex items-center gap-2">
                  <Calendar size={14} /> Fecha
                </th>
                <th className="px-4 py-3 font-bold text-center">
                  <Truck size={14} className="inline mr-1" /> Un.
                </th>
                <th className="px-4 py-3 font-bold">
                  <MapPin size={14} className="inline mr-1" /> Ruta
                </th>
                <th className="px-4 py-3 font-bold">
                  <User size={14} className="inline mr-1" /> Chofer
                </th>
                <th className="px-4 py-3 font-bold">
                  <Users size={14} className="inline mr-1" /> Ayudante 1
                </th>
                <th className="px-4 py-3 font-bold">
                  <Users size={14} className="inline mr-1" /> Ayudante 2
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {viajes.map((viaje, index) => (
                <tr
                  key={index}
                  className="hover:bg-blue-50/50 transition-colors"
                >
                  <td className="px-4 py-3 font-semibold text-slate-700 text-xs whitespace-nowrap">
                    {viaje.fecha}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center justify-center bg-slate-100 text-slate-700 font-bold px-2 py-1 rounded-md text-xs">
                      {viaje.unidad}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-700 text-xs uppercase">
                    {viaje.ruta}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-800 text-xs uppercase">
                    {viaje.chofer}
                  </td>
                  <td className="px-4 py-3 text-slate-600 text-xs uppercase">
                    {viaje.ayudante1}
                  </td>
                  <td className="px-4 py-3 text-slate-600 text-xs uppercase">
                    {viaje.ayudante2}
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
