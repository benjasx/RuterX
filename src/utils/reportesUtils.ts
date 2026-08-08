import * as XLSX from "xlsx";
import { obtenerLogoBase64Local } from "./mapaUtils";

export const exportarExcelAdmin = (
  rutaOptima: any[],
  rutaSeleccionada: string,
) => {
  if (!rutaOptima || rutaOptima.length === 0) return;
  const datosExcel = rutaOptima.map((c, i) => ({
    "Orden de Visita": i + 1,
    "Nombre del Cliente": c.nombre,
    Domicilio: c.descripcion,
    Ruta: c.ruta,
    Vendedor: c.vendedor,
    Notas: "",
  }));
  const ws = XLSX.utils.json_to_sheet(datosExcel);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Hoja de Ruta");
  XLSX.writeFile(
    wb,
    `Ruta_Optima_${rutaSeleccionada}_${new Date().toISOString().split("T")[0]}.xlsx`,
  );
};

export const exportarPDFAdmin = async (
  rutaOptima: any[],
  rutaSeleccionada: string,
) => {
  if (!rutaOptima || rutaOptima.length === 0) return;
  const pdfMake = (window as any).pdfMake;
  if (!pdfMake) return alert("Generador PDF cargando...");

  const logoBase64 = await obtenerLogoBase64Local("/CIRLogo.png");

  const tableBody: any[][] = [
    [
      { text: "N°", style: "th", alignment: "center" },
      { text: "Cliente", style: "th" },
      { text: "Domicilio", style: "th" },
      { text: "Notas", style: "th" },
      { text: "Entrega", style: "th", alignment: "center" },
    ],
  ];

  rutaOptima.forEach((cliente, index) => {
    tableBody.push([
      { text: `${index + 1}`, style: "td", alignment: "center" },
      { text: cliente.nombre, style: "td", bold: true },
      { text: cliente.descripcion, style: "td" },
      { text: "", style: "td" },
      { text: "[   ]", style: "tdCheckbox", alignment: "center" },
    ]);
  });

  const docDefinition = {
    pageOrientation: "portrait",
    pageMargins: [30, 30, 30, 30],
    content: [
      {
        columns: [
          logoBase64
            ? { image: logoBase64, width: 70 }
            : { text: "CIR", bold: true },
          {
            text: `HOJA DE RUTA ÓPTIMA\nRUTA: ${rutaSeleccionada}`,
            style: "mainTitle",
            alignment: "right",
            margin: [0, 5, 0, 0],
          },
        ],
        margin: [0, 0, 0, 15],
      },
      {
        text: "Nombre del Chofer: ________________________________________________________    Firma: ________________________",
        fontSize: 10,
        bold: true,
        color: "#334155",
        margin: [0, 0, 0, 10],
      },
      {
        text: `Fecha de emisión: ${new Date().toLocaleDateString("es-MX")} - Total a visitar: ${rutaOptima.length} clientes.`,
        fontSize: 9,
        color: "#475569",
        margin: [0, 0, 0, 10],
      },
      {
        table: {
          headerRows: 1,
          widths: ["auto", "25%", "*", "20%", "auto"],
          body: tableBody,
        },
        layout: "lightHorizontalLines",
      },
    ],
    styles: {
      mainTitle: { fontSize: 13, bold: true, color: "#1e293b" },
      th: {
        bold: true,
        fontSize: 10,
        fillColor: "#2563eb",
        color: "white",
        margin: 4,
      },
      td: { fontSize: 9, margin: 4, color: "#334155" },
      tdCheckbox: { fontSize: 12, margin: 4, color: "#94a3b8", bold: true },
    },
  };
  pdfMake
    .createPdf(docDefinition)
    .download(`Ruta_Logistica_${rutaSeleccionada}.pdf`);
};

