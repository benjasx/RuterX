# 04 — Gestión de Unidades (Vehículos, Disponibilidad y Mantenimientos)

**Estado:** Aprobado
**Depende de:** Ninguno
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

- Colección Firestore nueva `unidades`: `numero` (texto libre, único), `tipo` (texto libre, ej. "Fotón", "Isuzu"), `capacidad_kg` (número), `capacidad_m3` (número), `estado` (`"Disponible"` / `"Fuera de servicio"` / `"Baja"`, manual, default `"Disponible"`), `motivo_fuera_servicio` (texto libre, opcional).
- Colección Firestore nueva `mantenimientosUnidades`: historial completo (pasados, actuales y futuros) de mantenimientos programados por unidad, con `unidad_id`, `unidad_numero` (denormalizado), `tipo` (`"Preventivo"` / `"Correctivo"`), `descripcion`, `taller` (opcional), `costo` (opcional), `fecha_inicio` y `fecha_fin` (rango de días).
- Panel nuevo "Unidades" (`AdminUnidades.tsx`), sub-vista `"unidades"` en el sidebar, visible para `admin`, `jefeReparto` y `embarques` (permiso nuevo `permisos.unidades`), con las mismas acciones disponibles para los tres roles.
- Dentro del panel: formulario para dar de alta una unidad (número, tipo, capacidad en kg, capacidad en m³); tabla de unidades con su disponibilidad efectiva (badge: Disponible / En mantenimiento / Fuera de servicio / Baja); acción para editar los datos de una unidad; acción para alternar manualmente "Fuera de servicio" ↔ "Disponible" (con motivo de texto libre opcional); acción para dar de baja una unidad (baja lógica); acción para programar un mantenimiento nuevo y ver/editar/eliminar el historial de mantenimientos de esa unidad.
- Disponibilidad calculada automáticamente con una función `disponibilidadEfectiva` (mismo patrón que `estadoEfectivo` de `vacacionesUtils.ts`): si el `estado` manual es `"Fuera de servicio"` o `"Baja"`, ese es el resultado; si no, y existe un mantenimiento cuyo rango `fecha_inicio`–`fecha_fin` cubre la fecha evaluada, el resultado es `"En mantenimiento"`; si no, `"Disponible"`.
- El panel de Unidades escucha cambios en vivo con `onSnapshot` sobre `unidades` y `mantenimientosUnidades` (mismo patrón que el listener de `AltasClientes.tsx`), sincronizando la caché de TanStack Query sin mostrar ningún toast — varias personas (admin/jefe/embarques) pueden tener el panel abierto a la vez y ver los cambios de las demás al instante.
- Reemplazo de `LISTA_UNIDADES` por datos reales de Firestore en los cuatro lugares donde se usa hoy: `PanelDistribucion.tsx`, `ModalAsignarDespacho.tsx`, `ModalFinalizarViaje.tsx` y `MapaRutero.tsx`. En los tres últimos, el select solo lista los números de unidades activas (`estado !== "Baja"`), sin más cambio de comportamiento.
- En `PanelDistribucion.tsx` (tabla de asignación de rutas), además de excluir las unidades dadas de baja, el select "UNID" deshabilita (mismo patrón visual que ya usa para ocupadas, ej. "(OC)") las unidades cuya disponibilidad efectiva para la `fechaSeleccionada` no sea `"Disponible"`, mostrando una etiqueta corta del motivo (ej. "(MANTO)" / "(F. SERV.)").
- Reglas de Firestore para `unidades` y `mantenimientosUnidades`: lectura y escritura para `esPersonalAutorizado()` (admin, jefeReparto, embarques), igual patrón que `distribucion_diaria`.
- Validación: no se puede guardar una unidad con un `numero` que ya exista en otra unidad activa (comparación exacta tras recortar espacios, sin distinguir mayúsculas/minúsculas).

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
