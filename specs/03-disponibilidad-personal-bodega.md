# 03 — Disponibilidad de Personal en Bodega (Distribución Diaria)

**Estado:** aprobado
**Depende de:** Ninguno
**Fecha:** 2026-09-19

**Objetivo:** Agregar en `PanelDistribucion.tsx` un botón que muestre, para la fecha de salida seleccionada, la tabla de choferes y auxiliares que quedan disponibles en bodega (no asignados a ninguna ruta y sin ausencia ese día), exportable a PDF y Excel.

## Contexto

`PanelDistribucion.tsx` ya calcula, para la `fechaSeleccionada`, tres piezas de información que hoy solo se usan para deshabilitar opciones en los `<select>` de la tabla:

- `choferesUsados` / `auxiliaresUsados` (`PanelDistribucion.tsx:237-254`): nombres ya asignados en alguna fila con ruta/unidad/chofer.
- `estadoPorNombre` (`PanelDistribucion.tsx:190-202`): empleados con `estadoEfectivo` distinto de `"Disponible"` ese día (vacaciones, incapacidad, permiso, descanso, falta, inactivo), vía `estadoEfectivo` de `vacacionesUtils.ts`.
- `listaChoferes` / `listaAuxiliares` (`PanelDistribucion.tsx:204-224`): nombres de `choferesData` clasificados como Chofer o Auxiliar según el campo `rol`/`puesto`/`tipo` del documento.

No existe hoy ninguna vista que muestre el complemento de `choferesUsados`/`auxiliaresUsados`/`estadoPorNombre`: quién sigue de alta, no está de baja ese día, y no fue asignado a ninguna ruta, es decir, quién queda en bodega el día en que los demás salen a reparto.

## Alcance

**Dentro:**

- Botón nuevo "Personal en Bodega" en la barra de acciones de `PanelDistribucion.tsx`, visible para `admin`, `embarques` y `jefeReparto` (nuevo permiso `puedeVerPersonalBodega`, más amplio que el `tienePermisosEspeciales` actual que solo cubre admin/embarques).
- Al hacer clic, un modal con el mismo patrón visual que el modal "Vista para WhatsApp" ya existente (`mostrarCaptura`): overlay, logo CIR, fecha larga (`formatearFechaLarga`) y una tabla.
- La tabla muestra, para la `fechaSeleccionada`, una sola lista (no dos columnas separadas) con las columnas **Nombre**, **Puesto** (Chofer/Auxiliar) y **Teléfono**, ordenada alfabéticamente por nombre.
- Un empleado de `choferesData` aparece en esa lista si cumple las dos condiciones a la vez:
  1. Su nombre no está en `choferesUsados` ni en `auxiliaresUsados`.
  2. Su nombre no está en `estadoPorNombre` (su `estadoEfectivo` ese día es `"Disponible"`).
- Clasificación de Puesto: mismo criterio que ya usa `listaChoferes`/`listaAuxiliares` (si `rol`/`puesto`/`tipo` incluye "ayudante" o "auxiliar" → "Auxiliar"; si no → "Chofer").
- Si la lista resulta vacía, el modal muestra el mensaje "Todo el personal está asignado o no disponible" en vez de una tabla vacía.
- Dentro del modal, dos botones de exportación: "Excel" (patrón `exportarResumenExcel`, SheetJS) y "PDF" (nueva función `exportarPersonalBodegaPDF` en `reportesDistribucionUtils.ts`, patrón `exportarDistribucionPDF`), ambos exportando exactamente la lista que se está viendo.
- Nombres de archivo: `PERSONAL_BODEGA_${fechaSeleccionada}.xlsx` y `PERSONAL_BODEGA_${fechaSeleccionada}.pdf`.

**Fuera:**

