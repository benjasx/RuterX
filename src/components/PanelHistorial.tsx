import { useState, useEffect } from "react";
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
import { obtenerHistorialFirebase } from "../firebase/historialService";
import { generarPDFRutasPorChofer } from "../utils/pdfReporterutasxchofer";

interface PersonalStat {
  nombre: string;
  totalViajes: number;
  ultimoViaje: string;
}

export default function PanelHistorial() {
  const hoy = new Date();
  const hace7Dias = new Date();
  hace7Dias.setDate(hoy.getDate() - 7);

  const [fechaInicio, setFechaInicio] = useState(
    hace7Dias.toISOString().split("T")[0],
  );
  const [fechaFin, setFechaFin] = useState(hoy.toISOString().split("T")[0]);

  const [datosCrudosNube, setDatosCrudosNube] = useState<any[]>([]);
  const [estadisticasChoferes, setEstadisticasChoferes] = useState<
    PersonalStat[]
  >([]);
  const [estadisticasAyudantes, setEstadisticasAyudantes] = useState<
    PersonalStat[]
  >([]);
  const [viajesRango, setViajesRango] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [vistaActiva, setVistaActiva] = useState<"choferes" | "ayudantes">(
    "choferes",
  );

  const [isGenerandoPDF, setIsGenerandoPDF] = useState(false);
  const [choferPDF, setChoferPDF] = useState<string>("TODOS");

  useEffect(() => {
    const fetchDatos = async () => {
      setCargando(true);
      const datos = await obtenerHistorialFirebase();
      setDatosCrudosNube(datos);
      setCargando(false);
    };
    fetchDatos();
  }, []);

  useEffect(() => {
    if (!datosCrudosNube.length && !cargando) return;

    // 🚀 PASO 1: CREAR LA "LISTA NEGRA" DE CHOFERES (Set)
    // Esto asegura que cualquiera que haya sido chofer alguna vez, no cuente como ayudante
    const setChoferesHistoricos = new Set<string>();
    datosCrudosNube.forEach((registro) => {
      (registro.viajes || []).forEach((viaje: any) => {
        if (viaje.chofer && viaje.chofer !== "-") {
          setChoferesHistoricos.add(viaje.chofer.toUpperCase().trim());
        }
      });
    });

    const statsCMap: Record<string, { total: number; ultimaFecha: string }> =
      {};
    const statsAMap: Record<string, { total: number; ultimaFecha: string }> =
      {};
    const listaViajesFiltrados: any[] = [];

    const datosOrdenados = [...datosCrudosNube].sort(
      (a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime(),
    );

    // 🚀 PASO 2: CONTAR LOS VIAJES
    datosOrdenados.forEach((registro) => {
      const fecha = registro.fecha;
      const enRango = fecha >= fechaInicio && fecha <= fechaFin;

      (registro.viajes || []).forEach((viaje: any) => {
        // --- PROCESAR CHOFERES ---
        if (viaje.chofer && viaje.chofer !== "-") {
          const nombreChofer = viaje.chofer.toUpperCase().trim();
          if (!statsCMap[nombreChofer])
            statsCMap[nombreChofer] = { total: 0, ultimaFecha: "" };
          if (enRango) statsCMap[nombreChofer].total += 1;
          statsCMap[nombreChofer].ultimaFecha = fecha;
        }

        // --- PROCESAR AYUDANTE 1 ---
        const ay1 = viaje.ayudante1 ? viaje.ayudante1.toUpperCase().trim() : "";
        // Agregamos la condición: !setChoferesHistoricos.has(ay1)
        if (
          ay1 &&
          ay1 !== "-" &&
          ay1 !== "SIN AYUDANTE" &&
          ay1 !== "UNDEFINED" &&
          !setChoferesHistoricos.has(ay1)
        ) {
          if (!statsAMap[ay1]) statsAMap[ay1] = { total: 0, ultimaFecha: "" };
          if (enRango) statsAMap[ay1].total += 1;
          statsAMap[ay1].ultimaFecha = fecha;
        }

        // --- PROCESAR AYUDANTE 2 ---
        const ay2 = viaje.ayudante2 ? viaje.ayudante2.toUpperCase().trim() : "";
        // Agregamos la condición: !setChoferesHistoricos.has(ay2)
        if (
          ay2 &&
          ay2 !== "-" &&
          ay2 !== "SIN AYUDANTE" &&
          ay2 !== "UNDEFINED" &&
          !setChoferesHistoricos.has(ay2)
        ) {
          if (!statsAMap[ay2]) statsAMap[ay2] = { total: 0, ultimaFecha: "" };
          if (enRango) statsAMap[ay2].total += 1;
          statsAMap[ay2].ultimaFecha = fecha;
        }

        if (enRango && viaje.chofer && viaje.chofer !== "-") {
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

    setEstadisticasChoferes(arrayChoferes);
    setEstadisticasAyudantes(arrayAyudantes);
    setViajesRango(listaViajesFiltrados);
  }, [datosCrudosNube, fechaInicio, fechaFin, cargando]);

  const handleDescargarPDF = async () => {
    setIsGenerandoPDF(true);
    await generarPDFRutasPorChofer(
      viajesRango,
      fechaInicio,
      fechaFin,
      choferPDF,
    );
    setIsGenerandoPDF(false);
  };

  const datosMostrar =
    vistaActiva === "choferes" ? estadisticasChoferes : estadisticasAyudantes;

  return (
    <div className="w-full bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col h-full">
      <div className="flex items-center gap-2 mb-4">
        <History className="text-purple-600" size={24} />
        <h2 className="text-xl font-bold text-slate-800">
          Control de Equidad de Personal
        </h2>
      </div>

      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-6 gap-4">
        {/* SELECTORES DE FECHA */}
        <div className="flex flex-col sm:flex-row items-center gap-3 bg-purple-50 p-2.5 rounded-lg border border-purple-100 shadow-sm w-full xl:w-auto">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-sm font-bold text-purple-800">Desde:</span>
            <input
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              className="px-2 py-1 rounded-md text-sm border-none shadow-sm text-slate-700 bg-white w-full sm:w-auto cursor-pointer focus:ring-2 focus:ring-purple-500 outline-none"
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-sm font-bold text-purple-800">Hasta:</span>
            <input
              type="date"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              className="px-2 py-1 rounded-md text-sm border-none shadow-sm text-slate-700 bg-white w-full sm:w-auto cursor-pointer focus:ring-2 focus:ring-purple-500 outline-none"
            />
          </div>
        </div>

        {/* SELECTOR DE CHOFER Y BOTÓN DE PDF */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto">
          <select
            value={choferPDF}
            onChange={(e) => setChoferPDF(e.target.value)}
            className="px-3 py-2.5 rounded-lg border border-purple-200 text-sm focus:ring-2 focus:ring-purple-500 outline-none text-slate-700 font-bold bg-white shadow-sm w-full sm:w-auto cursor-pointer"
          >
            <option value="TODOS">Reporte General (Todos)</option>
            {[...estadisticasChoferes]
              .sort((a, b) => a.nombre.localeCompare(b.nombre))
              .map((c) => (
                <option key={c.nombre} value={c.nombre}>
                  {c.nombre}
                </option>
              ))}
          </select>

          <button
            onClick={handleDescargarPDF}
            disabled={isGenerandoPDF}
            className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-colors shadow-sm w-full sm:w-auto ${
              isGenerandoPDF
                ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                : "bg-purple-700 hover:bg-purple-800 text-white"
            }`}
          >
            <FileDown size={18} />
            {isGenerandoPDF ? "Generando..." : "Descargar (PDF)"}
          </button>
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
            vistaActiva === "choferes"
              ? "border-purple-600 text-purple-700"
              : "border-transparent text-slate-500 hover:text-purple-600"
          }`}
        >
          <User size={16} /> Choferes
        </button>
        <button
          onClick={() => setVistaActiva("ayudantes")}
          className={`flex items-center gap-2 px-4 py-2.5 font-semibold text-sm transition-colors border-b-2 ${
            vistaActiva === "ayudantes"
              ? "border-purple-600 text-purple-700"
              : "border-transparent text-slate-500 hover:text-purple-600"
          }`}
        >
          <Users size={16} /> Ayudantes
        </button>
      </div>

      {cargando ? (
        <div className="flex items-center justify-center p-12 text-slate-500">
          Cargando datos de la nube...
        </div>
      ) : datosMostrar.length === 0 ? (
        <div className="p-8 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 flex flex-col items-center text-center">
          <AlertCircle className="text-slate-400 mb-3" size={40} />
          <h3 className="text-lg font-semibold text-slate-700">
            No hay personal registrado
          </h3>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
          <table className="w-full text-left border-collapse text-sm bg-white">
            <thead>
              <tr className="bg-purple-800 text-white uppercase tracking-wider text-xs">
                <th className="px-6 py-4 font-bold">
                  {vistaActiva === "choferes"
                    ? "Nombre del Chofer"
                    : "Nombre del Ayudante"}
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
                  className="hover:bg-purple-50 transition-colors"
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
                    <CalendarCheck size={14} className="text-purple-400" />
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
