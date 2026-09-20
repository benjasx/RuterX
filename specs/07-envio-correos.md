# 07 — Envío de Correos con Plantillas (Reimpresión de Facturas)

**Estado:** Aprobado
**Depende de:** Ninguno
**Fecha:** 2026-09-20

**Objetivo:** Construir un módulo "Correos" (solo admin) donde se crean plantillas de correo reutilizables con destinatarios/copia por defecto y un cuerpo con el marcador `{{folios}}`, y desde donde se llenan los folios de facturas a reimprimir y se envía el correo real vía Resend.

## Contexto

El pedido nace de un caso de uso puntual: pedir a un tercero la reimpresión de facturas, dando la lista de folios por correo, sin redactar el mensaje desde cero cada vez. La app hoy no tiene backend propio (solo Firebase Auth + Firestore desde el cliente) y Resend, el proveedor de correo elegido, **rechaza por CORS cualquier llamada hecha directo desde el navegador** (confirmado en su documentación oficial) además de exponer la API key a cualquiera que inspeccione el bundle. Por eso este spec agrega la primera pieza de backend del proyecto: una función serverless en Netlify, en una carpeta dentro de este mismo repo, que es la única que conoce la API key de Resend y que verifica que quien la llama es el admin autenticado antes de enviar nada.

## Alcance

**Dentro:**

- **Función serverless nueva** `netlify/functions/enviar-correo.ts` (Node), desplegada como sitio Netlify aparte apuntando a este repo (build solo de esa carpeta, no del frontend Vite/Firebase Hosting):
  - Recibe `POST` con `{ idToken, remitente, destinatarios, copia, asunto, cuerpo }`.
  - Verifica `idToken` con `firebase-admin` (Admin SDK inicializado con credenciales de servicio provistas por variable de entorno de Netlify, nunca commiteadas). Si el token no es válido o el correo del usuario no es `CORREO_ADMIN` (`admin@ruterx.com`, mismo valor que `src/utils/roles.ts`), responde `403` sin llamar a Resend.
  - Si el llamador es válido, llama a `resend.emails.send({ from: remitente, to: destinatarios.split(","), cc: copia ? copia.split(",") : undefined, subject: asunto, text: cuerpo })` usando `RESEND_API_KEY` (variable de entorno de Netlify).
  - Responde `200` con el `id` del envío de Resend, o `4xx/5xx` con el mensaje de error tal cual lo da Resend/Admin SDK.
- **Variables de entorno nuevas** (nunca en git): `RESEND_API_KEY` y las credenciales de servicio de Firebase Admin, ambas como variables de entorno del sitio Netlify (no del `.env` de Vite). En el frontend, `.env` gana `VITE_ENVIAR_CORREO_URL` con la URL pública de la función ya desplegada.
- **Colección Firestore nueva `plantillasCorreo`**: cada documento es una plantilla reutilizable, con `nombre`, `remitente` (email verificado en Resend), `asunto`, `cuerpo` (texto plano, puede contener el marcador `{{folios}}`), `destinatariosDefault` (correos separados por coma) y `copiaDefault` (correos separados por coma, puede ir vacío).
- **Nuevo servicio** `src/firebase/plantillasCorreoService.ts` con `obtenerPlantillasCorreoFirebase`, `agregarPlantillaCorreoFirebase`, `actualizarPlantillaCorreoFirebase`, `eliminarPlantillaCorreoFirebase`, mismo patrón try/catch que el resto de `src/firebase/*Service.ts`.
- **Panel nuevo `PanelCorreos.tsx`**, sub-vista `"correos"` en el sidebar (ítem "Correos", ícono `Mail` de `lucide-react`), visible **solo para admin** (`permisos.correos = esAdmin(usuarioEmail)`, igual patrón que "Ajustes de Rentabilidad").
- Dentro del panel:
  - Lista de plantillas guardadas, con botón "Nueva plantilla" que abre un formulario (nombre, remitente, asunto, cuerpo con nota visible de que `{{folios}}` se reemplaza al enviar, destinatarios por defecto, copia por defecto). Editar y eliminar plantilla (eliminar con `confirmar()`, mismo patrón que el resto de la app).
  - Al elegir una plantilla para enviar: formulario de envío precargado con su asunto/cuerpo/destinatarios/copia (todos editables para ese envío puntual, sin afectar la plantilla guardada) más un campo nuevo "Folios" (texto libre, correos y folios separados por coma, ej. `1023, 1024, 1050`).
  - Al enviar: se reemplaza `{{folios}}` en el cuerpo por el valor del campo Folios (si el marcador no aparece en el cuerpo, los folios simplemente no se insertan en ningún lado — no se agrega un bloque automático); se valida que cada entrada de destinatarios/copia tenga forma de correo (regex simple `algo@algo.algo`), bloqueando el envío con `notificarError` si alguna es inválida.
  - Antes de llamar a la función, se muestra `confirmar()` (mismo patrón de `src/utils/notificaciones.ts`) con un resumen (destinatarios, copia, asunto, folios).
  - Al confirmar: `auth.currentUser.getIdToken()` + `POST` a `VITE_ENVIAR_CORREO_URL`; éxito → `notificarExito`; error → `notificarError` con el mensaje que devuelva la función.
