# 04 — Gestión de Unidades (Vehículos, Disponibilidad y Mantenimientos)

**Estado:** Aprobado
**Depende de:** Spec 03 (amplía el modal "Personal en Bodega")
**Fecha:** 2026-09-19

**Objetivo:** Agregar un panel "Unidades" (accesible para admin, jefe de reparto y embarques) donde se dan de alta los vehículos con su tipo y capacidades, se controla su disponibilidad (disponible / en mantenimiento / fuera de servicio) y se programan sus mantenimientos, reemplazando la lista estática de números de unidad que hoy usa la tabla de asignación de rutas y los demás selects de unidad de la app.

## Contexto

Hoy el número de unidad es un arreglo estático, `LISTA_UNIDADES` (`src/utils/mapaUtils.ts:69`), 26 strings ("01".."26") sin ningún otro dato (tipo de vehículo, capacidades, disponibilidad). Se usa en cuatro lugares:

- `PanelDistribucion.tsx:1057` — select "UNID" de la tabla de asignación de rutas del día, que ya deshabilita unidades ocupadas ese día (`unidadesUsadas`, calculado a partir de `filas`), pero no sabe nada de mantenimiento ni de averías.
- `ModalAsignarDespacho.tsx:119` y `ModalFinalizarViaje.tsx:62` — selects de unidad al despachar/finalizar un viaje desde `MapaRutero.tsx`.
- `MapaRutero.tsx:133,146,240` — valor por defecto de la unidad del chofer/admin.

No existe ninguna colección de Firestore para unidades. Este spec introduce esa colección (con tipo y capacidades) más un módulo de disponibilidad y otro de mantenimientos programados, siguiendo el mismo patrón ya usado para choferes: `choferesService.ts`/`choferes` (directorio + estado manual) y `vacacionesService.ts`/`vacaciones` (periodos con fecha_inicio/fecha_fin que se combinan con el estado manual en `estadoEfectivo`, `vacacionesUtils.ts:222`).

## Alcance

**Dentro:**

