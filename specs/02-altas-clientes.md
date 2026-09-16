# 02 — Altas de Clientes (vendedor → revisión de admin)

**Estado:** aprobado
**Depende de:** Ninguno
**Fecha:** 2026-09-16

**Objetivo:** Agregar un módulo "Altas de Clientes", visible solo para los roles vendedor y admin, donde el vendedor captura los datos de un cliente nuevo (incluyendo su ubicación de Google Maps) en una colección de revisión separada, para que el admin las apruebe o rechace antes de puntear al cliente manualmente en el rutero.

## Contexto

Hoy existe un módulo "Clientes" (`PanelClientes.tsx` + `FormularioCliente.tsx` + `DirectorioClientes.tsx`, colección Firestore `clientes`) de uso exclusivo del admin (`permisos.clientes = esAdmin(usuarioEmail)` en `SidebarAdmin.tsx:76`), donde se captura nombre, domicilio, vendedor, ruta y coordenadas manuales (lat/lng numéricos) para que el cliente aparezca en el mapa (`MapaRutero.tsx`).

Este spec **no modifica ese módulo**. Introduce uno nuevo y separado, pensado para que el propio vendedor (en campo, desde su celular) capture los datos de un cliente nuevo sin depender de que alguien más los transcriba. Como el vendedor no conoce la ruta de reparto ni siempre está seguro del pin correcto, el alta entra a una colección de revisión (`altasClientes`) con estatus, y es el admin quien la revisa, corrige si hace falta, y decide si la aprueba (para después puntear al cliente él mismo en el rutero, fuera de este flujo) o la rechaza.

El rol "vendedor" no existe hoy en el sistema de roles (`src/utils/roles.ts`): los roles actuales son `admin`, `jefeReparto`, `embarques` (con correo hardcodeado como respaldo) y `chofer` (cualquier otro correo autenticado). Existe por separado una entidad "Vendedor" (`src/types/index.ts`, colección `vendedores`, gestionada en `PanelVendedores.tsx`) que es un directorio de contacto/comisiones — su campo `correo` nunca se usa para autenticación, solo se muestra y se exporta. Este spec no reutiliza esa entidad para login: el rol "vendedor" es un rol de acceso nuevo, 100% dinámico, asignado por el admin desde "Gestión de Usuarios" (`GestionUsuarios.tsx`), igual que hoy se asigna `jefeReparto` o `embarques`.

## Alcance

**Dentro:**

- Rol nuevo `vendedor` en `ROLES_VALIDOS` (`src/utils/roles.ts`), asignable desde "Gestión de Usuarios", sin correo hardcodeado (a diferencia de `admin`/`jefeReparto`/`embarques`, que sí tienen uno de respaldo).
- Sub-vista nueva `"altasClientes"` en el sidebar, con label "Altas de Clientes", visible solo para `admin` y `vendedor`.
- Un usuario con rol `vendedor` entra directo al Panel Administrativo mostrando únicamente esta sección (sin Dashboard, sin Monitor de Rutas, sin acceso al Rutero/mapa).
- Componente dual por rol (mismo patrón que `MapaRutero.tsx` con su prop `esAdmin`):
  - **Vendedor:** ve un formulario para capturar un cliente nuevo, y debajo la lista de las altas que él mismo ha capturado, con su estatus (`pendiente` / `aprobada` / `rechazada`). Puede editar los campos de una alta propia mientras su estatus sea `pendiente` o `rechazada`; una vez `aprobada`, deja de poder editarla (solo el admin puede).
  - **Admin:** ve una bandeja con todas las altas de todos los vendedores, puede editar los campos de cualquiera antes de decidir, y puede aprobarla o rechazarla (con motivo opcional).
