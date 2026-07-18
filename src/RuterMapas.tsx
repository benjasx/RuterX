import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";

// Creamos un icono personalizado con HTML y Tailwind/CSS
const customIcon = new L.DivIcon({
  html: `<div style="background-color: #2563eb; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
  className: "custom-leaflet-icon",
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

export default function RuterMapas() {
  // Coordenadas centrales de Xalisco, Nayarit
  const posicionCentral: [number, number] = [21.4425, -104.8983];

  return (
    <div className="min-h-screen bg-slate-50 p-6 flex flex-col items-center">
      <h1 className="text-3xl font-bold text-slate-800 mb-6">
        Mapa Operativo - RutaSmart
      </h1>

      {/* El contenedor del mapa debe tener una altura definida */}
      <div className="w-full max-w-7xl h-200 rounded-xl overflow-hidden shadow-lg border border-slate-200 z-0">
        <MapContainer
          center={posicionCentral}
          zoom={13}
          style={{ height: "100%", width: "100%" }}
        >
          {/* Capa de los mosaicos (el diseño del mapa) */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Marcador de prueba */}
          <Marker position={posicionCentral} icon={customIcon}>
            <Popup>
              <div className="text-center">
                <p className="font-bold text-slate-800">Abarrotes El Sol</p>
                <p className="text-sm text-slate-600">Centro, Xalisco</p>
              </div>
            </Popup>
          </Marker>
        </MapContainer>
      </div>
    </div>
  );
}