- **Reglas de Firestore** para `plantillasCorreo`: lectura y escritura solo `esAdmin()`, mismo patrón que `configuracion/ajustes_rentabilidad`.

**Fuera de alcance (para otro spec si hace falta):**

- No se guarda historial de correos enviados (destinatarios, folios, fecha) dentro de la app; si se necesita auditoría, queda solo en el log del dashboard de Resend.
- No hay editor de texto enriquecido; el cuerpo es texto plano (los saltos de línea se envían tal cual, sin convertir a HTML).
- No se adjuntan archivos (PDFs, imágenes) al correo; solo texto con folios.
- No se valida ni gestiona la verificación de dominio en Resend desde la app; es un paso manual del usuario en el dashboard de Resend antes de que el remitente de una plantilla funcione.
- No hay roles adicionales con acceso (ni `jefeReparto` ni `embarques`); solo admin.
- Los folios no se validan como números ni se relacionan con ninguna colección de facturas existente; es texto libre, igual que el campo `folios_no_embarcados` que ya existe en `viajesService.ts`.
- No se reintenta automáticamente un envío fallido; si Resend o la función responden error, el usuario debe volver a intentarlo manualmente.

## Datos

```ts
// Nuevo: src/firebase/plantillasCorreoService.ts
// Colección "plantillasCorreo"
export interface PlantillaCorreo {
  id?: string;
  nombre: string;
  remitente: string; // email "from"; debe ser un dominio verificado en Resend
  asunto: string;
  cuerpo: string; // texto plano; puede contener el marcador {{folios}}
  destinatariosDefault: string; // correos separados por coma
  copiaDefault: string; // correos separados por coma (CC); puede ir vacío
}
```

```ts
// Nuevo: netlify/functions/enviar-correo.ts — cuerpo del POST
interface EnviarCorreoRequest {
  idToken: string; // ID token de Firebase Auth del usuario autenticado
  remitente: string;
  destinatarios: string; // correos separados por coma
  copia: string; // correos separados por coma; puede ir vacío
  asunto: string;
  cuerpo: string; // ya con {{folios}} reemplazado por el frontend
}
```

No se agrega ninguna colección más ni se modifica ninguna estructura existente.

## Plan de implementación

