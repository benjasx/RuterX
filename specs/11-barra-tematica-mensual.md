# 11 — Barra superior temática por mes

**Estado:** Aprobado
**Depende de:** Ninguno
**Fecha:** 2026-10-10

**Objetivo:** La barra superior del panel (`Navbar.tsx`) cambia automáticamente de color, borde e icono con etiqueta según el mes actual del sistema (p. ej. octubre = Halloween), con transición suave y variantes `dark:` desde el primer día.

## Contexto

- El componente real es `src/components/Navbar.tsx` (no existe ningún "TopBar"). Se renderiza una sola vez, en `src/RuterMapas.tsx:226`, dentro del shell del panel (admin/jefe/embarques/vendedor); los choferes ven otra vista, así que no les afecta.
- Hoy la barra es `bg-white dark:bg-slate-900` con `border-b border-slate-200 dark:border-slate-800` y `transition-all duration-300`. Izquierda: botones de menú (`Menu` en móvil, `PanelLeftClose/Open` en escritorio). Derecha: botón de tema claro/oscuro, chip con el correo y botón "Salir".
- **El modo oscuro ya existe**: `src/index.css` declara `@custom-variant dark (&:where(.dark, .dark *))` y `src/utils/theme.ts` (`alternarTema`, `modoOscuroActivo`) alterna la clase `.dark`. Por eso el spec no habla de "futuro" modo oscuro: cada tema define su variante `dark:` desde ahora.
- Tailwind v4 detecta clases escaneando el código fuente como texto: **las clases deben escribirse completas y literales** en el diccionario (nada de `` `bg-${color}-50` ``), o no se generan. Los archivos `.ts` del proyecto se escanean igual que los `.tsx`.
- Lucide (`lucide-react` 1.25.0) **no tiene un icono "Halloween"**; se usan equivalentes (`Ghost`, `Skull`, `TreePine`, `Crown`, …), todos verificados como existentes en la versión instalada.

## Alcance

**Dentro:**

- **`src/utils/temasMensuales.ts`** (nuevo): tipo `TemaMensual` y diccionario `TEMAS_MENSUALES` con **los 12 meses** (índice `0–11`, el mismo que devuelve `Date#getMonth()`), cada uno con nombre de temporada, componente de icono de `lucide-react` y clases Tailwind (fondo `-50`, borde, texto de acento, con variantes `dark:`).
- **`src/hooks/useMesActual.ts`** (nuevo): devuelve el mes activo con `new Date().getMonth()` (hora local del equipo) al montar y lo recalcula al volver a la pestaña (`visibilitychange`), para que una sesión abierta que cruza de mes se actualice sin timers.
- **`src/components/Navbar.tsx`** (modificar):
  - La `<nav>` toma `tema.barra` (fondo + borde) en lugar de `bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800`, y cambia `transition-all duration-300` por `transition-colors duration-500`.
  - Junto a los botones de menú (grupo izquierdo) aparece un bloque con el icono del tema y su etiqueta (`tema.nombre`), con `tema.acento` como color. La etiqueta se oculta en pantallas `< sm` (solo icono) para no desbordar la barra en móvil.
  - Icono con `aria-hidden`; la etiqueta tiene `title` con el nombre completo.
- Se tematizan **solo** fondo, borde y el bloque icono+etiqueta. El botón de tema claro/oscuro, el chip de correo y el botón "Salir" **no cambian** (se conserva su legibilidad y el rojo de "Salir" como acción destructiva).

**Fuera de alcance (para otro spec si hace falta):**

- Override para pruebas (`?tema=10`) o selector manual de tema por el usuario.
- Persistir el tema o la preferencia (no hay estado guardado: se deriva del reloj).
- Tematizar otras partes de la app (sidebar, paneles, login, PDFs).
- Temas por fechas exactas (Navidad solo del 1 al 25, Reyes solo el 6 de enero): el tema es **por mes completo**.
- Animaciones decorativas (nieve, confeti) o imágenes: solo color e icono.
- Cambiar cómo se alterna el modo oscuro (`utils/theme.ts`).
- Tests automáticos (el proyecto no tiene test runner).

## Datos

No hay datos nuevos en Firestore ni en `localStorage`: el tema se deriva en memoria del mes del reloj local del equipo. Estructuras nuevas (en `src/utils/temasMensuales.ts`):

