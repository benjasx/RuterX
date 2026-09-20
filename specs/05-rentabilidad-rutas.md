# 05 — Rentabilidad de Rutas

**Estado:** implementado
**Depende de:** Ninguno
**Fecha:** 2026-09-20

**Objetivo:** Construir una calculadora de rentabilidad por ruta, réplica del modelo de la hoja de cálculo del usuario (`calculo de rentabilidad.pdf`), que al elegir una ruta autocompleta sus parámetros conocidos (viático por rol y kilometraje) y, con los demás campos editables (venta programada, precio del diésel), calcula el gasto operativo total, la contribución y si la ruta es "Óptima" según una meta configurable (por defecto 40% gasto / 60% rentabilidad, medida sobre la contribución, no sobre la venta).

## Revisión de este spec (2026-09-20)

Esta es una reestructuración completa de la versión anterior de este mismo spec. La primera versión interpretó el pedido del usuario como un **reporte** sobre viajes ya despachados en `distribucion_diaria`, usando solo `viaticoRuta + comisionChofer + comisionAyudante` como "gasto operativo" y comparándolo contra la venta total. Tras revisar con el usuario una captura de la hoja de cálculo original, quedó claro que el pedido es una **calculadora/simulador** (como el Excel: seleccionas una ruta, ajustas un puñado de celdas y obtienes el desglose completo), que replica todas las líneas de gasto del documento (salarios, viáticos, comisiones, combustible, gasto legal, mantenimiento) y dos razones financieras (% de contribución, % al costo sin impuesto) que no se habían considerado antes. Esta versión reemplaza por completo el enfoque y el modelo de datos de la anterior; lo ya codificado en la rama `spec-05-rentabilidad-rutas` para la versión previa se reescribe siguiendo el plan de abajo.

## Contexto

La hoja de cálculo del usuario modela el costo diario de operar una ruta y su contribución, con esta estructura (columna "Semanal", "x Día", "Gasto Calculado x Día"):

- **Salarios** (semanal, dividido entre 7 para el día): Chofer $2,500.00, Ayudante 1 y Ayudante 2 $1,951.60 cada uno.
- **Viáticos** (por rol, celda editable/amarilla): Chofer, Ayudante 1, Ayudante 2 — en el ejemplo $180.00 cada uno, pero esto es exactamente la "tarifa por persona" que ya existe en `ajustesNominaService.viaticosRutas` (spec 01), donde Mazatlán = $300. Al elegir una ruta, los tres campos deben autocompletarse con esa tarifa.
- **Comisiones**: Chofer (`comisionChofer` sobre la venta) y Ayudante 1 (`comisionAyudante` sobre la venta) — mismos porcentajes ya configurados en `ajustesNominaService.ts`; el Excel no cobra comisión de Ayudante 2, igual que ya hace `calcularFinanzas` en `PanelDistribucion.tsx` hoy (un solo campo `comisionAyudante`, no se duplica).
- **Combustible**: `kilometraje de la ruta × precio del diésel ÷ rendimiento (km/l)`. El kilometraje por ruta no existe hoy en ningún lado de la app — es un dato nuevo que el usuario va a capturar por ruta (ej. Mazatlán = 587 km), y debe vivir en la colección `rutas` (`src/firebase/rutasService.ts`), la misma que alimenta el panel "Añadir Rutas" (`GestionRutas.tsx`).
- **Gasto legal promedio** (Tenencia, Placas, Póliza, Tarjeta Fed.) y **Gasto de mantenimiento promedio por unidad**: promedios diarios que el usuario ya tiene calculados por fuera (no se derivan de `mantenimientosUnidades` de la spec 04); son parámetros globales que cambian rara vez.
- **Gasto Total Ruta** = suma de todo lo anterior.
- **Cantidad de entrega programada $** (venta): celda editable/amarilla, capturada a mano en cada simulación.
- **Cantidad de entrega programada Al Costo/Sin Impuestos** = `Venta × (1 − % Promedio al Costo S/Impuesto)`.
- **Contribución Promedio Real** = `Al Costo × % Promedio de Contribución`.
- El "Gasto Total Ruta" se expresa como % de la venta al costo (3.17% en el ejemplo) y, más relevante para la meta del usuario, como % de la **Contribución Promedio Real** (42.91% en el ejemplo — de ahí sale la meta simplificada de "40%").
- **Contribución real después de Gastos de Reparto** = `Contribución Promedio Real − Gasto Total Ruta`, expresada igual en % de la venta al costo (4.23%) y en % de la Contribución Promedio Real (57.09% — de ahí el "60%" de la meta del usuario).

