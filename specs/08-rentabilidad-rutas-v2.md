# 08 — Rentabilidad de Rutas (reconstrucción v2)

**Estado:** APROBADO
**Depende de:** Ninguno
**Fecha:** 2026-09-23

**Objetivo:** Reconstruir por completo la calculadora de "Rentabilidad de Rutas" y su panel "Ajustes de Rentabilidad" (`specs/05-rentabilidad-rutas.md`) para que la unidad se seleccione de la colección Firestore `unidades` (con su costo por km propio), la ruta se seleccione del catálogo `LISTA_RUTAS`, el kilometraje/permiso de descarga por ruta y el costo por km por unidad se administren en Ajustes de Rentabilidad, se agregue el rol Vendedor con su comisión, y el resultado final se calcule con el modelo Venta/Margen/Utilidad/Semáforo en vez del modelo de Contribución 40/60 actual.

## Contexto

Esta es una reconstrucción completa del spec 05 (marcado "implementado"), a partir de una nueva captura de la hoja de cálculo del usuario (un ejemplo distinto: unidad `R-11`/ISUZU 600, ruta Villa Hidalgo) que muestra una estructura y un modelo de utilidad distintos a los que ya están en el código:

- **Unidad del camión** (`#`, `UNIDAD`, `CAPACIDAD`): hoy no existe en el simulador — se agrega, tomada de la colección Firestore `unidades` (`src/firebase/unidadesService.ts`: `numero`, `tipo`, `capacidad_kg`, `capacidad_m3`), la misma que alimenta "Unidades" (`AdminUnidades.tsx`).
- **`$ x KM`**: hoy el gasto de combustible se calcula con `precioDiesel × kilometraje ÷ rendimientoKmPorLitro` (variables globales). Se reemplaza por un **costo por km todo incluido, por unidad** (combustible + mantenimiento + legal amortizados en un solo número), capturado a mano por el admin y actualizado mensualmente en Ajustes de Rentabilidad — desaparecen `rendimientoKmPorLitro`, `gastoLegalDiario`, `gastoMantenimientoDiario` y `precioDieselDefault`.
- **`RUTA` / `KM TRAYECTO`**: la ruta deja de salir de la colección Firestore `rutas` (que hoy tiene el campo `kilometraje`) y pasa a salir del catálogo estático `LISTA_RUTAS` (`src/utils/mapaUtils.ts`), igual que ya corrigió `specs/06-programacion-entregas.md` para su propio selector de ruta. El kilometraje promedio por ruta pasa a vivir como catálogo en Ajustes de Rentabilidad.
- **`KM $` (Gasto Combustible)** = `$ x KM (de la unidad) × KM TRAYECTO (de la ruta)`.
- **`PERMISO DESCARGA`**: nuevo, variable por ruta (algunas rutas de Mazatlán, Tuxpan, Santiago y algunas locales lo requieren; la mayoría no). Vive como catálogo por ruta en Ajustes de Rentabilidad, igual patrón que el kilometraje por ruta y que el catálogo de viáticos por ruta ya existente (`ajustesNomina.viaticosRutas`).
- **Sueldo base**: ya no es un salario semanal dividido entre 7 — es directamente el **sueldo diario** capturado tal cual en Ajustes de Rentabilidad, para Chofer, Ayudante (aplica a Auxiliar 1 y 2) y **Vendedor (nuevo)**.
- **Vendedor (rol nuevo)**: participa siempre, con sueldo base diario propio y una comisión propia sobre la venta (`comisionVendedor`, nueva variable en Ajustes de Rentabilidad, default 2%) — a diferencia de Ayudante 1/2, no lleva checkbox "va/no va".
- **Comisión de Auxiliar 2**: en el modelo actual (spec 01 y spec 05) solo Auxiliar 1 cobra comisión. La nueva captura muestra comisión también para Auxiliar 2, con el mismo monto que Auxiliar 1. Confirmado con el usuario: **ambos auxiliares** cobran comisión usando la misma tasa que ya existe en Ajustes de Nómina (`ajustesNomina.comisionAyudante`, hoy 0.00035) — no se crea una tasa nueva. Esto solo cambia el simulador de rentabilidad; no toca `pdfNominaService.ts` ni `PanelDistribucion.tsx` (spec 01), donde la regla real de nómina (solo Auxiliar 1 cobra comisión) no se modifica.
- **Modelo de utilidad**: reemplaza por completo el modelo de Contribución/meta 40-60 actual por: `Margen Bruto $ = Venta × Margen %` (Margen % fijo, configurado en Ajustes de Rentabilidad) → `Utilidad Ruta = Margen Bruto $ − Total Costo` → `Rentabilidad % = Utilidad Ruta ÷ Venta` → **Semáforo**: `Rentabilidad % ≥ metaRentablePct` → "RENTABLE"; si no, `≥ metaRevisarPct` → "REVISAR"; si no, "NO RENTABLE" (misma lógica que la fórmula `=SI(C28>=6%,"RENTABLE",SI(C28>=5%,"REVISAR","NO RENTABLE"))` de la hoja de cálculo, con los umbrales 6/5 configurables).
- **Exportación**: se mantiene "Exportar PDF" con buen diseño (igual criterio visual que ya tiene `reportesRentabilidadUtils.ts`, actualizado a las nuevas líneas). Se agrega "Exportar Excel", pero **simple** — datos y formato de número únicamente, sin colores ni bordes, con la librería `xlsx` que ya usa el resto de la app (`reportesUtils.ts`); no se agrega una librería nueva para lograr un Excel con diseño.

