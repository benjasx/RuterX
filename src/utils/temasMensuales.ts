import type { ComponentType } from "react";
import {
  Banderin,
  Calabaza,
  Calavera,
  Cempasuchil,
  Copo,
  Corazon,
  Corona,
  Esfera,
  Estrella,
  Fantasma,
  Flor,
  Globo,
  Lapiz,
  Libro,
  Luna,
  Mariposa,
  Murcielago,
  Nube,
  Ola,
  Palmera,
  Pino,
  Regalo,
  Sol,
  Vela,
  type FiguraProps,
} from "../components/temas/figuras";

export interface ElementoEscena {
  Figura: ComponentType<FiguraProps>;
  x: number; // posición horizontal en % del ancho de la barra (0–100)
  y: number; // px desde arriba (negativo o mayor al alto = asoma por el borde)
  tam: number; // ancho y alto de la figura en px
  rot?: number; // grados
  anim?: "flotar" | "parpadear"; // solo con motion-safe
  variante?: number; // color de Banderin
  soloEscritorio?: boolean; // oculto por debajo de md para no saturar la barra móvil
}

export interface TemaMensual {
  nombre: string; // solo para aria-label (no visible)
  barra: string; // degradado + borde, con variantes dark: (clases literales)
  elementos: ElementoEscena[];
}

// Posición vertical de la figura dentro de la barra (64 px de alto).
type Zona = "suelo" | "cielo" | "medio";

interface Pieza {
  Figura: ComponentType<FiguraProps>;
  zona: Zona;
  tam: number; // tamaño base en px (se varía ±15 % entre repeticiones)
  anim?: "flotar" | "parpadear";
  variante?: number; // color de Banderin
}

const p = (
  Figura: ComponentType<FiguraProps>,
  zona: Zona,
  tam: number,
  extra: { anim?: "flotar" | "parpadear"; variante?: number } = {},
): Pieza => ({ Figura, zona, tam, ...extra });

const ALTO_BARRA = 64;
const N_ELEMENTOS = 24;
const ESCALA = 1.25; // las figuras base están pensadas para ~40 px; la barra pide más presencia
const MAX_TAM = 60;

// Reparte las piezas a lo ancho de la barra de forma determinista (sin azar, para que la
// escena sea idéntica en cada render): tamaño y rotación varían un poco, las figuras de
// "suelo" se apoyan abajo, las de "cielo" cuelgan arriba y las de "medio" se centran.
// Solo dos elementos (los que caen en la zona libre entre el menú y los controles) se ven
// en móvil; el resto es solo de escritorio (md+).
const patron = (piezas: Pieza[]): ElementoEscena[] =>
  Array.from({ length: N_ELEMENTOS }, (_, i) => {
    const {
      Figura,
      zona,
      tam: base,
      anim,
      variante,
    } = piezas[i % piezas.length];
    const tam = Math.min(
      MAX_TAM,
      Math.round(base * ESCALA * (0.85 + (((i * 37) % 10) / 10) * 0.3)),
    );
    const y =
      zona === "suelo"
        ? ALTO_BARRA - tam + 3
        : zona === "cielo"
          ? -2 + ((i * 13) % 8)
          : Math.round((ALTO_BARRA - tam) / 2) + (((i * 7) % 5) - 2) * 2;
    return {
      Figura,
      x: 3 + (i * 94) / (N_ELEMENTOS - 1),
      y,
      tam,
      rot: zona === "suelo" ? 0 : ((i * 53) % 21) - 10,
      anim,
      variante,
      soloEscritorio: i !== 3 && i !== 5,
    };
  });