La meta 40%/60% que pidió el usuario se aplica entonces sobre `Gasto Total Ruta ÷ Contribución Promedio Real`, no sobre `Gasto Total Ruta ÷ Venta` (que en el ejemplo del Excel es apenas 2.75%, un número que no tiene relación con 40/60). Esta es la corrección de fondo respecto a la primera versión del spec.

## Alcance

**Dentro:**

- **Kilometraje por ruta**: agregar `kilometraje?: number` a la interfaz `Ruta` (`src/firebase/rutasService.ts`) y una función nueva `actualizarRutaFirebase(id, datos)`. En `GestionRutas.tsx` (panel "Añadir Rutas"), cada tarjeta de ruta gana un campo numérico editable "Km" con botón para guardarlo, usando esa función nueva.
- **Nuevo panel "Ajustes de Rentabilidad"** (`PanelAjustesRentabilidad.tsx`, sub-vista `"ajustesRentabilidad"`, **solo admin**), con un nuevo servicio `src/firebase/ajustesRentabilidadService.ts` (mismo patrón que `ajustesNominaService.ts`, documento `configuracion/ajustes_rentabilidad`) que guarda los parámetros que casi no cambian:
  - `salarioSemanalChofer` (default `2500`), `salarioSemanalAyudante` (default `1951.60`, aplica igual a Ayudante 1 y Ayudante 2).
  - `rendimientoKmPorLitro` (default `4.21`).
  - `gastoLegalDiario` (default `160.53`).
  - `gastoMantenimientoDiario` (default `415.88`).
  - `pctPromedioContribucion` (default `7.40`, en porcentaje entero/decimal, ej. `7.4`).
  - `pctPromedioCostoSinImpuesto` (default `13.22`).
  - `precioDieselDefault` (default `28.43`) — valor de partida editable en cada simulación, no fijo.
  - `metaGastoOperativoPct` (default `40`) — se mueve aquí desde `AjustesNomina` (donde se había agregado en la primera versión de este spec); ya no vive en "Reglas de viáticos".
- **Reversión de la primera versión**: quitar `metaGastoOperativoPct` de la interfaz `AjustesNomina` (`ajustesNominaService.ts`) y del input agregado en `PanelAjustesNomina.tsx`.
- **Reescritura de `src/utils/rentabilidadUtils.ts`**: función `calcularSimulacionRentabilidad(input, ajustesRentabilidad, ajustesNomina)` que implementa todas las fórmulas de la sección "Contexto" (ver "Datos" abajo para las interfaces exactas).
- **Reescritura de `PanelRentabilidad.tsx`** (sub-vista `"rentabilidad"`, ya existente, visible para `admin`, `jefeReparto` y `embarques`) como calculadora:
  - Selector de ruta (`obtenerRutasFirebase`). Al elegirla, autocompleta: los tres campos de viático (Chofer/Ayudante 1/Ayudante 2) con la tarifa de `ajustesNomina.viaticosRutas` que corresponda a esa ruta (mismo matching normalizado que ya usa `calcularFinanzas` en `PanelDistribucion.tsx`), y el kilometraje con `ruta.kilometraje` (vacío/0 si la ruta todavía no lo tiene capturado).
  - Dos checkboxes "Ayudante 1 va" / "Ayudante 2 va" (default marcados); al desmarcar uno, su salario y su viático se calculan en $0 (tripulación fija de 3 roles, con la opción de excluir a alguno).
  - Campos editables ("amarillos", igual que en el Excel): Viático Chofer, Viático Ayudante 1, Viático Ayudante 2, Kilometraje, Venta Programada, Precio del Diésel (precargado con `precioDieselDefault`, pero editable).
  - El resto de los valores (salarios, comisiones, gasto legal, gasto mantenimiento, rendimiento, % de contribución, % al costo, meta) se muestran de solo lectura, tomados de "Ajustes de Rentabilidad"/"Reglas de viáticos".
  - Resultado calculado en vivo (sin botón "Calcular" — se recalcula en cada cambio), mostrando exactamente las líneas del Excel: Salario Chofer/Ayudante 1/Ayudante 2 (día), Viático Chofer/Ayudante 1/Ayudante 2, Comisión Chofer, Comisión Ayudante, Gasto Combustible, Gasto Legal, Gasto Mantenimiento, **Gasto Total Ruta** (monto y $/km), Venta Programada, Al Costo/Sin Impuestos, **Contribución Promedio Real**, **Contribución Real Después de Gastos de Reparto**, con sus porcentajes (vs. Al Costo y vs. Contribución Promedio Real), y un badge final **"Óptima"/"No óptima"** según `Gasto Total Ruta ÷ Contribución Promedio Real` comparado contra `metaGastoOperativoPct`.
  - Si `Venta Programada` es `0` o está vacía, los porcentajes y el badge muestran "—" (no se puede dividir entre cero) en vez de `NaN`/`Infinity`.
  - Sin selector de rango de fechas ni tabla de viajes históricos (eso desaparece de este panel; ver "Fuera de alcance").
  - Botón "Exportar PDF" que descarga una ficha de una sola página con el desglose completo de la simulación actual (`Rentabilidad_<Ruta>_<fecha del día>.pdf`), reemplazando el reporte tabular de la versión anterior.