- No se persiste esta lista en Firestore ni se crea ninguna colección o servicio nuevo; es un cálculo derivado en memoria de datos ya cargados (`choferesData`, `vacacionesData`, `filas`).
- No incluye unidades/vehículos disponibles, solo personal (choferes y auxiliares).
- No modifica `filas`, la tabla principal, ni la lógica de `disabled` de los `<select>` existentes.
- No cambia el permiso `tienePermisosEspeciales` actual (que sigue gobernando "Vincular XLSX", "Generar Resumen" y "Eliminar fila"); el nuevo permiso `puedeVerPersonalBodega` es exclusivo del botón e infraestructura de este spec.
- No agrega el rol `jefeReparto` a ningún otro botón existente del panel.

## Datos

Este spec no introduce colecciones ni campos nuevos en Firestore. Introduce una estructura derivada, en memoria, calculada dentro de `PanelDistribucion.tsx`:

```ts
// personalDisponibleBodega: derivado de choferesData + choferesUsados + auxiliaresUsados + estadoPorNombre
type PersonaBodega = {
  nombre: string; // ya en mayúsculas, igual que choferesUsados/listaChoferes
  puesto: "Chofer" | "Auxiliar";
  telefono: string; // c.telefono || ""
};
```

## Plan de implementación

1. En `src/utils/roles.ts` no se agrega nada nuevo: `esJefeReparto` ya existe y se importa en `PanelDistribucion.tsx` (hoy solo se importan `esAdmin`/`esEmbarques`).
2. En `PanelDistribucion.tsx`: importar `esJefeReparto as checkEsJefeReparto`, calcular `esJefeRepartoActual = checkEsJefeReparto(correoActual)` y `puedeVerPersonalBodega = tienePermisosEspeciales || esJefeRepartoActual`.
3. En `PanelDistribucion.tsx`: agregar `useMemo` `personalDisponibleBodega` que recorra `choferesData`, excluya nombres presentes en `choferesUsados`/`auxiliaresUsados` o en `estadoPorNombre`, clasifique Puesto con el mismo criterio de `listaChoferes`/`listaAuxiliares`, y devuelva el arreglo `PersonaBodega[]` ordenado por nombre.
4. En `PanelDistribucion.tsx`: agregar estado `mostrarBodega` (boolean, default `false`) y el botón "Personal en Bodega" (ícono `Users` de `lucide-react`) junto a "Vista WhatsApp", visible solo si `puedeVerPersonalBodega`.
5. En `PanelDistribucion.tsx`: agregar el modal de "Personal en Bodega" reutilizando la estructura del modal `mostrarCaptura` (overlay, logo, fecha larga, tabla, botón cerrar), renderizando `personalDisponibleBodega` con columnas Nombre/Puesto/Teléfono, y el mensaje de lista vacía cuando corresponda.
6. En `PanelDistribucion.tsx`: agregar función `exportarPersonalBodegaExcel` (patrón `exportarResumenExcel`: `XLSX.utils.json_to_sheet` + `XLSX.writeFile`) y su botón dentro del modal.
7. En `src/utils/reportesDistribucionUtils.ts`: crear y exportar `exportarPersonalBodegaPDF(personal: PersonaBodega[], fechaSeleccionada: string)`, siguiendo el patrón pdfMake de `exportarDistribucionPDF` (logo, fuente Roboto ya registrada) pero en orientación portrait con tabla Nombre/Puesto/Teléfono; importarla y llamarla desde el botón "PDF" del modal en `PanelDistribucion.tsx`.
8. Verificar con `npm run build` que no hay errores de tipos.
9. Prueba manual: con datos reales o de prueba, asignar algunas rutas para una fecha, marcar a alguien de vacaciones/incapacidad ese día, y confirmar que la lista de "Personal en Bodega" excluye correctamente a los asignados y a los no disponibles, mostrando solo al resto con su Puesto y Teléfono correctos.
10. Prueba manual: confirmar que el botón es visible para `admin`, `embarques` y `jefeReparto`, y que un usuario chofer normal no lo ve (no entra a `AdminPanel`, así que no aplica, pero verificar que ningún otro correo sin rol especial lo vea si llegara a entrar al panel).
11. Prueba manual: exportar Excel y PDF desde el modal y confirmar que el contenido coincide exactamente con la tabla mostrada.