## Alcance

**Dentro:**

- **`src/firebase/rutasService.ts`**: se quita el campo `kilometraje` de la interfaz `Ruta` y de `actualizarRutaFirebase`. **`src/components/GestionRutas.tsx`**: se quita el input "Km" y su botón de guardado (quedaba sin uso al mover el kilometraje a un catálogo por ruta en Ajustes de Rentabilidad).
- **Reescritura de `src/firebase/ajustesRentabilidadService.ts`** con la interfaz `AjustesRentabilidad` nueva (ver "Datos"): sueldos diarios (Chofer, Ayudante, Vendedor), `comisionVendedor`, `margenPct`, `metaRentablePct`, `metaRevisarPct`, y tres catálogos: `costoPorKmUnidades` (por unidad, clave = id de documento de `unidades`), `kmPromedioRutas` y `permisoDescargaRutas` (por ruta, clave = nombre libre en mayúsculas, igual patrón de coincidencia difusa que `viaticosRutas`).
- **Reescritura de `src/components/PanelAjustesRentabilidad.tsx`**:
  - Sección "Sueldos y Comisiones": inputs para `salarioDiarioChofer`, `salarioDiarioAyudante`, `salarioDiarioVendedor`, `comisionVendedor`, `margenPct`, `metaRentablePct`, `metaRevisarPct`.
  - Sección "Costo por KM de Unidades": `useQuery(["unidades"], obtenerUnidadesFirebase)`, una fila por unidad (mostrando `numero` + `tipo`) con un input numérico para su `costoPorKmUnidades[unidad.id]` (0 si no está capturado aún).
  - Secciones "Km Promedio por Ruta" y "Permiso de Descarga por Ruta": mismo patrón de catálogo agregar/eliminar (texto libre en mayúsculas + monto, tabla con botón eliminar) que ya usa "Catálogo de Viáticos por Ruta" en `PanelAjustesNomina.tsx`, aplicado a `kmPromedioRutas` y `permisoDescargaRutas` respectivamente.