- Formulario de alta con los campos: nombre del cliente, nombre del negocio, domicilio (texto), entre calles (opcional), referencias de domicilio (texto libre, opcional), nombre de contacto (opcional), teléfono de contacto, teléfono de referencia (opcional), correo (opcional), tipo de cliente (`credito` / `contado` / `pagoAnticipado`, requerido), notas/observaciones (opcional), vendedor (seleccionado de la lista ya existente en la colección `vendedores`), y ubicación de Google Maps. El formulario se agrupa visualmente en secciones (Datos del cliente / Domicilio / Contacto / Comercial / Ubicación) en vez de un solo bloque de campos apilados.
- Ubicación de Google Maps capturada como texto libre, aceptando dos formatos: (a) un link largo de Google Maps que traiga las coordenadas en la URL (ej. `.../@19.4326,-99.1332,17z` o `?q=19.4326,-99.1332`), o (b) coordenadas sueltas pegadas directamente (`19.4326, -99.1332`). Se valida el rango de México igual que hoy hace `PanelClientes.tsx` (`validarCoordenadas`/`RANGO_MEXICO`).
- En la bandeja del admin, un enlace/botón "Ver ubicación" que abre `https://www.google.com/maps?q=lat,lng` en pestaña nueva, usando las coordenadas ya parseadas.
- Colección Firestore nueva `altasClientes`, separada de `clientes`, con reglas de seguridad: el vendedor puede crear y leer sus propias altas, y editarlas mientras su estatus no sea `aprobada`; el admin (correo hardcodeado `admin@ruterx.com`) puede leer/editar/aprobar/rechazar cualquiera, en cualquier estatus.
- Notificación en vivo para el vendedor: mientras tenga la sección "Altas de Clientes" abierta, si el admin aprueba o rechaza una de sus altas, el estatus se actualiza solo (sin refrescar) y aparece un toast ("Tu alta de \[nombre del cliente\] fue aprobada/rechazada"), vía un listener de Firestore (`onSnapshot`) sobre sus propias altas — mismo patrón que ya usa `RuterMapas.tsx` para detectar la cuenta deshabilitada en vivo. No hay push notifications ni correo: si el vendedor no tiene la app abierta, no se entera hasta que vuelve a entrar y ve el estatus actualizado en la lista.

**Fuera:**

- No se modifica el módulo "Clientes" existente (`PanelClientes.tsx`, `FormularioCliente.tsx`, `DirectorioClientes.tsx`, colección `clientes`) ni su lógica de puntear en el rutero.
- Al aprobar una alta, **no** se crea ni modifica ningún documento en la colección `clientes`, ni se coloca nada automáticamente en el mapa. El admin coloca el pin real / crea el cliente definitivo por su cuenta, usando los datos de la alta aprobada como referencia. Un atajo de "convertir en cliente" queda fuera de este spec.
- No se incluye selección de Ruta de reparto en el formulario de alta: ese criterio operativo lo decide el admin después, fuera de este flujo.
- No se agrega un mapa interactivo (Leaflet) para colocar el pin a mano; la ubicación se captura solo como texto (link o coordenadas).
- No se resuelven links cortos de Google Maps (`maps.app.goo.gl`) automáticamente (ver sección de Riesgos): no se hace ninguna llamada de red para expandirlos.
- No se extiende la entidad "Vendedor" (`vendedoresService.ts`) ni se usa su campo `correo` para identificar al vendedor logueado.
- No se hace dinámico el `esAdmin()` de `firestore.rules` (sigue dependiendo del correo hardcodeado `admin@ruterx.com`, igual que las demás colecciones administrativas hoy).

## Datos

Colección Firestore nueva: `altasClientes`. Cada documento:

```js
{
  nombreCliente: string,          // requerido
  nombreNegocio: string,          // requerido
  domicilio: string,              // requerido
  entreCalles: string,            // opcional, "" si no se captura
  referenciasDomicilio: string,   // opcional, "" si no se captura
  nombreContacto: string,         // opcional, "" si no se captura
  telefonoContacto: string,       // requerido
  telefonoReferencia: string,     // opcional, "" si no se captura
  correo: string,                 // opcional, "" si no se captura
  tipoCliente: "credito" | "contado" | "pagoAnticipado", // requerido
  notas: string,                  // opcional, "" si no se captura
  vendedorNombre: string,         // requerido, nombre elegido de la colección "vendedores"
  ubicacionTexto: string,         // requerido, el link o las coordenadas tal como las pegó el vendedor
  posicion: [number, number],     // requerido, [lat, lng] ya parseado y validado
  creadoPorEmail: string,         // correo de la cuenta "vendedor" que hizo login y guardó el alta
  estatus: "pendiente" | "aprobada" | "rechazada", // default "pendiente"
  motivoRechazo: string,          // opcional, solo si estatus === "rechazada"
  creadoEn: Timestamp,
  actualizadoEn: Timestamp,
}
```

