# 09 — Equidad de Choferes: puntaje combinado por viajes e ingreso

**Estado:** Aprobado
**Depende de:** Ninguno
**Fecha:** 2026-09-26

**Objetivo:** El panel "Control de Equidad" (`PanelHistorial.tsx`) recomienda al siguiente chofer/auxiliar en turno usando un puntaje combinado (60% posición por menos viajes, 40% posición por menor ingreso en viáticos+comisiones) en vez de solo el total de viajes, calculado por separado en cada pestaña (Choferes / Auxiliares).

## Contexto

Hoy `PanelHistorial.tsx` ordena a cada persona (pestaña "Choferes" y pestaña "Auxiliares", por separado) solo por `totalViajes` ascendente, y marca como "Siguiente en turno" a quien tiene menos viajes en el rango de fechas seleccionado. El usuario quiere que esa recomendación también tome en cuenta cuánto ha percibido cada persona (viáticos + comisiones), sin dejar de considerar los viajes.

El cálculo de viático (reparto del "bolsón" chofer+auxiliares, caso especial de la ruta Suc.Vallarta sin reparto) y de comisión (caso especial de las rutas TLMK/TLMK 2) ya existe y se usa hoy para los PDFs de nómina, en `calcularViaticosViaje` (función interna, no exportada) y en lógica de comisión duplicada tres veces dentro de `src/utils/pdfNominaService.ts`. Este spec reutiliza esa misma lógica (exportándola y extrayendo la parte de comisión a una función propia) en vez de reimplementar el cálculo de ingreso en el panel de equidad.

## Alcance

**Dentro:**

- **`src/utils/pdfNominaService.ts`**: exportar `calcularViaticosViaje` (hoy es un `const` interno sin `export`). Agregar y exportar `calcularComisionViaje(v, rol: "CHOFER" | "AUXILIAR")`, que centraliza la regla especial de TLMK/TLMK 2 (comisión de chofer con piso de `monto × 0.001` si no hay `comisionChofer` capturada; comisión de auxiliar en 0). Refactorizar `generarPDFNominaChoferes`, `generarPDFNominaAyudantes` y `generarPDFResumenGeneral` para llamar a `calcularComisionViaje` en vez de repetir la lógica inline — mismos montos, sin duplicación.
- **`src/components/PanelHistorial.tsx`**:
  - En el `useMemo` que arma `statsCMap`/`statsAMap`, acumular además `totalViaticos` y `totalComisiones` por persona (usando `calcularViaticosViaje`/`calcularComisionViaje` sobre cada `fila`), tanto para el rol chofer como para auxiliar1/auxiliar2 (mismo criterio de deduplicación que ya existe entre `statsCMap`/`statsAMap` vía `setChoferesHistoricos`).
  - Calcular, dentro de cada pestaña por separado, `ingresoTotal = totalViaticos + totalComisiones`, la posición de cada persona por viajes (`posicionViajes`) y por ingreso (`posicionIngreso`) — ambas ascendentes (menos viajes/menor ingreso = mejor posición), con **desempate alfabético por nombre** y sin posiciones compartidas (ranking 1..N estricto).
  - Calcular `puntajeCombinado = 0.6 × posicionViajes + 0.4 × posicionIngreso` y, a partir de él, `prioridad` (posición final 1..N, mismo criterio de desempate alfabético).
  - El card superior "Siguiente en turno" pasa a mostrar a quien tiene `prioridad === 1` (antes: `datosMostrar[0]`, solo por viajes).
  - La tabla **conserva su orden actual** (por `totalViajes` ascendente, sin cambios). Se agregan columnas: "Viáticos", "Comisiones", "Ingreso Total" y "Prioridad" (el número de posición final; 1 = siguiente en turno).
  - El resaltado visual de "líder" (borde ámbar, ícono de estrella, badge "Siguiente turno") deja de ser `index === 0` y pasa a ser la fila cuya `prioridad === 1`, sin importar en qué posición quede dentro de la tabla ordenada por viajes.
  - Se actualiza el texto del banner informativo ("La tabla calcula los viajes...") para explicar que "Siguiente en turno" ahora combina viajes e ingreso, aunque la tabla se siga mostrando ordenada por viajes.