- Colección Firestore nueva `unidades`: `numero` (texto libre, único), `tipo` (texto libre, ej. "Fotón", "Isuzu"), `capacidad_kg` (número), `capacidad_m3` (número), `estado` (`"Disponible"` / `"Fuera de servicio"` / `"Baja"`, manual, default `"Disponible"`), `motivo_fuera_servicio` (texto libre, opcional), `motivo_baja` (texto libre, opcional, ej. "Donada a Matriz", "Vendida").
- Colección Firestore nueva `mantenimientosUnidades`: historial completo (pasados, actuales y futuros) de mantenimientos programados por unidad, con `unidad_id`, `unidad_numero` (denormalizado), `tipo` (`"Preventivo"` / `"Correctivo"`), `descripcion`, `taller` (opcional), `costo` (opcional), `fecha_inicio` y `fecha_fin` (rango de días).
- Panel nuevo "Unidades" (`AdminUnidades.tsx`), sub-vista `"unidades"` en el sidebar, visible para `admin`, `jefeReparto` y `embarques` (permiso nuevo `permisos.unidades`), con las mismas acciones disponibles para los tres roles.
- Dentro del panel: formulario para dar de alta una unidad (número, tipo, capacidad en kg, capacidad en m³); tabla de unidades **ordenada por número** (orden numérico, no alfabético puro, aplicado antes de paginar) con su disponibilidad efectiva (badge: Disponible / En mantenimiento / Fuera de servicio / Baja); acción para editar los datos de una unidad; acción para alternar manualmente "Fuera de servicio" ↔ "Disponible" (con motivo de texto libre opcional); acción para dar de baja una unidad (baja lógica); acción para programar un mantenimiento nuevo y ver/editar/eliminar el historial de mantenimientos de esa unidad.
- En la tabla de unidades, cuando la disponibilidad efectiva de hoy es "En mantenimiento", aparece un botón "Finalizar mantenimiento" que cierra el mantenimiento en curso (fija su `fecha_fin` en el día de ayer) para que la unidad se muestre "Disponible" de inmediato, sin esperar a que llegue la `fecha_fin` originalmente programada. Caso de uso: la unidad se reparó antes de lo previsto.
- Botón "Reporte PDF" en la pestaña "Unidades" que exporta el directorio completo de unidades (respetando la búsqueda/filtro de disponibilidad activos en pantalla) con su disponibilidad **actual** (calculada para hoy, no para una fecha de reparto específica), en orientación **portrait** con un resumen de conteos por disponibilidad (Total/Disponibles/En mantenimiento/Fuera de servicio/Baja), siguiendo el patrón de `exportarPDF` en `AdminChoferes.tsx` (adaptado a portrait, a diferencia de ese reporte que es landscape). Nombre de archivo: `Directorio_Unidades_<fecha>.pdf`.
- Disponibilidad calculada automáticamente con una función `disponibilidadEfectiva` (mismo patrón que `estadoEfectivo` de `vacacionesUtils.ts`): si el `estado` manual es `"Fuera de servicio"` o `"Baja"`, ese es el resultado; si no, y existe un mantenimiento cuyo rango `fecha_inicio`–`fecha_fin` cubre la fecha evaluada, el resultado es `"En mantenimiento"`; si no, `"Disponible"`.
- El panel de Unidades escucha cambios en vivo con `onSnapshot` sobre `unidades` y `mantenimientosUnidades` (mismo patrón que el listener de `AltasClientes.tsx`), sincronizando la caché de TanStack Query sin mostrar ningún toast — varias personas (admin/jefe/embarques) pueden tener el panel abierto a la vez y ver los cambios de las demás al instante.
- Reemplazo de `LISTA_UNIDADES` por datos reales de Firestore en los cuatro lugares donde se usa hoy: `PanelDistribucion.tsx`, `ModalAsignarDespacho.tsx`, `ModalFinalizarViaje.tsx` y `MapaRutero.tsx`. En los tres últimos, el select solo lista los números de unidades activas (`estado !== "Baja"`), sin más cambio de comportamiento.
- En `PanelDistribucion.tsx` (tabla de asignación de rutas), además de excluir las unidades dadas de baja, el select "UNID" deshabilita (mismo patrón visual que ya usa para ocupadas, ej. "(OC)") las unidades cuya disponibilidad efectiva para la `fechaSeleccionada` no sea `"Disponible"`, mostrando una etiqueta corta del motivo (ej. "(MANTO)" / "(F. SERV.)").
- Reglas de Firestore para `unidades` y `mantenimientosUnidades`: lectura y escritura para `esPersonalAutorizado()` (admin, jefeReparto, embarques), igual patrón que `distribucion_diaria`.
- Validación: no se puede guardar una unidad con un `numero` que ya exista en otra unidad activa (comparación exacta tras recortar espacios, sin distinguir mayúsculas/minúsculas).
- **Ampliación del modal "Personal en Bodega"** (`specs/03-disponibilidad-personal-bodega.md`, en `PanelDistribucion.tsx`): al final de ese mismo modal, debajo de la tabla "Personal Ausente", se agregan dos tablas espejo para unidades, con el mismo criterio de fecha (`fechaSeleccionada`) que ya usa el resto del modal:
  - **Unidades Disponibles:** unidades activas (`estado !== "Baja"`) cuya disponibilidad efectiva ese día es `"Disponible"` y que no están asignadas a ninguna fila de la tabla de distribución ese día (`unidadesUsadas`). Columnas: Número, Tipo, Capacidad (kg), Capacidad (m³). Mensaje si está vacía: "No hay unidades disponibles para este día."
  - **Unidades No Disponibles:** unidades activas cuya disponibilidad efectiva ese día es `"En mantenimiento"` o `"Fuera de servicio"`, sin importar si además están asignadas a una fila (mismo criterio que "Personal Ausente", independiente de `unidadesUsadas`). Columnas: Número, Tipo, Capacidad (kg), Capacidad (m³), Motivo. Mensaje si está vacía: "No hay unidades en mantenimiento o fuera de servicio para este día."
  - Las unidades dadas de baja (`estado === "Baja"`) no aparecen en ninguna de las dos tablas: quedan fuera de esta vista por completo.
  - El recuadro de resumen del modal pasa de 2 a 4 recuadros en la misma fila: "Personal Disponible" (verde), "Personal Ausente" (naranja), "Unidades Disponibles" (azul) y "Unidades No Disponibles" (ámbar), cada uno con su conteo.
  - Ambas tablas son de solo lectura (igual que "Personal Ausente"): no tienen botones de acción; para editar una unidad, cambiar su disponibilidad o programar un mantenimiento se usa el panel "Unidades" ya implementado en este mismo spec.
  - Los botones "Excel" y "PDF" ya existentes en ese modal (`exportarPersonalBodegaExcel`, `exportarPersonalBodegaPDF`) se amplían para incluir también estas dos tablas: dos hojas más en el Excel ("Unidades Bodega", "Unidades No Disponibles") y dos secciones más en el PDF (con su propio resumen de conteos), sin cambiar el nombre del archivo (`PERSONAL_BODEGA_<fecha>.xlsx`/`.pdf`).