- **Generalización del emparejamiento por ruta**: se extrae la función de normalización/coincidencia difusa que hoy vive inline en `PanelRentabilidad.tsx` (`buscarViaticoRuta`) a `src/utils/rentabilidadUtils.ts` como `buscarValorPorRuta(rutaNombre, catalogo)`, reutilizada para viáticos, km promedio y permiso de descarga (mismo criterio: normalizar mayúsculas/acentos y hacer match por substring en cualquier dirección).
- **Reescritura de `src/utils/rentabilidadUtils.ts`**: nuevas interfaces `SimulacionRentabilidadInput`/`SimulacionRentabilidadResultado` y `calcularSimulacionRentabilidad(input, ajustesRentabilidad, ajustesNomina)` con las fórmulas de "Contexto"/"Datos".
- **Reescritura de `PanelRentabilidad.tsx`** como calculadora:
  - Selector de Unidad (`useQuery(["unidades"], obtenerUnidadesFirebase)`, ordenadas por `numero`). Al elegir una, autocompleta (solo lectura): número, tipo, capacidad (`capacidad_kg`/`capacidad_m3` tal cual, sin texto de rango inventado) y el campo editable "Costo por KM" con `ajustesRentabilidad.costoPorKmUnidades[unidad.id]` (0 si no está capturado).
  - Selector de Ruta (opciones = `LISTA_RUTAS`). Al elegirla, autocompleta (editables/"amarillos"): Viático Chofer/Ayudante 1/Ayudante 2 (`buscarValorPorRuta` sobre `ajustesNomina.viaticosRutas`), Km Trayecto (`buscarValorPorRuta` sobre `kmPromedioRutas`) y Permiso Descarga (`buscarValorPorRuta` sobre `permisoDescargaRutas`).
  - Checkboxes "Ayudante 1 va"/"Ayudante 2 va" (default marcados, igual que hoy); sin checkbox para Vendedor (siempre activo).
  - Campos editables restantes: Venta Programada.
  - De solo lectura: Margen % (de Ajustes de Rentabilidad), sueldos diarios, comisiones, metas del semáforo.
  - Resultado en vivo (sin botón "Calcular"): desglose completo por rol (Chofer, Ayudante 1, Ayudante 2, Vendedor: sueldo/viático/comisión donde aplique), Gasto Combustible (Km $), Permiso Descarga, **Total Costo**, Venta, Margen Bruto $, **Utilidad Ruta**, **Rentabilidad %**, badge de **Semáforo** ("RENTABLE"/"REVISAR"/"NO RENTABLE", con color verde/ámbar/rojo).
  - Si Venta Programada es `0` o vacía, Rentabilidad % y el Semáforo muestran "—" en vez de `NaN`/`Infinity`.
  - Botón "Exportar PDF" (rediseñado con las nuevas líneas) y botón nuevo "Exportar Excel" (simple, sin diseño).
- **Reescritura de `src/utils/reportesRentabilidadUtils.ts`**: `exportarSimulacionRentabilidadPDF` actualizado a las nuevas líneas/modelo (mismo patrón visual de membrete ya usado); nueva función `exportarSimulacionRentabilidadExcel(input, resultado, unidad, ruta, fecha)` con `XLSX.utils.json_to_sheet` (columnas "Concepto"/"Monto"), mismo patrón que `exportarExcelAdmin` en `reportesUtils.ts`, sin estilos de celda.
- Sin cambios de permisos ni de sidebar: "Rentabilidad de Rutas" y "Ajustes de Rentabilidad" mantienen las sub-vistas y permisos ya existentes (`rentabilidad`: admin/jefeReparto/embarques; `ajustesRentabilidad`: solo admin).

**Fuera de alcance (para otro spec si hace falta):**

- No se toca `pdfNominaService.ts` ni `PanelDistribucion.tsx`/`calcularFinanzas` (spec 01): la regla real de nómina (solo Auxiliar 1 cobra comisión, viático repartido en bolsón) no cambia; el cambio de "ambos auxiliares cobran comisión" solo aplica dentro de este simulador.
- No se agrega la librería `exceljs` ni ningún Excel con colores/bordes; el Excel exportado es texto y números planos, igual de simple que los demás Excel de la app.
- No se guarda historial de simulaciones (igual que en spec 05): es una calculadora en pantalla, no se persiste en Firestore.
- No se relaciona el costo por km, el km promedio ni el permiso de descarga con datos reales de `mantenimientosUnidades` (spec 04) ni con la distancia calculada por Leaflet/`calcularRutaOptimaYCarretera`; los tres son valores capturados a mano por el admin.
- No se valida que la suma de `margenPct`/costos tenga sentido financiero; se confía en lo que capture el admin, igual que hoy.
- No se agrega un checkbox "Vendedor va"; el vendedor participa siempre en la simulación.
- No se migran ni se conservan los valores de `kilometraje` que ya existían en la colección `rutas`; se capturan de nuevo (a mano) como catálogo `kmPromedioRutas` en Ajustes de Rentabilidad.

## Datos

