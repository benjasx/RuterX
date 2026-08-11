import L from "leaflet";

export const BASE_XALISCO = { lat: 21.453237, lng: -104.890221 };

export const LISTA_RUTAS = [
  "Tomatlan",
  "Mazatlan",
  "Ixtlan",
  "Vallarta",
  "Ruiz Larga",
  "Ruiz Corta",
  "El Pitillal",
  "Bahia de Banderas",
  "18 de Marzo",
  "Escuinapa-Mazatlan",
  "Las Varas - Zacualpan",
  "La Peñita de Jaltemba",
  "Las Juntas - Ixtapa",
  "San Blas",
  "Compostela",
  "Acaponeta - Sayulilla",
  "TECUALA - MAYORISTAS",
  "Tuxpan",
  "Villa Hidalgo",
  "Magdalena - Tala",
  "Santiago - Pozo de Ibarra",
  "Santiago - Sentispac",
  "Santiago Centro",
  "JBC - PUEBLA",
  "Local Tours",
  "Local Samaniego",
  "Compostela JBC",
  "Las Varas - Chacala",
  "Acaponeta",
  "Ixtlan - Parra",
  "Ixtlan - Joel Perez",
  "Local - JBC - El Surtidor",
  "Suc.Vallarta (Traspaso)",
  "Local GrufaNay",
  "Local - Samao",
  "las varas - Peñita",
  "TECUALA - RANCHERIAS",
  "TLMK",
  "TLMK 2",
  "IXTLAN - OSORIO - MACHUCA",
  "IXTLAN - JOEL - PARRA",
  "LOCAL - KAPDA",
  "RUIZ - ALMANZA",
  "Vallarta - Cueto",
  "Santiago",
  "GRUFARNAY 1",
  "GRUFARNAY 2",
  "la peñita larga",
  "la peñita corta",
  "mazatlan - Juarez",
  "Vallarta - Pitillal",
  "Bahia de Banderas 2",
  "Escuinapa",
  "Mazatlan - Mayoristas",
  "Recoge en Bodega",
].sort();

export const LISTA_UNIDADES = [
  "01",
  "02",
  "03",
  "04",
  "05",
  "06",
  "07",
  "08",
  "09",
  "10",
  "11",
  "12",
  "13",
  "14",
  "16",
  "17",
  "18",
  "19",
  "20",
  "21",
  "22",
  "23",
  "24",
  "25",
  "26",
  "27",
  "28",
];

// Fórmula Haversine para calcular distancias en línea recta
export const calcularDistancia = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Convertir logo a Base64 para el PDF
export const obtenerLogoBase64Local = async (path: string) => {
  try {
    const response = await fetch(path);
    const blob = await response.blob();
    return new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    return null;
  }
};

// Iconos de Leaflet
export const crearIconoCliente = (estado?: string) => {
  let colorBg = "#2563eb"; // Pendiente (Azul)
  if (estado === "entregado") colorBg = "#16a34a"; // Verde
  if (estado === "cancelado") colorBg = "#dc2626"; // Rojo
  if (estado === "no_entregado") colorBg = "#ca8a04"; // Amarillo

  return new L.DivIcon({
    html: `
      <div style="background-color: ${colorBg}; width: 28px; height: 28px; border-radius: 6px; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center;">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width: 16px; height: 16px;">
          <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/>
          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
          <path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/>
          <path d="M2 7h20"/>
          <path d="M22 7v3a2 2 0 0 1-2 2v0a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12v0a2 2 0 0 1-2-2V7"/>
        </svg>
      </div>
    `,
    className: "custom-leaflet-icon",
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
};

export const baseIcon = new L.DivIcon({
  html: `<div style="font-size: 28px; text-shadow: 0 2px 4px rgba(0,0,0,0.5);">⭐</div>`,
  className: "custom-base-icon",
  iconSize: [30, 30],
  iconAnchor: [15, 15],
  popupAnchor: [0, -15],
});
