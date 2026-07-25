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
// 🚀 NUEVO: Formateador para los Kilos (sin signo de $)
const fNumero = (c: number) =>
  new Intl.NumberFormat("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(c);

// ============================================================================
// PDF: NÓMINA DE CHOFERES
// ============================================================================
export const generarPDFNominaChoferes = async (
  viajes: any[],
  fechaInicio: string,
  fechaFin: string,
  choferElegido: string = "TODOS",
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
  const titulo =
    choferElegido === "TODOS"
      ? `REPORTE DE RUTAS\n(DEL ${fechaInicio} AL ${fechaFin})`
      : `NÓMINA: ${choferElegido}\n(DEL ${fechaInicio} AL ${fechaFin})`;

  contentBlocks.push({
    columns: [
      logoBase64 ? { image: logoBase64, width: 80 } : { text: "CIR" },
      {
        text: titulo,
        style: "mainTitle",
        alignment: "right",
        margin: [0, 10, 0, 0],
      },
    ],
    margin: [0, 0, 0, 20],
  });

  Object.keys(viajesPorChofer)
    .sort()
    .forEach((chofer) => {
      // 🚀 AGREGAMOS sumaKg
      let sumaVenta = 0,
        sumaViaticos = 0,
        sumaComisiones = 0,
        sumaKg = 0;

      const tableBody: any[][] = [
        [
          { text: "Fecha", style: "th" },
          { text: "Un.", style: "th", alignment: "center" },
          { text: "Ruta", style: "th" },
          { text: "KG", style: "th", alignment: "right" }, // 🚀 NUEVA COLUMNA
          { text: "Venta ($)", style: "th", alignment: "right" },
          { text: "Viáticos", style: "th", alignment: "right" },
          { text: "Comisión", style: "th", alignment: "right" },
          { text: "Total Día", style: "th", alignment: "right" },
        ],
      ];

      viajesPorChofer[chofer].forEach((v) => {
        const monto = Number(v.totalMonto) || 0;
        const viatico = Number(v.viaticoRuta) || 0;
        const comision = Number(v.comisionChofer) || 0;
        const kg = Number(v.kgTotal) || 0; // 🚀 EXTRAEMOS LOS KILOS
        const totalDia = viatico + comision;

        sumaVenta += monto;
        sumaViaticos += viatico;
        sumaComisiones += comision;
        sumaKg += kg; // 🚀 SUMAMOS LOS KILOS

        tableBody.push([
          { text: v.fecha, style: "td" },
          { text: v.unidad || "-", style: "td", alignment: "center" },
          { text: v.ruta || "-", style: "td" },
          { text: fNumero(kg), style: "td", alignment: "right" }, // 🚀 AGREGAMOS LA CELDA DE KILOS
          { text: fMoneda(monto), style: "td", alignment: "right" },
          {
            text: fMoneda(viatico),
            style: "td",
            alignment: "right",
            color: "#166534",
          },
          {
            text: fMoneda(comision),
            style: "td",
            alignment: "right",
            color: "#1d4ed8",
          },
          { text: fMoneda(totalDia), style: "tdBold", alignment: "right" },
        ]);
      });

      tableBody.push([
        {
          text: "TOTAL SEMANAL",
          colSpan: 3,
          style: "thTotal",
          alignment: "right",
        },
        {},
        {},
        { text: fNumero(sumaKg), style: "thTotal", alignment: "right" }, // 🚀 TOTAL DE KILOS AL FINAL
        { text: fMoneda(sumaVenta), style: "thTotal", alignment: "right" },
        { text: fMoneda(sumaViaticos), style: "thTotal", alignment: "right" },
        { text: fMoneda(sumaComisiones), style: "thTotal", alignment: "right" },
        {
          text: fMoneda(sumaViaticos + sumaComisiones),
          style: "thGranTotal",
          alignment: "right",
        },
      ]);

      contentBlocks.push(
        {
          text: `Chofer: ${chofer}`,
          style: "choferTitle",
          margin: [0, 10, 0, 5],
        },
        // 🚀 AGREGAMOS UN "auto" EXTRA AL ARREGLO DE WIDTHS PARA LA NUEVA COLUMNA
        {
          table: {
            headerRows: 1,
            widths: [
              "auto",
              "auto",
              "*",
              "auto",
              "auto",
              "auto",
              "auto",
              "auto",
            ],
            body: tableBody,
          },
          margin: [0, 0, 0, 20],
          layout: "lightHorizontalLines",
        },
      );
    });

  if (Object.keys(viajesPorChofer).length === 0)
    contentBlocks.push({ text: "No hay viajes para calcular.", italics: true });

  pdfMake
    .createPdf({
      pageOrientation: "landscape",
      pageMargins: [40, 40, 40, 40],
      content: contentBlocks,
      styles: {
        mainTitle: { fontSize: 14, bold: true },
        choferTitle: {
          fontSize: 11,
          bold: true,
          background: "#f1f5f9",
          padding: 4,
        },
        th: {
          bold: true,
          fontSize: 9,
          fillColor: "#4c1d95",
          color: "white",
          margin: 4,
        },
        td: { fontSize: 8, margin: 4 },
        tdBold: { fontSize: 8, bold: true, margin: 4 },
        thTotal: { bold: true, fontSize: 9, fillColor: "#e2e8f0", margin: 4 },
        thGranTotal: {
          bold: true,
          fontSize: 10,
          fillColor: "#dcfce3",
          color: "#166534",
          margin: 4,
        },
      },
    })
    .download(`Reporte_Rutas_Choferes_${fechaInicio}.pdf`);
};

// ============================================================================
// PDF: NÓMINA DE AYUDANTES
// ============================================================================
export const generarPDFNominaAyudantes = async (
  viajes: any[],
  fechaInicio: string,
  fechaFin: string,
  ayudanteElegido: string = "TODOS",
  listaNegraChoferes: Set<string>,
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
    if (listaNegraChoferes.has(nombre)) return; // Ignoramos choferes disfrazados
    if (ayudanteElegido !== "TODOS" && nombre !== ayudanteElegido) return;

    if (!viajesPorAyudante[nombre]) viajesPorAyudante[nombre] = [];
    viajesPorAyudante[nombre].push(viaje);
  };

  viajes.forEach((v) => {
    procesarAyudante(v.ayudante1, v);
    procesarAyudante(v.ayudante2, v);
  });

  const contentBlocks: any[] = [];
  const titulo =
    ayudanteElegido === "TODOS"
      ? `REPORTE DE RUTAS\n(DEL ${fechaInicio} AL ${fechaFin})`
      : `REPORTE: ${ayudanteElegido}\n(DEL ${fechaInicio} AL ${fechaFin})`;

  contentBlocks.push({
    columns: [
      logoBase64 ? { image: logoBase64, width: 80 } : { text: "CIR" },
      {
        text: titulo,
        style: "mainTitle",
        alignment: "right",
        margin: [0, 10, 0, 0],
      },
    ],
    margin: [0, 0, 0, 20],
  });

  Object.keys(viajesPorAyudante)
    .sort()
    .forEach((ayudante) => {
      // 🚀 AGREGAMOS sumaKg
      let sumaVenta = 0,
        sumaViaticos = 0,
        sumaComisiones = 0,
        sumaKg = 0;

      const tableBody: any[][] = [
        [
          { text: "Fecha", style: "th" },
          { text: "Un.", style: "th", alignment: "center" },
          { text: "Ruta", style: "th" },
          { text: "KG", style: "th", alignment: "right" }, // 🚀 NUEVA COLUMNA
          { text: "Venta ($)", style: "th", alignment: "right" },
          { text: "Viáticos", style: "th", alignment: "right" },
          { text: "Comisión", style: "th", alignment: "right" },
          { text: "Total Día", style: "th", alignment: "right" },
        ],
      ];

      viajesPorAyudante[ayudante].forEach((v) => {
        const monto = Number(v.totalMonto) || 0;
        const viatico = Number(v.viaticoRuta) || 0;
        const comision = Number(v.comisionAyudante) || 0;
        const kg = Number(v.kgTotal) || 0; // 🚀 EXTRAEMOS LOS KILOS
        const totalDia = viatico + comision;

        sumaVenta += monto;
        sumaViaticos += viatico;
        sumaComisiones += comision;
        sumaKg += kg; // 🚀 SUMAMOS LOS KILOS

        tableBody.push([
          { text: v.fecha, style: "td" },
          { text: v.unidad || "-", style: "td", alignment: "center" },
          { text: v.ruta || "-", style: "td" },
          { text: fNumero(kg), style: "td", alignment: "right" }, // 🚀 AGREGAMOS LA CELDA DE KILOS
          { text: fMoneda(monto), style: "td", alignment: "right" },
          {
            text: fMoneda(viatico),
            style: "td",
            alignment: "right",
            color: "#166534",
          },
          {
            text: fMoneda(comision),
            style: "td",
            alignment: "right",
            color: "#1d4ed8",
          },
          { text: fMoneda(totalDia), style: "tdBold", alignment: "right" },
        ]);
      });

      tableBody.push([
        {
          text: "TOTAL SEMANAL",
          colSpan: 3,
          style: "thTotal",
          alignment: "right",
        },
        {},
        {},
        { text: fNumero(sumaKg), style: "thTotal", alignment: "right" }, // 🚀 TOTAL DE KILOS AL FINAL
        { text: fMoneda(sumaVenta), style: "thTotal", alignment: "right" },
        { text: fMoneda(sumaViaticos), style: "thTotal", alignment: "right" },
        { text: fMoneda(sumaComisiones), style: "thTotal", alignment: "right" },
        {
          text: fMoneda(sumaViaticos + sumaComisiones),
          style: "thGranTotal",
          alignment: "right",
        },
      ]);

      contentBlocks.push(
        {
          text: `Ayudante: ${ayudante}`,
          style: "choferTitle",
          margin: [0, 10, 0, 5],
        },
        // 🚀 AGREGAMOS UN "auto" EXTRA AL ARREGLO DE WIDTHS PARA LA NUEVA COLUMNA
        {
          table: {
            headerRows: 1,
            widths: [
              "auto",
              "auto",
              "*",
              "auto",
              "auto",
              "auto",
              "auto",
              "auto",
            ],
            body: tableBody,
          },
          margin: [0, 0, 0, 20],
          layout: "lightHorizontalLines",
        },
      );
    });

  if (Object.keys(viajesPorAyudante).length === 0)
    contentBlocks.push({ text: "No hay viajes para calcular.", italics: true });

  pdfMake
    .createPdf({
      pageOrientation: "landscape",
      pageMargins: [40, 40, 40, 40],
      content: contentBlocks,
      styles: {
        mainTitle: { fontSize: 14, bold: true },
        choferTitle: {
          fontSize: 11,
          bold: true,
          background: "#f1f5f9",
          padding: 4,
        },
        th: {
          bold: true,
          fontSize: 9,
          fillColor: "#065f46",
          color: "white",
          margin: 4,
        },
        td: { fontSize: 8, margin: 4 },
        tdBold: { fontSize: 8, bold: true, margin: 4 },
        thTotal: { bold: true, fontSize: 9, fillColor: "#e2e8f0", margin: 4 },
        thGranTotal: {
          bold: true,
          fontSize: 10,
          fillColor: "#dcfce3",
          color: "#166534",
          margin: 4,
        },
      },
    })
    .download(`Reporte_Rutas_ayudantes${fechaInicio}.pdf`);
};
