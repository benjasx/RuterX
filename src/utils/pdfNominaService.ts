// src/utils/pdfNominaService.ts

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

const fMoneda = (c: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(
    c,
  );
const fNumero = (c: number) =>
  new Intl.NumberFormat("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(c);

// ============================================================================
// PDF: REPORTE DE CHOFERES (VERTICAL / RETRATO)
// ============================================================================
export const generarPDFNominaChoferes = async (
  viajes: any[],
  fechaInicio: string,
  fechaFin: string,
  choferElegido: string = "TODOS",
  mostrarViaticos: boolean = true,
  mostrarComisiones: boolean = true
) => {
  const pdfMake = (window as any).pdfMake;
  if (!pdfMake) return alert("Generador PDF cargando...");
  const logoBase64 = await obtenerLogoBase64Local("/CIRLogo.png");

  const viajesPorChofer: Record<string, any[]> = {};
  viajes.forEach((v) => {
    if (!v.chofer || v.chofer === "-") return;
    const nombre = v.chofer.toUpperCase().trim();
    if (choferElegido !== "TODOS" && nombre !== choferElegido) return;
    if (!viajesPorChofer[nombre]) viajesPorChofer[nombre] = [];
    viajesPorChofer[nombre].push(v);
  });

  const contentBlocks: any[] = [];
  const tituloGlobal =
    choferElegido === "TODOS"
      ? "REPORTE DE RUTAS DE CHOFERES"
      : `REPORTE: ${choferElegido}`;

  Object.keys(viajesPorChofer)
    .sort()
    .forEach((chofer) => {
      let sumaVenta = 0,
        sumaViaticos = 0,
        sumaComisiones = 0,
        sumaKg = 0;

      const cantidadRutas = viajesPorChofer[chofer].length;
      const mostrarTotalDia = mostrarViaticos && mostrarComisiones;

      const headerRow: any[] = [
        { text: "Fecha", style: "th" },
        { text: "Un.", style: "th", alignment: "center" },
        { text: "Ruta", style: "th" },
        { text: "KG", style: "th", alignment: "right" },
        { text: "Venta ($)", style: "th", alignment: "right" },
      ];
      if (mostrarViaticos) headerRow.push({ text: "Viáticos", style: "th", alignment: "right" });
      if (mostrarComisiones) headerRow.push({ text: "Comisión", style: "th", alignment: "right" });
      if (mostrarTotalDia) headerRow.push({ text: "Total Día", style: "th", alignment: "right" });

      const tableBody: any[][] = [headerRow];

      viajesPorChofer[chofer].forEach((v) => {
        const monto = Number(v.totalMonto) || 0;
        const viatico = Number(v.viaticoRuta) || 0;
        const comision = Number(v.comisionChofer) || 0;
        const kg = Number(v.kgTotal) || 0;
        const totalDia = viatico + comision;

        sumaVenta += monto;
        sumaViaticos += viatico;
        sumaComisiones += comision;
        sumaKg += kg;

        const row: any[] = [
          { text: v.fecha, style: "td" },
          { text: v.unidad || "-", style: "td", alignment: "center" },
          { text: v.ruta || "-", style: "td" },
          { text: fNumero(kg), style: "td", alignment: "right" },
          { text: fMoneda(monto), style: "td", alignment: "right" },
        ];
        if (mostrarViaticos) row.push({ text: fMoneda(viatico), style: "td", alignment: "right", color: "#166534" });
        if (mostrarComisiones) row.push({ text: fMoneda(comision), style: "td", alignment: "right", color: "#1d4ed8" });
        if (mostrarTotalDia) row.push({ text: fMoneda(totalDia), style: "tdBold", alignment: "right" });

        tableBody.push(row);
      });

      const totalRow: any[] = [
        { text: `TOTAL SEMANAL (${cantidadRutas} RUTAS)`, colSpan: 3, style: "thTotal", alignment: "right" },
        {},
        {},
        { text: fNumero(sumaKg), style: "thTotal", alignment: "right" },
        { text: fMoneda(sumaVenta), style: "thTotal", alignment: "right" },
      ];
      if (mostrarViaticos) totalRow.push({ text: fMoneda(sumaViaticos), style: "thTotal", alignment: "right" });
      if (mostrarComisiones) totalRow.push({ text: fMoneda(sumaComisiones), style: "thTotal", alignment: "right" });
      if (mostrarTotalDia) {
        totalRow.push({ text: fMoneda(sumaViaticos + sumaComisiones), style: "thGranTotal", alignment: "right" });
      }

      tableBody.push(totalRow);

      const tableWidths: string[] = ["auto", "auto", "*", "auto", "auto"];
      if (mostrarViaticos) tableWidths.push("auto");
      if (mostrarComisiones) tableWidths.push("auto");
      if (mostrarTotalDia) tableWidths.push("auto");

      // 🚀 SE RECONSTRUYÓ EL BLOQUE: LOGO + TÍTULOS EN CADA TABLA
      contentBlocks.push({
        stack: [
          // 1. Logo y Título Principal (Repetido por cada chofer)
          {
            columns: [
              logoBase64 ? { image: logoBase64, width: 70 } : { text: "CIR", bold: true },
              {
                text: `${tituloGlobal}\n(DEL ${fechaInicio} AL ${fechaFin})`,
                style: "mainTitle",
                alignment: "right",
                margin: [0, 5, 0, 0],
              },
            ],
            margin: [0, 0, 0, 10],
          },
          // 2. Barra Gris del Chofer
          {
            text: `Chofer: ${chofer}`,
            style: "choferTitle",
            margin: [0, 0, 0, 4],
          },
          // 3. La Tabla
          {
            table: {
              headerRows: 1,
              widths: tableWidths,
              body: tableBody,
            },
            layout: "lightHorizontalLines",
          },
          // 4. Firmas
          {
            columns: [
              { width: "*", text: "" },
              {
                width: 170,
                stack: [
                  { canvas: [{ type: "line", x1: 0, y1: 0, x2: 170, y2: 0, lineWidth: 1 }] },
                  { text: `Firma: ${chofer}`, alignment: "center", margin: [0, 5, 0, 0], fontSize: 9, bold: true },
                ],
                margin: [0, 50, 0, 0],
              },
              { width: "*", text: "" },
              {
                width: 170,
                stack: [
                  { canvas: [{ type: "line", x1: 0, y1: 0, x2: 170, y2: 0, lineWidth: 1 }] },
                  { text: "Firma: Jefe de Reparto", alignment: "center", margin: [0, 5, 0, 0], fontSize: 9, bold: true },
                ],
                margin: [0, 50, 0, 0],
              },
              { width: "*", text: "" },
            ],
            margin: [0, 10, 0, 20],
          }
        ],
        unbreakable: true, // Esto fuerza a que si el recibo no cabe en la página, se pase completo a la siguiente.
        margin: [0, 0, 0, 30], // Separación entre recibos
      });
    });

  if (Object.keys(viajesPorChofer).length === 0)
    contentBlocks.push({ text: "No hay viajes para calcular.", italics: true });

  pdfMake
    .createPdf({
      pageOrientation: "portrait",
      pageMargins: [30, 30, 30, 30],
      content: contentBlocks,
      styles: {
        mainTitle: { fontSize: 13, bold: true },
        choferTitle: {
          fontSize: 10,
          bold: true,
          background: "#f1f5f9",
          padding: 3,
        },
        th: {
          bold: true,
          fontSize: 8,
          fillColor: "#4c1d95",
          color: "white",
          margin: 3,
        },
        td: { fontSize: 7, margin: 3 },
        tdBold: { fontSize: 7, bold: true, margin: 3 },
        thTotal: { bold: true, fontSize: 8, fillColor: "#e2e8f0", margin: 3 },
        thGranTotal: {
          bold: true,
          fontSize: 8,
          fillColor: "#dcfce3",
          color: "#166534",
          margin: 3,
        },
      },
    })
    .download(`Reporte_Rutas_Choferes_${fechaInicio}.pdf`);
};

// ============================================================================
// PDF: REPORTE DE AUXILIARES (VERTICAL / RETRATO)
// ============================================================================
export const generarPDFNominaAyudantes = async (
  viajes: any[],
  fechaInicio: string,
  fechaFin: string,
  ayudanteElegido: string = "TODOS",
  listaNegraChoferes: Set<string>,
  mostrarViaticos: boolean = true,
  mostrarComisiones: boolean = true
) => {
  const pdfMake = (window as any).pdfMake;
  if (!pdfMake) return alert("Generador PDF cargando...");
  const logoBase64 = await obtenerLogoBase64Local("/CIRLogo.png");

  const viajesPorAyudante: Record<string, any[]> = {};

  const procesarAyudante = (nombreRaw: string, viaje: any) => {
    if (!nombreRaw) return;
    const nombre = nombreRaw.toUpperCase().trim();
    if (nombre === "-" || nombre === "SIN AYUDANTE" || nombre === "UNDEFINED")
      return;
    if (listaNegraChoferes.has(nombre)) return;
    if (ayudanteElegido !== "TODOS" && nombre !== ayudanteElegido) return;

    if (!viajesPorAyudante[nombre]) viajesPorAyudante[nombre] = [];
    viajesPorAyudante[nombre].push(viaje);
  };

  viajes.forEach((v) => {
    procesarAyudante(v.ayudante1, v);
    procesarAyudante(v.ayudante2, v);
  });

  const contentBlocks: any[] = [];
  const tituloGlobal =
    ayudanteElegido === "TODOS"
      ? "REPORTE DE RUTAS DE AUXILIARES"
      : `REPORTE: ${ayudanteElegido}`;

  Object.keys(viajesPorAyudante)
    .sort()
    .forEach((ayudante) => {
      let sumaVenta = 0,
        sumaViaticos = 0,
        sumaComisiones = 0,
        sumaKg = 0;

      const cantidadRutas = viajesPorAyudante[ayudante].length;
      const mostrarTotalDia = mostrarViaticos && mostrarComisiones;

      const headerRow: any[] = [
        { text: "Fecha", style: "th" },
        { text: "Un.", style: "th", alignment: "center" },
        { text: "Ruta", style: "th" },
        { text: "KG", style: "th", alignment: "right" },
        { text: "Venta ($)", style: "th", alignment: "right" },
      ];
      if (mostrarViaticos) headerRow.push({ text: "Viáticos", style: "th", alignment: "right" });
      if (mostrarComisiones) headerRow.push({ text: "Comisión", style: "th", alignment: "right" });
      if (mostrarTotalDia) headerRow.push({ text: "Total Día", style: "th", alignment: "right" });

      const tableBody: any[][] = [headerRow];

      viajesPorAyudante[ayudante].forEach((v) => {
        const monto = Number(v.totalMonto) || 0;
        const viatico = Number(v.viaticoRuta) || 0;
        const comision = Number(v.comisionAyudante) || 0;
        const kg = Number(v.kgTotal) || 0;
        const totalDia = viatico + comision;

        sumaVenta += monto;
        sumaViaticos += viatico;
        sumaComisiones += comision;
        sumaKg += kg;

        const row: any[] = [
          { text: v.fecha, style: "td" },
          { text: v.unidad || "-", style: "td", alignment: "center" },
          { text: v.ruta || "-", style: "td" },
          { text: fNumero(kg), style: "td", alignment: "right" },
          { text: fMoneda(monto), style: "td", alignment: "right" },
        ];
        if (mostrarViaticos) row.push({ text: fMoneda(viatico), style: "td", alignment: "right", color: "#166534" });
        if (mostrarComisiones) row.push({ text: fMoneda(comision), style: "td", alignment: "right", color: "#1d4ed8" });
        if (mostrarTotalDia) row.push({ text: fMoneda(totalDia), style: "tdBold", alignment: "right" });

        tableBody.push(row);
      });

      const totalRow: any[] = [
        { text: `TOTAL SEMANAL (${cantidadRutas} RUTAS)`, colSpan: 3, style: "thTotal", alignment: "right" },
        {},
        {},
        { text: fNumero(sumaKg), style: "thTotal", alignment: "right" },
        { text: fMoneda(sumaVenta), style: "thTotal", alignment: "right" },
      ];
      if (mostrarViaticos) totalRow.push({ text: fMoneda(sumaViaticos), style: "thTotal", alignment: "right" });
      if (mostrarComisiones) totalRow.push({ text: fMoneda(sumaComisiones), style: "thTotal", alignment: "right" });
      if (mostrarTotalDia) {
        totalRow.push({ text: fMoneda(sumaViaticos + sumaComisiones), style: "thGranTotal", alignment: "right" });
      }

      tableBody.push(totalRow);

      const tableWidths: string[] = ["auto", "auto", "*", "auto", "auto"];
      if (mostrarViaticos) tableWidths.push("auto");
      if (mostrarComisiones) tableWidths.push("auto");
      if (mostrarTotalDia) tableWidths.push("auto");

      // 🚀 SE RECONSTRUYÓ EL BLOQUE: LOGO + TÍTULOS EN CADA TABLA (AUXILIARES)
      contentBlocks.push({
        stack: [
          // 1. Logo y Título Principal
          {
            columns: [
              logoBase64 ? { image: logoBase64, width: 70 } : { text: "CIR", bold: true },
              {
                text: `${tituloGlobal}\n(DEL ${fechaInicio} AL ${fechaFin})`,
                style: "mainTitle",
                alignment: "right",
                margin: [0, 5, 0, 0],
              },
            ],
            margin: [0, 0, 0, 10],
          },
          // 2. Barra Gris del Auxiliar
          {
            text: `Auxiliar: ${ayudante}`,
            style: "choferTitle",
            margin: [0, 0, 0, 4],
          },
          // 3. La Tabla
          {
            table: {
              headerRows: 1,
              widths: tableWidths,
              body: tableBody,
            },
            layout: "lightHorizontalLines",
          },
          // 4. Firmas
          {
            columns: [
              { width: "*", text: "" },
              {
                width: 170,
                stack: [
                  { canvas: [{ type: "line", x1: 0, y1: 0, x2: 170, y2: 0, lineWidth: 1 }] },
                  { text: `Firma: ${ayudante}`, alignment: "center", margin: [0, 5, 0, 0], fontSize: 9, bold: true },
                ],
                margin: [0, 50, 0, 0],
              },
              { width: "*", text: "" },
              {
                width: 170,
                stack: [
                  { canvas: [{ type: "line", x1: 0, y1: 0, x2: 170, y2: 0, lineWidth: 1 }] },
                  { text: "Firma: Jefe de Reparto", alignment: "center", margin: [0, 5, 0, 0], fontSize: 9, bold: true },
                ],
                margin: [0, 50, 0, 0],
              },
              { width: "*", text: "" },
            ],
            margin: [0, 10, 0, 20],
          }
        ],
        unbreakable: true,
        margin: [0, 0, 0, 30],
      });
    });

  if (Object.keys(viajesPorAyudante).length === 0)
    contentBlocks.push({ text: "No hay viajes para calcular.", italics: true });

  pdfMake
    .createPdf({
      pageOrientation: "portrait",
      pageMargins: [30, 30, 30, 30],
      content: contentBlocks,
      styles: {
        mainTitle: { fontSize: 13, bold: true },
        choferTitle: {
          fontSize: 10,
          bold: true,
          background: "#f1f5f9",
          padding: 3,
        },
        th: {
          bold: true,
          fontSize: 8,
          fillColor: "#065f46",
          color: "white",
          margin: 3,
        },
        td: { fontSize: 7, margin: 3 },
        tdBold: { fontSize: 7, bold: true, margin: 3 },
        thTotal: { bold: true, fontSize: 8, fillColor: "#e2e8f0", margin: 3 },
        thGranTotal: {
          bold: true,
          fontSize: 8,
          fillColor: "#dcfce3",
          color: "#166534",
          margin: 3,
        },
      },
    })
    .download(`Reporte_Rutas_Auxiliares_${fechaInicio}.pdf`);
};
