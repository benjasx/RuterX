# 01 — Reparto de viáticos entre chofer y auxiliares

**Estado:** aprobado
**Depende de:** Ninguno
**Fecha:** 2026-09-15

**Objetivo:** Que el viático de cada ruta se reparta entre el chofer y los auxiliares que realmente la trabajaron (en vez de pagarse completo a cada uno por separado), salvo la ruta `Suc.Vallarta (Traspaso)`, cuyo viático es siempre íntegro para el chofer.

## Contexto

`viaticoRuta` es un monto fijo por ruta (definido en la regla de viáticos, `ajustesNominaService.ts` → `viaticosRutas`) que se calcula una sola vez por fila/viaje en `PanelDistribucion.tsx:91` y se guarda tal cual en Firestore (colección `distribucion`, campo `viaticoRuta` de cada fila).

Hoy, en `src/utils/pdfNominaService.ts`, las tres funciones de reporte (`generarPDFNominaChoferes`, `generarPDFNominaAyudantes`, `generarPDFResumenGeneral`) leen `Number(v.viaticoRuta) || 0` y le asignan el **monto completo** a cada persona de la fila (chofer, auxiliar1, auxiliar2) de forma independiente. Resultado: si una ruta lleva chofer + 2 auxiliares, se paga 3 veces el viático real de esa ruta.

`PanelHistorial.tsx` (el archivo indicado por el usuario) no contiene lógica de cálculo — solo arma la lista de viajes y llama a las funciones de `pdfNominaService.ts`, que es donde vive el problema real.

## Alcance

**Dentro:**

- Repartir `viaticoRuta` entre los participantes reales de cada fila (chofer, auxiliar1, auxiliar2) en las tres funciones de `pdfNominaService.ts` que hoy lo pagan completo a cada uno.
- Excepción: en la ruta `Suc.Vallarta (Traspaso)`, el viático completo es siempre para el chofer; los auxiliares de esa fila (si los hay) reciben $0 de viático, sin importar cuántos vayan.
- Redondeo a centavos: si la división entre 2 o 3 no es exacta, el o los centavos sobrantes se acumulan en la parte del chofer (nunca se pierden ni se reparten fraccionados).
- **Extensión (agregada 2026-09-15):** selector de orden para el Resumen Maestro (`generarPDFResumenGeneral`), con 5 criterios: alfabético, por choferes, por auxiliares, monto de viático más alto, monto de viático más bajo. Ver sección "Orden del Resumen Maestro" más abajo.
- **Extensión (agregada 2026-09-15):** en el Resumen Maestro, ocultar a las personas cuyo viático total del rango sea $0 — solo cuando la casilla "Incluir Viáticos" está activa. Ver sección "Filtro de viático $0 en el Resumen Maestro" más abajo.

**Fuera:**

- No se toca el monto de `viaticoRuta` que se calcula y guarda en Firestore al armar la distribución (`PanelDistribucion.tsx`) — sigue siendo el total de la ruta, sin cambios.
- No se toca `Dashboard.tsx` ni `PanelHistorialCompleto.tsx`: ahí `viaticoRuta` se usa como costo total de la ruta (no como pago por persona), así que la lectura actual ya es correcta y no se modifica.
- No se agregan campos nuevos a Firestore ni se modifican registros existentes.
- No se toca la lógica de comisiones (`comisionChofer`/`comisionAyudante`), que queda exactamente igual.

## Datos

No se introduce ningún dato nuevo. Es un cambio puramente de cálculo, en tiempo de generación del reporte, a partir de campos que ya existen en cada fila (`chofer`, `auxiliar1`, `auxiliar2`, `viaticoRuta`, `ruta`).

## Regla de reparto

**Corrección post-implementación (2026-09-15):** la primera versión de esta
regla asumía que `viaticoRuta` era un total a repartir entre los presentes.
Es incorrecto: `viaticoRuta` es la **tarifa por persona** de la ruta (el valor
que está en `viaticosRutas` dentro de la regla de viáticos, ej. Mazatlán =
$300). Con tripulación completa (chofer + 2 auxiliares) cada quien recibe esa
tarifa completa — eso ya funcionaba bien antes de este spec. Lo que faltaba
era redistribuir la tarifa de los puestos vacíos entre quienes sí hicieron la
ruta. Se corrige aquí la fórmula; ver criterios de aceptación actualizados.

Para cada fila `v` (un viaje):

1. Si `v.ruta` normalizada (`.toUpperCase().trim()`) es `"SUC.VALLARTA (TRASPASO)"`:
   - `viaticoChofer = viaticoRuta` (la tarifa tal cual, sin bolsón ni reparto).
   - `viaticoAuxiliar1 = 0`, `viaticoAuxiliar2 = 0` (si están asignados).
