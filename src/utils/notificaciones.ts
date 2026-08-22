// src/utils/notificaciones.ts
// Reemplazo de alert()/confirm() nativos por una capa mínima de pub-sub, sin
// dependencias externas. Se puede llamar desde componentes React (Panel*.tsx)
// o desde módulos planos (utils/*.ts, ej. generadores de PDF), ya que no
// depende de hooks: el host visual (src/components/Notificaciones.tsx) es el
// único que se suscribe y dibuja el estado.

export type TipoNotificacion = "exito" | "error" | "advertencia" | "info";

export interface ToastNotificacion {
  id: number;
  tipo: TipoNotificacion;
  mensaje: string;
  duracionMs: number;
}

export interface OpcionesConfirmacion {
  mensaje: string;
  titulo?: string;
  peligroso?: boolean;
  textoConfirmar?: string;
  textoCancelar?: string;
}

interface ConfirmacionPendiente extends OpcionesConfirmacion {
  id: number;
  resolver: (valor: boolean) => void;
}

type Escucha = () => void;

let toasts: ToastNotificacion[] = [];
let confirmacionActual: ConfirmacionPendiente | null = null;
let idSiguiente = 0;
const escuchas = new Set<Escucha>();

function emitir() {
  escuchas.forEach((escucha) => escucha());
}

export function suscribirNotificaciones(escucha: Escucha): () => void {
  escuchas.add(escucha);
  return () => escuchas.delete(escucha);
}

export function obtenerToasts(): ToastNotificacion[] {
  return toasts;
}

export function obtenerConfirmacionPendiente(): ConfirmacionPendiente | null {
  return confirmacionActual;
}

export function cerrarToast(id: number) {
  toasts = toasts.filter((t) => t.id !== id);
  emitir();
}

function notificar(
  tipo: TipoNotificacion,
  mensaje: string,
  duracionMs: number,
): number {
  const id = ++idSiguiente;
  toasts = [...toasts, { id, tipo, mensaje, duracionMs }];
  emitir();
  return id;
}

export const notificarExito = (mensaje: string) =>
  notificar("exito", mensaje, 4000);

export const notificarError = (mensaje: string) =>
  notificar("error", mensaje, 6000);

export const notificarAdvertencia = (mensaje: string) =>
  notificar("advertencia", mensaje, 5000);

export const notificarInfo = (mensaje: string) =>
  notificar("info", mensaje, 4000);

// Reemplazo de window.confirm(): en vez de bloquear el hilo, devuelve una
// promesa que se resuelve cuando el usuario responde en el modal.
export function confirmar(
  opciones: string | OpcionesConfirmacion,
): Promise<boolean> {
  const opts = typeof opciones === "string" ? { mensaje: opciones } : opciones;
  return new Promise((resolve) => {
    const id = ++idSiguiente;
    confirmacionActual = { id, resolver: resolve, ...opts };
    emitir();
  });
}

export function resolverConfirmacionPendiente(valor: boolean) {
  if (!confirmacionActual) return;
  confirmacionActual.resolver(valor);
  confirmacionActual = null;
  emitir();
}