**Fuera de alcance (para otro spec si hace falta):**

- No se migran automáticamente los 26 números actuales de `LISTA_UNIDADES` a Firestore; cada unidad se da de alta manualmente desde el panel nuevo, con su tipo y capacidades. Decisión explícita del usuario.
- El filtro de disponibilidad (mantenimiento/fuera de servicio) solo aplica en la tabla de asignación de `PanelDistribucion.tsx`; no se aplica en `ModalAsignarDespacho.tsx`, `ModalFinalizarViaje.tsx` ni en el select de unidad de `MapaRutero.tsx` (esos tres solo excluyen las unidades dadas de baja).
- No hay notificaciones tipo toast al cambiar la disponibilidad de una unidad; solo sincronización silenciosa en vivo dentro del panel de Unidades.
- No hay catálogo fijo de tipos de unidad (Fotón, Isuzu, etc.); el campo `tipo` es texto libre.
- No se relaciona la capacidad (kg/m³) de una unidad con el peso/volumen de los pedidos de una ruta para sugerir o validar automáticamente qué unidad asignar; el dato es solo informativo en esta primera versión.
- No hay eliminación física de una unidad, solo baja lógica (`estado = "Baja"`); un borrado permanente queda fuera de este spec.
- No se lleva historial de kilometraje, combustible, ni documentos (tarjeta de circulación, seguro, verificación) de la unidad.
- No se valida que los rangos de fechas de dos mantenimientos de la misma unidad no se traslapen.
- No se modifica la estructura de `filas`/`viajes`: el campo `unidad`/`unidad_utilizada` sigue guardando el número de unidad como string, igual que hoy.
- Las tablas de unidades del modal "Personal en Bodega" no tienen acciones (editar, cambiar disponibilidad, programar mantenimiento); son de solo lectura.
- No se renombra el modal ni el botón "Personal en Bodega", ni el título en pantalla/PDF ("PERSONAL DISPONIBLE EN BODEGA"); las tablas de unidades se agregan como secciones adicionales al final del mismo modal y reporte.

## Datos

```ts
// Colección "unidades"
type Unidad = {
  id?: string;
  numero: string; // requerido, único, ej. "01" — reemplaza LISTA_UNIDADES
  tipo: string; // texto libre, ej. "Fotón", "Isuzu"
  capacidad_kg: number; // requerido
  capacidad_m3: number; // requerido
  estado: "Disponible" | "Fuera de servicio" | "Baja"; // manual, default "Disponible"
  motivo_fuera_servicio?: string; // opcional, solo relevante si estado === "Fuera de servicio"
  motivo_baja?: string; // opcional, solo relevante si estado === "Baja" (ej. "Donada a Matriz")
};

// Colección "mantenimientosUnidades"
type MantenimientoUnidad = {
  id?: string;
  unidad_id: string;
  unidad_numero: string; // denormalizado, mismo patrón que chofer_nombre en "vacaciones"
  tipo: "Preventivo" | "Correctivo";
  descripcion: string;
  taller?: string; // opcional
  costo?: number; // opcional
  fecha_inicio: string; // YYYY-MM-DD
  fecha_fin: string; // YYYY-MM-DD
};

// disponibilidadEfectiva: patrón de estadoEfectivo (vacacionesUtils.ts:222)
// - unidad.estado === "Fuera de servicio" | "Baja" → ese valor
// - si no, y hay un mantenimiento con fecha_inicio <= hoy <= fecha_fin → "En mantenimiento"
// - si no → "Disponible"

// Derivados en memoria dentro de PanelDistribucion.tsx, para las nuevas
// tablas del modal "Personal en Bodega" (sin colección ni campo nuevo):
type UnidadBodega = {
  numero: string;
  tipo: string;
  capacidad_kg: number;
  capacidad_m3: number;
};
type UnidadNoDisponibleBodega = UnidadBodega & {
  motivo: "En mantenimiento" | "Fuera de servicio";
};
```

