import { useState, useEffect } from "react";
import {
  Upload,
  FileSpreadsheet,
  Calculator,
  Calendar,
  Plus,
  X,
  Truck,
  Save,
  FileText,
} from "lucide-react";
import * as XLSX from "xlsx";

// DICCIONARIO DE MAPEO DE CAMIONES
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

interface FilaReporte {
  ruta: string;
  unidad: string;
  chofer: string;
  embCred: string;
  embCtdo: string;
  totalMonto: number;
  kgTotal: number;
}

interface Props {
  rutas: any[];
}

export default function ReporteEmbarques({ rutas }: Props) {
  const [datosProcesados, setDatosProcesados] = useState<FilaReporte[]>([]);
  const [nombreArchivo, setNombreArchivo] = useState<string>("");
  const [fechaSalida, setFechaSalida] = useState<string>(
    new Date().toISOString().split("T")[0],
  );
  const [isGenerandoPDF, setIsGenerandoPDF] = useState(false);

  // ESTADOS PARA EL MODAL DE TRASPASO
  const [mostrarModalTraspaso, setMostrarModalTraspaso] = useState(false);
  const [unidadTraspaso, setUnidadTraspaso] = useState("");
  const [choferTraspaso, setChoferTraspaso] = useState("");

  const rutasOrdenadas = [...rutas].sort((a, b) =>
    a.nombre.localeCompare(b.nombre),
  );

  // RECUPERAR DATOS DEL LOCAL STORAGE AL CARGAR LA PÁGINA
  useEffect(() => {
    const datosGuardados = localStorage.getItem("embarques_datos");
    const archivoGuardado = localStorage.getItem("embarques_archivo");
    const fechaGuardada = localStorage.getItem("embarques_fecha");

    if (datosGuardados) setDatosProcesados(JSON.parse(datosGuardados));
    if (archivoGuardado) setNombreArchivo(archivoGuardado);
    if (fechaGuardada) setFechaSalida(fechaGuardada);
  }, []);

  // FUNCIÓN PARA GUARDAR EN LOCAL STORAGE
  const handleGuardarProgreso = () => {
    localStorage.setItem("embarques_datos", JSON.stringify(datosProcesados));
    localStorage.setItem("embarques_archivo", nombreArchivo);
    localStorage.setItem("embarques_fecha", fechaSalida);
    alert(
      "¡Progreso guardado correctamente! Ya puedes refrescar la página sin perder tu información.",
    );
  };

  const formatearMoneda = (cantidad: number) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(cantidad);
  };

  const formatearNumero = (cantidad: number) => {
    return new Intl.NumberFormat("es-MX", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(cantidad);
  };

  const obtenerFechaFormateada = () => {
    const fechaObj = new Date(fechaSalida + "T00:00:00");
    return fechaObj.toLocaleDateString("es-MX", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // CÁLCULOS GLOBALES
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

  // UTILIDAD: Convertir la imagen local de la carpeta public a Base64
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
      console.warn("No se pudo cargar el logo localmente:", error);
      return null;
    }
  };

  // LÓGICA DE PDF OPTIMIZADA PARA MÁS DE 17 RUTas
  const handleExportarPDF = async () => {
    const pdfMake = (window as any).pdfMake;

    if (!pdfMake) {
      alert(
        "El generador de PDF está cargando... intenta de nuevo en un segundo.",
      );
      return;
    }

    setIsGenerandoPDF(true);

    // Leemos el logo directamente de tu carpeta public
    const logoBase64 = await obtenerLogoBase64Local("/CIRLogo.png");

    const tableBody = [
      // Encabezados de la tabla
      [
        { text: "Ruta Asignada", style: "tableHeader" },
        { text: "Un.", style: "tableHeader", alignment: "center" },
        { text: "Chofer", style: "tableHeader" },
        { text: "Emb. Crédito", style: "tableHeader", alignment: "center" },
        { text: "Emb. Contado", style: "tableHeader", alignment: "center" },
        { text: "Monto Total", style: "tableHeader", alignment: "right" },
        { text: "Peso (KG)", style: "tableHeader", alignment: "right" },
      ],
      // Filas de datos con fuente más compacta (fontSize 8)
      ...datosProcesados.map((fila) => [
        {
          text: fila.ruta || "SIN ASIGNAR",
          style: !fila.ruta ? "textoGris" : "tableCell",
        },
        {
          text: fila.unidad,
          alignment: "center",
          bold: true,
          style: "tableCell",
        },
        { text: fila.chofer, style: "tableCell" },
        {
          text: fila.embCred,
          alignment: "center",
          color: fila.embCred === "TRASPASO" ? "#d97706" : "#334155",
          bold: fila.embCred === "TRASPASO",
          style: "tableCell",
        },
        {
          text: fila.embCtdo,
          alignment: "center",
          color: fila.embCtdo === "TRASPASO" ? "#d97706" : "#334155",
          bold: fila.embCtdo === "TRASPASO",
          style: "tableCell",
        },
        {
          text: fila.totalMonto > 0 ? formatearMoneda(fila.totalMonto) : "-",
          alignment: "right",
          style: "tableCell",
        },
        {
          text: fila.kgTotal > 0 ? formatearNumero(fila.kgTotal) : "-",
          alignment: "right",
          style: "tableCell",
        },
      ]),
      // Fila de Totales Generales
      [
        {
          text: "TOTALES GENERALES",
          colSpan: 3,
          alignment: "right",
          style: "tableFooter",
        },
        {},
        {},
        {
          text: totalGeneralCred.toString(),
          style: "tableFooter",
          alignment: "center",
        },
        {
          text: totalGeneralCtdo.toString(),
          style: "tableFooter",
          alignment: "center",
        },
        {
          text: formatearMoneda(sumaGranTotal),
          style: "tableFooterTotal",
          alignment: "right",
        },
        {
          text: formatearNumero(sumaGranKg),
          style: "tableFooter",
          alignment: "right",
        },
      ],
    ];

    const docDefinition: any = {
      pageOrientation: "landscape", // Horizontal
      pageMargins: [30, 25, 30, 25], // Márgenes más ajustados para ganar espacio vertical
      content: [
        // CABECERA CON LOGO LOCAL Y TÍTULO
        {
          columns: [
            logoBase64
              ? { image: logoBase64, width: 110 }
              : { text: "ORGANIZACIÓN CIR", style: "headerTitle" },
            {
              stack: [
                {
                  text: "RELACIÓN DE SALIDA",
                  style: "headerTitle",
                  alignment: "right",
                },
                {
                  text: obtenerFechaFormateada().toUpperCase(),
                  style: "headerDate",
                  alignment: "right",
                },
              ],
              margin: [0, 5, 0, 0],
            },
          ],
          margin: [0, 0, 0, 10],
        },
        // TABLA COMPACTA
        {
          table: {
            headerRows: 1,
            widths: ["auto", "auto", "*", "auto", "auto", "auto", "auto"],
            body: tableBody,
          },
          layout: {
            fillColor: function (rowIndex: number, node: any) {
              if (rowIndex === 0) return "#1e293b"; // Cabecera oscura
              if (rowIndex === node.table.body.length - 1) return "#ffffff"; // Footer blanco
              return rowIndex % 2 === 0 ? "#f8fafc" : "#ffffff"; // Zebra striping
            },
            hLineWidth: function (i: number, node: any) {
              if (i === 0 || i === 1) return 1;
              if (i === node.table.body.length - 1) return 1.5;
              if (i === node.table.body.length) return 0;
              return 0.4;
            },
            vLineWidth: function () {
              return 0;
            },
            hLineColor: function (i: number, node: any) {
              if (i === 0 || i === 1) return "#1e293b";
              if (i === node.table.body.length - 1) return "#cbd5e1";
              return "#e2e8f0";
            },
            // Padding vertical reducido (4px) para garantizar que entren 17+ filas holgadamente
            paddingTop: function () {
              return 4;
            },
            paddingBottom: function () {
              return 4;
            },
            paddingLeft: function () {
              return 4;
            },
            paddingRight: function () {
              return 4;
            },
          },
        },
      ],
      styles: {
        headerTitle: { fontSize: 15, bold: true, color: "#0f172a" },
        headerDate: { fontSize: 10, color: "#64748b", bold: true },
        tableHeader: { bold: true, fontSize: 9, color: "#ffffff" },
        tableCell: { fontSize: 8.5, color: "#334155" },
        tableFooter: { bold: true, fontSize: 9.5, color: "#334155" },
        tableFooterTotal: { bold: true, fontSize: 10.5, color: "#1d4ed8" },
        textoGris: { fontSize: 8.5, color: "#94a3b8", italics: true },
      },
      defaultStyle: {
        fontSize: 8.5,
        font: "Roboto",
      },
    };

    pdfMake
      .createPdf(docDefinition)
      .download(`Relacion_Salida_${fechaSalida}.pdf`);
    setIsGenerandoPDF(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setNombreArchivo(file.name);

    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];

    const jsonData = XLSX.utils.sheet_to_json<any>(worksheet, { range: 5 });

    const resumen = jsonData.reduce(
      (acc: Record<string, FilaReporte>, fila: any) => {
        const tipoRaw = String(fila.tipo || "")
          .toLowerCase()
          .trim();

        if (tipoRaw !== "credito" && tipoRaw !== "contado") return acc;

        const vehiculoRaw = fila.vehiculo;
        if (
          vehiculoRaw === undefined ||
          vehiculoRaw === null ||
          vehiculoRaw === ""
        )
          return acc;

        const codigoEntero = parseInt(String(vehiculoRaw), 10);
        const codigoOriginal = isNaN(codigoEntero)
          ? String(vehiculoRaw).trim()
          : String(codigoEntero);

        const unidadReal =
          MAPA_CAMIONES[codigoOriginal] || codigoOriginal.padStart(2, "0");

        let monto =
          typeof fila.total === "number"
            ? fila.total
            : parseFloat(String(fila.total).replace(/,/g, "")) || 0;
        let peso =
          typeof fila.peso === "number"
            ? fila.peso
            : parseFloat(String(fila.peso).replace(/,/g, "")) || 0;

        const chofer = fila.Chofer ? String(fila.Chofer).trim() : "";
        const folio = fila.folio ? String(fila.folio).trim() : "";

        if (!acc[unidadReal]) {
          acc[unidadReal] = {
            ruta: "",
            unidad: unidadReal,
            chofer: chofer !== "SIN NOMBRE" ? chofer : "",
            embCred: "0",
            embCtdo: "0",
            totalMonto: 0,
            kgTotal: 0,
          };
        }

        if (chofer && chofer !== "SIN NOMBRE" && !acc[unidadReal].chofer) {
          acc[unidadReal].chofer = chofer;
        }

        if (tipoRaw === "credito") {
          acc[unidadReal].embCred = folio;
        } else if (tipoRaw === "contado") {
          acc[unidadReal].embCtdo = folio;
        }

        acc[unidadReal].totalMonto += monto;
        acc[unidadReal].kgTotal += peso;

        return acc;
      },
      {},
    );

    const resultadoFinal: FilaReporte[] = Object.values(resumen);
    resultadoFinal.sort((a, b) => parseInt(a.unidad) - parseInt(b.unidad));

    setDatosProcesados(resultadoFinal);
  };

  const handleCambiarRuta = (unidad: string, nuevaRuta: string) => {
    setDatosProcesados((prevDatos) =>
      prevDatos.map((fila) =>
        fila.unidad === unidad ? { ...fila, ruta: nuevaRuta } : fila,
      ),
    );
  };

  const confirmarTraspaso = () => {
    if (!unidadTraspaso.trim() || !choferTraspaso.trim()) {
      alert("Por favor, ingresa la unidad y el nombre del chofer.");
      return;
    }

    const nuevaFila: FilaReporte = {
      ruta: "",
      unidad: unidadTraspaso.padStart(2, "0"),
      chofer: choferTraspaso.toUpperCase(),
      embCred: "TRASPASO",
      embCtdo: "TRASPASO",
      totalMonto: 0,
      kgTotal: 0,
    };

    const nuevosDatos = [...datosProcesados, nuevaFila];
    nuevosDatos.sort((a, b) => parseInt(a.unidad) - parseInt(b.unidad));

    setDatosProcesados(nuevosDatos);
    setUnidadTraspaso("");
    setChoferTraspaso("");
    setMostrarModalTraspaso(false);
  };

  return (
    <div className="w-full bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col h-full relative">
      <div className="flex items-center gap-2 mb-6 shrink-0">
        <Calculator className="text-blue-600" size={24} />
        <h2 className="text-xl font-bold text-slate-800">
          Generador de Salidas
        </h2>
      </div>

      {!datosProcesados.length && (
        <div className="mb-6 p-8 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 flex flex-col items-center justify-center text-center">
          <FileSpreadsheet className="text-slate-400 mb-3" size={40} />
          <h3 className="text-lg font-semibold text-slate-700 mb-1">
            Sube el reporte de embarques (.xlsx)
          </h3>
          <p className="text-sm text-slate-500 mb-4 max-w-md">
            El sistema limpiará automáticamente el formato y calculará los
            totales por unidad.
          </p>
          <label className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium cursor-pointer transition-colors shadow-sm text-sm">
            Seleccionar Archivo
            <input
              type="file"
              accept=".xlsx, .xls"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>
      )}

      {datosProcesados.length > 0 && (
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex flex-col sm:flex-row items-center gap-4 mb-4 justify-between">
            <div className="flex items-center gap-3 bg-white p-2 rounded-lg border border-slate-200 shadow-sm w-fit">
              <Calendar className="text-blue-600 ml-2" size={20} />
              <label className="text-sm font-semibold text-slate-700">
                Fecha de Salida:
              </label>
              <input
                type="date"
                value={fechaSalida}
                onChange={(e) => setFechaSalida(e.target.value)}
                className="border-none rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-0 bg-transparent text-slate-700 font-medium cursor-pointer"
              />
            </div>

            <div className="flex gap-3">
              <label className="flex items-center justify-center bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-4 py-2.5 rounded-lg text-sm font-semibold cursor-pointer transition-colors shadow-sm">
                Cargar Otro
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
              <button
                onClick={() => setMostrarModalTraspaso(true)}
                className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors shadow-sm"
              >
                <Plus size={18} /> Añadir Traspaso
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
            <table className="w-full text-left border-collapse text-sm whitespace-nowrap bg-white">
              <thead>
                <tr className="bg-slate-800 text-white">
                  <th colSpan={7} className="px-6 py-4">
                    <div className="flex justify-between items-center">
                      <span className="text-base font-bold tracking-widest uppercase">
                        Relación de Salida
                      </span>
                      <span className="font-medium text-slate-300 text-sm uppercase">
                        {obtenerFechaFormateada()}
                      </span>
                    </div>
                  </th>
                </tr>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-bold">
                  <th className="px-6 py-3 text-left w-64">Ruta Asignada</th>
                  <th className="px-6 py-3 text-center w-24">Unidad</th>
                  <th className="px-6 py-3 text-left">Chofer</th>
                  <th className="px-6 py-3 text-center">Emb. Crédito</th>
                  <th className="px-6 py-3 text-center">Emb. Contado</th>
                  <th className="px-6 py-3 text-right">Monto Total</th>
                  <th className="px-6 py-3 text-right">Peso (KG)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {datosProcesados.map((fila, index) => (
                  <tr
                    key={index}
                    className="hover:bg-blue-50/50 transition-colors group"
                  >
                    <td className="px-4 py-2">
                      <select
                        value={fila.ruta}
                        onChange={(e) =>
                          handleCambiarRuta(fila.unidad, e.target.value)
                        }
                        className="w-full bg-transparent border border-transparent group-hover:border-slate-200 group-hover:bg-white rounded px-2 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
                      >
                        <option value="">- Seleccionar Ruta -</option>
                        {rutasOrdenadas.map((r) => (
                          <option key={r.id} value={r.nombre}>
                            {r.nombre}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-3 text-center">
                      <span className="inline-flex items-center justify-center bg-slate-100 text-slate-700 font-bold px-2.5 py-1 rounded-md text-xs">
                        <Truck size={12} className="mr-1.5 opacity-50" />
                        {fila.unidad}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-left uppercase text-xs font-medium text-slate-700">
                      {fila.chofer}
                    </td>
                    <td className="px-6 py-3 text-center">
                      {fila.embCred === "TRASPASO" ? (
                        <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700">
                          TRASPASO
                        </span>
                      ) : (
                        <span className="font-semibold text-slate-600">
                          {fila.embCred}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-center">
                      {fila.embCtdo === "TRASPASO" ? (
                        <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700">
                          TRASPASO
                        </span>
                      ) : (
                        <span className="font-semibold text-slate-600">
                          {fila.embCtdo}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-right">
                      {fila.totalMonto > 0 ? (
                        <span className="font-bold text-slate-900">
                          {formatearMoneda(fila.totalMonto)}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-medium">-</span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-right">
                      {fila.kgTotal > 0 ? (
                        <span className="font-medium text-slate-600">
                          {formatearNumero(fila.kgTotal)}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-medium">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                <tr>
                  <td colSpan={2} className="px-6 py-4 text-left">
                    <div className="flex gap-2">
                      <button
                        onClick={handleGuardarProgreso}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors shadow-sm"
                      >
                        <Save size={16} /> Guardar Progreso
                      </button>
                      <button
                        onClick={handleExportarPDF}
                        disabled={isGenerandoPDF}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors shadow-sm ${
                          isGenerandoPDF
                            ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                            : "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 hover:border-red-300"
                        }`}
                        title="Descargar PDF con Logo"
                      >
                        <FileText size={16} />
                        {isGenerandoPDF ? "Generando..." : "Generar PDF"}
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right uppercase text-slate-500 font-bold text-xs tracking-wider">
                    Totales Generales
                  </td>
                  <td className="px-6 py-4 text-center font-bold text-slate-800 text-sm">
                    {totalGeneralCred}
                  </td>
                  <td className="px-6 py-4 text-center font-bold text-slate-800 text-sm">
                    {totalGeneralCtdo}
                  </td>
                  <td className="px-6 py-4 text-right font-bold text-blue-700 text-base">
                    {formatearMoneda(sumaGranTotal)}
                  </td>
                  <td className="px-6 py-4 text-right font-bold text-slate-800 text-sm">
                    {formatearNumero(sumaGranKg)}{" "}
                    <span className="text-slate-500 text-xs font-normal">
                      KG
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {mostrarModalTraspaso && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-slate-800 px-6 py-4 flex justify-between items-center">
              <h3 className="font-bold text-white tracking-wide">
                Agregar Traspaso
              </h3>
              <button
                onClick={() => setMostrarModalTraspaso(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-5 bg-slate-50">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                  Número de Unidad
                </label>
                <input
                  type="text"
                  placeholder="Ej. 17"
                  value={unidadTraspaso}
                  onChange={(e) => setUnidadTraspaso(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                  Nombre del Chofer
                </label>
                <input
                  type="text"
                  placeholder="Ej. Juan Pérez"
                  value={choferTraspaso}
                  onChange={(e) => setChoferTraspaso(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase bg-white shadow-sm"
                />
              </div>
            </div>

            <div className="bg-white px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
              <button
                onClick={() => setMostrarModalTraspaso(false)}
                className="px-5 py-2 text-slate-600 hover:bg-slate-100 font-semibold rounded-lg transition-colors text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarTraspaso}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors text-sm flex items-center gap-2 shadow-sm"
              >
                <Plus size={16} /> Confirmar Traspaso
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
