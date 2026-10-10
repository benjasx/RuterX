# 10 — Atajos de teclado en Distribución Diaria

**Estado:** Aprobado
**Depende de:** Ninguno
**Fecha:** 2026-10-10

**Objetivo:** La tabla de Distribución Diaria (`PanelDistribucion.tsx`) se puede operar con el teclado: atajos globales para las acciones de la barra superior, navegación entre celdas con Alt+flechas, atajos para imprimir los documentos de la fila enfocada y un panel de ayuda que lista todos los atajos.

## Contexto

Hoy toda la operación de `PanelDistribucion.tsx` es con mouse: añadir ruta, guardar, abrir paneles, exportar y las acciones por fila (imprimir paquete, hoja de ruta, mesanine, bitácora). La tabla principal tiene 5 `<select>` por fila (Ruta, Unidad, Chofer, Auxiliar 1, Auxiliar 2) y 2 `<input>` (Emb. Crédito, Emb. Contado). Los `<select>` nativos usan ↑/↓ para cambiar su valor, por eso la navegación entre celdas usa Alt+flechas y no flechas simples. El componente no tiene hoy ningún listener de teclado.

Cada atajo ejecuta exactamente la misma función que su botón y **respeta la misma visibilidad/permisos del botón** (p. ej. Alt+R solo existe si el botón "Generar Resumen" se muestra, es decir `tienePermisosEspeciales`). No se introducen permisos nuevos.

## Alcance

**Dentro:**

- **`src/hooks/useAtajosDistribucion.ts`** (nuevo): hook que registra un único `keydown` en `window` (se limpia al desmontar) y despacha según el mapa de teclas; recibe un objeto de handlers para que `PanelDistribucion.tsx` conserve la lógica.
- **`src/components/PanelDistribucion.tsx`**:
  - Conecta los handlers existentes al hook (`handleGuardar`, `agregarFila`, `setMostrarResumen`, `setMostrarBodega`, `setMostrarCaptura`, `exportarExcel`, `exportarDistribucionPDF`, funciones de `exportar*PDF` por fila).
  - Ref al `<input type="file">` oculto de "Vincular XLSX" para disparar su `click()` desde Alt+X.
  - Cada celda enfocable de la tabla principal lleva `data-fila` y `data-col` para localizar la celda destino en la navegación.
  - Botón "?" de ayuda junto a la barra de botones y modal con la tabla de atajos.
  - `title` de cada botón afectado con su atajo entre paréntesis (p. ej. "Guardar todo (Ctrl+S)").
- **Mapa de teclas:**

  | Tecla             | Acción                                                                | Condición                 |
  | ----------------- | --------------------------------------------------------------------- | ------------------------- |
  | `Ctrl+S`          | Guardar todo                                                          | no `guardando`            |
  | `Alt+N`           | Añadir ruta                                                           | siempre                   |
  | `Alt+X`           | Vincular XLSX                                                         | `tienePermisosEspeciales` |
  | `Alt+R`           | Generar/Ocultar Resumen                                               | `tienePermisosEspeciales` |
  | `Alt+B`           | Personal en Bodega                                                    | `puedeVerPersonalBodega`  |
  | `Alt+W`           | Vista WhatsApp                                                        | siempre                   |
  | `Alt+E`           | EXCEL Gral                                                            | siempre                   |
  | `Alt+P`           | PDF Gral                                                              | siempre                   |
  | `Alt+1`           | Paquete completo de la fila enfocada                                  | fila enfocada             |
  | `Alt+2`           | Hoja de ruta de la fila enfocada                                      | fila enfocada             |
  | `Alt+3`           | Hoja de mesanine de la fila enfocada                                  | fila enfocada             |
  | `Alt+4`           | Bitácora de la fila enfocada                                          | fila enfocada             |
  | `Alt+←` / `Alt+→` | Celda anterior / siguiente de la misma fila                           | foco dentro de la tabla   |
  | `Alt+↑` / `Alt+↓` | Misma columna, fila anterior / siguiente                              | foco dentro de la tabla   |
  | `Enter`           | En Emb. Crédito/Contado: pasa a la misma columna de la fila siguiente | foco en esos inputs       |
  | `F1` o `Alt+?`    | Abrir/cerrar panel de ayuda                                           | siempre                   |
  | `Esc`             | Cierra el modal abierto (ayuda, resumen/captura/bodega)               | modal abierto             |

- **Fila enfocada:** la fila (`<tr>`) que contiene `document.activeElement`. Si el foco no está dentro de la tabla principal, los atajos Alt+1–4 no hacen nada y muestran `notificarAdvertencia("Coloca el cursor en una fila de la tabla.")`.
- Los atajos con `Alt`/`Ctrl` se disparan aunque el foco esté en un `<input>`/`<select>` y llaman `preventDefault()` para bloquear el comportamiento del navegador (Ctrl+S guardar página, Alt+←/→ atrás/adelante). No se interceptan teclas sin modificador, salvo `Enter` en los inputs de embarque, `F1` y `Esc`.
- Con un modal abierto (WhatsApp, Bodega, ayuda), solo funcionan `Esc` y `F1`; el resto de atajos se ignoran.

**Fuera de alcance (para otro spec si hace falta):**

- **Atajo de eliminar fila:** decisión explícita del usuario, se mantiene solo con el botón (evita borrados accidentales).
- Atajos en otras vistas (Asistencia, Clientes, Rutero, etc.).
- Atajos configurables/personalizables por usuario o persistidos.
- Resaltado visual de la fila activa (más allá del foco nativo del navegador).
- Navegación dentro de las tablas de modales (Resumen, WhatsApp, Bodega).

## Datos

Esta funcionalidad no introduce datos nuevos: sin colecciones de Firestore ni `localStorage`. Solo estado de UI local (`mostrarAyuda: boolean`) y un `ref`.