```ts
// src/firebase/rutasService.ts — se quita el campo kilometraje
export interface Ruta {
  id: string;
  nombre: string;
}
// actualizarRutaFirebase(id, datos: Partial<Pick<Ruta, "nombre">>)

// Reescritura de src/firebase/ajustesRentabilidadService.ts
export interface AjustesRentabilidad {
  salarioDiarioChofer: number; // sueldo base DIARIO, directo (sin dividir). Default 357.14
  salarioDiarioAyudante: number; // aplica a Auxiliar 1 y 2. Default 278.80
  salarioDiarioVendedor: number; // nuevo. Default 0 (a capturar por el admin)
  comisionVendedor: number; // % sobre la venta, ej. 0.02 = 2%. Default 0.02
  margenPct: number; // % de margen fijo usado para Margen Bruto $. Default 0 (a capturar)
  metaRentablePct: number; // Rentabilidad % >= esto -> "RENTABLE". Default 6
  metaRevisarPct: number; // Rentabilidad % >= esto (y < metaRentablePct) -> "REVISAR". Default 5
  costoPorKmUnidades: Record<string, number>; // clave = id de documento en "unidades"; $/km todo incluido (combustible+mantenimiento+legal), actualizado a mano mensualmente. Default {}
  kmPromedioRutas: Record<string, number>; // clave = nombre de ruta en mayúsculas (coincidencia difusa contra LISTA_RUTAS, igual que viaticosRutas). Default {}
  permisoDescargaRutas: Record<string, number>; // clave = nombre de ruta en mayúsculas; monto del permiso, 0/ausente si la ruta no lo requiere. Default {}
}

// Reescritura de src/utils/rentabilidadUtils.ts
export const buscarValorPorRuta = (
  rutaNombre: string,
  catalogo: Record<string, number>,
): number => {
  /* misma normalización/match por substring que ya usa buscarViaticoRuta hoy */
};

export interface SimulacionRentabilidadInput {
  unidadId: string;
  ruta: string; // nombre tal cual sale de LISTA_RUTAS
  costoPorKm: number; // autocompletado desde costoPorKmUnidades[unidadId], editable
  kmTrayecto: number; // autocompletado con buscarValorPorRuta sobre kmPromedioRutas, editable
  permisoDescarga: number; // autocompletado con buscarValorPorRuta sobre permisoDescargaRutas, editable
  viaticoChofer: number;
  viaticoAyudante1: number;
  viaticoAyudante2: number;
  ayudante1Va: boolean;
  ayudante2Va: boolean;
  ventaProgramada: number;
}

export interface SimulacionRentabilidadResultado {
  salarioChofer: number; // = ajustesRentabilidad.salarioDiarioChofer
  salarioAyudante1: number; // ayudante1Va ? salarioDiarioAyudante : 0
  salarioAyudante2: number; // ayudante2Va ? salarioDiarioAyudante : 0
  salarioVendedor: number; // = ajustesRentabilidad.salarioDiarioVendedor (siempre)
  viaticoChofer: number;
  viaticoAyudante1: number; // 0 si !ayudante1Va
  viaticoAyudante2: number; // 0 si !ayudante2Va
  comisionChofer: number; // ventaProgramada * ajustesNomina.comisionChofer
  comisionAyudante1: number; // ayudante1Va ? ventaProgramada * ajustesNomina.comisionAyudante : 0
  comisionAyudante2: number; // ayudante2Va ? ventaProgramada * ajustesNomina.comisionAyudante : 0
  comisionVendedor: number; // ventaProgramada * ajustesRentabilidad.comisionVendedor (siempre)
  gastoCombustible: number; // costoPorKm * kmTrayecto ("KM $")
  permisoDescarga: number;
  totalCosto: number; // suma de las 13 líneas anteriores
  ventaProgramada: number;
  margenBruto: number; // ventaProgramada * (ajustesRentabilidad.margenPct / 100)
  utilidadRuta: number; // margenBruto - totalCosto
  rentabilidadPct: number | null; // (utilidadRuta / ventaProgramada) * 100, null si ventaProgramada <= 0
  semaforo: "RENTABLE" | "REVISAR" | "NO_RENTABLE" | null; // null si rentabilidadPct es null
}
```