// Índice = Date#getMonth() (0 = enero … 11 = diciembre).
// Las clases van completas y literales para que Tailwind v4 las detecte.
export const TEMAS_MENSUALES: TemaMensual[] = [
  {
    nombre: "Día de Reyes",
    barra:
      "bg-linear-to-r from-amber-200 via-yellow-100 to-amber-200 border-amber-200 dark:from-amber-950 dark:via-slate-900 dark:to-amber-950 dark:border-amber-900",
    elementos: patron([
      p(Corona, "medio", 42, { anim: "flotar" }),
      p(Estrella, "cielo", 24, { anim: "parpadear" }),
      p(Regalo, "suelo", 40),
      p(Estrella, "cielo", 20, { anim: "parpadear" }),
      p(Corona, "medio", 36),
      p(Regalo, "suelo", 34),
    ]),
  },
  {
    nombre: "Amor y Amistad",
    barra:
      "bg-linear-to-r from-pink-200 via-rose-100 to-fuchsia-200 border-pink-200 dark:from-pink-950 dark:via-slate-900 dark:to-fuchsia-950 dark:border-pink-900",
    elementos: patron([
      p(Corazon, "medio", 36, { anim: "flotar" }),
      p(Globo, "cielo", 40, { anim: "flotar" }),
      p(Corazon, "suelo", 30),
      p(Estrella, "cielo", 20, { anim: "parpadear" }),
      p(Globo, "cielo", 34, { anim: "flotar" }),
      p(Corazon, "medio", 28, { anim: "flotar" }),
    ]),
  },
  {
    nombre: "Primavera",
    barra:
      "bg-linear-to-r from-lime-200 via-emerald-100 to-emerald-200 border-lime-200 dark:from-lime-950 dark:via-slate-900 dark:to-emerald-950 dark:border-lime-900",
    elementos: patron([
      p(Flor, "suelo", 36),
      p(Mariposa, "cielo", 30, { anim: "flotar" }),
      p(Flor, "suelo", 30),
      p(Nube, "cielo", 40, { anim: "flotar" }),
      p(Flor, "suelo", 40),
      p(Mariposa, "medio", 28, { anim: "flotar" }),
    ]),
  },
  {
    nombre: "Día del Niño",
    barra:
      "bg-linear-to-r from-sky-200 via-yellow-100 to-sky-200 border-sky-200 dark:from-sky-950 dark:via-slate-900 dark:to-sky-950 dark:border-sky-900",
    elementos: patron([
      p(Globo, "cielo", 40, { anim: "flotar" }),
      p(Estrella, "medio", 22, { anim: "parpadear" }),
      p(Nube, "cielo", 42, { anim: "flotar" }),
      p(Sol, "medio", 36),
      p(Globo, "cielo", 34, { anim: "flotar" }),
      p(Estrella, "suelo", 20, { anim: "parpadear" }),
    ]),
  },
  {
    nombre: "Día de las Madres",
    barra:
      "bg-linear-to-r from-fuchsia-200 via-pink-100 to-rose-200 border-fuchsia-200 dark:from-fuchsia-950 dark:via-slate-900 dark:to-rose-950 dark:border-fuchsia-900",
    elementos: patron([
      p(Flor, "suelo", 38),
      p(Corazon, "medio", 28, { anim: "flotar" }),
      p(Mariposa, "cielo", 30, { anim: "flotar" }),
      p(Flor, "suelo", 32),
      p(Corazon, "cielo", 26, { anim: "flotar" }),
      p(Flor, "medio", 40),
    ]),
  },
  {
    nombre: "Verano",
    barra:
      "bg-linear-to-r from-yellow-200 via-orange-100 to-amber-200 border-yellow-200 dark:from-yellow-950 dark:via-slate-900 dark:to-amber-950 dark:border-yellow-900",
    elementos: patron([
      p(Sol, "cielo", 44),
      p(Ola, "suelo", 44),
      p(Nube, "cielo", 34, { anim: "flotar" }),
      p(Ola, "suelo", 40),
      p(Sol, "medio", 28),
      p(Ola, "suelo", 46),
    ]),
  },
  {
    nombre: "Vacaciones",
    barra:
      "bg-linear-to-r from-cyan-200 via-sky-100 to-cyan-200 border-cyan-200 dark:from-cyan-950 dark:via-slate-900 dark:to-cyan-950 dark:border-cyan-900",
    elementos: patron([
      p(Palmera, "suelo", 54),
      p(Ola, "suelo", 40),
      p(Sol, "cielo", 34),
      p(Palmera, "suelo", 48),
      p(Ola, "suelo", 44),
      p(Sol, "cielo", 26),
    ]),
  },
  {
    nombre: "Regreso a Clases",
    barra:
      "bg-linear-to-r from-indigo-200 via-sky-100 to-indigo-200 border-indigo-200 dark:from-indigo-950 dark:via-slate-900 dark:to-indigo-950 dark:border-indigo-900",
    elementos: patron([
      p(Libro, "suelo", 36),
      p(Lapiz, "medio", 40, { anim: "flotar" }),
      p(Estrella, "cielo", 20, { anim: "parpadear" }),
      p(Libro, "suelo", 32),
      p(Lapiz, "medio", 36),
      p(Estrella, "cielo", 22, { anim: "parpadear" }),
    ]),
  },
  {
    nombre: "Fiestas Patrias",
    barra:
      "bg-linear-to-r from-green-200 via-white to-red-200 border-green-200 dark:from-green-950 dark:via-slate-900 dark:to-red-950 dark:border-green-900",
    elementos: patron([
      p(Banderin, "cielo", 36, { variante: 1 }),
      p(Cempasuchil, "suelo", 30),
      p(Banderin, "cielo", 36, { variante: 2 }),
      p(Estrella, "medio", 24, { anim: "parpadear" }),
      p(Banderin, "cielo", 36, { variante: 1 }),
      p(Cempasuchil, "suelo", 34),
      p(Banderin, "cielo", 36, { variante: 2 }),
      p(Estrella, "suelo", 22, { anim: "parpadear" }),
    ]),
  },
  {
    nombre: "Halloween",
    barra:
      "bg-linear-to-r from-orange-200 via-amber-100 to-violet-200 border-orange-200 dark:from-orange-950 dark:via-slate-900 dark:to-violet-950 dark:border-orange-900",
    elementos: patron([
      p(Luna, "cielo", 38, { anim: "parpadear" }),
      p(Calabaza, "suelo", 42),
      p(Fantasma, "medio", 40, { anim: "flotar" }),
      p(Murcielago, "cielo", 28, { anim: "flotar" }),
      p(Calabaza, "suelo", 34),
      p(Fantasma, "medio", 32, { anim: "flotar" }),
    ]),
  },
  {
    nombre: "Día de Muertos",
    barra:
      "bg-linear-to-r from-violet-200 via-orange-100 to-orange-200 border-violet-200 dark:from-violet-950 dark:via-slate-900 dark:to-orange-950 dark:border-violet-900",
    elementos: patron([
      p(Cempasuchil, "suelo", 34),
      p(Vela, "suelo", 44, { anim: "parpadear" }),
      p(Banderin, "cielo", 34, { variante: 0 }),
      p(Calavera, "medio", 44, { anim: "flotar" }),
      p(Cempasuchil, "suelo", 30),
      p(Banderin, "cielo", 34, { variante: 3 }),
      p(Vela, "suelo", 38, { anim: "parpadear" }),
      p(Calavera, "medio", 36, { anim: "flotar" }),
    ]),
  },
  {
    nombre: "Navidad",
    barra:
      "bg-linear-to-r from-red-200 via-white to-emerald-200 border-red-200 dark:from-red-950 dark:via-slate-900 dark:to-emerald-950 dark:border-red-900",
    elementos: patron([
      p(Pino, "suelo", 46),
      p(Copo, "cielo", 28, { anim: "flotar" }),
      p(Esfera, "suelo", 30),
      p(Estrella, "cielo", 24, { anim: "parpadear" }),
      p(Pino, "suelo", 40),
      p(Copo, "cielo", 26, { anim: "flotar" }),
      p(Regalo, "suelo", 34),
      p(Estrella, "cielo", 22, { anim: "parpadear" }),
    ]),
  },
];
