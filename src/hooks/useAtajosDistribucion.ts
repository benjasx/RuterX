import { useEffect, useRef } from "react";
import { notificarAdvertencia } from "../utils/notificaciones";

export type AccionFila = "paquete" | "ruta" | "mesanine" | "bitacora";

// Un handler undefined = el atajo no está disponible para ese rol
export interface HandlersAtajos {
  guardar?: () => void;
  agregarFila?: () => void;
  vincularXLSX?: () => void;
  alternarResumen?: () => void;
  abrirBodega?: () => void;
  abrirWhatsApp?: () => void;
  exportarExcel?: () => void;
  exportarPDF?: () => void;
  imprimirFila?: (accion: AccionFila, index: number) => void;
  alternarAyuda?: () => void;
  cerrarModal?: () => void;
}

const ACCIONES_GLOBALES: Record<string, keyof HandlersAtajos> = {
  KeyN: "agregarFila",
  KeyX: "vincularXLSX",
  KeyR: "alternarResumen",
  KeyB: "abrirBodega",
  KeyW: "abrirWhatsApp",
  KeyE: "exportarExcel",
  KeyP: "exportarPDF",
};

const ACCIONES_FILA: Record<string, AccionFila> = {
  Digit1: "paquete",
  Digit2: "ruta",
  Digit3: "mesanine",
  Digit4: "bitacora",
};

// Índice de la fila de la tabla principal que contiene el foco (-1 si no hay)
const filaEnfocada = () => {
  const fila = document.activeElement?.closest("[data-fila]");
  const idx = fila ? Number(fila.getAttribute("data-fila")) : NaN;
  return Number.isNaN(idx) ? -1 : idx;
};

// Columnas (data-col) de Emb. Crédito y Emb. Contado
const COLS_EMBARQUE = [5, 6];

// Alt+flecha → [delta fila, delta columna]
const FLECHAS: Record<string, [number, number]> = {
  ArrowUp: [-1, 0],
  ArrowDown: [1, 0],
  ArrowLeft: [0, -1],
  ArrowRight: [0, 1],
};

// Celda de la tabla principal (data-fila + data-col) que tiene el foco
const celdaEnfocada = () => {
  const el = document.activeElement;
  if (!el || !el.hasAttribute("data-col")) return null;
  const fila = Number(el.getAttribute("data-fila"));
  const col = Number(el.getAttribute("data-col"));
  return Number.isNaN(fila) || Number.isNaN(col) ? null : { fila, col };
};

// Mueve el foco a la celda indicada; en los bordes (no existe) no hace nada
const enfocarCelda = (fila: number, col: number) => {
  document
    .querySelector<HTMLElement>(`[data-fila="${fila}"][data-col="${col}"]`)
    ?.focus();
};

export const useAtajosDistribucion = (
  handlers: HandlersAtajos,
  modalAbierto: boolean,
) => {
  // Ref para registrar el listener una sola vez y leer siempre los handlers vigentes
  const ref = useRef({ handlers, modalAbierto });

  useEffect(() => {
    ref.current = { handlers, modalAbierto };
  });

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const { handlers: h, modalAbierto: modal } = ref.current;

      if (e.key === "F1" || (e.altKey && (e.key === "?" || (e.shiftKey && e.code === "Slash")))) {
        if (!h.alternarAyuda) return;
        e.preventDefault();
        h.alternarAyuda();
        return;
      }

      if (e.key === "Escape") {
        if (modal && h.cerrarModal) {
          e.preventDefault();
          h.cerrarModal();
        }
        return;
      }

      if (e.ctrlKey && !e.altKey && e.code === "KeyS") {
        e.preventDefault(); // evita "Guardar página" del navegador
        if (!modal) h.guardar?.();
        return;
      }

      if (e.key === "Enter" && !e.altKey && !e.ctrlKey && !e.shiftKey && !modal) {
        const celda = celdaEnfocada();
        if (celda && COLS_EMBARQUE.includes(celda.col)) {
          e.preventDefault();
          enfocarCelda(celda.fila + 1, celda.col);
        }
        return;
      }

      if (!e.altKey || e.ctrlKey || e.metaKey) return;

      const flecha = FLECHAS[e.key];
      if (flecha) {
        const celda = celdaEnfocada();
        if (!celda || modal) return;
        e.preventDefault(); // evita atrás/adelante del navegador
        enfocarCelda(celda.fila + flecha[0], celda.col + flecha[1]);
        return;
      }

      const global = ACCIONES_GLOBALES[e.code];
      const accionFila = ACCIONES_FILA[e.code];
      if (!global && !accionFila) return;

      e.preventDefault();
      if (modal) return;

      if (global) {
        (h[global] as (() => void) | undefined)?.();
        return;
      }

      if (!h.imprimirFila) return;
      const index = filaEnfocada();
      if (index < 0) {
        notificarAdvertencia("Coloca el cursor en una fila de la tabla.");
        return;
      }
      h.imprimirFila(accionFila, index);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
};