`nombreCliente` es el nombre de la persona/cliente; `nombreNegocio` es el nombre comercial del negocio — son dos datos distintos. `entreCalles` es un dato de ubicación adicional a `referenciasDomicilio` (p. ej. "entre Av. Insurgentes y Calle Hidalgo"), en el mismo espíritu de un domicilio completo mexicano (ej. `Blvd. Tepic-Xalisco 111, Huertas de Matatipac, 63787 Xalisco, Nay.`) pero sin exigir ese formato exacto. `telefonoReferencia` es un segundo teléfono de respaldo, distinto del `telefonoContacto` principal. `creadoPorEmail` es la cuenta de acceso (para saber de quién es el alta y filtrar "mis altas"); `vendedorNombre` es el nombre comercial elegido del directorio de `vendedores` (puede no coincidir 1 a 1 con `creadoPorEmail` — ver Riesgos). `posicion` se deriva de `ubicacionTexto` al guardar, con la misma forma `[lat, lng]` que ya usa `clientes.posicion`, para reutilizar el mismo criterio de "Ver ubicación" que ya existe en `DirectorioClientes.tsx`.

## Plan de implementación

1. En `src/utils/roles.ts`: agregar `"vendedor"` a `ROLES_VALIDOS` y exportar `esVendedor(email)`, siguiendo el mismo patrón de `esJefeReparto`/`esEmbarques` pero **sin** correo hardcodeado de respaldo (solo `rolDinamicoDe(email) === "vendedor"`).
2. En `src/components/GestionUsuarios.tsx`: agregar `vendedor: "Vendedor"` a `ETIQUETA_ROL` para que el admin pueda crear/editar usuarios con ese rol.
3. En `firestore.rules`: agregar una función `esVendedorDinamico()` que lea el rol desde `get(/databases/$(database)/documents/usuarios/$(request.auth.uid)).data.role == 'vendedor'` (primer uso de un lookup dinámico en las reglas; hasta hoy todas las funciones de rol son 100% por correo hardcodeado), y agregar el bloque `match /altasClientes/{docId}` con: `create` → `esVendedorDinamico()` y que `request.resource.data.creadoPorEmail == request.auth.token.email`; `read` → `esAdmin()` o (`esVendedorDinamico()` y `resource.data.creadoPorEmail == request.auth.token.email`); `update` → `esAdmin()` o (`esVendedorDinamico()`, `resource.data.creadoPorEmail == request.auth.token.email` y `resource.data.estatus != 'aprobada'`); `delete` → solo `esAdmin()`. Publicar las reglas actualizadas.
4. Crear `src/firebase/altasClientesService.ts` con `agregarAltaClienteFirebase`, `obtenerAltasClientesFirebase`, `actualizarAltaClienteFirebase` (edición de campos) y `actualizarEstatusAltaClienteFirebase(id, estatus, motivoRechazo?)`, siguiendo el mismo patrón try/catch/`{success}` de `clientesService.ts`; el tipo `AltaClienteNueva` incluye los campos nuevos (`nombreCliente`, `nombreNegocio`, `entreCalles`, `telefonoReferencia`, `correo`, `tipoCliente`).
5. Crear `src/utils/googleMapsUbicacion.ts` con una función `parseUbicacionGoogleMaps(texto)` que reconozca los formatos `@lat,lng`, `?q=lat,lng`/`&q=lat,lng` y coordenadas sueltas `lat,lng`, devolviendo `{ lat, lng } | null`, reutilizando la misma validación de rango de México que `PanelClientes.tsx` (`RANGO_MEXICO`).
6. Crear `src/components/FormularioAltaCliente.tsx`: formulario controlado con los campos del modelo de datos, agrupado en secciones visuales (Datos del cliente / Domicilio / Contacto / Comercial / Ubicación), selector de vendedor poblado con `obtenerVendedoresFirebase`, selector de tipo de cliente (Crédito / Contado / Pago anticipado, obligatorio), y el campo de ubicación validado con el parser del paso 5 (mostrando un error claro si no se reconoce el texto).
7. Crear `src/components/DirectorioAltasClientes.tsx`: lista/tabla de altas con dos modos según prop `esAdmin`: en modo vendedor, las altas cuyo `creadoPorEmail` sea el usuario actual, con badge de estatus, badge de tipo de cliente, "Ver ubicación", y acción "Editar" (reutiliza el formulario del paso 6 en modo edición) habilitada solo si el estatus es `pendiente` o `rechazada`; en modo admin, todas las altas, con acciones "Editar" (sin restricción de estatus), "Aprobar", "Rechazar" (con motivo opcional) y "Ver ubicación" (abre `https://www.google.com/maps?q=lat,lng` en pestaña nueva).
8. Crear `src/components/AltasClientes.tsx`: contenedor con `useQuery(["altasClientes"], obtenerAltasClientesFirebase)` que arma `FormularioAltaCliente` + `DirectorioAltasClientes` (modo propio) cuando `esAdmin` es falso, o solo `DirectorioAltasClientes` (modo admin) cuando es verdadero.
9. En `AltasClientes.tsx`, modo vendedor: agregar un listener `onSnapshot` (Firestore) sobre `query(collection(db, "altasClientes"), where("creadoPorEmail", "==", usuarioEmail))` que mantenga sincronizado el caché de TanStack Query (`queryClient.setQueryData`) y, al detectar que el `estatus` de una alta ya conocida cambió de `pendiente` a `aprobada`/`rechazada`, dispare un toast (`notificarExito`/`notificarAdvertencia`) con el nombre del cliente y (si aplica) el motivo de rechazo.
10. En `src/components/SidebarAdmin.tsx`: agregar `"altasClientes"` a `SubVistaAdmin`, agregar la prop `esVendedor`, agregar `permisos.altasClientes = esAdmin(usuarioEmail) || esVendedor` y el ítem correspondiente ("Altas de Clientes") al arreglo `items`.
11. En `src/components/AdminPanel.tsx`: agregar el caso `menuActivo === "altasClientes"` renderizando `<AltasClientes esAdmin={esAdmin(usuarioEmail)} usuarioEmail={usuarioEmail} />`.
12. En `src/RuterMapas.tsx`: calcular `esVendedorActual = checkEsVendedor(usuarioActual?.email)`, pasarlo a `SidebarAdmin`, incluirlo en el branching inicial de sesión (si es vendedor, `setVistaActual("admin")` y `menuActivo` por defecto `"altasClientes"`), y ampliar la condición que decide renderizar `AdminPanel` (`vistaActual === "admin" && (esPersonalAutorizado || esVendedorActual)`) para que el vendedor sí vea el panel en vez de caer al `MapaRutero`.
13. Verificar con `npm run build` que no hay errores de tipos.
14. Prueba manual: crear un usuario con rol "vendedor" desde "Gestión de Usuarios", iniciar sesión con él, confirmar que en el sidebar solo aparece "Altas de Clientes", capturar un alta con todos los campos (incluido tipo de cliente) usando un link largo de Google Maps y otra con coordenadas sueltas, y confirmar que ambas se guardan y aparecen en su lista con estatus "pendiente".
15. Prueba manual: iniciar sesión como admin, ver la bandeja con ambas altas, editar una, aprobarla, rechazar la otra con un motivo — con la pestaña del vendedor abierta en paralelo, confirmar que el estatus y el toast aparecen solos, sin refrescar.
16. Prueba manual: confirmar que un usuario chofer o embarques no ve "Altas de Clientes" en su sidebar.