- **Reescritura de `src/utils/reportesRentabilidadUtils.ts`**: `exportarSimulacionRentabilidadPDF(input, resultado, ruta, fecha)`, portrait, patrón de encabezado tipo membrete ya usado en el resto de la app, con el mismo desglose que la pantalla.
- **Sidebar**: nueva sub-vista `"ajustesRentabilidad"` (ícono `SlidersHorizontal`, solo admin) además de la ya existente `"rentabilidad"` (sin cambios de permisos: admin/jefeReparto/embarques).

**Fuera de alcance (para otro spec si hace falta):**

- No se guarda historial de simulaciones; es una calculadora en pantalla, igual que el Excel — cada simulación se recalcula, no se persiste en Firestore.
- No vuelve a existir el reporte por rango de fechas sobre viajes ya despachados de la primera versión de este spec; si se necesita ese reporte histórico además de esta calculadora, es un spec aparte.
- El gasto de mantenimiento y el gasto legal siguen siendo promedios globales capturados a mano en "Ajustes de Rentabilidad"; no se derivan de `mantenimientosUnidades` (spec 04) ni varían por unidad específica.
- El kilometraje es un solo número por ruta (el recorrido total de ida, tal como lo indicó el usuario para Mazatlán = 587 km); no se modela la fórmula de prorrateo semanal/diario que aparecía en la celda "promedio km recorrido rutas más larga (566 km) → 317.60" del Excel original — se simplifica a un solo valor por ruta usado directo en el cálculo de combustible.
- La comisión de Ayudante 2 sigue sin existir (igual que hoy en `calcularFinanzas`); solo hay comisión de Chofer y de un Ayudante.
- No se valida que `pctPromedioContribucion` + `pctPromedioCostoSinImpuesto` o cualquier combinación de parámetros de "Ajustes de Rentabilidad" tenga sentido financiero; se confía en los valores que capture el admin.
- No se relaciona el kilometraje de la ruta con el mapa/Leaflet ni con la distancia real calculada por `calcularRutaOptimaYCarretera`; es un campo capturado a mano por el usuario.
- No se agrega edición de kilometraje al mapa ni a ningún otro panel más que "Añadir Rutas".

## Datos

