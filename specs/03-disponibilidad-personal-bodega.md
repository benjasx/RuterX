# 03 — Disponibilidad de Personal en Bodega (Distribución Diaria)

**Estado:** aprobado
**Depende de:** Ninguno
**Fecha:** 2026-09-19

**Objetivo:** Agregar en `PanelDistribucion.tsx` un botón que muestre, para la fecha de salida seleccionada, el personal disponible en bodega y el personal ausente (vacaciones, incapacidad, permiso, etc.), ambas tablas ordenadas por puesto y exportables juntas a PDF y Excel.

## Contexto

`PanelDistribucion.tsx` ya calcula, para la `fechaSeleccionada`, tres piezas de información que hoy solo se usan para deshabilitar opciones en los `<select>` de la tabla:

- `choferesUsados` / `auxiliaresUsados` (`PanelDistribucion.tsx:237-254`): nombres ya asignados en alguna fila con ruta/unidad/chofer.
- `estadoPorNombre` (`PanelDistribucion.tsx:190-202`): empleados con `estadoEfectivo` distinto de `"Disponible"` ese día (vacaciones, incapacidad, permiso, descanso, falta, inactivo), vía `estadoEfectivo` de `vacacionesUtils.ts`.
- `listaChoferes` / `listaAuxiliares` (`PanelDistribucion.tsx:204-224`): nombres de `choferesData` clasificados como Chofer o Auxiliar según el campo `rol`/`puesto`/`tipo` del documento.

No existía ninguna vista que mostrara el complemento de `choferesUsados`/`auxiliaresUsados` (quién queda en bodega) ni el detalle legible de `estadoPorNombre` (quién está ausente y por qué motivo). Este spec cubre ambas cosas en la misma vista: quién sigue de alta, disponible y sin asignar (bodega), y quién no está disponible ese día y por qué (ausente).

## Alcance

**Dentro:**

- Botón nuevo "Personal en Bodega" en la barra de acciones de `PanelDistribucion.tsx`, visible para `admin`, `embarques` y `jefeReparto` (nuevo permiso `puedeVerPersonalBodega`, más amplio que el `tienePermisosEspeciales` actual que solo cubre admin/embarques).
- Al hacer clic, un modal con el mismo patrón de overlay que el modal "Vista para WhatsApp" ya existente (`mostrarCaptura`), pero **sin** el logo CIR en el encabezado (es una vista interna de planeación, no un documento para compartir).
- **Tabla 1 — Personal Disponible en Bodega:** una sola lista (no columnas separadas por puesto) con **Nombre**, **Puesto** (Chofer/Auxiliar) y **Teléfono**, ordenada **por puesto** (todos los Choferes primero, luego los Auxiliares) y alfabéticamente por nombre dentro de cada grupo.
  - Un empleado de `choferesData` aparece aquí si cumple las dos condiciones a la vez:
    1. Su nombre no está en `choferesUsados` ni en `auxiliaresUsados`.
    2. Su nombre no está en `estadoPorNombre` (su `estadoEfectivo` ese día es `"Disponible"`).
  - Si la lista resulta vacía, se muestra el mensaje "Todo el personal está asignado o no disponible" en vez de una tabla vacía.
- **Tabla 2 — Personal Ausente:** tabla secundaria debajo de la anterior, dentro del mismo modal, con **Nombre**, **Puesto**, **Motivo** (el valor textual de `estadoPorNombre`, ej. "Vacaciones", "Incapacidad", "Permiso con goce") y **Teléfono**; mismo criterio de orden (por puesto y luego alfabético). Incluye a cualquier empleado con una ausencia vigente ese día, sin importar si además estaba asignado a una ruta. Si no hay nadie ausente, se muestra "No hay ausencias registradas para este día".
- Clasificación de Puesto (en ambas tablas): mismo criterio que ya usa `listaChoferes`/`listaAuxiliares` (si `rol`/`puesto`/`tipo` incluye "ayudante" o "auxiliar" → "Auxiliar"; si no → "Chofer").
- Ambas tablas se muestran **totalmente extendidas**, sin scroll interno ni límite de alto (si la lista es larga, el scroll lo maneja el overlay del modal completo, no cada tabla por separado).
- Subtítulo de fecha en el modal: "Para el día {fecha extendida}" (ej. "Para el día lunes, 21 de septiembre de 2026"), usando `formatearFechaLarga`.
- Debajo del título y el subtítulo de fecha, un **resumen en dos recuadros tipo header**, uno junto al otro: "Personal Disponible" (verde, con el conteo de la Tabla 1) y "Personal Ausente" (naranja, con el conteo de la Tabla 2). El mismo resumen se replica en el PDF, justo antes de las tablas.
- Dentro del modal, dos botones de exportación —"Excel" y "PDF"— visibles si hay al menos una persona en cualquiera de las dos tablas, exportando **ambas** tablas juntas:
  - **Excel** (`exportarPersonalBodegaExcel`, patrón `exportarResumenExcel`/SheetJS): un solo archivo `.xlsx` con dos hojas, "Personal Bodega" y "Personal Ausente".
  - **PDF** (`exportarPersonalBodegaPDF` en `reportesDistribucionUtils.ts`, patrón `exportarDistribucionPDF`): un solo PDF portrait con encabezado tipo membrete (logo + título único "PERSONAL DISPONIBLE EN BODEGA", sin la línea "RUTERX - REPORTE LOGÍSTICO"), subtítulo "Para el día {fecha extendida}", el resumen de dos recuadros, la tabla de disponibles y, debajo, una sección "PERSONAL AUSENTE" con su propia tabla.
  - El PDF incluye pie de página en todas las páginas (patrón ya usado en `pdfDashboardService.ts`): "RuterX · Reporte confidencial de uso interno" a la izquierda y "Página X de Y" a la derecha.