Cada paso deja la app compilando y funcional.

## Criterios de aceptación

- [ ] Un usuario con rol `vendedor` ve en el sidebar únicamente "Altas de Clientes" (sin Dashboard, Monitor de Rutas ni acceso al Rutero).
- [ ] Un usuario con rol `admin` ve "Altas de Clientes" además de sus demás secciones.
- [ ] Un usuario chofer o embarques no ve "Altas de Clientes" en su sidebar.
- [ ] El vendedor puede llenar y guardar el formulario con todos los campos del modelo de datos, incluidos nombre del cliente, nombre del negocio, entre calles, teléfono de referencia, correo y tipo de cliente.
- [ ] No se puede guardar el alta sin seleccionar un tipo de cliente (Crédito / Contado / Pago anticipado).
- [ ] Guardar con una ubicación no reconocible (link corto sin coordenadas, texto sin coordenadas, o coordenadas fuera del rango de México) muestra un error y no guarda el alta.
- [ ] Un link largo tipo `.../@19.4326,-99.1332,17z` guarda correctamente `posicion = [19.4326, -99.1332]`.
- [ ] Coordenadas sueltas `19.4326, -99.1332` guardan correctamente la misma `posicion`.
- [ ] Tras guardar, el alta aparece de inmediato en la lista propia del vendedor con estatus "pendiente".
- [ ] Un vendedor no ve en su lista las altas capturadas por otro vendedor.
- [ ] El admin ve en su bandeja las altas de todos los vendedores.
- [ ] El admin puede editar los campos de una alta antes de aprobarla o rechazarla.
- [ ] El vendedor puede editar los campos de una alta propia mientras su estatus sea "pendiente" o "rechazada".
- [ ] Una vez que una alta está "aprobada", el vendedor ya no puede editarla (ni desde la UI ni a nivel de Firestore Rules); solo el admin puede.
- [ ] Al aprobar una alta, su estatus cambia a "aprobada" y no se crea ni modifica ningún documento en la colección `clientes`.
- [ ] Al rechazar una alta (con o sin motivo), su estatus cambia a "rechazada" y el documento no se borra.
- [ ] El vendedor ve reflejado el nuevo estatus de sus altas al refrescar la lista.
- [ ] Si el vendedor tiene la sección "Altas de Clientes" abierta cuando el admin aprueba o rechaza una de sus altas, el estatus se actualiza solo y aparece un toast, sin necesidad de refrescar la página.
- [ ] Desde la bandeja del admin, "Ver ubicación" abre Google Maps en una pestaña nueva con las coordenadas correctas.
- [ ] Un usuario con rol dinámico "vendedor" puede crear, leer y editar (mientras no estén "aprobadas") sus propias altas en Firestore, pero no puede leer ni editar las de otro vendedor ni escribir en `clientes`/`rutas`/`vendedores`.
- [ ] Solo el correo `admin@ruterx.com` puede aprobar, rechazar, eliminar, o editar una alta ya "aprobada", a nivel de Firestore Rules.
- [ ] `npm run build` pasa sin errores de tipo.

