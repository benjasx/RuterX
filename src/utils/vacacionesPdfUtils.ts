import type { ResumenVacaciones } from "./vacacionesUtils";

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

interface PeriodoVacacionPDF {
  chofer_id: string;
  chofer_nombre: string;
  tipo?: string;
  fecha_inicio: string;
  fecha_fin: string;
  dias: number;
  observaciones?: string;
}

// Genera la constancia/registro individual de un periodo de vacaciones recién dado de alta.
// El PDF trae la misma información duplicada en dos mitades recortables: la copia para
// el jefe de reparto (archivo) y el comprobante para el trabajador (chofer/auxiliar).
export const exportarConstanciaVacacionesPDF = async (
  chofer: { nombre?: string; email?: string; tipo?: string; fecha_ingreso?: string },
  periodo: PeriodoVacacionPDF,
  resumen: ResumenVacaciones,
) => {
  const pdfMake = (window as any).pdfMake;
  if (!pdfMake) return alert("Generador PDF cargando...");

  const logoBase64 = await obtenerLogoBase64Local("/CIRLogo.png");
  const fechaEmision = new Date().toLocaleDateString("es-MX");
  const tipoPeriodo = periodo.tipo || "Vacaciones";
  const esVacaciones = tipoPeriodo === "Vacaciones";

  const construirCopia = (etiquetaCopia: string) => [
    {
      columns: [
        logoBase64
          ? { image: logoBase64, width: 50 }
          : { text: "CIR", bold: true },
        {
          stack: [
            {
              text: "RUTERX - REPORTE LOGÍSTICO",
              fontSize: 12,
              bold: true,
              alignment: "right",
            },
            {
              text: `REGISTRO DE ${tipoPeriodo.toUpperCase()}`,
              fontSize: 10,
              bold: true,
              color: "#0d9488",
              alignment: "right",
              margin: [0, 2, 0, 0],
            },
            {
              text: `FECHA DE EMISIÓN: ${fechaEmision}`,
              fontSize: 8,
              bold: true,
              color: "#475569",
              alignment: "right",
              margin: [0, 3, 0, 0],
            },
          ],
        },
      ],
      margin: [0, 0, 0, 6],
    },
    {
      table: { widths: ["*"], body: [[{ text: etiquetaCopia, style: "copiaLabel" }]] },
      layout: {
        fillColor: () => "#0f172a",
        hLineWidth: () => 0,
        vLineWidth: () => 0,
        paddingTop: () => 4,
        paddingBottom: () => 4,
      },
      margin: [0, 0, 0, 10],
    },

    { text: "DATOS DEL EMPLEADO", fontSize: 9, bold: true, color: "#0f172a", margin: [0, 0, 0, 5] },
    {
      table: {
        widths: ["*", "*"],
        body: [
          [
            { text: "NOMBRE", style: "labelTd" },
            { text: "ROL", style: "labelTd" },
          ],
          [
            { text: (chofer.nombre || "-").toUpperCase(), style: "valueTd" },
            { text: (chofer.tipo || "Chofer").toUpperCase(), style: "valueTd" },
          ],
          [
            { text: "CORREO", style: "labelTd" },
            { text: "FECHA DE INGRESO", style: "labelTd" },
          ],
          [
            { text: chofer.email || "-", style: "valueTd" },
            { text: chofer.fecha_ingreso || "-", style: "valueTd" },
          ],
        ],
      },
      layout: "lightHorizontalLines",
      margin: [0, 0, 0, 12],
    },

    { text: `PERIODO REGISTRADO: ${tipoPeriodo.toUpperCase()}`, fontSize: 9, bold: true, color: "#0f172a", margin: [0, 0, 0, 5] },
    {
      table: {
        widths: ["*", "*", "*"],
        body: [
          [
            { text: "DEL", style: "summaryTitle" },
            { text: "AL", style: "summaryTitle" },
            { text: "DÍAS", style: "summaryTitle" },
          ],
          [
            { text: periodo.fecha_inicio, style: "summaryValue" },
            { text: periodo.fecha_fin, style: "summaryValue" },
            { text: String(periodo.dias), style: "summaryValue" },
          ],
        ],
      },
      layout: {
        fillColor: (rowIndex: number) => (rowIndex === 0 ? "#0d9488" : "#f0fdfa"),
        hLineWidth: () => 1,
        vLineWidth: () => 1,
        hLineColor: () => "#e2e8f0",
        vLineColor: () => "#e2e8f0",
        paddingTop: () => 4,
        paddingBottom: () => 4,
      },
      margin: [0, 0, 0, 6],
    },
    periodo.observaciones
      ? {
          text: `OBSERVACIONES: ${periodo.observaciones}`,
          fontSize: 8,
          italics: true,
          color: "#475569",
          margin: [0, 0, 0, 10],
        }
      : { text: "", margin: [0, 0, 0, 10] },

    ...(esVacaciones
      ? [
          {
            text: "SALDO DE VACACIONES (AÑO EN CURSO)",
            fontSize: 9,
            bold: true,
            color: "#0f172a",
            margin: [0, 0, 0, 5] as [number, number, number, number],
          },
          {
            table: {
              widths: ["*", "*", "*"],
              body: [
                [
                  { text: "DÍAS POR LEY", style: "summaryTitle" },
                  { text: "DÍAS TOMADOS", style: "summaryTitle" },
                  { text: "DÍAS PENDIENTES", style: "summaryTitle" },
                ],
                [
                  { text: String(resumen.diasDerecho), style: "summaryValue" },
                  { text: String(resumen.diasTomados), style: "summaryValue" },
                  { text: String(resumen.diasPendientes), style: "summaryValue" },
                ],
              ],
            },
            layout: {
              fillColor: (rowIndex: number) => (rowIndex === 0 ? "#0f172a" : "#f8fafc"),
              hLineWidth: () => 1,
              vLineWidth: () => 1,
              hLineColor: () => "#e2e8f0",
              vLineColor: () => "#e2e8f0",
              paddingTop: () => 4,
              paddingBottom: () => 4,
            },
            margin: [0, 0, 0, 14] as [number, number, number, number],
          },
        ]
      : [{ text: "", margin: [0, 0, 0, 10] as [number, number, number, number] }]),

    {
      columns: [
        {
          stack: [
            { canvas: [{ type: "line", x1: 0, y1: 0, x2: 200, y2: 0, lineWidth: 1, lineColor: "#94a3b8" }] },
            { text: "FIRMA DEL EMPLEADO", fontSize: 7, alignment: "center", margin: [0, 4, 0, 0], color: "#475569" },
          ],
        },
        {
          stack: [
            { canvas: [{ type: "line", x1: 0, y1: 0, x2: 200, y2: 0, lineWidth: 1, lineColor: "#94a3b8" }] },
            { text: "AUTORIZÓ", fontSize: 7, alignment: "center", margin: [0, 4, 0, 0], color: "#475569" },
          ],
        },
      ],
    },
  ];

  const lineaCorte = [
    {
      canvas: [
        {
          type: "line",
          x1: 0,
          y1: 0,
          x2: 515,
          y2: 0,
          lineWidth: 1,
          lineColor: "#cbd5e1",
          dash: { length: 3, space: 3 },
        },
      ],
      margin: [0, 16, 0, 4],
    },
    {
      text: "✂  RECORTAR AQUÍ  ✂",
      fontSize: 7,
      bold: true,
      color: "#94a3b8",
      alignment: "center",
      margin: [0, 0, 0, 4],
    },
    {
      canvas: [
        {
          type: "line",
          x1: 0,
          y1: 0,
          x2: 515,
          y2: 0,
          lineWidth: 1,
          lineColor: "#cbd5e1",
          dash: { length: 3, space: 3 },
        },
      ],
      margin: [0, 0, 0, 16],
    },
  ];

  const documentDefinition = {
    pageOrientation: "portrait",
    pageMargins: [40, 30, 40, 30],
    content: [
      ...construirCopia("COPIA — JEFE DE REPARTO"),
      ...lineaCorte,
      ...construirCopia("COPIA — COMPROBANTE DEL EMPLEADO"),
    ],
    styles: {
      labelTd: { fontSize: 7, bold: true, color: "#64748b", margin: [4, 3] },
      valueTd: { fontSize: 9, bold: true, color: "#0f172a", margin: [4, 1, 4, 6] },
      summaryTitle: { fontSize: 7, bold: true, color: "white", alignment: "center", margin: 2 },
      summaryValue: { fontSize: 12, bold: true, color: "#0f172a", alignment: "center", margin: 2 },
      copiaLabel: { fontSize: 8, bold: true, color: "#ffffff", alignment: "center" },
    },
  };

  pdfMake
    .createPdf(documentDefinition)
    .download(
      `${tipoPeriodo.replace(/\s+/g, "_")}_${(chofer.nombre || "empleado").replace(/\s+/g, "_")}_${periodo.fecha_inicio}.pdf`,
    );
};