- El cálculo se sigue haciendo **por separado en cada pestaña**: choferes compiten solo contra choferes, auxiliares solo contra auxiliares — mismo criterio de separación por módulo que ya existe hoy.

**Fuera de alcance (para otro spec si hace falta):**

- Los PDFs (`Reporte Choferes`, `Reporte Auxiliares`, `Resumen General`): sin cambios de fórmula ni de opciones de orden. El selector "Orden del Resumen Maestro" (`ordenResumen`) sigue igual, sin agregar "Ingreso más alto/bajo".
- Persistir el puntaje o la prioridad en Firestore: se recalcula en cada carga a partir del rango de fechas seleccionado, no se guarda historial de recomendaciones.
- Hacer el peso 60/40 configurable desde la UI: queda fijo en código.
- Cambiar el orden por defecto de la tabla (sigue por total de viajes).

## Datos

Esta funcionalidad no agrega colecciones ni documentos nuevos en Firestore — todo se deriva en memoria a partir de los mismos registros de `distribucion` que ya lee `obtenerDistribucionPorRango`. Sí cambia la forma del objeto derivado por persona dentro del `useMemo` de `PanelHistorial.tsx`:

```ts
// hoy: { nombre, totalViajes, ultimoViaje }
// pasa a:
{
  nombre: string,
  totalViajes: number,
  ultimoViaje: string,
  totalViaticos: number,
  totalComisiones: number,
  ingresoTotal: number,      // totalViaticos + totalComisiones
  posicionViajes: number,    // 1..N, desempate alfabético
  posicionIngreso: number,   // 1..N, desempate alfabético
  puntajeCombinado: number,  // 0.6 * posicionViajes + 0.4 * posicionIngreso
  prioridad: number,         // 1..N según puntajeCombinado, desempate alfabético
}
```

Nuevas firmas exportadas en `src/utils/pdfNominaService.ts`:

```ts
export const calcularViaticosViaje = (v: any) => ({
  chofer: number,
  auxiliar: number,
});
export const calcularComisionViaje = (v: any, rol: "CHOFER" | "AUXILIAR") =>
  number;
```

## Plan de implementación

1. En `src/utils/pdfNominaService.ts`, agregar `export` a `calcularViaticosViaje` (sin cambiar su cuerpo).
2. En el mismo archivo, crear y exportar `calcularComisionViaje(v, rol)`, extrayendo la lógica de comisión (incluyendo el caso especial TLMK/TLMK 2) que hoy está duplicada inline en `generarPDFNominaChoferes`, `generarPDFNominaAyudantes` y `generarPDFResumenGeneral`. Reemplazar esas tres duplicaciones por llamadas a la función nueva. Verificar que `npm run build` compila y que la lógica queda idéntica (mismas fórmulas, solo centralizadas).
3. En `PanelHistorial.tsx`, importar `calcularViaticosViaje` y `calcularComisionViaje` desde `../utils/pdfNominaService`. Extender `statsCMap`/`statsAMap` para acumular `totalViaticos` y `totalComisiones` junto al `total` de viajes existente, usando el mismo `fila` que ya se recorre.
4. En el mismo `useMemo`, después de construir `arrayChoferes`/`arrayAyudantes` (que siguen ordenados por `totalViajes` como hoy), calcular `ingresoTotal`, `posicionViajes`, `posicionIngreso`, `puntajeCombinado` y `prioridad` para cada arreglo por separado, con desempate alfabético.
5. Actualizar el `resumen` memo para que `candidato` sea la persona con `prioridad === 1` en vez de `datosMostrar[0]`.
6. Actualizar el JSX: nuevas columnas "Viáticos", "Comisiones", "Ingreso Total" y "Prioridad" en la tabla; `esLider` pasa a comparar `personal.prioridad === 1`; texto del card superior y del banner informativo actualizados para reflejar el criterio combinado.
7. Correr `npm run build` (type-check incluido) y verificar manualmente en el navegador ambas pestañas del panel con datos reales de un rango de fechas.