- Nombres de archivo: `PERSONAL_BODEGA_${fechaSeleccionada}.xlsx` y `PERSONAL_BODEGA_${fechaSeleccionada}.pdf`.

**Fuera:**

- No se persiste esta información en Firestore ni se crea ninguna colección o servicio nuevo; todo es un cálculo derivado en memoria de datos ya cargados (`choferesData`, `vacacionesData`, `filas`).
- No incluye unidades/vehículos disponibles, solo personal (choferes y auxiliares).
- No modifica `filas`, la tabla principal, ni la lógica de `disabled` de los `<select>` existentes.
- No cambia el permiso `tienePermisosEspeciales` actual (que sigue gobernando "Vincular XLSX", "Generar Resumen" y "Eliminar fila"); el nuevo permiso `puedeVerPersonalBodega` es exclusivo del botón e infraestructura de este spec.
- No agrega el rol `jefeReparto` a ningún otro botón existente del panel.
- La tabla de "Personal Ausente" no permite editar el estado de nadie ni navega a "Vacaciones/Incapacidad"; es solo lectura, informativa.

## Datos

Este spec no introduce colecciones ni campos nuevos en Firestore. Introduce dos estructuras derivadas, en memoria, calculadas dentro de `PanelDistribucion.tsx`:

```ts
// personalDisponibleBodega: derivado de choferesData + choferesUsados + auxiliaresUsados + estadoPorNombre
type PersonaBodega = {
  nombre: string; // ya en mayúsculas, igual que choferesUsados/listaChoferes
  puesto: "Chofer" | "Auxiliar";
  telefono: string; // c.telefono || ""
};

// personalAusente: derivado de choferesData + estadoPorNombre (independiente de choferesUsados/auxiliaresUsados)
type PersonaAusente = PersonaBodega & {
  motivo: string; // estadoPorNombre.get(nombre), ej. "Vacaciones" | "Incapacidad" | "Permiso con goce" | ...
};
```

Ambas listas se ordenan con el mismo criterio: Choferes primero, Auxiliares después; alfabético por nombre dentro de cada grupo.

## Plan de implementación

