// src/utils/pdfReporterutasxchofer.ts

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

// 🚀 AHORA RECIBE UN 4TO PARÁMETRO OPCIONAL: choferElegido
export const generarPDFRutasPorChofer = async (
  viajes: any[],
  fechaInicio: string,
  fechaFin: string,
  choferElegido: string = "TODOS",
) => {
  const pdfMake = (window as any).pdfMake;
  if (!pdfMake) {
    alert(
      "El generador de PDF está cargando... intenta de nuevo en un segundo.",
    );
    return;
  }

  const logoBase64 = await obtenerLogoBase64Local("/CIRLogo.png");

  // 1. Agrupar los viajes por chofer y aplicar el filtro
  const viajesPorChofer: Record<string, any[]> = {};

  viajes.forEach((v) => {
    if (!v.chofer || v.chofer.trim() === "" || v.chofer === "-") return;
    const nombreChofer = v.chofer.toUpperCase().trim();

    // 🚀 FILTRO: Si no es "TODOS" y no coincide con el elegido, lo ignoramos
    if (choferElegido !== "TODOS" && nombreChofer !== choferElegido) return;

    if (!viajesPorChofer[nombreChofer]) {
      viajesPorChofer[nombreChofer] = [];
    }
    viajesPorChofer[nombreChofer].push(v);
  });

  const contentBlocks: any[] = [];

  // 🚀 TÍTULO DINÁMICO
  const tituloReporte =
    choferElegido === "TODOS"
      ? `REPORTE DE RUTAS POR CHOFER\n(DEL ${fechaInicio} AL ${fechaFin})`
      : `REPORTE DE RUTAS: ${choferElegido}\n(DEL ${fechaInicio} AL ${fechaFin})`;

  // 2. Título General
  contentBlocks.push({
    columns: [
      logoBase64
        ? { image: logoBase64, width: 80 }
        : { text: "CIR", style: "headerTitle" },
      {
        text: tituloReporte,
        style: "mainTitle",
        alignment: "right",
        margin: [0, 10, 0, 0],
      },
    ],
    margin: [0, 0, 0, 20],
  });

  // 3. Generar una tabla por cada chofer encontrado
  Object.keys(viajesPorChofer)
    .sort()
    .forEach((chofer) => {
      const viajesChofer = viajesPorChofer[chofer];

      // Encabezado del Chofer
      contentBlocks.push({
        text: `Chofer: ${chofer} (${viajesChofer.length} viajes en este rango)`,
        style: "choferTitle",
        margin: [0, 10, 0, 5],
      });

      const tableBody = [
        [
          { text: "Fecha", style: "tableHeader" },
          { text: "Un.", style: "tableHeader", alignment: "center" },
          { text: "Ruta Asignada", style: "tableHeader" },
          { text: "Ayudante 1", style: "tableHeader" },
          { text: "Ayudante 2", style: "tableHeader" },
        ],
      ];

      // Llenar datos
      viajesChofer.forEach((v) => {
        tableBody.push([
          { text: v.fecha, style: "tableCell" },
          { text: v.unidad || "-", style: "tableCell", alignment: "center" },
          { text: v.ruta || "SIN RUTA", style: "tableCell" },
          { text: v.ayudante1 || "-", style: "tableCell" },
          { text: v.ayudante2 || "-", style: "tableCell" },
        ]);
      });

      contentBlocks.push({
        table: {
          headerRows: 1,
          widths: ["auto", "auto", "*", "*", "*"],
          body: tableBody,
        },
        layout: {
          fillColor: function (rowIndex: number) {
            if (rowIndex === 0) return "#4c1d95";
            return rowIndex % 2 === 0 ? "#faf5ff" : "#ffffff";
          },
          hLineWidth: function (i: number, node: any) {
            return i === 0 || i === node.table.body.length ? 1 : 0.5;
          },
          vLineWidth: function () {
            return 0;
          },
          hLineColor: function (i: number) {
            return i === 0 ? "#4c1d95" : "#e2e8f0";
          },
          paddingTop: function () {
            return 4;
          },
          paddingBottom: function () {
            return 4;
          },
        },
        margin: [0, 0, 0, 15],
      });
    });

  if (Object.keys(viajesPorChofer).length === 0) {
    contentBlocks.push({
      text: "No hay viajes registrados para la selección en este rango de fechas.",
      italics: true,
      color: "#64748b",
    });
  }

  const docDefinition: any = {
    pageOrientation: "portrait",
    pageMargins: [40, 40, 40, 40],
    content: contentBlocks,
    styles: {
      mainTitle: { fontSize: 14, bold: true, color: "#0f172a" },
      choferTitle: {
        fontSize: 11,
        bold: true,
        color: "#1e293b",
        background: "#f1f5f9",
        padding: 4,
      },
      tableHeader: { bold: true, fontSize: 9, color: "#ffffff" },
      tableCell: { fontSize: 8, color: "#334155" },
    },
    defaultStyle: { font: "Roboto" },
  };

  // 🚀 Nombre del archivo dinámico
  const nombreArchivo =
    choferElegido === "TODOS"
      ? `Reporte_Rutas_General_${fechaInicio}_al_${fechaFin}.pdf`
      : `Reporte_${choferElegido.replace(/\s+/g, "_")}_${fechaInicio}.pdf`;

  pdfMake.createPdf(docDefinition).download(nombreArchivo);
};
