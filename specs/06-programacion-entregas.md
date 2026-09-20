# 06 — Programación de Entregas por Día

**Estado:** Aprobado
**Depende de:** Ninguno
**Fecha:** 2026-09-20

**Objetivo:** Agregar un panel "Programación de Entregas" donde se arma y edita, por día de la semana (Sábado a Viernes, sin Domingo), la lista de rutas con su monto mínimo de venta para poder despacharse, reemplazando la tabla en papel/Excel que hoy se pega en la pared, y exportarla a PDF en el mismo formato de matriz (una columna por día).

## Contexto

El usuario tiene hoy una tabla física ("ABARROTERA CIR — PROGRAMACIÓN DE ENTREGAS DE... CEDIS XALISCO") con 6 columnas, una por día (Sábado, Lunes, Martes, Miércoles, Jueves, Viernes), y en cada columna una lista de rutas con su monto mínimo de venta requerido para despachar ese día (ej. Sábado → "SAN BLAS $220,000.00", "18 DE MARZO $230,000.00"...; Martes → "IXTLAN PARRA $200,000.00", "IXTLAN JOEL $200,000.00"...). La misma ruta puede aparecer en más de un día con montos distintos (ej. "MAZATLAN" aparece en Lunes, Martes y Jueves con montos diferentes). Este spec digitaliza esa tabla: un panel donde se arma la lista por día seleccionando rutas ya existentes en la colección `rutas` (`src/firebase/rutasService.ts`, ya usada por "Añadir Rutas" y por "Rentabilidad de Rutas"), capturando el monto mínimo de cada una, y se exporta a PDF con el mismo layout de matriz por columnas que la tabla original.

## Alcance

**Dentro:**

- Colección Firestore nueva `programacionEntregas`: cada documento es una fila de la tabla (un día + una ruta + su monto mínimo), con `dia` (uno de `"Sábado" | "Lunes" | "Martes" | "Miércoles" | "Jueves" | "Viernes"`), `ruta_id` (referencia a un documento de `rutas`), `ruta_nombre` (denormalizado, mismo patrón que `unidad_numero` en `mantenimientosUnidades`), `monto_minimo` (número) y `orden` (número, controla la posición dentro de su día).
- Panel nuevo `PanelProgramacionEntregas.tsx`, sub-vista `"programacionEntregas"` en el sidebar, visible para `admin`, `jefeReparto` y `embarques` (permiso nuevo `permisos.programacionEntregas = esPersonalAutorizado(usuarioEmail)`), con las mismas acciones disponibles para los tres roles.
- Dentro del panel: 6 columnas visuales, una por día (mismo orden que la tabla original: Sábado, Lunes, Martes, Miércoles, Jueves, Viernes), cada una con su lista de filas (ruta + monto mínimo) ordenada por `orden`.
- Agregar fila: selector de ruta (`obtenerRutasFirebase`, mismo componente/patrón que usa `PanelRentabilidad.tsx`) + campo numérico de monto mínimo, dentro de la columna del día correspondiente. Al guardar, la fila nueva se agrega al final de su día (`orden` = máximo actual + 1).
- Editar fila: el monto mínimo de una fila ya guardada es editable in-place (campo numérico + botón guardar); la ruta de una fila ya guardada no se reasigna — para cambiar la ruta se elimina la fila y se agrega una nueva.
- Eliminar fila: botón de eliminar por fila, con confirmación (`confirmar`, mismo patrón que el resto de la app).
- Reordenar: cada fila tiene flechas "subir"/"bajar" que intercambian su `orden` con el de la fila adyacente dentro del mismo día (mismo espíritu que otros paneles con listas ordenables de la app).
- Montos mostrados con separador de miles y símbolo de moneda (`toLocaleString("es-MX")` con 2 decimales, ej. `$220,000.00`), igual que el resto de la app.
- La misma ruta puede agregarse más de una vez, en el mismo día o en días distintos, cada aparición con su propio monto mínimo independiente; no hay validación de duplicados.
- Sincronización en vivo con `onSnapshot` sobre `programacionEntregas` (mismo patrón sin toast que `AdminUnidades.tsx`), para que varias personas con el panel abierto vean los cambios de las demás al instante.
- Botón "Exportar PDF" que descarga la matriz completa (`Programacion_Entregas_<fecha>.pdf`), en orientación **landscape** (6 columnas necesitan más ancho que alto), con el mismo layout que la tabla original: un encabezado por columna con el nombre del día, y debajo, apiladas, las filas de ese día (ruta + monto mínimo), respetando el `orden` guardado. Encabezado tipo membrete igual que el resto de reportes de la app (`src/utils/pdf*.ts`/`reportes*Utils.ts`).
- Reglas de Firestore para `programacionEntregas`: lectura y escritura para `esPersonalAutorizado()`, igual patrón que `distribucion_diaria` y `unidades`.

