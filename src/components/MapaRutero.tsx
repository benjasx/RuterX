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

// UTILIDADES
import {
  BASE_XALISCO,
  LISTA_RUTAS,
  LISTA_UNIDADES,
  crearIconoCliente,
  baseIcon,
} from "../utils/mapaUtils";
import {
  exportarExcelAdmin,
  exportarPDFAdmin,
  generarPDFFinalChofer,
} from "../utils/reportesUtils";
import { calcularRutaOptimaYCarretera } from "../utils/rutasUtils";

// COMPONENTES UI
import PanelLateralMapaAdmin from "./mapa/PanelLateralMapaAdmin";
import ModalAsignarDespacho from "./mapa/ModalAsignarDespacho";
import ModalFinalizarViaje from "./mapa/ModalFinalizarViaje";
import ResumenJornadaChofer from "./mapa/ResumenJornadaChofer";

// SERVICIOS FIREBASE
import { obtenerChoferesFirebase } from "../firebase/choferesService";
import { obtenerClientesFirebase } from "../firebase/clientesService";
import { obtenerRutasFirebase } from "../firebase/rutasService";
import {
  asignarViajeFirebase,
  obtenerViajeActivoChofer,
  actualizarEstadoEntregaFirebase,
  finalizarViajeFirebase,
  iniciarViajeFirebase,
} from "../firebase/viajesService";
import {
  Loader2,
  CheckCircle2,
  Ban,
  AlertTriangle,
  Flag,
  Play,
  AlertCircle,
  Calendar,
} from "lucide-react";

interface MapaRuteroProps {
  esAdmin?: boolean;
  usuarioEmail?: string | null;
}

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

