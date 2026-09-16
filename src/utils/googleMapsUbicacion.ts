// src/utils/googleMapsUbicacion.ts
// Reconoce la ubicación pegada por el vendedor en el alta de cliente: un link
// largo de Google Maps (con coordenadas en la URL) o coordenadas sueltas.
const RANGO_MEXICO = { latMin: 14, latMax: 33, lngMin: -118, lngMax: -86 };

const REGEX_ARROBA = /@(-?\d+\.?\d*),(-?\d+\.?\d*)/;
const REGEX_QUERY = /[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/;
const REGEX_SUELTAS = /^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/;

function coordenadasEnRango(lat: number, lng: number): boolean {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  return (
    lat >= RANGO_MEXICO.latMin &&
    lat <= RANGO_MEXICO.latMax &&
    lng >= RANGO_MEXICO.lngMin &&
    lng <= RANGO_MEXICO.lngMax
  );
}

export function parseUbicacionGoogleMaps(
  texto: string,
): { lat: number; lng: number } | null {
  const valor = texto.trim();
  if (valor === "") return null;

  const match =
    valor.match(REGEX_ARROBA) ||
    valor.match(REGEX_QUERY) ||
    valor.match(REGEX_SUELTAS);

  if (!match) return null;

  const lat = Number(match[1]);
  const lng = Number(match[2]);

  if (!coordenadasEnRango(lat, lng)) return null;

  return { lat, lng };
}