1. En `PanelDistribucion.tsx`: importar `esJefeReparto as checkEsJefeReparto`, calcular `esJefeRepartoActual` y el permiso `puedeVerPersonalBodega = tienePermisosEspeciales || esJefeRepartoActual`.
2. En `PanelDistribucion.tsx`: agregar `useMemo` `personalDisponibleBodega` que recorra `choferesData`, excluya nombres presentes en `choferesUsados`/`auxiliaresUsados` o en `estadoPorNombre`, clasifique Puesto con el mismo criterio de `listaChoferes`/`listaAuxiliares`, y devuelva el arreglo `PersonaBodega[]` ordenado por puesto (Chofer primero) y luego por nombre.
3. En `PanelDistribucion.tsx`: agregar `useMemo` `personalAusente` que recorra `choferesData` y conserve solo a quienes tengan una entrada en `estadoPorNombre`, devolviendo `PersonaAusente[]` (incluye `motivo`) con el mismo orden por puesto.
4. En `PanelDistribucion.tsx`: agregar estado `mostrarBodega` (boolean, default `false`) y el botón "Personal en Bodega" (ícono `Users` de `lucide-react`) junto a "Vista WhatsApp", visible solo si `puedeVerPersonalBodega`.
5. En `PanelDistribucion.tsx`: agregar el modal de "Personal en Bodega" (overlay tipo `mostrarCaptura`, sin logo), con el título, el subtítulo "Para el día {fecha extendida}", el resumen de dos recuadros (conteo de disponibles/ausentes), la Tabla 1 (disponibles) totalmente extendida, y la Tabla 2 ("Personal Ausente", con columna Motivo) también extendida debajo, cada una con su mensaje de lista vacía.
6. En `PanelDistribucion.tsx`: agregar función `exportarPersonalBodegaExcel` (patrón `exportarResumenExcel`: `XLSX.utils.json_to_sheet` + `XLSX.writeFile`) que arme dos hojas ("Personal Bodega" y "Personal Ausente") en un mismo workbook, y su botón dentro del modal (habilitado si hay datos en cualquiera de las dos listas).
7. En `src/utils/reportesDistribucionUtils.ts`: crear y exportar `exportarPersonalBodegaPDF(personal: PersonaBodega[], ausentes: PersonaAusente[], fechaSeleccionada: string)`, con encabezado tipo membrete (logo + título único "PERSONAL DISPONIBLE EN BODEGA"), subtítulo "Para el día {fecha extendida}" (helper local `formatearFechaLargaBodega`, misma fórmula que `formatearFechaLarga`), el resumen de dos recuadros, la tabla de disponibles, una segunda sección "PERSONAL AUSENTE" con su tabla, y pie de página ("RuterX · Reporte confidencial de uso interno" + "Página X de Y", patrón de `pdfDashboardService.ts`); importarla y llamarla desde el botón "PDF" del modal en `PanelDistribucion.tsx`.
8. Verificar con `npm run build` que no hay errores de tipos.
9. Prueba manual: con datos reales o de prueba, asignar algunas rutas para una fecha y marcar a alguien de vacaciones/incapacidad/permiso ese día; confirmar que "Personal Disponible en Bodega" excluye correctamente a los asignados y a los ausentes, que "Personal Ausente" muestra exactamente a quienes tienen una ausencia vigente ese día con su motivo correcto (ambas ordenadas por puesto), y que los recuadros de resumen muestran los conteos correctos.
10. Prueba manual: confirmar que el botón es visible para `admin`, `embarques` y `jefeReparto`, y que un usuario chofer normal no lo ve.
11. Prueba manual: exportar Excel (dos hojas) y PDF (resumen, dos secciones y pie de página) desde el modal y confirmar que el contenido de cada uno coincide exactamente con las dos tablas mostradas.

Cada paso deja la app compilando y funcional.

## Criterios de aceptación

- [ ] El botón "Personal en Bodega" es visible en `PanelDistribucion` para `admin`, `embarques` y `jefeReparto`.
- [ ] Un chofer sin rol especial no ve el botón "Personal en Bodega".
- [ ] La Tabla 1 (disponibles) muestra únicamente empleados que no están en `choferesUsados` ni en `auxiliaresUsados`, y que no están en `estadoPorNombre`, para la fecha seleccionada.
- [ ] La Tabla 1 y la Tabla 2 están ordenadas por puesto (todos los Choferes antes que todos los Auxiliares) y alfabéticamente por nombre dentro de cada grupo.
- [ ] La Tabla 2 (ausentes) muestra a todo empleado con `estadoEfectivo` distinto de "Disponible" ese día (vacaciones, incapacidad, permiso, descanso, falta, inactivo), junto con el motivo correcto, sin importar si también estaba asignado a una ruta.
- [ ] La columna "Puesto" clasifica correctamente Chofer vs. Auxiliar usando el mismo criterio que `listaChoferes`/`listaAuxiliares`, en ambas tablas.
- [ ] La columna "Teléfono" muestra el valor de `telefono` del documento de `choferesData`, o "-" si no existe, en ambas tablas.
- [ ] Si no queda nadie disponible, se muestra "Todo el personal está asignado o no disponible" en la Tabla 1.
- [ ] Si no hay nadie ausente, se muestra "No hay ausencias registradas para este día" en la Tabla 2.
- [ ] Ninguna de las dos tablas tiene scroll interno propio: ambas se muestran totalmente extendidas dentro del modal.
- [ ] El subtítulo del modal y del PDF muestra "Para el día" seguido de la fecha extendida (ej. "lunes, 21 de septiembre de 2026").
- [ ] El modal muestra dos recuadros de resumen ("Personal Disponible" y "Personal Ausente") con el conteo exacto de cada tabla, y se actualizan al cambiar la fecha.
- [ ] Cambiar la `fechaSeleccionada` recalcula ambas listas (y sus conteos en los recuadros de resumen) sin recargar la página.
- [ ] El botón "Excel" descarga `PERSONAL_BODEGA_<fecha>.xlsx` con dos hojas ("Personal Bodega" y "Personal Ausente") que coinciden con las tablas mostradas.
- [ ] El botón "PDF" descarga `PERSONAL_BODEGA_<fecha>.pdf` con el encabezado tipo membrete, el subtítulo de fecha, los recuadros de resumen con los mismos conteos que el modal, la tabla de disponibles, la sección "PERSONAL AUSENTE" y el pie de página ("RuterX · Reporte confidencial de uso interno" + número de página) en todas las páginas.
- [ ] Los botones "Excel"/"PDF" están visibles si hay datos en cualquiera de las dos tablas (no solo en la de disponibles).
- [ ] `npm run build` pasa sin errores de tipo.