## Plan de implementación

1. Crear `src/firebase/unidadesService.ts` con `agregarUnidadFirebase`, `obtenerUnidadesFirebase`, `actualizarUnidadFirebase` (edición de datos y cambio de `estado`), siguiendo el patrón try/catch de `choferesService.ts`.
2. Crear `src/firebase/mantenimientosUnidadesService.ts` con `agregarMantenimientoFirebase`, `obtenerMantenimientosFirebase`, `actualizarMantenimientoFirebase`, `eliminarMantenimientoFirebase`, siguiendo el patrón exacto de `vacacionesService.ts`.
3. Crear `src/utils/unidadesUtils.ts` con `TIPOS_MANTENIMIENTO = ["Preventivo", "Correctivo"] as const` y `disponibilidadEfectiva(unidad, mantenimientosDeLaUnidad, fecha)`, siguiendo el patrón de `estadoEfectivo` en `vacacionesUtils.ts`.
4. En `firestore.rules`: agregar `match /unidades/{docId}` y `match /mantenimientosUnidades/{docId}`, ambos con `allow read, write: if esPersonalAutorizado();` (mismo patrón que `distribucion_diaria`). Publicar las reglas actualizadas.
5. Crear `src/components/AdminUnidades.tsx`: `useQuery` de unidades y mantenimientos, formulario de alta (número, tipo, capacidad_kg, capacidad_m3) con validación de número duplicado, tabla de unidades con disponibilidad efectiva (badge) calculada para hoy, acciones de editar, alternar "Fuera de servicio"/"Disponible" (con motivo opcional), dar de baja, y programar/editar/eliminar mantenimiento con su historial por unidad — siguiendo el patrón de `AdminChoferes.tsx`.
6. En `AdminUnidades.tsx`: agregar los listeners `onSnapshot` sobre `unidades` y `mantenimientosUnidades` que sincronizan `queryClient.setQueryData`, mismo patrón (sin toast) que el listener de `AltasClientes.tsx`.
7. En `src/components/SidebarAdmin.tsx`: importar `esEmbarques`, agregar `"unidades"` a `SubVistaAdmin`, agregar `permisos.unidades = esAdmin(usuarioEmail) || esJefeReparto(usuarioEmail) || esEmbarques(usuarioEmail)` y el ítem "Unidades" (ícono `Car` de `lucide-react`) al arreglo `items`.
8. En `src/components/AdminPanel.tsx`: importar `AdminUnidades` y agregar `{menuActivo === "unidades" && <AdminUnidades />}`.
9. En `src/utils/mapaUtils.ts`: eliminar el arreglo `LISTA_UNIDADES`.
10. En `src/components/mapa/ModalAsignarDespacho.tsx` y `ModalFinalizarViaje.tsx`: reemplazar el import de `LISTA_UNIDADES` por un `useQuery` de `obtenerUnidadesFirebase`, filtrando `estado !== "Baja"` y ordenando por `numero`.
11. En `src/components/MapaRutero.tsx`: mismo reemplazo que el paso 10 para el valor por defecto de `unidadChofer`/`unidadSeleccionadaAdmin`.
12. En `src/components/PanelDistribucion.tsx`: reemplazar el import de `LISTA_UNIDADES` por `useQuery` de `obtenerUnidadesFirebase` y de `obtenerMantenimientosFirebase`; filtrar unidades activas (`estado !== "Baja"`); usar `disponibilidadEfectiva` con `fechaSeleccionada` para deshabilitar/etiquetar las opciones del select "UNID", igual patrón que `unidadesUsadas`.
13. Verificar con `npm run build` que no hay errores de tipos.
14. Prueba manual: dar de alta 2-3 unidades desde el panel nuevo (con tipo y capacidades) y confirmar que aparecen con su número en los 4 selects (Distribución Diaria, Asignar Despacho, Finalizar Viaje, Rutero).
15. Prueba manual: marcar una unidad "Fuera de servicio" manualmente y confirmar que el cambio se refleja al instante (sin refrescar) en el panel si se tiene abierto en otra pestaña/sesión, y que en Distribución Diaria aparece deshabilitada para cualquier fecha.
16. Prueba manual: programar un mantenimiento con un rango de fechas que incluya hoy y confirmar que la unidad se muestra "En mantenimiento" en el panel, y en Distribución Diaria aparece deshabilitada solo para las fechas dentro del rango (una fecha fuera del rango la muestra disponible).
17. Prueba manual: dar de baja una unidad y confirmar que desaparece de los 4 selects pero sigue visible (marcada "Baja") en el panel de Unidades, con su historial de mantenimientos intacto.
18. Prueba manual: confirmar que un chofer o un vendedor no ven "Unidades" en el sidebar, y que admin/jefeReparto/embarques sí, con las mismas acciones disponibles para los tres.
19. En `PanelDistribucion.tsx`: agregar los `useMemo` `unidadesDisponiblesBodega` (unidades activas, disponibilidad efectiva "Disponible" y no presentes en `unidadesUsadas` esa fecha) y `unidadesNoDisponiblesBodega` (unidades activas con disponibilidad efectiva "En mantenimiento" o "Fuera de servicio" esa fecha, con su `motivo`, independiente de `unidadesUsadas`), reutilizando `unidadesActivas` y `disponibilidadPorNumero` ya calculados.
20. En `PanelDistribucion.tsx`: dentro del modal "Personal en Bodega", ampliar el recuadro de resumen de 2 a 4 columnas (Personal Disponible, Personal Ausente, Unidades Disponibles, Unidades No Disponibles) y agregar las dos tablas nuevas ("Unidades Disponibles" y "Unidades No Disponibles" con columna Motivo) debajo de "Personal Ausente", cada una con su mensaje de lista vacía.
21. En `PanelDistribucion.tsx`: ampliar `exportarPersonalBodegaExcel` para agregar las hojas "Unidades Bodega" y "Unidades No Disponibles" al mismo workbook.
22. En `src/utils/reportesDistribucionUtils.ts`: ampliar la firma de `exportarPersonalBodegaPDF` para recibir también `unidadesDisponibles` y `unidadesNoDisponibles`, agregando sus dos recuadros de resumen y sus dos secciones/tablas al documento (mismo patrón que las de personal); actualizar la llamada en `PanelDistribucion.tsx`.
23. Verificar con `npm run build` que no hay errores de tipos.
24. Prueba manual: con una fecha que tenga unidades asignadas en `filas`, alguna en mantenimiento (rango vigente ese día), alguna fuera de servicio y alguna dada de baja, confirmar que "Unidades Disponibles" excluye correctamente a las asignadas, en mantenimiento, fuera de servicio y de baja; que "Unidades No Disponibles" muestra exactamente a las de mantenimiento/fuera de servicio con su motivo correcto (sin importar si están asignadas); y que las de baja no aparecen en ninguna tabla.
25. Prueba manual: cambiar la fecha del filtro y confirmar que ambas tablas y sus conteos en el resumen se recalculan sin recargar la página.
26. Prueba manual: exportar Excel (4 hojas) y PDF (4 secciones/resúmenes) desde el modal y confirmar que las dos hojas/secciones de unidades coinciden exactamente con las tablas mostradas en pantalla.