export default function MapaRutero({
  esAdmin = false,
  usuarioEmail,
}: MapaRuteroProps) {
  const hoyStr = new Date().toLocaleDateString("sv-SE");

  // ESTADOS ADMIN
  const [rutaSeleccionada, setRutaSeleccionada] = useState<string>("");
  const [selectedClienteIds, setSelectedClienteIds] = useState<string[]>([]);
  const [rutaOptima, setRutaOptima] = useState<any[] | null>(null);
  const [rutaCarretera, setRutaCarretera] = useState<[number, number][] | null>(
    null,
  );
  const [cargandoRuta, setCargandoRuta] = useState(false);
  const [mostrarModalDespacho, setMostrarModalDespacho] = useState(false);
  const [choferSeleccionado, setChoferSeleccionado] = useState<string>("");
  const [fechaViaje, setFechaViaje] = useState(hoyStr);
  const [enviandoViaje, setEnviandoViaje] = useState(false);

  // ESTADOS CHOFER
  const [viajeActivoChofer, setViajeActivoChofer] = useState<any>(null);
  const [cargandoViajeChofer, setCargandoViajeChofer] = useState(false);
  const [centroMapa, setCentroMapa] = useState<[number, number] | null>(null);
  const [mostrarModalFinalizar, setMostrarModalFinalizar] = useState(false);
  const [motivoFinalizacion, setMotivoFinalizacion] = useState(
    "Término de recorrido",
  );
  const [rutaRealChofer, setRutaRealChofer] = useState(LISTA_RUTAS[0]);
  const [unidadChofer, setUnidadChofer] = useState(LISTA_UNIDADES[0]);
  const [foliosNoEmbarcados, setFoliosNoEmbarcados] = useState("");
  const [finalizandoViaje, setFinalizandoViaje] = useState(false);
  const [iniciandoViaje, setIniciandoViaje] = useState(false);

  // 🚀 ESTADO PARA CONTROLAR LA BÚSQUEDA DEL CHOFER
  const [fechaConsultaChofer, setFechaConsultaChofer] = useState(hoyStr);

  // 🚀 EVALUAMOS SI LA RUTA ASIGNADA ES DEL FUTURO (Aseguramos que evalúa fecha_salida con guion bajo)
  const esRutaFutura = useMemo(() => {
    if (!viajeActivoChofer || !viajeActivoChofer.fecha_salida) return false;
    return viajeActivoChofer.fecha_salida > hoyStr;
  }, [viajeActivoChofer, hoyStr]);

  const { data: choferesData = [] } = useQuery({
    queryKey: ["choferes"],
    queryFn: obtenerChoferesFirebase,
    staleTime: 1000 * 60 * 10,
  });
  const { data: clientesData = [], isLoading: cargandoClientes } = useQuery({
    queryKey: ["clientes"],
    queryFn: obtenerClientesFirebase,
    enabled: esAdmin,
    staleTime: 1000 * 60 * 15,
  });
  const { data: rutasData = [] } = useQuery({
    queryKey: ["rutas"],
    queryFn: obtenerRutasFirebase,
    enabled: esAdmin,
    staleTime: 1000 * 60 * 30,
  });

  const choferesDisponibles = useMemo(() => [...choferesData], [choferesData]);
  const rutasDisponibles = useMemo(
    () =>
      [...(rutasData as any[])].sort((a, b) =>
        a.nombre.localeCompare(b.nombre),
      ),
    [rutasData],
  );

  const nombreChoferConectado = useMemo(() => {
    if (!usuarioEmail) return "Chofer Desconocido";
    const choferInfo = choferesDisponibles.find(
      (c) => c.email === usuarioEmail || c.correo === usuarioEmail,
    );
    return choferInfo?.nombre
      ? `${choferInfo.nombre} (${usuarioEmail})`
      : usuarioEmail;
  }, [choferesDisponibles, usuarioEmail]);

  useEffect(() => {
    if (choferesDisponibles.length > 0 && !choferSeleccionado) {
      setChoferSeleccionado(
        choferesDisponibles[0].email ||
          choferesDisponibles[0].correo ||
          choferesDisponibles[0].nombre,
      );
    }
  }, [choferesDisponibles, choferSeleccionado]);

  // 🚀 CARGAMOS LA RUTA USANDO LA FECHA DE CONSULTA
  const cargarViajeChofer = async () => {
    if (!esAdmin && usuarioEmail) {
      setCargandoViajeChofer(true);
      const viaje: any = await obtenerViajeActivoChofer(
        usuarioEmail,
        fechaConsultaChofer,
      );
      setViajeActivoChofer(viaje);
      if (viaje && viaje.ruta_nombre) setRutaRealChofer(viaje.ruta_nombre);
      setCargandoViajeChofer(false);
    }
  };

  useEffect(() => {
    cargarViajeChofer();
  }, [esAdmin, usuarioEmail, fechaConsultaChofer]);

  // 🚀 FUNCIÓN PARA AVANZAR LA CONSULTA AL DÍA DE MAÑANA
  const handleVerProximaRuta = () => {
    const manana = new Date();
    manana.setDate(manana.getDate() + 1);
    setFechaConsultaChofer(manana.toLocaleDateString("sv-SE"));
  };

  const handleIniciarViaje = async () => {
    if (!viajeActivoChofer) return;
    setIniciandoViaje(true);
    try {
      await iniciarViajeFirebase(viajeActivoChofer.id);
      await cargarViajeChofer();
    } catch (error) {
      alert("Error al iniciar la ruta.");
    } finally {
      setIniciandoViaje(false);
    }
  };

  const handleCambiarEstado = async (
    clienteId: string,
    nuevoEstado: "entregado" | "cancelado" | "no_entregado",
  ) => {
    if (!viajeActivoChofer || viajeActivoChofer.estado === "finalizado") return;
    try {
      const clienteActual = viajeActivoChofer.clientes.find(
        (c: any) => c.id === clienteId,
      );
      if (clienteActual && clienteActual.posicion)
        setCentroMapa(clienteActual.posicion);
      await actualizarEstadoEntregaFirebase(
        viajeActivoChofer.id,
        clienteId,
        nuevoEstado,
      );
      await cargarViajeChofer();
    } catch (error) {
      alert("Error al actualizar.");
    }
  };

  useEffect(() => {
    if (!esAdmin) return;
    if (rutasDisponibles.length > 0 && !rutaSeleccionada) {
      const rutaEnMemoria = localStorage.getItem("rutasmart_ruta");
      if (
        rutaEnMemoria &&
        rutasDisponibles.find((r) => r.nombre === rutaEnMemoria)
      )
        setRutaSeleccionada(rutaEnMemoria);
      else setRutaSeleccionada(rutasDisponibles[0].nombre);
    }
  }, [rutasDisponibles, rutaSeleccionada, esAdmin]);

  const clientesDeRuta = useMemo(() => {
    if (!rutaSeleccionada) return [];
    return (clientesData as any[]).filter(
      (c) => c.ruta && c.ruta.toLowerCase() === rutaSeleccionada.toLowerCase(),
    );
  }, [rutaSeleccionada, clientesData]);

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
      if (clientesGuardadosStr)
        setSelectedClienteIds(JSON.parse(clientesGuardadosStr));
      else setSelectedClienteIds(clientesDeRuta.map((c) => c.id));
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
    const { rutaCalculada, rutaCarretera: carreteraCalc } =
      await calcularRutaOptimaYCarretera(clientesValidos);
    setRutaOptima(rutaCalculada);
    setRutaCarretera(carreteraCalc);
    setCargandoRuta(false);
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
      alert(`¡Éxito! Ruta asignada.`);
      setMostrarModalDespacho(false);
    } catch (error) {
      alert("Error al asignar.");
    } finally {
      setEnviandoViaje(false);
    }
  };

  const handleCerrarViajeChofer = async () => {
    if (!viajeActivoChofer) return;
    setFinalizandoViaje(true);
    try {
      const datosCierre = {
        motivo: motivoFinalizacion,
        rutaReal: rutaRealChofer,
        unidad: unidadChofer,
        foliosNoEmbarcados: foliosNoEmbarcados,
      };
      await generarPDFFinalChofer(
        viajeActivoChofer,
        datosCierre,
        nombreChoferConectado,
      );
      await finalizarViajeFirebase(viajeActivoChofer.id, datosCierre);
      await cargarViajeChofer();
      setMostrarModalFinalizar(false);
    } catch (error) {
      alert("Error al cerrar el viaje.");
    } finally {
      setFinalizandoViaje(false);
    }
  };

  const resumenViaje = useMemo(() => {
    if (!viajeActivoChofer || viajeActivoChofer.estado !== "finalizado")
      return null;
    let entregados = 0,
      cancelados = 0,
      noEntregados = 0,
      pendientes = 0;
    viajeActivoChofer.clientes.forEach((c: any) => {
      if (c.estado_entrega === "entregado") entregados++;
      else if (c.estado_entrega === "cancelado") cancelados++;
      else if (c.estado_entrega === "no_entregado") noEntregados++;
      else pendientes++;
    });
    return { entregados, cancelados, noEntregados, pendientes };
  }, [viajeActivoChofer]);

  const conteoPendientes = useMemo(() => {
    if (!viajeActivoChofer || !viajeActivoChofer.clientes)
      return { pendientes: 0, total: 0 };
    const total = viajeActivoChofer.clientes.length;
    const pendientes = viajeActivoChofer.clientes.filter(
      (c: any) => !c.estado_entrega || c.estado_entrega === "pendiente",
    ).length;
    return { pendientes, total };
  }, [viajeActivoChofer]);

  const clientesADibujar: any[] = esAdmin
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
      {!esAdmin && mostrarModalFinalizar && (
        <ModalFinalizarViaje
          onClose={() => setMostrarModalFinalizar(false)}
          rutaRealChofer={rutaRealChofer}
          setRutaRealChofer={setRutaRealChofer}
          unidadChofer={unidadChofer}
          setUnidadChofer={setUnidadChofer}
          motivoFinalizacion={motivoFinalizacion}
          setMotivoFinalizacion={setMotivoFinalizacion}
          foliosNoEmbarcados={foliosNoEmbarcados}
          setFoliosNoEmbarcados={setFoliosNoEmbarcados}
          onConfirm={handleCerrarViajeChofer}
          isPending={finalizandoViaje}
        />
      )}

      {esAdmin && mostrarModalDespacho && (
        <ModalAsignarDespacho
          onClose={() => setMostrarModalDespacho(false)}
          choferesDisponibles={choferesDisponibles}
          choferSeleccionado={choferSeleccionado}
          setChoferSeleccionado={setChoferSeleccionado}
          fechaViaje={fechaViaje}
          setFechaViaje={setFechaViaje}
          onConfirm={handleAsignarViaje}
          isPending={enviandoViaje}
        />
      )}

      {esAdmin && (
        <PanelLateralMapaAdmin
          rutaSeleccionada={rutaSeleccionada}
          setRutaSeleccionada={setRutaSeleccionada}
          rutasDisponibles={rutasDisponibles}
          clientesDeRuta={clientesDeRuta}
          selectedClienteIds={selectedClienteIds}
          toggleCliente={toggleCliente}
          seleccionarTodos={seleccionarTodos}
          deseleccionarTodos={deseleccionarTodos}
          rutaOptima={rutaOptima}
          trazarRutaOptima={trazarRutaOptima}
          cargandoRuta={cargandoRuta}
          setMostrarModalDespacho={setMostrarModalDespacho}
          exportarExcel={() =>
            exportarExcelAdmin(rutaOptima || [], rutaSeleccionada)
          }
          exportarPDF={() =>
            exportarPDFAdmin(rutaOptima || [], rutaSeleccionada)
          }
          setCentroMapa={setCentroMapa}
        />
      )}

      <div className="flex-1 rounded-xl overflow-hidden shadow-sm border border-slate-200 relative">
        {/* BOTÓN GIGANTE DE INICIAR RUTA (SOLO SI NO ES RUTA FUTURA) */}
        {!esAdmin &&
          viajeActivoChofer &&
          viajeActivoChofer.estado !== "finalizado" &&
          !viajeActivoChofer.hora_inicio &&
          !esRutaFutura && (
            <div className="absolute inset-0 z-[3000] bg-slate-900/40 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
              <div className="bg-white p-8 rounded-3xl shadow-2xl flex flex-col items-center max-w-sm w-full border border-slate-100">
                <h2 className="text-2xl font-black text-slate-800 mb-2">
                  ¡Ruta Asignada!
                </h2>
                <p className="text-slate-500 mb-8 font-medium">
                  Estás a punto de iniciar el recorrido:
                  <br />
                  <b className="text-blue-600 text-lg uppercase">
                    {viajeActivoChofer.ruta_nombre}
                  </b>
                </p>
                <button
                  onClick={handleIniciarViaje}
                  disabled={iniciandoViaje}
                  className="w-40 h-40 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-full shadow-2xl shadow-blue-600/40 flex flex-col items-center justify-center gap-2 transition-transform hover:scale-105 cursor-pointer"
                >
                  {iniciandoViaje ? (
                    <Loader2 size={40} className="animate-spin" />
                  ) : (
                    <Play size={48} className="ml-2 fill-current" />
                  )}
                  <span className="font-bold text-lg tracking-wide uppercase">
                    {iniciandoViaje ? "Iniciando..." : "Iniciar Ruta"}
                  </span>
                </button>
              </div>
            </div>
          )}

        {/* BOTON FINALIZAR SOLO SI YA INICIÓ (Y NO ES FUTURA) */}
        {!esAdmin &&
          viajeActivoChofer &&
          viajeActivoChofer.estado !== "finalizado" &&
          viajeActivoChofer.hora_inicio &&
          !esRutaFutura && (
            <button
              onClick={() => setMostrarModalFinalizar(true)}
              className="absolute bottom-6 right-6 z-[1000] bg-blue-600 hover:bg-blue-700 text-white px-5 py-3.5 rounded-2xl shadow-xl shadow-blue-600/20 font-bold flex items-center gap-2 transition-transform hover:scale-105 cursor-pointer border border-blue-500"
            >
              <Flag size={20} /> Finalizar Viaje
            </button>
          )}

        {!esAdmin &&
          (viajeActivoChofer ? (
            viajeActivoChofer.estado === "finalizado" ? (
              // 🚀 AHORA LE PASAMOS LA FUNCIÓN AL TICKET DE RESUMEN
              <ResumenJornadaChofer
                viajeActivoChofer={viajeActivoChofer}
                resumenViaje={resumenViaje}
                nombreChofer={nombreChoferConectado}
                onVerProximaRuta={handleVerProximaRuta}
              />
            ) : (
              <>
                {/* CÁPSULA DE REPARTO ACTIVO (HOY) */}
                {!esRutaFutura && (
                  <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] bg-slate-900/95 text-white px-4 py-2 rounded-full shadow-lg border border-slate-700/60 backdrop-blur-md flex items-center gap-3">
                    <div className="flex items-center">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse mr-2"></span>
                      <span className="text-[10px] sm:text-xs font-black tracking-wider uppercase text-slate-200">
                        Reparto Activo
                      </span>
                    </div>
                    <div className="h-3.5 w-px bg-slate-700"></div>
                    <div className="flex items-center text-[10px] sm:text-xs font-semibold text-slate-300">
                      <span>Pendientes:</span>
                      <span className="text-amber-400 font-black ml-1.5 text-sm">
                        {conteoPendientes.pendientes}
                      </span>
                      <span className="text-slate-500 mx-0.5">/</span>
                      <span className="text-slate-400 font-bold">
                        {conteoPendientes.total}
                      </span>
                    </div>
                  </div>
                )}

                {/* CÁPSULA DE VISTA PREVIA (FUTURO) */}
                {esRutaFutura && (
                  <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] bg-indigo-600/95 text-white px-5 py-2.5 rounded-full shadow-lg border border-indigo-400/50 backdrop-blur-md flex items-center gap-3">
                    <Calendar size={18} className="text-indigo-200" />
                    <span className="text-xs sm:text-sm font-bold tracking-wide uppercase">
                      VISTA PREVIA: {viajeActivoChofer.fecha_salida}
                    </span>
                  </div>
                )}
              </>
            )
          ) : (
            <div className="absolute inset-0 z-[3000] bg-slate-900/40 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
              <div className="bg-white p-8 rounded-3xl shadow-2xl flex flex-col items-center max-w-sm w-full border border-slate-100">
                <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mb-4">
                  <AlertCircle size={32} />
                </div>
                <h2 className="text-2xl font-black text-slate-800 mb-2">
                  Sin ruta asignada
                </h2>
                <p className="text-slate-500 font-medium text-lg">
                  {/* 🚀 TEXTO DINÁMICO SI YA REVISÓ LA DE HOY */}
                  {fechaConsultaChofer === hoyStr
                    ? "Por favor repórtate en bodega."
                    : "No tienes más rutas programadas en los próximos días."}
                </p>
              </div>
            </div>
          ))}

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
              color={esRutaFutura ? "#4f46e5" : "#2563eb"}
              weight={5}
            />
          ) : posicionesLíneaRecta.length > 0 ? (
            <Polyline
              positions={posicionesLíneaRecta as [number, number][]}
              color={esRutaFutura ? "#4f46e5" : "#2563eb"}
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
                <div className="text-sm min-w-50">
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
                                className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${cliente.estado_entrega === "entregado" ? "bg-green-100 text-green-700" : cliente.estado_entrega === "cancelado" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-800"}`}
                              >
                                {cliente.estado_entrega.replace("_", " ")}
                              </span>
                            )}
                        </div>
                        {cliente.hora_entrega && (
                          <p className="text-[11px] text-slate-500">
                            Registrado: <b>{cliente.hora_entrega}</b>
                          </p>
                        )}

                        {!esAdmin &&
                          viajeActivoChofer?.estado !== "finalizado" &&
                          viajeActivoChofer?.hora_inicio &&
                          !esRutaFutura && (
                            <div className="grid grid-cols-3 gap-1 pt-1">
                              <button
                                onClick={() =>
                                  handleCambiarEstado(cliente.id, "entregado")
                                }
                                className="flex flex-col items-center justify-center bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 p-1.5 rounded text-[10px] font-bold cursor-pointer"
                              >
                                <CheckCircle2 size={14} className="mb-0.5" />
                                Entregado
                              </button>
                              <button
                                onClick={() =>
                                  handleCambiarEstado(cliente.id, "cancelado")
                                }
                                className="flex flex-col items-center justify-center bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 p-1.5 rounded text-[10px] font-bold cursor-pointer"
                              >
                                <Ban size={14} className="mb-0.5" />
                                Cancelado
                              </button>
                              <button
                                onClick={() =>
                                  handleCambiarEstado(
                                    cliente.id,
                                    "no_entregado",
                                  )
                                }
                                className="flex flex-col items-center justify-center bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 p-1.5 rounded text-[10px] font-bold cursor-pointer"
                              >
                                <AlertTriangle size={14} className="mb-0.5" />
                                No Entregado
                              </button>
                            </div>
                          )}
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