**Fuera de alcance (para otro spec si hace falta):**

- No se manejan varios centros de distribución (CEDIS/bodegas); es una sola tabla global, aunque la foto original diga "CEDIS XALISCO". Si en el futuro se necesitan varias tablas independientes por CEDIS, es un spec aparte.
- No se valida que una ruta no se repita en el mismo día o en días distintos; el usuario decidió que repetirse con montos distintos es un caso válido (igual que en la tabla original).
- No se relaciona `monto_minimo` con la venta real de un viaje despachado (`distribucion_diaria`/`viajes`) para alertar automáticamente si no se alcanzó el mínimo; es solo una tabla de referencia editable, no una validación activa en el flujo de despacho.
- No se permite capturar el nombre de la ruta como texto libre: siempre se selecciona de la colección `rutas` ya existente (si una ruta no existe ahí, se da de alta primero en "Añadir Rutas").
- No se lleva historial de cambios (quién cambió qué monto y cuándo); solo el valor actual.
- No hay exportación a Excel de esta tabla, solo PDF.
- No se agrega un botón para "vaciar todo un día" de un solo clic; cada fila se elimina individualmente.

## Datos

```ts
// Nuevo: src/firebase/programacionEntregasService.ts
export type DiaProgramacion =
  | "Sábado"
  | "Lunes"
  | "Martes"
  | "Miércoles"
  | "Jueves"
  | "Viernes";

export const DIAS_PROGRAMACION: DiaProgramacion[] = [
  "Sábado",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
];

// Colección "programacionEntregas"
export interface FilaProgramacionEntrega {
  id?: string;
  dia: DiaProgramacion;
  ruta_id: string;
  ruta_nombre: string; // denormalizado, mismo patrón que unidad_numero en mantenimientosUnidades
  monto_minimo: number;
  orden: number; // posición dentro de su día, ascendente
}
```

No se agrega ningún campo nuevo a la colección `rutas`; solo se referencia su `id`/`nombre` ya existentes.

## Plan de implementación

