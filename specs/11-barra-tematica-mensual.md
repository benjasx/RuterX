# 11 — Barra superior temática por mes

**Estado:** Implementado
**Depende de:** Ninguno
**Fecha:** 2026-10-10

**Objetivo:** La barra superior del panel (`Navbar.tsx`) muestra, según el mes actual del sistema, un fondo degradado con una escena decorativa de ilustraciones SVG propias (calabazas y fantasmas en octubre, cempasúchil y calaveras en noviembre, pinos y copos en diciembre, etc.), sin texto visible, con animación sutil y variantes `dark:`.

> **Historial (2026-10-10, misma sesión):** la v1 (pasos 1–5: color + borde + un icono Lucide con etiqueta de texto) se implementó y el usuario la rechazó por poco visual ("quiero imágenes, que sea llamativo, sin letras, una navbar muy estética"). Esta versión **reemplaza** la v1: se quitan el icono Lucide, la etiqueta y las clases `acento`. Los pasos 6–9 son los del rediseño; los pasos 1–2 (diccionario base y hook de mes) se conservan y se adaptan.

## Contexto

- El componente real es `src/components/Navbar.tsx` (no existe ningún "TopBar"). Se renderiza una sola vez, en `src/RuterMapas.tsx:226`, dentro del shell del panel (admin/jefe/embarques/vendedor); los choferes ven otra vista, así que no les afecta.
- La barra mide `h-16` (64 px). Izquierda: botones de menú (`Menu` en móvil, `PanelLeftClose/Open` en escritorio). Derecha: botón de tema claro/oscuro, chip con el correo y botón "Salir".
- **El modo oscuro ya existe**: `src/index.css` declara `@custom-variant dark (&:where(.dark, .dark *))` y `src/utils/theme.ts` alterna la clase `.dark`.
- Tailwind v4 solo genera clases que ve escritas completas y literales en el código fuente (también en `.ts`): nada de clases construidas con plantillas.
- No hay fotos ni descargas: las "imágenes" son **ilustraciones vectoriales dibujadas a mano como componentes React SVG** (inline), sin archivos binarios ni dependencias nuevas.
- Un `<svg>` inline permite `fill-*`/`stroke-*` de Tailwind con variantes `dark:`, y no añade peticiones de red.

## Alcance

**Dentro:**

- **`src/components/temas/figuras.tsx`** (nuevo): biblioteca de ~22 figuras SVG pequeñas (viewBox `0 0 64 64`), cada una un componente `({ className }) => <svg …>`: `Calabaza`, `Fantasma`, `Murcielago`, `Luna`, `Estrella`, `Corazon`, `Flor`, `Mariposa`, `Pino`, `Copo`, `Esfera`, `Globo`, `Nube`, `Sol`, `Palmera`, `Ola`, `Banderin` (papel picado), `Calavera` (de azúcar), `Cempasuchil`, `Vela`, `Corona`, `Regalo`, `Lapiz`, `Libro`. Colores con clases `fill-*`/`stroke-*` y variante `dark:` donde haga falta.
- **`src/components/temas/EscenaTema.tsx`** (nuevo): capa decorativa `absolute inset-0 pointer-events-none` que recibe la lista de `elementos` del tema y coloca cada figura en `left: x%` / `top: y px` con tamaño, rotación y animación opcional. Posiciones en **porcentaje** (no en px) para que la escena escale con cualquier ancho de barra.
- **`src/utils/temasMensuales.ts`** (reescribir): `TemaMensual` pasa a `{ nombre, barra, elementos }`; se eliminan `Icono` y `acento`. `barra` es un **degradado** (`bg-linear-to-r from-… via-… to-…`) con borde y variantes `dark:`. `elementos` es la composición de la escena del mes, generada por un helper determinista `patron(piezas)` que reparte 24 elementos a lo ancho (figuras de "suelo" apoyadas abajo, de "cielo" colgando arriba y de "medio" centradas; tamaño ×1.25 con variación ±15 %, máx. 60 px).
- **`src/hooks/useMesActual.ts`**: sin cambios (mes al montar + `visibilitychange`).
- **`src/index.css`**: animaciones sutiles registradas en `@theme` (`--animate-flotar`, `--animate-parpadear`) con sus `@keyframes`; se usan solo con `motion-safe:` para respetar `prefers-reduced-motion`.
- **`src/components/Navbar.tsx`** (modificar):
  - `<nav>` pasa a `relative overflow-hidden` con `barra` (degradado + borde) y se mantiene `transition-colors duration-500`.
  - Capa de escena (`<EscenaTema/>`) detrás del contenido; el contenido (`z-10`) conserva exactamente los mismos botones, props y comportamiento.
  - Cada grupo (izquierdo y derecho) lleva un **velo** semitransparente (`bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm rounded-xl`) para que botones y correo sigan legibles sobre la ilustración.
  - **Se elimina el bloque icono + etiqueta de texto** de la v1. No hay ningún texto visible del tema.
  - La capa de escena es `role="img"` con `aria-label` = `tema.nombre` (accesibilidad; no visible).