1. Crear `netlify.toml` en la raíz del repo y `netlify/functions/enviar-correo.ts` como esqueleto (recibe `POST`, responde `501 not implemented`). Agregar `resend` y `firebase-admin` a `package.json`.
2. Implementar en `enviar-correo.ts` la verificación del `idToken` con `firebase-admin` (inicializado con credenciales de servicio leídas de variable de entorno de Netlify) y el chequeo de que el correo decodificado sea `CORREO_ADMIN`; responder `403` si falla.
3. Implementar el envío real con `resend.emails.send(...)` usando `RESEND_API_KEY` (variable de entorno de Netlify); responder `200` con el `id` de Resend o el error tal cual.
4. Crear un sitio Netlify nuevo apuntando a este repo, configurar como directorio de funciones `netlify/functions`, cargar las variables de entorno (`RESEND_API_KEY`, credenciales de Firebase Admin) y desplegar. Anotar la URL pública de la función.
5. Agregar `VITE_ENVIAR_CORREO_URL` a `.env` con esa URL.
6. Crear `src/firebase/plantillasCorreoService.ts` con `PlantillaCorreo` y las cuatro funciones CRUD, patrón try/catch de `unidadesService.ts`. Verificar con `npm run build`.
7. En `firestore.rules`: agregar `match /plantillasCorreo/{docId} { allow read, write: if esAdmin(); }`. Publicar las reglas.
8. Crear `src/components/PanelCorreos.tsx`: `useQuery` de `plantillasCorreo`; lista de plantillas con alta/edición/eliminación (eliminar con `confirmar()`), patrón visual de `PanelAjustesRentabilidad.tsx`. Verificar con `npm run build`.
9. En `src/components/SidebarAdmin.tsx`: agregar `"correos"` a `SubVistaAdmin`, `permisos.correos = esAdmin(usuarioEmail)` e ítem "Correos" (ícono `Mail`). En `src/components/AdminPanel.tsx`: renderizar `PanelCorreos` en `menuActivo === "correos"`. Verificar con `npm run build`.
10. En `PanelCorreos.tsx`: agregar el flujo de envío — al elegir una plantilla, formulario editable (asunto, cuerpo, destinatarios, copia, campo nuevo Folios); reemplazo de `{{folios}}` en el cuerpo; validación de formato de correos; `confirmar()` con resumen; al confirmar, `getIdToken()` + `POST` a `VITE_ENVIAR_CORREO_URL`; `notificarExito`/`notificarError` según respuesta. Verificar con `npm run build`.
11. Prueba manual: en el dashboard de Resend, confirmar que el dominio del remitente que se va a usar está verificado.
12. Prueba manual: crear una plantilla con `{{folios}}` en el cuerpo, destinatarios y copia por defecto; confirmar que se guarda y aparece en la lista.
13. Prueba manual: editar el asunto/cuerpo/destinatarios de una plantilla ya guardada y confirmar que persiste.
14. Prueba manual: eliminar una plantilla (con confirmación) y confirmar que desaparece.
15. Prueba manual: usar una plantilla, cambiar el campo Folios, confirmar el envío y verificar que el correo llega con `{{folios}}` reemplazado correctamente en el cuerpo, a los destinatarios/copia indicados.
16. Prueba manual: intentar enviar con un destinatario mal escrito (sin `@`) y confirmar que se bloquea con `notificarError` antes de llamar a la función.
17. Prueba manual: llamar a la URL de la función sin `idToken` o con un token de un usuario no-admin (con `curl`/Postman) y confirmar que responde `403` sin enviar ningún correo.
18. Prueba manual: confirmar que un usuario no-admin no ve "Correos" en el sidebar.
19. Prueba manual: forzar un error de Resend (ej. remitente de un dominio no verificado) y confirmar que `notificarError` muestra el mensaje real, no un mensaje genérico.

Cada paso deja el repo compilando (`npm run build`) y, a partir del paso 4, la función desplegada y funcional.

## Criterios de aceptación

- [ ] "Correos" es visible en el sidebar solo para `admin`; ningún otro rol lo ve.
- [ ] Se puede crear, editar y eliminar (con confirmación) una plantilla con nombre, remitente, asunto, cuerpo, destinatarios por defecto y copia por defecto.
- [ ] Al usar una plantilla, el formulario de envío se precarga con su asunto/cuerpo/destinatarios/copia, todos editables sin modificar la plantilla guardada.
- [ ] El campo Folios reemplaza el marcador `{{folios}}` en el cuerpo del correo antes de enviar.
- [ ] Antes de enviar se muestra un modal de confirmación con el resumen del correo.
- [ ] Un destinatario o copia con formato inválido bloquea el envío con un mensaje de error, sin llamar a la función.
- [ ] Un envío válido llega realmente al correo destino (verificado manualmente) con el remitente, asunto, cuerpo con folios y copia correctos.
- [ ] La función `enviar-correo` rechaza con `403` cualquier llamada sin `idToken` válido o de un usuario que no sea `CORREO_ADMIN`, sin invocar a Resend.
- [ ] La API key de Resend y las credenciales de Firebase Admin no aparecen en ningún archivo commiteado al repo (`.env`, `netlify.toml` ni el código de la función).
- [ ] Un error real de Resend (ej. dominio no verificado) se muestra al usuario con el mensaje devuelto por la función, no un mensaje genérico.
- [ ] `npm run build` pasa sin errores de tipo.

