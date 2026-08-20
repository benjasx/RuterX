import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Calendar,
  Save,
  Loader2,
  UserCheck,
  Download,
  FileText,
  Search,
  Filter,
} from "lucide-react";
import { obtenerChoferesFirebase } from "../firebase/choferesService";
import { obtenerVacacionesFirebase } from "../firebase/vacacionesService";
import {
  obtenerAsistenciaPorFecha,
  guardarAsistenciaFecha,
} from "../firebase/asistenciaService";
import {
  claseEstadoBadge,
  estadoEfectivo,
  CODIGO_ASISTENCIA_POR_TIPO,
} from "../utils/vacacionesUtils";
import { exportarAsistenciaPDF } from "../utils/reportesAsistenciaUtils";

const ESTADOS_ASISTENCIA = [
  { codigo: "A", etiqueta: "Asistencia" },
  { codigo: "RET", etiqueta: "Retardo" },
  { codigo: "V", etiqueta: "Vacaciones" },
  { codigo: "I", etiqueta: "Incapacidad" },
  { codigo: "PCG", etiqueta: "Permiso c/goce" },
  { codigo: "CAP", etiqueta: "Capacitación" },
  { codigo: "PSG", etiqueta: "Permiso s/goce" },
  { codigo: "DF", etiqueta: "Día festivo" },
  { codigo: "DS", etiqueta: "Descanso" },
  { codigo: "F", etiqueta: "Falta injustif." },
  { codigo: "S", etiqueta: "Suspensión" },
];

