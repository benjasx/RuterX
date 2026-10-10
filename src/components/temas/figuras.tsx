// Figuras SVG decorativas para la barra superior temática (src/utils/temasMensuales.ts).
// Todas usan viewBox 0 0 64 64 y colores con clases literales de Tailwind (fill-*/stroke-*),
// con variante dark: donde la figura se pierde sobre el fondo oscuro.

export interface FiguraProps {
  className?: string;
  variante?: number; // solo Banderin: índice de color (papel picado)
}

const Svg = ({
  className,
  children,
}: FiguraProps & { children: React.ReactNode }) => (
  <svg
    viewBox="0 0 64 64"
    className={className}
    aria-hidden="true"
    focusable="false"
  >
    {children}
  </svg>
);

export const Calabaza = ({ className }: FiguraProps) => (
  <Svg className={className}>
    <path
      d="M30 17C30 11 33 8 37 6L39 10C36 11.5 35 14 35 18Z"
      className="fill-lime-700"
    />
    <ellipse cx="32" cy="39" rx="27" ry="21" className="fill-orange-600" />
    <ellipse cx="19" cy="39" rx="15" ry="20" className="fill-orange-500" />
    <ellipse cx="45" cy="39" rx="15" ry="20" className="fill-orange-500" />
    <ellipse cx="32" cy="39" rx="9" ry="21" className="fill-orange-400" />
    <path d="M16 36L25 36L20.5 28Z" className="fill-yellow-300" />
    <path d="M39 36L48 36L43.5 28Z" className="fill-yellow-300" />
    <path
      d="M19 45L24 43.5L27.5 49L32 44.5L36.5 49L40 43.5L45 45L42 54H22Z"
      className="fill-yellow-300"
    />
  </Svg>
);

export const Fantasma = ({ className }: FiguraProps) => (
  <Svg className={className}>
    <path
      d="M11 56V30C11 16 20 8 32 8C44 8 53 16 53 30V56L46 49.5L39 56L32 49.5L25 56L18 49.5Z"
      className="fill-white stroke-slate-300"
      strokeWidth="2"
      strokeLinejoin="round"
    />
    <ellipse cx="24.5" cy="28" rx="3.2" ry="4.8" className="fill-slate-800" />
    <ellipse cx="39.5" cy="28" rx="3.2" ry="4.8" className="fill-slate-800" />
    <ellipse cx="32" cy="39" rx="3.8" ry="5.2" className="fill-slate-800" />
    <circle cx="19" cy="36" r="3" className="fill-pink-300/70" />
    <circle cx="45" cy="36" r="3" className="fill-pink-300/70" />
  </Svg>
);

export const Murcielago = ({ className }: FiguraProps) => (
  <Svg className={className}>
    <path
      d="M32 30C27 22 20 20 12 22C8 23 4 26 2 32C6 30 9 31 11 35C14 32 18 32 21 36C24 34 28 34 32 38C36 34 40 34 43 36C46 32 50 32 53 35C55 31 58 30 62 32C60 26 56 23 52 22C44 20 37 22 32 30Z"
      className="fill-violet-900 dark:fill-violet-300"
    />
    <path
      d="M27 24L29 16L32 22L35 16L37 24Z"
      className="fill-violet-900 dark:fill-violet-300"
    />
    <ellipse
      cx="32"
      cy="31"
      rx="5.5"
      ry="9"
      className="fill-violet-900 dark:fill-violet-300"
    />
    <circle cx="29.8" cy="28" r="1.3" className="fill-yellow-300" />
    <circle cx="34.2" cy="28" r="1.3" className="fill-yellow-300" />
  </Svg>
);

export const Luna = ({ className }: FiguraProps) => (
  <Svg className={className}>
    <path
      d="M44 6A26 26 0 1 0 58 46A21 21 0 1 1 44 6Z"
      className="fill-yellow-200 stroke-amber-400"
      strokeWidth="2"
      strokeLinejoin="round"
    />
  </Svg>
);

