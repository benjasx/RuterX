// src/utils/roles.ts
// Fuente única de verdad para la lógica de roles por correo.
// Firestore Security Rules replica estas mismas constantes — si cambias
// un correo aquí, actualiza también firestore.rules.
export const CORREO_ADMIN = "admin@ruterx.com";
export const CORREO_JEFE_REPARTO = "jefedereparto@ruterx.com";
export const CORREO_EMBARQUES_1 = "emb01@ruterx.com";
export const CORREO_EMBARQUES_2 = "emb02@ruterx.com";

// Roles asignados dinámicamente desde el panel "Gestión de Usuarios" (colección
// Firestore "usuarios"). Se resuelven una vez al iniciar sesión (ver RuterMapas.tsx)
// y sirven como complemento de las constantes de arriba, no como reemplazo: los
// correos hardcodeados siguen funcionando igual aunque nunca se les asigne un rol aquí.
export const ROLES_VALIDOS = ["admin", "jefeReparto", "embarques", "vendedor", "chofer"] as const;
export type RolUsuario = (typeof ROLES_VALIDOS)[number];

let rolDinamicoActual: { email: string; role: RolUsuario } | null = null;

export const setRolDinamico = (
  email?: string | null,
  role?: RolUsuario | null,
) => {
  rolDinamicoActual = email && role ? { email, role } : null;
};

const rolDinamicoDe = (email?: string | null) =>
  email && rolDinamicoActual?.email === email ? rolDinamicoActual.role : null;

export const esAdmin = (email?: string | null) =>
  email === CORREO_ADMIN || rolDinamicoDe(email) === "admin";

export const esJefeReparto = (email?: string | null) =>
  email === CORREO_JEFE_REPARTO || rolDinamicoDe(email) === "jefeReparto";

export const esEmbarques = (email?: string | null) =>
  email === CORREO_EMBARQUES_1 ||
  email === CORREO_EMBARQUES_2 ||
  rolDinamicoDe(email) === "embarques";

export const esVendedor = (email?: string | null) =>
  rolDinamicoDe(email) === "vendedor";

export const esPersonalAutorizado = (email?: string | null) =>
  esAdmin(email) || esJefeReparto(email) || esEmbarques(email);