```ts
import type { LucideIcon } from "lucide-react";
import {
  Crown,
  Heart,
  Flower2,
  Candy,
  Gift,
  Sun,
  TreePalm,
  BookOpen,
  Flag,
  Ghost,
  Skull,
  TreePine,
} from "lucide-react";

export interface TemaMensual {
  nombre: string; // etiqueta visible junto al icono
  Icono: LucideIcon; // componente de lucide-react
  barra: string; // fondo + borde de la <nav> (con dark:)
  acento: string; // color del bloque icono + etiqueta (con dark:)
}

// Índice = Date#getMonth() (0 = enero … 11 = diciembre).
// Las clases van completas y literales para que Tailwind v4 las detecte.
export const TEMAS_MENSUALES: TemaMensual[] = [
  {
    nombre: "Día de Reyes",
    Icono: Crown,
    barra:
      "bg-amber-50 border-amber-200 dark:bg-amber-950 dark:border-amber-900",
    acento: "text-amber-800 dark:text-amber-300",
  },
  {
    nombre: "Amor y Amistad",
    Icono: Heart,
    barra: "bg-pink-50 border-pink-200 dark:bg-pink-950 dark:border-pink-900",
    acento: "text-pink-800 dark:text-pink-300",
  },
  {
    nombre: "Primavera",
    Icono: Flower2,
    barra: "bg-lime-50 border-lime-200 dark:bg-lime-950 dark:border-lime-900",
    acento: "text-lime-800 dark:text-lime-300",
  },
  {
    nombre: "Día del Niño",
    Icono: Candy,
    barra: "bg-sky-50 border-sky-200 dark:bg-sky-950 dark:border-sky-900",
    acento: "text-sky-800 dark:text-sky-300",
  },
  {
    nombre: "Día de las Madres",
    Icono: Gift,
    barra:
      "bg-fuchsia-50 border-fuchsia-200 dark:bg-fuchsia-950 dark:border-fuchsia-900",
    acento: "text-fuchsia-800 dark:text-fuchsia-300",
  },
  {
    nombre: "Verano",
    Icono: Sun,
    barra:
      "bg-yellow-50 border-yellow-200 dark:bg-yellow-950 dark:border-yellow-900",
    acento: "text-yellow-800 dark:text-yellow-300",
  },
  {
    nombre: "Vacaciones",
    Icono: TreePalm,
    barra: "bg-cyan-50 border-cyan-200 dark:bg-cyan-950 dark:border-cyan-900",
    acento: "text-cyan-800 dark:text-cyan-300",
  },
  {
    nombre: "Regreso a Clases",
    Icono: BookOpen,
    barra:
      "bg-indigo-50 border-indigo-200 dark:bg-indigo-950 dark:border-indigo-900",
    acento: "text-indigo-800 dark:text-indigo-300",
  },
  {
    nombre: "Fiestas Patrias",
    Icono: Flag,
    barra:
      "bg-emerald-50 border-emerald-200 dark:bg-emerald-950 dark:border-emerald-900",
    acento: "text-emerald-800 dark:text-emerald-300",
  },
  {
    nombre: "Halloween",
    Icono: Ghost,
    barra:
      "bg-orange-50 border-orange-200 dark:bg-orange-950 dark:border-orange-900",
    acento: "text-orange-800 dark:text-orange-300",
  },
  {
    nombre: "Día de Muertos",
    Icono: Skull,
    barra:
      "bg-violet-50 border-violet-200 dark:bg-violet-950 dark:border-violet-900",
    acento: "text-violet-800 dark:text-violet-300",
  },
  {
    nombre: "Navidad",
    Icono: TreePine,
    barra: "bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-900",
    acento: "text-red-800 dark:text-red-300",
  },
];
```

Hook de mes (`src/hooks/useMesActual.ts`):

```ts
import { useEffect, useState } from "react";

// Mes local del equipo (0–11). Se recalcula al volver a la pestaña, por si la sesión
// estuvo abierta al cruzar de mes. setState con el mismo valor no vuelve a renderizar.
export const useMesActual = () => {
  const [mes, setMes] = useState(() => new Date().getMonth());

  useEffect(() => {
    const actualizar = () => {
      if (document.visibilityState === "visible") setMes(new Date().getMonth());
    };
    document.addEventListener("visibilitychange", actualizar);
    return () => document.removeEventListener("visibilitychange", actualizar);
  }, []);

  return mes;
};
```

Cambios en `Navbar.tsx` (solo las líneas afectadas):

```tsx
import { useMesActual } from "../hooks/useMesActual";
import { TEMAS_MENSUALES } from "../utils/temasMensuales";
// ...
const mes = useMesActual();
const { nombre, Icono, barra, acento } = TEMAS_MENSUALES[mes];

<nav
  className={`h-16 shrink-0 ${barra} border-b px-3 sm:px-6 flex justify-between items-center transition-colors duration-500`}
>
  <div className="flex items-center gap-1 sm:gap-2">
    {/* botones de menú existentes, sin cambios */}
    <span
      title={nombre}
      className={`flex items-center gap-2 pl-1 text-sm font-bold ${acento}`}
    >
      <Icono size={18} aria-hidden="true" />
      <span className="hidden sm:inline">{nombre}</span>
    </span>
  </div>
  {/* grupo derecho sin cambios */}
</nav>;
```

## Flujo de renderizado

1. `Navbar` monta → `useMesActual()` lee `new Date().getMonth()` (índice 0–11, hora local).
2. `TEMAS_MENSUALES[mes]` entrega `{ nombre, Icono, barra, acento }` (lookup O(1), sin condicionales).
3. La `<nav>` aplica `barra` y el bloque icono+etiqueta aplica `acento`; las variantes `dark:` se activan solas cuando `<html>` tiene la clase `.dark`.
4. Si el usuario cambia entre modo claro/oscuro, solo cambian las clases (`transition-colors duration-500` lo suaviza). Si vuelve a la pestaña en otro mes, `visibilitychange` actualiza el estado y la barra transiciona al nuevo tema.

