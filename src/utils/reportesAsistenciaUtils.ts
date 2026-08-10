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

export const exportarAsistenciaPDF = async (
  registros: any[],
  fecha: string,
) => {
  const pdfMake = (window as any).pdfMake;
  if (!pdfMake) return alert("Generador PDF cargando...");
  const logoBase64 = await obtenerLogoBase64Local("/CIRLogo.png");

  // CONTADORES DE ESTADOS
  let cA = 0,
    cRet = 0,
    cV = 0,
    cI = 0,
    cPcg = 0,
    cCap = 0,
    cPsg = 0,
    cDf = 0,
    cDs = 0,
    cF = 0,
    cS = 0;

  registros.forEach((r) => {
    const est = (r.estado || "A").toUpperCase();
    if (est === "A") cA++;
    else if (est === "RET") cRet++;
    else if (est === "V") cV++;
    else if (est === "I") cI++;
    else if (est === "PCG") cPcg++;
    else if (est === "CAP") cCap++;
    else if (est === "PSG") cPsg++;
    else if (est === "DF") cDf++;
    else if (est === "DS") cDs++;
    else if (est === "F") cF++;
    else if (est === "S") cS++;
  });

  const headerRow: any[] = [
    { text: "Personal", style: "th" },
    { text: "Puesto", style: "th", alignment: "center" },
    { text: "Estado", style: "th", alignment: "center" },
    { text: "Observaciones", style: "th" },
  ];

  const tableBody: any[][] = [headerRow];

  registros.forEach((r) => {
    tableBody.push([
      { text: (r.nombre || "-").toUpperCase(), style: "td" },
      {
        text: (r.puesto || "PERSONAL").toUpperCase(),
        style: "td",
        alignment: "center",
      },
      {
        text: (r.estado || "A").toUpperCase(),
        style: "tdBold",
        alignment: "center",
      },
      { text: (r.observaciones || "-").toUpperCase(), style: "td" },
    ]);
  });

  const contentBlocks = [
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
              text: "CONTROL DE ASISTENCIA DIARIA",
              fontSize: 11,
              bold: true,
              color: "#2563eb",
              alignment: "right",
              margin: [0, 2, 0, 0],
            },
            {
              text: `FECHA DE REGISTRO: ${fecha}`,
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
          x2: 535,
          y2: 0,
          lineWidth: 1,
          lineColor: "#cbd5e1",
        },
      ],
      margin: [0, 0, 0, 10],
    },

    // RESUMEN EJECUTIVO (2 FILAS)
    {
      text: "RESUMEN DE ASISTENCIA Y PERMISOS",
      fontSize: 9,
      bold: true,
      color: "#0f172a",
      margin: [0, 0, 0, 5],
    },
    {
      table: {
        widths: ["*", "*", "*", "*", "*", "*"],
        body: [
          [
            { text: "ASISTENCIAS (A)", style: "summaryTitle" },
            { text: "RETARDOS (RET)", style: "summaryTitle" },
            { text: "VACACIONES (V)", style: "summaryTitle" },
            { text: "INCAPACIDAD (I)", style: "summaryTitle" },
            { text: "PERM. GOCE (PCG)", style: "summaryTitle" },
            { text: "CAPACITACIÓN (CAP)", style: "summaryTitle" },
          ],
          [
            { text: `${cA}`, style: "summaryValue" },
            { text: `${cRet}`, style: "summaryValue" },
            { text: `${cV}`, style: "summaryValue" },
            { text: `${cI}`, style: "summaryValue" },
            { text: `${cPcg}`, style: "summaryValue" },
            { text: `${cCap}`, style: "summaryValue" },
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
          return 4;
        },
        paddingBottom: function () {
          return 4;
        },
      },
      margin: [0, 0, 0, 4],
    },
    {
      table: {
        widths: ["*", "*", "*", "*", "*", "*"],
        body: [
          [
            { text: "PERM. SIN GOCE (PSG)", style: "summaryTitle" },
            { text: "DÍA FESTIVO (DF)", style: "summaryTitle" },
            { text: "DESC. OBLIG. (DS)", style: "summaryTitle" },
            { text: "FALTAS (F)", style: "summaryTitle" },
            { text: "SUSPENSIÓN (S)", style: "summaryTitle" },
            { text: "TOTAL REGISTROS", style: "summaryTitle" },
          ],
          [
            { text: `${cPsg}`, style: "summaryValue" },
            { text: `${cDf}`, style: "summaryValue" },
            { text: `${cDs}`, style: "summaryValue" },
            { text: `${cF}`, style: "summaryValue" },
            { text: `${cS}`, style: "summaryValue" },
            { text: `${registros.length}`, style: "summaryValue" },
          ],
        ],
      },
      layout: {
        fillColor: function (rowIndex: number) {
          return rowIndex === 0 ? "#1e293b" : "#f8fafc";
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
          return 4;
        },
        paddingBottom: function () {
          return 4;
        },
      },
      margin: [0, 0, 0, 12],
    },

    {
      text: "DETALLE DE PERSONAL",
      fontSize: 9,
      bold: true,
      color: "#0f172a",
      margin: [0, 0, 0, 5],
    },
    {
      table: {
        headerRows: 1,
        widths: ["*", 90, 80, "*"],
        body: tableBody,
      },
      layout: "lightHorizontalLines",
    },
  ];

  pdfMake
    .createPdf({
      pageOrientation: "portrait",
      pageMargins: [40, 40, 40, 40],
      content: contentBlocks,
      styles: {
        th: {
          bold: true,
          fontSize: 8,
          fillColor: "#0f172a",
          color: "white",
          margin: 4,
        },
        td: { fontSize: 8, margin: 4 },
        tdBold: { fontSize: 8, bold: true, margin: 4 },
        summaryTitle: {
          fontSize: 7,
          bold: true,
          color: "white",
          alignment: "center",
          margin: 2,
        },
        summaryValue: {
          fontSize: 10,
          bold: true,
          color: "#0f172a",
          alignment: "center",
          margin: 2,
        },
      },
    })
    .download(`CONTROL_ASISTENCIA_${fecha}.pdf`);
};