No se crea ninguna colección de Firestore nueva: se reutiliza el mismo documento `configuracion/ajustes_rentabilidad` (con una interfaz completamente distinta) y la colección `unidades` ya existente. El campo `kilometraje` de la colección `rutas` desaparece.

## Plan de implementación

1. En `src/firebase/rutasService.ts`: quitar `kilometraje` de `Ruta` y de `actualizarRutaFirebase`. En `src/components/GestionRutas.tsx`: quitar el input "Km" y su botón de guardado. Verificar con `npm run build`.
2. Reescribir `src/firebase/ajustesRentabilidadService.ts` con la interfaz `AjustesRentabilidad` nueva y sus defaults (ver "Datos"). Verificar con `npm run build`.
3. Reescribir `src/utils/rentabilidadUtils.ts`: `buscarValorPorRuta`, `SimulacionRentabilidadInput`, `SimulacionRentabilidadResultado`, `calcularSimulacionRentabilidad` con las fórmulas de "Contexto"/"Datos". Verificar con `npm run build`.
4. Reescribir `src/components/PanelAjustesRentabilidad.tsx`: sección de sueldos/comisiones/margen/metas; sección "Costo por KM de Unidades" (`useQuery` de `obtenerUnidadesFirebase`, un input por unidad); secciones "Km Promedio por Ruta" y "Permiso de Descarga por Ruta" (patrón agregar/eliminar de `PanelAjustesNomina.tsx`). Verificar con `npm run build`.
5. Reescribir `src/components/PanelRentabilidad.tsx`: selector de Unidad y selector de Ruta (`LISTA_RUTAS`), autocompletados (costo/km, km trayecto, permiso descarga, viáticos), checkboxes de ayudantes, Venta Programada editable, cálculo en vivo, desglose completo, badge de Semáforo. Verificar con `npm run build`.
6. Reescribir `src/utils/reportesRentabilidadUtils.ts`: actualizar `exportarSimulacionRentabilidadPDF` a las nuevas líneas/modelo; agregar `exportarSimulacionRentabilidadExcel` (xlsx simple, sin estilos). Conectar ambos botones en el panel. Verificar con `npm run build`.
7. Prueba manual: en "Ajustes de Rentabilidad", capturar sueldos diarios (Chofer/Ayudante/Vendedor), `comisionVendedor` (2%), `margenPct`, `metaRentablePct`/`metaRevisarPct` (6/5), costo por km para al menos 2 unidades, km promedio y permiso de descarga para al menos 3 rutas (incluyendo una ruta de Mazatlán con permiso > 0 y una ruta sin permiso). Confirmar que persisten al recargar.
8. Prueba manual: en "Rentabilidad de Rutas", seleccionar una unidad y confirmar que número/tipo/capacidad se muestran de solo lectura y que "Costo por KM" autocompleta con el valor capturado en el paso 7.
9. Prueba manual: seleccionar una ruta y confirmar que Viático Chofer/Ayudante 1/Ayudante 2, Km Trayecto y Permiso Descarga autocompletan correctamente (incluida la ruta de Mazatlán con permiso > 0).
10. Prueba manual: desmarcar "Ayudante 2 va" y confirmar que su sueldo, viático y comisión bajan a $0, y que el sueldo/comisión del Vendedor nunca cambian (siempre activos).
11. Prueba manual: con una venta de prueba, verificar a mano que Gasto Combustible, Total Costo, Margen Bruto $, Utilidad Ruta y Rentabilidad % coinciden con las fórmulas del spec, y que el Semáforo cambia correctamente al cruzar los umbrales `metaRentablePct`/`metaRevisarPct`.
12. Prueba manual: con Venta Programada en `0`, confirmar que Rentabilidad % y el Semáforo muestran "—".
13. Prueba manual: exportar PDF y Excel de la misma simulación y confirmar que ambos contienen el mismo desglose (el PDF con el diseño de membrete existente, el Excel como datos planos).
14. Prueba manual: confirmar en "Añadir Rutas" que el input "Km" ya no aparece, y que la app sigue permitiendo crear/eliminar rutas por nombre sin errores.

Cada paso deja la app compilando y funcional.

## Criterios de aceptación

