import { obtenerLogoBase64Local } from "./mapaUtils";

export interface KpisPeriodo {
  ventas: number;
  peso: number;
  viajes: number;
  costos: number;
  viaticos: number;
  comisiones: number;
}

export interface RutaResumen {
  nombre: string;
  venta: number;
  peso: number;
}

export interface NombrePeso {
  nombre: string;
  peso: number;
}

export interface NombreViajes {
  nombre: string;
  viajes: number;
}

export interface FinanzasPersona {
  nombre: string;
  viaticos: number;
  comisiones: number;
  total: number;
  viajes: number;
}

export interface DatosReporteGerencial {
  fechas: { inicio: string; fin: string };
  kpis: KpisPeriodo;
  kpisPrevios: KpisPeriodo;
  rutas: RutaResumen[];
  choferesPeso: NombrePeso[];
  choferesViajes: NombreViajes[];
  ayudantesViajes: NombreViajes[];
  ayudantesFinanzas: FinanzasPersona[];
  finanzas: FinanzasPersona[];
  unidades: NombrePeso[];
  graficoBase64: string | null;
}

// --- FORMATOS ---
const fMoneda = (n: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(
    n,
  );
const fNum = (n: number) =>
  new Intl.NumberFormat("es-MX", { maximumFractionDigits: 2 }).format(n);

// Texto + color de la variación porcentual vs. el periodo anterior.
// invertido: para KPIs donde subir es malo (ej. Costo Operativo).
const celdaVariacion = (
  actual: number,
  previo: number,
  invertido = false,
) => {
  if (previo === 0) {
    return {
      text: actual === 0 ? "Sin datos previos" : "Nuevo vs. semana anterior",
      color: "#64748b",
      italics: true,
      fontSize: 8,
    };
  }
  const pct = ((actual - previo) / previo) * 100;
  const esAumento = pct >= 0;
  const esBueno = invertido ? !esAumento : esAumento;
  const signo = esAumento ? "+" : "";
  return {
    text: `${signo}${pct.toFixed(1)}% vs. semana anterior`,
    color: esBueno ? "#16a34a" : "#dc2626",
    bold: true,
    fontSize: 9,
  };
};

export const generarPDFGerencial = async (datos: DatosReporteGerencial) => {
  const pdfMake = (window as any).pdfMake;
  if (!pdfMake) return alert("Generador PDF cargando...");

  const {
    fechas,
    kpis,
    kpisPrevios,
    rutas,
    choferesPeso,
    choferesViajes,
    ayudantesViajes,
    ayudantesFinanzas,
    finanzas,
    unidades,
    graficoBase64,
  } = datos;

  const logoBase64 = await obtenerLogoBase64Local("/CIRLogo.png");

  const margen = kpis.ventas - kpis.costos;
  const margenPrevio = kpisPrevios.ventas - kpisPrevios.costos;
  const viaticosPorcentaje =
    kpis.ventas > 0 ? (kpis.viaticos / kpis.ventas) * 100 : 0;
  const comisionesPorcentaje =
    kpis.ventas > 0 ? (kpis.comisiones / kpis.ventas) * 100 : 0;
  const margenPorcentaje = kpis.ventas > 0 ? (margen / kpis.ventas) * 100 : 0;
  const promVentaViaje = kpis.viajes > 0 ? kpis.ventas / kpis.viajes : 0;
  const promPesoViaje = kpis.viajes > 0 ? kpis.peso / kpis.viajes : 0;

  let contadorSeccion = 1;
  const numerar = (titulo: string) => `${contadorSeccion++}. ${titulo}`;

  const filaZebra = (index: number) => (index % 2 === 0 ? "#ffffff" : "#f8fafc");

  const content: any[] = [
    // --- ENCABEZADO ---
    {
      columns: [
        logoBase64 ? { image: logoBase64, width: 80 } : { text: "CIR", bold: true },
        {
          text: "REPORTE GERENCIAL SEMANAL\nOperación Logística",
          style: "mainTitle",
          alignment: "right",
          margin: [0, 5, 0, 0],
        },
      ],
      margin: [0, 0, 0, 5],
    },
    {
      text: `Periodo: ${fechas.inicio} al ${fechas.fin}  ·  Generado el ${new Date().toLocaleString("es-MX", { dateStyle: "long", timeStyle: "short" })}`,
      alignment: "right",
      fontSize: 9,
      italics: true,
      color: "#64748b",
      margin: [0, 0, 0, 20],
    },

    // --- 1. RESUMEN EJECUTIVO ---
    { text: numerar("Resumen Ejecutivo (Indicadores Clave)"), style: "sectionTitle" },
    {
      table: {
        headerRows: 1,
        widths: ["26%", "18%", "26%", "30%"],
        body: [
          [
            { text: "Indicador", style: "th" },
            { text: "Valor", style: "th", alignment: "right" },
            { text: "Variación Semanal", style: "th", alignment: "right" },
            { text: "Métrica de Eficiencia", style: "th" },
          ],
          [
            { text: "Venta Total Semanal", style: "td", bold: true },
            { text: fMoneda(kpis.ventas), style: "tdRight" },
            { ...celdaVariacion(kpis.ventas, kpisPrevios.ventas), alignment: "right" },
            { text: `Venta prom. por viaje: ${fMoneda(promVentaViaje)}`, style: "td" },
          ],
          [
            { text: "Volumen Movido (Peso)", style: "td", bold: true },
            { text: `${fNum(kpis.peso)} KG`, style: "tdRight" },
            { ...celdaVariacion(kpis.peso, kpisPrevios.peso), alignment: "right" },
            { text: `Peso prom. por viaje: ${fNum(promPesoViaje)} KG`, style: "td" },
          ],
          [
            { text: "Total de Viajes", style: "td", bold: true },
            { text: `${kpis.viajes} salidas`, style: "tdRight" },
            { ...celdaVariacion(kpis.viajes, kpisPrevios.viajes), alignment: "right" },
            { text: "", style: "td" },
          ],
          [
            { text: "Costo Operativo (Viáticos)", style: "td", bold: true },
            { text: fMoneda(kpis.viaticos), style: "tdRight" },
            {
              ...celdaVariacion(kpis.viaticos, kpisPrevios.viaticos, true),
              alignment: "right",
            },
            { text: `Representa el ${viaticosPorcentaje.toFixed(2)}% de la venta bruta`, style: "td" },
          ],
          [
            { text: "Costo Operativo (Comisiones)", style: "td", bold: true },
            { text: fMoneda(kpis.comisiones), style: "tdRight" },
            {
              ...celdaVariacion(kpis.comisiones, kpisPrevios.comisiones, true),
              alignment: "right",
            },
            { text: `Representa el ${comisionesPorcentaje.toFixed(2)}% de la venta bruta`, style: "td" },
          ],
          [
            { text: "Margen Operativo", style: "td", bold: true, color: "#1e293b" },
            { text: fMoneda(margen), style: "tdRight", bold: true },
            { ...celdaVariacion(margen, margenPrevio), alignment: "right" },
            { text: `Representa el ${margenPorcentaje.toFixed(2)}% de la venta bruta`, style: "td" },
          ],
        ],
      },
      layout: "lightHorizontalLines",
      margin: [0, 8, 0, 20],
    },
  ];

  // --- GRÁFICO DE TENDENCIA (OPCIONAL) ---
  if (graficoBase64) {
    content.push(
      { text: numerar("Tendencia de Venta"), style: "sectionTitle" },
      {
        image: graficoBase64,
        width: 515,
        margin: [0, 8, 0, 20],
      },
    );
  }

  // --- DESGLOSE POR RUTA ---
  const rutasOrdenadas = [...rutas].sort((a, b) => b.venta - a.venta);
  content.push(
    { text: numerar("Desglose Operativo por Ruta"), style: "sectionTitle" },
    {
      table: {
        headerRows: 1,
        widths: ["auto", "*", "22%", "22%"],
        body: [
          [
            { text: "Rank", style: "thAlt", alignment: "center" },
            { text: "Ruta", style: "thAlt" },
            { text: "Ingreso Generado", style: "thAlt", alignment: "right" },
            { text: "Volumen (KG)", style: "thAlt", alignment: "right" },
          ],
          ...rutasOrdenadas.map((r, idx) => [
            { text: `${idx + 1}`, style: "td", alignment: "center", fillColor: filaZebra(idx) },
            { text: r.nombre, style: "td", fillColor: filaZebra(idx) },
            { text: fMoneda(r.venta), style: "tdRight", fillColor: filaZebra(idx) },
            { text: `${fNum(r.peso)} KG`, style: "tdRight", fillColor: filaZebra(idx) },
          ]),
        ],
      },
      layout: "lightHorizontalLines",
      margin: [0, 8, 0, 20],
    },
  );

  // --- FINANZAS: TRIPULACIÓN (CHOFERES) ---
  const top5Mas = finanzas.slice(0, 5);
  const top5Menos = [...finanzas].reverse().slice(0, 5);

  const tablaFinanzas = (titulo: string, filas: FinanzasPersona[], colorHeader: string) => ({
    table: {
      headerRows: 1,
      widths: ["*", "20%", "20%", "20%"],
      body: [
        [
          { text: titulo, style: "th", fillColor: colorHeader },
          { text: "Viáticos", style: "th", alignment: "right", fillColor: colorHeader },
          { text: "Comisiones", style: "th", alignment: "right", fillColor: colorHeader },
          { text: "Costo Total", style: "th", alignment: "right", fillColor: colorHeader },
        ],
        ...filas.map((c, idx) => [
          { text: c.nombre, style: "td", fillColor: filaZebra(idx) },
          { text: fMoneda(c.viaticos), style: "tdRight", fillColor: filaZebra(idx) },
          { text: fMoneda(c.comisiones), style: "tdRight", fillColor: filaZebra(idx) },
          { text: fMoneda(c.total), style: "tdRightBold", fillColor: filaZebra(idx) },
        ]),
      ],
    },
    layout: "lightHorizontalLines",
    margin: [0, 8, 0, 10],
  });

  content.push(
    { text: numerar("Análisis Financiero de Tripulación (Choferes)"), style: "sectionTitle" },
    tablaFinanzas("Top 5 (Mayor Ingreso)", top5Mas, "#2563eb"),
    tablaFinanzas("Top 5 (Menor Ingreso)", top5Menos, "#e11d48"),
  );

  // --- PERCEPCIÓN ECONÓMICA DE AYUDANTES ---
  content.push({
    text: numerar("Percepción Económica de Ayudantes"),
    style: "sectionTitle",
    margin: [0, 10, 0, 0],
  });
  if (ayudantesFinanzas.length > 0) {
    content.push(
      tablaFinanzas("Top Ayudantes (Percepción)", ayudantesFinanzas.slice(0, 10), "#0d9488"),
    );
  } else {
    content.push({
      text: "No se registró personal de apoyo con doble rol (ayudante que también figura como chofer) en este periodo.",
      style: "td",
      italics: true,
      color: "#94a3b8",
      margin: [0, 8, 0, 20],
    });
  }

  // --- ESFUERZO FÍSICO: KILOS MOVIDOS ---
  content.push(
    { text: numerar("Esfuerzo Físico: Top Choferes por Kilos Movidos"), style: "sectionTitle" },
    {
      table: {
        headerRows: 1,
        widths: ["auto", "*", "30%"],
        body: [
          [
            { text: "Rank", style: "thAlt", alignment: "center" },
            { text: "Chofer", style: "thAlt" },
            { text: "Volumen Movido (KG)", style: "thAlt", alignment: "right" },
          ],
          ...choferesPeso.slice(0, 10).map((c, idx) => [
            { text: `${idx + 1}`, style: "td", alignment: "center", fillColor: filaZebra(idx) },
            { text: c.nombre, style: "td", fillColor: filaZebra(idx) },
            { text: `${fNum(c.peso)} KG`, style: "tdRight", fillColor: filaZebra(idx) },
          ]),
        ],
      },
      layout: "lightHorizontalLines",
      margin: [0, 8, 0, 20],
    },
  );

  // --- FRECUENCIA DE SALIDAS (EQUIDAD DE VIAJES) ---
  const maxFilas = Math.max(choferesViajes.length, ayudantesViajes.length);
  const filasFrecuencia = Array.from({ length: maxFilas }, (_, i) => [
    { text: choferesViajes[i]?.nombre || "", style: "td" },
    {
      text: choferesViajes[i]?.viajes !== undefined ? `${choferesViajes[i].viajes}` : "",
      style: "tdCenter",
    },
    { text: ayudantesViajes[i]?.nombre || "", style: "td" },
    {
      text: ayudantesViajes[i]?.viajes !== undefined ? `${ayudantesViajes[i].viajes}` : "",
      style: "tdCenter",
    },
  ]);

  content.push(
    { text: numerar("Frecuencia de Salidas (Equidad de Viajes)"), style: "sectionTitle" },
    {
      table: {
        headerRows: 1,
        widths: ["*", "15%", "*", "15%"],
        body: [
          [
            { text: "Chofer", style: "thDark" },
            { text: "Viajes", style: "thDark", alignment: "center" },
            { text: "Ayudante", style: "thDark" },
            { text: "Viajes", style: "thDark", alignment: "center" },
          ],
          ...filasFrecuencia,
        ],
      },
      layout: "lightHorizontalLines",
      margin: [0, 8, 0, 0],
    },
  );

  // --- ANEXO: UNIDADES (si hay datos) ---
  if (unidades.length > 0) {
    content.push(
      { text: numerar("Volumen Movido por Unidad"), style: "sectionTitle", margin: [0, 20, 0, 0] },
      {
        table: {
          headerRows: 1,
          widths: ["auto", "*", "30%"],
          body: [
            [
              { text: "Rank", style: "thAlt", alignment: "center" },
              { text: "Unidad", style: "thAlt" },
              { text: "Volumen Movido (KG)", style: "thAlt", alignment: "right" },
            ],
            ...unidades.slice(0, 10).map((u, idx) => [
              { text: `${idx + 1}`, style: "td", alignment: "center", fillColor: filaZebra(idx) },
              { text: u.nombre, style: "td", fillColor: filaZebra(idx) },
              { text: `${fNum(u.peso)} KG`, style: "tdRight", fillColor: filaZebra(idx) },
            ]),
          ],
        },
        layout: "lightHorizontalLines",
        margin: [0, 8, 0, 0],
      },
    );
  }

  const docDefinition = {
    pageOrientation: "portrait",
    pageMargins: [40, 40, 40, 40],
    content,
    footer: (currentPage: number, pageCount: number) => ({
      columns: [
        {
          text: "RuterX · Reporte confidencial de uso interno",
          fontSize: 7,
          color: "#94a3b8",
          margin: [40, 0, 0, 0],
        },
        {
          text: `Página ${currentPage} de ${pageCount}`,
          alignment: "right",
          fontSize: 7,
          color: "#94a3b8",
          margin: [0, 0, 40, 0],
        },
      ],
      margin: [0, 10, 0, 0],
    }),
    styles: {
      mainTitle: { fontSize: 16, bold: true, color: "#1e293b" },
      sectionTitle: {
        fontSize: 12,
        bold: true,
        color: "#1e293b",
        margin: [0, 4, 0, 0],
      },
      th: { bold: true, fontSize: 9, fillColor: "#1e293b", color: "white", margin: [4, 5, 4, 5] },
      thAlt: {
        bold: true,
        fontSize: 9,
        fillColor: "#f1f5f9",
        color: "#475569",
        margin: [4, 5, 4, 5],
      },
      thDark: {
        bold: true,
        fontSize: 9,
        fillColor: "#334155",
        color: "white",
        margin: [4, 5, 4, 5],
      },
      td: { fontSize: 8.5, color: "#334155", margin: [4, 4, 4, 4] },
      tdCenter: { fontSize: 8.5, color: "#334155", margin: [4, 4, 4, 4], alignment: "center" },
      tdRight: { fontSize: 8.5, color: "#334155", margin: [4, 4, 4, 4], alignment: "right" },
      tdRightBold: {
        fontSize: 8.5,
        bold: true,
        color: "#1e293b",
        margin: [4, 4, 4, 4],
        alignment: "right",
      },
    },
  };

  pdfMake
    .createPdf(docDefinition)
    .download(`Reporte_Gerencial_${fechas.inicio}_a_${fechas.fin}.pdf`);
};
