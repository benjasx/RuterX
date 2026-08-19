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

const esFolioValido = (val: string) => {
  if (!val) return false;
  const str = val.toUpperCase().trim();
  return str !== "" && str !== "FOLIO" && str !== "TRASPASO" && str !== "0";
};

// 🚀 HOJA DE RUTA (letrero para pegar en la unidad)
export const exportarHojaRutaPDF = (fila: any, fechaSeleccionada: string) => {
  const pdfMake = (window as any).pdfMake;
  if (!pdfMake) return alert("Generador PDF cargando...");

  if (!fila.ruta && !fila.unidad) {
    return alert("Esta fila no tiene ruta ni unidad para imprimir.");
  }

  const folios = [fila.embarqueCredito, fila.embarqueContado].filter(
    esFolioValido,
  );
  const folioFontSize = folios.length > 1 ? 110 : 170;

  const contenido: any[] = [];

  if (fila.unidad) {
    contenido.push({
      text: `#${fila.unidad}`,
      fontSize: 55,
      bold: true,
      alignment: "center",
      margin: [0, 0, 0, 20],
    });
  }

  if (fila.ruta) {
    contenido.push({
      text: fila.ruta,
      fontSize: 60,
      bold: true,
      italics: true,
      alignment: "center",
      margin: [0, 0, 0, 30],
    });
  }

  folios.forEach((folio) => {
    contenido.push({
      text: folio,
      fontSize: folioFontSize,
      bold: true,
      color: "#dc2626",
      alignment: "center",
      margin: [0, 0, 0, 20],
    });
  });

  const documentDefinition = {
    pageOrientation: "landscape",
    pageMargins: [20, 20, 20, 20],
    content: [{ stack: contenido, alignment: "center" }],
  };

  pdfMake
    .createPdf(documentDefinition)
    .download(
      `Hoja_Ruta_${fila.unidad || fila.ruta}_${fechaSeleccionada}.pdf`,
    );
};

// 🚀 HOJA DE MESANINE (letrero sin número de unidad)
export const exportarHojaMesaninePDF = (
  fila: any,
  fechaSeleccionada: string,
) => {
  const pdfMake = (window as any).pdfMake;
  if (!pdfMake) return alert("Generador PDF cargando...");

  if (!fila.ruta) {
    return alert("Esta fila no tiene ruta para imprimir.");
  }

  const folios = [fila.embarqueCredito, fila.embarqueContado].filter(
    esFolioValido,
  );
  const folioFontSize = folios.length > 1 ? 120 : 190;

  const contenido: any[] = [
    {
      text: fila.ruta,
      fontSize: 65,
      bold: true,
      italics: true,
      alignment: "center",
      margin: [0, 0, 0, 30],
    },
  ];

  folios.forEach((folio) => {
    contenido.push({
      text: folio,
      fontSize: folioFontSize,
      bold: true,
      color: "#dc2626",
      alignment: "center",
      margin: [0, 0, 0, 20],
    });
  });

  const documentDefinition = {
    pageOrientation: "landscape",
    pageMargins: [20, 20, 20, 20],
    content: [{ stack: contenido, alignment: "center" }],
  };

  pdfMake
    .createPdf(documentDefinition)
    .download(`Hoja_Mesanine_${fila.ruta}_${fechaSeleccionada}.pdf`);
};