Cada paso deja la app compilando y funcional.

## Criterios de aceptación

- [ ] El ítem "Unidades" es visible en el sidebar para `admin`, `jefeReparto` y `embarques`.
- [ ] Un chofer o un vendedor no ven "Unidades" en el sidebar.
- [ ] Los tres roles con acceso pueden dar de alta, editar, cambiar disponibilidad, programar mantenimiento y dar de baja una unidad, sin diferencias de permisos entre ellos.
- [ ] Se puede dar de alta una unidad con número, tipo, capacidad en kg y capacidad en m³.
- [ ] No se puede guardar una unidad con un número que ya existe en otra unidad activa.
- [ ] Marcar una unidad como "Fuera de servicio" (con o sin motivo) hace que su disponibilidad efectiva sea "Fuera de servicio" hasta que se marque como "Disponible" de nuevo.
- [ ] Programar un mantenimiento con `fecha_inicio`–`fecha_fin` que cubra la fecha de hoy hace que la disponibilidad efectiva de esa unidad sea "En mantenimiento" ese día, y "Disponible" fuera de ese rango (si no tiene otro motivo).
- [ ] Dar de baja una unidad cambia su disponibilidad efectiva a "Baja", la quita de los 4 selects de unidad de la app, y conserva su historial de mantenimientos visible en el panel.
- [ ] El panel de Unidades refleja en vivo (sin recargar la página) los cambios de disponibilidad o mantenimiento hechos desde otra sesión, sin mostrar ningún toast.
- [ ] `PanelDistribucion.tsx`, `ModalAsignarDespacho.tsx`, `ModalFinalizarViaje.tsx` y `MapaRutero.tsx` obtienen los números de unidad desde Firestore (colección `unidades`), no desde `LISTA_UNIDADES` (que deja de existir en `mapaUtils.ts`).
- [ ] En la tabla de asignación de `PanelDistribucion.tsx`, el select "UNID" deshabilita, para la `fechaSeleccionada`, las unidades en mantenimiento o fuera de servicio ese día (además de las ya ocupadas), mostrando un motivo corto.
- [ ] En `ModalAsignarDespacho.tsx`, `ModalFinalizarViaje.tsx` y `MapaRutero.tsx`, el select de unidad solo excluye las unidades dadas de baja; no deshabilita por mantenimiento o fuera de servicio.
- [ ] Se puede editar y eliminar un registro de mantenimiento ya guardado.
- [ ] El modal "Personal en Bodega" muestra, debajo de "Personal Ausente", las tablas "Unidades Disponibles" y "Unidades No Disponibles" para la `fechaSeleccionada`.
- [ ] "Unidades Disponibles" solo incluye unidades activas, con disponibilidad efectiva "Disponible" ese día, y no asignadas a ninguna fila de la tabla de distribución ese día.
- [ ] "Unidades No Disponibles" incluye toda unidad activa en "En mantenimiento" o "Fuera de servicio" ese día, con su motivo correcto, sin importar si también está asignada a una fila.
- [ ] Ninguna unidad dada de baja aparece en "Unidades Disponibles" ni en "Unidades No Disponibles".
- [ ] El resumen del modal muestra 4 recuadros con los conteos exactos de Personal Disponible, Personal Ausente, Unidades Disponibles y Unidades No Disponibles, y se actualizan al cambiar la fecha.
- [ ] Las tablas de unidades del modal son de solo lectura (sin botones de editar/cambiar disponibilidad/programar mantenimiento).
- [ ] El Excel exportado desde ese modal incluye las hojas "Unidades Bodega" y "Unidades No Disponibles" junto a las de personal.
- [ ] El PDF exportado desde ese modal incluye las secciones y resúmenes de unidades junto a las de personal.
- [ ] El directorio de unidades del panel "Unidades" está ordenado por número (orden numérico), incluso al cambiar de página.
- [ ] El botón "Reporte PDF" del panel "Unidades" descarga `Directorio_Unidades_<fecha>.pdf` con todas las unidades que cumplen la búsqueda/filtro activos, su disponibilidad actual y el resumen de conteos.
- [ ] Una unidad "En mantenimiento" muestra el botón "Finalizar mantenimiento"; al confirmarlo, su disponibilidad efectiva cambia a "Disponible" en el acto (sin esperar a la `fecha_fin` programada) y queda seleccionable en la tabla de asignación de `PanelDistribucion.tsx` para el día de hoy.
- [ ] Una unidad "Disponible" o "Fuera de servicio" no muestra el botón "Finalizar mantenimiento".
- [ ] Al marcar una unidad como "Baja" se puede capturar un motivo de texto libre opcional (ej. "Donada a Matriz"), visible como tooltip sobre el badge "Baja" en el directorio.
- [ ] `npm run build` pasa sin errores de tipo.