## Criterios de aceptación

- [ ] Las pestañas "Choferes" y "Auxiliares" del panel de Equidad siguen mostrando la tabla ordenada por total de viajes ascendente, sin cambios en ese orden.
- [ ] Cada fila de la tabla muestra las columnas nuevas Viáticos, Comisiones, Ingreso Total y Prioridad, calculadas para el rango de fechas seleccionado.
- [ ] El viático y la comisión de cada viaje se calculan reutilizando `calcularViaticosViaje` y `calcularComisionViaje` exportados de `pdfNominaService.ts` (bolsón repartido, ruta Suc.Vallarta sin reparto, regla especial TLMK), sin fórmulas nuevas ni duplicadas en `PanelHistorial.tsx`.
- [ ] La columna "Prioridad" refleja el puntaje combinado (60% posición por viajes + 40% posición por ingreso), donde Prioridad = 1 es el siguiente en turno.
- [ ] El card superior "Siguiente en turno" muestra el mismo nombre que tiene Prioridad = 1 en la tabla de esa pestaña.
- [ ] La fila resaltada como líder (borde ámbar, ícono de estrella, badge "Siguiente turno") es la de Prioridad = 1, sin importar en qué posición quede dentro de la tabla ordenada por viajes.
- [ ] Un empate en viajes o en ingreso entre dos personas se desempata alfabéticamente por nombre antes de asignar la posición.
- [ ] El cálculo de Choferes y el de Auxiliares son independientes entre sí (cada pestaña compite solo contra su propio grupo).
- [ ] Los reportes PDF (`Reporte Choferes`, `Reporte Auxiliares`, `Resumen General`) generan exactamente los mismos montos de viáticos y comisiones que antes del cambio.
- [ ] `npm run build` pasa sin errores de TypeScript.

## Decisiones tomadas

- **Sí:** puntaje combinado (60% viajes / 40% ingreso) reemplaza el badge de "menos viajes" en vez de coexistir con él. El usuario pidió explícitamente que la recomendación combine ambos factores, no dos indicadores sueltos.
- **Sí:** reutilizar `calcularViaticosViaje` y agregar `calcularComisionViaje` en `pdfNominaService.ts`, en vez de reimplementar el cálculo de ingreso en `PanelHistorial.tsx`. Una sola fuente de verdad evita que el panel de equidad y los PDFs de nómina diverjan en los montos.
- **Sí:** desempate alfabético al calcular posiciones (ranking 1..N estricto, sin posiciones compartidas). Decisión explícita del usuario; produce un único ganador sin ambigüedad al elegir "el" siguiente en turno.
- **Sí:** la tabla conserva su orden actual por viajes; solo cambia qué fila se resalta como líder. Decisión explícita del usuario — minimiza el cambio visual y evita reordenar la tabla cada vez que cambian los montos de ingreso.
- **No:** no se toca el PDF "Resumen General" (`ordenResumen` sigue con "Viático más alto/bajo", sin agregar "Ingreso más alto/bajo"). Decisión explícita del usuario, queda fuera de alcance.
- **No:** no se usa normalización min-max ponderada entre viajes e ingreso. El promedio de posiciones no necesita manejar la diferencia de escala entre un conteo de viajes y montos en pesos, y es más fácil de verificar a mano.
- **No:** el peso 60/40 no es configurable desde la UI. Queda fijo en código; si se necesita ajustar, es un cambio de código, no de configuración en pantalla.

## Lo que **no** está en este spec

- Cambios en los PDFs de nómina (fórmulas u opciones de orden).
- Persistencia del puntaje/prioridad en Firestore.
- Peso configurable (60/40) desde la interfaz.
- Cambiar el orden por defecto de la tabla del panel de equidad.

Cada uno de estos, si se necesita, va en su propio spec.
