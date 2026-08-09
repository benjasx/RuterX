import { CheckCircle2, MessageCircle } from "lucide-react";

export default function ResumenJornadaChofer({
  viajeActivoChofer,
  resumenViaje,
  nombreChofer,
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
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center border border-slate-100">
        <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 size={32} />
        </div>

        <div className="mb-6">
          <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight leading-none mb-2">
            {rutaReal}
          </h2>
          <p className="text-[17px] font-bold text-slate-600 leading-tight">
            {nombreLimpio}
          </p>
          <div className="inline-flex items-center justify-center bg-slate-100 px-4 py-1.5 rounded-lg mt-3 border border-slate-200">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-2">
              Unidad
            </span>
            <span className="text-lg font-black text-slate-800 leading-none">
              {viajeActivoChofer.unidad_utilizada || "N/A"}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="bg-green-50 border border-green-100 rounded-xl p-3">
            <p className="text-green-600 text-[10px] font-bold uppercase mb-1">
              Entregados
            </p>
            <p className="text-2xl font-black text-green-700">
              {resumenViaje?.entregados}
            </p>
          </div>
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
            <p className="text-blue-600 text-[10px] font-bold uppercase mb-1">
              Pendientes
            </p>
            <p className="text-2xl font-black text-blue-700">
              {resumenViaje?.pendientes}
            </p>
          </div>
          <div className="bg-red-50 border border-red-100 rounded-xl p-3">
            <p className="text-red-600 text-[10px] font-bold uppercase mb-1">
              Cancelados
            </p>
            <p className="text-xl font-bold text-red-700">
              {resumenViaje?.cancelados}
            </p>
          </div>
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
            <p className="text-amber-600 text-[10px] font-bold uppercase mb-1">
              No Entregados
            </p>
            <p className="text-xl font-bold text-amber-700">
              {resumenViaje?.noEntregados}
            </p>
          </div>
        </div>

        <div className="bg-slate-50 rounded-lg p-4 text-sm text-left border border-slate-200 shadow-inner mb-5">
          {/* 🚀 AQUI AGREGAMOS LA HORA DE INICIO AL TICKET */}
          <div className="grid grid-cols-2 gap-2 mb-3 pb-3 border-b border-slate-200/80">
            <div>
              <span className="font-bold block text-[10px] text-slate-400 uppercase">
                Hora Inicio
              </span>
              <span className="font-bold text-slate-700">
                {viajeActivoChofer.hora_inicio || "--:--"}
              </span>
            </div>
            <div>
              <span className="font-bold block text-[10px] text-slate-400 uppercase">
                Hora Término
              </span>
              <span className="font-bold text-slate-700">
                {viajeActivoChofer.hora_finalizacion || "--:--"}
              </span>
            </div>
          </div>

          <div>
            <span className="font-bold block text-[10px] text-slate-400 uppercase">
              Motivo de cierre
            </span>
            <span className="font-semibold text-slate-700">
              {viajeActivoChofer.motivo_finalizacion}
            </span>
          </div>
        </div>

        <button
          onClick={compartirPorWhatsApp}
          className="w-full bg-[#25D366] hover:bg-[#1ebd5a] text-white font-bold py-3 rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer"
        >
          <MessageCircle size={20} />
          Compartir por WhatsApp
        </button>
      </div>
    </div>
  );
}