export const Estrella = ({ className }: FiguraProps) => (
  <Svg className={className}>
    <polygon
      points="32,4 38.8,22.7 58.6,23.4 42.9,35.6 48.5,54.7 32,43.5 15.5,54.7 21.1,35.6 5.4,23.4 25.2,22.7"
      className="fill-yellow-300 stroke-amber-400"
      strokeWidth="2"
      strokeLinejoin="round"
    />
  </Svg>
);

export const Cempasuchil = ({ className }: FiguraProps) => (
  <Svg className={className}>
    <g transform="translate(32 32)">
      {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
        <ellipse
          key={a}
          cx="0"
          cy="-15"
          rx="8.5"
          ry="13"
          transform={`rotate(${a})`}
          className="fill-orange-500"
        />
      ))}
      {[22.5, 67.5, 112.5, 157.5, 202.5, 247.5, 292.5, 337.5].map((a) => (
        <ellipse
          key={a}
          cx="0"
          cy="-11"
          rx="6.5"
          ry="10"
          transform={`rotate(${a})`}
          className="fill-amber-400"
        />
      ))}
      <circle r="8" className="fill-orange-600" />
      <circle r="4" className="fill-yellow-300" />
    </g>
  </Svg>
);

export const Calavera = ({ className }: FiguraProps) => (
  <Svg className={className}>
    <path
      d="M32 6C16 6 8 18 10 30C11 36 15 38 16 42V50C16 54 20 56 24 56H40C44 56 48 54 48 50V42C49 38 53 36 54 30C56 18 48 6 32 6Z"
      className="fill-slate-50 stroke-slate-400"
      strokeWidth="2"
    />
    <circle cx="23" cy="28" r="8.5" className="fill-orange-400" />
    <circle cx="41" cy="28" r="8.5" className="fill-orange-400" />
    <circle cx="23" cy="28" r="5" className="fill-slate-900" />
    <circle cx="41" cy="28" r="5" className="fill-slate-900" />
    <circle cx="23" cy="28" r="1.6" className="fill-fuchsia-400" />
    <circle cx="41" cy="28" r="1.6" className="fill-fuchsia-400" />
    <path d="M32 36L28.5 42H35.5Z" className="fill-slate-800" />
    <circle cx="32" cy="14" r="3.2" className="fill-pink-400" />
    <circle cx="32" cy="14" r="1.2" className="fill-yellow-300" />
    <path
      d="M22 47H42M26 44V52M30 44V52.5M34 44V52.5M38 44V52"
      className="stroke-slate-600"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </Svg>
);

export const Vela = ({ className }: FiguraProps) => (
  <Svg className={className}>
    <ellipse cx="32" cy="58" rx="16" ry="4" className="fill-amber-700" />
    <path
      d="M23 30H41V57H23Z"
      className="fill-amber-50 stroke-amber-200"
      strokeWidth="1.5"
    />
    <path
      d="M23 30H41V34C41 37 38 37 38 34C38 40 33 40 33 34C33 37 29 37 28 34C27 38 23 38 23 34Z"
      className="fill-white"
    />
    <path
      d="M32 5C38 12 40 18 32 26C24 18 26 12 32 5Z"
      className="fill-orange-400"
    />
    <path
      d="M32 12C35.5 16 36 20 32 24C28 20 28.5 16 32 12Z"
      className="fill-yellow-200"
    />
    <path
      d="M32 26V30"
      className="stroke-slate-700"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
  </Svg>
);

const COLORES_BANDERIN = [
  "fill-fuchsia-500",
  "fill-green-600",
  "fill-red-500",
  "fill-orange-500",
  "fill-sky-500",
];

