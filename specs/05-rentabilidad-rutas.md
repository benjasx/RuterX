# 05 — Rentabilidad de Rutas

**Estado:** Aprobado
**Depende de:** Ninguno
**Fecha:** 2026-09-20

**Objetivo:** Agregar un panel "Rentabilidad de Rutas" que, por cada viaje ya despachado, calcule qué porcentaje de la venta se fue en gasto operativo (viático + comisiones) y qué porcentaje quedó como rentabilidad, marcando el viaje como "Óptimo" cuando el gasto operativo no supera una meta configurable (por defecto 40% / 60%).

## Contexto

El usuario adjuntó una hoja de cálculo (`calculo de rentabilidad.pdf`) que modela el costo operativo diario de la ruta más larga: salario de chofer y 2 ayudantes, viáticos, comisiones, combustible (según km recorrido, rendimiento km/l y precio del diésel), gasto legal (tenencia/placas/póliza) y mantenimiento promedio por unidad — sumando ahí un "Gasto Total Ruta" que en el documento resulta ser ~42.91% de la venta programada, dejando ~57.09% de contribución. De ahí surge la meta simplificada que pidió el usuario: 40% gasto operativo / 60% rentabilidad.

Hoy, en Firestore (colección `distribucion_diaria`, cada documento con `fecha` y un arreglo `filas`), cada fila de viaje ya tiene `totalSumaDinero` (venta), `viaticoRuta`, `comisionChofer` y `comisionAyudante` (calculados en `PanelDistribucion.tsx:58-104` vía `calcularFinanzas`, usando las reglas de `ajustesNominaService.ts`). No existen en ningún lado de la app: salario por persona, kilómetros recorridos por viaje, rendimiento del vehículo, precio del diésel, ni gasto legal o de mantenimiento asociado a un viaje puntual (el `costo` que ya existe en `mantenimientosUnidades` — spec 04 — es del mantenimiento programado de la unidad, no un gasto diario prorrateado). Replicar la hoja completa exigiría capturar todos esos datos nuevos por viaje o por unidad, lo cual queda fuera de este spec.

Este módulo usa lo que ya existe (`totalSumaDinero`, `viaticoRuta`, `comisionChofer`, `comisionAyudante`) como el "gasto operativo" de cada viaje, y compara el porcentaje resultante contra una meta configurable, siguiendo el patrón de reporte por rango de fechas ya usado en `PanelHistorial.tsx` (`obtenerDistribucionPorRango`, estado `fechaInicio`/`fechaFin`).

## Alcance

**Dentro:**

- Nuevo campo `metaGastoOperativoPct` en `AjustesNomina` (`ajustesNominaService.ts`), número entero que representa un porcentaje (default `40`, es decir 40%). La meta de rentabilidad se deriva como `100 - metaGastoOperativoPct` (no es un campo aparte).
- Nuevo input "Meta de Gasto Operativo (%)" en `PanelAjustesNomina.tsx`, junto a los campos de comisión ya existentes, con el mismo botón "Guardar Toda la Configuración".
- Nuevo `src/utils/rentabilidadUtils.ts` con la función `calcularRentabilidad(fila, metaGastoOperativoPct)` que, para una fila con `totalSumaDinero > 0`, devuelve:
  - `venta`, `gastoOperativo` (`viaticoRuta + comisionChofer + comisionAyudante`), `rentabilidad` (`venta - gastoOperativo`).
  - `pctGasto` (`gastoOperativo / venta * 100`), `pctRentabilidad` (`100 - pctGasto`).
  - `esOptima` (`pctGasto <= metaGastoOperativoPct`).