- [ ] La colección `rutas` y `GestionRutas.tsx` ya no tienen el campo/input `kilometraje`/"Km".
- [ ] "Ajustes de Rentabilidad" permite capturar y persistir: sueldos diarios (Chofer, Ayudante, Vendedor), `comisionVendedor`, `margenPct`, `metaRentablePct`, `metaRevisarPct`, costo por km por unidad (listando las unidades reales de Firestore), km promedio por ruta y permiso de descarga por ruta (catálogos agregar/eliminar).
- [ ] En "Rentabilidad de Rutas", seleccionar una unidad autocompleta número/tipo/capacidad (solo lectura) y costo por km (editable) desde `costoPorKmUnidades`.
- [ ] Seleccionar una ruta (del catálogo `LISTA_RUTAS`) autocompleta Viático Chofer/Ayudante 1/Ayudante 2, Km Trayecto y Permiso Descarga; los cinco siguen siendo editables tras autocompletarse.
- [ ] Desmarcar "Ayudante 1 va" o "Ayudante 2 va" pone en $0 su sueldo, viático y comisión de ese rol; el Vendedor siempre participa (sin checkbox).
- [ ] `Gasto Combustible` = `Costo por KM (de la unidad) × Km Trayecto (de la ruta)`.
- [ ] `Total Costo` = suma de sueldos activos + viáticos activos + comisiones activas (Chofer, Auxiliar 1, Auxiliar 2, Vendedor) + Gasto Combustible + Permiso Descarga.
- [ ] `Margen Bruto $` = `Venta Programada × (Margen % ÷ 100)`.
- [ ] `Utilidad Ruta` = `Margen Bruto $ − Total Costo`.
- [ ] `Rentabilidad %` = `(Utilidad Ruta ÷ Venta Programada) × 100`.
- [ ] El Semáforo muestra "RENTABLE" si `Rentabilidad % ≥ metaRentablePct`, "REVISAR" si `≥ metaRevisarPct`, y "NO RENTABLE" en cualquier otro caso.
- [ ] Cambiar `metaRentablePct`/`metaRevisarPct`/`margenPct` en Ajustes de Rentabilidad cambia, sin tocar código, el resultado de simulaciones existentes.
- [ ] Con `Venta Programada` en `0` o vacía, `Rentabilidad %` y el Semáforo muestran "—".
- [ ] El resultado se recalcula en vivo al cambiar cualquier campo editable, sin botón "Calcular".
- [ ] "Exportar PDF" descarga una ficha con el desglose completo (nuevo modelo) y buen diseño (membrete, colores por sección, igual criterio visual que ya tenía el reporte anterior).
- [ ] "Exportar Excel" descarga un archivo `.xlsx` con el mismo desglose en texto/números planos, sin colores ni bordes.
- [ ] Auxiliar 1 y Auxiliar 2 cobran comisión con la misma tasa (`ajustesNomina.comisionAyudante`) dentro de este simulador, sin que esto afecte `pdfNominaService.ts` ni `PanelDistribucion.tsx` (spec 01).
- [ ] `npm run build` pasa sin errores de tipo.

## Decisiones tomadas