- **Composiciones (mes → figuras principales y degradado):**

  | Mes                          | Figuras                                       | Degradado                           |
  | ---------------------------- | --------------------------------------------- | ----------------------------------- |
  | Enero (Reyes)                | `Corona`, `Estrella`, `Regalo`                | ámbar → amarillo                    |
  | Febrero (Amor y Amistad)     | `Corazon`, `Globo`, `Estrella`                | rosa → fucsia                       |
  | Marzo (Primavera)            | `Flor`, `Mariposa`, `Nube`                    | lima → esmeralda                    |
  | Abril (Día del Niño)         | `Globo`, `Estrella`, `Nube`, `Sol`            | celeste → amarillo                  |
  | Mayo (Día de las Madres)     | `Flor`, `Corazon`, `Mariposa`                 | fucsia → rosa                       |
  | Junio (Verano)               | `Sol`, `Ola`, `Nube`                          | amarillo → naranja                  |
  | Julio (Vacaciones)           | `Palmera`, `Ola`, `Sol`                       | cian → celeste                      |
  | Agosto (Regreso a clases)    | `Lapiz`, `Libro`, `Estrella`                  | índigo → celeste                    |
  | Septiembre (Fiestas Patrias) | `Banderin`, `Estrella`, `Cempasuchil`         | verde → rojo (con blanco al centro) |
  | Octubre (Halloween)          | `Calabaza`, `Fantasma`, `Murcielago`, `Luna`  | naranja → violeta                   |
  | Noviembre (Día de Muertos)   | `Cempasuchil`, `Calavera`, `Vela`, `Banderin` | violeta → naranja                   |
  | Diciembre (Navidad)          | `Pino`, `Copo`, `Esfera`, `Estrella`          | rojo → esmeralda                    |

**Fuera de alcance (para otro spec si hace falta):**

- Fotografías o archivos de imagen (PNG/JPG/WebP) y cualquier descarga de assets externos.
- Override para pruebas (`?tema=10`) o selector manual de tema por el usuario.
- Persistir el tema o la preferencia (se deriva del reloj).
- Tematizar otras partes de la app (sidebar, paneles, login, PDFs).
- Temas por fechas exactas (Navidad solo del 1 al 25, etc.): el tema es por mes completo.
- Animaciones marcadas (murciélagos cruzando, copos cayendo) o librerías de animación.
- Cambiar cómo se alterna el modo oscuro (`utils/theme.ts`).
- Tests automáticos (no hay test runner).

## Datos

No hay datos nuevos en Firestore ni en `localStorage`: el tema se deriva en memoria del mes del reloj local. Estructuras (en `src/utils/temasMensuales.ts`):

```ts
import type { ComponentType } from "react";

export interface FiguraProps {
  className?: string;
}

export interface ElementoEscena {
  Figura: ComponentType<FiguraProps>;
  x: number; // posición horizontal en % del ancho de la barra (0–100)
  y: number; // posición vertical en px desde arriba (puede ser negativa o sobrepasar el borde para "asomar")
  tam: number; // alto de la figura en px
  rot?: number; // grados
  anim?: "flotar" | "parpadear"; // se aplica solo con motion-safe
  soloEscritorio?: boolean; // oculto por debajo de md para no saturar la barra móvil
}

export interface TemaMensual {
  nombre: string; // solo para aria-label (no visible)
  barra: string; // degradado + borde, con variantes dark: (clases literales)
  elementos: ElementoEscena[];
}

// Índice = Date#getMonth() (0 = enero … 11 = diciembre)
export const TEMAS_MENSUALES: TemaMensual[] = [
  /* 12 temas */
];
```

