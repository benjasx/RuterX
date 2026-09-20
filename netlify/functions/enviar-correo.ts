// netlify/functions/enviar-correo.ts
// Única pieza del proyecto con acceso a RESEND_API_KEY. Recibe el POST del
// panel Correos, valida al llamador y despacha el envío real (spec 07).

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

export const handler = async (
  event: NetlifyEvent,
): Promise<NetlifyResponse> => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
  }

  return {
    statusCode: 501,
    body: JSON.stringify({ error: "not implemented" }),
  };
};