```ts
// Ajuste a rutasService.ts
export interface Ruta {
  id: string;
  nombre: string;
  kilometraje?: number; // NUEVO — km del recorrido de esa ruta, capturado a mano
}
// Nueva función: actualizarRutaFirebase(id: string, datos: Partial<Pick<Ruta, "nombre" | "kilometraje">>)

// Nuevo: src/firebase/ajustesRentabilidadService.ts
export interface AjustesRentabilidad {
  salarioSemanalChofer: number; // default 2500
  salarioSemanalAyudante: number; // default 1951.60 (aplica a Ayudante 1 y 2)
  rendimientoKmPorLitro: number; // default 4.21
  gastoLegalDiario: number; // default 160.53
  gastoMantenimientoDiario: number; // default 415.88
  pctPromedioContribucion: number; // default 7.40
  pctPromedioCostoSinImpuesto: number; // default 13.22
  precioDieselDefault: number; // default 28.43
  metaGastoOperativoPct: number; // default 40
}

// Reversión en ajustesNominaService.ts: se quita metaGastoOperativoPct
// de AjustesNomina (vuelve a solo comisionChofer/comisionAyudante/
// comisionTLMK/viaticosRutas, igual que antes de la primera versión de
// este spec).

// Reescritura de src/utils/rentabilidadUtils.ts
export interface SimulacionRentabilidadInput {
  ruta: string;
  kilometraje: number;
  viaticoChofer: number;
  viaticoAyudante1: number;
  viaticoAyudante2: number;
  ayudante1Va: boolean;
  ayudante2Va: boolean;
  ventaProgramada: number;
  precioDiesel: number;
}

export interface SimulacionRentabilidadResultado {
  salarioChofer: number; // salarioSemanalChofer / 7
  salarioAyudante1: number; // ayudante1Va ? salarioSemanalAyudante / 7 : 0
  salarioAyudante2: number; // ayudante2Va ? salarioSemanalAyudante / 7 : 0
  viaticoChofer: number;
  viaticoAyudante1: number; // 0 si !ayudante1Va
  viaticoAyudante2: number; // 0 si !ayudante2Va
  comisionChofer: number; // ventaProgramada * ajustesNomina.comisionChofer
  comisionAyudante: number; // ayudante1Va ? ventaProgramada * ajustesNomina.comisionAyudante : 0
  gastoCombustible: number; // kilometraje * precioDiesel / rendimientoKmPorLitro
  gastoLegal: number; // ajustesRentabilidad.gastoLegalDiario
  gastoMantenimiento: number; // ajustesRentabilidad.gastoMantenimientoDiario
  gastoTotalRuta: number; // suma de las 11 líneas anteriores
  pesosPorKm: number | null; // gastoTotalRuta / kilometraje, null si kilometraje <= 0
  ventaProgramada: number;
  cantidadAlCosto: number; // ventaProgramada * (1 - pctPromedioCostoSinImpuesto / 100)
  contribucionPromedioReal: number; // cantidadAlCosto * (pctPromedioContribucion / 100)
  contribucionRealDespuesGastos: number; // contribucionPromedioReal - gastoTotalRuta
  pctGastoVsAlCosto: number | null; // null si ventaProgramada <= 0
  pctGastoVsContribucion: number | null; // null si contribucionPromedioReal <= 0
  pctContribucionRealVsAlCosto: number | null;
  pctContribucionRealVsContribucion: number | null;
  esOptima: boolean | null; // pctGastoVsContribucion <= metaGastoOperativoPct, null si no se puede calcular
}
```

No se crea ninguna colección de Firestore nueva más allá del documento único `configuracion/ajustes_rentabilidad` (mismo patrón que `configuracion/ajustes_nomina`) y el campo nuevo `kilometraje` en los documentos ya existentes de `rutas`.

## Plan de implementación