- Nuevo panel "Rentabilidad de Rutas" (`PanelRentabilidad.tsx`), sub-vista `"rentabilidad"` en el sidebar, visible para `admin`, `jefeReparto` y `embarques` (permiso nuevo `permisos.rentabilidad`), mismo criterio de roles que "Unidades" (spec 04).
- Dentro del panel: selector de rango de fechas (`fechaInicio`/`fechaFin`, mismo patrón que `PanelHistorial.tsx`) que dispara un `useQuery` sobre `obtenerDistribucionPorRango`.
- Tabla con una fila por viaje (recorriendo `registro.filas` de cada documento del rango), columnas: Fecha, Ruta, Chofer, Unidad, Venta, Gasto Operativo, % Gasto, Rentabilidad, % Rentabilidad, Estado (badge "Óptima" verde / "No óptima" rojo).
- Se incluyen solo las filas con chofer asignado (mismo filtro que `calcularKpisPeriodo` en `Dashboard.tsx`: `chofer` no vacío y distinto de `"-"`) y `totalSumaDinero > 0` (sin venta no se puede calcular el porcentaje).
- Ordenado por fecha descendente y, dentro de la misma fecha, por ruta alfabético.
- Resumen en 4 recuadros tipo header, arriba de la tabla: "Venta Total" (azul), "Gasto Operativo Total" (ámbar, con el % promedio del rango), "Rentabilidad Total" (verde, con el % promedio del rango) y "Rutas Óptimas" (conteo `X de Y`, verde si `X === Y`, ámbar si no).
- Si no hay viajes en el rango (tras el filtro), mensaje "No hay viajes con venta registrada en este rango de fechas" en vez de tabla vacía.
- Botones "Excel" y "PDF", visibles si hay al menos una fila en la tabla:
  - **Excel** (`exportarRentabilidadExcel` dentro de `PanelRentabilidad.tsx`, patrón `exportarResumenExcel`/SheetJS): una hoja con las mismas columnas de la tabla.
  - **PDF** (`exportarRentabilidadPDF` en nuevo `src/utils/reportesRentabilidadUtils.ts`, patrón `exportarDistribucionPDF`): landscape (9 columnas), con encabezado tipo membrete, subtítulo del rango de fechas, el resumen de 4 recuadros y la tabla completa, más pie de página (patrón `pdfDashboardService.ts`).
  - Nombres de archivo: `Rentabilidad_Rutas_<fechaInicio>_a_<fechaFin>.xlsx` / `.pdf`.

**Fuera de alcance (para otro spec si hace falta):**

- No se agregan salario por persona, kilómetros recorridos, rendimiento del vehículo, precio del diésel, gasto legal ni gasto de mantenimiento prorrateado como parte del gasto operativo de un viaje; el cálculo usa únicamente `viaticoRuta + comisionChofer + comisionAyudante`, ya existentes.
- No se calcula rentabilidad agregada por ruta (promedio histórico de una ruta en particular); solo se lista viaje por viaje dentro del rango de fechas elegido. Un resumen agregado por ruta queda para otro spec si se necesita.
- No se agrega ninguna columna ni cálculo de rentabilidad dentro de `PanelDistribucion.tsx` (tabla de asignación diaria); vive únicamente en el panel nuevo.
- No se modifica `calcularFinanzas` ni cómo se guardan `viaticoRuta`/`comisionChofer`/`comisionAyudante` en `distribucion_diaria`; este módulo solo lee esos campos, no los recalcula ni los persiste.
- No se relaciona esta rentabilidad con el costo o capacidad de las unidades (spec 04).
- No hay alertas automáticas (ej. notificación) cuando una ruta cae por debajo de la meta; solo se refleja en el panel y sus reportes.
- Filas sin chofer asignado o con `totalSumaDinero <= 0` no aparecen en la tabla ni afectan los totales del resumen.

## Datos

```ts
// Ajuste a la interfaz existente en ajustesNominaService.ts
export interface AjustesNomina {
  comisionChofer: number;
  comisionAyudante: number;
  comisionTLMK?: number;
  viaticosRutas: Record<string, number>;
  metaGastoOperativoPct: number; // NUEVO — entero, ej. 40 (=40%). Default 40.
}

// src/utils/rentabilidadUtils.ts — derivado en memoria, sin colección nueva.
type RentabilidadViaje = {
  fecha: string;
  ruta: string;
  chofer: string;
  unidad: string;
  venta: number; // totalSumaDinero
  gastoOperativo: number; // viaticoRuta + comisionChofer + comisionAyudante
  rentabilidad: number; // venta - gastoOperativo
  pctGasto: number; // gastoOperativo / venta * 100
  pctRentabilidad: number; // 100 - pctGasto
  esOptima: boolean; // pctGasto <= metaGastoOperativoPct
};
```

