// netlify/functions/enviar-correo.ts
// Única pieza del proyecto con acceso a RESEND_API_KEY. Recibe el POST del
// panel Correos, valida al llamador y despacha el envío real (spec 07).
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

// Debe coincidir con CORREO_ADMIN en src/utils/roles.ts.
const CORREO_ADMIN = "admin@ruterx.com";

interface NetlifyEvent {
  httpMethod: string;
  body: string | null;
  headers: Record<string, string | undefined>;
}

interface NetlifyResponse {
  statusCode: number;
  body: string;
  headers?: Record<string, string>;
}

interface EnviarCorreoRequest {
  idToken: string;
  remitente: string;
  destinatarios: string;
  copia: string;
  asunto: string;
  cuerpo: string;
}

// Credenciales de servicio en FIREBASE_SERVICE_ACCOUNT_JSON (el JSON completo
// como string), variable de entorno del sitio Netlify, nunca commiteada.
function appAdmin() {
  const existente = getApps()[0];
  if (existente) return existente;

  const credencialesJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!credencialesJson) {
    throw new Error("Falta la variable de entorno FIREBASE_SERVICE_ACCOUNT_JSON");
  }
  return initializeApp({ credential: cert(JSON.parse(credencialesJson)) });
}

export const handler = async (
  event: NetlifyEvent,
): Promise<NetlifyResponse> => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
  }

  let datos: EnviarCorreoRequest;
  try {
    datos = JSON.parse(event.body ?? "{}");
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Cuerpo inválido" }) };
  }

  if (!datos.idToken) {
    return { statusCode: 403, body: JSON.stringify({ error: "Falta idToken" }) };
  }

  try {
    const decodificado = await getAuth(appAdmin()).verifyIdToken(datos.idToken);
    if (decodificado.email !== CORREO_ADMIN) {
      return { statusCode: 403, body: JSON.stringify({ error: "No autorizado" }) };
    }
  } catch {
    return { statusCode: 403, body: JSON.stringify({ error: "Token inválido" }) };
  }

  return {
    statusCode: 501,
    body: JSON.stringify({ error: "not implemented" }),
  };
};
