import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Truck, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { obtenerViajesDelDia } from "../firebase/viajesService";
import { obtenerChoferesFirebase } from "../firebase/choferesService"; // 🚀 Importamos el servicio de choferes

export default function MonitorRutas() {
  const hoyStr = new Date().toLocaleDateString("sv-SE");

  // 🚀 Consultamos los viajes del día
  const { data: viajesDelDia = [], isLoading: cargandoViajes } = useQuery({
    queryKey: ["viajesDelDia", hoyStr],
    queryFn: () => obtenerViajesDelDia(hoyStr),
    refetchInterval: 10000,
  });

  // 🚀 Consultamos la lista completa de choferes para obtener sus nombres reales
  const { data: choferesData = [] } = useQuery({
    queryKey: ["choferes"],
    queryFn: obtenerChoferesFirebase,
    staleTime: 1000 * 60 * 10,
  });

  // Mapa rápido para buscar el nombre del chofer por su correo
  const nombreChoferMap = useMemo(() => {
    const map = new Map();
    choferesData.forEach((c: any) => {
      const emailKey = (c.email || c.correo || "").toLowerCase().trim();
      if (emailKey) map.set(emailKey, c.nombre);
    });
    return map;
  }, [choferesData]);

  // Calculamos el porcentaje de avance y obtenemos el nombre real de cada chofer
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

        // Buscamos el nombre real cruzando el correo, si no existe mostramos el correo limpio
        const emailChofer = (viaje.chofer_email || "").toLowerCase().trim();
        const nombreRealChofer =
          nombreChoferMap.get(emailChofer) ||
          viaje.chofer_email?.split("@")[0] ||
          "Chofer Desconocido";

        return {
          ...viaje,
          totalClientes: total,
          procesados,
          entregados,
          porcentaje,
          nombreRealChofer,
        };
      })
      .sort((a, b) => b.porcentaje - a.porcentaje);
  }, [viajesDelDia, nombreChoferMap]);

  if (cargandoViajes) {
    return (
      <div className="flex w-full min-h-[500px] items-center justify-center bg-white rounded-xl shadow-sm border border-slate-100">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="animate-spin text-blue-600" size={40} />
          <p className="text-slate-500 font-bold animate-pulse">
            Cargando monitor de rutas...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-white p-6 rounded-xl shadow-sm border border-slate-100 min-h-[calc(100vh-120px)]">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 flex items-center gap-3">
            <Truck className="text-blue-600" size={28} />
            Monitor de Rutas en Vivo
          </h1>
          <p className="text-slate-500 font-medium mt-1">
            Supervisión operativa de las unidades despachadas hoy ({hoyStr})
          </p>
        </div>
        <div className="bg-slate-50 px-5 py-3 rounded-xl border border-slate-200 shadow-inner font-bold text-slate-700 flex flex-col items-center">
          <span className="text-xs uppercase text-slate-400">
            Unidades en calle
          </span>
          <span className="text-2xl text-blue-600 leading-none mt-1">
            {viajesConProgreso.length}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {viajesConProgreso.map((viaje) => (
          <div
            key={viaje.id}
            className="bg-slate-50 p-5 rounded-2xl border border-slate-200 flex flex-col relative overflow-hidden transition-all hover:shadow-md hover:border-blue-200"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">
                  {viaje.ruta_nombre}
                </h3>
                {/* 🚀 AQUÍ SE MUESTRA EL NOMBRE REAL Y COMPLETO */}
                <p className="text-sm font-bold text-blue-600 mt-0.5">
                  {viaje.nombreRealChofer}
                </p>
              </div>
              <div className="bg-white text-slate-800 px-3 py-1 rounded-lg text-sm font-black border border-slate-200 shadow-sm">
                Unidad {viaje.unidad_utilizada || "??"}
              </div>
            </div>

            <div className="mb-5 flex flex-col gap-2 items-start">
              {viaje.estado === "finalizado" ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-green-100 text-green-800 uppercase tracking-wide">
                  <CheckCircle2 size={14} /> Jornada Finalizada
                </span>
              ) : !viaje.hora_inicio ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 uppercase tracking-wide">
                  <Clock size={14} /> Esperando en Bodega
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 uppercase tracking-wide">
                  <Truck size={14} /> En Ruta (Inició: {viaje.hora_inicio})
                </span>
              )}

              {viaje.motivo_finalizacion &&
                viaje.motivo_finalizacion !== "Término de recorrido" && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200 shadow-sm">
                    <AlertCircle size={14} /> {viaje.motivo_finalizacion}
                  </span>
                )}
            </div>

            <div className="mt-auto bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
              <div className="flex justify-between text-xs font-bold text-slate-500 mb-2">
                <span className="uppercase">Avance General</span>
                <span className="text-blue-600 text-sm">
                  {viaje.porcentaje}%
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3 mb-3 overflow-hidden">
                <div
                  className={`h-3 rounded-full transition-all duration-700 ${viaje.porcentaje === 100 ? "bg-green-500" : "bg-blue-600"}`}
                  style={{ width: `${viaje.porcentaje}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-xs font-semibold text-slate-500">
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
          <div className="col-span-full bg-slate-50 p-10 rounded-2xl border-2 border-dashed border-slate-200 text-center flex flex-col items-center">
            <Truck className="text-slate-300 mb-4" size={56} />
            <h3 className="text-xl font-black text-slate-700 mb-1">
              No hay unidades operando
            </h3>
            <p className="text-slate-500 font-medium">
              Asigna rutas en el mapa y aparecerán aquí automáticamente.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