## Decisiones tomadas

- **Cálculo 100% derivado en memoria, sin Firestore nuevo:** toda la información (choferes, ausencias, asignaciones del día) ya está cargada en `PanelDistribucion.tsx` vía TanStack Query; no hay razón para duplicarla en una colección nueva.
- **Una sola tabla por grupo, ordenada por puesto (no alfabético puro ni columnas separadas):** pedido explícito del usuario — Choferes y Auxiliares se distinguen agrupándolos, sin partir la vista en dos columnas paralelas.
- **Incluir columna Teléfono en ambas tablas:** el propósito del reporte es poder contactar/organizar tanto a quien se queda en bodega como a quien está ausente.
- **Permiso `puedeVerPersonalBodega` propio, en vez de ampliar `tienePermisosEspeciales`:** evita darle a `jefeReparto` acceso a "Vincular XLSX", "Generar Resumen" o "Eliminar fila", que no pidió el usuario y que hoy son exclusivos de admin/embarques.
- **Modal sin logo CIR, a diferencia del modal "Vista para WhatsApp":** es una vista interna de planeación, no un documento pensado para compartir con clientes o choferes.
- **Subtítulo "Para el día {fecha extendida}" en vez de "FECHA PROGRAMADA DE SALIDA":** pedido explícito del usuario, para diferenciar esta vista del lenguaje ya usado en el reporte de rutas.
- **Encabezado del PDF tipo membrete (logo + un solo título), sin la línea "RUTERX - REPORTE LOGÍSTICO":** pedido explícito del usuario; se simplifica respecto al patrón de `exportarDistribucionPDF`.
- **PDF en orientación portrait, no landscape:** las tablas son de pocas columnas (3 y 4), a diferencia de la tabla de rutas que sí necesita landscape.
- **"Personal Ausente" como tabla secundaria en la misma vista, no como modal aparte:** el usuario pidió verlo "en la misma vista".
- **"Personal Ausente" es independiente de `choferesUsados`/`auxiliaresUsados`:** un empleado ausente aparece ahí sin importar si quedó (indebidamente) asignado a una ruta; el filtro de asignación solo aplica a la tabla de disponibles.
- **Excel con dos hojas en un mismo archivo, PDF con dos secciones en un mismo documento:** más simple de compartir que archivos separados para disponibles y ausentes.
- **Tablas totalmente extendidas, sin scroll interno:** primera versión usaba un contenedor con `max-h-72 overflow-y-auto` por tabla; el usuario pidió quitarlo para ver toda la lista de una vez, dejando que el overlay del modal maneje el scroll de la página completa si hace falta.
- **Resumen de conteos en dos recuadros (header), replicado en el PDF:** el usuario quería ver de un vistazo cuánta gente queda disponible vs. ausente, sin tener que contar filas; se mantiene igual en pantalla y en el PDF para que el reporte impreso tenga la misma información.
- **Pie de página con el nombre de la app en el PDF:** reutiliza el patrón ya existente en `pdfDashboardService.ts` ("RuterX · Reporte confidencial de uso interno" + número de página) en vez de inventar uno nuevo.
- **Sin columna de unidades disponibles:** el usuario pidió específicamente personal (choferes y auxiliares), no vehículos; queda fuera de este spec.

## Riesgos identificados

| Riesgo                                                                                                                    | Mitigación                                                                                                              |
| ------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Un empleado sin `rol`/`puesto`/`tipo` definido en Firestore se clasifica como "Chofer" por defecto.                       | Mismo comportamiento que ya tiene hoy `listaChoferes`/`listaAuxiliares`; no es un caso nuevo introducido por este spec. |
| Un empleado sin `telefono` capturado en su documento de `choferesService` muestra "-" en la tabla/exportación.            | Se acepta como limitación conocida; el dato se corrige actualizando el directorio de choferes, fuera de este spec.      |
| El texto de "Motivo" en la Tabla 2 depende literalmente del valor que devuelve `estadoEfectivo` (ej. "Permiso con goce"). | Es el mismo texto que ya se usa en el resto de la app (`vacacionesUtils.ts`); no se traduce ni se reformatea aparte.     |