1. Crear `src/firebase/programacionEntregasService.ts` con `DiaProgramacion`, `DIAS_PROGRAMACION`, `FilaProgramacionEntrega`, `agregarFilaProgramacionFirebase`, `obtenerProgramacionFirebase`, `actualizarFilaProgramacionFirebase` (monto y/u orden), `eliminarFilaProgramacionFirebase`, siguiendo el patrón try/catch de `unidadesService.ts`.
2. En `firestore.rules`: agregar `match /programacionEntregas/{docId} { allow read, write: if esPersonalAutorizado(); }`. Publicar las reglas actualizadas.
3. Crear `src/components/PanelProgramacionEntregas.tsx`: `useQuery` de `programacionEntregas` y de `rutas`; agrupar filas por `dia` en el orden de `DIAS_PROGRAMACION`, ordenadas por `orden`; renderizar las 6 columnas con su formulario de alta (selector de ruta + monto), lista de filas editables (monto in-place, flechas subir/bajar, eliminar con confirmación), siguiendo el patrón visual de `AdminUnidades.tsx`.
4. En `PanelProgramacionEntregas.tsx`: agregar el listener `onSnapshot` sobre `programacionEntregas` que sincroniza `queryClient.setQueryData(["programacionEntregas"], ...)`, mismo patrón sin toast que `AdminUnidades.tsx`.
5. Verificar con `npm run build` que no hay errores de tipos.
6. Crear `src/utils/reportesProgramacionEntregasUtils.ts` con `exportarProgramacionEntregasPDF(filasPorDia)`, landscape, encabezado tipo membrete, 6 columnas (una por día de `DIAS_PROGRAMACION`) con sus filas (ruta + monto formateado) apiladas debajo, siguiendo el patrón de armado de tablas ya usado en `src/utils/pdf*.ts`/`reportes*Utils.ts`; enlazar el botón "Exportar PDF" del panel.
7. Verificar con `npm run build` que no hay errores de tipos.
8. En `src/components/SidebarAdmin.tsx`: agregar `"programacionEntregas"` a `SubVistaAdmin`, `permisos.programacionEntregas = esPersonalAutorizado(usuarioEmail)` y el ítem "Programación de Entregas" (ícono `CalendarClock` de `lucide-react`) al arreglo `items`.
9. En `src/components/AdminPanel.tsx`: importar `PanelProgramacionEntregas` y agregar `{menuActivo === "programacionEntregas" && <PanelProgramacionEntregas />}`.
10. Verificar con `npm run build` que no hay errores de tipos.
11. Prueba manual: agregar 2-3 rutas con su monto mínimo en distintos días (incluyendo la misma ruta repetida en dos días con montos distintos) y confirmar que aparecen en la columna correcta, en el orden en que se agregaron.
12. Prueba manual: editar el monto mínimo de una fila ya guardada y confirmar que se actualiza sin recargar la página.
13. Prueba manual: usar las flechas subir/bajar de una fila y confirmar que cambia de posición dentro de su día (y no afecta el orden de otros días).
14. Prueba manual: eliminar una fila (con confirmación) y confirmar que desaparece de la columna.
15. Prueba manual: abrir el panel en dos sesiones distintas, hacer un cambio en una y confirmar que se refleja al instante en la otra, sin toast.
16. Prueba manual: confirmar que un chofer o un vendedor no ven "Programación de Entregas" en el sidebar, y que admin/jefeReparto/embarques sí, con las mismas acciones disponibles para los tres.
17. Prueba manual: exportar el PDF y confirmar que respeta el orden de columnas (Sábado a Viernes) y el orden de filas dentro de cada día, con los montos formateados igual que en pantalla.

Cada paso deja la app compilando y funcional.

## Criterios de aceptación

- [ ] El ítem "Programación de Entregas" es visible en el sidebar para `admin`, `jefeReparto` y `embarques`, y no visible para chofer ni vendedor.
- [ ] Los tres roles con acceso pueden agregar, editar el monto, reordenar y eliminar filas, sin diferencias de permisos entre ellos.
- [ ] El panel muestra 6 columnas en el orden Sábado, Lunes, Martes, Miércoles, Jueves, Viernes (sin Domingo).
- [ ] Se puede agregar una fila a un día eligiendo una ruta de la colección `rutas` existente y capturando su monto mínimo.
- [ ] La misma ruta puede agregarse más de una vez (mismo día o días distintos) con montos mínimos distintos, sin bloquearse por duplicado.
- [ ] El monto mínimo de una fila ya guardada se puede editar y el cambio persiste en Firestore.
- [ ] Las flechas subir/bajar cambian el `orden` de una fila dentro de su día, sin afectar el orden de las filas de otro día.
- [ ] Una fila se puede eliminar, con confirmación previa.
- [ ] Los montos se muestran con separador de miles y símbolo de moneda en pantalla y en el PDF.
- [ ] Los cambios hechos desde otra sesión se reflejan en vivo en el panel (sin recargar la página) y sin mostrar ningún toast.
- [ ] El botón "Exportar PDF" descarga `Programacion_Entregas_<fecha>.pdf` en landscape, con 6 columnas (una por día) y las filas de cada día apiladas en el orden guardado.
- [ ] `npm run build` pasa sin errores de tipo.