export const Banderin = ({ className, variante = 0 }: FiguraProps) => (
  <Svg className={className}>
    <path
      d="M0 10H64"
      className="stroke-slate-500"
      strokeWidth="1.5"
    />
    <path
      d="M4 12H60V50L54.5 44L49 50L43.5 44L38 50L32.5 44L27 50L21.5 44L16 50L10.5 44L4 50Z"
      className={COLORES_BANDERIN[variante % COLORES_BANDERIN.length]}
    />
    <path d="M32 18L39 28L32 38L25 28Z" className="fill-white/85" />
    <path
      d="M32 22L35.5 28L32 34L28.5 28Z"
      className={COLORES_BANDERIN[variante % COLORES_BANDERIN.length]}
    />
    <circle cx="12" cy="20" r="2.2" className="fill-white/85" />
    <circle cx="52" cy="20" r="2.2" className="fill-white/85" />
    <circle cx="12" cy="30" r="1.6" className="fill-white/85" />
    <circle cx="52" cy="30" r="1.6" className="fill-white/85" />
  </Svg>
);

export const Pino = ({ className }: FiguraProps) => (
  <Svg className={className}>
    <rect x="28" y="54" width="8" height="8" rx="1" className="fill-amber-800" />
    <path d="M32 26L55 56H9Z" className="fill-green-700" />
    <path d="M32 15L50 40H14Z" className="fill-green-600" />
    <path d="M32 6L46 26H18Z" className="fill-green-500" />
    <circle cx="26" cy="48" r="2.4" className="fill-red-500" />
    <circle cx="38" cy="50" r="2.4" className="fill-yellow-300" />
    <circle cx="32" cy="36" r="2.2" className="fill-red-500" />
    <circle cx="26" cy="27" r="2" className="fill-yellow-300" />
    <polygon
      points="32,0 33.8,4.2 38.2,4.4 34.7,7.2 35.9,11.4 32,9 28.1,11.4 29.3,7.2 25.8,4.4 30.2,4.2"
      className="fill-yellow-300"
    />
  </Svg>
);

export const Copo = ({ className }: FiguraProps) => (
  <Svg className={className}>
    <g
      transform="translate(32 32)"
      className="stroke-sky-400 dark:stroke-sky-200"
      strokeWidth="3"
      strokeLinecap="round"
      fill="none"
    >
      {[0, 60, 120].map((a) => (
        <path
          key={a}
          transform={`rotate(${a})`}
          d="M0 -27V27M0 -17L-7 -24M0 -17L7 -24M0 17L-7 24M0 17L7 24"
        />
      ))}
    </g>
  </Svg>
);

export const Esfera = ({ className }: FiguraProps) => (
  <Svg className={className}>
    <circle
      cx="32"
      cy="12"
      r="4"
      className="stroke-amber-400"
      strokeWidth="2"
      fill="none"
    />
    <rect x="27" y="14" width="10" height="7" rx="1.5" className="fill-amber-400" />
    <circle cx="32" cy="40" r="19" className="fill-red-500" />
    <path
      d="M14 40C20 34 26 44 32 40C38 36 44 46 50 40"
      className="stroke-yellow-300"
      strokeWidth="3"
      strokeLinecap="round"
      fill="none"
    />
    <ellipse
      cx="24"
      cy="31"
      rx="4"
      ry="6.5"
      transform="rotate(35 24 31)"
      className="fill-white/45"
    />
  </Svg>
);

export const Corona = ({ className }: FiguraProps) => (
  <Svg className={className}>
    <path
      d="M8 48L4 20L18 32L32 12L46 32L60 20L56 48Z"
      className="fill-yellow-400 stroke-amber-500"
      strokeWidth="2"
      strokeLinejoin="round"
    />
    <rect x="8" y="48" width="48" height="9" rx="2" className="fill-amber-400" />
    <circle cx="4" cy="20" r="3" className="fill-yellow-200" />
    <circle cx="32" cy="12" r="3.2" className="fill-yellow-200" />
    <circle cx="60" cy="20" r="3" className="fill-yellow-200" />
    <circle cx="32" cy="40" r="4" className="fill-red-500" />
    <circle cx="17" cy="42" r="2.8" className="fill-sky-400" />
    <circle cx="47" cy="42" r="2.8" className="fill-emerald-400" />
  </Svg>
);

