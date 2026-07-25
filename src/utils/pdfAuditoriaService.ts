// src/utils/pdfAuditoriaService.ts

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
    return null;
  }
};

const fMoneda = (c: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(
    c,
  );
const fNumero = (c: number) =>
  new Intl.NumberFormat("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(c);

const MASTER_COLUMNS = [
  { id: "fecha", text: "FECHA", style: "th", width: "auto" },
  { id: "unidad", text: "UN.", style: "th", width: "auto", align: "center" },
  { id: "ruta", text: "RUTA", style: "th", width: "auto" },
  { id: "embCred", text: "F. CRED", style: "th", width: "auto" },
  { id: "embCtdo", text: "F. CTDO", style: "th", width: "auto" },
  { id: "chofer", text: "CHOFER", style: "th", width: "*" },
  { id: "ayudante1", text: "AYUDANTE 1", style: "th", width: "*" },
  { id: "ayudante2", text: "AYUDANTE 2", style: "th", width: "*" },
  {
    id: "kgTotal",
    text: "PESO (KG)",
    style: "thFin",
    width: "auto",
    align: "right",
  },
  {
    id: "totalMonto",
    text: "VENTA",
    style: "thFin",
    width: "auto",
    align: "right",
  },
  {
    id: "viaticoRuta",
    text: "VIÁTICO",
    style: "thFin",
    width: "auto",
    align: "right",
  },
  {
    id: "comisionChofer",
    text: "COM. CH.",
    style: "thFin",
    width: "auto",
    align: "right",
  },
  // 🚀 AQUÍ ESPECIFICAMOS QUE ES EL TOTAL DE LOS AYUDANTES
  {
    id: "comisionAyudante",
    text: "TOTAL COM. AY.",
    style: "thFin",
    width: "auto",
    align: "right",
  },
];

export const generarPDFAuditoria = async (
  viajes: any[],
  fechaInicio: string,
  fechaFin: string,
  busqueda: string,
  totales: any,
  columnasActivas: Record<string, boolean>,
) => {
  const pdfMake = (window as any).pdfMake;
  if (!pdfMake) return alert("Generador PDF cargando...");
  const logoBase64 = await obtenerLogoBase64Local("/CIRLogo.png");

  const columnasExportar = MASTER_COLUMNS.filter(
    (col) => columnasActivas[col.id],
  );
  const pdfWidths = columnasExportar.map((col) => col.width);

  const tableBody: any[][] = [
    columnasExportar.map((col) => ({
      text: col.text,
      style: col.style,
      alignment: col.align || "left",
    })),
  ];

  viajes.forEach((v) => {
    const row: any[] = [];

    let comisionTotalAyudantesRuta = 0;
    if (v.ayudante1 && v.ayudante1 !== "-")
      comisionTotalAyudantesRuta += Number(v.comisionAyudante) || 0;
    if (v.ayudante2 && v.ayudante2 !== "-")
      comisionTotalAyudantesRuta += Number(v.comisionAyudante) || 0;

    if (columnasActivas.fecha) row.push({ text: v.fecha, style: "td" });
    if (columnasActivas.unidad)
      row.push({
        text: v.unidad,
        style: "td",
        alignment: "center",
        bold: true,
      });
    if (columnasActivas.ruta) row.push({ text: v.ruta, style: "td" });
    if (columnasActivas.embCred)
      row.push({ text: v.embCred, style: "td", color: "#64748b" });
    if (columnasActivas.embCtdo)
      row.push({ text: v.embCtdo, style: "td", color: "#64748b" });
    if (columnasActivas.chofer)
      row.push({ text: v.chofer, style: "td", bold: true });
    if (columnasActivas.ayudante1)
      row.push({
        text: v.ayudante1 !== "-" ? v.ayudante1 : "",
        style: "tdAyudante",
      });
    if (columnasActivas.ayudante2)
      row.push({
        text: v.ayudante2 !== "-" ? v.ayudante2 : "",
        style: "tdAyudante",
      });

    if (columnasActivas.kgTotal)
      row.push({
        text: fNumero(v.kgTotal),
        style: "tdNum",
        alignment: "right",
        color: "#1d4ed8",
      });
    if (columnasActivas.totalMonto)
      row.push({
        text: fMoneda(v.totalMonto),
        style: "tdNum",
        alignment: "right",
        color: "#047857",
      });
    if (columnasActivas.viaticoRuta)
      row.push({
        text: fMoneda(v.viaticoRuta),
        style: "tdNum",
        alignment: "right",
      });
    if (columnasActivas.comisionChofer)
      row.push({
        text: fMoneda(v.comisionChofer),
        style: "tdNum",
        alignment: "right",
        color: "#047857",
      });
    if (columnasActivas.comisionAyudante)
      row.push({
        text: fMoneda(comisionTotalAyudantesRuta),
        style: "tdNum",
        alignment: "right",
        color: "#047857",
      });

    tableBody.push(row);
  });

  const infoCols = [
    "fecha",
    "unidad",
    "ruta",
    "embCred",
    "embCtdo",
    "chofer",
    "ayudante1",
    "ayudante2",
  ];
  const numInfoColsActive = infoCols.filter(
    (col) => columnasActivas[col],
  ).length;

  if (numInfoColsActive > 0) {
    const totalRow: any[] = [];
    totalRow.push({
      text: `TOTAL ACUMULADO (${viajes.length} VIAJES)`,
      colSpan: numInfoColsActive,
      style: "thTotal",
      alignment: "right",
    });

    for (let i = 1; i < numInfoColsActive; i++) {
      totalRow.push({});
    }

    if (columnasActivas.kgTotal)
      totalRow.push({
        text: fNumero(totales.kg),
        style: "thTotalKg",
        alignment: "right",
      });
    if (columnasActivas.totalMonto)
      totalRow.push({
        text: fMoneda(totales.monto),
        style: "thTotal",
        alignment: "right",
      });
    if (columnasActivas.viaticoRuta)
      totalRow.push({
        text: fMoneda(totales.viaticos),
        style: "thTotal",
        alignment: "right",
      });
    if (columnasActivas.comisionChofer)
      totalRow.push({
        text: fMoneda(totales.comisionChofer),
        style: "thTotal",
        alignment: "right",
      });
    if (columnasActivas.comisionAyudante)
      totalRow.push({
        text: fMoneda(totales.comisionAyudante),
        style: "thTotal",
        alignment: "right",
      });

    tableBody.push(totalRow);
  }

  let subtitulo = `Periodo del ${fechaInicio} al ${fechaFin}`;
  if (busqueda.trim() !== "")
    subtitulo += ` | Filtro: "${busqueda.toUpperCase()}"`;

  const contentBlocks = [
    {
      columns: [
        logoBase64 ? { image: logoBase64, width: 80 } : { text: "CIR" },
        {
          text: `AUDITORÍA DE SALIDAS PERSONALIZADA\n`,
          style: "mainTitle",
          alignment: "right",
          margin: [0, 5, 0, 0],
        },
      ],
      margin: [0, 0, 0, 5],
    },
    {
      text: subtitulo,
      alignment: "right",
      fontSize: 9,
      color: "#64748b",
      margin: [0, 0, 0, 15],
      italics: true,
    },
    {
      table: { headerRows: 1, widths: pdfWidths, body: tableBody },
      layout: "lightHorizontalLines",
    },
  ];

  pdfMake
    .createPdf({
      pageOrientation: "landscape",
      pageMargins: [20, 30, 20, 30],
      content: contentBlocks,
      styles: {
        mainTitle: { fontSize: 14, bold: true, color: "#1e293b" },
        th: {
          bold: true,
          fontSize: 7,
          fillColor: "#1e293b",
          color: "white",
          margin: [2, 4, 2, 4],
        },
        thFin: {
          bold: true,
          fontSize: 7,
          fillColor: "#065f46",
          color: "white",
          margin: [2, 4, 2, 4],
        },
        td: { fontSize: 7, margin: [2, 4, 2, 4] },
        tdAyudante: { fontSize: 6, margin: [2, 4, 2, 4], color: "#475569" },
        tdNum: { fontSize: 7, bold: true, margin: [2, 4, 2, 4] },
        thTotal: {
          bold: true,
          fontSize: 8,
          fillColor: "#1e293b",
          color: "white",
          margin: [2, 6, 2, 6],
        },
        thTotalKg: {
          bold: true,
          fontSize: 8,
          fillColor: "#1e3a8a",
          color: "white",
          margin: [2, 6, 2, 6],
        },
      },
    })
    .download(`Reporte_Personalizado_${fechaInicio}.pdf`);
};