export default function PanelAsistencia() {
  const hoyStr = new Date().toLocaleDateString("sv-SE");
  const [fechaSeleccionada, setFechaSeleccionada] = useState(hoyStr);
  const [registros, setRegistros] = useState<any[]>([]);
  const [guardando, setGuardando] = useState(false);

  const [busqueda, setBusqueda] = useState("");
  const [filtroPuesto, setFiltroPuesto] = useState("TODOS");
  const [filtroEstado, setFiltroEstado] = useState("TODOS");

  const queryClient = useQueryClient();

  const { data: personalData = [], isLoading: cargandoPersonal } = useQuery({
    queryKey: ["choferes"],
    queryFn: obtenerChoferesFirebase,
  });

  const { data: asistenciaGuardada = [], isLoading: cargandoAsistencia } =
    useQuery({
      queryKey: ["asistencia", fechaSeleccionada],
      queryFn: () => obtenerAsistenciaPorFecha(fechaSeleccionada),
    });

  const { data: vacacionesData = [] } = useQuery({
    queryKey: ["vacaciones"],
    queryFn: obtenerVacacionesFirebase,
  });

  useEffect(() => {
    if (personalData.length > 0) {
      const mapaGuardado = new Map(
        asistenciaGuardada.map((r: any) => [r.id || r.nombre, r]),
      );
      const nuevaLista = personalData.map((p: any) => {
        const guardado: any = mapaGuardado.get(p.id || p.nombre);
        const rol = (p.rol || p.puesto || p.tipo || "CHOFER").toUpperCase();
        const periodos = vacacionesData.filter(
          (v: any) => v.chofer_id === p.id,
        );
        const tipoDetectado = estadoEfectivo(p, periodos, fechaSeleccionada);
        const estadoSugerido =
          tipoDetectado === "Disponible"
            ? "A"
            : CODIGO_ASISTENCIA_POR_TIPO[tipoDetectado] || "A";
        return {
          id: p.id || p.nombre,
          nombre: (p.nombre || "").toUpperCase(),
          puesto:
            rol.includes("AYUDANTE") || rol.includes("AUXILIAR")
              ? "AUXILIAR"
              : "CHOFER",
          estado: guardado ? guardado.estado : estadoSugerido,
          observaciones: guardado ? guardado.observaciones : "",
          tipoDetectado:
            tipoDetectado !== "Disponible" ? tipoDetectado : undefined,
        };
      });

      // 🚀 SOLUCIÓN AL BUCLE INFINITO:
      // Comparamos el estado actual con la nueva lista.
      // Si son idénticos, "return prev" aborta la actualización y rompe el ciclo infinito.
      setRegistros((prev) => {
        if (JSON.stringify(prev) === JSON.stringify(nuevaLista)) {
          return prev;
        }
        return nuevaLista;
      });
    }
  }, [personalData, asistenciaGuardada, vacacionesData, fechaSeleccionada]);

  const registrosFiltrados = useMemo(() => {
    return registros.filter((reg) => {
      const coincideNombre = reg.nombre.includes(busqueda.toUpperCase().trim());
      const coincidePuesto =
        filtroPuesto === "TODOS" || reg.puesto === filtroPuesto;
      const coincideEstado =
        filtroEstado === "TODOS" || reg.estado === filtroEstado;
      return coincideNombre && coincidePuesto && coincideEstado;
    });
  }, [registros, busqueda, filtroPuesto, filtroEstado]);

  const resumenPorEstado = useMemo(() => {
    const conteo: Record<string, number> = {};
    registros.forEach((reg) => {
      conteo[reg.estado] = (conteo[reg.estado] || 0) + 1;
    });
    return conteo;
  }, [registros]);

  const actualizarRegistro = (id: string, campo: string, valor: string) => {
    setRegistros((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, [campo]: valor.toUpperCase() } : item,
      ),
    );
  };

  const handleGuardar = async () => {
    setGuardando(true);
    try {
      await guardarAsistenciaFecha(fechaSeleccionada, registros);
      queryClient.invalidateQueries({
        queryKey: ["asistencia", fechaSeleccionada],
      });
      alert("¡ASISTENCIA GUARDADA CORRECTAMENTE!");
    } catch (error) {
      alert("Error al guardar la asistencia.");
    } finally {
      setGuardando(false);
    }
  };

  const exportarExcel = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "PERSONAL,PUESTO,ESTADO,OBSERVACIONES\r\n";

    registrosFiltrados.forEach((r) => {
      const filaArr = [
        `"${(r.nombre || "").toUpperCase()}"`,
        `"${(r.puesto || "").toUpperCase()}"`,
        `"${(r.estado || "").toUpperCase()}"`,
        `"${(r.observaciones || "").toUpperCase()}"`,
      ];
      csvContent += filaArr.join(",") + "\r\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `CONTROL_ASISTENCIA_${fechaSeleccionada}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (cargandoPersonal || cargandoAsistencia) {
    return (
      <div className="flex w-full min-h-screen items-center justify-center">
        <Loader2 className="animate-spin text-blue-600 dark:text-blue-400" size={40} />
      </div>
    );
  }

  const obtenerEstiloEstado = (estado: string) => {
    switch (estado) {
      case "A":
        return "bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 border-green-300 dark:border-green-800 font-bold";
      case "RET":
        return "bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-300 border-amber-300 dark:border-amber-800 font-bold";
      case "V":
        return "bg-teal-100 dark:bg-teal-900/40 text-teal-800 dark:text-teal-300 border-teal-300 dark:border-teal-800 font-bold";
      case "I":
        return "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300 border-yellow-300 dark:border-yellow-800 font-bold";
      case "PCG":
        return "bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300 border-red-300 dark:border-red-800 font-bold";
      case "CAP":
        return "bg-sky-900 text-white border-sky-950 font-bold";
      case "PSG":
        return "bg-slate-900 text-white border-slate-950 font-bold";
      case "DF":
        return "bg-purple-900 text-white border-purple-950 font-bold";
      case "DS":
        return "bg-cyan-500 text-white border-cyan-600 font-bold";
      case "F":
        return "bg-red-600 text-white border-red-700 font-bold";
      case "S":
        return "bg-red-700 text-white border-red-800 font-bold";
      default:
        return "bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 border-slate-200 dark:border-slate-700";
    }
  };

  return (
    <div className="w-full bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 min-h-screen uppercase">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b border-slate-100 dark:border-slate-700">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-3">
            <UserCheck className="text-blue-600 dark:text-blue-400" size={28} />
            Control de Asistencia
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium mt-1 normal-case">
            Registro diario de asistencia, retardos y permisos para choferes y
            auxiliares
          </p>
        </div>

        <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
          <Calendar size={20} className="text-slate-500 dark:text-slate-400" />
          <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase">
            Fecha de Registro:
          </span>
          <input
            type="date"
            value={fechaSeleccionada}
            onChange={(e) => setFechaSeleccionada(e.target.value)}
            className="border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-1.5 bg-white dark:bg-slate-800 font-bold text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
          <p className="text-[10px] font-black tracking-wider text-slate-400 dark:text-slate-500">
            Total Personal
          </p>
          <p className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-1">
            {registros.length}
          </p>
        </div>
        {ESTADOS_ASISTENCIA.map((e) => (
          <div
            key={e.codigo}
            className={`p-4 rounded-xl border ${obtenerEstiloEstado(e.codigo)}`}
          >
            <p className="text-[10px] font-black tracking-wider opacity-80">
              {e.etiqueta}
            </p>
            <p className="text-2xl font-black mt-1">
              {resumenPorEstado[e.codigo] || 0}
            </p>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
        <div className="relative w-full sm:w-80">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
            size={18}
          />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre..."
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-xs font-semibold uppercase"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter size={18} className="text-slate-500 dark:text-slate-400" />
          <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase">
            Filtrar por:
          </span>
          <select
            value={filtroPuesto}
            onChange={(e) => setFiltroPuesto(e.target.value)}
            className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 font-bold text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer text-xs"
          >
            <option value="TODOS">TODOS</option>
            <option value="CHOFER">SOLO CHOFERES</option>
            <option value="AUXILIAR">SOLO AUXILIARES</option>
          </select>
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 font-bold text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer text-xs"
          >
            <option value="TODOS">TODOS LOS ESTADOS</option>
            {ESTADOS_ASISTENCIA.map((e) => (
              <option key={e.codigo} value={e.codigo}>
                {e.codigo} - {e.etiqueta.toUpperCase()}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm mb-6">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-800 text-white text-xs uppercase tracking-wider">
              <th className="p-3 border-r border-slate-700">Personal</th>
              <th className="p-3 border-r border-slate-700 w-44 text-center">
                Puesto
              </th>
              <th className="p-3 border-r border-slate-700 w-64 text-center">
                Estado
              </th>
              <th className="p-3">Observaciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-sm">
            {registrosFiltrados.map((reg) => (
              <tr key={reg.id} className="hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                <td className="p-3 border-r border-slate-200 dark:border-slate-700 font-bold text-slate-800 dark:text-slate-100 text-xs">
                  <div className="flex flex-col gap-1">
                    <span>{reg.nombre}</span>
                    {reg.tipoDetectado && (
                      <span
                        className={`w-fit text-[9px] font-black uppercase px-1.5 py-0.5 rounded border normal-case tracking-wider ${claseEstadoBadge(reg.tipoDetectado)}`}
                      >
                        {reg.tipoDetectado}
                      </span>
                    )}
                  </div>
                </td>
                <td className="p-3 border-r border-slate-200 dark:border-slate-700 text-center text-xs font-semibold text-slate-600 dark:text-slate-300">
                  {reg.puesto}
                </td>
                <td className="p-3 border-r border-slate-200 dark:border-slate-700 text-center">
                  <select
                    value={reg.estado}
                    onChange={(e) =>
                      actualizarRegistro(reg.id, "estado", e.target.value)
                    }
                    className={`w-full p-2 border rounded-lg text-xs uppercase cursor-pointer outline-none focus:ring-2 focus:ring-blue-500 ${obtenerEstiloEstado(reg.estado)}`}
                  >
                    <option value="A">A - ASISTENCIA</option>
                    <option value="RET">RET - RETARDO</option>
                    <option value="V">V - VACACIONES</option>
                    <option value="I">I - INCAPACIDAD</option>
                    <option value="PCG">PCG - PERMISO CON GOCE</option>
                    <option value="CAP">CAP - CAPACITACIÓN</option>
                    <option value="PSG">PSG - PERMISO SIN GOCE</option>
                    <option value="DF">DF - DÍA FESTIVO</option>
                    <option value="DS">DS - DESCANSO OBLIGATORIO</option>
                    <option value="F">F - FALTA INJUSTIFICADA</option>
                    <option value="S">S - SUSPENSIÓN</option>
                  </select>
                </td>
                <td className="p-3">
                  <input
                    type="text"
                    value={reg.observaciones}
                    onChange={(e) =>
                      actualizarRegistro(
                        reg.id,
                        "observaciones",
                        e.target.value,
                      )
                    }
                    placeholder="MOTIVO O COMENTARIO..."
                    className="w-full p-2 bg-transparent border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 uppercase text-xs"
                  />
                </td>
              </tr>
            ))}

            {registrosFiltrados.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="p-8 text-center text-slate-400 dark:text-slate-500 font-semibold text-xs"
                >
                  NO SE ENCONTRARON REGISTROS QUE COINCIDAN CON LA BÚSQUEDA.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end items-center gap-3">
        <button
          onClick={exportarExcel}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-3 rounded-xl transition-colors shadow-lg shadow-emerald-600/20 cursor-pointer text-xs"
        >
          <Download size={18} /> EXCEL
        </button>

        <button
          onClick={() =>
            exportarAsistenciaPDF(registrosFiltrados, fechaSeleccionada)
          }
          className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white font-bold px-5 py-3 rounded-xl transition-colors shadow-lg shadow-rose-600/20 cursor-pointer text-xs"
        >
          <FileText size={18} /> PDF
        </button>

        <button
          onClick={handleGuardar}
          disabled={guardando}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold px-6 py-3 rounded-xl transition-colors shadow-lg shadow-blue-600/30 cursor-pointer text-xs"
        >
          {guardando ? (
            <Loader2 size={20} className="animate-spin" />
          ) : (
            <Save size={20} />
          )}
          {guardando ? "GUARDANDO..." : "GUARDAR ASISTENCIA DEL DÍA"}
        </button>
      </div>
    </div>
  );
}