export const generarPDFFinalChofer = async (
  viaje: any,
  datosCierre: any,
  nombreChoferConectado: string,
) => {
  const pdfMake = (window as any).pdfMake;
  if (!pdfMake) return alert("Generador PDF cargando...");

  const logoBase64 = await obtenerLogoBase64Local("/CIRLogo.png");

  const tableBody: any[][] = [
    [
      { text: "Cliente", style: "th" },
      { text: "Dirección", style: "th" },
      { text: "Estatus", style: "th", alignment: "center" },
      { text: "Hora Modif.", style: "th", alignment: "center" },
    ],
  ];

  const clientesOrdenados = [...viaje.clientes].sort(
    (a, b) => (a.orden || 0) - (b.orden || 0),
  );
  let entregados = 0,
    cancelados = 0,
    noEntregados = 0,
    pendientes = 0;

  clientesOrdenados.forEach((c) => {
    let estatusStr = c.estado_entrega || "pendiente";
    let colorEstatus = "#334155";

    if (estatusStr === "entregado") {
      entregados++;
      colorEstatus = "#16a34a";
    } else if (estatusStr === "cancelado") {
      cancelados++;
      colorEstatus = "#dc2626";
    } else if (estatusStr === "no_entregado") {
      noEntregados++;
      colorEstatus = "#ca8a04";
    } else {
      pendientes++;
      colorEstatus = "#2563eb";
    }

    tableBody.push([
      { text: c.nombre, style: "td", bold: true },
      { text: c.descripcion, style: "td" },
      {
        text: estatusStr.replace("_", " ").toUpperCase(),
        style: "td",
        color: colorEstatus,
        bold: true,
        alignment: "center",
      },
      { text: c.hora_entrega || "--:--", style: "td", alignment: "center" },
    ]);
  });

  const fechaHoy = new Date().toLocaleDateString("es-MX");

  const docDefinition = {
    pageOrientation: "portrait",
    pageMargins: [30, 30, 30, 30],
    content: [
      {
        columns: [
          logoBase64
            ? { image: logoBase64, width: 70 }
            : { text: "CIR", bold: true },
          {
            text: `REPORTE FINAL DE VIAJE\nRUTA ASIGNADA: ${viaje.ruta_nombre}`,
            style: "mainTitle",
            alignment: "right",
            margin: [0, 5, 0, 0],
          },
        ],
        margin: [0, 0, 0, 10],
      },
      {
        columns: [
          {
            text: `Responsable: ${nombreChoferConectado}`,
            fontSize: 10,
            bold: true,
            color: "#475569",
          },
          {
            text: `Fecha: ${fechaHoy}`,
            fontSize: 10,
            alignment: "right",
            color: "#475569",
          },
        ],
        margin: [0, 0, 0, 3],
      },
      {
        columns: [
          {
            text: `Ruta Realizada: ${datosCierre.rutaReal}`,
            fontSize: 10,
            bold: true,
            color: "#475569",
          },
          {
            text: `Unidad: ${datosCierre.unidad}`,
            fontSize: 10,
            alignment: "right",
            bold: true,
            color: "#475569",
          },
        ],
        margin: [0, 0, 0, 5],
      },
      {
        text: `Condición de cierre: ${datosCierre.motivo.toUpperCase()}`,
        fontSize: 10,
        bold: true,
        color: "#dc2626",
        margin: [0, 0, 0, 5],
      },
      {
        text: `Folios no embarcados: ${datosCierre.foliosNoEmbarcados || "Ninguno"}`,
        fontSize: 10,
        bold: true,
        color: "#d97706",
        margin: [0, 0, 0, 15],
      },
      {
        table: {
          widths: ["*", "*", "*", "*"],
          body: [
            [
              { text: `Entregados: ${entregados}`, style: "summaryEn" },
              { text: `Cancelados: ${cancelados}`, style: "summaryCa" },
              { text: `No Entreg.: ${noEntregados}`, style: "summaryNo" },
              { text: `Pendientes: ${pendientes}`, style: "summaryPe" },
            ],
          ],
        },
        layout: "noBorders",
        margin: [0, 0, 0, 15],
      },
      {
        table: {
          headerRows: 1,
          widths: ["30%", "40%", "15%", "15%"],
          body: tableBody,
        },
        layout: "lightHorizontalLines",
      },
    ],
    styles: {
      mainTitle: { fontSize: 13, bold: true, color: "#1e293b" },
      th: {
        bold: true,
        fontSize: 9,
        fillColor: "#1e293b",
        color: "white",
        margin: 4,
      },
      td: { fontSize: 8, margin: 4, color: "#334155" },
      summaryEn: {
        fontSize: 10,
        bold: true,
        color: "#16a34a",
        alignment: "center",
      },
      summaryCa: {
        fontSize: 10,
        bold: true,
        color: "#dc2626",
        alignment: "center",
      },
      summaryNo: {
        fontSize: 10,
        bold: true,
        color: "#ca8a04",
        alignment: "center",
      },
      summaryPe: {
        fontSize: 10,
        bold: true,
        color: "#2563eb",
        alignment: "center",
      },
    },
  };

  pdfMake
    .createPdf(docDefinition)
    .download(`Cierre_Ruta_${datosCierre.rutaReal}_${fechaHoy}.pdf`);
};
