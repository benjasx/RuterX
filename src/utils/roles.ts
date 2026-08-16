// src/utils/roles.ts
// Fuente única de verdad para la lógica de roles por correo.
// Firestore Security Rules replica estas mismas constantes — si cambias
// un correo aquí, actualiza también firestore.rules.
export const CORREO_ADMIN = "admin@ruterx.com";
export const CORREO_JEFE_REPARTO = "jefedereparto@ruterx.com";
export const CORREO_EMBARQUES_1 = "emb01@ruterx.com";
export const CORREO_EMBARQUES_2 = "emb02@ruterx.com";

export const esAdmin = (email?: string | null) => email === CORREO_ADMIN;

export const esJefeReparto = (email?: string | null) =>
  email === CORREO_JEFE_REPARTO;

export const esEmbarques = (email?: string | null) =>
  email === CORREO_EMBARQUES_1 || email === CORREO_EMBARQUES_2;

export const esPersonalAutorizado = (email?: string | null) =>
  esAdmin(email) || esJefeReparto(email) || esEmbarques(email);
