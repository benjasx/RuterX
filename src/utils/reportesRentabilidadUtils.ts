import { obtenerLogoBase64Local } from "./mapaUtils";
import { notificarAdvertencia } from "./notificaciones";
import type {
  SimulacionRentabilidadInput,
  SimulacionRentabilidadResultado,
} from "./rentabilidadUtils";

const fMoneda = (n: number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(n);

const fPct = (n: number | null) => (n === null ? "—" : `${n.toFixed(2)}%`);

// Recuadro de resumen (etiqueta + valor), mismo patrón que
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
              fontSize: 14,
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

const filaDesglose = (label: string, valor: string, destacada = false) => [
  {
    text: label,
    style: destacada ? "tdBold" : "td",
    fillColor: destacada ? "#f8fafc" : "#ffffff",
  },
  {
    text: valor,
    style: destacada ? "tdBoldRight" : "tdRight",
    fillColor: destacada ? "#f8fafc" : "#ffffff",
  },
];

export const exportarSimulacionRentabilidadPDF = async (
  input: SimulacionRentabilidadInput,
  resultado: SimulacionRentabilidadResultado,
  ruta: string,
  fecha: string,
) => {
  const pdfMake = (window as any).pdfMake;
  if (!pdfMake) return notificarAdvertencia("Generador PDF cargando...");

  const logoBase64 = await obtenerLogoBase64Local("/CIRLogo.png");

  const documentDefinition = {
    pageOrientation: "portrait",
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
                text: "SIMULACIÓN DE RENTABILIDAD",
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
        text: `RUTA: ${ruta.toUpperCase()}  ·  ${fecha}`,
        style: "sectionTitle",
      },
      {
        columns: [
          recuadroResumen(
            "GASTO TOTAL RUTA",
            fMoneda(resultado.gastoTotalRuta),
            "#b45309",
            "#fffbeb",
            "#fde68a",
          ),
          recuadroResumen(
            "$/KM",
            resultado.pesosPorKm !== null ? fMoneda(resultado.pesosPorKm) : "—",
            "#1d4ed8",
            "#eff6ff",
            "#bfdbfe",
          ),
          recuadroResumen(
            "% GASTO VS CONTRIBUCIÓN",
            fPct(resultado.pctGastoVsContribucion),
            "#047857",
            "#ecfdf5",
            "#a7f3d0",
          ),
          recuadroResumen(
            "ESTADO",
            resultado.esOptima === null
              ? "—"
              : resultado.esOptima
                ? "ÓPTIMA"
                : "NO ÓPTIMA",
            resultado.esOptima ? "#047857" : "#be123c",
            resultado.esOptima ? "#ecfdf5" : "#fff1f2",
            resultado.esOptima ? "#a7f3d0" : "#fecdd3",
          ),
        ],
        columnGap: 10,
        margin: [0, 0, 0, 20],
      },
      {
        table: {
          widths: ["*", 110],
          body: [
            filaDesglose("Salario Chofer (día)", fMoneda(resultado.salarioChofer)),
            filaDesglose(
              "Salario Ayudante 1 (día)",
              fMoneda(resultado.salarioAyudante1),
            ),
            filaDesglose(
              "Salario Ayudante 2 (día)",
              fMoneda(resultado.salarioAyudante2),
            ),
            filaDesglose("Viático Chofer", fMoneda(resultado.viaticoChofer)),
            filaDesglose(
              "Viático Ayudante 1",
              fMoneda(resultado.viaticoAyudante1),
            ),
            filaDesglose(
              "Viático Ayudante 2",
              fMoneda(resultado.viaticoAyudante2),
            ),
            filaDesglose("Comisión Chofer", fMoneda(resultado.comisionChofer)),
            filaDesglose(
              "Comisión Ayudante",
              fMoneda(resultado.comisionAyudante),
            ),
            filaDesglose(
              `Gasto Combustible (${input.kilometraje} km × ${fMoneda(input.precioDiesel)})`,
              fMoneda(resultado.gastoCombustible),
            ),
            filaDesglose("Gasto Legal", fMoneda(resultado.gastoLegal)),
            filaDesglose(
              "Gasto Mantenimiento",
              fMoneda(resultado.gastoMantenimiento),
            ),
            filaDesglose(
              "GASTO TOTAL RUTA",
              fMoneda(resultado.gastoTotalRuta),
              true,
            ),
            filaDesglose(
              "Venta Programada",
              fMoneda(resultado.ventaProgramada),
            ),
            filaDesglose(
              "Al Costo/Sin Impuestos",
              fMoneda(resultado.cantidadAlCosto),
            ),
            filaDesglose(
              "CONTRIBUCIÓN PROMEDIO REAL",
              fMoneda(resultado.contribucionPromedioReal),
              true,
            ),
            filaDesglose(
              "Gasto Total vs Al Costo / vs Contribución",
              `${fPct(resultado.pctGastoVsAlCosto)} / ${fPct(resultado.pctGastoVsContribucion)}`,
            ),
            filaDesglose(
              "CONTRIBUCIÓN REAL DESPUÉS DE GASTOS",
              fMoneda(resultado.contribucionRealDespuesGastos),
              true,
            ),
            filaDesglose(
              "Contribución Real vs Al Costo / vs Contribución",
              `${fPct(resultado.pctContribucionRealVsAlCosto)} / ${fPct(resultado.pctContribucionRealVsContribucion)}`,
            ),
          ],
        },
        layout: {
          hLineWidth: () => 0.5,
          vLineWidth: () => 0,
          hLineColor: () => "#e2e8f0",
        },
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
        margin: [0, 0, 0, 10],
      },
      td: { fontSize: 9, color: "#334155", margin: [4, 5] },
      tdRight: {
        fontSize: 9,
        color: "#334155",
        alignment: "right",
        margin: [4, 5],
      },
      tdBold: { fontSize: 9.5, bold: true, color: "#0f172a", margin: [4, 5] },
      tdBoldRight: {
        fontSize: 9.5,
        bold: true,
        color: "#0f172a",
        alignment: "right",
        margin: [4, 5],
      },
    },
  };

  const nombreArchivo = `Rentabilidad_${ruta.replace(/\s+/g, "_")}_${fecha}.pdf`;
  pdfMake.createPdf(documentDefinition).download(nombreArchivo);
};