1. En `src/firebase/rutasService.ts`: agregar `kilometraje?: number` a `Ruta` y la función `actualizarRutaFirebase(id, datos)` (patrón `updateDoc`, try/catch igual que `agregarRutaFirebase`).
2. En `src/components/GestionRutas.tsx`: agregar, en cada tarjeta de ruta, un input numérico "Km" (valor `ruta.kilometraje ?? ""`) con un botón para guardar que llame a `actualizarRutaFirebase` y actualice `listaRutas` + invalide la caché `["rutas"]`.
3. Verificar con `npm run build` que no hay errores de tipos.
4. En `src/firebase/ajustesNominaService.ts`: quitar `metaGastoOperativoPct` de la interfaz `AjustesNomina` y de los dos `return` por defecto (revertir la primera versión de este spec).
5. En `src/components/PanelAjustesNomina.tsx`: quitar el input "Meta de Gasto Operativo (%)" agregado en la primera versión.
6. Verificar con `npm run build` que no hay errores de tipos.
7. Crear `src/firebase/ajustesRentabilidadService.ts` con `AjustesRentabilidad`, `obtenerAjustesRentabilidad`/`guardarAjustesRentabilidad`, documento `configuracion/ajustes_rentabilidad`, defaults como en "Datos".
8. Crear `src/components/PanelAjustesRentabilidad.tsx` (mismo patrón visual que `PanelAjustesNomina.tsx`): `useQuery`/`useState` de `AjustesRentabilidad`, un input por cada uno de los 9 campos, botón "Guardar".
9. Verificar con `npm run build` que no hay errores de tipos.
10. Reescribir `src/utils/rentabilidadUtils.ts` con `SimulacionRentabilidadInput`, `SimulacionRentabilidadResultado` y `calcularSimulacionRentabilidad(input, ajustesRentabilidad, ajustesNomina)` implementando las fórmulas de "Contexto"/"Datos" (con las guardas de `null` cuando `ventaProgramada`/`kilometraje`/`contribucionPromedioReal` sean `0`).
11. Reescribir `src/components/PanelRentabilidad.tsx` como calculadora: `useQuery` de `obtenerRutasFirebase`, `obtenerAjustesRentabilidad`, `obtenerAjustesNomina`; estado del formulario (ruta seleccionada, los 6 campos amarillos, los 2 checkboxes de ayudantes); autocompletado al cambiar de ruta (viáticos desde `viaticosRutas`, kilometraje desde `ruta.kilometraje`); `useMemo` que llama a `calcularSimulacionRentabilidad`; tabla/desglose de resultado con badge Óptima/No óptima.
12. Verificar con `npm run build` que no hay errores de tipos.
13. Reescribir `src/utils/reportesRentabilidadUtils.ts` con `exportarSimulacionRentabilidadPDF(input, resultado, ruta, fecha)`, portrait, encabezado tipo membrete, desglose completo, pie de página (mismo patrón que el resto de reportes de la app); enlazar el botón "Exportar PDF" del panel.
14. Verificar con `npm run build` que no hay errores de tipos.
15. En `src/components/SidebarAdmin.tsx`: agregar `"ajustesRentabilidad"` a `SubVistaAdmin`, `permisos.ajustesRentabilidad = esAdmin(usuarioEmail)`, e ítem "Ajustes de Rentabilidad" (ícono `SlidersHorizontal`).
16. En `src/components/AdminPanel.tsx`: importar `PanelAjustesRentabilidad` y renderizarlo en `menuActivo === "ajustesRentabilidad"`.
17. Verificar con `npm run build` que no hay errores de tipos.
18. Prueba manual: en "Añadir Rutas", capturar kilometraje para al menos 2 rutas (ej. Mazatlán = 587) y confirmar que se guarda y persiste al recargar.
19. Prueba manual: en "Ajustes de Rentabilidad" (visible solo para admin), capturar los valores de ejemplo del Excel y guardarlos; confirmar que un chofer/vendedor no ve esta sub-vista en el sidebar.
20. Prueba manual: en "Rentabilidad de Rutas", seleccionar Mazatlán y confirmar que los 3 campos de viático autocompletan a la tarifa configurada en "Reglas de viáticos" para esa ruta, y que el kilometraje autocompleta al capturado en el paso 18.
21. Prueba manual: con una venta programada de prueba, confirmar que Gasto Combustible, Gasto Total Ruta, $/km, Al Costo, Contribución Promedio Real, Contribución Real Después de Gastos y sus porcentajes coinciden con las fórmulas del spec (verificar a mano con calculadora al menos un caso).
22. Prueba manual: desmarcar "Ayudante 2 va" y confirmar que su salario y viático bajan a $0 y el Gasto Total Ruta se recalcula de inmediato.
23. Prueba manual: cambiar `metaGastoOperativoPct` en "Ajustes de Rentabilidad" y confirmar que el badge Óptima/No óptima de la simulación actual cambia según corresponda.
24. Prueba manual: con Venta Programada en `0`, confirmar que los porcentajes y el badge muestran "—" en vez de un error o `NaN`.
25. Prueba manual: exportar el PDF de una simulación y confirmar que su contenido coincide exactamente con el desglose mostrado en pantalla.

Cada paso deja la app compilando y funcional.

## Criterios de aceptación

