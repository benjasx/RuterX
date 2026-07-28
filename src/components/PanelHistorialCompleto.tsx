import { useState, useEffect, useRef, useMemo } from "react";
import {
  ClipboardList,
  Calendar,
  Truck,
  User,
  MapPin,
  Users,
  AlertCircle,
  Search,
  DollarSign,
  Scale,
  FileText,
  FileDown,
  Settings2,
  CheckSquare,
  Square,
  FileSpreadsheet,
  Edit2,
  X,
  Save,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import * as XLSX from "xlsx";
import {
  obtenerHistorialFirebase,
  guardarHistorialFirebase,
} from "../firebase/historialService";
import { generarPDFAuditoria } from "../utils/pdfAuditoriaService";
import {
  obtenerAjustesNomina,
  type AjustesNomina,
} from "../firebase/ajustesNominaService";

interface ViajeDetalle {
  originalIndex?: number;
  fecha: string;
  unidad: string;
  ruta: string;
  chofer: string;
  ayudante1: string;
  ayudante2: string;
  embCred: string;
  embCtdo: string;
  kgTotal: number;
  totalMonto: number;
  viaticoRuta: number;
  comisionChofer: number;
  comisionAyudante: number;
}

// 🚀 CONSTANTE: NÚMERO DE FILAS POR PÁGINA
const ITEMS_POR_PAGINA = 20;

export default function PanelHistorialCompleto() {
  const hoy = new Date();
  const hace7Dias = new Date();
  hace7Dias.setDate(hoy.getDate() - 7);

  const [fechaInicio, setFechaInicio] = useState(
    hace7Dias.toISOString().split("T")[0],
  );
  const [fechaFin, setFechaFin] = useState(hoy.toISOString().split("T")[0]);
  const [busqueda, setBusqueda] = useState("");

  const [datosCrudos, setDatosCrudos] = useState<any[]>([]);
  const [viajesMostrados, setViajesMostrados] = useState<ViajeDetalle[]>([]);
  const [cargando, setCargando] = useState(true);
  const [isGenerandoPDF, setIsGenerandoPDF] = useState(false);
  const [reglasNomina, setReglasNomina] = useState<AjustesNomina | null>(null);

  const [modalAbierto, setModalAbierto] = useState(false);
  const [viajeEditando, setViajeEditando] = useState<ViajeDetalle | null>(null);
  const [guardandoCambios, setGuardandoCambios] = useState(false);

  // 🚀 NUEVO ESTADO PARA LA PAGINACIÓN
  const [paginaActual, setPaginaActual] = useState(1);

  const [mostrarMenuColumnas, setMostrarMenuColumnas] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const [columnasPDF, setColumnasPDF] = useState<Record<string, boolean>>({
    fecha: true,
    unidad: true,
    ruta: true,
    embCred: false,
    embCtdo: false,
    chofer: true,
    ayudante1: true,
    ayudante2: true,
    kgTotal: true,
    totalMonto: true,
    viaticoRuta: true,
    comisionChofer: true,
    comisionAyudante: true,
  });

  const fMoneda = (c: number) =>
    new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(c);
  const fNumero = (c: number) =>
    new Intl.NumberFormat("es-MX", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(c);

  useEffect(() => {
    const cargarReglas = async () => {
      const reglas = await obtenerAjustesNomina();
      setReglasNomina(reglas);
    };
    cargarReglas();
  }, []);

  useEffect(() => {
    const handleClickFuera = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMostrarMenuColumnas(false);
      }
    };
    document.addEventListener("mousedown", handleClickFuera);
    return () => document.removeEventListener("mousedown", handleClickFuera);
  }, []);

  const cargarDatosNube = async () => {
    setCargando(true);
    const datosNube = await obtenerHistorialFirebase();
    setDatosCrudos(datosNube);
    setCargando(false);
  };

  useEffect(() => {
    cargarDatosNube();
  }, []);

  const listasPersonal = useMemo(() => {
    const choferes = new Set<string>();
    const ayudantes = new Set<string>();
    const rutas = new Set<string>();

    datosCrudos.forEach((registro) => {
      (registro.viajes || []).forEach((v: any) => {
        if (v.chofer && v.chofer !== "-" && v.chofer.trim() !== "") {
          choferes.add(v.chofer.toUpperCase().trim());
        }
        if (v.ayudante1 && v.ayudante1 !== "-" && v.ayudante1.trim() !== "") {
          ayudantes.add(v.ayudante1.toUpperCase().trim());
        }
        if (v.ayudante2 && v.ayudante2 !== "-" && v.ayudante2.trim() !== "") {
          ayudantes.add(v.ayudante2.toUpperCase().trim());
        }
        if (v.ruta && v.ruta !== "SIN RUTA" && v.ruta.trim() !== "") {
          rutas.add(v.ruta.toUpperCase().trim());
        }
      });
    });

    if (reglasNomina && reglasNomina.viaticosRutas) {
      Object.keys(reglasNomina.viaticosRutas).forEach((rutaCat) => {
        rutas.add(rutaCat.toUpperCase().trim());
      });
    }

    return {
      choferes: Array.from(choferes).sort(),
      ayudantes: Array.from(ayudantes).sort(),
      rutas: Array.from(rutas).sort(),
    };
  }, [datosCrudos, reglasNomina]);

  const calcularFinanzasDinamicas = (rutaRaw: string, montoBase: number) => {
    if (!reglasNomina)
      return { viaticoRuta: 0, comisionChofer: 0, comisionAyudante: 0 };
    let viaticoEncontrado = 0;
    if (rutaRaw) {
      const rutaNorm = rutaRaw
        .toUpperCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
      for (const [rutaCat, montoV] of Object.entries(
        reglasNomina.viaticosRutas,
      )) {
        const catNorm = rutaCat
          .toUpperCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .trim();
        if (rutaNorm.includes(catNorm) || catNorm.includes(rutaNorm)) {
          viaticoEncontrado = montoV;
          break;
        }
      }
    }
    return {
      viaticoRuta: viaticoEncontrado,
      comisionChofer: montoBase * reglasNomina.comisionChofer,
      comisionAyudante: montoBase * reglasNomina.comisionAyudante,
    };
  };

  useEffect(() => {
    if (!datosCrudos.length) return;
    let historialAplanado: ViajeDetalle[] = [];
    const textoBusqueda = busqueda
      .toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    datosCrudos.forEach((registro) => {
      const fecha = registro.fecha;
      if (fecha >= fechaInicio && fecha <= fechaFin) {
        const viajesDelDia = registro.viajes || [];
        viajesDelDia.forEach((viaje: any, idx: number) => {
          if (
            viaje.chofer &&
            viaje.chofer.trim() !== "" &&
            viaje.chofer !== "-"
          ) {
            const objViaje: ViajeDetalle = {
              originalIndex: idx,
              fecha: fecha,
              unidad: viaje.unidad || "-",
              ruta: viaje.ruta || "SIN RUTA",
              chofer: viaje.chofer,
              ayudante1: viaje.ayudante1 || "-",
              ayudante2: viaje.ayudante2 || "-",
              embCred: viaje.embCred || "-",
              embCtdo: viaje.embCtdo || "-",
              kgTotal: Number(viaje.kgTotal) || 0,
              totalMonto: Number(viaje.totalMonto) || 0,
              viaticoRuta: Number(viaje.viaticoRuta) || 0,
              comisionChofer: Number(viaje.comisionChofer) || 0,
              comisionAyudante: Number(viaje.comisionAyudante) || 0,
            };

            if (textoBusqueda) {
              const valoresTexto = [
                objViaje.chofer,
                objViaje.ruta,
                objViaje.unidad,
                objViaje.ayudante1,
                objViaje.ayudante2,
                objViaje.embCred,
                objViaje.embCtdo,
              ]
                .join(" ")
                .toUpperCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "");
              if (!valoresTexto.includes(textoBusqueda)) return;
            }
            historialAplanado.push(objViaje);
          }
        });
      }
    });

    historialAplanado.sort((a, b) => {
      if (a.fecha !== b.fecha)
        return new Date(b.fecha).getTime() - new Date(a.fecha).getTime();
      return parseInt(a.unidad) - parseInt(b.unidad);
    });

    setViajesMostrados(historialAplanado);
    setPaginaActual(1); // 🚀 REGRESAMOS A LA PÁGINA 1 CUANDO CAMBIAN LOS FILTROS
  }, [datosCrudos, fechaInicio, fechaFin, busqueda]);

  // 🚀 LÓGICA DE PAGINACIÓN
  const totalPaginas = Math.ceil(viajesMostrados.length / ITEMS_POR_PAGINA);
  const viajesPaginados = viajesMostrados.slice(
    (paginaActual - 1) * ITEMS_POR_PAGINA,
    paginaActual * ITEMS_POR_PAGINA,
  );

  const totales = viajesMostrados.reduce(
    (acc, v) => ({
      kg: acc.kg + v.kgTotal,
      monto: acc.monto + v.totalMonto,
      viaticos: acc.viaticos + v.viaticoRuta,
      comisionChofer: acc.comisionChofer + v.comisionChofer,
      comisionAyudante:
        acc.comisionAyudante +
        (v.ayudante1 !== "-" ? v.comisionAyudante : 0) +
        (v.ayudante2 !== "-" ? v.comisionAyudante : 0),
    }),
    { kg: 0, monto: 0, viaticos: 0, comisionChofer: 0, comisionAyudante: 0 },
  );

  const handleDescargarPDF = async () => {
    setIsGenerandoPDF(true);
    await generarPDFAuditoria(
      viajesMostrados,
      fechaInicio,
      fechaFin,
      busqueda,
      totales,
      columnasPDF,
    );
    setIsGenerandoPDF(false);
  };

  const handleDescargarExcelReal = () => {
    const headersMap: Record<string, string> = {
      fecha: "Fecha",
      unidad: "Unidad",
      ruta: "Ruta",
      embCred: "Folio Crédito",
      embCtdo: "Folio Contado",
      chofer: "Chofer",
      ayudante1: "Ayudante 1",
      ayudante2: "Ayudante 2",
      kgTotal: "Peso (KG)",
      totalMonto: "Venta ($)",
      viaticoRuta: "Viático ($)",
      comisionChofer: "Comisión Chofer",
      comisionAyudante: "Total Com. Ayudantes",
    };

    const columnasActivas = Object.keys(columnasPDF).filter(
      (key) => columnasPDF[key],
    );

    const datosFiltrados = viajesMostrados.map((v) => {
      const filaObj: Record<string, any> = {};
      columnasActivas.forEach((key) => {
        const headerName = headersMap[key];
        if (key === "comisionAyudante") {
          const com1 = v.ayudante1 !== "-" ? v.comisionAyudante : 0;
          const com2 = v.ayudante2 !== "-" ? v.comisionAyudante : 0;
          filaObj[headerName] = Number((com1 + com2).toFixed(2));
        } else if (key === "ayudante1" || key === "ayudante2") {
          filaObj[headerName] =
            v[key as keyof ViajeDetalle] !== "-"
              ? v[key as keyof ViajeDetalle]
              : "";
        } else if (
          ["kgTotal", "totalMonto", "viaticoRuta", "comisionChofer"].includes(
            key,
          )
        ) {
          filaObj[headerName] = Number(
            Number(v[key as keyof ViajeDetalle]).toFixed(2),
          );
        } else {
          filaObj[headerName] = v[key as keyof ViajeDetalle];
        }
      });
      return filaObj;
    });

    const worksheet = XLSX.utils.json_to_sheet(datosFiltrados);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Auditoría de Salidas");
    XLSX.writeFile(workbook, `Auditoria_Salidas_${fechaInicio}.xlsx`);
  };

  const toggleColumna = (clave: string) => {
    setColumnasPDF((prev) => ({ ...prev, [clave]: !prev[clave] }));
  };

  const abrirEdicion = (viaje: ViajeDetalle) => {
    setViajeEditando({ ...viaje });
    setModalAbierto(true);
  };

  const guardarEdicionTripulacion = async () => {
    if (!viajeEditando) return;
    setGuardandoCambios(true);

    const nuevasFinanzas = calcularFinanzasDinamicas(
      viajeEditando.ruta,
      viajeEditando.totalMonto,
    );

    const viajeActualizadoFirebase = {
      unidad: viajeEditando.unidad,
      ruta: viajeEditando.ruta.toUpperCase(),
      chofer: viajeEditando.chofer.toUpperCase(),
      ayudante1: viajeEditando.ayudante1.toUpperCase() || "-",
      ayudante2: viajeEditando.ayudante2.toUpperCase() || "-",
      embCred: viajeEditando.embCred,
      embCtdo: viajeEditando.embCtdo,
      kgTotal: Number(viajeEditando.kgTotal),
      totalMonto: Number(viajeEditando.totalMonto),
      viaticoRuta: nuevasFinanzas.viaticoRuta,
      comisionChofer: nuevasFinanzas.comisionChofer,
      comisionAyudante: nuevasFinanzas.comisionAyudante,
    };

    const registroDia = datosCrudos.find(
      (r) => r.fecha === viajeEditando.fecha,
    );
    if (registroDia && registroDia.viajes) {
      registroDia.viajes[viajeEditando.originalIndex!] =
        viajeActualizadoFirebase;
      const resultado = await guardarHistorialFirebase(
        viajeEditando.fecha,
        registroDia.viajes,
      );
      if (resultado.success) {
        alert("¡Registro actualizado y guardado en la nube correctamente!");
        setModalAbierto(false);
        await cargarDatosNube();
      } else {
        alert("Error al guardar los cambios en la nube.");
      }
    }
    setGuardandoCambios(false);
  };

  return (
    <div className="w-full bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col h-full overflow-hidden">
      <div className="flex items-center gap-2 mb-2 shrink-0">
        <ClipboardList className="text-blue-600" size={24} />
        <h2 className="text-xl font-bold text-slate-800">
          Auditoría y Registro de Salidas
        </h2>
      </div>
      <p className="text-sm text-slate-500 mb-6 shrink-0">
        Consulta el registro detallado, financiero y logístico de la operación.
        Haz clic en el ícono de editar para modificar cualquier dato.
      </p>

      {/* BARRA DE CONTROLES */}
      <div className="flex flex-col xl:flex-row gap-4 mb-6 shrink-0 bg-slate-50 p-4 rounded-xl border border-slate-200">
        <div className="flex flex-col sm:flex-row items-center gap-3 bg-white p-2.5 rounded-lg border border-slate-200 shadow-sm w-full xl:w-auto">
          <div className="flex items-center gap-2">
            <Calendar className="text-blue-600" size={18} />
            <span className="text-sm font-bold text-slate-700">Desde:</span>
            <input
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              className="px-2 py-1 rounded-md text-sm border-none shadow-sm text-slate-700 bg-slate-50 w-full sm:w-auto focus:ring-2 outline-none"
            />
          </div>
          <div className="flex items-center gap-2 border-t sm:border-t-0 sm:border-l border-slate-200 pt-2 sm:pt-0 sm:pl-3 w-full sm:w-auto">
            <span className="text-sm font-bold text-slate-700">Hasta:</span>
            <input
              type="date"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              className="px-2 py-1 rounded-md text-sm border-none shadow-sm text-slate-700 bg-slate-50 w-full sm:w-auto focus:ring-2 outline-none"
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto flex-1">
          <div className="flex items-center flex-1 bg-white p-2.5 rounded-lg border border-slate-200 shadow-sm relative w-full">
            <Search className="text-slate-400 ml-2 absolute" size={20} />
            <input
              type="text"
              placeholder="Buscar chofer, ruta, unidad..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-10 pr-4 py-1 text-sm text-slate-700 border-none outline-none bg-transparent font-medium"
            />
          </div>

          <div
            className="flex items-center gap-2 w-full sm:w-auto relative"
            ref={menuRef}
          >
            <button
              onClick={() => setMostrarMenuColumnas(!mostrarMenuColumnas)}
              className="flex items-center justify-center p-3 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 transition-colors shadow-sm bg-white"
              title="Configurar columnas de exportación"
            >
              <Settings2 size={20} />
            </button>

            <button
              onClick={handleDescargarExcelReal}
              disabled={viajesMostrados.length === 0}
              className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-bold transition-colors shadow-sm flex-1 sm:flex-auto ${
                viajesMostrados.length === 0
                  ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white"
              }`}
              title="Exportar a Excel"
            >
              <FileSpreadsheet size={18} />
              Excel
            </button>

            <button
              onClick={handleDescargarPDF}
              disabled={isGenerandoPDF || viajesMostrados.length === 0}
              className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-bold transition-colors shadow-sm flex-1 sm:flex-auto ${
                isGenerandoPDF || viajesMostrados.length === 0
                  ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700 text-white"
              }`}
            >
              <FileDown size={18} />
              {isGenerandoPDF ? "..." : "PDF"}
            </button>

            {mostrarMenuColumnas && (
              <div className="absolute top-full right-0 mt-2 w-64 bg-white border border-slate-200 shadow-xl rounded-xl p-4 z-50 animate-in fade-in zoom-in-95">
                <h4 className="text-xs font-bold text-slate-400 uppercase mb-3">
                  Columnas a Exportar
                </h4>
                <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                  {[
                    { id: "fecha", label: "Fecha" },
                    { id: "unidad", label: "Unidad" },
                    { id: "ruta", label: "Ruta" },
                    { id: "embCred", label: "Folio Crédito" },
                    { id: "embCtdo", label: "Folio Contado" },
                    { id: "chofer", label: "Chofer" },
                    { id: "ayudante1", label: "Ayudante 1" },
                    { id: "ayudante2", label: "Ayudante 2" },
                    { id: "kgTotal", label: "Peso (KG)" },
                    { id: "totalMonto", label: "Venta ($)" },
                    { id: "viaticoRuta", label: "Viático ($)" },
                    { id: "comisionChofer", label: "Comisión Chofer" },
                    { id: "comisionAyudante", label: "Total Com. Ayudantes" },
                  ].map((opcion) => (
                    <button
                      key={opcion.id}
                      onClick={() => toggleColumna(opcion.id)}
                      className="flex items-center gap-2 w-full text-left text-sm text-slate-700 hover:bg-slate-50 p-1.5 rounded-md transition-colors"
                    >
                      {columnasPDF[opcion.id] ? (
                        <CheckSquare size={16} className="text-blue-600" />
                      ) : (
                        <Square size={16} className="text-slate-300" />
                      )}
                      <span
                        className={
                          columnasPDF[opcion.id]
                            ? "font-semibold text-slate-900"
                            : ""
                        }
                      >
                        {opcion.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {cargando ? (
        <div className="flex items-center justify-center p-12 text-slate-500 flex-1">
          Cargando base de datos...
        </div>
      ) : viajesMostrados.length === 0 ? (
        <div className="p-12 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 flex flex-col items-center text-center flex-1">
          <AlertCircle className="text-slate-400 mb-3" size={40} />
          <h3 className="text-lg font-semibold text-slate-700">
            No hay coincidencias
          </h3>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm flex-1 custom-scrollbar flex flex-col">
          <table className="w-full min-w-[1600px] text-left border-collapse text-sm bg-white">
            <thead className="sticky top-0 z-10 shadow-sm">
              <tr className="bg-slate-800 text-white tracking-wider text-xs uppercase">
                <th className="px-3 py-3 font-bold text-center w-16 border-r border-slate-700">
                  Acción
                </th>
                <th className="px-3 py-3 font-bold border-r border-slate-700">
                  <Calendar size={14} className="inline mr-1" /> Fecha
                </th>
                <th className="px-3 py-3 font-bold text-center border-r border-slate-700">
                  <Truck size={14} className="inline mr-1" /> Un.
                </th>
                <th className="px-3 py-3 font-bold border-r border-slate-700">
                  <MapPin size={14} className="inline mr-1" /> Ruta
                </th>
                <th className="px-3 py-3 font-bold border-r border-slate-700">
                  <FileText size={14} className="inline mr-1" /> F. Cred
                </th>
                <th className="px-3 py-3 font-bold border-r border-slate-700">
                  <FileText size={14} className="inline mr-1" /> F. Ctdo
                </th>
                <th className="px-3 py-3 font-bold bg-slate-700 border-r border-slate-600">
                  <User size={14} className="inline mr-1" /> Chofer
                </th>
                <th className="px-3 py-3 font-bold bg-slate-700 border-r border-slate-600">
                  <Users size={14} className="inline mr-1" /> Ayudante 1
                </th>
                <th className="px-3 py-3 font-bold bg-slate-700 border-r border-slate-600">
                  <Users size={14} className="inline mr-1" /> Ayudante 2
                </th>
                <th className="px-3 py-3 font-bold text-right bg-blue-900 border-r border-blue-800">
                  <Scale size={14} className="inline mr-1" /> Peso (KG)
                </th>
                <th className="px-3 py-3 font-bold text-right bg-emerald-900 border-r border-emerald-800">
                  <DollarSign size={14} className="inline mr-1" /> Venta
                </th>
                <th className="px-3 py-3 font-bold text-right bg-emerald-800 border-r border-emerald-700">
                  Viático Ruta
                </th>
                <th className="px-3 py-3 font-bold text-right bg-emerald-800 border-r border-emerald-700">
                  Com. Chofer
                </th>
                <th className="px-3 py-3 font-bold text-right bg-emerald-800">
                  Total Com. Ayudantes
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {/* 🚀 USAMOS viajesPaginados EN LUGAR DE viajesMostrados */}
              {viajesPaginados.map((viaje, index) => (
                <tr key={index} className="hover:bg-blue-50 transition-colors">
                  <td className="px-3 py-3 text-center border-r border-slate-100">
                    <button
                      onClick={() => abrirEdicion(viaje)}
                      className="p-1.5 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-lg transition-colors shadow-sm inline-flex items-center justify-center"
                      title="Editar registro"
                    >
                      <Edit2 size={15} />
                    </button>
                  </td>
                  <td className="px-3 py-3 font-semibold text-slate-700 text-xs whitespace-nowrap border-r border-slate-100">
                    {viaje.fecha}
                  </td>
                  <td className="px-3 py-3 text-center border-r border-slate-100">
                    <span className="inline-flex items-center justify-center bg-slate-200 text-slate-800 font-bold px-2 py-1 rounded-md text-xs">
                      {viaje.unidad}
                    </span>
                  </td>
                  <td className="px-3 py-3 font-bold text-slate-700 text-xs uppercase border-r border-slate-100">
                    {viaje.ruta}
                  </td>
                  <td className="px-3 py-3 font-medium text-slate-500 text-[11px] border-r border-slate-100">
                    {viaje.embCred}
                  </td>
                  <td className="px-3 py-3 font-medium text-slate-500 text-[11px] border-r border-slate-100">
                    {viaje.embCtdo}
                  </td>

                  <td className="px-3 py-3 font-bold text-slate-800 text-xs uppercase bg-slate-50 border-r border-slate-100">
                    {viaje.chofer}
                  </td>
                  <td className="px-3 py-3 text-slate-600 text-[11px] uppercase bg-slate-50 border-r border-slate-100">
                    {viaje.ayudante1 !== "-" ? (
                      viaje.ayudante1
                    ) : (
                      <span className="text-slate-300 italic">-</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-slate-600 text-[11px] uppercase bg-slate-50 border-r border-slate-200">
                    {viaje.ayudante2 !== "-" ? (
                      viaje.ayudante2
                    ) : (
                      <span className="text-slate-300 italic">-</span>
                    )}
                  </td>

                  <td className="px-3 py-3 font-bold text-blue-700 text-xs text-right border-r border-slate-100">
                    {fNumero(viaje.kgTotal)}
                  </td>
                  <td className="px-3 py-3 font-bold text-emerald-700 text-xs text-right border-r border-slate-100">
                    {fMoneda(viaje.totalMonto)}
                  </td>
                  <td className="px-3 py-3 font-bold text-slate-700 text-xs text-right border-r border-slate-100">
                    {fMoneda(viaje.viaticoRuta)}
                  </td>
                  <td className="px-3 py-3 font-bold text-emerald-600 text-xs text-right border-r border-slate-100">
                    {fMoneda(viaje.comisionChofer)}
                  </td>
                  <td className="px-3 py-3 font-bold text-emerald-600 text-xs text-right">
                    {fMoneda(
                      (viaje.ayudante1 !== "-" ? viaje.comisionAyudante : 0) +
                        (viaje.ayudante2 !== "-" ? viaje.comisionAyudante : 0),
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            {/* FOOTER DE TOTALES FIJO ABAJO */}
            <tfoot className="sticky bottom-0 bg-slate-800 text-white shadow-inner">
              <tr>
                <td
                  colSpan={9}
                  className="px-4 py-3 font-bold text-right text-xs uppercase border-r border-slate-700"
                >
                  Total Búsqueda ({viajesMostrados.length} Viajes):
                </td>
                <td className="px-3 py-3 font-bold text-right text-xs bg-blue-900 border-r border-blue-800">
                  {fNumero(totales.kg)} KG
                </td>
                <td className="px-3 py-3 font-bold text-right text-xs bg-emerald-900 border-r border-emerald-800">
                  {fMoneda(totales.monto)}
                </td>
                <td className="px-3 py-3 font-bold text-right text-xs bg-emerald-800 border-r border-emerald-700">
                  {fMoneda(totales.viaticos)}
                </td>
                <td className="px-3 py-3 font-bold text-right text-xs bg-emerald-800 border-r border-emerald-700">
                  {fMoneda(totales.comisionChofer)}
                </td>
                <td className="px-3 py-3 font-bold text-right text-xs bg-emerald-800">
                  {fMoneda(totales.comisionAyudante)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* 🚀 CONTROLES DE PAGINACIÓN */}
      {!cargando && totalPaginas > 1 && (
        <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-t border-slate-200 sm:px-6 rounded-b-xl shrink-0">
          <div className="flex items-center w-full justify-between">
            <p className="text-sm text-slate-600 hidden sm:block">
              Mostrando del{" "}
              <span className="font-bold">
                {(paginaActual - 1) * ITEMS_POR_PAGINA + 1}
              </span>{" "}
              al{" "}
              <span className="font-bold">
                {Math.min(
                  paginaActual * ITEMS_POR_PAGINA,
                  viajesMostrados.length,
                )}
              </span>{" "}
              de <span className="font-bold">{viajesMostrados.length}</span>{" "}
              registros
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPaginaActual((prev) => Math.max(prev - 1, 1))}
                disabled={paginaActual === 1}
                className="inline-flex items-center px-3 py-2 border border-slate-300 rounded-md text-sm font-medium bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-colors"
              >
                <ChevronLeft size={16} className="mr-1" /> Anterior
              </button>
              <span className="text-sm font-medium text-slate-600 px-2">
                Página {paginaActual} de {totalPaginas}
              </span>
              <button
                onClick={() =>
                  setPaginaActual((prev) => Math.min(prev + 1, totalPaginas))
                }
                disabled={paginaActual === totalPaginas}
                className="inline-flex items-center px-3 py-2 border border-slate-300 rounded-md text-sm font-medium bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-colors"
              >
                Siguiente <ChevronRight size={16} className="ml-1" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL FLOTANTE DE EDICIÓN CON SELECTS PARA RUTA Y PERSONAL */}
      {modalAbierto && viajeEditando && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95">
            <div className="bg-slate-800 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit2 size={20} className="text-blue-400" />
                <h3 className="text-lg font-bold">
                  Editar Salida - Unidad {viajeEditando.unidad} (
                  {viajeEditando.fecha})
                </h3>
              </div>
              <button
                onClick={() => setModalAbierto(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X size={22} />
              </button>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[75vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Ruta Asignada
                </label>
                <select
                  value={viajeEditando.ruta}
                  onChange={(e) =>
                    setViajeEditando({ ...viajeEditando, ruta: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold uppercase outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">-- SELECCIONAR RUTA --</option>
                  {listasPersonal.rutas.map((r, i) => (
                    <option key={i} value={r}>
                      {r}
                    </option>
                  ))}
                  {viajeEditando.ruta &&
                    !listasPersonal.rutas.includes(viajeEditando.ruta) && (
                      <option value={viajeEditando.ruta}>
                        {viajeEditando.ruta}
                      </option>
                    )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Chofer
                </label>
                <select
                  value={viajeEditando.chofer}
                  onChange={(e) =>
                    setViajeEditando({
                      ...viajeEditando,
                      chofer: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold uppercase outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">-- SELECCIONAR CHOFER --</option>
                  {listasPersonal.choferes.map((c, i) => (
                    <option key={i} value={c}>
                      {c}
                    </option>
                  ))}
                  {viajeEditando.chofer &&
                    !listasPersonal.choferes.includes(viajeEditando.chofer) && (
                      <option value={viajeEditando.chofer}>
                        {viajeEditando.chofer}
                      </option>
                    )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Ayudante 1
                </label>
                <select
                  value={
                    viajeEditando.ayudante1 === "-"
                      ? ""
                      : viajeEditando.ayudante1
                  }
                  onChange={(e) =>
                    setViajeEditando({
                      ...viajeEditando,
                      ayudante1: e.target.value || "-",
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold uppercase outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">-- SIN AYUDANTE --</option>
                  {listasPersonal.ayudantes.map((a, i) => (
                    <option key={i} value={a}>
                      {a}
                    </option>
                  ))}
                  {viajeEditando.ayudante1 !== "-" &&
                    !listasPersonal.ayudantes.includes(
                      viajeEditando.ayudante1,
                    ) && (
                      <option value={viajeEditando.ayudante1}>
                        {viajeEditando.ayudante1}
                      </option>
                    )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Ayudante 2
                </label>
                <select
                  value={
                    viajeEditando.ayudante2 === "-"
                      ? ""
                      : viajeEditando.ayudante2
                  }
                  onChange={(e) =>
                    setViajeEditando({
                      ...viajeEditando,
                      ayudante2: e.target.value || "-",
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold uppercase outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">-- SIN AYUDANTE --</option>
                  {listasPersonal.ayudantes.map((a, i) => (
                    <option key={i} value={a}>
                      {a}
                    </option>
                  ))}
                  {viajeEditando.ayudante2 !== "-" &&
                    !listasPersonal.ayudantes.includes(
                      viajeEditando.ayudante2,
                    ) && (
                      <option value={viajeEditando.ayudante2}>
                        {viajeEditando.ayudante2}
                      </option>
                    )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Folio Crédito
                </label>
                <input
                  type="text"
                  value={viajeEditando.embCred}
                  onChange={(e) =>
                    setViajeEditando({
                      ...viajeEditando,
                      embCred: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Folio Contado
                </label>
                <input
                  type="text"
                  value={viajeEditando.embCtdo}
                  onChange={(e) =>
                    setViajeEditando({
                      ...viajeEditando,
                      embCtdo: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Monto Total Venta ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={viajeEditando.totalMonto}
                  onChange={(e) =>
                    setViajeEditando({
                      ...viajeEditando,
                      totalMonto: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold text-emerald-700 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Peso Total (KG)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={viajeEditando.kgTotal}
                  onChange={(e) =>
                    setViajeEditando({
                      ...viajeEditando,
                      kgTotal: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold text-blue-700 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                onClick={() => setModalAbierto(false)}
                className="px-4 py-2 bg-white border border-slate-300 text-slate-700 font-bold rounded-lg text-sm hover:bg-slate-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={guardarEdicionTripulacion}
                disabled={guardandoCambios}
                className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-sm transition-colors shadow-sm disabled:opacity-50"
              >
                <Save size={18} />
                {guardandoCambios ? "Guardando..." : "Guardar Cambios"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
