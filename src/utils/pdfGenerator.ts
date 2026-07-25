// src/utils/pdfGenerator.ts
// src/utils/pdfGenerator.ts
import type { FilaReporte } from "../components/ReporteEmbarques";

// -------------------------------------------------------------
// INTERFAZ PARA RECIBIR LOS TOTALES EN EL PDF FINANCIERO
// -------------------------------------------------------------
export interface TotalesReporte {
  cred: number;
  ctdo: number;
  monto: number;
  kg: number;
}

// -------------------------------------------------------------
// HELPERS INTERNOS PARA FORMATOS (Se mudan aquí para no estorbar)
// -------------------------------------------------------------
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

const obtenerFechaFormateada = (fechaSalida: string) => {
  const fechaObj = new Date(fechaSalida + "T00:00:00");
  return fechaObj.toLocaleDateString("es-MX", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

// =========================================================================
// FUNCIÓN 1: GENERAR PDF FINANCIERO (RELACIÓN DE SALIDA)
// =========================================================================
export const generarPDFFinanciero = async (
  datosProcesados: FilaReporte[],
  fechaSalida: string,
  totales: TotalesReporte,
) => {
  const pdfMake = (window as any).pdfMake;
  if (!pdfMake) {
    alert(
      "El generador de PDF está cargando... intenta de nuevo en un segundo.",
    );
    return;
  }

  const logoBase64 = await obtenerLogoBase64Local("/CIRLogo.png");

  const tableBody = [
    [
      { text: "Ruta Asignada", style: "tableHeader" },
      { text: "Un.", style: "tableHeader", alignment: "center" },
      { text: "Chofer", style: "tableHeader" },
      { text: "Emb. Crédito", style: "tableHeader", alignment: "center" },
      { text: "Emb. Contado", style: "tableHeader", alignment: "center" },
      { text: "Monto Total", style: "tableHeader", alignment: "right" },
      { text: "Peso (KG)", style: "tableHeader", alignment: "right" },
    ],
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
        text: totales.cred.toString(),
        style: "tableFooter",
        alignment: "center",
      },
      {
        text: totales.ctdo.toString(),
        style: "tableFooter",
        alignment: "center",
      },
      {
        text: formatearMoneda(totales.monto),
        style: "tableFooterTotal",
        alignment: "right",
      },
      {
        text: formatearNumero(totales.kg),
        style: "tableFooter",
        alignment: "right",
      },
    ],
  ];

  const docDefinition: any = {
    pageOrientation: "landscape",
    pageMargins: [30, 25, 30, 25],
    content: [
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
                text: obtenerFechaFormateada(fechaSalida).toUpperCase(),
                style: "headerDate",
                alignment: "right",
              },
            ],
            margin: [0, 5, 0, 0],
          },
        ],
        margin: [0, 0, 0, 10],
      },
      {
        table: {
          headerRows: 1,
          widths: ["auto", "auto", "*", "auto", "auto", "auto", "auto"],
          body: tableBody,
        },
        layout: {
          fillColor: function (rowIndex: number, node: any) {
            if (rowIndex === 0) return "#1e293b";
            if (rowIndex === node.table.body.length - 1) return "#ffffff";
            return rowIndex % 2 === 0 ? "#f8fafc" : "#ffffff";
          },
          hLineWidth: function (i: number, node: any) {
            if (i === 0 || i === 1) return 1;
            if (i === node.table.body.length - 1) return 1.5;
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
    defaultStyle: { fontSize: 8.5, font: "Roboto" },
  };

  pdfMake
    .createPdf(docDefinition)
    .download(`Relacion_Salida_${fechaSalida}.pdf`);
};

// =========================================================================
// FUNCIÓN 2: GENERAR PDF DE TRIPULACIÓN Y AYUDANTES
// =========================================================================
export const generarPDFTripulacion = async (
  datosProcesados: FilaReporte[],
  fechaSalida: string,
) => {
  const pdfMake = (window as any).pdfMake;
  if (!pdfMake) {
    alert(
      "El generador de PDF está cargando... intenta de nuevo en un segundo.",
    );
    return;
  }

  const logoBase64 = await obtenerLogoBase64Local("/CIRLogo.png");

  const totalChoferes = datosProcesados.filter(
    (f) => f.chofer && f.chofer.trim() !== "" && f.chofer !== "-",
  ).length;

  const totalAyudantes1 = datosProcesados.filter(
    (f) =>
      f.ayudante1 &&
      f.ayudante1.trim() !== "" &&
      f.ayudante1 !== "-" &&
      f.ayudante1.toUpperCase() !== "SIN AYUDANTE",
  ).length;

  const totalAyudantes2 = datosProcesados.filter(
    (f) =>
      f.ayudante2 &&
      f.ayudante2.trim() !== "" &&
      f.ayudante2 !== "-" &&
      f.ayudante2.toUpperCase() !== "SIN AYUDANTE",
  ).length;

  const totalGeneralAyudantes = totalAyudantes1 + totalAyudantes2;

  const tableBody = [
    [
      { text: "Un.", style: "tableHeader", alignment: "center" },
      { text: "Ruta Asignada", style: "tableHeader" },
      { text: "Chofer", style: "tableHeader" },
      { text: "Emb. Crédito", style: "tableHeader", alignment: "center" },
      { text: "Emb. Contado", style: "tableHeader", alignment: "center" },
      { text: "Ayudante 1", style: "tableHeader" },
      { text: "Ayudante 2", style: "tableHeader" },
    ],
    ...datosProcesados.map((fila) => [
      {
        text: fila.unidad,
        alignment: "center",
        bold: true,
        style: "tableCell",
      },
      {
        text: fila.ruta || "SIN ASIGNAR",
        style: !fila.ruta ? "textoGris" : "tableCell",
      },
      { text: fila.chofer || "-", style: "tableCell" },
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
      { text: fila.ayudante1 || "-", style: "tableCell" },
      { text: fila.ayudante2 || "-", style: "tableCell" },
    ]),
    [
      {
        text: `TOTALES: ${datosProcesados.length} Unidades`,
        colSpan: 2,
        style: "tableFooter",
        alignment: "left",
      },
      {},
      {
        text: `Choferes: ${totalChoferes}`,
        style: "tableFooter",
        alignment: "left",
      },
      {
        text: `Total Ayudantes: ${totalGeneralAyudantes}`,
        colSpan: 4,
        style: "tableFooter",
        alignment: "left",
      },
      {},
      {},
      {},
    ],
  ];

  const docDefinition: any = {
    pageOrientation: "landscape",
    pageMargins: [30, 25, 30, 25],
    content: [
      {
        columns: [
          logoBase64
            ? { image: logoBase64, width: 110 }
            : { text: "ORGANIZACIÓN CIR", style: "headerTitle" },
          {
            stack: [
              {
                text: "CONTROL DE TRIPULACIÓN Y EMBARQUES",
                style: "headerTitle",
                alignment: "right",
              },
              {
                text: obtenerFechaFormateada(fechaSalida).toUpperCase(),
                style: "headerDate",
                alignment: "right",
              },
            ],
            margin: [0, 5, 0, 0],
          },
        ],
        margin: [0, 0, 0, 10],
      },
      {
        table: {
          headerRows: 1,
          widths: ["auto", "*", "*", "auto", "auto", "*", "*"],
          body: tableBody,
        },
        layout: {
          fillColor: function (rowIndex: number, node: any) {
            if (rowIndex === 0) return "#065f46";
            if (rowIndex === node.table.body.length - 1) return "#f1f5f9";
            return rowIndex % 2 === 0 ? "#f0fdf4" : "#ffffff";
          },
          hLineWidth: function (i: number, node: any) {
            if (i === 0 || i === 1) return 1;
            if (i === node.table.body.length - 1) return 1.5;
            return 0.4;
          },
          vLineWidth: function () {
            return 0;
          },
          hLineColor: function (i: number, node: any) {
            if (i === 0 || i === 1) return "#065f46";
            if (i === node.table.body.length - 1) return "#cbd5e1";
            return "#d1fae5";
          },
          paddingTop: function () {
            return 5;
          },
          paddingBottom: function () {
            return 5;
          },
          paddingLeft: function () {
            return 6;
          },
          paddingRight: function () {
            return 6;
          },
        },
      },
    ],
    styles: {
      headerTitle: { fontSize: 15, bold: true, color: "#0f172a" },
      headerDate: { fontSize: 10, color: "#64748b", bold: true },
      tableHeader: { bold: true, fontSize: 9, color: "#ffffff" },
      tableCell: { fontSize: 8.5, color: "#334155" },
      tableFooter: { bold: true, fontSize: 9, color: "#0f172a" },
      textoGris: { fontSize: 8.5, color: "#94a3b8", italics: true },
    },
    defaultStyle: { fontSize: 8.5, font: "Roboto" },
  };

  pdfMake
    .createPdf(docDefinition)
    .download(`Control_Tripulacion_${fechaSalida}.pdf`);
};
