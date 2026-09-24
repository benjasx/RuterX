import * as XLSX from "xlsx";
import { obtenerLogoBase64Local } from "./mapaUtils";
import { notificarAdvertencia } from "./notificaciones";
import type {
  SimulacionRentabilidadInput,
  SimulacionRentabilidadResultado,
} from "./rentabilidadUtils";

interface UnidadResumen {
  numero: string;
  tipo: string;
  capacidad_kg: number;
  capacidad_m3: number;
}

const fMoneda = (n: number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(n);

const fPct = (n: number | null) => (n === null ? "—" : `${n.toFixed(2)}%`);

const SEMAFORO_LABEL: Record<string, string> = {
  RENTABLE: "RENTABLE",
  REVISAR: "REVISAR",
  NO_RENTABLE: "NO RENTABLE",
};

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

const colorSemaforo = (semaforo: SimulacionRentabilidadResultado["semaforo"]) => {
  if (semaforo === "RENTABLE") return { color: "#047857", bg: "#ecfdf5", borde: "#a7f3d0" };
  if (semaforo === "REVISAR") return { color: "#b45309", bg: "#fffbeb", borde: "#fde68a" };
  if (semaforo === "NO_RENTABLE") return { color: "#be123c", bg: "#fff1f2", borde: "#fecdd3" };
  return { color: "#475569", bg: "#f8fafc", borde: "#e2e8f0" };
};

export const exportarSimulacionRentabilidadPDF = async (
  input: SimulacionRentabilidadInput,
  resultado: SimulacionRentabilidadResultado,
  unidad: UnidadResumen,
  ruta: string,
  fecha: string,
) => {
  const pdfMake = (window as any).pdfMake;
  if (!pdfMake) return notificarAdvertencia("Generador PDF cargando...");

  const logoBase64 = await obtenerLogoBase64Local("/CIRLogo.png");
  const semColor = colorSemaforo(resultado.semaforo);

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
        text: `UNIDAD: ${unidad.numero} — ${unidad.tipo}  ·  RUTA: ${ruta.toUpperCase()}  ·  ${fecha}`,
        style: "sectionTitle",
      },
      {
        columns: [
          recuadroResumen(
            "TOTAL COSTO",
            fMoneda(resultado.totalCosto),
            "#b45309",
            "#fffbeb",
            "#fde68a",
          ),
          recuadroResumen(
            "UTILIDAD RUTA",
            fMoneda(resultado.utilidadRuta),
            "#1d4ed8",
            "#eff6ff",
            "#bfdbfe",
          ),
          recuadroResumen(
            "RENTABILIDAD %",
            fPct(resultado.rentabilidadPct),
            "#047857",
            "#ecfdf5",
            "#a7f3d0",
          ),
          recuadroResumen(
            "SEMÁFORO",
            resultado.semaforo === null ? "—" : SEMAFORO_LABEL[resultado.semaforo],
            semColor.color,
            semColor.bg,
            semColor.borde,
          ),
        ],
        columnGap: 10,
        margin: [0, 0, 0, 20],
      },
      {
        table: {
          widths: ["*", 110],
          body: [
            filaDesglose("Sueldo Chofer (día)", fMoneda(resultado.salarioChofer)),
            filaDesglose(
              "Sueldo Ayudante 1 (día)",
              fMoneda(resultado.salarioAyudante1),
            ),
            filaDesglose(
              "Sueldo Ayudante 2 (día)",
              fMoneda(resultado.salarioAyudante2),
            ),
            filaDesglose("Sueldo Vendedor (día)", fMoneda(resultado.salarioVendedor)),
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
              "Comisión Ayudante 1",
              fMoneda(resultado.comisionAyudante1),
            ),
            filaDesglose(
              "Comisión Ayudante 2",
              fMoneda(resultado.comisionAyudante2),
            ),
            filaDesglose("Comisión Vendedor", fMoneda(resultado.comisionVendedor)),
            filaDesglose(
              `Gasto Combustible (${input.kmTrayecto} km × ${fMoneda(input.costoPorKm)})`,
              fMoneda(resultado.gastoCombustible),
            ),
            filaDesglose("Permiso Descarga", fMoneda(resultado.permisoDescarga)),
            filaDesglose("TOTAL COSTO", fMoneda(resultado.totalCosto), true),
            filaDesglose(
              "Venta Programada",
              fMoneda(resultado.ventaProgramada),
            ),
            filaDesglose("Margen Bruto $", fMoneda(resultado.margenBruto)),
            filaDesglose(
              "UTILIDAD RUTA",
              fMoneda(resultado.utilidadRuta),
              true,
            ),
            filaDesglose("Rentabilidad %", fPct(resultado.rentabilidadPct)),
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

  const nombreArchivo = `Rentabilidad_${unidad.numero}_${ruta.replace(/\s+/g, "_")}_${fecha}.pdf`;
  pdfMake.createPdf(documentDefinition).download(nombreArchivo);
};

export const exportarSimulacionRentabilidadExcel = (
  input: SimulacionRentabilidadInput,
  resultado: SimulacionRentabilidadResultado,
  unidad: UnidadResumen,
  ruta: string,
  fecha: string,
) => {
  const filas = [
    { Concepto: "Unidad", Monto: `${unidad.numero} — ${unidad.tipo}` },
    { Concepto: "Ruta", Monto: ruta },
    { Concepto: "Fecha", Monto: fecha },
    { Concepto: "Sueldo Chofer (día)", Monto: resultado.salarioChofer },
    { Concepto: "Sueldo Ayudante 1 (día)", Monto: resultado.salarioAyudante1 },
    { Concepto: "Sueldo Ayudante 2 (día)", Monto: resultado.salarioAyudante2 },
    { Concepto: "Sueldo Vendedor (día)", Monto: resultado.salarioVendedor },
    { Concepto: "Viático Chofer", Monto: resultado.viaticoChofer },
    { Concepto: "Viático Ayudante 1", Monto: resultado.viaticoAyudante1 },
    { Concepto: "Viático Ayudante 2", Monto: resultado.viaticoAyudante2 },
    { Concepto: "Comisión Chofer", Monto: resultado.comisionChofer },
    { Concepto: "Comisión Ayudante 1", Monto: resultado.comisionAyudante1 },
    { Concepto: "Comisión Ayudante 2", Monto: resultado.comisionAyudante2 },
    { Concepto: "Comisión Vendedor", Monto: resultado.comisionVendedor },
    {
      Concepto: `Gasto Combustible (${input.kmTrayecto} km x ${input.costoPorKm} $/km)`,
      Monto: resultado.gastoCombustible,
    },
    { Concepto: "Permiso Descarga", Monto: resultado.permisoDescarga },
    { Concepto: "TOTAL COSTO", Monto: resultado.totalCosto },
    { Concepto: "Venta Programada", Monto: resultado.ventaProgramada },
    { Concepto: "Margen Bruto $", Monto: resultado.margenBruto },
    { Concepto: "UTILIDAD RUTA", Monto: resultado.utilidadRuta },
    {
      Concepto: "Rentabilidad %",
      Monto: resultado.rentabilidadPct === null ? "—" : resultado.rentabilidadPct,
    },
    {
      Concepto: "Semáforo",
      Monto: resultado.semaforo === null ? "—" : SEMAFORO_LABEL[resultado.semaforo],
    },
  ];

  const ws = XLSX.utils.json_to_sheet(filas);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Rentabilidad");
  XLSX.writeFile(
    wb,
    `Rentabilidad_${unidad.numero}_${ruta.replace(/\s+/g, "_")}_${fecha}.xlsx`,
  );
};
