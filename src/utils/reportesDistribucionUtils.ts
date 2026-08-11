// ============================================================================
// PDF: REPORTE DE DISTRIBUCIÓN DIARIA (HORIZONTAL / LANDSCAPE)
// ============================================================================
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

export const exportarDistribucionPDF = async (filas: any[], fecha: string) => {
  const pdfMake = (window as any).pdfMake;
  if (!pdfMake) return alert("Generador PDF cargando...");
  const logoBase64 = await obtenerLogoBase64Local("/CIRLogo.png");

  // CÁLCULO DE RESUMEN OPERATIVO
  let totalRutas = 0; // Se mantiene el contador correcto
  const choferesSet = new Set<string>();
  const auxiliaresSet = new Set<string>();
  const unidadesSet = new Set<string>();

  filas.forEach((f) => {
    // Sumamos 1 por cada fila que sí tenga una ruta escrita
    if (f.ruta && f.ruta.trim() !== "") {
      totalRutas++;
    }

    // El personal y las unidades
    if (f.chofer && f.chofer.trim() !== "")
      choferesSet.add(f.chofer.toUpperCase().trim());
    if (
      f.auxiliar1 &&
      f.auxiliar1 !== "-- SIN AUXILIAR ASIGNADO --" &&
      f.auxiliar1.trim() !== ""
    )
      auxiliaresSet.add(f.auxiliar1.toUpperCase().trim());
    if (
      f.auxiliar2 &&
      f.auxiliar2 !== "-- SIN AUXILIAR ASIGNADO --" &&
      f.auxiliar2.trim() !== ""
    )
      auxiliaresSet.add(f.auxiliar2.toUpperCase().trim());
    if (f.unidad && f.unidad.trim() !== "")
      unidadesSet.add(f.unidad.toUpperCase().trim());
  });

  const totalChoferes = choferesSet.size;
  const totalAuxiliares = auxiliaresSet.size;
  const totalUnidadesUsadas = unidadesSet.size;

  // Construcción de la tabla principal
  const headerRow: any[] = [
    { text: "Ruta", style: "th" },
    { text: "Un.", style: "th", alignment: "center" },
    { text: "Chofer", style: "th" },
    { text: "Auxiliar 1", style: "th" },
    { text: "Auxiliar 2", style: "th" },
    { text: "Emb. Crédito", style: "th", alignment: "center" },
    { text: "Emb. Contado", style: "th", alignment: "center" },
  ];

  const tableBody: any[][] = [headerRow];

  filas.forEach((f) => {
    // Evitamos imprimir filas que estén completamente en blanco
    if (!f.ruta && !f.chofer && !f.unidad) return;

    const row: any[] = [
      { text: (f.ruta || "-").toUpperCase(), style: "td" },
      {
        text: (f.unidad || "-").toUpperCase(),
        style: "td",
        alignment: "center",
      },
      { text: (f.chofer || "-").toUpperCase(), style: "td" },
      {
        text: (f.auxiliar1 && f.auxiliar1 !== "-- SIN AUXILIAR ASIGNADO --"
          ? f.auxiliar1
          : "SIN AUXILIAR"
        ).toUpperCase(),
        style: "td",
      },
      {
        text: (f.auxiliar2 && f.auxiliar2 !== "-- SIN AUXILIAR ASIGNADO --"
          ? f.auxiliar2
          : "SIN AUXILIAR"
        ).toUpperCase(),
        style: "td",
      },
      {
        text: (f.embarqueCredito || "-").toUpperCase(),
        style: "td",
        alignment: "center",
      },
      {
        text: (f.embarqueContado || "-").toUpperCase(),
        style: "td",
        alignment: "center",
      },
    ];
    tableBody.push(row);
  });

  const contentBlocks = [
    // 1. ENCABEZADO CON LOGO Y FECHA
    {
      columns: [
        logoBase64
          ? { image: logoBase64, width: 65 }
          : { text: "CIR", bold: true },
        {
          stack: [
            {
              text: "RUTERX - REPORTE LOGÍSTICO",
              fontSize: 14,
              bold: true,
              alignment: "right",
            },
            {
              text: "TABLA DE DISTRIBUCIÓN DIARIA",
              fontSize: 11,
              bold: true,
              color: "#2563eb",
              alignment: "right",
              margin: [0, 2, 0, 0],
            },
            {
              text: `FECHA PROGRAMADA DE SALIDA: ${fecha}`,
              fontSize: 9,
              bold: true,
              color: "#475569",
              alignment: "right",
              margin: [0, 4, 0, 0],
            },
          ],
        },
      ],
      margin: [0, 0, 0, 10],
    },
    {
      canvas: [
        {
          type: "line",
          x1: 0,
          y1: 0,
          x2: 732,
          y2: 0,
          lineWidth: 1,
          lineColor: "#cbd5e1",
        },
      ],
      margin: [0, 0, 0, 10],
    },

    // 2. SECCIÓN DE RESUMEN EJECUTIVO (TARJETAS - De vuelta arriba)
    {
      text: "RESUMEN GENERAL DE LA JORNADA",
      fontSize: 9,
      bold: true,
      color: "#0f172a",
      margin: [0, 0, 0, 5],
      unbreakable: true,
    },
    {
      table: {
        widths: ["*", "*", "*", "*"],
        body: [
          [
            { text: "TOTAL RUTAS", style: "summaryTitle" },
            { text: "TOTAL CHOFERES", style: "summaryTitle" },
            { text: "TOTAL AUXILIARES", style: "summaryTitle" },
            { text: "UNIDADES EN USO", style: "summaryTitle" },
          ],
          [
            { text: `${totalRutas}`, style: "summaryValue" },
            { text: `${totalChoferes}`, style: "summaryValue" },
            { text: `${totalAuxiliares}`, style: "summaryValue" },
            { text: `${totalUnidadesUsadas}`, style: "summaryValue" },
          ],
        ],
      },
      layout: {
        fillColor: function (rowIndex: number) {
          return rowIndex === 0 ? "#0f172a" : "#f8fafc";
        },
        hLineWidth: function () {
          return 1;
        },
        vLineWidth: function () {
          return 1;
        },
        hLineColor: function () {
          return "#e2e8f0";
        },
        vLineColor: function () {
          return "#e2e8f0";
        },
        paddingTop: function () {
          return 5;
        },
        paddingBottom: function () {
          return 5;
        },
      },
      unbreakable: true,
      margin: [0, 0, 0, 15],
    },

    // 3. TABLA PRINCIPAL DE DISTRIBUCIÓN
    {
      text: "DETALLE DE ASIGNACIONES",
      fontSize: 9,
      bold: true,
      color: "#0f172a",
      margin: [0, 0, 0, 5],
    },
    {
      table: {
        headerRows: 1,
        widths: ["*", 40, "*", "*", "*", 80, 80],
        body: tableBody,
      },
      layout: "lightHorizontalLines",
    },
  ];

  pdfMake
    .createPdf({
      pageOrientation: "landscape",
      pageMargins: [30, 30, 30, 30],
      content: contentBlocks,
      styles: {
        th: {
          bold: true,
          fontSize: 8.5,
          fillColor: "#0f172a",
          color: "white",
          margin: 4,
        },
        td: { fontSize: 8, margin: 4 },
        summaryTitle: {
          fontSize: 8,
          bold: true,
          color: "white",
          alignment: "center",
          margin: 3,
        },
        summaryValue: {
          fontSize: 12,
          bold: true,
          color: "#0f172a",
          alignment: "center",
          margin: 3,
        },
      },
    })
    .download(`DISTRIBUCION_RUTAS_${fecha}.pdf`);
};