## Decisiones tomadas

- **Colección plana `programacionEntregas` (una fila = un documento) en vez de un documento por día con un arreglo embebido:** permite reordenar/editar/eliminar filas individuales sin reescribir el documento completo del día, y sigue el mismo patrón ya usado en `unidades`/`mantenimientosUnidades`.
- **Ruta seleccionada de la colección `rutas` existente, no texto libre:** decisión explícita del usuario; evita nombres duplicados o mal escritos y reutiliza el catálogo que ya alimenta "Rentabilidad de Rutas" y el resto de la app.
- **`ruta_nombre` denormalizado en cada fila:** mismo patrón que `unidad_numero` en `mantenimientosUnidades`; evita un join contra `rutas` solo para mostrar el nombre en pantalla/PDF.
- **Una sola tabla global, sin distinguir por CEDIS:** decisión explícita del usuario; aunque la foto dice "CEDIS XALISCO", la app no maneja hoy el concepto de centro de distribución y no se quiere introducir esa dimensión en este spec.
- **La misma ruta puede repetirse en el mismo día o en días distintos, sin validación de duplicados:** decisión explícita del usuario; la tabla original ya tiene este patrón (ej. "MAZATLAN" en Lunes, Martes y Jueves con montos distintos).
- **Permisos admin + jefeReparto + embarques, igual que "Unidades" y "Rentabilidad de Rutas":** decisión explícita del usuario; son los mismos tres roles operativos que ya comparten acceso pleno a paneles similares.
- **Sincronización en vivo sin toast, mismo patrón que `AdminUnidades.tsx`:** varias personas operativas pueden tener el panel abierto a la vez; se prioriza que todas vean el mismo estado sin interrupciones.
- **Reordenar con flechas subir/bajar (campo `orden`), no drag-and-drop:** más simple de implementar y suficiente para listas cortas por día, mismo criterio usado en el resto de la app (que no usa drag-and-drop en ningún panel existente).
- **PDF en landscape:** 6 columnas necesitan más ancho horizontal que el que da un PDF portrait, a diferencia de reportes de pocas columnas como el directorio de unidades.
- **Sin exportación a Excel:** el usuario solo pidió la tabla en PDF, replicando el formato de la hoja física original.
- **Sin relación con `monto_minimo` y la venta real de un viaje despachado:** el usuario pidió una tabla de referencia editable, no una validación automática dentro del flujo de despacho; esa integración, si se necesita, es un spec aparte.

## Riesgos identificados

| Riesgo                                                                                                                       | Mitigación                                                                                                                                                                         |
| ---------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Una ruta se elimina de la colección `rutas` (panel "Añadir Rutas") mientras tiene filas asociadas en `programacionEntregas`. | Las filas ya guardadas conservan `ruta_nombre` denormalizado y siguen mostrándose correctamente; no se valida ni se bloquea la eliminación de la ruta origen (fuera de este spec). |
| Dos personas reordenan filas del mismo día casi al mismo tiempo, generando `orden` inconsistente.                            | Riesgo aceptado, de baja probabilidad dado el tamaño del equipo; se corrige manualmente reordenando de nuevo con las flechas.                                                      |

## Lo que **no** está en este spec

- Varias tablas por CEDIS/bodega.
- Texto libre para el nombre de ruta (siempre se selecciona de `rutas`).
- Validación de rutas duplicadas en el mismo día o en días distintos.
- Relación automática entre `monto_minimo` y la venta real de un viaje despachado.
- Historial de cambios de montos.
- Exportación a Excel.
- Reordenar por drag-and-drop.

Cada uno de estos, si se necesita, va en un spec aparte.
