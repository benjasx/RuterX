import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Calendar,
  Save,
  Plus,
  Trash2,
  Loader2,
  FileSpreadsheet,
  Download,
  FileText,
  Link2,
  CheckCircle2,
  Table,
  Camera,
  X,
  MapPin,
  Layers,
  ClipboardList,
} from "lucide-react";
import * as XLSX from "xlsx";
import { getAuth } from "firebase/auth";
import {
  guardarDistribucionFecha,
  suscribirDistribucionFecha,
} from "../firebase/distribucionService";
import { obtenerChoferesFirebase } from "../firebase/choferesService";
import {
  obtenerAjustesNomina,
  type AjustesNomina,
} from "../firebase/ajustesNominaService";
import { LISTA_UNIDADES, LISTA_RUTAS } from "../utils/mapaUtils";
import {
  exportarDistribucionPDF,
  exportarHojaRutaPDF,
  exportarHojaMesaninePDF,
  exportarBitacoraPDF,
} from "../utils/reportesDistribucionUtils";

const calcularFinanzas = (
  rutaRaw: string,
  montoBase: number,
  reglas: AjustesNomina | null,
) => {
  if (!reglas)
    return { viaticoRuta: 0, comisionChofer: 0, comisionAyudante: 0 };

  let viaticoEncontrado = 0;
  let rutaNormalizada = "";

  if (rutaRaw) {
    rutaNormalizada = rutaRaw
      .toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
    for (const [rutaCatalogo, montoViatico] of Object.entries(
      reglas.viaticosRutas,
    )) {
      const catNorm = rutaCatalogo
        .toUpperCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
      if (
        rutaNormalizada.includes(catNorm) ||
        catNorm.includes(rutaNormalizada)
      ) {
        viaticoEncontrado = montoViatico;
        break;
      }
    }
  }

  const esTLMK = rutaNormalizada === "TLMK" || rutaNormalizada === "TLMK 2";
  const porcentajeTLMK =
    reglas.comisionTLMK !== undefined ? reglas.comisionTLMK : 0.001;
  const porcentajeChofer = esTLMK ? porcentajeTLMK : reglas.comisionChofer;
  const porcentajeAyudante = esTLMK ? 0 : reglas.comisionAyudante;

  return {
    viaticoRuta: viaticoEncontrado,
    comisionChofer: montoBase * porcentajeChofer,
    comisionAyudante: montoBase * porcentajeAyudante,
  };
};

const FilaVacia = {
  ruta: "",
  unidad: "",
  chofer: "",
  auxiliar1: "",
  auxiliar2: "",
  embarqueCredito: "",
  embarqueContado: "",
  totalMontoCredito: 0,
  totalMontoContado: 0,
  totalkgCredito: 0,
  totalkgContado: 0,
  cajasCredito: 0,
  cajasContado: 0,
  volCredito: 0,
  volContado: 0,
  vinculadoBMS: false,
};