- [ ] Cada ruta de la colección `rutas` puede tener un `kilometraje` capturado y editado desde "Añadir Rutas", y ese valor persiste en Firestore.
- [ ] "Ajustes de Rentabilidad" es visible solo para `admin`; un `jefeReparto`, `embarques`, chofer o vendedor no lo ven en el sidebar.
- [ ] "Rentabilidad de Rutas" sigue siendo visible para `admin`, `jefeReparto` y `embarques`.
- [ ] Los 9 parámetros de "Ajustes de Rentabilidad" (salarios, rendimiento, gasto legal, gasto mantenimiento, % contribución, % al costo, precio diésel por defecto, meta de gasto operativo) se guardan y persisten.
- [ ] `AjustesNomina` ya no tiene el campo `metaGastoOperativoPct`; ese campo y su input en "Reglas de viáticos" quedaron revertidos.
- [ ] Al seleccionar una ruta en la calculadora, los campos Viático Chofer/Ayudante 1/Ayudante 2 se autocompletan con la tarifa de esa ruta en `viaticosRutas`, y el campo Kilometraje se autocompleta con el `kilometraje` guardado en esa ruta; los tres viáticos y el kilometraje siguen siendo editables después de autocompletarse.
- [ ] Desmarcar "Ayudante 1 va" o "Ayudante 2 va" pone en $0 el salario, el viático y (solo para Ayudante 1) la comisión de ese rol, y el Gasto Total Ruta se recalcula de inmediato.
- [ ] `Gasto Combustible` = `Kilometraje × Precio del Diésel ÷ Rendimiento km/l` configurado.
- [ ] `Gasto Total Ruta` = suma de salarios (día) de los roles activos + viáticos de los roles activos + comisión Chofer + comisión Ayudante (solo si Ayudante 1 va) + Gasto Combustible + Gasto Legal + Gasto Mantenimiento.
- [ ] `Al Costo/Sin Impuestos` = `Venta Programada × (1 − % Promedio al Costo S/Impuesto ÷ 100)`.
- [ ] `Contribución Promedio Real` = `Al Costo × (% Promedio de Contribución ÷ 100)`.
- [ ] `Contribución Real Después de Gastos de Reparto` = `Contribución Promedio Real − Gasto Total Ruta`.
- [ ] La ruta se marca **"Óptima"** cuando `Gasto Total Ruta ÷ Contribución Promedio Real × 100` es menor o igual a `metaGastoOperativoPct`; si no, **"No óptima"**.
- [ ] Cambiar `metaGastoOperativoPct` en "Ajustes de Rentabilidad" cambia, sin tocar código, qué simulaciones se marcan "Óptima".
- [ ] Con `Venta Programada` en `0` o vacía, los porcentajes y el badge de estado muestran "—" en vez de un valor inválido.
- [ ] El resultado se recalcula en vivo al cambiar cualquier campo editable, sin necesidad de un botón "Calcular".
- [ ] El botón "Exportar PDF" descarga una ficha de una sola página con el mismo desglose mostrado en pantalla para la simulación actual.
- [ ] `npm run build` pasa sin errores de tipo.

## Decisiones tomadas

