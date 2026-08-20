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

  const documentDefinition = {
    pageOrientation: "portrait",
    pageMargins: [40, 40, 40, 40],
    content: [
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
                text: `REGISTRO DE ${tipoPeriodo.toUpperCase()}`,
                fontSize: 11,
                bold: true,
                color: "#0d9488",
                alignment: "right",
                margin: [0, 2, 0, 0],
              },
              {
                text: `FECHA DE EMISIÓN: ${fechaEmision}`,
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
            x2: 515,
            y2: 0,
            lineWidth: 1,
            lineColor: "#cbd5e1",
          },
        ],
        margin: [0, 0, 0, 15],
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
        margin: [0, 0, 0, 15],
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
          paddingTop: () => 5,
          paddingBottom: () => 5,
        },
        margin: [0, 0, 0, 6],
      },
      periodo.observaciones
        ? {
            text: `OBSERVACIONES: ${periodo.observaciones}`,
            fontSize: 8,
            italics: true,
            color: "#475569",
            margin: [0, 0, 0, 15],
          }
        : { text: "", margin: [0, 0, 0, 15] },

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
                paddingTop: () => 5,
                paddingBottom: () => 5,
              },
              margin: [0, 0, 0, 40] as [number, number, number, number],
            },
          ]
        : [{ text: "", margin: [0, 0, 0, 25] }]),

      {
        columns: [
          {
            stack: [
              { canvas: [{ type: "line", x1: 0, y1: 0, x2: 200, y2: 0, lineWidth: 1, lineColor: "#94a3b8" }] },
              { text: "FIRMA DEL EMPLEADO", fontSize: 8, alignment: "center", margin: [0, 4, 0, 0], color: "#475569" },
            ],
          },
          {
            stack: [
              { canvas: [{ type: "line", x1: 0, y1: 0, x2: 200, y2: 0, lineWidth: 1, lineColor: "#94a3b8" }] },
              { text: "AUTORIZÓ", fontSize: 8, alignment: "center", margin: [0, 4, 0, 0], color: "#475569" },
            ],
          },
        ],
      },
    ],
    styles: {
      labelTd: { fontSize: 7, bold: true, color: "#64748b", margin: [4, 3] },
      valueTd: { fontSize: 9, bold: true, color: "#0f172a", margin: [4, 1, 4, 6] },
      summaryTitle: { fontSize: 7, bold: true, color: "white", alignment: "center", margin: 2 },
      summaryValue: { fontSize: 12, bold: true, color: "#0f172a", alignment: "center", margin: 2 },
    },
  };

  pdfMake
    .createPdf(documentDefinition)
    .download(
      `${tipoPeriodo.replace(/\s+/g, "_")}_${(chofer.nombre || "empleado").replace(/\s+/g, "_")}_${periodo.fecha_inicio}.pdf`,
    );
};
