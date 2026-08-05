import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  History,
  Truck,
  CalendarCheck,
  AlertCircle,
  Clock,
  FileDown,
  User,
  Users,
} from "lucide-react";
import { obtenerHistorialPorRangoFirebase } from "../firebase/historialService";

import {
  generarPDFNominaChoferes,
  generarPDFNominaAyudantes,
} from "../utils/pdfNominaService";

export default function PanelHistorial() {
  const hoy = new Date();
  const hace7Dias = new Date();
  hace7Dias.setDate(hoy.getDate() - 7);

  const [fechaInicio, setFechaInicio] = useState(
    hace7Dias.toISOString().split("T")[0],
  );
  const [fechaFin, setFechaFin] = useState(hoy.toISOString().split("T")[0]);

  const [vistaActiva, setVistaActiva] = useState<"choferes" | "ayudantes">(
    "choferes",
  );
  const [isGenerandoPDF, setIsGenerandoPDF] = useState(false);
  const [personalPDF, setPersonalPDF] = useState<string>("TODOS");

  // 🚀 NUEVOS ESTADOS PARA CONTROLAR QUÉ COLUMNAS SE MUESTRAN EN EL PDF
  const [mostrarViaticos, setMostrarViaticos] = useState(true);
  const [mostrarComisiones, setMostrarComisiones] = useState(true);

  // Consulta de TanStack Query
  const {
    data: datosCrudos = [],
    isLoading: cargando,
    isError,
  } = useQuery({
    queryKey: ["historial_salidas", "nomina", fechaInicio, fechaFin],
    queryFn: () => obtenerHistorialPorRangoFirebase(fechaInicio, fechaFin),
  });

  // Procesamiento de datos con useMemo
  const {
    estadisticasChoferes,
    estadisticasAyudantes,
    viajesRango,
    listaNegraChoferes,
  } = useMemo(() => {
    const setChoferesHistoricos = new Set<string>();
    const statsCMap: Record<string, { total: number; ultimaFecha: string }> =
      {};
    const statsAMap: Record<string, { total: number; ultimaFecha: string }> =
      {};
    const listaViajesFiltrados: any[] = [];

    // 1. CREAR LA "LISTA NEGRA" DE CHOFERES
    datosCrudos.forEach((registro) => {
      (registro.viajes || []).forEach((viaje: any) => {
        if (viaje.chofer && viaje.chofer !== "-") {
          setChoferesHistoricos.add(viaje.chofer.toUpperCase().trim());
        }
      });
    });

    const datosOrdenados = [...datosCrudos].sort(
      (a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime(),
    );

    // 2. CONTAR LOS VIAJES
    datosOrdenados.forEach((registro) => {
      const fecha = registro.fecha;

      (registro.viajes || []).forEach((viaje: any) => {
        // --- PROCESAR CHOFERES ---
        if (viaje.chofer && viaje.chofer !== "-") {
          const nombreChofer = viaje.chofer.toUpperCase().trim();
          if (!statsCMap[nombreChofer])
            statsCMap[nombreChofer] = { total: 0, ultimaFecha: "" };
          statsCMap[nombreChofer].total += 1;
          statsCMap[nombreChofer].ultimaFecha = fecha;
        }

        // --- PROCESAR AYUDANTES ---
        const procesarAyudante = (ayRaw: string) => {
          const ay = ayRaw ? ayRaw.toUpperCase().trim() : "";
          if (
            ay &&
            ay !== "-" &&
            ay !== "SIN AYUDANTE" &&
            ay !== "UNDEFINED" &&
            !setChoferesHistoricos.has(ay)
          ) {
            if (!statsAMap[ay]) statsAMap[ay] = { total: 0, ultimaFecha: "" };
            statsAMap[ay].total += 1;
            statsAMap[ay].ultimaFecha = fecha;
          }
        };

        procesarAyudante(viaje.ayudante1);
        procesarAyudante(viaje.ayudante2);

        if (viaje.chofer && viaje.chofer !== "-") {
          listaViajesFiltrados.push({ fecha, ...viaje });
        }
      });
    });

    const arrayChoferes = Object.keys(statsCMap)
      .map((n) => ({
        nombre: n,
        totalViajes: statsCMap[n].total,
        ultimoViaje: statsCMap[n].ultimaFecha,
      }))
      .sort((a, b) => a.totalViajes - b.totalViajes);

    const arrayAyudantes = Object.keys(statsAMap)
      .map((n) => ({
        nombre: n,
        totalViajes: statsAMap[n].total,
        ultimoViaje: statsAMap[n].ultimaFecha,
      }))
      .sort((a, b) => a.totalViajes - b.totalViajes);

    return {
      estadisticasChoferes: arrayChoferes,
      estadisticasAyudantes: arrayAyudantes,
      viajesRango: listaViajesFiltrados,
      listaNegraChoferes: setChoferesHistoricos,
    };
  }, [datosCrudos]);

  // RESETEAR SELECTOR AL CAMBIAR DE PESTAÑA
  useEffect(() => {
    setPersonalPDF("TODOS");
  }, [vistaActiva]);

  // 🚀 LÓGICA DE DESCARGA DINÁMICA (AHORA ENVÍA LAS OPCIONES DE DINERO)
  const handleDescargarPDF = async () => {
    setIsGenerandoPDF(true);
    if (vistaActiva === "choferes") {
      await generarPDFNominaChoferes(
        viajesRango,
        fechaInicio,
        fechaFin,
        personalPDF,
        mostrarViaticos, // Enviamos el valor del checkbox
        mostrarComisiones, // Enviamos el valor del checkbox
      );
    } else {
      await generarPDFNominaAyudantes(
        viajesRango,
        fechaInicio,
        fechaFin,
        personalPDF,
        listaNegraChoferes,
        mostrarViaticos, // Enviamos el valor del checkbox
        mostrarComisiones, // Enviamos el valor del checkbox
      );
    }
    setIsGenerandoPDF(false);
  };

  const datosMostrar =
    vistaActiva === "choferes" ? estadisticasChoferes : estadisticasAyudantes;

  const isChofer = vistaActiva === "choferes";
  const colorBgMenu = isChofer
    ? "bg-purple-50 border-purple-100"
    : "bg-emerald-50 border-emerald-100";
  const colorTextMenu = isChofer ? "text-purple-800" : "text-emerald-800";
  const colorSelectBorder = isChofer
    ? "border-purple-200 focus:ring-purple-500"
    : "border-emerald-200 focus:ring-emerald-500";
  const colorBtnPDF = isChofer
    ? "bg-purple-700 hover:bg-purple-800"
    : "bg-emerald-700 hover:bg-emerald-800";
  const colorTabActivo = isChofer
    ? "border-purple-600 text-purple-700"
    : "border-emerald-600 text-emerald-700";
  const colorTh = isChofer ? "bg-purple-800" : "bg-emerald-800";
  const colorHoverFila = isChofer
    ? "hover:bg-purple-50"
    : "hover:bg-emerald-50";

  // Color del checkbox para que coincida con el tema actual
  const colorCheckbox = isChofer ? "accent-purple-600" : "accent-emerald-600";

  if (isError) {
    return (
      <div className="w-full bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-full flex flex-col items-center justify-center">
        <AlertCircle className="text-rose-500 mb-3" size={40} />
        <h3 className="text-lg font-semibold text-slate-700">
          Error al cargar los datos
        </h3>
        <p className="text-sm text-slate-500">
          Hubo un problema al conectar con la base de datos.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col h-full">
      <div className="flex items-center gap-2 mb-4">
        <History
          className={isChofer ? "text-purple-600" : "text-emerald-600"}
          size={24}
        />
        <h2 className="text-xl font-bold text-slate-800">
          Control de Equidad y Reportes
        </h2>
      </div>

      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-6 gap-4">
        {/* SELECTORES DE FECHA */}
        <div
          className={`flex flex-col sm:flex-row items-center gap-3 p-2.5 rounded-lg border shadow-sm w-full xl:w-auto transition-colors ${colorBgMenu}`}
        >
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className={`text-sm font-bold ${colorTextMenu}`}>Desde:</span>
            <input
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              className="px-2 py-1 rounded-md text-sm border-none shadow-sm text-slate-700 bg-white w-full sm:w-auto cursor-pointer focus:ring-2 outline-none"
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className={`text-sm font-bold ${colorTextMenu}`}>Hasta:</span>
            <input
              type="date"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              className="px-2 py-1 rounded-md text-sm border-none shadow-sm text-slate-700 bg-white w-full sm:w-auto cursor-pointer focus:ring-2 outline-none"
            />
          </div>
        </div>

        {/* 🚀 SELECTOR DE PERSONAL, CHECKBOXES Y BOTÓN PDF */}
        <div className="flex flex-col items-end gap-3 w-full xl:w-auto">
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
            <select
              value={personalPDF}
              onChange={(e) => setPersonalPDF(e.target.value)}
              className={`px-3 py-2.5 rounded-lg border text-sm outline-none text-slate-700 font-bold bg-white shadow-sm w-full sm:w-auto cursor-pointer transition-colors ${colorSelectBorder}`}
            >
              <option value="TODOS">Reporte General (Todos)</option>
              {[...datosMostrar]
                .sort((a, b) => a.nombre.localeCompare(b.nombre))
                .map((c) => (
                  <option key={c.nombre} value={c.nombre}>
                    {c.nombre}
                  </option>
                ))}
            </select>

            <button
              onClick={handleDescargarPDF}
              disabled={isGenerandoPDF || cargando}
              className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-colors shadow-sm w-full sm:w-auto ${
                isGenerandoPDF || cargando
                  ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                  : `${colorBtnPDF} text-white`
              }`}
            >
              <FileDown size={18} />
              {isGenerandoPDF
                ? "Calculando..."
                : `Descargar Reporte ${isChofer ? "Choferes" : "Auxiliares"}`}
            </button>
          </div>

          {/* 🚀 CHECKBOXES PARA MOSTRAR/OCULTAR DINERO */}
          <div className="flex items-center gap-4 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 w-full sm:w-auto">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer hover:text-slate-900 transition-colors">
              <input
                type="checkbox"
                checked={mostrarViaticos}
                onChange={(e) => setMostrarViaticos(e.target.checked)}
                className={`w-4 h-4 cursor-pointer ${colorCheckbox}`}
              />
              Incluir Viáticos
            </label>
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer hover:text-slate-900 transition-colors">
              <input
                type="checkbox"
                checked={mostrarComisiones}
                onChange={(e) => setMostrarComisiones(e.target.checked)}
                className={`w-4 h-4 cursor-pointer ${colorCheckbox}`}
              />
              Incluir Comisiones
            </label>
          </div>
        </div>
      </div>

      <div className="flex items-start gap-2 mb-6 bg-slate-50 p-3 rounded-lg border border-slate-200">
        <Clock className="text-slate-500 shrink-0 mt-0.5" size={18} />
        <p className="text-sm text-slate-600">
          Esta tabla calcula los viajes basándose{" "}
          <strong>en el rango de fechas seleccionado arriba</strong>. Los
          empleados con{" "}
          <strong>
            menos viajes ({fechaInicio} al {fechaFin})
          </strong>{" "}
          aparecen primero en la lista.
        </p>
      </div>

      {/* --- PESTAÑAS (TABS) --- */}
      <div className="flex gap-2 mb-4 border-b border-slate-200">
        <button
          onClick={() => setVistaActiva("choferes")}
          className={`flex items-center gap-2 px-4 py-2.5 font-semibold text-sm transition-colors border-b-2 ${
            isChofer
              ? colorTabActivo
              : "border-transparent text-slate-500 hover:text-purple-600"
          }`}
        >
          <User size={16} /> Choferes
        </button>
        <button
          onClick={() => setVistaActiva("ayudantes")}
          className={`flex items-center gap-2 px-4 py-2.5 font-semibold text-sm transition-colors border-b-2 ${
            !isChofer
              ? colorTabActivo
              : "border-transparent text-slate-500 hover:text-emerald-600"
          }`}
        >
          <Users size={16} /> Auxiliares
        </button>
      </div>

      {cargando ? (
        <div className="flex flex-col h-full items-center justify-center p-12 text-slate-500 font-bold animate-pulse gap-2">
          <History size={24} />
          Consultando registros...
        </div>
      ) : datosMostrar.length === 0 ? (
        <div className="p-8 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 flex flex-col items-center text-center mt-4">
          <AlertCircle className="text-slate-400 mb-3" size={40} />
          <h3 className="text-lg font-semibold text-slate-700">
            No hay personal registrado
          </h3>
          <p className="text-sm text-slate-500">
            Intenta ampliando el rango de fechas.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm mt-2">
          <table className="w-full text-left border-collapse text-sm bg-white">
            <thead>
              <tr
                className={`${colorTh} text-white uppercase tracking-wider text-xs transition-colors`}
              >
                <th className="px-6 py-4 font-bold">
                  {isChofer ? "Nombre del Chofer" : "Nombre del Auxiliar"}
                </th>
                <th className="px-6 py-4 font-bold text-center">
                  Viajes en el Rango
                </th>
                <th className="px-6 py-4 font-bold text-center">
                  Último Viaje Registrado
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {datosMostrar.map((personal, index) => (
                <tr
                  key={index}
                  className={`${colorHoverFila} transition-colors`}
                >
                  <td className="px-6 py-4 font-bold text-slate-700 text-xs">
                    {personal.nombre}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                        personal.totalViajes === 0
                          ? "bg-red-100 text-red-700"
                          : index < 5
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      <Truck size={14} /> {personal.totalViajes} viajes
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center text-slate-600 font-medium text-xs flex justify-center items-center gap-2">
                    <CalendarCheck
                      size={14}
                      className={
                        isChofer ? "text-purple-400" : "text-emerald-400"
                      }
                    />
                    {personal.ultimoViaje}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