2. En cualquier otra ruta:
   - Se cuentan los participantes válidos de la fila: chofer (siempre) + auxiliar1 (si tiene un nombre válido) + auxiliar2 (si tiene un nombre válido). `n` = 1, 2 o 3.
   - El "bolsón" de la ruta con tripulación completa es `3 × viaticoRuta` (chofer + 2 auxiliares, aunque no todos vayan).
   - Se calcula el bolsón en centavos y se divide entre `n` con `Math.floor` (parte entera por persona).
   - El residuo de centavos (0 a `n-1`) se suma completo a la parte del chofer.
   - Auxiliar1 y auxiliar2 (cuando participan) reciben cada uno la parte entera, sin residuo.
   - Ejemplo con tarifa $300 (Mazatlán) y 3 participantes: bolsón $900 / 3 = $300.00 para cada uno (idéntico al comportamiento previo a este spec).
   - Ejemplo con tarifa $300 y solo chofer + auxiliar1: bolsón $900 / 2 = $450.00 para cada uno.
   - Ejemplo con tarifa $300 y solo chofer (sin auxiliares): bolsón $900 / 1 = $900.00 para el chofer.
   - Ejemplo con tarifa $190 (Vallarta, ruta normal, no traspaso) y 3 participantes: bolsón $570 / 3 = $190.00 c/u.
   - Ejemplo con tarifa $190 y solo chofer + auxiliar1: bolsón $570 / 2 = $285.00 c/u.

"Nombre válido" de auxiliar reutiliza el criterio que ya usa `pdfNominaService.ts` (`procesarAyudante`): no vacío, y distinto de `"-"`, `"SIN AYUDANTE"`, `"UNDEFINED"`.

Como el reparto es simétrico entre auxiliar1 y auxiliar2 (ambos reciben siempre la misma parte cuando están presentes), la función auxiliar devuelve un único valor `auxiliar` reutilizable para ambos.

## Orden del Resumen Maestro

Aplica solo a `generarPDFResumenGeneral` (botón "Resumen Maestro" en `PanelHistorial.tsx`). Los otros dos reportes (Choferes, Auxiliares) no cambian.

Criterios, seleccionables desde un `<select>` nuevo junto al botón "Resumen Maestro":

1. **Alfabético** (default, comportamiento actual): nombre A-Z, sin cambios.
2. **Por choferes**: agrupa primero a todas las personas con `rol === "CHOFER"` (alfabético dentro del grupo), después las `"AUXILIAR"` (alfabético dentro del grupo).
3. **Por auxiliares**: igual que arriba pero al revés — primero `"AUXILIAR"`, después `"CHOFER"`.
4. **Monto de viático más alto**: ordena por la columna Viáticos, de mayor a menor.
5. **Monto de viático más bajo**: ordena por la columna Viáticos, de menor a mayor.

El campo `rol` ya existe en la estructura interna `totales` de `generarPDFResumenGeneral` (`"CHOFER"` o `"AUXILIAR"`), no hay que calcularlo de nuevo.

## Filtro de viático $0 en el Resumen Maestro

Aplica solo a `generarPDFResumenGeneral`. Cuando `mostrarViaticos` es `true`, las personas cuyo `viaticos` acumulado en el rango sea exactamente `0` se excluyen de la tabla (no aparecen como fila, no cuentan en los totales). Cuando `mostrarViaticos` es `false` (casilla "Incluir Viáticos" desmarcada), el filtro no aplica y se muestran todas las personas, igual que hoy — no tiene sentido ocultar a alguien por un dato que no se está mostrando en el reporte.

## Plan de implementación

1. En `src/utils/pdfNominaService.ts`, agregar una función auxiliar (junto a `fMoneda`/`fNumero`) que reciba una fila `v` y devuelva `{ chofer: number, auxiliar: number }` aplicando la regla de reparto de arriba (incluida la excepción de Vallarta y el redondeo con residuo al chofer).
2. En `generarPDFNominaChoferes`: reemplazar el cálculo de `viatico` (líneas 108-121) para usar esa función — `chofer` cuando `rol === "CHOFER"`, `auxiliar` cuando `rol === "AYUDANTE"`.
3. En `generarPDFNominaAyudantes`: reemplazar `const viatico = Number(v.viaticoRuta) || 0;` (línea 491) por `auxiliar` de la misma función.
4. En `generarPDFResumenGeneral`: reemplazar `totales[c].viaticos += Number(v.viaticoRuta) || 0;` (línea 823) por `chofer`, y `totales[ay].viaticos += Number(v.viaticoRuta) || 0;` (línea 845) por `auxiliar`.
5. Verificar con `npm run build` (incluye type-check) que no hay errores de tipos.
6. Probar manualmente en el panel Historial: generar los 3 PDFs (Reporte Choferes, Reporte Auxiliares, Resumen General) para un rango con viajes de 1, 2 y 3 participantes, y uno con ruta `Suc.Vallarta (Traspaso)`, y confirmar que los montos de viático cuadran con la regla.
7. En `PanelHistorial.tsx`, agregar estado `ordenResumen` (una de las 5 opciones, default `"alfabetico"`) y un `<select>` junto al botón "Resumen Maestro" para elegirlo.
8. Pasar `ordenResumen` como nuevo argumento de `handleDescargarResumenGeneral` → `generarPDFResumenGeneral`.
9. En `pdfNominaService.ts`, agregar parámetro `orden` a `generarPDFResumenGeneral` (default `"alfabetico"`) y una función que ordene las entradas de `totales` según el criterio elegido, reemplazando `Object.keys(totales).sort()`.
10. Verificar de nuevo con `npm run build`.
11. Probar manualmente los 5 criterios de orden en el Resumen Maestro.
12. En `generarPDFResumenGeneral`, tras armar `personalOrdenado`, filtrar las entradas con `data.viaticos === 0` cuando `mostrarViaticos` es `true` (cuando es `false`, no filtrar).
13. Verificar de nuevo con `npm run build`.

