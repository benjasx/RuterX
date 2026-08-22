import { useEffect, useState } from "react";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  suscribirNotificaciones,
  obtenerToasts,
  obtenerConfirmacionPendiente,
  cerrarToast,
  resolverConfirmacionPendiente,
  type TipoNotificacion,
} from "../utils/notificaciones";

const ESTILO_TOAST: Record<
  TipoNotificacion,
  { icono: LucideIcon; iconoClase: string; borde: string }
> = {
  exito: {
    icono: CheckCircle2,
    iconoClase:
      "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40",
    borde: "border-emerald-200 dark:border-emerald-800",
  },
  error: {
    icono: XCircle,
    iconoClase: "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40",
    borde: "border-red-200 dark:border-red-800",
  },
  advertencia: {
    icono: AlertTriangle,
    iconoClase:
      "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40",
    borde: "border-amber-200 dark:border-amber-800",
  },
  info: {
    icono: Info,
    iconoClase: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40",
    borde: "border-blue-200 dark:border-blue-800",
  },
};

export default function Notificaciones() {
  const [, forzarRender] = useState(0);

  useEffect(
    () => suscribirNotificaciones(() => forzarRender((n) => n + 1)),
    [],
  );

  const toasts = obtenerToasts();
  const confirmacion = obtenerConfirmacionPendiente();

  return (
    <>
      <div className="fixed top-4 right-4 z-100000 flex flex-col gap-2 w-[calc(100%-2rem)] max-w-sm pointer-events-none">
        {toasts.map((toast) => {
          const estilo = ESTILO_TOAST[toast.tipo];
          const Icono = estilo.icono;
          return (
            <div
              key={toast.id}
              className={`toast-enter pointer-events-auto relative overflow-hidden flex items-start gap-3 bg-white dark:bg-slate-800 border ${estilo.borde} rounded-xl shadow-lg p-4`}
            >
              <div className={`shrink-0 rounded-full p-1.5 ${estilo.iconoClase}`}>
                <Icono size={18} />
              </div>
              <p className="flex-1 text-sm font-medium text-slate-700 dark:text-slate-200 leading-snug pt-0.5">
                {toast.mensaje}
              </p>
              <button
                onClick={() => cerrarToast(toast.id)}
                className="shrink-0 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
              <div
                className="toast-progress absolute bottom-0 left-0 h-1 w-full bg-slate-200 dark:bg-slate-700 origin-left"
                style={{ animationDuration: `${toast.duracionMs}ms` }}
                onAnimationEnd={() => cerrarToast(toast.id)}
              />
            </div>
          );
        })}
      </div>

      {confirmacion && (
        <div className="fixed inset-0 z-100001 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="p-6 flex flex-col items-center text-center gap-3">
              <div
                className={`rounded-full p-3 ${
                  confirmacion.peligroso
                    ? "bg-red-50 dark:bg-red-950/40"
                    : "bg-amber-50 dark:bg-amber-950/40"
                }`}
              >
                <AlertTriangle
                  size={24}
                  className={
                    confirmacion.peligroso
                      ? "text-red-600 dark:text-red-400"
                      : "text-amber-600 dark:text-amber-400"
                  }
                />
              </div>
              {confirmacion.titulo && (
                <h3 className="font-bold text-slate-800 dark:text-slate-100">
                  {confirmacion.titulo}
                </h3>
              )}
              <p className="text-sm text-slate-600 dark:text-slate-300">
                {confirmacion.mensaje}
              </p>
            </div>
            <div className="flex border-t border-slate-100 dark:border-slate-700">
              <button
                onClick={() => resolverConfirmacionPendiente(false)}
                className="flex-1 py-3 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors cursor-pointer"
              >
                {confirmacion.textoCancelar || "Cancelar"}
              </button>
              <button
                onClick={() => resolverConfirmacionPendiente(true)}
                className={`flex-1 py-3 text-sm font-bold text-white transition-colors cursor-pointer ${
                  confirmacion.peligroso
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {confirmacion.textoConfirmar || "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
