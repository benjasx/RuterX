import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Loader2,
  Truck,
  AlertCircle,
  CheckCircle2,
  Clock,
  Timer,
} from "lucide-react";
import { suscribirViajesDelDia } from "../firebase/viajesService";
import { obtenerChoferesFirebase } from "../firebase/choferesService";

export default function MonitorRutas() {
  const hoyStr = new Date().toLocaleDateString("sv-SE");

  const [viajesDelDia, setViajesDelDia] = useState<any[]>([]);
  const [cargandoViajes, setCargandoViajes] = useState(true);

  useEffect(() => {
    const cancelarSuscripcion = suscribirViajesDelDia(hoyStr, (viajes) => {
      setViajesDelDia(viajes);
      setCargandoViajes(false);
    });
    return () => cancelarSuscripcion();
  }, [hoyStr]);

  const { data: choferesData = [] } = useQuery({
    queryKey: ["choferes"],
    queryFn: obtenerChoferesFirebase,
    staleTime: 1000 * 60 * 10,
  });

  const nombreChoferMap = useMemo(() => {
    const map = new Map();
    choferesData.forEach((c: any) => {
      const emailKey = (c.email || c.correo || "").toLowerCase().trim();
      if (emailKey) map.set(emailKey, c.nombre);
    });
    return map;
  }, [choferesData]);

  // Función para calcular las horas transcurridas entre la hora de inicio y fin
  const calcularTiempoTotal = (inicio: string, fin: string) => {
    if (!inicio || !fin) return null;
    try {
      const [h1, m1, s1] = inicio.split(":").map(Number);
      const [h2, m2, s2] = fin.split(":").map(Number);

      const segundosInicio = h1 * 3600 + m1 * 60 + (s1 || 0);
      const segundosFin = h2 * 3600 + m2 * 60 + (s2 || 0);

      let diferenciaSegundos = segundosFin - segundosInicio;
      if (diferenciaSegundos < 0) diferenciaSegundos += 86400; // Por si cruza la medianoche

      const horas = Math.floor(diferenciaSegundos / 3600);
      const minutos = Math.floor((diferenciaSegundos % 3600) / 60);

      if (horas === 0) {
        return `${minutos} min`;
      }
      return `${horas} h ${minutos} min`;
    } catch (e) {
      return null;
    }
  };

  const viajesConProgreso = useMemo(() => {
    return viajesDelDia
      .map((viaje: any) => {
        const total = viaje.clientes?.length || 0;
        let procesados = 0;
        let entregados = 0;

        viaje.clientes?.forEach((c: any) => {
          if (c.estado_entrega && c.estado_entrega !== "pendiente") {
            procesados++;
            if (c.estado_entrega === "entregado") entregados++;
          }
        });

        const porcentaje =
          total === 0 ? 0 : Math.round((procesados / total) * 100);

        const emailChofer = (viaje.chofer_email || "").toLowerCase().trim();
        const nombreRealChofer =
          nombreChoferMap.get(emailChofer) ||
          viaje.chofer_email?.split("@")[0] ||
          "Chofer Desconocido";

        const tiempoTotal =
          viaje.hora_inicio && viaje.hora_finalizacion
            ? calcularTiempoTotal(viaje.hora_inicio, viaje.hora_finalizacion)
            : null;

        return {
          ...viaje,
          totalClientes: total,
          procesados,
          entregados,
          porcentaje,
          nombreRealChofer,
          tiempoTotal,
        };
      })
      .sort((a, b) => b.porcentaje - a.porcentaje);
  }, [viajesDelDia, nombreChoferMap]);

  if (cargandoViajes) {
    return (
      <div className="flex w-full min-h-125 items-center justify-center bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="animate-spin text-blue-600 dark:text-blue-400" size={40} />
          <p className="text-slate-500 dark:text-slate-400 font-bold animate-pulse">
            Cargando monitor de rutas...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 min-h-[calc(100vh-120px)]">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-3">
            <Truck className="text-blue-600 dark:text-blue-400" size={28} />
            Monitor de Rutas en Vivo
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">
            Supervisión operativa de las unidades despachadas hoy ({hoyStr})
          </p>
        </div>
        <div className="bg-slate-50 dark:bg-slate-900 px-5 py-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-inner font-bold text-slate-700 dark:text-slate-200 flex flex-col items-center">
          <span className="text-xs uppercase text-slate-400 dark:text-slate-500">
            Unidades en calle
          </span>
          <span className="text-2xl text-blue-600 dark:text-blue-400 leading-none mt-1">
            {viajesConProgreso.length}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {viajesConProgreso.map((viaje) => (
          <div
            key={viaje.id}
            className="bg-slate-50 dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col relative overflow-hidden transition-all hover:shadow-md hover:border-blue-200 dark:hover:border-blue-800"
          >
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">
                  {viaje.ruta_nombre}
                </h3>
                <p className="text-sm font-bold text-blue-600 dark:text-blue-400 mt-0.5">
                  {viaje.nombreRealChofer}
                </p>
              </div>
              <div className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 px-3 py-1 rounded-lg text-sm font-black border border-slate-200 dark:border-slate-700 shadow-sm">
                Unidad {viaje.unidad_utilizada || "??"}
              </div>
            </div>

            {/* ESTADOS Y TIEMPOS */}
            <div className="mb-4 flex flex-col gap-2 items-start">
              {viaje.estado === "finalizado" ? (
                <div className="flex flex-col gap-1 w-full">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 uppercase tracking-wide self-start">
                    <CheckCircle2 size={14} /> Jornada Finalizada
                  </span>

                  {/* 🚀 MUESTRA HORA INICIO, HORA FIN Y TOTAL */}
                  <div className="bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 flex justify-between items-center mt-1 shadow-xs">
                    <div>
                      <p>
                        <b>Inicio:</b> {viaje.hora_inicio || "N/D"}
                      </p>
                      <p>
                        <b>Fin:</b> {viaje.hora_finalizacion || "N/D"}
                      </p>
                    </div>
                    {viaje.tiempoTotal && (
                      <div className="text-right bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 px-2.5 py-1.5 rounded-lg font-bold flex items-center gap-1 border border-blue-100 dark:border-blue-900">
                        <Timer size={14} /> {viaje.tiempoTotal}
                      </div>
                    )}
                  </div>
                </div>
              ) : !viaje.hora_inicio ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 uppercase tracking-wide">
                  <Clock size={14} /> Esperando en Bodega
                </span>
              ) : (
                <div className="flex flex-col gap-1 w-full">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 uppercase tracking-wide self-start">
                    <Truck size={14} /> En Ruta
                  </span>
                  <div className="bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300">
                    <span>
                      <b>Inició a las:</b> {viaje.hora_inicio}
                    </span>
                  </div>
                </div>
              )}

              {viaje.motivo_finalizacion &&
                viaje.motivo_finalizacion !== "Término de recorrido" && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800 shadow-sm mt-1">
                    <AlertCircle size={14} /> {viaje.motivo_finalizacion}
                  </span>
                )}
            </div>

            <div className="mt-auto bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
              <div className="flex justify-between text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">
                <span className="uppercase">Avance General</span>
                <span className="text-blue-600 dark:text-blue-400 text-sm">
                  {viaje.porcentaje}%
                </span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-3 mb-3 overflow-hidden">
                <div
                  className={`h-3 rounded-full transition-all duration-700 ${viaje.porcentaje === 100 ? "bg-green-500" : "bg-blue-600"}`}
                  style={{ width: `${viaje.porcentaje}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1">
                  <CheckCircle2 size={12} className="text-green-500" />{" "}
                  Entregas: {viaje.entregados}
                </span>
                <span>
                  Visitados: {viaje.procesados} / {viaje.totalClientes}
                </span>
              </div>
            </div>
          </div>
        ))}

        {viajesConProgreso.length === 0 && (
          <div className="col-span-full bg-slate-50 dark:bg-slate-900 p-10 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 text-center flex flex-col items-center">
            <Truck className="text-slate-300 mb-4" size={48} />
            <h3 className="text-xl font-black text-slate-700 dark:text-slate-200 mb-1">
              No hay unidades operando
            </h3>
            <p className="text-slate-500 dark:text-slate-400 font-medium">
              Asigna rutas en el mapa y aparecerán aquí automáticamente.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