Cada paso deja la app funcional (el build sigue compilando y los reportes se siguen generando en cada punto intermedio).

## Criterios de aceptación

- [ ] Una fila con chofer + auxiliar1 + auxiliar2 y tarifa $300 (Mazatlán) asigna $300.00 a cada uno (bolsón $900 / 3), igual que antes de este spec.
- [ ] Una fila con solo chofer + auxiliar1 y tarifa $300 asigna $450.00 a cada uno (bolsón $900 / 2) en los 3 reportes.
- [ ] Una fila con solo chofer (sin auxiliares) y tarifa $300 asigna $900.00 al chofer (bolsón $900 / 1).
- [ ] Una fila con chofer + auxiliar1 y tarifa $190 asigna $285.00 a cada uno (bolsón $570 / 2).
- [ ] Una fila con `ruta === "Suc.Vallarta (Traspaso)"` (en cualquier combinación de mayúsculas/espacios) asigna el viático completo (la tarifa tal cual, sin bolsón) al chofer y $0 a cualquier auxiliar de esa fila, sin dividir.
- [ ] El total de viáticos por persona en el Resumen General (`generarPDFResumenGeneral`) coincide con la suma de lo mostrado en el Reporte de Choferes y el Reporte de Auxiliares para ese mismo rango de fechas.
- [ ] `npm run build` pasa sin errores de tipo.
- [ ] Las comisiones (`comisionChofer`/`comisionAyudante`) y el resto del PDF no cambian de comportamiento.
- [ ] El selector de orden del Resumen Maestro tiene las 5 opciones: alfabético, por choferes, por auxiliares, monto de viático más alto, monto de viático más bajo.
- [ ] "Alfabético" ordena por nombre A-Z (comportamiento actual, sin cambio).
- [ ] "Por choferes" agrupa primero a todos los `CHOFER` (alfabético dentro del grupo) y después los `AUXILIAR`.
- [ ] "Por auxiliares" agrupa primero a todos los `AUXILIAR` y después los `CHOFER`.
- [ ] "Monto de viático más alto" ordena la tabla de mayor a menor viático.
- [ ] "Monto de viático más bajo" ordena la tabla de menor a mayor viático.
- [ ] El orden elegido solo afecta al Resumen Maestro; Reporte Choferes y Reporte Auxiliares no cambian.
- [ ] En el Resumen Maestro, con "Incluir Viáticos" activo, una persona con viático total $0 en el rango no aparece en la tabla ni en los totales.
- [ ] En el Resumen Maestro, con "Incluir Viáticos" desmarcado, todas las personas aparecen (el filtro de $0 no aplica).
- [ ] El filtro de $0 no afecta a Reporte Choferes ni Reporte Auxiliares.

## Decisiones tomadas

- **Chofer solo, sin auxiliares → recibe el bolsón completo (3× la tarifa):** confirmado explícitamente por el usuario tras detectar el bug de la primera implementación (que dividía la tarifa en vez de multiplicarla). Es la misma fórmula (bolsón / n, residuo al chofer) aplicada consistentemente, no un caso especial aparte.
- **Redondeo:** los centavos sobrantes de la división siempre se acumulan en la parte del chofer, nunca se pierden ni se reparten entre auxiliares (decisión explícita del usuario).
- **Excepción de ruta:** solo aplica a la ruta exacta `Suc.Vallarta (Traspaso)` (existe tal cual en el catálogo de rutas de `mapaUtils.ts:38`, y su viático de $190 ya está en la regla de viáticos). No se generaliza a otras rutas de traspaso ni a otras sucursales.
- **`viaticoRuta` en Firestore no cambia:** sigue siendo el total de la ruta. El reparto se calcula solo al generar los reportes, no se persiste por persona — así cualquier reporte futuro usa siempre la regla vigente sin depender de cómo estaba repartido cuando se guardó el viaje.
- **`Dashboard.tsx` y `PanelHistorialCompleto.tsx` quedan fuera:** ahí `viaticoRuta` representa el costo total de la ruta para la empresa (no un pago por persona), por lo que la lectura actual (`Number(v.viaticoRuta) || 0` una sola vez por fila) ya es correcta y no hay nada que repartir.
