# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Comandos

- `npm run dev` — servidor de desarrollo (Vite)
- `npm run build` — `tsc -b && vite build` (el type-check es parte del build; no hay `tsc --noEmit` separado)
- `npm run lint` — ESLint sobre todo el repo
- `npm run preview` — sirve el build de producción
- No hay test runner configurado (sin Jest/Vitest). No inventar comandos de test.
- `node respaldar.cjs` — vuelca todas las colecciones de Firestore a `mi_respaldo_firestore.json` usando `credenciales.json` (service account, no está en git). Herramienta manual de respaldo, no forma parte del build.

## Arquitectura

App de una sola página (React 19 + TypeScript + Vite) para gestión de rutas de reparto, "RuterX". Sin React Router: la navegación es 100% estado local (`useState`) persistido en `localStorage`.

**Firebase** es la única fuente de datos: Firestore (`src/firebase/config.ts`) + Auth por email/password. No hay backend propio; todo el acceso a datos vive en `src/firebase/*Service.ts`, un archivo por colección (rutas, clientes, vendedores, choferes, viajes, asistencia, distribucion, ajustesNomina). Cada función expone `obtener*`/`agregar*`/`actualizar*`/`eliminar*Firebase` y hace las llamadas a Firestore directamente (sin capa de repositorio genérica). Los componentes consumen estas funciones vía TanStack Query (`useQuery`), no con `useEffect` + `fetch`.

**Roles de usuario — NO hay campo `role` en Firestore.** El rol se deriva del correo del usuario autenticado, comparándolo contra constantes hardcodeadas (`admin@ruterx.com`, `jefedereparto@ruterx.com`, `emb01@ruterx.com`, `emb02@ruterx.com`). Esta lógica de permisos está **duplicada** en al menos tres sitios: `RuterMapas.tsx`, `AdminPanel.tsx` y `SidebarAdmin.tsx` (cada uno recalcula `esJefeReparto`/`esEmbarques`/`esAdmin` a partir del email). Al tocar permisos, hay que actualizar los tres consistentemente. Cualquier otro correo autenticado es tratado como "chofer" y solo ve el Rutero (mapa), nunca el Admin Panel.

**Flujo de vistas:**
- `RuterMapas.tsx` (raíz de la app): controla sesión (Firebase Auth) y decide entre `Login`, `AdminPanel` (vista `"admin"`) o `MapaRutero` (vista `"rutero"`).
- `AdminPanel.tsx` + `SidebarAdmin.tsx`: shell del panel administrativo, con sub-vistas (`SubVistaAdmin`) filtradas por rol vía el objeto `permisos` en `SidebarAdmin`. Ahí viven Dashboard, Monitor de Rutas, Distribución, Asistencia, Clientes, Rutas, Vendedores, Historial, Ajustes de Nómina y Choferes.
- `MapaRutero.tsx`: componente dual — admin/jefe/embarques arman y despachan viajes (Leaflet + `calcularRutaOptimaYCarretera`); choferes ven y operan su propio viaje activo del día (iniciar, marcar entregas, finalizar). El mismo componente decide su comportamiento vía la prop `esAdmin`.
- Submódulos de mapa en `src/components/mapa/` (`ModalAsignarDespacho`, `ModalFinalizarViaje`, `PanelLateralMapaAdmin`, `ResumenJornadaChofer`) son piezas específicas de ese flujo de despacho/viaje, no vistas independientes.

**Datos de dominio "estáticos"** (lista de rutas de reparto, unidades/vehículos, coordenadas base) están hardcodeados en `src/utils/mapaUtils.ts`, no en Firestore.

**Reportes/exportación:** `src/utils/pdf*.ts` y `reportes*Utils.ts` generan PDFs (jsPDF/pdfmake) y Excel (xlsx) por dominio (nómina, auditoría, distribución, asistencia, rutas por chofer). Al agregar un reporte nuevo, seguir el patrón del archivo más parecido en vez de crear una abstracción común.

**Estilos:** Tailwind CSS v4 vía el plugin de Vite (`@tailwindcss/vite`), sin `tailwind.config.js` (config v4 vive en CSS). Iconos con `lucide-react`.

**Variables de entorno:** `VITE_FIREBASE_*` en `.env` (no versionado). `credenciales.json` (service account para `respaldar.cjs`) tampoco está en git — nunca commitear ninguno de los dos.
