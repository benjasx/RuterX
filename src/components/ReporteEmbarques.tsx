import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query"; // 🚀 1. IMPORTAMOS TANSTACK
import {
  FileSpreadsheet,
  Calculator,
  Calendar,
  Plus,
  UserCheck,
} from "lucide-react";
import * as XLSX from "xlsx";
import { guardarHistorialFirebase } from "../firebase/historialService";

// IMPORTAMOS EL SERVICIO DE REGLAS DE NÓMINA
import {
  obtenerAjustesNomina,
  type AjustesNomina,
} from "../firebase/ajustesNominaService";

// IMPORTAMOS LA LÓGICA DE LOS PDF DESDE NUESTRO NUEVO ARCHIVO
import {
  generarPDFFinanciero,
  generarPDFTripulacion,
} from "../utils/pdfGenerator";

// IMPORTAMOS LOS HIJOS
import ModalTraspaso from "./ModalTraspaso";
import TablaFinanciera from "./TablaFinanciera";
import TablaTripulacion from "./TablaTripulacion";

export interface FilaReporte {
  ruta: string;
  unidad: string;
  chofer: string;
  ayudante1: string;
  ayudante2: string;
  embCred: string;
  embCtdo: string;
  totalMonto: number;
  kgTotal: number;
  viaticoRuta: number;
  comisionChofer: number;
  comisionAyudante: number;
}

const MAPA_CAMIONES: Record<string, string> = {
  "1": "01",
  "2": "02",
  "47": "03",
  "4": "04",
  "5": "05",
  "6": "06",
  "7": "07",
  "8": "08",
  "9": "09",
  "10": "10",
  "11": "11",
  "12": "12",
  "13": "13",
  "14": "14",
  "16": "16",
  "17": "17",
  "18": "18",
  "48": "19",
  "20": "20",
  "21": "21",
  "41": "22",
  "23": "23",
  "24": "24",
  "36": "25",
  "37": "26",
  "38": "27",
  "39": "28",
};