## Decisiones tomadas

- **Colecciones separadas `unidades` y `mantenimientosUnidades`, en vez de un array embebido de mantenimientos dentro del documento de la unidad:** mismo patrón ya usado para choferes (`choferes` + `vacaciones` separadas), que permite un historial completo sin límites de tamaño de documento y reutiliza el mismo criterio de `estadoEfectivo`.
- **Tipo de unidad como texto libre, no catálogo fijo:** decisión explícita del usuario, en contra de la recomendación inicial (evitar variantes de escritura); se acepta esa limitación a cambio de simplicidad.
- **Capacidad de volumen en metros cúbicos (m³), no metros cuadrados:** corrección de unidad; m³ es lo correcto para capacidad de carga de un vehículo.
- **Baja lógica, sin eliminación física:** una unidad dada de baja conserva su historial de mantenimientos y su número no se reutiliza por error; mismo espíritu que el estado de choferes.
- **Tres estados manuales (Disponible / Fuera de servicio / Baja) + un cuarto calculado (En mantenimiento):** "En mantenimiento" no se guarda a mano, se deriva de si hay un mantenimiento programado vigente — evita que alguien olvide "regresar" la unidad a Disponible el día que termina el mantenimiento.
- **Relación automática entre mantenimiento programado y disponibilidad:** decisión explícita del usuario; programar un mantenimiento con fechas ya deja la unidad marcada como no disponible ese rango, sin un paso manual adicional.
- **Sincronización en vivo sin toast:** el panel de Unidades puede estar abierto simultáneamente por varias personas operativas (admin/jefe/embarques); se prioriza que todas vean el mismo estado al instante sin interrumpir con notificaciones, a diferencia de "Altas de Clientes" donde el toast le avisa a una sola persona (el vendedor) sobre su propia alta.
- **Mismos permisos para admin, jefeReparto y embarques dentro del panel:** ya comparten acceso operativo pleno a "Distribución Diaria"; no hay razón para restringir acciones entre ellos en este panel.
- **Mantenimiento como rango de fechas (`fecha_inicio`/`fecha_fin`), no fecha única:** un mantenimiento puede tomar varios días; mismo criterio que los periodos de ausencia de choferes.
- **Campos de mantenimiento: tipo, descripción, taller y costo:** el usuario pidió los cuatro; taller y costo quedan como opcionales porque no siempre se capturan al momento de programar.
- **Historial completo de mantenimientos por unidad, no solo el actual/próximo:** permite ver el mantenimiento pasado de una unidad al decidir si necesita otro pronto.
- **Filtro de disponibilidad solo en la tabla de asignación de `PanelDistribucion.tsx`:** es la única "tabla de asignación de rutas" que mencionó el usuario; los otros tres selects de unidad solo excluyen bajas, igual que hoy el filtro de choferes ausentes tampoco aplica ahí.
- **Sin migración automática de los 26 números de `LISTA_UNIDADES`:** decisión explícita del usuario; se prefiere dar de alta cada unidad a mano con sus datos reales (tipo y capacidades) en vez de precargar números vacíos que habría que completar después.
- **Sin relación entre capacidad de la unidad y peso/volumen de los pedidos de una ruta:** el usuario solo pidió ver la capacidad como dato informativo; un motor de sugerencia de asignación automática queda fuera de este spec.
- **Ampliar el modal existente de spec 03 en vez de crear una vista nueva:** el usuario pidió explícitamente que apareciera "en la vista de personal en bodega, hasta el final"; reutiliza fecha, layout, patrón de exportación y convenciones visuales ya existentes.
- **Tabla espejo "Unidades No Disponibles", igual que "Personal Ausente":** decisión explícita del usuario ("al igual que las unidades"), para mantener simetría entre la sección de personal y la de unidades en la misma vista.
- **Unidades dadas de baja fuera de la vista por completo (ni disponibles ni no disponibles):** una unidad de baja está decomisionada y no es información relevante para planear el reparto del día siguiente, a diferencia de una en mantenimiento o fuera de servicio (que sí son operativamente relevantes de mostrar).
- **Tablas de unidades de solo lectura:** mismo criterio que "Personal Ausente" (informativo); cualquier cambio a una unidad (editar, disponibilidad, mantenimiento) se hace desde el panel "Unidades" ya implementado en este spec, no desde este modal de solo consulta.
- **Se incluyen en la exportación Excel/PDF existente, sin cambiar el nombre del archivo:** mismo reporte de "Personal en Bodega" ahora también informa sobre unidades, consistente con que ya exporta ambas tablas de personal juntas en un solo archivo.
- **En el PDF, las unidades van en hoja aparte (salto de página explícito antes de "UNIDADES DISPONIBLES"), con su propio resumen de conteos:** pedido explícito del usuario, para no mezclar visualmente el reporte de personal con el de unidades en la misma página impresa. En el modal en pantalla no aplica (no hay "páginas"): las 4 tablas se ven en una sola vista continua.
- **Orden por número aplicado antes de paginar, no después:** el directorio de unidades se ordena sobre `unidadesFiltradas` (la lista completa que cumple búsqueda/filtro) y luego se pagina; ordenar solo los 10 registros ya paginados producía páginas con el orden correcto internamente pero fuera de secuencia entre sí.
- **Reporte PDF del directorio completo de unidades, separado del reporte de "Personal en Bodega":** pedido explícito del usuario para ver el estado de toda la flota en cualquier momento, no solo el día de una ruta; reutiliza el patrón ya existente de `exportarPDF` en `AdminChoferes.tsx` (resumen de conteos, tabla) en vez de crear una abstracción compartida entre paneles distintos.
- **Portrait en vez de landscape:** pedido explícito del usuario; a diferencia del directorio de personal (9 columnas), el de unidades solo tiene 5, por lo que cabe cómodo en vertical.
- **Capacidades con separador de miles (`toLocaleString("es-MX")`) en las cuatro vistas donde se muestran:** directorio en pantalla del panel "Unidades", su PDF, y las tablas "Unidades Disponibles"/"Unidades No Disponibles" del modal "Personal en Bodega" (pantalla y PDF). No se aplicó a la hoja de Excel de "Personal en Bodega" (fuera de lo pedido).
- **Encabezado "#" en vez de "Número" solo en el PDF del panel "Unidades" y en el modal/PDF de "Personal en Bodega":** el directorio en pantalla del panel "Unidades" conserva la columna "Número" (no se pidió cambiarla ahí).
- **"Finalizar mantenimiento" ajusta `fecha_fin` a ayer, en vez de agregar un campo `estado` propio al mantenimiento (ej. "Completado"/"En curso"):** mantiene `disponibilidadEfectiva` con una sola fuente de verdad (el rango de fechas); evita un segundo campo que pudiera quedar inconsistente con las fechas del registro. El registro conserva su `fecha_inicio` original, por lo que el historial sigue reflejando cuándo empezó el mantenimiento real.
- **Sin edición manual de `fecha_fin` como único camino:** aunque ya era posible lograr el mismo resultado editando el mantenimiento desde la pestaña "Mantenimientos", se agrega el atajo "Finalizar mantenimiento" directamente en la tabla de unidades porque es ahí donde el usuario nota que una unidad sigue marcada "En mantenimiento" y quiere resolverlo en un clic, sin tener que ubicar el registro correcto en el historial.
- **`motivo_baja` como texto libre, no un catálogo cerrado de razones (donación/venta/siniestro/etc.):** pedido explícito del usuario para el caso de "donada a Matriz"; mismo criterio que `motivo_fuera_servicio` y que `tipo` de unidad, ya decidido como texto libre en este spec.