Cada paso deja la app compilando y funcional.

## Criterios de aceptación

- [ ] El botón "Personal en Bodega" es visible en `PanelDistribucion` para `admin`, `embarques` y `jefeReparto`.
- [ ] Un chofer sin rol especial no ve el botón "Personal en Bodega".
- [ ] Al abrir el modal, la tabla muestra únicamente empleados que no están en `choferesUsados` ni en `auxiliaresUsados` para la fecha seleccionada.
- [ ] Un empleado con `estadoEfectivo` distinto de "Disponible" ese día (vacaciones, incapacidad, permiso, descanso, falta, inactivo) no aparece en la lista aunque no esté asignado a ninguna ruta.
- [ ] La columna "Puesto" clasifica correctamente Chofer vs. Auxiliar usando el mismo criterio que `listaChoferes`/`listaAuxiliares`.
- [ ] La columna "Teléfono" muestra el valor de `telefono` del documento de `choferesData`, o vacío si no existe.
- [ ] Si no queda nadie disponible, el modal muestra el mensaje "Todo el personal está asignado o no disponible" en vez de una tabla vacía.
- [ ] Cambiar la `fechaSeleccionada` recalcula la lista de disponibles sin recargar la página.
- [ ] El botón "Excel" del modal descarga `PERSONAL_BODEGA_<fecha>.xlsx` con las mismas filas y columnas que la tabla mostrada.
- [ ] El botón "PDF" del modal descarga `PERSONAL_BODEGA_<fecha>.pdf` con las mismas filas y columnas que la tabla mostrada.
- [ ] `npm run build` pasa sin errores de tipo.

## Decisiones tomadas

- **Cálculo 100% derivado en memoria, sin Firestore nuevo:** toda la información (choferes, ausencias, asignaciones del día) ya está cargada en `PanelDistribucion.tsx` vía TanStack Query; no hay razón para duplicarla en una colección nueva.
- **Una sola tabla con columna "Puesto" en vez de dos listas separadas:** más simple de exportar a Excel/PDF y de mantener ordenada alfabéticamente.
- **Incluir columna Teléfono:** el propósito del reporte es poder contactar/organizar a quien se queda en bodega ese día.
- **Permiso `puedeVerPersonalBodega` propio, en vez de ampliar `tienePermisosEspeciales`:** evita darle a `jefeReparto` acceso a "Vincular XLSX", "Generar Resumen" o "Eliminar fila", que no pidió el usuario y que hoy son exclusivos de admin/embarques.
- **Modal con el mismo patrón visual que "Vista para WhatsApp" (`mostrarCaptura`):** reutiliza un patrón ya validado en el mismo archivo en vez de introducir un componente de modal genérico nuevo.
- **PDF en orientación portrait, no landscape:** la tabla es de solo 3 columnas (Nombre/Puesto/Teléfono), a diferencia de la tabla de rutas que sí necesita landscape.
- **Sin columna de unidades disponibles:** el usuario pidió específicamente personal (choferes y auxiliares), no vehículos; queda fuera de este spec.

## Riesgos identificados

| Riesgo                                                                                                                    | Mitigación                                                                                                              |
| ------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Un empleado sin `rol`/`puesto`/`tipo` definido en Firestore se clasifica como "Chofer" por defecto.                       | Mismo comportamiento que ya tiene hoy `listaChoferes`/`listaAuxiliares`; no es un caso nuevo introducido por este spec. |
| Un empleado sin `telefono` capturado en su documento de `choferesService` muestra la celda vacía en la tabla/exportación. | Se acepta como limitación conocida; el dato se corrige actualizando el directorio de choferes, fuera de este spec.      |
