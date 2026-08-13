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
import { exportarDistribucionPDF } from "../utils/reportesDistribucionUtils";

// Función para calcular viáticos y comisiones según las reglas exactas
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

  const auth = getAuth();
  const esAdmin = auth.currentUser?.email === "admin@ruterx.com";

  const [fechaSeleccionada, setFechaSeleccionada] = useState(() => {
    return localStorage.getItem("distribucion_fecha_guardada") || hoyStr;
  });

  useEffect(() => {
    localStorage.setItem("distribucion_fecha_guardada", fechaSeleccionada);
  }, [fechaSeleccionada]);

  const [filas, setFilas] = useState<any[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [mostrarResumen, setMostrarResumen] = useState(false);

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
    setFilas([...filas, { ...FilaVacia, id: Date.now() }]);
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
    // 1. Validaciones previas
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

    // 🚀 LÓGICA DE ORDENAMIENTO POR UNIDAD
    // Usamos parseInt para que "03" se ordene como 3, "16" como 16, etc.
    const filasOrdenadas = [...filas].sort((a, b) => {
      const unidadA = parseInt(a.unidad) || 999; // Si no tiene unidad, lo manda al final
      const unidadB = parseInt(b.unidad) || 999;
      return unidadA - unidadB;
    });

    setGuardando(true);
    try {
      const datosCompletos = filasOrdenadas.map((f) => {
        // Usamos filasOrdenadas
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

      // 2. Guardamos los datos ya ordenados
      await guardarDistribucionFecha(fechaSeleccionada, datosCompletos);

      // 3. Opcional: También ordenamos la vista actual para que lo veas al instante
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

  const exportarResumenPDF = () => {
    const pdfMake = (window as any).pdfMake;
    if (!pdfMake) return alert("Generador PDF cargando...");

    const bodyData = filasResumen.map((f, index) => {
      const tMonto = (f.totalMontoCredito || 0) + (f.totalMontoContado || 0);
      const tKg = (f.totalkgCredito || 0) + (f.totalkgContado || 0);
      const esPar = index % 2 === 0;

      return [
        {
          text: f.ruta || "-",
          style: "td",
          fillColor: esPar ? "#ffffff" : "#f8fafc",
        },
        {
          text: f.unidad || "-",
          style: "tdCenter",
          fillColor: esPar ? "#ffffff" : "#f8fafc",
        },
        {
          text: f.chofer || "-",
          style: "td",
          fillColor: esPar ? "#ffffff" : "#f8fafc",
        },
        {
          text: f.embarqueCredito || "0",
          style: "tdCenter",
          fillColor: esPar ? "#ffffff" : "#f8fafc",
        },
        {
          text: f.embarqueContado || "0",
          style: "tdCenter",
          fillColor: esPar ? "#ffffff" : "#f8fafc",
        },
        {
          text: formatoMoneda(tMonto),
          style: "tdRight",
          fillColor: esPar ? "#ffffff" : "#f8fafc",
          color: "#047857",
        },
        {
          text: new Intl.NumberFormat("es-MX", {
            minimumFractionDigits: 2,
          }).format(tKg),
          style: "tdRight",
          fillColor: esPar ? "#ffffff" : "#f8fafc",
          color: "#1d4ed8",
        },
      ];
    });

    bodyData.push([
      {
        text: "TOTALES",
        style: "thTotal",
        colSpan: 3,
        alignment: "left",
      } as any,
      {},
      {},
      { text: conteoEmbCred.toString(), style: "thTotal", alignment: "center" },
      { text: conteoEmbCtdo.toString(), style: "thTotal", alignment: "center" },
      {
        text: formatoMoneda(sumaVentaTotal),
        style: "thTotalRight",
        color: "#065f46",
      },
      {
        text:
          new Intl.NumberFormat("es-MX", { minimumFractionDigits: 2 }).format(
            sumaKgTotal,
          ) + " KG",
        style: "thTotalRight",
        color: "#1e40af",
      },
    ]);

    const documentDefinition = {
      pageOrientation: "portrait",
      pageMargins: [25, 25, 25, 25],
      content: [
        {
          table: {
            widths: ["*"],
            body: [
              [
                {
                  stack: [
                    {
                      text: "REPORTE DE SALIDA Y DISTRIBUCIÓN",
                      fontSize: 9,
                      bold: true,
                      color: "#94a3b8",
                      letterSpacing: 1,
                    },
                    {
                      text: formatearFechaLarga(
                        fechaSeleccionada,
                      ).toUpperCase(),
                      fontSize: 13,
                      bold: true,
                      color: "#0f172a",
                      margin: [0, 2, 0, 0],
                    },
                  ],
                  margin: [10, 8, 10, 8],
                },
              ],
            ],
          },
          layout: {
            fillColor: () => "#f1f5f9",
            hLineWidth: () => 0,
            vLineWidth: () => 0,
            paddingLeft: () => 0,
            paddingRight: () => 0,
            paddingTop: () => 0,
            paddingBottom: () => 0,
          },
          margin: [0, 0, 0, 15],
        },
        {
          table: {
            headerRows: 1,
            widths: ["*", 35, "*", 45, 45, 65, 55],
            body: [
              [
                { text: "RUTA", style: "th" },
                { text: "UNIDAD", style: "th", alignment: "center" },
                { text: "CHOFER", style: "th" },
                { text: "EMBCRED", style: "th", alignment: "center" },
                { text: "EMBCTDO", style: "th", alignment: "center" },
                { text: "TOTAL", style: "th", alignment: "right" },
                { text: "KG TOTAL", style: "th", alignment: "right" },
              ],
              ...bodyData,
            ],
          },
          layout: {
            hLineWidth: (i: number, node: any) =>
              i === 0 || i === 1 || i === node.table.body.length ? 1 : 0.5,
            vLineWidth: () => 0,
            hLineColor: (i: number, node: any) =>
              i === 0 || i === node.table.body.length ? "#0f172a" : "#e2e8f0",
            paddingTop: () => 6,
            paddingBottom: () => 6,
            paddingLeft: () => 6,
            paddingRight: () => 6,
          },
        },
      ],
      styles: {
        th: {
          bold: true,
          fontSize: 8.5,
          fillColor: "#0f172a",
          color: "#ffffff",
          margin: [2, 2],
        },
        td: { fontSize: 8, color: "#334155", margin: [2, 2] },
        tdCenter: {
          fontSize: 8,
          color: "#334155",
          alignment: "center",
          margin: [2, 2],
        },
        tdRight: {
          fontSize: 8,
          bold: true,
          alignment: "right",
          margin: [2, 2],
        },
        thTotal: {
          bold: true,
          fontSize: 9,
          fillColor: "#f8fafc",
          color: "#0f172a",
          margin: [4, 4],
        },
        thTotalRight: {
          bold: true,
          fontSize: 9,
          fillColor: "#f8fafc",
          alignment: "right",
          margin: [4, 4],
        },
      },
    };
    pdfMake
      .createPdf(documentDefinition)
      .download(`RESUMEN_SALIDAS_${fechaSeleccionada}.pdf`);
  };

  if (cargandoChoferes) {
    return (
      <div className="flex w-full h-125 items-center justify-center">
        <Loader2 className="animate-spin text-blue-600" size={40} />
      </div>
    );
  }

  const formatoMoneda = (num: number) =>
    new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(num);

  return (
    <div className="w-full bg-white p-6 rounded-xl shadow-sm border border-slate-100 min-h-[calc(100vh-120px)] uppercase flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b border-slate-100">
        <div>
          <h1 className="text-2xl font-black text-slate-800 flex items-center gap-3">
            <FileSpreadsheet className="text-blue-600" size={28} />
            Tabla de Distribución Diaria
          </h1>
          <p className="text-slate-500 font-medium mt-1 normal-case">
            Llenado manual logístico y extracción financiera automática del BMS.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
          <Calendar size={20} className="text-slate-500" />
          <span className="text-xs font-bold text-slate-600 uppercase">
            Fecha de Salida:
          </span>
          <input
            type="date"
            value={fechaSeleccionada}
            onChange={(e) => setFechaSeleccionada(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-1.5 bg-white font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          />
        </div>
      </div>

      <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-sm mb-6 pb-4 flex-1">
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
                className={`transition-colors ${fila.vinculadoBMS ? "bg-emerald-50/50" : "hover:bg-slate-50"}`}
              >
                <td className="p-2 border-r border-slate-200">
                  <select
                    value={fila.ruta}
                    onChange={(e) =>
                      actualizarCelda(index, "ruta", e.target.value)
                    }
                    className="w-full p-2 bg-transparent border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 font-semibold cursor-pointer uppercase text-xs"
                  >
                    <option value="">-- RUTA --</option>
                    {LISTA_RUTAS.map((rutaNombre, i) => (
                      <option key={i} value={rutaNombre.toUpperCase()}>
                        {rutaNombre.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="p-2 border-r border-slate-200">
                  <select
                    value={fila.unidad}
                    onChange={(e) =>
                      actualizarCelda(index, "unidad", e.target.value)
                    }
                    className="w-full p-2 bg-transparent border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 font-bold text-blue-600 cursor-pointer text-xs"
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
                <td className="p-2 border-r border-slate-200">
                  <select
                    value={fila.chofer}
                    onChange={(e) =>
                      actualizarCelda(index, "chofer", e.target.value)
                    }
                    className="w-full p-2 bg-transparent border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer text-xs uppercase"
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
                <td className="p-2 border-r border-slate-200">
                  <select
                    value={fila.auxiliar1}
                    onChange={(e) =>
                      actualizarCelda(index, "auxiliar1", e.target.value)
                    }
                    className="w-full p-2 bg-transparent border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer text-[11px] uppercase"
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
                <td className="p-2 border-r border-slate-200">
                  <select
                    value={fila.auxiliar2}
                    onChange={(e) =>
                      actualizarCelda(index, "auxiliar2", e.target.value)
                    }
                    className="w-full p-2 bg-transparent border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer text-[11px] uppercase"
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

                {/* 🚀 CELDA EMBARQUE CRÉDITO CON ETIQUETAS KG Y DINERO */}
                <td className="p-2 border-r border-slate-200 relative pb-4">
                  <input
                    type="text"
                    value={fila.embarqueCredito}
                    onChange={(e) =>
                      actualizarCelda(index, "embarqueCredito", e.target.value)
                    }
                    placeholder="FOLIO"
                    className="w-full p-2 bg-transparent border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 font-mono text-center uppercase text-xs"
                  />
                  {(fila.totalMontoCredito > 0 || fila.totalkgCredito > 0) && (
                    <div
                      className="absolute -bottom-2 right-1 flex items-center gap-1"
                      title={`Cajas: ${fila.cajasCredito}`}
                    >
                      <span className="text-[9px] font-bold text-blue-700 bg-blue-100 px-1 rounded shadow-sm border border-blue-200">
                        {new Intl.NumberFormat("es-MX", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        }).format(fila.totalkgCredito)}{" "}
                        KG
                      </span>
                      <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1 rounded shadow-sm border border-emerald-200">
                        {formatoMoneda(fila.totalMontoCredito)}
                      </span>
                    </div>
                  )}
                </td>

                {/* 🚀 CELDA EMBARQUE CONTADO CON ETIQUETAS KG Y DINERO */}
                <td className="p-2 border-r border-slate-200 relative pb-4">
                  <input
                    type="text"
                    value={fila.embarqueContado}
                    onChange={(e) =>
                      actualizarCelda(index, "embarqueContado", e.target.value)
                    }
                    placeholder="FOLIO"
                    className="w-full p-2 bg-transparent border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 font-mono text-center uppercase text-xs"
                  />
                  {(fila.totalMontoContado > 0 || fila.totalkgContado > 0) && (
                    <div
                      className="absolute -bottom-2 right-1 flex items-center gap-1"
                      title={`Cajas: ${fila.cajasContado}`}
                    >
                      <span className="text-[9px] font-bold text-blue-700 bg-blue-100 px-1 rounded shadow-sm border border-blue-200">
                        {new Intl.NumberFormat("es-MX", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        }).format(fila.totalkgContado)}{" "}
                        KG
                      </span>
                      <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1 rounded shadow-sm border border-emerald-200">
                        {formatoMoneda(fila.totalMontoContado)}
                      </span>
                    </div>
                  )}
                </td>

                <td className="p-2 text-center flex items-center justify-center gap-2">
                  {fila.vinculadoBMS && (
                    <span title="Datos financieros agregados correctamente">
                      <CheckCircle2 size={16} className="text-emerald-500" />
                    </span>
                  )}
                  {esAdmin && (
                    <button
                      onClick={() => eliminarFila(index)}
                      className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50"
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

      {/* CONTROLES PRINCIPALES */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
        <div className="flex gap-2">
          <button
            onClick={agregarFila}
            className="flex items-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold px-4 py-2.5 rounded-xl transition-colors text-xs border border-blue-200"
          >
            <Plus size={16} /> Añadir Ruta
          </button>

          {esAdmin && (
            <label className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2.5 rounded-xl transition-colors cursor-pointer text-xs shadow-md shadow-indigo-600/20">
              <Link2 size={16} /> Vincular XLSX (BMS)
              <input
                type="file"
                accept=".xlsx"
                onChange={handleVincularBMS}
                className="hidden"
              />
            </label>
          )}

          {esAdmin && (
            <button
              onClick={() => setMostrarResumen(!mostrarResumen)}
              className={`flex items-center gap-2 font-bold px-4 py-2.5 rounded-xl transition-colors text-xs shadow-md ${mostrarResumen ? "bg-slate-200 text-slate-700" : "bg-slate-900 hover:bg-slate-800 text-white shadow-slate-900/20"}`}
            >
              <Table size={16} />{" "}
              {mostrarResumen ? "Ocultar Resumen" : "Generar Resumen"}
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={exportarExcel}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-3 rounded-xl transition-colors shadow-lg shadow-emerald-600/20 text-xs"
          >
            <Download size={18} /> EXCEL Gral
          </button>

          <button
            onClick={() => exportarDistribucionPDF(filas, fechaSeleccionada)}
            className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white font-bold px-5 py-3 rounded-xl transition-colors shadow-lg shadow-rose-600/20 text-xs"
          >
            <FileText size={18} /> PDF Gral
          </button>

          <button
            onClick={handleGuardar}
            disabled={guardando}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold px-6 py-3 rounded-xl transition-colors shadow-lg shadow-blue-600/30 text-xs"
          >
            {guardando ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <Save size={20} />
            )}
            {guardando ? "GUARDANDO..." : "GUARDAR TODO"}
          </button>
        </div>
      </div>

      {/* SECCIÓN DE RESUMEN EJECUTIVO CORPORATIVO (SOLO ADMIN) */}
      {esAdmin && mostrarResumen && (
        <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xl bg-white animate-in fade-in slide-in-from-top-4 mt-2">
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
              <button
                onClick={exportarResumenPDF}
                className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 border border-slate-700 shadow-sm"
              >
                <FileText size={14} /> PDF
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 font-bold uppercase tracking-wider">
                  <th className="p-3.5 border-r border-slate-200">Ruta</th>
                  <th className="p-3.5 border-r border-slate-200">Unidad</th>
                  <th className="p-3.5 border-r border-slate-200">Chofer</th>
                  <th className="p-3.5 border-r border-slate-200 text-center">
                    EmbCred
                  </th>
                  <th className="p-3.5 border-r border-slate-200 text-center">
                    EmbCtdo
                  </th>
                  <th className="p-3.5 border-r border-slate-200 text-right">
                    Total
                  </th>
                  <th className="p-3.5 text-right">KG Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filasResumen.map((f, i) => {
                  const tMonto =
                    (f.totalMontoCredito || 0) + (f.totalMontoContado || 0);
                  const tKg = (f.totalkgCredito || 0) + (f.totalkgContado || 0);
                  return (
                    <tr
                      key={i}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="p-3 border-r border-slate-100 font-semibold text-slate-800">
                        {f.ruta || "-"}
                      </td>
                      <td className="p-3 border-r border-slate-100 text-slate-600 font-medium">
                        {f.unidad || "-"}
                      </td>
                      <td className="p-3 border-r border-slate-100 text-slate-700 uppercase font-medium">
                        {f.chofer || "-"}
                      </td>
                      <td className="p-3 border-r border-slate-100 text-center text-slate-600 font-mono">
                        {f.embarqueCredito || "0"}
                      </td>
                      <td className="p-3 border-r border-slate-100 text-center text-slate-600 font-mono">
                        {f.embarqueContado || "0"}
                      </td>
                      <td className="p-3 border-r border-slate-100 text-right font-bold text-emerald-700">
                        {formatoMoneda(tMonto)}
                      </td>
                      <td className="p-3 text-right font-bold text-blue-700">
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