```ts
// src/hooks/useAtajosDistribucion.ts
interface HandlersAtajos {
  guardar?: () => void;
  agregarFila?: () => void;
  vincularXLSX?: () => void;
  alternarResumen?: () => void;
  abrirBodega?: () => void;
  abrirWhatsApp?: () => void;
  exportarExcel?: () => void;
  exportarPDF?: () => void;
  imprimirFila?: (accion: "paquete" | "ruta" | "mesanine" | "bitacora", index: number) => void;
  alternarAyuda?: () => void;
  cerrarModal?: () => void;
}
// un handler undefined = el atajo no está disponible para ese rol
export const useAtajosDistribucion = (handlers: HandlersAtajos, modalAbierto: boolean) => void;
```

## Plan de implementación

1. Crear `src/hooks/useAtajosDistribucion.ts` con el `keydown` global, el mapa de teclas de "Alcance" (sin navegación aún) y la regla "con modal abierto solo Esc/F1". Handlers `undefined` se ignoran.
2. En `PanelDistribucion.tsx`, llamar al hook pasando los handlers existentes, condicionando por `tienePermisosEspeciales` y `puedeVerPersonalBodega` (mismas condiciones que los botones) y agregando el `ref` al input de "Vincular XLSX". `npm run build`: debe compilar.
3. Agregar `data-fila`/`data-col` a los selects e inputs de la tabla y resolver la fila enfocada (`closest("tr")` → índice) para Alt+1–4 con el aviso cuando no hay foco en la tabla.
4. Implementar navegación Alt+flechas y `Enter` en Emb. Crédito/Contado (mover foco con `.focus()` a la celda destino; en los bordes no hace nada).
5. Agregar el botón "?" y el modal de ayuda con la tabla de atajos (solo lista los disponibles para el rol actual), y los hints en `title` de cada botón.
6. `npm run build` y verificación manual en el navegador con rol admin y con un rol sin `tienePermisosEspeciales`.

## Criterios de aceptación

- [ ] `Ctrl+S` guarda la distribución (misma función que "GUARDAR TODO") sin abrir el diálogo "Guardar página" del navegador, incluso con el foco en un input; no hace nada si `guardando` es `true`.
- [ ] `Alt+N` añade una fila nueva al inicio, igual que "Añadir Ruta".
- [ ] `Alt+R`, `Alt+X`, `Alt+B` funcionan solo si el botón correspondiente es visible para el rol actual; con otro rol no hacen nada.
- [ ] `Alt+W`, `Alt+E`, `Alt+P` abren Vista WhatsApp, descargan el Excel Gral y el PDF Gral respectivamente.
- [ ] Con el foco en cualquier celda de una fila, `Alt+1/2/3/4` generan el PDF de paquete, hoja de ruta, mesanine y bitácora de **esa** fila.
- [ ] Con el foco fuera de la tabla, `Alt+1–4` no generan PDF y muestran la advertencia.
- [ ] `Alt+←/→` mueve el foco a la celda anterior/siguiente de la misma fila; `Alt+↑/↓` a la misma columna en la fila anterior/siguiente; en los bordes no hace nada y no navega el historial del navegador.
- [ ] `Enter` en Emb. Crédito/Contado mueve el foco a la misma columna de la fila siguiente.
- [ ] `F1` y `Alt+?` abren el modal de ayuda con la lista de atajos disponibles para el rol; `Esc` lo cierra, y también cierra los modales de WhatsApp, Bodega y Resumen.
- [ ] Con un modal abierto, `Alt+N`, `Ctrl+S`, etc. no ejecutan nada.
- [ ] No existe ningún atajo que elimine filas.
- [ ] Cada botón con atajo muestra la combinación en su `title`.
- [ ] Al desmontar `PanelDistribucion` (cambiar de sub-vista) los atajos dejan de responder.
- [ ] `npm run build` pasa sin errores de TypeScript.

## Decisiones tomadas

- **Sí:** Ctrl/Alt + letra en vez de teclas simples/F-keys: son mnemónicos y no chocan con teclear en inputs.
- **Sí:** Alt+flechas para navegar en vez de flechas simples, porque los `<select>` nativos usan ↑/↓ para cambiar de valor.
- **Sí:** un solo hook con `keydown` global en `window` en vez de `onKeyDown` en cada celda/botón: un solo punto de registro y limpieza, y funciona desde cualquier foco.
- **Sí:** cada atajo reutiliza el handler de su botón y su misma condición de visibilidad; no se crean permisos nuevos (el usuario pidió que los use todo el que ve la tabla, sin alterar las restricciones existentes de cada botón).
- **Sí:** la fila objetivo de Alt+1–4 es la que contiene el foco, no una fila "seleccionada" por clic: no requiere estado de selección nuevo.
- **No:** atajo de eliminar fila (decisión del usuario).
- **No:** atajos configurables ni persistidos: el mapa queda fijo en código.
- **No:** resaltado visual de fila activa: fuera de alcance.

## Identified risks

- **Alt+←/→ es "atrás/adelante" del navegador y Alt+letra puede abrir menús** (Alt+E/F en Chrome/Edge abren el menú del navegador): se mitiga con `preventDefault()`, pero no es 100% garantizable según navegador; verificar en Chrome y Edge. Si alguna combinación no es interceptable, se cambia la tecla en este spec.
- **Atajos en un `<select>` abierto:** con la lista desplegada, el navegador puede consumir la tecla antes de que llegue al `window`; verificar manualmente Alt+flechas con el select abierto y cerrado.
- **Disparo accidental de guardado:** Ctrl+S escribe en Firestore; es la misma acción que el botón y ya existe el estado `guardando` como protección contra doble disparo.
