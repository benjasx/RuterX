import { obtenerLogoBase64Local } from "./mapaUtils";
import { notificarAdvertencia } from "./notificaciones";
import type { RentabilidadViaje } from "./rentabilidadUtils";

const fMoneda = (n: number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(n);

const fPct = (n: number) => `${n.toFixed(1)}%`;

// Recuadro de resumen (etiqueta + valor grande), mismo patrón que
// reportesDistribucionUtils.ts (recuadroResumen).
const recuadroResumen = (
  titulo: string,
  valor: string,
  colorTexto: string,
  fillColor: string,
  colorBorde: string,
) => ({
  table: {
    widths: ["*"],
    body: [
      [
        {
          stack: [
            {
              text: titulo,
              fontSize: 8,
              bold: true,
              color: colorTexto,
              alignment: "center",
            },
            {
              text: valor,
              fontSize: 16,
              bold: true,
              color: colorTexto,
              alignment: "center",
              margin: [0, 2, 0, 0],
            },
          ],
        },
      ],
    ],
  },
  fillColor,
  layout: {
    hLineWidth: () => 1,
    vLineWidth: () => 1,
    hLineColor: () => colorBorde,
    vLineColor: () => colorBorde,
    paddingTop: () => 8,
    paddingBottom: () => 8,
  },
});

interface ResumenRentabilidad {
  ventaTotal: number;
  gastoTotal: number;
  rentabilidadTotal: number;
  pctGastoPromedio: number;
  pctRentabilidadPromedio: number;
  optimas: number;
  total: number;
}

export const exportarRentabilidadPDF = async (
  viajes: RentabilidadViaje[],
  resumen: ResumenRentabilidad,
  fechaInicio: string,
  fechaFin: string,
) => {
  const pdfMake = (window as any).pdfMake;
  if (!pdfMake) return notificarAdvertencia("Generador PDF cargando...");

  const logoBase64 = await obtenerLogoBase64Local("/CIRLogo.png");

  const bodyData = viajes.map((v, index) => {
    const esPar = index % 2 === 0;
    const bgFila = esPar ? "#ffffff" : "#f8fafc";

    return [
      { text: v.fecha, style: "td", fillColor: bgFila },
      { text: v.ruta || "-", style: "td", fillColor: bgFila },
      { text: v.chofer || "-", style: "td", fillColor: bgFila },
      { text: v.unidad || "-", style: "tdCenter", fillColor: bgFila },
      { text: fMoneda(v.venta), style: "tdRight", fillColor: bgFila },
      { text: fMoneda(v.gastoOperativo), style: "tdRight", fillColor: bgFila },
      { text: fPct(v.pctGasto), style: "tdRight", fillColor: bgFila },
      { text: fMoneda(v.rentabilidad), style: "tdRight", fillColor: bgFila },
      { text: fPct(v.pctRentabilidad), style: "tdRight", fillColor: bgFila },
      {
        text: v.esOptima ? "Óptima" : "No óptima",
        style: "tdCenter",
        fillColor: bgFila,
        color: v.esOptima ? "#047857" : "#be123c",
        bold: true,
      },
    ];
  });

  const documentDefinition = {
    pageOrientation: "landscape",
    pageMargins: [30, 30, 30, 30],
    content: [
      {
        columns: [
          logoBase64
            ? { image: logoBase64, width: 80 }
            : { text: "CIR", bold: true, fontSize: 16 },
          {
            stack: [
              {
                text: "RUTERX - REPORTE LOGÍSTICO",
                fontSize: 14,
                bold: true,
                color: "#0f172a",
              },
              {
                text: "RENTABILIDAD DE RUTAS",
                fontSize: 11,
                bold: true,
                color: "#2563eb",
                margin: [0, 2, 0, 2],
              },
            ],
            alignment: "right",
          },
        ],
        margin: [0, 0, 0, 15],
      },
      {
        text: `DEL ${fechaInicio} AL ${fechaFin}`,
        style: "sectionTitle",
      },
      {
        columns: [
          recuadroResumen(
            "VENTA TOTAL",
            fMoneda(resumen.ventaTotal),
            "#1d4ed8",
            "#eff6ff",
            "#bfdbfe",
          ),
          recuadroResumen(
            "GASTO OPERATIVO",
            `${fMoneda(resumen.gastoTotal)} (${fPct(resumen.pctGastoPromedio)})`,
            "#b45309",
            "#fffbeb",
            "#fde68a",
          ),
          recuadroResumen(
            "RENTABILIDAD",
            `${fMoneda(resumen.rentabilidadTotal)} (${fPct(resumen.pctRentabilidadPromedio)})`,
            "#047857",
            "#ecfdf5",
            "#a7f3d0",
          ),
          recuadroResumen(
            "RUTAS ÓPTIMAS",
            `${resumen.optimas} de ${resumen.total}`,
            resumen.optimas === resumen.total ? "#047857" : "#b45309",
            resumen.optimas === resumen.total ? "#ecfdf5" : "#fffbeb",
            resumen.optimas === resumen.total ? "#a7f3d0" : "#fde68a",
          ),
        ],
        columnGap: 12,
        margin: [0, 0, 0, 20],
      },
      {
        table: {
          headerRows: 1,
          widths: [60, "*", "*", 40, 60, 65, 45, 60, 55, 55],
          body: [
            [
              { text: "Fecha", style: "th" },
              { text: "Ruta", style: "th" },
              { text: "Chofer", style: "th" },
              { text: "Un", style: "th", alignment: "center" },
              { text: "Venta", style: "th", alignment: "right" },
              { text: "Gasto Oper.", style: "th", alignment: "right" },
              { text: "% Gasto", style: "th", alignment: "right" },
              { text: "Rentabilidad", style: "th", alignment: "right" },
              { text: "% Rent.", style: "th", alignment: "right" },
              { text: "Estado", style: "th", alignment: "center" },
            ],
            ...bodyData,
          ],
        },
        layout: "lightHorizontalLines",
      },
    ],
    footer: (currentPage: number, pageCount: number) => ({
      columns: [
        {
          text: "RuterX · Reporte confidencial de uso interno",
          fontSize: 7,
          color: "#94a3b8",
          margin: [30, 0, 0, 0],
        },
        {
          text: `Página ${currentPage} de ${pageCount}`,
          alignment: "right",
          fontSize: 7,
          color: "#94a3b8",
          margin: [0, 0, 30, 0],
        },
      ],
      margin: [0, 10, 0, 0],
    }),
    styles: {
      sectionTitle: {
        fontSize: 11,
        bold: true,
        color: "#0f172a",
        margin: [0, 0, 0, 6],
      },
      th: {
        bold: true,
        fontSize: 8,
        fillColor: "#0f172a",
        color: "#ffffff",
        margin: [4, 4],
      },
      td: { fontSize: 7.5, color: "#334155", margin: [4, 4] },
      tdCenter: {
        fontSize: 7.5,
        color: "#334155",
        alignment: "center",
        margin: [4, 4],
      },
      tdRight: {
        fontSize: 7.5,
        color: "#334155",
        alignment: "right",
        margin: [4, 4],
      },
    },
  };

  pdfMake
    .createPdf(documentDefinition)
    .download(`Rentabilidad_Rutas_${fechaInicio}_a_${fechaFin}.pdf`);
};