// 🚀 BITÁCORA DE FACTURAS Y CARGAS DIARIAS
export const exportarBitacoraPDF = async (
  fila: any,
  fechaSeleccionada: string,
) => {
  const pdfMake = (window as any).pdfMake;
  if (!pdfMake) return alert("Generador PDF cargando...");

  const logoBase64 = await obtenerLogoBase64Local("/CIRLogo.png");

  const fechaHoy = new Date().toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const ANCHO_PAGINA = 515; // A4 (595.28) - márgenes 40+40

  const bordeFormulario = {
    hLineWidth: () => 1,
    vLineWidth: () => 1,
    hLineColor: () => "#0f172a",
    vLineColor: () => "#0f172a",
  };

  // Celda de etiqueta con fondo gris, ancho completo de su columna
  const celdaEtiqueta = (texto: string) => ({
    text: texto,
    fontSize: 8,
    bold: true,
    color: "#0f172a",
    fillColor: "#e2e8f0",
    margin: [6, 5, 6, 5],
  });

  // Celda de valor, fondo blanco, misma altura que la etiqueta
  const celdaValor = (valor: string = "") => ({
    text: valor || " ",
    fontSize: 9.5,
    bold: true,
    color: "#1e293b",
    margin: [6, 5, 6, 5],
  });

  const documentDefinition = {
    pageOrientation: "portrait",
    pageMargins: [40, 40, 40, 40],
    content: [
      // ENCABEZADO: logo a la izquierda, título centrado respecto a la hoja
      // (columna derecha del mismo ancho que el logo compensa el espacio)
      {
        columns: [
          logoBase64
            ? { width: 60, image: logoBase64 }
            : { width: 60, text: "CIR", bold: true, fontSize: 16 },
          {
            width: "*",
            stack: [
              {
                text: "ORGANIZACIÓN CIR S.A. DE C.V.",
                bold: true,
                fontSize: 13,
                alignment: "center",
              },
              {
                text: "BITACORA DE FACTURAS Y CARGAS DIARIAS",
                bold: true,
                fontSize: 11,
                alignment: "center",
                margin: [0, 3, 0, 0],
              },
            ],
          },
          { width: 60, text: "" },
        ],
        margin: [0, 0, 0, 6],
      },
      {
        canvas: [
          {
            type: "line",
            x1: 0,
            y1: 0,
            x2: ANCHO_PAGINA,
            y2: 0,
            lineWidth: 1,
            lineColor: "#0f172a",
          },
        ],
        margin: [0, 0, 0, 16],
      },

      // BLOQUE DE IDENTIFICACIÓN
      {
        table: {
          widths: [95, "*", 95, "*"],
          body: [
            [
              celdaEtiqueta("FECHA"),
              celdaValor(fechaHoy),
              celdaEtiqueta("CAMION"),
              celdaValor(fila.unidad),
            ],
            [
              celdaEtiqueta("RUTA"),
              celdaValor(fila.ruta),
              celdaEtiqueta("EMBARQUE"),
              celdaValor(fila.embarqueCredito),
            ],
            [
              celdaEtiqueta("CHOFER"),
              celdaValor(fila.chofer),
              celdaEtiqueta("EMBARQUE"),
              celdaValor(fila.embarqueContado),
            ],
            [
              celdaEtiqueta("VERIFICADOR"),
              celdaValor(""),
              celdaEtiqueta("A FACTURAS"),
              celdaValor(""),
            ],
          ],
        },
        layout: bordeFormulario,
        margin: [0, 0, 0, 14],
      },

      // HORAS DE PROCESO + RECUADRO LIBRE
      {
        table: {
          widths: [190, "*", 200],
          body: [
            [
              celdaEtiqueta("HORA DE IMPRESION"),
              celdaValor(""),
              { text: "", rowSpan: 4, border: [true, true, true, true] },
            ],
            [celdaEtiqueta("HORA DE ENRUTADO"), celdaValor(""), {}],
            [celdaEtiqueta("HORA DE ENTREGA A LOGISTICA"), celdaValor(""), {}],
            [
              celdaEtiqueta("HORA DE ENTREGA A VERIFICADORES"),
              celdaValor(""),
              {},
            ],
          ],
        },
        layout: bordeFormulario,
        margin: [0, 0, 0, 14],
      },

      // INICIO / TÉRMINO DE CARGA
      {
        table: {
          widths: [95, "*", 95, "*"],
          body: [
            [
              celdaEtiqueta("INICIO DE CARGA"),
              celdaValor(""),
              celdaEtiqueta("TERMINO DE CARGA"),
              celdaValor(""),
            ],
          ],
        },
        layout: bordeFormulario,
        margin: [0, 0, 0, 14],
      },

      // FACTURAS ENTREGADAS / NO CARGADAS
      {
        table: {
          widths: [270, "*"],
          body: [
            [
              celdaEtiqueta("NUMERO DE FACTURAS ENTREGADAS A RECEPCION"),
              celdaValor(""),
            ],
          ],
        },
        layout: bordeFormulario,
        margin: [0, 0, 0, 6],
      },
      {
        table: {
          widths: [150, "*"],
          body: [[celdaEtiqueta("FACTURAS NO CARGADAS"), celdaValor("")]],
        },
        layout: bordeFormulario,
        margin: [0, 0, 0, 14],
      },

      // OBSERVACIONES
      {
        table: {
          widths: ["*"],
          heights: [20, 70],
          body: [
            [
              {
                text: "OBSERVACIONES",
                bold: true,
                fontSize: 9,
                alignment: "center",
                fillColor: "#e2e8f0",
                margin: [0, 5, 0, 5],
              },
            ],
            [{ text: " ", fontSize: 9 }],
          ],
        },
        layout: bordeFormulario,
        margin: [0, 0, 0, 32],
      },

      // FIRMAS
      {
        columns: [
          { width: "*", text: "_______________________", alignment: "center" },
          { width: "*", text: "_______________________", alignment: "center" },
          { width: "*", text: "_______________________", alignment: "center" },
        ],
      },
      {
        columns: [
          {
            width: "*",
            text: "CONTROL DE FACTURAS",
            bold: true,
            fontSize: 8,
            alignment: "center",
          },
          {
            width: "*",
            text: "SUBGERENCIA",
            bold: true,
            fontSize: 8,
            alignment: "center",
          },
          {
            width: "*",
            text: "VERIFICADOR",
            bold: true,
            fontSize: 8,
            alignment: "center",
          },
        ],
        margin: [0, 4, 0, 24],
      },

      {
        columns: [
          { width: "*", text: "_______________________", alignment: "center" },
          { width: "*", text: "_______________________", alignment: "center" },
        ],
      },
      {
        columns: [
          {
            width: "*",
            text: "CHOFER",
            bold: true,
            fontSize: 8,
            alignment: "center",
          },
          {
            width: "*",
            text: "RECEPCION",
            bold: true,
            fontSize: 8,
            alignment: "center",
          },
        ],
        margin: [0, 4, 0, 0],
      },
    ],
  };

  pdfMake
    .createPdf(documentDefinition)
    .download(
      `Bitacora_${fila.unidad || fila.ruta || "SR"}_${fechaSeleccionada}.pdf`,
    );
};