## Decisiones tomadas

- **Colección separada `altasClientes` en vez de reutilizar `clientes`:** evita que datos capturados en campo por el vendedor (posible error de pin o de domicilio) contaminen de inmediato el directorio que ya usa el Rutero para operar; el admin filtra antes de que un cliente "cuente" de verdad.
- **Rol `vendedor` 100% dinámico, sin correo hardcodeado:** a diferencia de `admin`/`jefeReparto`/`embarques`, no existe un correo fijo de vendedor en el negocio — se crean cuantos el admin necesite desde "Gestión de Usuarios".
- **Ubicación solo por texto (link largo o coordenadas), sin mapa interactivo:** más simple de implementar y suficiente para el caso de uso; un mapa Leaflet embebido queda como posible extensión futura si el parseo por texto resulta insuficiente en la práctica.
- **Sin campo Ruta en el formulario de alta:** el vendedor en campo no necesariamente sabe a qué ruta de reparto pertenece un cliente nuevo; ese criterio queda para el admin al momento de puntear.
- **Sin integración automática a `clientes` al aprobar:** aprobar solo cambia el estatus; el admin sigue creando el cliente real y colocando el pin por su cuenta, fuera de este flujo. Si en el futuro se quiere un atajo "convertir en cliente", es un spec aparte.
- **Identificación del vendedor con dos campos (`creadoPorEmail` + `vendedorNombre`):** `creadoPorEmail` es la cuenta de acceso (necesaria para las reglas de Firestore y para filtrar "mis altas"); `vendedorNombre` es el nombre elegido del directorio de `vendedores` ya existente, reutilizando el mismo selector que hoy usa `FormularioCliente.tsx`.
- **Motivo de rechazo opcional y el registro se conserva:** sirve de histórico tanto para el admin como para que el vendedor entienda por qué no procedió.
- **Reglas de Firestore con lookup dinámico (`get()` sobre `usuarios/{uid}`):** es el primer caso en el repo que hace esto (hasta ahora todas las funciones de rol en `firestore.rules` son 100% por correo hardcodeado) — necesario porque "vendedor" no tiene ningún correo de respaldo al no ser un rol con cuentas fijas conocidas de antemano.

## Riesgos identificados

| Riesgo                                                                                                                                                                                                                                                           | Mitigación                                                                                                                                                                                   |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Los links que genera el botón "Compartir" de Google Maps en celular suelen ser cortos (`maps.app.goo.gl/...`) y no traen coordenadas en el texto; expandirlos requeriría una llamada de red que el navegador bloquea por CORS.                                   | El formulario también acepta coordenadas sueltas pegadas (obtenibles manteniendo presionado el pin en la app de Maps). El mensaje de error al no reconocer un link explica esta alternativa. |
| Un vendedor podría seleccionar cualquier nombre de la lista de `vendedores` al capturar el alta, no necesariamente el suyo, ya que `vendedorNombre` no está ligado a `creadoPorEmail`.                                                                           | Se acepta como limitación conocida; el admin puede corregirlo al editar la alta antes de aprobarla.                                                                                          |
| Si en el futuro se asigna el rol `admin` dinámicamente desde "Gestión de Usuarios" a un correo distinto de `admin@ruterx.com`, ese usuario no podrá aprobar/rechazar altas a nivel de Firestore Rules (`esAdmin()` en las reglas sigue siendo 100% hardcodeado). | Mismo comportamiento que ya existe hoy para `clientes`/`rutas`/`vendedores`; hacer `esAdmin()` dinámico en las reglas queda fuera de este spec.                                              |