No se crea ninguna colección de Firestore nueva; todo se deriva en memoria a partir de `distribucion_diaria` ya existente, más el nuevo campo `metaGastoOperativoPct` dentro del documento `configuracion/ajustes_nomina` que ya existe.

## Plan de implementación

1. En `src/firebase/ajustesNominaService.ts`: agregar `metaGastoOperativoPct: number` a la interfaz `AjustesNomina`, con default `40` en los dos `return` de `obtenerAjustesNomina` (documento inexistente y catch).
2. En `src/components/PanelAjustesNomina.tsx`: agregar el input "Meta de Gasto Operativo (%)" (`type="number"`, `step="1"`, `min`/`max` 0-100) junto a los campos de comisión, ligado a `ajustes.metaGastoOperativoPct`, guardado con el mismo botón existente.
3. Verificar con `npm run build` que no hay errores de tipos.
4. Crear `src/utils/rentabilidadUtils.ts` con la función `calcularRentabilidad(fila, metaGastoOperativoPct)` descrita arriba, devolviendo `null` si `totalSumaDinero <= 0`.
5. Crear `src/components/PanelRentabilidad.tsx`: estado `fechaInicio`/`fechaFin` (mismo default que `PanelHistorial.tsx`), `useQuery` con `obtenerDistribucionPorRango`, `useQuery` de `obtenerAjustesNomina`; `useMemo` que aplane `registro.filas` de todos los documentos del rango, filtre por chofer asignado y venta > 0, aplique `calcularRentabilidad` y ordene por fecha descendente y ruta.
6. En `PanelRentabilidad.tsx`: tabla con las columnas indicadas, badge de Estado, mensaje de lista vacía, y los 4 recuadros de resumen (sumas y promedios calculados con otro `useMemo` sobre la lista ya filtrada).
7. En `PanelRentabilidad.tsx`: función `exportarRentabilidadExcel` (patrón `exportarResumenExcel`) y su botón, habilitado si hay filas.
8. Crear `src/utils/reportesRentabilidadUtils.ts` con `exportarRentabilidadPDF(viajes: RentabilidadViaje[], resumen, fechaInicio, fechaFin)`, landscape, encabezado tipo membrete, resumen de 4 recuadros, tabla completa y pie de página (patrón `pdfDashboardService.ts`); importarla y llamarla desde el botón "PDF".
9. Verificar con `npm run build` que no hay errores de tipos.
10. En `src/components/SidebarAdmin.tsx`: agregar `"rentabilidad"` a `SubVistaAdmin`, `permisos.rentabilidad = esAdmin(usuarioEmail) || esJefeReparto(usuarioEmail) || esEmbarques(usuarioEmail)`, e ítem "Rentabilidad de Rutas" (ícono `TrendingUp` de `lucide-react`).
11. En `src/components/AdminPanel.tsx`: importar `PanelRentabilidad` y agregar `{menuActivo === "rentabilidad" && <PanelRentabilidad />}`.
12. Verificar con `npm run build` que no hay errores de tipos.
13. Prueba manual: cambiar "Meta de Gasto Operativo (%)" en Ajustes de Nómina a un valor distinto de 40, guardar, y confirmar que el panel "Rentabilidad de Rutas" usa el nuevo valor para clasificar Óptima/No óptima.
14. Prueba manual: con datos reales de un rango de fechas, confirmar que Venta, Gasto Operativo, % Gasto, Rentabilidad y % Rentabilidad de cada fila coinciden con `totalSumaDinero`, `viaticoRuta`, `comisionChofer` y `comisionAyudante` guardados en `distribucion_diaria`, y que el Estado (Óptima/No óptima) corresponde a la meta configurada.
15. Prueba manual: confirmar que un viaje sin chofer asignado o con venta $0 no aparece en la tabla ni en los totales del resumen.
16. Prueba manual: confirmar que "Rentabilidad de Rutas" es visible en el sidebar para `admin`, `jefeReparto` y `embarques`, y que un chofer o vendedor no lo ven.
17. Prueba manual: exportar Excel y PDF, y confirmar que ambos coinciden exactamente con la tabla y el resumen mostrados en pantalla para el rango seleccionado.