## Riesgos identificados

| Riesgo                                                                                                                                    | Mitigación                                                                                                                                                                      |
| ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dos personas dan de alta el mismo número de unidad casi al mismo tiempo, antes de que la validación de duplicados vea el nuevo documento. | Riesgo aceptado, de baja probabilidad dado el tamaño del equipo; se puede corregir dando de baja el duplicado desde el panel.                                                   |
| Se programan dos mantenimientos con fechas que se traslapan para la misma unidad.                                                         | No se valida en esta versión; `disponibilidadEfectiva` simplemente considera "En mantenimiento" si cualquiera de los rangos cubre la fecha, sin romperse.                       |
| Una unidad se marca "Fuera de servicio" y se le programa además un mantenimiento con fechas vigentes.                                     | `disponibilidadEfectiva` da prioridad al estado manual ("Fuera de servicio") sobre el mantenimiento calculado, igual que `estadoEfectivo` prioriza el estado manual del chofer. |

## Lo que **no** está en este spec

- Migración automática de los 26 números de `LISTA_UNIDADES` a Firestore.
- Catálogo fijo de tipos de unidad.
- Filtro de disponibilidad en `ModalAsignarDespacho.tsx`, `ModalFinalizarViaje.tsx` o `MapaRutero.tsx`.
- Notificaciones tipo toast por cambios de disponibilidad.
- Validación cruzada entre capacidad de la unidad y peso/volumen de los pedidos.
- Eliminación física de unidades.
- Historial de kilometraje, combustible o documentos del vehículo.

Cada uno de estos, si se necesita, va en un spec aparte.