- **Se reemplaza por completo el enfoque de "reporte sobre viajes ya despachados" de la primera versión de este spec, por una calculadora/simulador:** decisión explícita del usuario tras compartir la captura del Excel — el propósito real es decidir la rentabilidad de una ruta **antes** de despacharla, no auditarla después.
- **Meta 40/60 aplicada sobre `Gasto Total Ruta ÷ Contribución Promedio Real`, no sobre la venta total:** es la relación que realmente da ~42.91%/57.09% en el ejemplo del usuario; aplicar la meta sobre la venta bruta (que en el ejemplo da ~2.75%) no tendría relación con el 40/60 que pidió.
- **Kilometraje como campo nuevo en la colección `rutas`, capturado a mano por el usuario:** decisión explícita del usuario ("te voy a tener que pasar yo el kilometraje... se lo vamos a agregar a las rutas registradas"); no se deriva del mapa/Leaflet.
- **Kilometraje simplificado a un solo valor por ruta (sin el prorrateo semanal/diario "566 km → 317.60" del Excel original):** el usuario dio el ejemplo de Mazatlán = 587 km como un solo número a autocompletar; replicar el prorrateo original añadiría una conversión no solicitada y sin una regla clara para generalizarla a otras rutas.
- **Viáticos por rol autocompletados desde `ajustesNomina.viaticosRutas` (la tarifa por persona que ya existe, spec 01), no desde un catálogo nuevo:** el usuario dio como ejemplo Mazatlán = $300 para los tres roles, que es exactamente la tarifa ya configurada; reutilizar esa fuente evita mantener dos catálogos de viáticos por ruta.
- **Tripulación fija en 3 roles con checkboxes "va"/"no va", en vez de tripulación variable:** decisión explícita del usuario (recomendación aceptada); es la forma más simple de replicar el Excel (que siempre muestra Chofer + 2 Ayudantes) permitiendo excluir a alguno sin rehacer la fórmula.
- **Comisión de Ayudante 2 no existe, igual que en el Excel y en `calcularFinanzas` hoy:** el documento original solo tiene una fila "Comisión Ayudante 1"; no se introduce una comisión nueva para el segundo ayudante.
- **Sin persistencia de simulaciones (no se guarda historial en Firestore):** decisión explícita del usuario; es una calculadora en pantalla, igual que el Excel, más simple de implementar y suficiente para el caso de uso.
- **"Ajustes de Rentabilidad" como panel nuevo y separado de "Reglas de viáticos", solo para admin:** decisión explícita del usuario; evita mezclar comisiones/viáticos por ruta (que ya tienen su panel y hoy son editables por admin) con costos operativos estructurales (salarios, combustible, legal, mantenimiento) que son un tipo de dato distinto.
- **Precio del diésel con un valor por defecto configurable, pero editable en cada simulación:** decisión explícita del usuario; el precio cambia seguido, así que un default evita capturarlo desde cero cada vez, sin impedir ajustarlo el día que cambie.
- **Gasto legal y gasto de mantenimiento como promedios globales capturados a mano, no derivados de `mantenimientosUnidades` (spec 04):** mantiene la decisión de la primera versión de este spec de no mezclar esta calculadora con los datos de costo real de unidades; el usuario no pidió esa integración y el Excel tampoco la usa (son promedios calculados aparte por el propio usuario).
- **`metaGastoOperativoPct` se mueve de `AjustesNomina` a `AjustesRentabilidad`:** en la primera versión de este spec se agregó a "Reglas de viáticos" porque en ese momento la meta se aplicaba sobre datos de nómina (viático + comisiones); ahora que la meta se aplica sobre el modelo completo de rentabilidad, pertenece al panel nuevo dedicado a ese modelo.
- **Exportación PDF de una sola simulación (ficha de una página), en vez del reporte tabular multi-viaje de la primera versión:** consistente con el cambio de "reporte histórico" a "calculadora de un solo escenario a la vez".

## Riesgos identificados

| Riesgo                                                                                                                                     | Mitigación                                                                                                                                                  |
| ------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Una ruta sin `kilometraje` capturado da `Gasto Combustible = 0` y `$/km` indefinido, subestimando el gasto operativo.                      | El campo se muestra vacío/0 al autocompletar y sigue siendo editable; se documenta como dato pendiente de captura por el usuario, no como error de la app.  |
| Los parámetros de "Ajustes de Rentabilidad" (gasto legal, mantenimiento, % contribución, % al costo) quedan desactualizados con el tiempo. | Son responsabilidad del admin mantenerlos al día, igual que ya pasa con las comisiones y viáticos en "Reglas de viáticos"; no hay validación automática.    |
| Cambiar `metaGastoOperativoPct` reclasifica retroactivamente cualquier PDF ya exportado (el archivo viejo no se actualiza solo).           | Comportamiento esperado de una calculadora de solo lectura sobre parámetros configurables; si se necesita un histórico congelado, queda fuera de este spec. |

## Lo que **no** está en este spec

- Historial de simulaciones guardado en Firestore.
- Reporte agregado o histórico sobre viajes ya despachados (la versión anterior de este mismo spec).
- Relación entre gasto legal/mantenimiento y los datos reales de `mantenimientosUnidades` (spec 04).
- Prorrateo semanal/diario del kilometraje (se simplifica a un solo valor por ruta).
- Comisión para un segundo ayudante.
- Edición de kilometraje desde el mapa o desde cualquier panel distinto de "Añadir Rutas".

Cada uno de estos, si se necesita, va en un spec aparte.