Cada paso deja la app compilando y funcional.

## Criterios de aceptación

- [ ] `AjustesNomina` tiene el campo `metaGastoOperativoPct`, editable desde "Reglas de viáticos" (`PanelAjustesNomina.tsx`), con default `40` cuando no existe configuración previa.
- [ ] "Rentabilidad de Rutas" es visible en el sidebar para `admin`, `jefeReparto` y `embarques`, y no para un chofer o un vendedor.
- [ ] El panel permite elegir un rango de fechas y muestra, por cada viaje de ese rango con chofer asignado y venta mayor a $0: Fecha, Ruta, Chofer, Unidad, Venta, Gasto Operativo, % Gasto, Rentabilidad, % Rentabilidad y Estado.
- [ ] `Gasto Operativo` de cada fila es exactamente `viaticoRuta + comisionChofer + comisionAyudante`; `Rentabilidad` es `Venta - Gasto Operativo`.
- [ ] `% Gasto` es `Gasto Operativo / Venta * 100`; `% Rentabilidad` es `100 - % Gasto`.
- [ ] Un viaje con `% Gasto` menor o igual a `metaGastoOperativoPct` se marca "Óptima"; si es mayor, "No óptima".
- [ ] Cambiar `metaGastoOperativoPct` en Ajustes de Nómina cambia, sin más cambios de código, qué viajes se marcan "Óptima" en este panel.
- [ ] Un viaje sin chofer asignado, o con venta $0, no aparece en la tabla ni se cuenta en el resumen.
- [ ] El resumen muestra 4 recuadros: Venta Total, Gasto Operativo Total (con % promedio), Rentabilidad Total (con % promedio) y Rutas Óptimas (conteo `X de Y`), recalculados al cambiar el rango de fechas.
- [ ] Si no hay viajes válidos en el rango, se muestra el mensaje "No hay viajes con venta registrada en este rango de fechas".
- [ ] La tabla está ordenada por fecha descendente y, dentro de la misma fecha, por ruta alfabético.
- [ ] El botón "Excel" descarga `Rentabilidad_Rutas_<fechaInicio>_a_<fechaFin>.xlsx` con las mismas columnas y filas que la tabla en pantalla.
- [ ] El botón "PDF" descarga `Rentabilidad_Rutas_<fechaInicio>_a_<fechaFin>.pdf` en landscape, con encabezado tipo membrete, el resumen de 4 recuadros, la tabla completa y pie de página en todas las páginas.
- [ ] `npm run build` pasa sin errores de tipo.

## Decisiones tomadas