// Genera el PDF con el listado completo de periodos (vacaciones, incapacidades, permisos) filtrados.
export const exportarListadoVacacionesPDF = async (
  periodos: PeriodoVacacionPDF[],
  hoyStr: string,
) => {
  const pdfMake = (window as any).pdfMake;
  if (!pdfMake) return alert("Generador PDF cargando...");

  const logoBase64 = await obtenerLogoBase64Local("/CIRLogo.png");

  const bodyData = periodos.map((p, index) => {
    const esPar = index % 2 === 0;
    const bgFila = esPar ? "#ffffff" : "#f8fafc";
    const enCurso = p.fecha_inicio <= hoyStr && hoyStr <= p.fecha_fin;
    return [
      { text: (p.chofer_nombre || "-").toUpperCase(), style: "td", fillColor: bgFila },
      { text: (p.tipo || "Vacaciones").toUpperCase(), style: "tdCenter", fillColor: bgFila },
      { text: p.fecha_inicio, style: "tdCenter", fillColor: bgFila },
      { text: p.fecha_fin, style: "tdCenter", fillColor: bgFila },
      { text: String(p.dias), style: "tdCenter", fillColor: bgFila },
      { text: enCurso ? "EN CURSO" : "-", style: "tdCenter", fillColor: bgFila },
      { text: p.observaciones || "-", style: "td", fillColor: bgFila },
    ];
  });

  const documentDefinition = {
    pageOrientation: "landscape",
    pageMargins: [30, 30, 30, 30],
    content: [
      {
        columns: [
          logoBase64
            ? { image: logoBase64, width: 70 }
            : { text: "CIR", bold: true, fontSize: 18 },
          {
            text: `PERIODOS DE VACACIONES, INCAPACIDADES Y PERMISOS\n${new Date().toLocaleDateString("es-MX")}`,
            style: "mainTitle",
            alignment: "right",
            margin: [0, 5, 0, 0],
          },
        ],
        margin: [0, 0, 0, 20],
      },
      {
        table: {
          headerRows: 1,
          widths: ["*", "auto", "auto", "auto", "auto", "auto", "*"],
          body: [
            [
              { text: "EMPLEADO", style: "th" },
              { text: "TIPO", style: "th", alignment: "center" },
              { text: "DEL", style: "th", alignment: "center" },
              { text: "AL", style: "th", alignment: "center" },
              { text: "DÍAS", style: "th", alignment: "center" },
              { text: "ESTADO", style: "th", alignment: "center" },
              { text: "OBSERVACIONES", style: "th" },
            ],
            ...bodyData,
          ],
        },
        layout: "lightHorizontalLines",
      },
    ],
    styles: {
      mainTitle: { fontSize: 13, bold: true, color: "#0f172a" },
      th: {
        bold: true,
        fontSize: 8.5,
        fillColor: "#0f172a",
        color: "#ffffff",
        margin: [4, 4],
      },
      td: { fontSize: 8, color: "#334155", margin: [4, 4] },
      tdCenter: {
        fontSize: 8,
        color: "#334155",
        alignment: "center",
        margin: [4, 4],
      },
    },
  };

  const fechaStr = new Date().toLocaleDateString("sv-SE");
  pdfMake
    .createPdf(documentDefinition)
    .download(`Periodos_Vacaciones_${fechaStr}.pdf`);
};
