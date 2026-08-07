import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import * as XLSX from "xlsx"; 

import { obtenerClientesFirebase } from "../firebase/clientesService";
import { obtenerRutasFirebase } from "../firebase/rutasService";
import { Download, FileText, Route, Loader2 } from "lucide-react"; 

// 1. INTERFAZ
interface ClienteMapa {
  id: string;
  nombre: string;
  descripcion: string;
  ruta: string;
  vendedor: string;
  posicion: [number, number];
}

// 2. COORDENADAS BASE: BODEGA XALISCO
const BASE_XALISCO = { lat: 21.453237, lng: -104.890221 };

// Fórmula de Haversine
const calcularDistancia = (lat1: number, lon1: number, lat2: number, lon2: number) => {
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

const obtenerLogoBase64Local = async (path: string) => {
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

function MapUpdater({ markers, polylineBounds }: { markers: [number, number][], polylineBounds?: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    const puntosAEnfocar = polylineBounds && polylineBounds.length > 0 ? polylineBounds : markers;
    const puntosConBase = [[BASE_XALISCO.lat, BASE_XALISCO.lng] as [number, number], ...puntosAEnfocar];
    if (puntosConBase.length > 1) {
      map.fitBounds(puntosConBase, { padding: [50, 50] });
    }
  }, [markers, polylineBounds, map]);
  return null;
}

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

const baseIcon = new L.DivIcon({
  html: `<div style="font-size: 28px; text-shadow: 0 2px 4px rgba(0,0,0,0.5);">⭐</div>`,
  className: "custom-base-icon",
  iconSize: [30, 30],
  iconAnchor: [15, 15],
  popupAnchor: [0, -15],
});

export default function MapaRutero() {
  const [rutaSeleccionada, setRutaSeleccionada] = useState<string>("");
  const [selectedClienteIds, setSelectedClienteIds] = useState<string[]>([]);
  
  const [rutaOptima, setRutaOptima] = useState<ClienteMapa[] | null>(null);
  const [rutaCarretera, setRutaCarretera] = useState<[number, number][] | null>(null);
  const [cargandoRuta, setCargandoRuta] = useState(false);

  const { data: clientesData = [], isLoading: cargandoClientes } = useQuery({
    queryKey: ["clientes"],
    queryFn: obtenerClientesFirebase,
  });

  const { data: rutasData = [], isLoading: cargandoRutas } = useQuery({
    queryKey: ["rutas"],
    queryFn: obtenerRutasFirebase,
  });

  const clientesTotales = clientesData as ClienteMapa[];
  const rutasDisponibles = useMemo(() => {
    return [...(rutasData as any[])].sort((a, b) =>
      a.nombre.localeCompare(b.nombre),
    );
  }, [rutasData]);

  useEffect(() => {
    if (rutasDisponibles.length > 0 && !rutaSeleccionada) {
      const rutaEnMemoria = localStorage.getItem("rutasmart_ruta");
      if (
        rutaEnMemoria &&
        rutasDisponibles.find((r) => r.nombre === rutaEnMemoria)
      ) {
        setRutaSeleccionada(rutaEnMemoria);
      } else {
        setRutaSeleccionada(rutasDisponibles[0].nombre);
      }
    }
  }, [rutasDisponibles, rutaSeleccionada]);

  const cargando = cargandoClientes || cargandoRutas;

  const clientesDeRuta = useMemo(() => {
    if (!rutaSeleccionada) return [];
    return clientesTotales.filter(
      (c) => c.ruta && c.ruta.toLowerCase() === rutaSeleccionada.toLowerCase(),
    );
  }, [rutaSeleccionada, clientesTotales]);

  useEffect(() => {
    setRutaOptima(null);
    setRutaCarretera(null);
  }, [selectedClienteIds, rutaSeleccionada]);

  useEffect(() => {
    if (!rutaSeleccionada || clientesDeRuta.length === 0) return;

    const rutaGuardada = localStorage.getItem("rutasmart_ruta");
    const clientesGuardadosStr = localStorage.getItem("rutasmart_clientes");

    if (rutaSeleccionada === rutaGuardada) {
      if (clientesGuardadosStr) {
        setSelectedClienteIds(JSON.parse(clientesGuardadosStr));
      } else {
        setSelectedClienteIds(clientesDeRuta.map((c) => c.id));
      }
    } else {
      localStorage.setItem("rutasmart_ruta", rutaSeleccionada);
      const todos = clientesDeRuta.map((c) => c.id);
      setSelectedClienteIds(todos);
      localStorage.setItem("rutasmart_clientes", JSON.stringify(todos));
    }
  }, [rutaSeleccionada, clientesDeRuta]);

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
    setSelectedClienteIds((prev) => {
      const nuevoEstado = prev.includes(id)
        ? prev.filter((i) => i !== id)
        : [...prev, id];
      localStorage.setItem("rutasmart_clientes", JSON.stringify(nuevoEstado));
      return nuevoEstado;
    });
  };

  const seleccionarTodos = () => {
    const todos = clientesDeRuta.map((c) => c.id);
    setSelectedClienteIds(todos);
    localStorage.setItem("rutasmart_clientes", JSON.stringify(todos));
  };

  const deseleccionarTodos = () => {
    setSelectedClienteIds([]);
    localStorage.setItem("rutasmart_clientes", JSON.stringify([]));
  };

  const trazarRutaOptima = async () => {
    const clientesValidos = clientesDeRuta.filter(
      (c) => selectedClienteIds.includes(c.id) && Array.isArray(c.posicion) && c.posicion.length === 2
    );

    if (clientesValidos.length === 0) return;

    setCargandoRuta(true);

    let noVisitados = [...clientesValidos];
    let ubicacionActual = BASE_XALISCO;
    let rutaCalculada: ClienteMapa[] = [];

    while (noVisitados.length > 0) {
      let indexMasCercano = -1;
      let distanciaMinima = Infinity;

      for (let i = 0; i < noVisitados.length; i++) {
        const d = calcularDistancia(
          ubicacionActual.lat,
          ubicacionActual.lng,
          noVisitados[i].posicion[0],
          noVisitados[i].posicion[1]
        );

        if (d < distanciaMinima) {
          distanciaMinima = d;
          indexMasCercano = i;
        }
      }

      const clienteSiguiente = noVisitados.splice(indexMasCercano, 1)[0];
      rutaCalculada.push(clienteSiguiente);
      ubicacionActual = { lat: clienteSiguiente.posicion[0], lng: clienteSiguiente.posicion[1] };
    }

    setRutaOptima(rutaCalculada);

    try {
      const puntosOSRM = [
        [BASE_XALISCO.lng, BASE_XALISCO.lat],
        ...rutaCalculada.map((c) => [c.posicion[1], c.posicion[0]])
      ];

      const coordenadasUrl = puntosOSRM.map(p => p.join(',')).join(';');
      const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${coordenadasUrl}?overview=full&geometries=geojson`;

      const response = await fetch(osrmUrl);
      const data = await response.json();

      if (data.code === 'Ok' && data.routes.length > 0) {
        const coordsCarretera = data.routes[0].geometry.coordinates.map(
          (c: [number, number]) => [c[1], c[0]] as [number, number]
        );
        setRutaCarretera(coordsCarretera);
      }
    } catch (error) {
      console.error("Error al trazar carretera:", error);
      alert("Problemas de conexión con el satélite de carreteras. Se trazará en línea recta temporalmente.");
    } finally {
      setCargandoRuta(false);
    }
  };

  const handleExportarExcel = () => {
    if (!rutaOptima) return;
    
    const datosExcel = rutaOptima.map((c, i) => ({
      "Orden de Visita": i + 1,
      "Nombre del Cliente": c.nombre,
      "Domicilio": c.descripcion,
      "Ruta": c.ruta,
      "Vendedor": c.vendedor,
      "Notas": "", // Espacio en blanco en el Excel
    }));

    const ws = XLSX.utils.json_to_sheet(datosExcel);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Hoja de Ruta");
    XLSX.writeFile(wb, `Ruta_Optima_${rutaSeleccionada}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleExportarPDF = async () => {
    if (!rutaOptima) return;
    const pdfMake = (window as any).pdfMake;
    if (!pdfMake) return alert("Generador PDF cargando...");
    
    const logoBase64 = await obtenerLogoBase64Local("/CIRLogo.png");
    
    // 🚀 NUEVO ENCABEZADO DE TABLA (CON COLUMNA DE NOTAS)
    const tableBody: any[][] = [
      [
        { text: "N°", style: "th", alignment: "center" },
        { text: "Cliente", style: "th" },
        { text: "Domicilio", style: "th" },
        { text: "Notas", style: "th" },
        { text: "Entrega", style: "th", alignment: "center" },
      ]
    ];

    rutaOptima.forEach((cliente, index) => {
      tableBody.push([
        { text: `${index + 1}`, style: "td", alignment: "center" },
        { text: cliente.nombre, style: "td", bold: true },
        { text: cliente.descripcion, style: "td" },
        { text: "", style: "td" }, // 🚀 ESPACIO VACÍO PARA QUE EL CHOFER ESCRIBA
        { text: "[   ]", style: "tdCheckbox", alignment: "center" }
      ]);
    });

    const docDefinition = {
      pageOrientation: "portrait",
      pageMargins: [30, 30, 30, 30],
      content: [
        {
          columns: [
            logoBase64 ? { image: logoBase64, width: 70 } : { text: "CIR", bold: true },
            {
              text: `HOJA DE RUTA ÓPTIMA\nRUTA: ${rutaSeleccionada}`,
              style: "mainTitle",
              alignment: "right",
              margin: [0, 5, 0, 0],
            },
          ],
          margin: [0, 0, 0, 15],
        },
        // 🚀 NUEVA SECCIÓN PARA EL NOMBRE Y FIRMA DEL CHOFER
        {
          text: "Nombre del Chofer: ________________________________________________________    Firma: ________________________",
          fontSize: 10,
          bold: true,
          color: "#334155",
          margin: [0, 0, 0, 10],
        },
        {
          text: `Fecha de emisión: ${new Date().toLocaleDateString("es-MX")} - Total a visitar: ${rutaOptima.length} clientes.`,
          fontSize: 9,
          color: "#475569",
          margin: [0, 0, 0, 10],
        },
        {
          table: {
            headerRows: 1,
            // 🚀 AJUSTE DE ANCHOS: Asignamos 25% para cliente, resto para domicilio y 20% para notas
            widths: ["auto", "25%", "*", "20%", "auto"],
            body: tableBody,
          },
          layout: "lightHorizontalLines",
        }
      ],
      styles: {
        mainTitle: { fontSize: 13, bold: true, color: "#1e293b" },
        th: { bold: true, fontSize: 10, fillColor: "#2563eb", color: "white", margin: 4 },
        td: { fontSize: 9, margin: 4, color: "#334155" },
        tdCheckbox: { fontSize: 12, margin: 4, color: "#94a3b8", bold: true },
      },
    };

    pdfMake.createPdf(docDefinition).download(`Ruta_Logistica_${rutaSeleccionada}.pdf`);
  };

  const posicionesLíneaRecta = rutaOptima
    ? [[BASE_XALISCO.lat, BASE_XALISCO.lng], ...rutaOptima.map((c) => c.posicion)]
    : [];

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
      
      <aside className="w-80 bg-white rounded-xl shadow-sm border border-slate-100 p-4 flex flex-col shrink-0">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 px-2">
          Seleccionar Ruta
        </h3>

        <select
          value={rutaSeleccionada}
          onChange={(e) => setRutaSeleccionada(e.target.value)}
          className="w-full p-3 mb-4 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium focus:ring-2 focus:ring-blue-500 cursor-pointer outline-none"
        >
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

        <div className="flex-1 overflow-y-auto pr-2 space-y-2 custom-scrollbar mb-4">
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
                className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
            </label>
          ))}
        </div>

        <div className="pt-4 border-t border-slate-100 flex flex-col gap-2 shrink-0">
          {!rutaOptima ? (
            <button
              onClick={trazarRutaOptima}
              disabled={selectedClienteIds.length < 2 || cargandoRuta}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold py-3 rounded-lg transition-colors shadow-sm"
            >
              {cargandoRuta ? (
                <><Loader2 size={18} className="animate-spin"/> Generando Asfalto...</>
              ) : (
                <><Route size={18} /> Trazar Ruta Óptima</>
              )}
            </button>
          ) : (
            <>
              <div className="flex gap-2">
                <button
                  onClick={handleExportarExcel}
                  className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-lg transition-colors shadow-sm text-sm"
                >
                  <Download size={16} /> Excel
                </button>
                <button
                  onClick={handleExportarPDF}
                  className="flex-1 flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-700 text-white font-bold py-2.5 rounded-lg transition-colors shadow-sm text-sm"
                >
                  <FileText size={16} /> PDF
                </button>
              </div>
              <p className="text-xs text-center text-slate-500 mt-1">
                La ruta ha sido optimizada logísticamente.
              </p>
            </>
          )}
        </div>
      </aside>

      <div className="flex-1 rounded-xl overflow-hidden shadow-sm border border-slate-200">
        <MapContainer
          center={[BASE_XALISCO.lat, BASE_XALISCO.lng]}
          zoom={12}
          style={{ height: "100%", width: "100%" }}
        >
          <MapUpdater 
            markers={markerPositions} 
            polylineBounds={rutaCarretera || (posicionesLíneaRecta as [number, number][])} 
          />

          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

          <Marker position={[BASE_XALISCO.lat, BASE_XALISCO.lng]} icon={baseIcon}>
            <Popup>
              <div className="text-sm font-bold text-slate-800 text-center">
                ⭐ BODEGA CENTRAL<br/>XALISCO
              </div>
            </Popup>
          </Marker>

          {rutaCarretera ? (
             <Polyline 
              positions={rutaCarretera} 
              color="#2563eb" 
              weight={5} 
            />
          ) : rutaOptima ? (
            <Polyline 
              positions={posicionesLíneaRecta as [number, number][]} 
              color="#94a3b8" 
              weight={4} 
              dashArray="8, 8" 
            />
          ) : null}

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
                    {rutaOptima && (
                      <p className="text-xs bg-blue-100 text-blue-800 font-bold px-2 py-1 rounded inline-block mt-2">
                        Parada N° {rutaOptima.findIndex(c => c.id === cliente.id) + 1}
                      </p>
                    )}
                  </div>
                </Popup>
              </Marker>
            ))}
        </MapContainer>
      </div>
    </div>
  );
}
