import { useState, useMemo, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// 1. IMPORTAMOS TUS SERVICIOS DE FIREBASE EN LUGAR DE LOS MOCKS
import { obtenerClientesFirebase } from "../firebase/clientesService";
import { obtenerRutasFirebase, type Ruta } from "../firebase/rutasService";

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
  html: `
    <div style="background-color: #2563eb; width: 28px; height: 28px; border-radius: 6px; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center;">
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

export default function MapaRutero() {
  // 2. NUEVOS ESTADOS PARA LOS DATOS EN LA NUBE
  const [clientesTotales, setClientesTotales] = useState<any[]>([]);
  const [rutasDisponibles, setRutasDisponibles] = useState<Ruta[]>([]);
  const [cargando, setCargando] = useState(true);

  const [rutaSeleccionada, setRutaSeleccionada] = useState<string>("");
  const [selectedClienteIds, setSelectedClienteIds] = useState<string[]>([]);

  // 3. CARGAMOS LOS DATOS AL ABRIR LA PANTALLA
  useEffect(() => {
    const cargarDatos = async () => {
      setCargando(true);
      const [clientesData, rutasData] = await Promise.all([
        obtenerClientesFirebase(),
        obtenerRutasFirebase(),
      ]);

      setClientesTotales(clientesData);

      // NUEVO: Ordenamos las rutas alfabéticamente apenas llegan de Firebase
      const rutasOrdenadas = [...rutasData].sort((a, b) =>
        a.nombre.localeCompare(b.nombre),
      );

      // Guardamos la lista ya ordenada en el estado
      setRutasDisponibles(rutasOrdenadas);

      // Si hay rutas, seleccionamos la primera (que ahora será la primera alfabéticamente)
      if (rutasOrdenadas.length > 0) {
        setRutaSeleccionada(rutasOrdenadas[0].nombre);
      }

      setCargando(false);
    };

    cargarDatos();
  }, []);

  // 4. FILTRAMOS USANDO LOS CLIENTES REALES (ignorando mayúsculas/minúsculas)
  const clientesDeRuta = useMemo(() => {
    if (!rutaSeleccionada) return [];
    return clientesTotales.filter(
      (c) => c.ruta && c.ruta.toLowerCase() === rutaSeleccionada.toLowerCase(),
    );
  }, [rutaSeleccionada, clientesTotales]);

  // Al cambiar de ruta, seleccionamos todos por defecto
  useEffect(() => {
    setSelectedClienteIds(clientesDeRuta.map((c) => c.id));
  }, [rutaSeleccionada, clientesDeRuta]);

  // Obtenemos solo las posiciones VÁLIDAS de los clientes marcados
  const markerPositions = useMemo(() => {
    return clientesDeRuta
      .filter(
        (c) =>
          selectedClienteIds.includes(c.id) &&
          Array.isArray(c.posicion) &&
          c.posicion.length === 2,
      )
      .map((c) => c.posicion as [number, number]);
  }, [selectedClienteIds, clientesDeRuta]);

  const toggleCliente = (id: string) => {
    setSelectedClienteIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const seleccionarTodos = () =>
    setSelectedClienteIds(clientesDeRuta.map((c) => c.id));
  const deseleccionarTodos = () => setSelectedClienteIds([]);

  // PANTALLA DE CARGA MIENTRAS DESCARGA DE FIREBASE
  if (cargando) {
    return (
      <div className="flex w-full h-[calc(100vh-100px)] items-center justify-center bg-slate-50">
        <p className="text-slate-500 font-bold text-lg animate-pulse">
          Cargando mapa y ubicaciones reales...
        </p>
      </div>
    );
  }

  return (
    <div className="flex w-full h-[calc(100vh-100px)] p-5 gap-5 bg-slate-50">
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
          {/* AHORA ITERAMOS SOBRE LAS RUTAS DE FIREBASE (YA ORDENADAS) */}
          {rutasDisponibles.map((ruta) => (
            <option key={ruta.id} value={ruta.nombre}>
              {ruta.nombre}
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

          {/* PINTAMOS SOLO LOS CLIENTES QUE TENGAN COORDENADAS VÁLIDAS */}
          {clientesDeRuta
            .filter(
              (c) =>
                selectedClienteIds.includes(c.id) &&
                Array.isArray(c.posicion) &&
                c.posicion.length === 2,
            )
            .map((cliente) => (
              <Marker
                key={cliente.id}
                position={cliente.posicion as [number, number]}
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