export const Regalo = ({ className }: FiguraProps) => (
  <Svg className={className}>
    <rect x="9" y="29" width="46" height="31" rx="2" className="fill-red-500" />
    <rect x="5" y="21" width="54" height="12" rx="2" className="fill-red-600" />
    <rect x="28" y="21" width="8" height="39" className="fill-yellow-300" />
    <ellipse
      cx="23"
      cy="15"
      rx="10"
      ry="6"
      transform="rotate(-25 23 15)"
      className="fill-yellow-300 stroke-yellow-500"
      strokeWidth="1.8"
    />
    <ellipse
      cx="41"
      cy="15"
      rx="10"
      ry="6"
      transform="rotate(25 41 15)"
      className="fill-yellow-300 stroke-yellow-500"
      strokeWidth="1.8"
    />
    <circle cx="32" cy="18" r="4.2" className="fill-yellow-400" />
  </Svg>
);

export const Corazon = ({ className }: FiguraProps) => (
  <Svg className={className}>
    <path
      d="M32 58C10 42 4 30 4 21C4 12 11 6 19 6C25 6 29 9 32 14C35 9 39 6 45 6C53 6 60 12 60 21C60 30 54 42 32 58Z"
      className="fill-rose-500"
    />
    <ellipse
      cx="17"
      cy="19"
      rx="4"
      ry="7"
      transform="rotate(35 17 19)"
      className="fill-white/45"
    />
  </Svg>
);

export const Globo = ({ className }: FiguraProps) => (
  <Svg className={className}>
    <path
      d="M32 50C30 55 34 58 32 63"
      className="stroke-slate-500"
      strokeWidth="1.5"
      strokeLinecap="round"
      fill="none"
    />
    <ellipse cx="32" cy="26" rx="18" ry="22" className="fill-fuchsia-500" />
    <path d="M27.5 51L32 45L36.5 51Z" className="fill-fuchsia-600" />
    <ellipse
      cx="24"
      cy="17"
      rx="4"
      ry="8"
      transform="rotate(25 24 17)"
      className="fill-white/50"
    />
  </Svg>
);

export const Flor = ({ className }: FiguraProps) => (
  <Svg className={className}>
    <g transform="translate(32 32)">
      {[0, 72, 144, 216, 288].map((a) => (
        <ellipse
          key={a}
          cx="0"
          cy="-15"
          rx="10"
          ry="14"
          transform={`rotate(${a})`}
          className="fill-pink-400"
        />
      ))}
      <circle r="9" className="fill-yellow-300" />
      <circle r="4.5" className="fill-amber-400" />
    </g>
  </Svg>
);

export const Mariposa = ({ className }: FiguraProps) => (
  <Svg className={className}>
    <g className="fill-violet-400">
      <path d="M32 30C22 6 3 10 6 26C7 34 20 36 32 30Z" />
      <path d="M32 30C42 6 61 10 58 26C57 34 44 36 32 30Z" />
    </g>
    <g className="fill-fuchsia-400">
      <path d="M32 34C22 36 12 40 14 52C16 60 28 54 32 34Z" />
      <path d="M32 34C42 36 52 40 50 52C48 60 36 54 32 34Z" />
    </g>
    <circle cx="17" cy="21" r="3.4" className="fill-white/70" />
    <circle cx="47" cy="21" r="3.4" className="fill-white/70" />
    <circle cx="21" cy="49" r="2.4" className="fill-white/70" />
    <circle cx="43" cy="49" r="2.4" className="fill-white/70" />
    <ellipse
      cx="32"
      cy="35"
      rx="2.6"
      ry="14"
      className="fill-slate-800 dark:fill-slate-200"
    />
    <path
      d="M31 21C29 14 26 12 23 11M33 21C35 14 38 12 41 11"
      className="stroke-slate-800 dark:stroke-slate-200"
      strokeWidth="1.6"
      strokeLinecap="round"
      fill="none"
    />
  </Svg>
);