## Plan de implementación

1. Crear `src/utils/temasMensuales.ts` con `TemaMensual` y los 12 temas de "Datos". `npm run build` debe compilar.
2. Crear `src/hooks/useMesActual.ts`. `npm run build` debe compilar.
3. Modificar `Navbar.tsx`: usar el hook y el tema, cambiar clases de la `<nav>` (`transition-colors duration-500`) y añadir el bloque icono+etiqueta en el grupo izquierdo. `npm run build`.
4. Verificar en el navegador (`npm run dev`) el tema del mes actual en claro y oscuro, y recorrer los 12 temas cambiando temporalmente el valor de `useState(() => new Date().getMonth())` por `0…11` (revertir al terminar).
5. `npm run build` y revisión en ancho móvil (< 640 px: solo icono, sin desbordar la barra).

## Criterios de aceptación

- [ ] Con el reloj en octubre, la barra muestra fondo naranja suave (`orange-50`), borde `orange-200` y el icono `Ghost` con la etiqueta "Halloween"; en noviembre, violeta con `Skull` y "Día de Muertos"; en diciembre, rojo con `TreePine` y "Navidad"; en enero, ámbar con `Crown` y "Día de Reyes".
- [ ] Los 12 índices (0–11) tienen tema definido: ningún mes deja la barra sin estilo ni lanza error.
- [ ] En modo oscuro cada tema usa su variante `dark:` (fondo `-950`, borde `-900`, texto `-300`) y el texto/icono es legible sobre el fondo.
- [ ] Alternar claro/oscuro y cambiar de mes anima el cambio de color (sin parpadeo) gracias a `transition-colors`.
- [ ] Las clases de todos los temas llegan al CSS de producción: `npm run build` y revisar visualmente que los 12 colores se ven (no solo los de mes actual).
- [ ] El botón de tema claro/oscuro, el chip del correo y el botón "Salir" se ven y funcionan igual que antes.
- [ ] En ancho < 640 px se muestra solo el icono y la barra no desborda ni genera scroll horizontal.
- [ ] Al volver a la pestaña tras cruzar de mes (simulable cambiando la fecha del sistema y alternando de pestaña), el tema se actualiza sin recargar.
- [ ] Ningún cambio en `RuterMapas.tsx`, `utils/theme.ts` ni en las props de `Navbar`.
- [ ] `npm run build` pasa sin errores de TypeScript.

## Decisiones tomadas

- **Sí:** los 12 meses tematizados (decisión del usuario, no solo oct–ene). Los 8 temas extra (Amor y Amistad, Primavera, Día del Niño, Día de las Madres, Verano, Vacaciones, Regreso a Clases, Fiestas Patrias) son propuesta de este spec y se pueden cambiar en el diccionario sin tocar el componente.
- **Sí:** tema por **mes completo**, sin fechas exactas: es lo que se pidió (índice del mes) y evita lógica de calendario.
- **Sí:** el diccionario es un arreglo de 12 posiciones indexado por `getMonth()` en vez de un `switch`: lookup directo y cada tema queda en una sola línea editable.
- **Sí:** clases Tailwind completas y literales en el diccionario (Tailwind v4 solo genera lo que ve escrito).
- **Sí:** se tematizan fondo, borde e icono+etiqueta; el chip de correo y "Salir" quedan fijos (decisión del usuario: la primera opción de alcance). "Salir" conserva su rojo de acción destructiva incluso en diciembre.
- **Sí:** `visibilitychange` para refrescar el mes en sesiones largas; sin `setInterval`.
- **Sí:** `transition-colors duration-500` reemplaza a `transition-all duration-300` en la `<nav>`: solo cambian colores, así que no se necesita transicionar todas las propiedades.
- **Sí:** `Ghost` representa Halloween y `Skull` Día de Muertos porque Lucide no tiene iconos temáticos con ese nombre.
- **No:** override `?tema=N` ni selector manual (el usuario eligió la opción sin override).
- **No:** persistir o configurar el tema desde la UI.
- **Nota:** el pedido original hablaba de `spec.md` en la raíz y de "futuro modo oscuro"; se guardó en `specs/11-…` siguiendo la convención del repo y el modo oscuro ya existe, por lo que las variantes `dark:` se incluyen desde ahora.

## Identified risks

- **Contraste en modo claro con tonos amarillos/lima:** `text-yellow-800` y `text-lime-800` sobre `-50` deben cumplir contraste suficiente; verificar visualmente en Verano y Primavera y, si falla, subir a `-900`.
- **Dos "rojos" en diciembre:** el fondo `red-50` y el botón "Salir" (rosa/rojo) conviven en la misma barra; si se confunde, cambiar Navidad a un verde (`green`) en el diccionario.
- **Reloj del equipo:** el mes sale de la hora local del PC; un reloj mal configurado muestra el tema equivocado (sin consecuencias funcionales).
- **Compatibilidad con el escaneo de Tailwind:** si en el futuro se mueven las clases a un archivo fuera de `src/` o se construyen dinámicamente, dejarán de generarse.
