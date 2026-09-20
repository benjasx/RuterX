import { obtenerLogoBase64Local } from "./mapaUtils";
import { notificarAdvertencia } from "./notificaciones";
import {
  DIAS_PROGRAMACION,
  type DiaProgramacion,
  type FilaProgramacionEntrega,
} from "../firebase/programacionEntregasService";

const fMoneda = (n: number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(n);

export const exportarProgramacionEntregasPDF = async (
  filasPorDia: Record<DiaProgramacion, FilaProgramacionEntrega[]>,
  fecha: string,
) => {
  const pdfMake = (window as any).pdfMake;
  if (!pdfMake) return notificarAdvertencia("Generador PDF cargando...");

  const logoBase64 = await obtenerLogoBase64Local("/CIRLogo.png");

  const columnaHeader = DIAS_PROGRAMACION.map((dia) => ({
    text: dia.toUpperCase(),
    style: "th",
    alignment: "center",
  }));

  const columnaFilas = DIAS_PROGRAMACION.map((dia) => {
    const filas = [...(filasPorDia[dia] || [])].sort(
      (a, b) => a.orden - b.orden,
    );

    if (filas.length === 0) {
      return { text: "—", style: "tdVacio", alignment: "center" };
    }

    return {
      stack: filas.map((f) => ({
        stack: [
          { text: f.ruta_nombre.toUpperCase(), style: "tdRuta" },
          { text: fMoneda(f.monto_minimo), style: "tdMonto" },
        ],
        alignment: "center",
        margin: [0, 0, 0, 10],
      })),
      alignment: "center",
    };
  });

  const documentDefinition = {
    pageOrientation: "landscape",
    pageMargins: [24, 24, 24, 24],
    content: [
      {
        columns: [
          logoBase64
            ? { image: logoBase64, width: 70 }
            : { text: "CIR", bold: true, fontSize: 16 },
        ],
        margin: [0, 0, 0, 10],
      },
      {
        stack: [
          { text: "ABARROTERA CIR", style: "mainTitle" },
          { text: "PROGRAMACIÓN DE ENTREGAS DIARIAS", style: "mainTitle" },
          { text: "CEDIS XALISCO", style: "mainTitle" },
        ],
        alignment: "center",
        margin: [0, 0, 0, 20],
      },
      {
        table: {
          headerRows: 1,
          widths: DIAS_PROGRAMACION.map(() => "*"),
          body: [columnaHeader, columnaFilas],
        },
        layout: {
          hLineWidth: () => 0.5,
          vLineWidth: () => 0.5,
          hLineColor: () => "#e2e8f0",
          vLineColor: () => "#e2e8f0",
          paddingTop: () => 8,
          paddingBottom: () => 8,
          paddingLeft: () => 6,
          paddingRight: () => 6,
        },
      },
    ],
    footer: (currentPage: number, pageCount: number) => ({
      columns: [
        {
          text: `RuterX  ·  Generado el ${fecha}`,
          fontSize: 7,
          color: "#94a3b8",
          margin: [24, 0, 0, 0],
        },
        {
          text: `Página ${currentPage} de ${pageCount}`,
          alignment: "right",
          fontSize: 7,
          color: "#94a3b8",
          margin: [0, 0, 24, 0],
        },
      ],
      margin: [0, 10, 0, 0],
    }),
    styles: {
      mainTitle: { fontSize: 16, bold: true, color: "#0f172a" },
      th: {
        bold: true,
        fontSize: 9.5,
        fillColor: "#0f172a",
        color: "#ffffff",
        margin: [4, 4],
      },
      tdRuta: {
        fontSize: 8.5,
        bold: true,
        color: "#0f172a",
      },
      tdMonto: {
        fontSize: 8.5,
        color: "#047857",
        bold: true,
        margin: [0, 1, 0, 0],
      },
      tdVacio: { fontSize: 8.5, color: "#94a3b8", italics: true },
    },
  };

  const nombreArchivo = `Programacion_Entregas_${fecha}.pdf`;
  pdfMake.createPdf(documentDefinition).download(nombreArchivo);
};