Animaciones en `src/index.css` (Tailwind v4):

```css
@theme {
  --animate-flotar: flotar 6s ease-in-out infinite;
  --animate-parpadear: parpadear 3s ease-in-out infinite;
  @keyframes flotar {
    0%,
    100% {
      translate: 0 0;
    }
    50% {
      translate: 0 -3px;
    }
  }
  @keyframes parpadear {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.55;
    }
  }
}
```

Uso en `EscenaTema`: `className={e.anim ? \`motion-safe:animate-${e.anim}\` : ""}`**no se puede** (clase dinámica); se resuelve con un mapa literal`{ flotar: "motion-safe:animate-flotar", parpadear: "motion-safe:animate-parpadear" }`.

## Flujo de renderizado

1. `Navbar` monta → `useMesActual()` devuelve el mes (0–11).
2. `TEMAS_MENSUALES[mes]` entrega `{ nombre, barra, elementos }`.
3. `<nav>` aplica `barra` (degradado, borde, `dark:`). `<EscenaTema>` pinta cada elemento en su posición (% / px) con su animación opcional; el contenido real (`z-10`) se dibuja encima con su velo semitransparente.
4. Cambiar claro/oscuro solo cambia clases (`transition-colors duration-500`); al volver a la pestaña en otro mes, `visibilitychange` actualiza el estado y la escena se reemplaza.

## Plan de implementación

1. _(v1, hecho)_ `src/utils/temasMensuales.ts` con diccionario base de 12 meses.
2. _(v1, hecho)_ `src/hooks/useMesActual.ts`.
3. _(v1, hecho)_ `Navbar.tsx` con color + icono + etiqueta. **Se reemplaza en el paso 8.**
4. _(v1)_ Verificación de clases generadas y contraste.
5. _(v1)_ Build final.
6. Crear `src/components/temas/figuras.tsx` con las figuras de octubre, noviembre y diciembre (`Calabaza`, `Fantasma`, `Murcielago`, `Luna`, `Cempasuchil`, `Calavera`, `Vela`, `Banderin`, `Pino`, `Copo`, `Esfera`, `Estrella`), y agregar las animaciones `flotar`/`parpadear` en `src/index.css`. `npm run build` debe compilar.
7. Completar `figuras.tsx` con el resto (`Corona`, `Regalo`, `Corazon`, `Globo`, `Flor`, `Mariposa`, `Nube`, `Sol`, `Ola`, `Palmera`, `Lapiz`, `Libro`). `npm run build`.
8. Crear `EscenaTema.tsx`; reescribir `temasMensuales.ts` (nueva interfaz `{ nombre, barra, elementos }`, 12 composiciones y degradados) y adaptar `Navbar.tsx` (capas, velo, `role="img"`/`aria-label`, quitar icono y etiqueta). Los tres cambian juntos porque la interfaz cambia. `npm run build` y ESLint.
9. Verificación visual con `npm run dev`: los 12 meses (cambiando temporalmente el valor inicial de `useMesActual`, revertir al terminar), claro y oscuro, ancho móvil (< 768 px), y `prefers-reduced-motion` activado. Ajustar posiciones/tamaños de las composiciones según lo que se vea.

## Criterios de aceptación

