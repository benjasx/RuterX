import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  History,
  Truck,
  CalendarCheck,
  AlertCircle,
  Info,
  FileDown,
  FileText,
  User,
  Users,
  Star,
  ListChecks,
  Gauge,
} from "lucide-react";
import { obtenerDistribucionPorRango } from "../firebase/distribucionService"; // 🚀 NUEVO IMPORT

import {
  generarPDFNominaChoferes,
  generarPDFNominaAyudantes,
  generarPDFResumenGeneral,
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

  const [mostrarViaticos, setMostrarViaticos] = useState(true);
  const [mostrarComisiones, setMostrarComisiones] = useState(true);

  // 🚀 AHORA LEEMOS DE LA NUEVA FUENTE DE LA VERDAD
  const {
    data: datosCrudos = [],
    isLoading: cargando,
    isError,
  } = useQuery({
    queryKey: ["distribucion_rango", fechaInicio, fechaFin],
    queryFn: () => obtenerDistribucionPorRango(fechaInicio, fechaFin),
  });

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

    datosCrudos.forEach((registro) => {
      (registro.filas || []).forEach((fila: any) => {
        if (fila.chofer && fila.chofer !== "-") {
          setChoferesHistoricos.add(fila.chofer.toUpperCase().trim());
        }
      });
    });

    const datosOrdenados = [...datosCrudos].sort(
      (a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime(),
    );

    datosOrdenados.forEach((registro) => {
      const fecha = registro.fecha;

      (registro.filas || []).forEach((fila: any) => {
        let agregadoAFiltrados = false;

        const c = fila.chofer ? fila.chofer.toUpperCase().trim() : "";
        if (c && c !== "-") {
          if (!statsCMap[c]) statsCMap[c] = { total: 0, ultimaFecha: "" };
          statsCMap[c].total += 1;
          statsCMap[c].ultimaFecha = fecha;

          listaViajesFiltrados.push({ fecha, ...fila });
          agregadoAFiltrados = true;
        }

        const procesarAyudante = (ayRaw: string) => {
          const ay = ayRaw ? ayRaw.toUpperCase().trim() : "";
          if (
            ay &&
            ay !== "-" &&
            ay !== "-- SIN AUXILIAR --" &&
            ay !== "UNDEFINED"
          ) {
            if (setChoferesHistoricos.has(ay)) {
              if (!statsCMap[ay]) statsCMap[ay] = { total: 0, ultimaFecha: "" };
              statsCMap[ay].total += 1;
              statsCMap[ay].ultimaFecha = fecha;
            } else {
              if (!statsAMap[ay]) statsAMap[ay] = { total: 0, ultimaFecha: "" };
              statsAMap[ay].total += 1;
              statsAMap[ay].ultimaFecha = fecha;
            }

            if (!agregadoAFiltrados) {
              listaViajesFiltrados.push({ fecha, ...fila });
              agregadoAFiltrados = true;
            }
          }
        };

        procesarAyudante(fila.auxiliar1);
        procesarAyudante(fila.auxiliar2);
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

  useEffect(() => {
    setPersonalPDF("TODOS");
  }, [vistaActiva]);

  const handleDescargarPDF = async () => {
    setIsGenerandoPDF(true);
    if (vistaActiva === "choferes") {
      await generarPDFNominaChoferes(
        viajesRango,
        fechaInicio,
        fechaFin,
        personalPDF,
        mostrarViaticos,
        mostrarComisiones,
      );
    } else {
      await generarPDFNominaAyudantes(
        viajesRango,
        fechaInicio,
        fechaFin,
        personalPDF,
        listaNegraChoferes,
        mostrarViaticos,
        mostrarComisiones,
      );
    }
    setIsGenerandoPDF(false);
  };

  const handleDescargarResumenGeneral = async () => {
    setIsGenerandoPDF(true);
    await generarPDFResumenGeneral(
      viajesRango,
      fechaInicio,
      fechaFin,
      mostrarViaticos,
      mostrarComisiones,
    );
    setIsGenerandoPDF(false);
  };

  const datosMostrar =
    vistaActiva === "choferes" ? estadisticasChoferes : estadisticasAyudantes;

  // 🚀 Resumen visual: se deriva del mismo arreglo ya ordenado (menor a mayor),
  // no agrega lógica de negocio nueva.
  const resumen = useMemo(() => {
    if (datosMostrar.length === 0) return null;
    const suma = datosMostrar.reduce((acc, p) => acc + p.totalViajes, 0);
    return {
      total: datosMostrar.length,
      promedio: suma / datosMostrar.length,
      candidato: datosMostrar[0],
      maxViajes: datosMostrar[datosMostrar.length - 1].totalViajes,
    };
  }, [datosMostrar]);

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
  const colorTh = isChofer ? "bg-purple-800" : "bg-emerald-800";
  const colorHoverFila = isChofer
    ? "hover:bg-purple-50"
    : "hover:bg-emerald-50";
  const colorCheckbox = isChofer ? "accent-purple-600" : "accent-emerald-600";
  const colorIconTile = isChofer
    ? "bg-purple-100 text-purple-600"
    : "bg-emerald-100 text-emerald-600";
  const colorBarra = isChofer ? "bg-purple-500" : "bg-emerald-500";
  const colorFilaLider = isChofer
    ? "bg-purple-50/60 border-l-4 border-l-purple-500"
    : "bg-emerald-50/60 border-l-4 border-l-emerald-500";

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
    <div className="w-full bg-slate-50/50 p-6 rounded-xl flex flex-col h-full overflow-y-auto custom-scrollbar">
      <div className="mb-6">
        <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
          <History className={isChofer ? "text-purple-600" : "text-emerald-600"} size={28} />
          Control de Equidad y Reportes
        </h2>
        <p className="text-slate-500 mt-1 font-medium">
          Distribución de viajes por personal para decidir quién sale en la
          siguiente ruta.
        </p>
      </div>

      {/* Tabs — segmented control */}
      <div className="inline-flex gap-1 p-1 mb-6 bg-slate-100 rounded-xl w-full sm:w-auto">
        <button
          onClick={() => setVistaActiva("choferes")}
          className={`flex items-center justify-center gap-2 px-5 py-2 rounded-lg font-bold text-sm transition-colors flex-1 sm:flex-initial ${isChofer ? "bg-white text-purple-700 shadow-sm" : "text-slate-500 hover:text-purple-600"}`}
        >
          <User size={16} /> Choferes
        </button>
        <button
          onClick={() => setVistaActiva("ayudantes")}
          className={`flex items-center justify-center gap-2 px-5 py-2 rounded-lg font-bold text-sm transition-colors flex-1 sm:flex-initial ${!isChofer ? "bg-white text-emerald-700 shadow-sm" : "text-slate-500 hover:text-emerald-600"}`}
        >
          <Users size={16} /> Auxiliares
        </button>
      </div>

      {/* Resumen del rango */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${colorIconTile}`}>
            <ListChecks size={24} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-400 uppercase">
              {isChofer ? "Choferes" : "Auxiliares"} en el rango
            </p>
            <p className="text-xl lg:text-2xl font-black text-slate-800 tabular-nums">
              {resumen?.total ?? 0}
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${colorIconTile}`}>
            <Gauge size={24} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-400 uppercase">
              Promedio de viajes
            </p>
            <p className="text-xl lg:text-2xl font-black text-slate-800 tabular-nums">
              {resumen ? resumen.promedio.toFixed(1) : "0.0"}
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 xl:col-span-2">
          <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
            <Star size={24} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-400 uppercase">
              Siguiente en turno (menos viajes)
            </p>
            <p
              className="text-lg lg:text-xl font-black text-slate-800 truncate"
              title={resumen?.candidato.nombre}
            >
              {resumen ? resumen.candidato.nombre : "—"}{" "}
              {resumen && (
                <span className="text-sm text-slate-500 font-bold tabular-nums">
                  ({resumen.candidato.totalViajes} viajes)
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Filtros de fecha + acciones de reporte */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm mb-6 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
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

        <div className="flex flex-col items-end gap-3 w-full xl:w-auto">
          <div className="flex flex-col sm:flex-row items-center gap-2 w-full">
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
              className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-colors shadow-sm w-full sm:w-auto ${isGenerandoPDF || cargando ? "bg-slate-100 text-slate-400 cursor-not-allowed" : `${colorBtnPDF} text-white`}`}
            >
              <FileDown size={18} /> Reporte{" "}
              {isChofer ? "Choferes" : "Auxiliares"}
            </button>

            <button
              onClick={handleDescargarResumenGeneral}
              disabled={isGenerandoPDF || cargando}
              className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-colors shadow-sm w-full sm:w-auto ${isGenerandoPDF || cargando ? "bg-slate-100 text-slate-400 cursor-not-allowed" : "bg-slate-800 hover:bg-slate-900 text-white"}`}
            >
              <FileText size={18} /> Resumen Maestro
            </button>
          </div>

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

      <div className="flex items-start gap-2 mb-4 bg-blue-50 p-3 rounded-lg border border-blue-100">
        <Info className="text-blue-500 shrink-0 mt-0.5" size={18} />
        <p className="text-sm text-blue-800">
          La tabla calcula los viajes basándose{" "}
          <strong>en el rango de fechas seleccionado arriba</strong>. Los
          empleados con{" "}
          <strong>
            menos viajes ({fechaInicio} al {fechaFin})
          </strong>{" "}
          aparecen primero en la lista.
        </p>
      </div>

      {cargando ? (
        <div className="flex flex-col flex-1 items-center justify-center p-12 text-slate-500 font-bold animate-pulse gap-2 bg-white rounded-2xl border border-slate-100 shadow-sm">
          <History size={24} /> Consultando registros...
        </div>
      ) : datosMostrar.length === 0 ? (
        <div className="p-8 border-2 border-dashed border-slate-200 rounded-2xl bg-white flex flex-col items-center text-center">
          <AlertCircle className="text-slate-400 mb-3" size={40} />
          <h3 className="text-lg font-semibold text-slate-700">
            No hay personal registrado
          </h3>
          <p className="text-sm text-slate-500">
            Intenta ampliando el rango de fechas.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-100 shadow-sm">
          <table className="w-full text-left border-collapse text-sm bg-white">
            <thead>
              <tr
                className={`${colorTh} text-white uppercase tracking-wider text-xs transition-colors`}
              >
                <th className="px-4 py-4 font-bold text-center w-14">#</th>
                <th className="px-6 py-4 font-bold">
                  {isChofer ? "Nombre del Chofer" : "Nombre del Auxiliar"}
                </th>
                <th className="px-6 py-4 font-bold">
                  Carga de Viajes en el Rango
                </th>
                <th className="px-6 py-4 font-bold text-center">
                  Último Viaje Registrado
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {datosMostrar.map((personal, index) => {
                const esLider = index === 0;
                const porcentaje =
                  (personal.totalViajes / Math.max(resumen?.maxViajes ?? 1, 1)) *
                  100;
                return (
                  <tr
                    key={index}
                    className={`transition-colors ${esLider ? colorFilaLider : colorHoverFila}`}
                  >
                    <td className="px-4 py-4 text-center">
                      <span
                        className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-black tabular-nums ${esLider ? "bg-amber-400 text-white" : "bg-slate-100 text-slate-500"}`}
                      >
                        {index + 1}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-700 text-xs">
                      <div className="flex items-center gap-2">
                        {personal.nombre}
                        {esLider && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold uppercase tracking-wide">
                            <Star size={11} /> Siguiente turno
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden min-w-16">
                          <div
                            className={`h-full rounded-full ${personal.totalViajes === 0 ? "bg-red-400" : colorBarra}`}
                            style={{ width: `${Math.max(porcentaje, personal.totalViajes === 0 ? 100 : 4)}%` }}
                          />
                        </div>
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold shrink-0 tabular-nums ${personal.totalViajes === 0 ? "bg-red-100 text-red-700" : index < 5 ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"}`}
                        >
                          <Truck size={14} /> {personal.totalViajes} viajes
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center text-slate-600 font-medium text-xs">
                      <div className="flex justify-center items-center gap-2">
                        <CalendarCheck
                          size={14}
                          className={
                            isChofer ? "text-purple-400" : "text-emerald-400"
                          }
                        />
                        {personal.ultimoViaje}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
