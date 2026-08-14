// Si no tienes esta función arriba del archivo, déjala, es para el logo:
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

// 🚀 REEMPLAZA TU FUNCIÓN ACTUAL CON ESTA:
export const exportarDistribucionPDF = async (
  filas: any[],
  fechaSeleccionada: string,
) => {
  const pdfMake = (window as any).pdfMake;
  if (!pdfMake) return alert("Generador PDF cargando...");

  const logoBase64 = await obtenerLogoBase64Local("/CIRLogo.png");

  // Filtrar las filas que tengan datos
  const filasResumen = filas.filter((f) => f.ruta || f.chofer || f.unidad);

  // Calcular Estadísticas para el Resumen
  const totalRutas = filasResumen.length;
  const totalChoferes = filasResumen.filter(
    (f) => f.chofer && f.chofer !== "-" && f.chofer !== "SIN CHOFER",
  ).length;
  let totalAuxiliares = 0;
  filasResumen.forEach((f) => {
    if (f.auxiliar1 && f.auxiliar1 !== "-" && f.auxiliar1 !== "SIN AUXILIAR")
      totalAuxiliares++;
    if (f.auxiliar2 && f.auxiliar2 !== "-" && f.auxiliar2 !== "SIN AUXILIAR")
      totalAuxiliares++;
  });
  const unidadesEnUso = new Set(
    filasResumen.map((f) => f.unidad).filter(Boolean),
  ).size;

  // Cuerpo de la tabla de Detalle
  const bodyData = filasResumen.map((f, index) => {
    const esPar = index % 2 === 0;
    const bgFila = esPar ? "#ffffff" : "#f8fafc";

    return [
      { text: f.ruta || "-", style: "td", fillColor: bgFila },
      { text: f.unidad || "-", style: "tdCenter", fillColor: bgFila },
      { text: f.chofer || "-", style: "td", fillColor: bgFila },
      { text: f.auxiliar1 || "-", style: "td", fillColor: bgFila },
      { text: f.auxiliar2 || "-", style: "td", fillColor: bgFila },
      { text: f.embarqueCredito || "-", style: "tdCenter", fillColor: bgFila },
      { text: f.embarqueContado || "-", style: "tdCenter", fillColor: bgFila },
    ];
  });

  const documentDefinition = {
    pageOrientation: "landscape",
    pageMargins: [30, 30, 30, 30],
    content: [
      // 1. ENCABEZADO SUPERIOR (Ya sin la fecha)
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
                text: "TABLA DE DISTRIBUCIÓN DIARIA",
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

      // 2. TÍTULO DE LA TABLA (Ahora es la Fecha en Negritas y Mayúsculas)
      {
        text: `FECHA PROGRAMADA DE SALIDA: ${fechaSeleccionada}`.toUpperCase(),
        style: "sectionTitle",
      },

      // 3. TABLA DE ASIGNACIONES
      {
        table: {
          headerRows: 1,
          widths: ["auto", 20, "*", "*", "*", 55, 55],
          body: [
            [
              { text: "Ruta", style: "th" },
              { text: "Un", style: "th", alignment: "center" },
              { text: "Chofer", style: "th" },
              { text: "Auxiliar 1", style: "th" },
              { text: "Auxiliar 2", style: "th" },
              { text: "Emb. Crédito", style: "th", alignment: "center" },
              { text: "Emb. Contado", style: "th", alignment: "center" },
            ],
            ...bodyData,
          ],
        },
        layout: "lightHorizontalLines",
        margin: [0, 0, 0, 25],
      },

      // 4. RESUMEN AL FINAL
      {
        unbreakable: true,
        stack: [
          {
            text: "RESUMEN GENERAL DE LA JORNADA",
            style: "sectionTitle",
          },
          {
            table: {
              widths: ["*", "*", "*", "*"],
              body: [
                [
                  {
                    text: "TOTAL RUTAS",
                    style: "thResumen",
                    alignment: "center",
                  },
                  {
                    text: "TOTAL CHOFERES",
                    style: "thResumen",
                    alignment: "center",
                  },
                  {
                    text: "TOTAL AUXILIARES",
                    style: "thResumen",
                    alignment: "center",
                  },
                  {
                    text: "UNIDADES EN USO",
                    style: "thResumen",
                    alignment: "center",
                  },
                ],
                [
                  {
                    text: totalRutas.toString(),
                    style: "tdResumen",
                    alignment: "center",
                  },
                  {
                    text: totalChoferes.toString(),
                    style: "tdResumen",
                    alignment: "center",
                  },
                  {
                    text: totalAuxiliares.toString(),
                    style: "tdResumen",
                    alignment: "center",
                  },
                  {
                    text: unidadesEnUso.toString(),
                    style: "tdResumen",
                    alignment: "center",
                  },
                ],
              ],
            },
            layout: {
              hLineWidth: (i: number, node: any) =>
                i === 0 || i === 1 || i === node.table.body.length ? 1.5 : 0.5,
              vLineWidth: () => 0,
              hLineColor: (i: number, node: any) =>
                i === 0 || i === node.table.body.length ? "#0f172a" : "#e2e8f0",
              paddingTop: () => 6,
              paddingBottom: () => 6,
            },
          },
        ],
      },
    ],
    styles: {
      sectionTitle: {
        fontSize: 11,
        bold: true,
        color: "#0f172a",
        margin: [0, 0, 0, 6],
      },
      th: {
        bold: true,
        fontSize: 8.5,
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
      thResumen: {
        bold: true,
        fontSize: 9,
        fillColor: "#0f172a",
        color: "#ffffff",
        margin: [6, 6],
      },
      tdResumen: { fontSize: 12, bold: true, color: "#334155", margin: [8, 8] },
    },
  };

  pdfMake
    .createPdf(documentDefinition)
    .download(`Distribucion_Diaria_${fechaSeleccionada}.pdf`);
};