// FUNCIÓN: BUSCADOR INTELIGENTE (FUZZY MATCHER) DE RUTAS
const calcularFinanzas = (
  rutaRaw: string,
  montoBase: number,
  reglas: AjustesNomina | null,
) => {
  if (!reglas)
    return { viaticoRuta: 0, comisionChofer: 0, comisionAyudante: 0 };

  let viaticoEncontrado = 0;

  if (rutaRaw) {
    const rutaNormalizada = rutaRaw
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

  return {
    viaticoRuta: viaticoEncontrado,
    comisionChofer: montoBase * reglas.comisionChofer,
    comisionAyudante: montoBase * reglas.comisionAyudante,
  };
};

export default function ReporteEmbarques() {
  const queryClient = useQueryClient(); // 🚀 HERRAMIENTA PARA AVISARLE AL DASHBOARD QUE HAY DATOS NUEVOS

  const [datosProcesados, setDatosProcesados] = useState<FilaReporte[]>([]);
  const [nombreArchivo, setNombreArchivo] = useState("");
  const [archivoAyudantes, setArchivoAyudantes] = useState("");
  const [fechaSalida, setFechaSalida] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [isGenerandoPDF, setIsGenerandoPDF] = useState(false);
  const [mostrarGrafico, setMostrarGrafico] = useState(false);
  const [tipoMetricaGrafico, setTipoMetricaGrafico] = useState<"monto" | "kg">(
    "monto",
  );
  const [guardandoNube, setGuardandoNube] = useState(false);

  const [mostrarModalTraspaso, setMostrarModalTraspaso] = useState(false);
  const [unidadTraspaso, setUnidadTraspaso] = useState("");
  const [choferTraspaso, setChoferTraspaso] = useState("");
  const [rutaTraspaso, setRutaTraspaso] = useState("");

  // 🚀 2. USAMOS CACHÉ PARA REGLAS (Ya no gastamos lecturas aquí)
  const { data: reglasNomina } = useQuery({
    queryKey: ["ajustes_nomina"],
    queryFn: obtenerAjustesNomina,
  });

  useEffect(() => {
    // Solo cargamos los datos del localStorage (borramos el useEffect que pedía Firebase)
    const datosGuardados = localStorage.getItem("embarques_datos");
    if (datosGuardados) setDatosProcesados(JSON.parse(datosGuardados));
    if (localStorage.getItem("embarques_archivo"))
      setNombreArchivo(localStorage.getItem("embarques_archivo")!);
    if (localStorage.getItem("embarques_ayudantes_archivo"))
      setArchivoAyudantes(localStorage.getItem("embarques_ayudantes_archivo")!);
    if (localStorage.getItem("embarques_fecha"))
      setFechaSalida(localStorage.getItem("embarques_fecha")!);
  }, []);

  const recalcularFinanzasCompletas = (
    datos: FilaReporte[],
    reglas: AjustesNomina | null,
  ) => {
    return datos.map((fila) => {
      const finanzas = calcularFinanzas(fila.ruta, fila.totalMonto, reglas);
      return { ...fila, ...finanzas };
    });
  };

  const handleGuardarProgreso = () => {
    localStorage.setItem("embarques_datos", JSON.stringify(datosProcesados));
    localStorage.setItem("embarques_archivo", nombreArchivo);
    localStorage.setItem("embarques_ayudantes_archivo", archivoAyudantes);
    localStorage.setItem("embarques_fecha", fechaSalida);
    alert(
      "¡Progreso, rutas y ayudantes guardados correctamente en el navegador!",
    );
  };

  const handleGuardarEnNube = async () => {
    if (!datosProcesados.length) return;
    if (
      window.confirm(
        `¿Subir reporte del día ${fechaSalida} a la nube? Esto registrará los viajes de los choferes y calculará comisiones.`,
      )
    ) {
      setGuardandoNube(true);

      const datosListos = recalcularFinanzasCompletas(
        datosProcesados,
        reglasNomina || null, // 🚀 Usamos la variable directa de la caché
      );

      const resultado = await guardarHistorialFirebase(
        fechaSalida,
        datosListos,
      );

      if (resultado.success) {
        alert("¡Historial y finanzas guardados en la nube exitosamente!");
        // 🚀 3. EL GRITO AL SISTEMA: "¡Limpiamos la caché del historial para que el Dashboard vea el nuevo Excel!"
        queryClient.invalidateQueries({ queryKey: ["historial_salidas"] });
      } else {
        alert("Error al guardar en la nube. Verifica tu conexión.");
      }
      setGuardandoNube(false);
    }
  };

  const formatearMoneda = (c: number) =>
    new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(c);
  const formatearNumero = (c: number) =>
    new Intl.NumberFormat("es-MX", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(c);
  const obtenerFechaFormateada = () =>
    new Date(fechaSalida + "T00:00:00").toLocaleDateString("es-MX", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  const totalGeneralCred = datosProcesados.filter(
    (d) => d.embCred !== "0" && d.embCred !== "TRASPASO",
  ).length;
  const totalGeneralCtdo = datosProcesados.filter(
    (d) => d.embCtdo !== "0" && d.embCtdo !== "TRASPASO",
  ).length;
  const sumaGranTotal = datosProcesados.reduce(
    (sum, item) => sum + item.totalMonto,
    0,
  );
  const sumaGranKg = datosProcesados.reduce(
    (sum, item) => sum + item.kgTotal,
    0,
  );

  const totales = {
    cred: totalGeneralCred,
    ctdo: totalGeneralCtdo,
    monto: sumaGranTotal,
    kg: sumaGranKg,
  };
  const maxMonto = Math.max(...datosProcesados.map((d) => d.totalMonto), 1);
  const maxKg = Math.max(...datosProcesados.map((d) => d.kgTotal), 1);

  const handleExportarPDF = async () => {
    setIsGenerandoPDF(true);
    await generarPDFFinanciero(datosProcesados, fechaSalida, totales);
    setIsGenerandoPDF(false);
  };

  const handleExportarPDFTripulacion = async () => {
    setIsGenerandoPDF(true);
    await generarPDFTripulacion(datosProcesados, fechaSalida);
    setIsGenerandoPDF(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setNombreArchivo(file.name);
    const data = await file.arrayBuffer();
    const worksheet = XLSX.read(data).Sheets[XLSX.read(data).SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json<any>(worksheet, { range: 5 });

    const resumen = jsonData.reduce(
      (acc: Record<string, FilaReporte>, fila: any) => {
        const tipoRaw = String(fila.tipo || "")
          .toLowerCase()
          .trim();
        if (tipoRaw !== "credito" && tipoRaw !== "contado") return acc;

        const vehiculoRaw = fila.vehiculo;
        if (!vehiculoRaw) return acc;

        const unidadReal =
          MAPA_CAMIONES[
            isNaN(parseInt(vehiculoRaw))
              ? vehiculoRaw.trim()
              : parseInt(vehiculoRaw)
          ] || String(vehiculoRaw).padStart(2, "0");

        if (!acc[unidadReal]) {
          acc[unidadReal] = {
            ruta: "",
            unidad: unidadReal,
            chofer:
              fila.Chofer && fila.Chofer !== "SIN NOMBRE" ? fila.Chofer : "",
            ayudante1: "",
            ayudante2: "",
            embCred: "0",
            embCtdo: "0",
            totalMonto: 0,
            kgTotal: 0,
            viaticoRuta: 0,
            comisionChofer: 0,
            comisionAyudante: 0,
          };
        }

        if (tipoRaw === "credito") acc[unidadReal].embCred = fila.folio || "";
        if (tipoRaw === "contado") acc[unidadReal].embCtdo = fila.folio || "";

        acc[unidadReal].totalMonto += parseFloat(
          String(fila.total || 0).replace(/,/g, ""),
        );
        acc[unidadReal].kgTotal += parseFloat(
          String(fila.peso || 0).replace(/,/g, ""),
        );

        // Pasamos reglasNomina (que viene de la caché)
        const finanzas = calcularFinanzas(
          acc[unidadReal].ruta,
          acc[unidadReal].totalMonto,
          reglasNomina || null,
        );
        acc[unidadReal] = { ...acc[unidadReal], ...finanzas };

        return acc;
      },
      {},
    );

    setDatosProcesados(
      Object.values(resumen).sort(
        (a: any, b: any) => parseInt(a.unidad) - parseInt(b.unidad),
      ),
    );
  };

  const handleAyudantesFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setArchivoAyudantes(file.name);
    const data = await file.arrayBuffer();
    const worksheet = XLSX.read(data).Sheets[XLSX.read(data).SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json<any>(worksheet, { range: 5 });

    setDatosProcesados((prev) => {
      const base =
        prev.length > 0
          ? prev
          : Array.from({ length: 28 }, (_, i) => ({
              ruta: "",
              unidad: String(i + 1).padStart(2, "0"),
              chofer: "",
              ayudante1: "",
              ayudante2: "",
              embCred: "0",
              embCtdo: "0",
              totalMonto: 0,
              kgTotal: 0,
              viaticoRuta: 0,
              comisionChofer: 0,
              comisionAyudante: 0,
            }));

      const nuevosDatos = base.map((fila) => {
        const match = jsonData.find(
          (row) =>
            parseInt(
              String(row["Unidad (# Eco.)"] || row["Unidad"] || "").trim(),
            ) === parseInt(fila.unidad),
        );
        if (!match) return fila;

        let rawRuta = match["RUTA/DIA"] || match["Ruta"] || "";

        if (typeof rawRuta === "number") {
          const fechaExcel = new Date((rawRuta - (25567 + 2)) * 86400 * 1000);
          const dia = fechaExcel.getDate();
          const mes = fechaExcel.toLocaleString("es-MX", { month: "long" });
          rawRuta = `${dia} de ${mes}`;
        }

        const rutaDefinitiva = String(rawRuta).toUpperCase() || fila.ruta;

        return {
          ...fila,
          ruta: rutaDefinitiva,
          chofer: match["Chofer"]
            ? String(match["Chofer"]).toUpperCase()
            : fila.chofer,
          ayudante1: match["Ayudante 1"]
            ? String(match["Ayudante 1"]).toUpperCase()
            : fila.ayudante1,
          ayudante2: match["Ayudante 2"]
            ? String(match["Ayudante 2"]).toUpperCase()
            : fila.ayudante2,
        };
      });

      return recalcularFinanzasCompletas(nuevosDatos, reglasNomina || null);
    });

    alert(
      "¡Rutas, ayudantes, choferes y tripulación importados correctamente!",
    );
  };

  const handleCambiarAyudante1 = (unidad: string, valor: string) => {
    setDatosProcesados((prev) =>
      prev.map((f) => (f.unidad === unidad ? { ...f, ayudante1: valor } : f)),
    );
  };

  const handleCambiarAyudante2 = (unidad: string, valor: string) => {
    setDatosProcesados((prev) =>
      prev.map((f) => (f.unidad === unidad ? { ...f, ayudante2: valor } : f)),
    );
  };

  const confirmarTraspaso = () => {
    if (!unidadTraspaso.trim() || !choferTraspaso.trim()) {
      alert("Por favor, ingresa la unidad y el nombre del chofer.");
      return;
    }

    const rutaFinal = rutaTraspaso.trim()
      ? `TRASPASO - ${rutaTraspaso.toUpperCase()}`
      : "TRASPASO";

    const nuevaFila: FilaReporte = {
      ruta: rutaFinal,
      unidad: unidadTraspaso.padStart(2, "0"),
      chofer: choferTraspaso.toUpperCase(),
      ayudante1: "",
      ayudante2: "",
      embCred: "TRASPASO",
      embCtdo: "TRASPASO",
      totalMonto: 0,
      kgTotal: 0,
      viaticoRuta: 0,
      comisionChofer: 0,
      comisionAyudante: 0,
    };

    const nuevosDatos = [...datosProcesados, nuevaFila];
    nuevosDatos.sort((a, b) => parseInt(a.unidad) - parseInt(b.unidad));

    setDatosProcesados(nuevosDatos);
    setUnidadTraspaso("");
    setChoferTraspaso("");
    setRutaTraspaso("");
    setMostrarModalTraspaso(false);
  };

  return (
    <div className="w-full bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col h-full relative">
      <div className="flex items-center gap-2 mb-6 shrink-0">
        <Calculator className="text-blue-600" size={24} />
        <h2 className="text-xl font-bold text-slate-800">
          Generador de Salidas y Tripulación
        </h2>
      </div>

      {!datosProcesados.length && (
        <div className="mb-6 p-8 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 flex flex-col items-center justify-center text-center">
          <FileSpreadsheet className="text-slate-400 mb-3" size={40} />
          <h3 className="text-lg font-semibold text-slate-700 mb-1">
            Sube el reporte de embarques (.xlsx)
          </h3>
          <div className="flex flex-wrap gap-3 justify-center mt-4">
            <label className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg cursor-pointer text-sm font-medium">
              <input
                type="file"
                accept=".xlsx"
                onChange={handleFileUpload}
                className="hidden"
              />{" "}
              Seleccionar BMS
            </label>
            <label className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-lg cursor-pointer text-sm font-medium flex items-center gap-2">
              <UserCheck size={18} /> Cargar Ayudantes
              <input
                type="file"
                accept=".xlsx"
                onChange={handleAyudantesFileUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>
      )}

      {datosProcesados.length > 0 && (
        <div className="flex-1 flex flex-col gap-8 min-h-0">
          <div className="flex flex-col xl:flex-row items-center gap-4 justify-between bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="flex items-center gap-3 bg-white p-2 rounded-lg border border-slate-200 shadow-sm w-fit">
              <Calendar className="text-blue-600 ml-2" size={20} />
              <input
                type="date"
                value={fechaSalida}
                onChange={(e) => setFechaSalida(e.target.value)}
                className="border-none bg-transparent text-sm font-medium text-slate-700 outline-none cursor-pointer"
              />
            </div>
            <div className="flex gap-3">
              <label className="bg-white border border-slate-300 px-4 py-2.5 rounded-lg cursor-pointer text-sm font-semibold hover:bg-slate-50 transition-colors shadow-sm">
                Cargar Otro XLSX
                <input
                  type="file"
                  accept=".xlsx"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
              <button
                onClick={() => setMostrarModalTraspaso(true)}
                className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 transition-colors text-white px-4 py-2.5 rounded-lg text-sm font-semibold shadow-sm"
              >
                <Plus size={18} /> Añadir Traspaso
              </button>
            </div>
          </div>

          <TablaFinanciera
            datosProcesados={datosProcesados}
            fechaFormateada={obtenerFechaFormateada()}
            mostrarGrafico={mostrarGrafico}
            setMostrarGrafico={setMostrarGrafico}
            tipoMetricaGrafico={tipoMetricaGrafico}
            setTipoMetricaGrafico={setTipoMetricaGrafico}
            maxMonto={maxMonto}
            maxKg={maxKg}
            totales={totales}
            isGenerandoPDF={isGenerandoPDF}
            guardandoNube={guardandoNube}
            formatearMoneda={formatearMoneda}
            formatearNumero={formatearNumero}
            handleGuardarProgreso={handleGuardarProgreso}
            handleExportarPDF={handleExportarPDF}
            handleGuardarEnNube={handleGuardarEnNube}
          />

          <TablaTripulacion
            datosProcesados={datosProcesados}
            fechaFormateada={obtenerFechaFormateada()}
            archivoAyudantes={archivoAyudantes}
            isGenerandoPDF={isGenerandoPDF}
            handleAyudantesFileUpload={handleAyudantesFileUpload}
            handleExportarPDFTripulacion={handleExportarPDFTripulacion}
            handleCambiarAyudante1={handleCambiarAyudante1}
            handleCambiarAyudante2={handleCambiarAyudante2}
          />
        </div>
      )}

      <ModalTraspaso
        mostrar={mostrarModalTraspaso}
        onClose={() => setMostrarModalTraspaso(false)}
        unidad={unidadTraspaso}
        setUnidad={setUnidadTraspaso}
        chofer={choferTraspaso}
        setChofer={setChoferTraspaso}
        ruta={rutaTraspaso}
        setRuta={setRutaTraspaso}
        onConfirm={confirmarTraspaso}
      />
    </div>
  );
}