const formatearFechaLarga = (fechaStr: string) => {
  if (!fechaStr) return "";
  const [y, m, d] = fechaStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const esFolioReal = (val: string) => {
  if (!val) return false;
  const str = val.toUpperCase().trim();
  return str !== "" && str !== "FOLIO" && str !== "TRASPASO" && str !== "0";
};

export default function PanelDistribucion() {
  const hoyStr = new Date().toLocaleDateString("sv-SE");

  // 🚀 LÓGICA DE PERMISOS ACTUALIZADA
  const auth = getAuth();
  const correoActual = auth.currentUser?.email;
  const esAdmin = correoActual === "admin@ruterx.com";
  const esEmbarques =
    correoActual === "emb01@ruterx.com" || correoActual === "emb02@ruterx.com";

  // Agrupamos los permisos para que ambos (Admin y Embarques) puedan ver los botones
  const tienePermisosEspeciales = esAdmin || esEmbarques;

  const [fechaSeleccionada, setFechaSeleccionada] = useState(() => {
    return localStorage.getItem("distribucion_fecha_guardada") || hoyStr;
  });

  useEffect(() => {
    localStorage.setItem("distribucion_fecha_guardada", fechaSeleccionada);
  }, [fechaSeleccionada]);

  const [filas, setFilas] = useState<any[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [mostrarResumen, setMostrarResumen] = useState(false);

  const [mostrarCaptura, setMostrarCaptura] = useState(false);

  const { data: choferesData = [], isLoading: cargandoChoferes } = useQuery({
    queryKey: ["choferes"],
    queryFn: obtenerChoferesFirebase,
  });

  const { data: reglasNomina } = useQuery({
    queryKey: ["ajustes_nomina"],
    queryFn: obtenerAjustesNomina,
  });

  useEffect(() => {
    const cancelarSuscripcion = suscribirDistribucionFecha(
      fechaSeleccionada,
      (datosActualizados) => {
        if (datosActualizados.length > 0) {
          setFilas(datosActualizados);
        } else {
          setFilas([{ ...FilaVacia, id: Date.now() }]);
        }
      },
    );
    return () => cancelarSuscripcion();
  }, [fechaSeleccionada]);

  const { listaChoferes, listaAuxiliares } = useMemo(() => {
    const choferes: string[] = [];
    const todos: string[] = [];

    choferesData.forEach((c: any) => {
      const nombre = (c.nombre || "").toUpperCase();
      const rol = (c.rol || c.puesto || c.tipo || "").toLowerCase();

      if (nombre) {
        todos.push(nombre);
        if (!rol.includes("ayudante") && !rol.includes("auxiliar")) {
          choferes.push(nombre);
        }
      }
    });

    return {
      listaChoferes: choferes.length > 0 ? choferes.sort() : todos.sort(),
      listaAuxiliares: todos.sort(),
    };
  }, [choferesData]);

  const { unidadesUsadas, choferesUsados, auxiliaresUsados } = useMemo(() => {
    const unidades = new Set<string>();
    const choferes = new Set<string>();
    const auxiliares = new Set<string>();

    filas.forEach((f) => {
      if (f.unidad) unidades.add(f.unidad);
      if (f.chofer) choferes.add(f.chofer);
      if (f.auxiliar1 && f.auxiliar1.trim() !== "") auxiliares.add(f.auxiliar1);
      if (f.auxiliar2 && f.auxiliar2.trim() !== "") auxiliares.add(f.auxiliar2);
    });

    return {
      unidadesUsadas: unidades,
      choferesUsados: choferes,
      auxiliaresUsados: auxiliares,
    };
  }, [filas]);

  const filasResumen = filas.filter((f) => f.ruta || f.chofer || f.unidad);
  const sumaKgTotal = filasResumen.reduce(
    (acc, f) => acc + (f.totalkgCredito || 0) + (f.totalkgContado || 0),
    0,
  );
  const sumaVentaTotal = filasResumen.reduce(
    (acc, f) => acc + (f.totalMontoCredito || 0) + (f.totalMontoContado || 0),
    0,
  );
  const conteoEmbCred = filasResumen.filter((f) =>
    esFolioReal(f.embarqueCredito),
  ).length;
  const conteoEmbCtdo = filasResumen.filter((f) =>
    esFolioReal(f.embarqueContado),
  ).length;

  const actualizarCelda = (index: number, campo: string, valor: string) => {
    const nuevasFilas = [...filas];
    nuevasFilas[index] = {
      ...nuevasFilas[index],
      [campo]:
        campo === "embarqueCredito" || campo === "embarqueContado"
          ? valor.toUpperCase()
          : valor,
      vinculadoBMS:
        campo === "embarqueCredito" || campo === "embarqueContado"
          ? false
          : nuevasFilas[index].vinculadoBMS,
    };
    setFilas(nuevasFilas);
  };

  const agregarFila = () =>
    setFilas([{ ...FilaVacia, id: Date.now() }, ...filas]);

  const eliminarFila = (index: number) => {
    if (filas.length === 1) return alert("Debe quedar al menos una fila.");
    setFilas(filas.filter((_, i) => i !== index));
  };

  const handleVincularBMS = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await file.arrayBuffer();
      const worksheet = XLSX.read(data).Sheets[XLSX.read(data).SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json<any>(worksheet, { range: 5 });

      const diccionarioFolios = new Map<string, any>();
      jsonData.forEach((row) => {
        const folioStr = String(row.folio || row.Folio || "")
          .toUpperCase()
          .trim();
        if (folioStr) {
          diccionarioFolios.set(folioStr, {
            total: parseFloat(
              String(row.total || row.Total || 0).replace(/,/g, ""),
            ),
            peso: parseFloat(
              String(row.peso || row.Peso || 0).replace(/,/g, ""),
            ),
            cajas: parseFloat(
              String(row.cajas || row.Cajas || 0).replace(/,/g, ""),
            ),
            volumen: parseFloat(
              String(row.volumen || row.Volumen || 0).replace(/,/g, ""),
            ),
          });
        }
      });

      let vinculados = 0;
      const filasActualizadas = filas.map((f) => {
        const embCredStr = (f.embarqueCredito || "").trim().toUpperCase();
        const embCtdoStr = (f.embarqueContado || "").trim().toUpperCase();
        const matchCred = diccionarioFolios.get(embCredStr);
        const matchCtdo = diccionarioFolios.get(embCtdoStr);

        if (matchCred || matchCtdo) vinculados++;

        return {
          ...f,
          totalMontoCredito: matchCred
            ? matchCred.total
            : f.totalMontoCredito || 0,
          totalkgCredito: matchCred ? matchCred.peso : f.totalkgCredito || 0,
          cajasCredito: matchCred ? matchCred.cajas : f.cajasCredito || 0,
          volCredito: matchCred ? matchCred.volumen : f.volCredito || 0,
          totalMontoContado: matchCtdo
            ? matchCtdo.total
            : f.totalMontoContado || 0,
          totalkgContado: matchCtdo ? matchCtdo.peso : f.totalkgContado || 0,
          cajasContado: matchCtdo ? matchCtdo.cajas : f.cajasContado || 0,
          volContado: matchCtdo ? matchCtdo.volumen : f.volContado || 0,
          vinculadoBMS: !!(matchCred || matchCtdo),
        };
      });

      setFilas(filasActualizadas);
      alert(
        `¡Vinculación Exitosa! Se extrajo información financiera para ${vinculados} rutas.`,
      );
    } catch (error) {
      alert(
        "Error al leer Excel. Asegúrate de subir el archivo original del BMS.",
      );
    }
    e.target.value = "";
  };

  const handleGuardar = async () => {
    for (let i = 0; i < filas.length; i++) {
      const f = filas[i];
      if (f.ruta || f.unidad || f.chofer) {
        if (!f.embarqueCredito.trim() && !f.embarqueContado.trim()) {
          alert(
            `⚠️ LA FILA ${i + 1} TIENE DATOS PERO FALTA UN FOLIO DE EMBARQUE.`,
          );
          return;
        }
      }
    }

    const filasOrdenadas = [...filas].sort((a, b) => {
      const unidadA = parseInt(a.unidad) || 999;
      const unidadB = parseInt(b.unidad) || 999;
      return unidadA - unidadB;
    });

    setGuardando(true);
    try {
      const datosCompletos = filasOrdenadas.map((f) => {
        const sumaMonto =
          (f.totalMontoCredito || 0) + (f.totalMontoContado || 0);
        const calculos = calcularFinanzas(
          f.ruta,
          sumaMonto,
          reglasNomina || null,
        );

        return {
          ...f,
          id: f.id || Date.now(),
          auxiliar1: f.auxiliar1 || "",
          auxiliar2: f.auxiliar2 || "",
          viaticoRuta: calculos.viaticoRuta,
          comisionChofer: calculos.comisionChofer,
          comisionAyudante: calculos.comisionAyudante,
          totalSumaDinero: sumaMonto,
          totalSumaKilos: (f.totalkgCredito || 0) + (f.totalkgContado || 0),
        };
      });

      await guardarDistribucionFecha(fechaSeleccionada, datosCompletos);
      setFilas(filasOrdenadas);
      alert("¡GUARDADO Y ORDENADO EXITOSAMENTE!");
    } catch (error) {
      alert("ERROR AL GUARDAR. Verifica tu conexión a internet.");
    } finally {
      setGuardando(false);
    }
  };

  const exportarExcel = () => {
    let csvContent =
      "data:text/csv;charset=utf-8,RUTA,UNIDAD,CHOFER,AUXILIAR 1,AUXILIAR 2,EMB. CREDITO,EMB. CONTADO,TOTAL MONTO,TOTAL KG,CAJAS,VOLUMEN\r\n";
    filas.forEach((f) => {
      const totalMonto =
        (f.totalMontoCredito || 0) + (f.totalMontoContado || 0);
      const totalKg = (f.totalkgCredito || 0) + (f.totalkgContado || 0);
      const totalCajas = (f.cajasCredito || 0) + (f.cajasContado || 0);
      const totalVolumen = (f.volCredito || 0) + (f.volContado || 0);

      csvContent += `"${f.ruta}","${f.unidad}","${f.chofer}","${f.auxiliar1}","${f.auxiliar2}","${f.embarqueCredito}","${f.embarqueContado}",${totalMonto},${totalKg},${totalCajas},${totalVolumen}\r\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `DISTRIBUCION_INTEGRAL_${fechaSeleccionada}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportarResumenExcel = () => {
    const dataAExportar = filasResumen.map((f) => {
      const tMonto = (f.totalMontoCredito || 0) + (f.totalMontoContado || 0);
      const tKg = (f.totalkgCredito || 0) + (f.totalkgContado || 0);
      return {
        Ruta: f.ruta,
        Unidad: f.unidad,
        Chofer: f.chofer,
        EmbCred: f.embarqueCredito || "0",
        EmbCtdo: f.embarqueContado || "0",
        Total: tMonto,
        "KG Total": tKg,
      };
    });

    dataAExportar.push({
      Ruta: "TOTALES",
      Unidad: "",
      Chofer: "",
      EmbCred: conteoEmbCred.toString(),
      EmbCtdo: conteoEmbCtdo.toString(),
      Total: sumaVentaTotal,
      "KG Total": sumaKgTotal,
    });

    const worksheet = XLSX.utils.json_to_sheet(dataAExportar);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Resumen Salidas");
    XLSX.writeFile(workbook, `RESUMEN_SALIDAS_${fechaSeleccionada}.xlsx`);
  };

  if (cargandoChoferes) {
    return (
      <div className="flex w-full h-125 items-center justify-center">
        <Loader2 className="animate-spin text-blue-600 dark:text-blue-400" size={40} />
      </div>
    );
  }

  const formatoMoneda = (num: number) =>
    new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(num);

  return (
    <div className="w-full bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 min-h-[calc(100vh-120px)] uppercase flex flex-col relative">
      {/* MODAL PARA CAPTURA DE WHATSAPP */}
      {mostrarCaptura && (
        <div className="fixed inset-0 z-99 bg-slate-900/90 flex items-start justify-center p-4 overflow-y-auto backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-[95vw] xl:max-w-375 w-full flex flex-col relative mb-10 mt-4">
            <div className="bg-slate-100 dark:bg-slate-700 p-4 border-b border-slate-300 dark:border-slate-600 flex justify-between items-center rounded-t-2xl">
              <div>
                <h3 className="font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <Camera className="text-purple-600 dark:text-purple-400" size={20} /> Vista para
                  WhatsApp
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium normal-case mt-1">
                  Haz una captura de pantalla a la tabla de abajo y compártela.
                </p>
              </div>
              <button
                onClick={() => setMostrarCaptura(false)}
                className="bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors"
              >
                <X size={16} /> Cerrar
              </button>
            </div>

            {/* ÁREA LIMPIA PARA TOMAR LA CAPTURA */}
            <div className="p-8 bg-white dark:bg-slate-800 overflow-x-auto rounded-b-2xl">
              <div className="min-w-max w-full">
                <div className="relative flex items-center justify-center mb-6">
                  <div className="absolute left-0">
                    <img
                      src="/CIRLogo.png"
                      alt="Logo CIR"
                      className="h-16 object-contain"
                    />
                  </div>
                  <div className="text-center">
                    <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">
                      ASIGNACIÓN DE RUTAS
                    </h2>
                    <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase mt-1">
                      FECHA PROGRAMADA DE SALIDA:{" "}
                      {formatearFechaLarga(fechaSeleccionada)}
                    </p>
                  </div>
                </div>

                <table className="w-full text-left border-collapse border-2 border-slate-800">
                  <thead>
                    <tr className="bg-slate-800 text-white text-xs uppercase tracking-wider">
                      <th className="p-3 border border-slate-700 text-center w-16">
                        Unid
                      </th>
                      <th className="p-3 border border-slate-700">Ruta</th>
                      <th className="p-3 border border-slate-700">Chofer</th>
                      <th className="p-3 border border-slate-700">
                        Auxiliar 1
                      </th>
                      <th className="p-3 border border-slate-700">
                        Auxiliar 2
                      </th>
                      <th className="p-3 border border-slate-700 text-center">
                        Emb. Crédito
                      </th>
                      <th className="p-3 border border-slate-700 text-center">
                        Emb. Contado
                      </th>
                    </tr>
                  </thead>
                  <tbody className="text-[12px] font-bold text-slate-700 dark:text-slate-200">
                    {[...filasResumen]
                      .sort(
                        (a, b) =>
                          (parseInt(a.unidad) || 999) -
                          (parseInt(b.unidad) || 999),
                      )
                      .map((f, i) => (
                        <tr
                          key={i}
                          className={i % 2 === 0 ? "bg-white dark:bg-slate-800" : "bg-slate-50 dark:bg-slate-900"}
                        >
                          <td className="p-3 border border-slate-300 dark:border-slate-600 text-center font-black text-blue-700 dark:text-blue-300 text-sm">
                            {f.unidad || "-"}
                          </td>
                          <td className="p-3 border border-slate-300 dark:border-slate-600 whitespace-nowrap">
                            {f.ruta || "-"}
                          </td>
                          <td className="p-3 border border-slate-300 dark:border-slate-600 uppercase text-slate-800 dark:text-slate-100 whitespace-nowrap">
                            {f.chofer || "-"}
                          </td>
                          <td className="p-3 border border-slate-300 dark:border-slate-600 uppercase whitespace-nowrap">
                            {f.auxiliar1 || "-"}
                          </td>
                          <td className="p-3 border border-slate-300 dark:border-slate-600 uppercase whitespace-nowrap">
                            {f.auxiliar2 || "-"}
                          </td>
                          <td className="p-3 border border-slate-300 dark:border-slate-600 text-center font-mono font-bold tracking-wider min-w-30 whitespace-nowrap">
                            {f.embarqueCredito || "-"}
                          </td>
                          <td className="p-3 border border-slate-300 dark:border-slate-600 text-center font-mono font-bold tracking-wider min-w-30 whitespace-nowrap">
                            {f.embarqueContado || "-"}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 pb-4 border-b border-slate-100 dark:border-slate-700">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-3">
            <FileSpreadsheet className="text-blue-600 dark:text-blue-400" size={28} />
            Tabla de Distribución Diaria
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium mt-1 normal-case">
            Llenado manual logístico y extracción financiera automática del BMS.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
          <Calendar size={20} className="text-slate-500 dark:text-slate-400" />
          <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase">
            Fecha de Salida:
          </span>
          <input
            type="date"
            value={fechaSeleccionada}
            onChange={(e) => setFechaSeleccionada(e.target.value)}
            className="border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-1.5 bg-white dark:bg-slate-800 font-bold text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          />
        </div>
      </div>

      <div className="flex flex-col xl:flex-row justify-between items-center gap-4 mb-4 bg-slate-50 dark:bg-slate-900 p-2 rounded-xl border border-slate-100 dark:border-slate-700">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={agregarFila}
            className="flex items-center gap-2 bg-blue-100 dark:bg-blue-900/40 hover:bg-blue-200 text-blue-800 dark:text-blue-300 font-bold px-4 py-2.5 rounded-xl transition-colors text-xs border border-blue-200 dark:border-blue-800"
          >
            <Plus size={16} /> Añadir Ruta
          </button>

          {/* 🚀 EL BOTÓN "VINCULAR XLSX" AHORA ES VISIBLE PARA EMBARQUES Y ADMIN */}
          {tienePermisosEspeciales && (
            <label className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2.5 rounded-xl transition-colors cursor-pointer text-xs shadow-md shadow-indigo-600/20">
              <Link2 size={16} /> Vincular XLSX
              <input
                type="file"
                accept=".xlsx"
                onChange={handleVincularBMS}
                className="hidden"
              />
            </label>
          )}

          {/* 🚀 EL BOTÓN "GENERAR RESUMEN" AHORA ES VISIBLE PARA EMBARQUES Y ADMIN */}
          {tienePermisosEspeciales && (
            <button
              onClick={() => setMostrarResumen(!mostrarResumen)}
              className={`flex items-center gap-2 font-bold px-4 py-2.5 rounded-xl transition-colors text-xs shadow-md ${mostrarResumen ? "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200" : "bg-slate-900 hover:bg-slate-800 text-white shadow-slate-900/20"}`}
            >
              <Table size={16} />{" "}
              {mostrarResumen ? "Ocultar Resumen" : "Generar Resumen"}
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 w-full xl:w-auto">
          <button
            onClick={() => setMostrarCaptura(true)}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-bold px-4 py-2.5 rounded-xl transition-colors shadow-md shadow-purple-600/20 text-xs"
          >
            <Camera size={16} /> Vista WhatsApp
          </button>

          <button
            onClick={exportarExcel}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-xl transition-colors shadow-md shadow-emerald-600/20 text-xs"
          >
            <Download size={16} /> EXCEL Gral
          </button>

          <button
            onClick={() => exportarDistribucionPDF(filas, fechaSeleccionada)}
            className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white font-bold px-4 py-2.5 rounded-xl transition-colors shadow-md shadow-rose-600/20 text-xs"
          >
            <FileText size={16} /> PDF Gral
          </button>

          <button
            onClick={handleGuardar}
            disabled={guardando}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-black px-6 py-2.5 rounded-xl transition-colors shadow-md shadow-blue-600/30 text-xs tracking-wider"
          >
            {guardando ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Save size={16} />
            )}
            {guardando ? "GUARDANDO..." : "GUARDAR TODO"}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm mb-6 pb-4 flex-1">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-800 text-white text-xs uppercase tracking-wider">
              <th className="p-3 border-r border-slate-700 w-44">Ruta</th>
              <th className="p-3 border-r border-slate-700 w-36">Unidad</th>
              <th className="p-3 border-r border-slate-700 w-56">Chofer</th>
              <th className="p-3 border-r border-slate-700 w-52">Auxiliar 1</th>
              <th className="p-3 border-r border-slate-700 w-52">Auxiliar 2</th>
              <th className="p-3 border-r border-slate-700 w-32 text-center">
                Emb. Crédito
              </th>
              <th className="p-3 border-r border-slate-700 w-32 text-center">
                Emb. Contado
              </th>
              <th className="p-3 text-center w-16">Act</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-sm">
            {filas.map((fila, index) => (
              <tr
                key={fila.id || index}
                className={`transition-colors ${fila.vinculadoBMS ? "bg-emerald-50/50" : "hover:bg-slate-50 dark:hover:bg-slate-900"}`}
              >
                <td className="p-2 border-r border-slate-200 dark:border-slate-700">
                  <select
                    value={fila.ruta}
                    onChange={(e) =>
                      actualizarCelda(index, "ruta", e.target.value)
                    }
                    className="w-full p-2 bg-transparent border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 font-semibold cursor-pointer uppercase text-xs"
                  >
                    <option value="">-- RUTA --</option>
                    {LISTA_RUTAS.map((rutaNombre, i) => (
                      <option key={i} value={rutaNombre.toUpperCase()}>
                        {rutaNombre.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="p-2 border-r border-slate-200 dark:border-slate-700">
                  <select
                    value={fila.unidad}
                    onChange={(e) =>
                      actualizarCelda(index, "unidad", e.target.value)
                    }
                    className="w-full p-2 bg-transparent border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 font-bold text-blue-600 dark:text-blue-400 cursor-pointer text-xs"
                  >
                    <option value="">-- UNID --</option>
                    {LISTA_UNIDADES.map((u) => {
                      const estaOcupada =
                        unidadesUsadas.has(u) && fila.unidad !== u;
                      return (
                        <option key={u} value={u} disabled={estaOcupada}>
                          {u} {estaOcupada ? "(OC)" : ""}
                        </option>
                      );
                    })}
                  </select>
                </td>
                <td className="p-2 border-r border-slate-200 dark:border-slate-700">
                  <select
                    value={fila.chofer}
                    onChange={(e) =>
                      actualizarCelda(index, "chofer", e.target.value)
                    }
                    className="w-full p-2 bg-transparent border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer text-xs uppercase"
                  >
                    <option value="">-- CHOFER --</option>
                    {listaChoferes.map((nombreChofer: string, i: number) => {
                      const estaOcupado =
                        (choferesUsados.has(nombreChofer) ||
                          auxiliaresUsados.has(nombreChofer)) &&
                        fila.chofer !== nombreChofer;
                      return (
                        <option
                          key={i}
                          value={nombreChofer}
                          disabled={estaOcupado}
                        >
                          {nombreChofer} {estaOcupado ? "(RUTA)" : ""}
                        </option>
                      );
                    })}
                  </select>
                </td>
                <td className="p-2 border-r border-slate-200 dark:border-slate-700">
                  <select
                    value={fila.auxiliar1}
                    onChange={(e) =>
                      actualizarCelda(index, "auxiliar1", e.target.value)
                    }
                    className="w-full p-2 bg-transparent border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer text-[11px] uppercase"
                  >
                    <option value=""></option>
                    {listaAuxiliares.map((nombreAux: string, i: number) => {
                      const estaOcupado =
                        (choferesUsados.has(nombreAux) ||
                          auxiliaresUsados.has(nombreAux)) &&
                        fila.auxiliar1 !== nombreAux;
                      return (
                        <option
                          key={i}
                          value={nombreAux}
                          disabled={estaOcupado}
                        >
                          {nombreAux}
                        </option>
                      );
                    })}
                  </select>
                </td>
                <td className="p-2 border-r border-slate-200 dark:border-slate-700">
                  <select
                    value={fila.auxiliar2}
                    onChange={(e) =>
                      actualizarCelda(index, "auxiliar2", e.target.value)
                    }
                    className="w-full p-2 bg-transparent border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer text-[11px] uppercase"
                  >
                    <option value=""></option>
                    {listaAuxiliares.map((nombreAux: string, i: number) => {
                      const estaOcupado =
                        (choferesUsados.has(nombreAux) ||
                          auxiliaresUsados.has(nombreAux)) &&
                        fila.auxiliar2 !== nombreAux;
                      return (
                        <option
                          key={i}
                          value={nombreAux}
                          disabled={estaOcupado}
                        >
                          {nombreAux}
                        </option>
                      );
                    })}
                  </select>
                </td>

                <td className="p-2 border-r border-slate-200 dark:border-slate-700 relative pb-4">
                  <input
                    type="text"
                    value={fila.embarqueCredito}
                    onChange={(e) =>
                      actualizarCelda(index, "embarqueCredito", e.target.value)
                    }
                    placeholder="FOLIO"
                    className="w-full p-2 bg-transparent border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 font-mono text-center uppercase text-xs"
                  />
                  {(fila.totalMontoCredito > 0 || fila.totalkgCredito > 0) && (
                    <div
                      className="absolute -bottom-2 right-1 flex items-center gap-1"
                      title={`Cajas: ${fila.cajasCredito}`}
                    >
                      <span className="text-[9px] font-bold text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/40 px-1 rounded shadow-sm border border-blue-200 dark:border-blue-800">
                        {new Intl.NumberFormat("es-MX", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        }).format(fila.totalkgCredito)}{" "}
                        KG
                      </span>
                      <span className="text-[9px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/40 px-1 rounded shadow-sm border border-emerald-200 dark:border-emerald-800">
                        {formatoMoneda(fila.totalMontoCredito)}
                      </span>
                    </div>
                  )}
                </td>

                <td className="p-2 border-r border-slate-200 dark:border-slate-700 relative pb-4">
                  <input
                    type="text"
                    value={fila.embarqueContado}
                    onChange={(e) =>
                      actualizarCelda(index, "embarqueContado", e.target.value)
                    }
                    placeholder="FOLIO"
                    className="w-full p-2 bg-transparent border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 font-mono text-center uppercase text-xs"
                  />
                  {(fila.totalMontoContado > 0 || fila.totalkgContado > 0) && (
                    <div
                      className="absolute -bottom-2 right-1 flex items-center gap-1"
                      title={`Cajas: ${fila.cajasContado}`}
                    >
                      <span className="text-[9px] font-bold text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/40 px-1 rounded shadow-sm border border-blue-200 dark:border-blue-800">
                        {new Intl.NumberFormat("es-MX", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        }).format(fila.totalkgContado)}{" "}
                        KG
                      </span>
                      <span className="text-[9px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/40 px-1 rounded shadow-sm border border-emerald-200 dark:border-emerald-800">
                        {formatoMoneda(fila.totalMontoContado)}
                      </span>
                    </div>
                  )}
                </td>

                <td className="p-2 text-center flex items-center justify-center gap-1">
                  {fila.vinculadoBMS && (
                    <span title="Datos financieros agregados correctamente">
                      <CheckCircle2 size={16} className="text-emerald-500" />
                    </span>
                  )}
                  <button
                    onClick={() =>
                      exportarHojaRutaPDF(fila, fechaSeleccionada)
                    }
                    className="text-blue-500 hover:text-blue-700 dark:hover:text-blue-300 p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-950/40"
                    title="Imprimir hoja de ruta (unidad)"
                  >
                    <MapPin size={16} />
                  </button>
                  <button
                    onClick={() =>
                      exportarHojaMesaninePDF(fila, fechaSeleccionada)
                    }
                    className="text-amber-500 hover:text-amber-700 dark:hover:text-amber-300 p-1 rounded hover:bg-amber-50 dark:hover:bg-amber-950/40"
                    title="Imprimir hoja de mesanine"
                  >
                    <Layers size={16} />
                  </button>
                  <button
                    onClick={() =>
                      exportarBitacoraPDF(fila, fechaSeleccionada)
                    }
                    className="text-teal-600 hover:text-teal-800 dark:hover:text-teal-300 p-1 rounded hover:bg-teal-50 dark:hover:bg-teal-950/40"
                    title="Imprimir bitácora de facturas y cargas"
                  >
                    <ClipboardList size={16} />
                  </button>
                  {/* 🚀 EL BOTÓN ELIMINAR AHORA TAMBIÉN ES VISIBLE PARA EMBARQUES */}
                  {tienePermisosEspeciales && (
                    <button
                      onClick={() => eliminarFila(index)}
                      className="text-red-500 hover:text-red-700 dark:hover:text-red-300 p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/40"
                      title="Eliminar"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 🚀 EL RESUMEN EJECUTIVO AHORA TAMBIÉN ES VISIBLE PARA EMBARQUES */}
      {tienePermisosEspeciales && mostrarResumen && (
        <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-xl bg-white dark:bg-slate-800 animate-in fade-in slide-in-from-top-4 mt-2">
          <div className="bg-slate-900 text-white font-bold p-4 text-sm flex justify-between items-center px-6">
            <span className="tracking-wide">
              SALIDA: {formatearFechaLarga(fechaSeleccionada).toUpperCase()}
            </span>
            <div className="flex gap-2">
              <button
                onClick={exportarResumenExcel}
                className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 border border-slate-700 shadow-sm"
              >
                <Download size={14} /> XLS
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 font-bold uppercase tracking-wider">
                  <th className="p-3.5 border-r border-slate-200 dark:border-slate-700">Ruta</th>
                  <th className="p-3.5 border-r border-slate-200 dark:border-slate-700">Unidad</th>
                  <th className="p-3.5 border-r border-slate-200 dark:border-slate-700">Chofer</th>
                  <th className="p-3.5 border-r border-slate-200 dark:border-slate-700 text-center">
                    EmbCred
                  </th>
                  <th className="p-3.5 border-r border-slate-200 dark:border-slate-700 text-center">
                    EmbCtdo
                  </th>
                  <th className="p-3.5 border-r border-slate-200 dark:border-slate-700 text-right">
                    Total
                  </th>
                  <th className="p-3.5 text-right">KG Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {filasResumen.map((f, i) => {
                  const tMonto =
                    (f.totalMontoCredito || 0) + (f.totalMontoContado || 0);
                  const tKg = (f.totalkgCredito || 0) + (f.totalkgContado || 0);
                  return (
                    <tr
                      key={i}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="p-3 border-r border-slate-100 dark:border-slate-700 font-semibold text-slate-800 dark:text-slate-100">
                        {f.ruta || "-"}
                      </td>
                      <td className="p-3 border-r border-slate-100 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-medium">
                        {f.unidad || "-"}
                      </td>
                      <td className="p-3 border-r border-slate-100 dark:border-slate-700 text-slate-700 dark:text-slate-200 uppercase font-medium">
                        {f.chofer || "-"}
                      </td>
                      <td className="p-3 border-r border-slate-100 dark:border-slate-700 text-center text-slate-600 dark:text-slate-300 font-mono">
                        {f.embarqueCredito || "0"}
                      </td>
                      <td className="p-3 border-r border-slate-100 dark:border-slate-700 text-center text-slate-600 dark:text-slate-300 font-mono">
                        {f.embarqueContado || "0"}
                      </td>
                      <td className="p-3 border-r border-slate-100 dark:border-slate-700 text-right font-bold text-emerald-700 dark:text-emerald-300">
                        {formatoMoneda(tMonto)}
                      </td>
                      <td className="p-3 text-right font-bold text-blue-700 dark:text-blue-300">
                        {new Intl.NumberFormat("es-MX", {
                          minimumFractionDigits: 2,
                        }).format(tKg)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-900 text-white font-bold">
                <tr>
                  <td
                    colSpan={3}
                    className="p-3.5 border-r border-slate-800 text-right uppercase tracking-wider text-xs"
                  >
                    TOTALES
                  </td>
                  <td className="p-3.5 border-r border-slate-800 text-center font-mono text-sm">
                    {conteoEmbCred}
                  </td>
                  <td className="p-3.5 border-r border-slate-800 text-center font-mono text-sm">
                    {conteoEmbCtdo}
                  </td>
                  <td className="p-3.5 border-r border-slate-800 text-right text-emerald-400 text-sm font-black">
                    {formatoMoneda(sumaVentaTotal)}
                  </td>
                  <td className="p-3.5 text-right text-blue-400 text-sm font-black">
                    {new Intl.NumberFormat("es-MX", {
                      minimumFractionDigits: 2,
                    }).format(sumaKgTotal)}{" "}
                    KG
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