## Decisiones tomadas

- **Se agrega una función serverless (Netlify) en vez de enviar directo desde el frontend:** decisión forzada, no solo de preferencia — Resend bloquea por CORS las llamadas hechas directo desde el navegador (confirmado en su documentación oficial), así que enviar desde el cliente no solo expone la API key sino que ni siquiera funciona.
- **Netlify (no Firebase Cloud Functions) y en una carpeta dentro de este mismo repo:** decisión explícita del usuario, después de plantear ambas opciones (Cloud Function habría evitado un servicio externo nuevo pero requiere plan Blaze).
- **La función verifica el `idToken` de Firebase Auth contra `CORREO_ADMIN`, no un secreto compartido fijo:** un secreto fijo tendría que vivir en el bundle del cliente para poder mandarlo, reproduciendo el mismo problema de exposición que se quiere evitar; verificar el token de sesión real del admin no tiene ese punto débil.
- **Remitente editable por plantilla, no uno solo fijo para toda la app:** decisión explícita del usuario; permite usar distintas direcciones verificadas en Resend según el propósito de cada plantilla.
- **Cuerpo en texto plano, sin editor enriquecido:** decisión explícita del usuario para arrancar simple; un editor rico queda como posible spec futuro si hace falta.
- **Modal de confirmación antes de enviar:** decisión explícita del usuario; un envío de correo real no se puede deshacer, mismo criterio que ya usa el resto de la app para eliminar filas.
- **Folios como texto libre separado por coma, sin estructura ni relación con otra colección:** decisión explícita del usuario; coincide con el patrón ya existente de `folios_no_embarcados` en `viajesService.ts`.
- **Sin historial de envíos en Firestore:** decisión explícita del usuario; si se necesita auditoría, se consulta en el dashboard de Resend o se hace un spec aparte.
- **Solo admin tiene acceso al módulo:** decisión explícita del usuario, a diferencia de otros paneles operativos (Unidades, Rentabilidad) que comparten acceso con `jefeReparto`/`embarques`.
- **Destinatarios y copia guardados como default en la plantilla, pero editables en cada envío:** decisión explícita del usuario; evita re-escribirlos cuando casi siempre son los mismos sin impedir un ajuste puntual.

## Riesgos identificados

| Riesgo                                                                                             | Mitigación                                                                                                                                        |
| -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| El remitente de una plantilla usa un dominio no verificado en Resend y el envío falla.             | El error real de Resend se muestra con `notificarError`; verificar el dominio en el dashboard de Resend es un paso manual documentado en el plan. |
| Las credenciales de Firebase Admin o `RESEND_API_KEY` se commitean por error al repo.              | Ambas viven solo como variables de entorno del sitio Netlify, nunca en `.env` de Vite ni en el código versionado; se revisa antes de cada commit. |
| El sitio de Netlify se cae o cambia de URL sin actualizar `VITE_ENVIAR_CORREO_URL`.                | El envío falla con un error visible (`notificarError`); no hay reintento automático ni fallback, riesgo aceptado dado el tamaño del equipo.       |
| Alguien con la sesión de admin abierta en un dispositivo compartido podría disparar envíos reales. | Mismo riesgo que cualquier otra acción admin de la app (ej. eliminar datos); no se agrega un segundo factor para este módulo en particular.       |

## Lo que **no** está en este spec

- Historial de correos enviados dentro de la app.
- Editor de texto enriquecido (HTML) para el cuerpo.
- Adjuntar archivos al correo.
- Gestión o validación de dominios verificados en Resend desde la app.
- Acceso para roles distintos de admin.
- Validación estructurada de folios o relación con una colección de facturas.
- Reintento automático de envíos fallidos.

Cada uno de estos, si se necesita, va en un spec aparte.