- **Gasto operativo = `viaticoRuta + comisionChofer + comisionAyudante` únicamente, sin salario/combustible/legal/mantenimiento:** decisión explícita del usuario tras señalar que esos otros datos no existen hoy en la app; replicar la hoja completa exigiría capturar varios parámetros nuevos (km por viaje, rendimiento, precio de diésel, gasto legal) fuera del alcance pedido.
- **Cálculo por viaje individual, no agregado por ruta:** decisión explícita del usuario; permite detectar qué viaje puntual no es rentable, a diferencia de un promedio histórico por ruta.
- **Panel nuevo dedicado ("Rentabilidad de Rutas"), no una columna en Distribución Diaria:** decisión explícita del usuario; separa el análisis financiero del flujo operativo de armar la distribución del día.
- **Meta configurable en Ajustes de Nómina (`metaGastoOperativoPct`), no fija en código:** decisión explícita del usuario; permite ajustar la meta 40/60 sin tocar código si cambian las condiciones del negocio, mismo patrón que las comisiones.
- **Un solo campo de meta (`metaGastoOperativoPct`), sin un campo aparte para la meta de rentabilidad:** matemáticamente `% Rentabilidad = 100 - % Gasto` siempre (rentabilidad = venta - gasto operativo), así que una meta de gasto de 40% ya implica una meta de rentabilidad de 60%; un segundo campo sería redundante y podría desincronizarse.
- **Meta almacenada como entero de 0-100 (ej. `40`), no como fracción 0-1:** el usuario habló en términos de "un 40" y "el 60"; se evita la ambigüedad de otros campos de la misma interfaz (`comisionChofer` sí es fracción, ej. `0.00075`, pero representa un porcentaje muy pequeño y ya está establecido así en la app).
- **Umbral simple (`pctGasto <= meta` → Óptima), sin banda de tolerancia:** decisión explícita del usuario; más fácil de entender que un rango con dos límites.
- **Roles con acceso: admin, jefeReparto y embarques:** mismo criterio ya usado para "Unidades" (spec 04) y "Distribución Diaria"; son los tres roles con acceso operativo/financiero pleno.
- **Filtro por rango de fechas únicamente, sin filtro de ruta o chofer en esta primera versión:** decisión explícita del usuario; simplifica la primera versión del panel, consistente con el patrón ya usado en el `Dashboard`.
- **Se excluyen viajes sin chofer o con venta $0:** mismo criterio de "viaje real" que ya usa `calcularKpisPeriodo` en `Dashboard.tsx`; sin venta no hay porcentaje que calcular (división entre cero), y una fila sin chofer suele ser una fila de planeación incompleta, no un viaje realizado.
- **Exportación Excel y PDF desde el día uno, en landscape:** decisión explícita del usuario; landscape porque la tabla tiene 9 columnas (más ancha que las de personal/unidades, que usan portrait).
- **Archivo nuevo `reportesRentabilidadUtils.ts`, en vez de ampliar `reportesDistribucionUtils.ts`:** sigue la convención del proyecto de un archivo de reportes por dominio (`pdfNominaService.ts`, `reportesDistribucionUtils.ts`); rentabilidad es un dominio distinto al de distribución/personal/unidades.
- **No se toca `calcularFinanzas` ni la persistencia de `viaticoRuta`/comisiones:** este módulo es de solo lectura sobre datos ya calculados y guardados; evita introducir un segundo lugar donde esos montos podrían calcularse distinto.

## Riesgos identificados

| Riesgo                                                                                                                                              | Mitigación                                                                                                                                                                                        |
| --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| El gasto operativo real de una ruta es mayor al reflejado aquí (no incluye salario, combustible, legal ni mantenimiento).                           | Riesgo aceptado explícitamente por el usuario en esta primera versión; el panel deja claro en su encabezado/tooltip que el % es solo viático + comisiones, no el costo total de operar la unidad. |
| Cambiar `metaGastoOperativoPct` reclasifica retroactivamente viajes ya exportados en reportes anteriores (el PDF/Excel viejo no se actualiza solo). | Comportamiento esperado de un dato de solo lectura calculado al vuelo; si se necesita un histórico congelado de la meta usada en cada reporte, queda fuera de este spec.                          |

## Lo que **no** está en este spec

- Salario, combustible, gasto legal o mantenimiento prorrateado como parte del gasto operativo por viaje.
- Rentabilidad agregada/histórica por ruta (fuera del rango de fechas elegido en pantalla).
- Cambios a `PanelDistribucion.tsx` o a `calcularFinanzas`.
- Alertas o notificaciones automáticas por rutas no óptimas.
- Filtro por ruta o chofer específico dentro del panel.

Cada uno de estos, si se necesita, va en un spec aparte.
