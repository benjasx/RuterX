import { CheckCircle2, MessageCircle, ArrowRight } from "lucide-react";

export default function ResumenJornadaChofer({
  viajeActivoChofer,
  resumenViaje,
  nombreChofer,
  onVerProximaRuta,
}: any) {
  const nombreLimpio = nombreChofer
    ? nombreChofer.split(" (")[0]
    : "Chofer Desconocido";
  const rutaReal =
    viajeActivoChofer.ruta_real_realizada || viajeActivoChofer.ruta_nombre;

  const compartirPorWhatsApp = () => {
    const textoMensaje = `*REPORTE DE CIERRE DE RUTA* 🚚💨
    
*Ruta:* ${rutaReal}
*Chofer:* ${nombreLimpio}
*Unidad:* ${viajeActivoChofer.unidad_utilizada || "N/A"}
*Hora de inicio:* ${viajeActivoChofer.hora_inicio || "--:--"}
*Hora de término:* ${viajeActivoChofer.hora_finalizacion || "--:--"}

*Resumen de Entregas:*
✅ Entregados: ${resumenViaje?.entregados}
⏳ Pendientes: ${resumenViaje?.pendientes}
❌ Cancelados: ${resumenViaje?.cancelados}
⚠️ No Entregados: ${resumenViaje?.noEntregados}

*Motivo de cierre:* ${viajeActivoChofer.motivo_finalizacion}`;

    const urlWhatsApp = `https://wa.me/?text=${encodeURIComponent(textoMensaje)}`;
    window.open(urlWhatsApp, "_blank");
  };

  return (
    <div className="absolute inset-0 z-2000 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center border border-slate-100 dark:border-slate-700">
        <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 size={32} />
        </div>

        <div className="mb-6">
          <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight leading-none mb-2">
            {rutaReal}
          </h2>
          <p className="text-[17px] font-bold text-slate-600 dark:text-slate-300 leading-tight">
            {nombreLimpio}
          </p>
          <div className="inline-flex items-center justify-center bg-slate-100 dark:bg-slate-700 px-4 py-1.5 rounded-lg mt-3 border border-slate-200 dark:border-slate-700">
            <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mr-2">
              Unidad
            </span>
            <span className="text-lg font-black text-slate-800 dark:text-slate-100 leading-none">
              {viajeActivoChofer.unidad_utilizada || "N/A"}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="bg-green-50 dark:bg-green-950/40 border border-green-100 dark:border-green-900 rounded-xl p-3">
            <p className="text-green-600 dark:text-green-400 text-[10px] font-bold uppercase mb-1">
              Entregados
            </p>
            <p className="text-2xl font-black text-green-700 dark:text-green-300">
              {resumenViaje?.entregados}
            </p>
          </div>
          <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900 rounded-xl p-3">
            <p className="text-blue-600 dark:text-blue-400 text-[10px] font-bold uppercase mb-1">
              Pendientes
            </p>
            <p className="text-2xl font-black text-blue-700 dark:text-blue-300">
              {resumenViaje?.pendientes}
            </p>
          </div>
          <div className="bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900 rounded-xl p-3">
            <p className="text-red-600 dark:text-red-400 text-[10px] font-bold uppercase mb-1">
              Cancelados
            </p>
            <p className="text-xl font-bold text-red-700 dark:text-red-300">
              {resumenViaje?.cancelados}
            </p>
          </div>
          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900 rounded-xl p-3">
            <p className="text-amber-600 dark:text-amber-400 text-[10px] font-bold uppercase mb-1">
              No Entregados
            </p>
            <p className="text-xl font-bold text-amber-700 dark:text-amber-300">
              {resumenViaje?.noEntregados}
            </p>
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4 text-sm text-left border border-slate-200 dark:border-slate-700 shadow-inner mb-5">
          <div className="grid grid-cols-2 gap-2 mb-3 pb-3 border-b border-slate-200/80 dark:border-slate-700/80">
            <div>
              <span className="font-bold block text-[10px] text-slate-400 dark:text-slate-500 uppercase">
                Hora Inicio
              </span>
              <span className="font-bold text-slate-700 dark:text-slate-200">
                {viajeActivoChofer.hora_inicio || "--:--"}
              </span>
            </div>
            <div>
              <span className="font-bold block text-[10px] text-slate-400 dark:text-slate-500 uppercase">
                Hora Término
              </span>
              <span className="font-bold text-slate-700 dark:text-slate-200">
                {viajeActivoChofer.hora_finalizacion || "--:--"}
              </span>
            </div>
          </div>
          <div>
            <span className="font-bold block text-[10px] text-slate-400 dark:text-slate-500 uppercase">
              Motivo de cierre
            </span>
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              {viajeActivoChofer.motivo_finalizacion}
            </span>
          </div>
        </div>

        {/* 🚀 BOTONES DE ACCIÓN */}
        <div className="flex flex-col gap-2">
          <button
            onClick={compartirPorWhatsApp}
            className="w-full bg-[#25D366] hover:bg-[#1ebd5a] text-white font-bold py-3 rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer"
          >
            <MessageCircle size={20} />
            Compartir por WhatsApp
          </button>

          <button
            onClick={onVerProximaRuta}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            Ver próxima ruta asignada <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