- [ ] Los 12 índices (0–11) tienen tema con degradado y 24 elementos en `elementos`; ningún mes deja la barra vacía ni lanza error.
- [ ] No se muestra ningún texto del tema en la barra (solo `aria-label` en la capa de escena); desaparece la etiqueta/icono Lucide de la v1.
- [ ] En octubre se ven calabazas, fantasmas, murciélagos y luna; en noviembre, cempasúchil, calaveras, velas y papel picado; en diciembre, pinos, copos, esferas y estrellas; en enero, coronas, estrellas y regalos.
- [ ] En modo oscuro cada tema usa su variante `dark:` (degradado oscuro, borde oscuro) y las figuras siguen distinguiéndose.
- [ ] Botón de tema claro/oscuro, chip del correo y "Salir" siguen legibles sobre la escena (velo semitransparente) y funcionan igual que antes.
- [ ] La escena no intercepta clics (`pointer-events-none`) y no genera scroll horizontal ni desborda la barra (`overflow-hidden`).
- [ ] En ancho < 768 px los elementos marcados `soloEscritorio` no se muestran y la barra sigue ordenada.
- [ ] Con `prefers-reduced-motion: reduce` ninguna figura se anima; sin esa preferencia, solo `flotar`/`parpadear` sutiles.
- [ ] El cambio de tema claro/oscuro anima el color del degradado sin parpadeo (`transition-colors`).
- [ ] Todas las clases (degradados, `fill-*`, `dark:`) llegan al CSS de producción (se ven los 12 temas en el build, no solo el del mes actual).
- [ ] Ningún cambio en `RuterMapas.tsx`, `utils/theme.ts` ni en las props de `Navbar`; no se agrega ninguna dependencia en `package.json`.
- [ ] `npm run build` pasa sin errores de TypeScript.

## Decisiones tomadas

- **Sí (v2):** ilustraciones SVG inline dibujadas como componentes React, en vez de fotos o emojis: livianas, nítidas en cualquier tamaño, adaptables a claro/oscuro con clases `fill-*` y sin dependencias. No hay forma de obtener fotografías desde aquí, y los emojis cambian de aspecto por sistema operativo.
- **Sí (v2):** escena decorativa sobre degradado (decisión del usuario), con velo semitransparente en los grupos de botones para conservar legibilidad.
- **Sí (v2):** posiciones en % horizontales y px verticales, en vez de un solo SVG panorámico: la escena escala con cualquier ancho sin recortar elementos en pantallas estrechas.
- **Sí (v2, tras verlo en pantalla):** composiciones generadas con `patron()` en vez de listas de posiciones escritas a mano. La primera versión (10 elementos sueltos, 22–46 px) se veía dispersa y pálida; el patrón denso de 24 elementos, figuras más grandes y degradados `-200` se acerca a un "papel tapiz" temático. En móvil solo se ven 2 elementos (los que caen en la zona libre entre el menú y los controles).
- **Sí (v2):** sin texto visible (decisión del usuario); solo `aria-label` oculto para lectores de pantalla.
- **Sí (v2):** animaciones sutiles con `motion-safe:` (decisión del usuario); solo `translate` y `opacity`, que no provocan reflow.
- **Sí:** los 12 meses tematizados (decisión del usuario). Los 8 temas fuera de oct–ene son propuesta de este spec y se pueden cambiar en el diccionario.
- **Sí:** tema por **mes completo**, sin fechas exactas; diccionario como arreglo de 12 posiciones indexado por `getMonth()`.
- **Sí:** clases Tailwind completas y literales (Tailwind v4 solo genera lo que ve escrito), incluido el mapa de animaciones.
- **Sí:** `visibilitychange` para refrescar el mes en sesiones largas; sin `setInterval`.
- **No:** fotos/archivos binarios, override `?tema=N`, selector manual, persistencia, animaciones marcadas.
- **Nota:** el pedido original hablaba de `spec.md` en la raíz y de "futuro modo oscuro"; se guardó en `specs/11-…` siguiendo la convención del repo y el modo oscuro ya existe, por lo que las variantes `dark:` se incluyen desde ahora.

## Identified risks

- **Calidad del dibujo:** las figuras son SVG hechos a mano en código; la calidad visual solo se juzga en pantalla. Por eso el paso 9 incluye ajustar posiciones y tamaños, y es posible que haya que iterar figuras concretas tras verlas.
- **Legibilidad sobre la escena:** botones y correo viven sobre ilustraciones; el velo semitransparente (`backdrop-blur`) lo mitiga, pero hay que revisar contraste en los 12 temas, claro y oscuro.
- **Peso y rendimiento:** ~22 figuras inline y hasta ~10 elementos por mes son pocos nodos SVG; las animaciones usan solo `translate`/`opacity`. Riesgo bajo.
- **`backdrop-blur` en equipos lentos:** puede costar rendimiento en máquinas muy antiguas; si se nota, se cambia por un velo sin blur.
- **Reloj del equipo:** el mes sale de la hora local del PC; un reloj mal configurado muestra el tema equivocado (sin consecuencias funcionales).
