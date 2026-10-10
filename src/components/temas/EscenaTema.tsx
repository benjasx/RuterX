import type { ElementoEscena } from "../../utils/temasMensuales";

// Clases literales (Tailwind v4 no detecta nombres construidos con plantillas).
// motion-safe: respeta prefers-reduced-motion.
const ANIMACIONES = {
  flotar: "motion-safe:animate-flotar",
  parpadear: "motion-safe:animate-parpadear",
} as const;

interface EscenaTemaProps {
  elementos: ElementoEscena[];
  nombre: string;
}

// Capa decorativa de la barra: no intercepta clics y no se sale de la barra.
export default function EscenaTema({ elementos, nombre }: EscenaTemaProps) {
  return (
    <div
      role="img"
      aria-label={nombre}
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {elementos.map(({ Figura, x, y, tam, rot = 0, anim, variante, soloEscritorio }, i) => (
        <div
          key={i}
          className={`absolute ${soloEscritorio ? "hidden md:block" : ""} ${anim ? ANIMACIONES[anim] : ""}`}
          style={{
            left: `${x}%`,
            top: y,
            width: tam,
            height: tam,
            transform: `translateX(-50%) rotate(${rot}deg)`,
          }}
        >
          <Figura className="h-full w-full" variante={variante} />
        </div>
      ))}
    </div>
  );
}
