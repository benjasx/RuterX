import { useState, useMemo, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
// Asegúrate de que las rutas de importación coincidan con tu estructura de carpetas
import { misClientes } from "../data/mockClients";
import { RUTAS } from "../data/mockRutas";

// Función para ajustar el mapa automáticamente a los puntos seleccionados
function MapUpdater({ markers }: { markers: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (markers.length > 0) {
      // fitBounds ajusta automáticamente zoom y posición para ver todos los puntos
      map.fitBounds(markers, { padding: [50, 50] });
    }
  }, [markers, map]);
  return null;
}

// Icono personalizado para el mapa
const customIcon = new L.DivIcon({
  html: `<div style="background-color: #2563eb; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.4);"></div>`,
  className: "custom-leaflet-icon",
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

export default function MapaRutero() {
  const [rutaSeleccionada, setRutaSeleccionada] = useState<string>(RUTAS[0]);
  const [selectedClienteIds, setSelectedClienteIds] = useState<string[]>([]);

  // Filtramos clientes según la ruta (ignora mayúsculas/minúsculas)
  const clientesDeRuta = useMemo(() => {
    return misClientes.filter(
      (c) => c.ruta.toLowerCase() === rutaSeleccionada.toLowerCase(),
    );
  }, [rutaSeleccionada]);

  // Al cambiar de ruta, seleccionamos todos por defecto
  useEffect(() => {
    setSelectedClienteIds(clientesDeRuta.map((c) => c.id));
  }, [rutaSeleccionada, clientesDeRuta]);

  // Obtenemos solo las posiciones de los clientes marcados para el MapUpdater
  const markerPositions = useMemo(() => {
    return clientesDeRuta
      .filter((c) => selectedClienteIds.includes(c.id))
      .map((c) => c.posicion);
  }, [selectedClienteIds, clientesDeRuta]);

  const toggleCliente = (id: string) => {
    setSelectedClienteIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const seleccionarTodos = () =>
    setSelectedClienteIds(clientesDeRuta.map((c) => c.id));
  const deseleccionarTodos = () => setSelectedClienteIds([]);

  return (
    <div className="flex w-full h-[calc(100vh-100px)] p-5 gap-5">
      {/* Menú Lateral */}
      <aside className="w-80 bg-white rounded-xl shadow-sm border border-slate-100 p-4 flex flex-col shrink-0">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 px-2">
          Seleccionar Ruta
        </h3>

        <select
          value={rutaSeleccionada}
          onChange={(e) => setRutaSeleccionada(e.target.value)}
          className="w-full p-3 mb-4 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium focus:ring-2 focus:ring-blue-500 cursor-pointer"
        >
          {RUTAS.map((ruta) => (
            <option key={ruta} value={ruta}>
              {ruta}
            </option>
          ))}
        </select>

        <div className="flex items-center justify-between mb-3 px-1">
          <span className="text-sm text-slate-500 font-medium">
            <span className="text-blue-600 font-bold">
              {selectedClienteIds.length}
            </span>
            <span className="text-slate-400"> de </span>
            <span className="text-slate-800 font-bold">
              {clientesDeRuta.length}
            </span>{" "}
            seleccionados
          </span>
          <div className="flex gap-2">
            <button
              onClick={seleccionarTodos}
              className="text-xs text-blue-600 hover:text-blue-800 font-semibold underline"
            >
              Todos
            </button>
            <button
              onClick={deseleccionarTodos}
              className="text-xs text-red-500 hover:text-red-700 font-semibold underline"
            >
              Ninguno
            </button>
          </div>
        </div>

        {/* Lista de Checkbox con scroll */}
        <div className="flex-1 overflow-y-auto pr-2 space-y-2">
          {clientesDeRuta.map((cliente) => (
            <label
              key={cliente.id}
              className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg hover:border-blue-300 transition-colors cursor-pointer"
            >
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-slate-800">
                  {cliente.nombre}
                </span>
                <span className="text-xs text-slate-500">
                  {cliente.descripcion}
                </span>
              </div>
              <input
                type="checkbox"
                checked={selectedClienteIds.includes(cliente.id)}
                onChange={() => toggleCliente(cliente.id)}
                className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            </label>
          ))}
        </div>
      </aside>

      {/* Mapa */}
      <div className="flex-1 rounded-xl overflow-hidden shadow-sm border border-slate-200">
        <MapContainer
          center={[21.4425, -104.8983]}
          zoom={12}
          style={{ height: "100%", width: "100%" }}
        >
          {/* El MapUpdater ajustará el mapa automáticamente */}
          <MapUpdater markers={markerPositions} />

          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

          {clientesDeRuta
            .filter((c) => selectedClienteIds.includes(c.id))
            .map((cliente) => (
              <Marker
                key={cliente.id}
                position={cliente.posicion}
                icon={customIcon}
              >
                <Popup>
                  <div className="text-sm">
                    <p className="font-bold">{cliente.nombre}</p>
                    <p className="text-slate-600">{cliente.descripcion}</p>
                    <p className="text-blue-600 mt-1 font-semibold">
                      Vendedor: {cliente.vendedor}
                    </p>
                  </div>
                </Popup>
              </Marker>
            ))}
        </MapContainer>
      </div>
    </div>
  );
}