- **Costo por km todo incluido, por unidad, capturado a mano mensualmente:** decisión explícita del usuario; reemplaza `rendimientoKmPorLitro` + `gastoLegalDiario` + `gastoMantenimientoDiario` + `precioDieselDefault` por un solo número por unidad, porque la nueva captura ya no desglosa esas líneas por separado.
- **Ruta seleccionada de `LISTA_RUTAS`, no de la colección `rutas`:** mismo criterio que ya aplicó `specs/06-programacion-entregas.md`; el km promedio y el permiso de descarga pasan a vivir como catálogos por nombre de ruta en Ajustes de Rentabilidad, con coincidencia difusa (igual que `viaticosRutas`), en vez de un campo en documentos de Firestore sin relación con `LISTA_RUTAS`.
- **Capacidad mostrada tal cual (`capacidad_kg`/`capacidad_m3`), sin texto de rango inventado:** decisión explícita del usuario; no se agrega un campo de texto libre nuevo a `unidades` solo para imitar el formato "6-7 TON" del Excel.
- **Sueldo base como cifra diaria directa, sin dividir entre 7:** decisión explícita del usuario ("sueldo base es sueldo por día"); aplica igual a Chofer, Ayudante y Vendedor.
- **Vendedor siempre participa, sin checkbox "va/no va":** decisión explícita del usuario, a diferencia de Ayudante 1/2 que sí son opcionales.
- **Comisión de Vendedor como variable editable (`comisionVendedor`, default 2%), no una constante fija en código:** mismo patrón que `comisionChofer`/`comisionAyudante`, permite ajustarla sin tocar código.
- **Ambos auxiliares cobran comisión (misma tasa `ajustesNomina.comisionAyudante`), solo dentro de este simulador:** decisión explícita del usuario tras revisar la nueva captura; no se toca la regla real de nómina de spec 01 (`pdfNominaService.ts`/`calcularFinanzas`), donde Auxiliar 2 sigue sin comisión.
- **Modelo de utilidad reemplazado por completo (Margen/Utilidad/Semáforo), no coexistiendo con el modelo de Contribución 40-60 actual:** decisión explícita del usuario; es una reconstrucción del módulo, no una adición.
- **`margenPct` como parámetro fijo en Ajustes de Rentabilidad, no editable por simulación:** decisión explícita del usuario.
- **Umbrales del semáforo (`metaRentablePct`=6, `metaRevisarPct`=5) configurables en Ajustes de Rentabilidad:** mismo espíritu que `metaGastoOperativoPct` en la versión anterior; permite ajustar sin tocar código.
- **Permiso de descarga como catálogo por ruta (texto libre + coincidencia difusa), no una lista fija de las ~90 rutas de `LISTA_RUTAS`:** decisión explícita del usuario ("si es de Mazatlán o cualquier ruta de Mazatlán"); reutiliza el mismo patrón de agregar/eliminar y de coincidencia por substring que ya usa `viaticosRutas`, en vez de mostrar un input por cada una de las rutas del catálogo estático.
- **Excel de exportación simple (sin colores/bordes), con la librería `xlsx` ya usada en el resto de la app:** decisión explícita del usuario; el diseño cuidado se concentra en el PDF, no se agrega una librería nueva (`exceljs`) solo para el Excel.
- **Se elimina el campo `kilometraje` de `rutas` y su input en "Añadir Rutas", sin migrar los valores ya capturados:** decisión explícita del usuario; el kilometraje se vuelve a capturar como catálogo por ruta en Ajustes de Rentabilidad.

## Riesgos identificados

| Riesgo                                                                                                                               | Mitigación                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Una unidad sin `costoPorKmUnidades` capturado da Gasto Combustible = $0, subestimando el Total Costo.                                | El campo autocompleta en 0 y sigue siendo editable; es responsabilidad del admin mantenerlo al día cada mes, igual que ya pasa con las comisiones y viáticos. |
| Una ruta sin `kmPromedioRutas` o `permisoDescargaRutas` capturado da esos valores en $0 silenciosamente.                             | Mismo criterio que el resto de catálogos por ruta de la app (`viaticosRutas`): valor 0 si no está capturado, editable a mano en cada simulación.              |
| La coincidencia difusa de `buscarValorPorRuta` empareja mal dos rutas con nombres parecidos (ej. "Ixtlan" vs "Ixtlan - Joel Perez"). | Mismo riesgo ya aceptado hoy por `viaticosRutas`; el valor autocompletado sigue siendo editable antes de calcular.                                            |
| Cambiar `margenPct`/`metaRentablePct`/`metaRevisarPct` reclasifica retroactivamente cualquier PDF/Excel ya exportado.                | Comportamiento esperado de una calculadora de solo lectura sobre parámetros configurables, igual que en spec 05.                                              |

## Lo que **no** está en este spec

- Cambios a la regla real de nómina de spec 01 (`pdfNominaService.ts`, `PanelDistribucion.tsx`): Auxiliar 2 sigue sin comisión ahí.
- Excel con diseño (colores/bordes) o librería `exceljs`.
- Historial de simulaciones guardado en Firestore.
- Relación entre costo por km / km promedio / permiso de descarga y datos reales de `mantenimientosUnidades` (spec 04) o del mapa/Leaflet.
- Checkbox para excluir al Vendedor de la simulación.
- Migración de los valores de `kilometraje` que ya existían en la colección `rutas`.

Cada uno de estos, si se necesita, va en un spec aparte.