export const Nube = ({ className }: FiguraProps) => (
  <Svg className={className}>
    <path
      d="M18 52A11 11 0 0 1 16 30A14 14 0 0 1 40 22A13 13 0 0 1 56 36A9 9 0 0 1 52 52Z"
      className="fill-white stroke-sky-300"
      strokeWidth="2"
      strokeLinejoin="round"
    />
  </Svg>
);

export const Sol = ({ className }: FiguraProps) => (
  <Svg className={className}>
    <g
      transform="translate(32 32)"
      className="stroke-orange-400"
      strokeWidth="4"
      strokeLinecap="round"
    >
      {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((a) => (
        <path key={a} transform={`rotate(${a})`} d="M0 -20V-28" />
      ))}
    </g>
    <circle
      cx="32"
      cy="32"
      r="14"
      className="fill-yellow-300 stroke-orange-400"
      strokeWidth="2"
    />
  </Svg>
);

export const Ola = ({ className }: FiguraProps) => (
  <Svg className={className}>
    <path
      d="M0 36C8 24 16 24 24 36S40 48 48 36S60 26 64 32V64H0Z"
      className="fill-cyan-400"
    />
    <path
      d="M0 48C8 40 16 40 24 48S40 56 48 48S60 42 64 45V64H0Z"
      className="fill-sky-500"
    />
    <circle cx="14" cy="31" r="2.2" className="fill-white/80" />
    <circle cx="40" cy="42" r="2.2" className="fill-white/80" />
    <circle cx="55" cy="33" r="1.8" className="fill-white/80" />
  </Svg>
);

export const Palmera = ({ className }: FiguraProps) => (
  <Svg className={className}>
    <path
      d="M30 62C28 48 34 38 36 28"
      className="stroke-amber-800"
      strokeWidth="5"
      strokeLinecap="round"
      fill="none"
    />
    <g className="fill-green-600">
      <path d="M36 28C26 20 14 22 6 30C16 26 26 28 36 28Z" />
      <path d="M36 28C44 14 54 10 60 14C50 16 42 22 36 28Z" />
      <path d="M36 28C34 16 36 8 40 4C40 14 38 22 36 28Z" />
    </g>
    <g className="fill-green-700">
      <path d="M36 28C28 14 18 10 10 12C20 14 28 20 36 28Z" />
      <path d="M36 28C46 20 58 22 62 32C52 26 44 28 36 28Z" />
    </g>
    <circle cx="34" cy="31" r="2.6" className="fill-amber-900" />
    <circle cx="39" cy="32" r="2.6" className="fill-amber-900" />
  </Svg>
);

export const Lapiz = ({ className }: FiguraProps) => (
  <Svg className={className}>
    <g transform="rotate(35 32 32)">
      <rect x="25" y="12" width="14" height="36" className="fill-yellow-400" />
      <rect x="32" y="12" width="7" height="36" className="fill-yellow-500/70" />
      <path d="M25 48L32 62L39 48Z" className="fill-amber-200" />
      <path d="M29.5 56L32 62L34.5 56Z" className="fill-slate-800" />
      <rect x="25" y="8" width="14" height="5" className="fill-slate-300" />
      <rect x="25" y="2" width="14" height="7" rx="2.5" className="fill-pink-400" />
    </g>
  </Svg>
);

export const Libro = ({ className }: FiguraProps) => (
  <Svg className={className}>
    <rect
      x="50"
      y="10"
      width="6"
      height="46"
      className="fill-white stroke-slate-300"
      strokeWidth="1.5"
    />
    <rect x="10" y="6" width="42" height="52" rx="3" className="fill-indigo-500" />
    <rect x="10" y="6" width="8" height="52" rx="3" className="fill-indigo-700" />
    <rect x="25" y="14" width="20" height="14" rx="2" className="fill-yellow-300" />
    <path
      d="M25 36H45M25 43H40"
      className="stroke-white/75"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
  </Svg>
);
