import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
  Polyline,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import * as XLSX from "xlsx";

import { obtenerChoferesFirebase } from "../firebase/choferesService";
import { obtenerClientesFirebase } from "../firebase/clientesService";
import { obtenerRutasFirebase } from "../firebase/rutasService";
import {
  asignarViajeFirebase,
  obtenerViajeActivoChofer,
  actualizarEstadoEntregaFirebase,
} from "../firebase/viajesService";
import {
  Download,
  FileText,
  Route,
  Loader2,
  Send,
  X,
  CheckCircle2,
  Ban,
  AlertTriangle,
} from "lucide-react";

interface ClienteMapa {
  id: string;
  nombre: string;
  descripcion: string;
  ruta?: string;
  vendedor?: string;
  posicion: [number, number];
  orden?: number;
  estado_entrega?: string;
  hora_entrega?: string;
}

interface MapaRuteroProps {
  esAdmin?: boolean;
  usuarioEmail?: string | null;
}

const BASE_XALISCO = { lat: 21.453237, lng: -104.890221 };

const calcularDistancia = (
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

function MapUpdater({
  markers,
  centerCoord,
}: {
  markers: [number, number][];
  centerCoord?: [number, number] | null;
}) {
  const map = useMap();
  useEffect(() => {
    if (centerCoord) {
      map.setView(centerCoord, 16, { animate: true });
    } else if (markers.length > 0) {
      map.fitBounds(markers, { padding: [50, 50] });
    }
  }, [markers, centerCoord, map]);
  return null;
}

const crearIconoCliente = (estado?: string) => {
  let colorBg = "#2563eb";
  if (estado === "entregado") colorBg = "#16a34a";
  if (estado === "cancelado") colorBg = "#dc2626";
  if (estado === "no_entregado") colorBg = "#ca8a04";

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

const baseIcon = new L.DivIcon({
  html: `<div style="font-size: 28px; text-shadow: 0 2px 4px rgba(0,0,0,0.5);">⭐</div>`,
  className: "custom-base-icon",
  iconSize: [30, 30],
  iconAnchor: [15, 15],
  popupAnchor: [0, -15],
});

export default function MapaRutero({
  esAdmin = false,
  usuarioEmail,
}: MapaRuteroProps) {
  const [rutaSeleccionada, setRutaSeleccionada] = useState<string>("");
  const [selectedClienteIds, setSelectedClienteIds] = useState<string[]>([]);
  const [rutaOptima, setRutaOptima] = useState<ClienteMapa[] | null>(null);
  const [rutaCarretera, setRutaCarretera] = useState<[number, number][] | null>(
    null,
  );
  const [cargandoRuta, setCargandoRuta] = useState(false);

  const [mostrarModalDespacho, setMostrarModalDespacho] = useState(false);
  const [choferSeleccionado, setChoferSeleccionado] = useState<string>("");

  const hoyStr = new Date().toLocaleDateString("sv-SE");
  const [fechaViaje, setFechaViaje] = useState(hoyStr);
  const [enviandoViaje, setEnviandoViaje] = useState(false);

  const [viajeActivoChofer, setViajeActivoChofer] = useState<any>(null);
  const [cargandoViajeChofer, setCargandoViajeChofer] = useState(false);

  const [centroMapa, setCentroMapa] = useState<[number, number] | null>(null);

  // Consultas con useQuery
  const { data: choferesData = [] } = useQuery({
    queryKey: ["choferes"],
    queryFn: obtenerChoferesFirebase,
    enabled: esAdmin,
  });

  const choferesDisponibles = useMemo(() => {
    return [...choferesData];
  }, [choferesData]);

  // Asignar el primer chofer por defecto si la lista se carga y no hay uno seleccionado
  useEffect(() => {
    if (choferesDisponibles.length > 0 && !choferSeleccionado) {
      const primerChofer =
        choferesDisponibles[0].email ||
        choferesDisponibles[0].correo ||
        choferesDisponibles[0].nombre;
      setChoferSeleccionado(primerChofer);
    }
  }, [choferesDisponibles, choferSeleccionado]);

  const { data: clientesData = [], isLoading: cargandoClientes } = useQuery({
    queryKey: ["clientes"],
    queryFn: obtenerClientesFirebase,
    enabled: esAdmin,
  });

  const { data: rutasData = [] } = useQuery({
    queryKey: ["rutas"],
    queryFn: obtenerRutasFirebase,
    enabled: esAdmin,
  });

  const clientesTotales = clientesData as ClienteMapa[];
  const rutasDisponibles = useMemo(() => {
    return [...(rutasData as any[])].sort((a, b) =>
      a.nombre.localeCompare(b.nombre),
    );
  }, [rutasData]);

  const cargarViajeChofer = async () => {
    if (!esAdmin && usuarioEmail) {
      setCargandoViajeChofer(true);
      const viaje = await obtenerViajeActivoChofer(usuarioEmail, hoyStr);
      setViajeActivoChofer(viaje);
      setCargandoViajeChofer(false);
    }
  };

  useEffect(() => {
    cargarViajeChofer();
  }, [esAdmin, usuarioEmail, hoyStr]);

  const handleCambiarEstado = async (
    clienteId: string,
    nuevoEstado: "entregado" | "cancelado" | "no_entregado",
  ) => {
    if (!viajeActivoChofer) return;
    try {
      const clienteActual = viajeActivoChofer.clientes.find(
        (c: any) => c.id === clienteId,
      );
      if (clienteActual && clienteActual.posicion) {
        setCentroMapa(clienteActual.posicion as [number, number]);
      }

      await actualizarEstadoEntregaFirebase(
        viajeActivoChofer.id,
        clienteId,
        nuevoEstado,
      );
      await cargarViajeChofer();
    } catch (error) {
      alert("No se pudo actualizar el estado. Intenta de nuevo.");
    }
  };

  useEffect(() => {
    if (!esAdmin) return;
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
  }, [rutasDisponibles, rutaSeleccionada, esAdmin]);

  const clientesDeRuta = useMemo(() => {
    if (!rutaSeleccionada) return [];
    return clientesTotales.filter(
      (c) => c.ruta && c.ruta.toLowerCase() === rutaSeleccionada.toLowerCase(),
    );
  }, [rutaSeleccionada, clientesTotales]);

  useEffect(() => {
    if (!esAdmin) return;
    setRutaOptima(null);
    setRutaCarretera(null);
    setCentroMapa(null);
  }, [selectedClienteIds, rutaSeleccionada, esAdmin]);

  useEffect(() => {
    if (!esAdmin || !rutaSeleccionada || clientesDeRuta.length === 0) return;
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
  }, [rutaSeleccionada, clientesDeRuta, esAdmin]);

  const toggleCliente = (id: string) => {
    setCentroMapa(null);
    setSelectedClienteIds((prev) => {
      const nuevoEstado = prev.includes(id)
        ? prev.filter((i) => i !== id)
        : [...prev, id];
      localStorage.setItem("rutasmart_clientes", JSON.stringify(nuevoEstado));
      return nuevoEstado;
    });
  };

  const seleccionarTodos = () => {
    setCentroMapa(null);
    const todos = clientesDeRuta.map((c) => c.id);
    setSelectedClienteIds(todos);
    localStorage.setItem("rutasmart_clientes", JSON.stringify(todos));
  };

  const deseleccionarTodos = () => {
    setCentroMapa(null);
    setSelectedClienteIds([]);
    localStorage.setItem("rutasmart_clientes", JSON.stringify([]));
  };

  const trazarRutaOptima = async () => {
    const clientesValidos = clientesDeRuta.filter(
      (c) =>
        selectedClienteIds.includes(c.id) &&
        Array.isArray(c.posicion) &&
        c.posicion.length === 2,
    );
    if (clientesValidos.length === 0) return;

    setCargandoRuta(true);
    let noVisitados = [...clientesValidos];
    let ubicacionActual: [number, number] = [
      BASE_XALISCO.lat,
      BASE_XALISCO.lng,
    ];
    let rutaCalculada: ClienteMapa[] = [];

    while (noVisitados.length > 0) {
      let indexMasCercano = -1;
      let distanciaMinima = Infinity;
      for (let i = 0; i < noVisitados.length; i++) {
        const d = calcularDistancia(
          ubicacionActual[0],
          ubicacionActual[1],
          noVisitados[i].posicion[0],
          noVisitados[i].posicion[1],
        );
        if (d < distanciaMinima) {
          distanciaMinima = d;
          indexMasCercano = i;
        }
      }
      const cliente = noVisitados.splice(indexMasCercano, 1)[0];
      rutaCalculada.push(cliente);
      ubicacionActual = cliente.posicion;
    }

    let fullRouteCoords = [
      [BASE_XALISCO.lat, BASE_XALISCO.lng] as [number, number],
      ...rutaCalculada.map((c) => c.posicion),
    ];
    let improved = true;
    let iteraciones = 0;

    while (improved && iteraciones < 100) {
      improved = false;
      for (let i = 1; i < fullRouteCoords.length - 2; i++) {
        for (let j = i + 1; j < fullRouteCoords.length - 1; j++) {
          const d1 =
            calcularDistancia(
              fullRouteCoords[i - 1][0],
              fullRouteCoords[i - 1][1],
              fullRouteCoords[i][0],
              fullRouteCoords[i][1],
            ) +
            calcularDistancia(
              fullRouteCoords[j][0],
              fullRouteCoords[j][1],
              fullRouteCoords[j + 1][0],
              fullRouteCoords[j + 1][1],
            );
          const d2 =
            calcularDistancia(
              fullRouteCoords[i - 1][0],
              fullRouteCoords[i - 1][1],
              fullRouteCoords[j][0],
              fullRouteCoords[j][1],
            ) +
            calcularDistancia(
              fullRouteCoords[i][0],
              fullRouteCoords[i][1],
              fullRouteCoords[j + 1][0],
              fullRouteCoords[j + 1][1],
            );

          if (d2 < d1 - 0.001) {
            const subArrayCoords = fullRouteCoords.slice(i, j + 1).reverse();
            fullRouteCoords.splice(i, j - i + 1, ...subArrayCoords);
            const subArrayClientes = rutaCalculada.slice(i - 1, j).reverse();
            rutaCalculada.splice(i - 1, j - i + 1, ...subArrayClientes);
            improved = true;
          }
        }
      }
      iteraciones++;
    }

    setRutaOptima(rutaCalculada);

    try {
      const puntosOSRM = [
        [BASE_XALISCO.lng, BASE_XALISCO.lat],
        ...rutaCalculada.map((c) => [c.posicion[1], c.posicion[0]]),
      ];
      let coordsCarreteraFinal: [number, number][] = [];
      const CHUNK_SIZE = 90;

      for (let i = 0; i < puntosOSRM.length - 1; i += CHUNK_SIZE - 1) {
        const chunk = puntosOSRM.slice(i, i + CHUNK_SIZE);
        const coordenadasUrl = chunk.map((p) => p.join(",")).join(";");
        const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${coordenadasUrl}?overview=full&geometries=geojson`;

        const response = await fetch(osrmUrl);
        const data = await response.json();

        if (data.code?.toLowerCase() === "ok" && data.routes?.length > 0) {
          const chunkCoords = data.routes[0].geometry.coordinates.map(
            (c: [number, number]) => [c[1], c[0]] as [number, number],
          );
          if (i > 0) chunkCoords.shift();
          coordsCarreteraFinal = coordsCarreteraFinal.concat(chunkCoords);
        }
      }
      setRutaCarretera(
        coordsCarreteraFinal.length > 0 ? coordsCarreteraFinal : null,
      );
    } catch (error) {
      alert(
        "Problemas de conexión con el satélite. Se dibujará una línea recta temporalmente.",
      );
    } finally {
      setCargandoRuta(false);
    }
  };

  const handleAsignarViaje = async () => {
    if (!rutaOptima) return;
    setEnviandoViaje(true);
    try {
      await asignarViajeFirebase({
        choferEmail: choferSeleccionado,
        fechaSalida: fechaViaje,
        rutaNombre: rutaSeleccionada,
        clientes: rutaOptima,
        rutaCarretera: rutaCarretera,
      });
      alert(
        `¡Éxito! Ruta asignada al chofer ${choferSeleccionado} para el día ${fechaViaje}.`,
      );
      setMostrarModalDespacho(false);
    } catch (error) {
      alert("Hubo un error al asignar el viaje. Revisa tu conexión.");
    } finally {
      setEnviandoViaje(false);
    }
  };

  const handleExportarExcel = () => {
    if (!rutaOptima) return;
    const datosExcel = rutaOptima.map((c, i) => ({
      "Orden de Visita": i + 1,
      "Nombre del Cliente": c.nombre,
      Domicilio: c.descripcion,
      Ruta: c.ruta,
      Vendedor: c.vendedor,
      Notas: "",
    }));
    const ws = XLSX.utils.json_to_sheet(datosExcel);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Hoja de Ruta");
    XLSX.writeFile(
      wb,
      `Ruta_Optima_${rutaSeleccionada}_${new Date().toISOString().split("T")[0]}.xlsx`,
    );
  };

  const handleExportarPDF = async () => {
    if (!rutaOptima) return;
    const pdfMake = (window as any).pdfMake;
    if (!pdfMake) return alert("Generador PDF cargando...");

    const logoBase64 = await obtenerLogoBase64Local("/CIRLogo.png");

    const tableBody: any[][] = [
      [
        { text: "N°", style: "th", alignment: "center" },
        { text: "Cliente", style: "th" },
        { text: "Domicilio", style: "th" },
        { text: "Notas", style: "th" },
        { text: "Entrega", style: "th", alignment: "center" },
      ],
    ];

    rutaOptima.forEach((cliente, index) => {
      tableBody.push([
        { text: `${index + 1}`, style: "td", alignment: "center" },
        { text: cliente.nombre, style: "td", bold: true },
        { text: cliente.descripcion, style: "td" },
        { text: "", style: "td" },
        { text: "[   ]", style: "tdCheckbox", alignment: "center" },
      ]);
    });

    const docDefinition = {
      pageOrientation: "portrait",
      pageMargins: [30, 30, 30, 30],
      content: [
        {
          columns: [
            logoBase64
              ? { image: logoBase64, width: 70 }
              : { text: "CIR", bold: true },
            {
              text: `HOJA DE RUTA ÓPTIMA\nRUTA: ${rutaSeleccionada}`,
              style: "mainTitle",
              alignment: "right",
              margin: [0, 5, 0, 0],
            },
          ],
          margin: [0, 0, 0, 15],
        },
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
            widths: ["auto", "25%", "*", "20%", "auto"],
            body: tableBody,
          },
          layout: "lightHorizontalLines",
        },
      ],
      styles: {
        mainTitle: { fontSize: 13, bold: true, color: "#1e293b" },
        th: {
          bold: true,
          fontSize: 10,
          fillColor: "#2563eb",
          color: "white",
          margin: 4,
        },
        td: { fontSize: 9, margin: 4, color: "#334155" },
        tdCheckbox: { fontSize: 12, margin: 4, color: "#94a3b8", bold: true },
      },
    };

    pdfMake
      .createPdf(docDefinition)
      .download(`Ruta_Logistica_${rutaSeleccionada}.pdf`);
  };

  const clientesADibujar: ClienteMapa[] = esAdmin
    ? clientesDeRuta.filter(
        (c) => selectedClienteIds.includes(c.id) && Array.isArray(c.posicion),
      )
    : viajeActivoChofer?.clientes || [];

  const lineaCarreteraADibujar = esAdmin
    ? rutaCarretera
    : viajeActivoChofer?.ruta_carretera || null;

  const posicionesLíneaRecta = esAdmin
    ? rutaOptima
      ? [
          [BASE_XALISCO.lat, BASE_XALISCO.lng],
          ...rutaOptima.map((c) => c.posicion),
        ]
      : []
    : viajeActivoChofer
      ? [
          [BASE_XALISCO.lat, BASE_XALISCO.lng],
          ...viajeActivoChofer.clientes.map((c: any) => c.posicion),
        ]
      : [];

  const markerPositions = clientesADibujar.map(
    (c) => c.posicion as [number, number],
  );

  if ((esAdmin && cargandoClientes) || (!esAdmin && cargandoViajeChofer)) {
    return (
      <div className="flex w-full h-[calc(100vh-80px)] items-center justify-center bg-slate-50">
        <p className="text-slate-500 font-bold text-lg animate-pulse flex items-center gap-2">
          <Loader2 className="animate-spin" /> Cargando ruta...
        </p>
      </div>
    );
  }

  return (
    <div className="flex w-full h-[calc(100vh-80px)] p-2 sm:p-5 gap-2 sm:gap-5 bg-slate-50 relative">
      {mostrarModalDespacho && (
        <div className="fixed inset-0 z-9999 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-200">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Send size={18} className="text-blue-400" /> Asignar Despacho
              </h3>
              <button
                onClick={() => setMostrarModalDespacho(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Chofer Responsable
                </label>
                <select
                  value={choferSeleccionado}
                  onChange={(e) => setChoferSeleccionado(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 font-medium cursor-pointer"
                >
                  {choferesDisponibles.length > 0 ? (
                    choferesDisponibles.map((chofer) => {
                      // Usamos el email como valor interno para que la app no se rompa
                      const valorEmail = chofer.email || chofer.correo;

                      // Preparamos el texto a mostrar: "Juan Perez (chofer2@ruterx.com)"
                      const textoMostrar = chofer.nombre
                        ? `${chofer.nombre} (${valorEmail})`
                        : valorEmail;

                      return (
                        <option key={chofer.id} value={valorEmail}>
                          {textoMostrar}
                        </option>
                      );
                    })
                  ) : (
                    <option value="" disabled>
                      No hay choferes registrados
                    </option>
                  )}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Fecha de Salida
                </label>
                <input
                  type="date"
                  value={fechaViaje}
                  onChange={(e) => setFechaViaje(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 font-medium"
                />
              </div>
              <button
                onClick={handleAsignarViaje}
                disabled={enviandoViaje}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-3 rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2 mt-2 cursor-pointer"
              >
                {enviandoViaje ? (
                  <>
                    <Loader2 size={18} className="animate-spin" /> Procesando...
                  </>
                ) : (
                  <>
                    <Send size={18} /> Confirmar y Enviar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {esAdmin && (
        <aside className="w-80 bg-white rounded-xl shadow-sm border border-slate-100 p-4 flex flex-col shrink-0">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 px-2">
            Seleccionar Ruta
          </h3>
          <select
            value={rutaSeleccionada}
            onChange={(e) => {
              setCentroMapa(null);
              setRutaSeleccionada(e.target.value);
            }}
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
              </span>{" "}
              de{" "}
              <span className="text-slate-800 font-bold">
                {clientesDeRuta.length}
              </span>
            </span>
            <div className="flex gap-2">
              <button
                onClick={seleccionarTodos}
                className="text-xs text-blue-600 font-semibold underline cursor-pointer"
              >
                Todos
              </button>
              <button
                onClick={deseleccionarTodos}
                className="text-xs text-red-500 font-semibold underline cursor-pointer"
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
                  className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
              </label>
            ))}
          </div>
          <div className="pt-4 border-t border-slate-100 flex flex-col gap-2 shrink-0">
            {!rutaOptima ? (
              <button
                onClick={trazarRutaOptima}
                disabled={selectedClienteIds.length < 2 || cargandoRuta}
                className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-bold py-3 rounded-lg transition-colors shadow-sm cursor-pointer"
              >
                {cargandoRuta ? (
                  <>
                    <Loader2 size={18} className="animate-spin" /> Generando...
                  </>
                ) : (
                  <>
                    <Route size={18} /> Trazar Ruta Óptima
                  </>
                )}
              </button>
            ) : (
              <>
                <button
                  onClick={() => setMostrarModalDespacho(true)}
                  className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-lg transition-colors shadow-sm mb-2 shadow-emerald-600/30 cursor-pointer"
                >
                  <Send size={18} /> Asignar a Chofer
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={handleExportarExcel}
                    className="flex-1 flex items-center justify-center gap-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-2.5 rounded-lg transition-colors text-sm cursor-pointer"
                  >
                    <Download size={16} /> Excel
                  </button>
                  <button
                    onClick={handleExportarPDF}
                    className="flex-1 flex items-center justify-center gap-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-2.5 rounded-lg transition-colors text-sm cursor-pointer"
                  >
                    <FileText size={16} /> PDF
                  </button>
                </div>
              </>
            )}
          </div>
        </aside>
      )}

      <div className="flex-1 rounded-xl overflow-hidden shadow-sm border border-slate-200 relative">
        {!esAdmin && (
          <>
            {viajeActivoChofer ? (
              <div
                className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] bg-slate-900/95 text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-full shadow-md flex items-center justify-center border border-slate-700/50 backdrop-blur-sm"
                style={{ whiteSpace: "nowrap", minWidth: "max-content" }}
              >
                <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-green-500 animate-pulse mr-2"></span>
                <span className="text-[10px] sm:text-sm font-bold tracking-wide uppercase">
                  Reparto Activo
                </span>
              </div>
            ) : (
              <div className="absolute inset-0 z-[1000] bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                  <span className="text-2xl">🚫</span>
                </div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">
                  Día Libre
                </h2>
                <p className="text-slate-600">
                  No tienes rutas asignadas para hoy ({hoyStr}).
                </p>
              </div>
            )}
          </>
        )}

        <MapContainer
          center={[BASE_XALISCO.lat, BASE_XALISCO.lng]}
          zoom={12}
          style={{ height: "100%", width: "100%" }}
        >
          <MapUpdater markers={markerPositions} centerCoord={centroMapa} />
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

          <Marker
            position={[BASE_XALISCO.lat, BASE_XALISCO.lng]}
            icon={baseIcon}
          >
            <Popup>
              <div className="text-sm font-bold text-center">⭐ BODEGA</div>
            </Popup>
          </Marker>

          {lineaCarreteraADibujar ? (
            <Polyline
              positions={lineaCarreteraADibujar}
              color="#2563eb"
              weight={5}
            />
          ) : posicionesLíneaRecta.length > 0 ? (
            <Polyline
              positions={posicionesLíneaRecta as [number, number][]}
              color="#2563eb"
              weight={5}
            />
          ) : null}

          {clientesADibujar.map((cliente) => (
            <Marker
              key={cliente.id}
              position={cliente.posicion as [number, number]}
              icon={crearIconoCliente(cliente.estado_entrega)}
            >
              <Popup>
                <div className="text-sm min-w-[200px]">
                  <p className="font-bold text-slate-800">{cliente.nombre}</p>
                  <p className="text-slate-600 text-xs mb-2">
                    {cliente.descripcion}
                  </p>

                  {esAdmin && rutaOptima ? (
                    <p className="text-xs bg-blue-100 text-blue-800 font-bold px-2 py-1 rounded inline-block">
                      Parada N°{" "}
                      {rutaOptima.findIndex((c) => c.id === cliente.id) + 1}
                    </p>
                  ) : (
                    !esAdmin &&
                    cliente.orden && (
                      <div className="space-y-2 mt-1 pt-2 border-t border-slate-100">
                        <div className="flex items-center justify-between">
                          <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded">
                            Parada N° {cliente.orden}
                          </span>
                          {cliente.estado_entrega &&
                            cliente.estado_entrega !== "pendiente" && (
                              <span
                                className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                                  cliente.estado_entrega === "entregado"
                                    ? "bg-green-100 text-green-700"
                                    : cliente.estado_entrega === "cancelado"
                                      ? "bg-red-100 text-red-700"
                                      : "bg-yellow-100 text-yellow-800"
                                }`}
                              >
                                {cliente.estado_entrega.replace("_", " ")}
                              </span>
                            )}
                        </div>

                        {cliente.hora_entrega && (
                          <p className="text-[11px] text-slate-500">
                            Registrado a las: <b>{cliente.hora_entrega}</b>
                          </p>
                        )}

                        {/* Botones de Acción para el Chofer */}
                        <div className="grid grid-cols-3 gap-1 pt-1">
                          <button
                            onClick={() =>
                              handleCambiarEstado(cliente.id, "entregado")
                            }
                            className="flex flex-col items-center justify-center bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 p-1.5 rounded text-[10px] font-bold transition-colors cursor-pointer"
                            title="Entregado"
                          >
                            <CheckCircle2 size={14} className="mb-0.5" />
                            Entregado
                          </button>
                          <button
                            onClick={() =>
                              handleCambiarEstado(cliente.id, "cancelado")
                            }
                            className="flex flex-col items-center justify-center bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 p-1.5 rounded text-[10px] font-bold transition-colors cursor-pointer"
                            title="Cancelado"
                          >
                            <Ban size={14} className="mb-0.5" />
                            Cancelado
                          </button>
                          <button
                            onClick={() =>
                              handleCambiarEstado(cliente.id, "no_entregado")
                            }
                            className="flex flex-col items-center justify-center bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 p-1.5 rounded text-[10px] font-bold transition-colors cursor-pointer"
                            title="No Entregado"
                          >
                            <AlertTriangle size={14} className="mb-0.5" />
                            No Entregado
                          </button>
                        </div>
                      </div>
                    )
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
