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
  mostrarComisiones: boolean = true,
) => {
  const pdfMake = (window as any).pdfMake;
  if (!pdfMake) return alert("Generador PDF cargando...");
  const logoBase64 = await obtenerLogoBase64Local("/CIRLogo.png");

  const setChoferes = new Set<string>();
  viajes.forEach((v) => {
    if (v.chofer && v.chofer !== "-") {
      setChoferes.add(v.chofer.toUpperCase().trim());
    }
  });

  const viajesPorChofer: Record<string, any[]> = {};

  viajes.forEach((v) => {
    const c = v.chofer ? v.chofer.toUpperCase().trim() : "";
    const a1 = v.ayudante1 ? v.ayudante1.toUpperCase().trim() : "";
    const a2 = v.ayudante2 ? v.ayudante2.toUpperCase().trim() : "";

    const agregarViaje = (nombre: string, rol: string) => {
      if (choferElegido !== "TODOS" && nombre !== choferElegido) return;
      if (!viajesPorChofer[nombre]) viajesPorChofer[nombre] = [];
      viajesPorChofer[nombre].push({ ...v, rolGenerado: rol });
    };

    if (c && c !== "-") agregarViaje(c, "CHOFER");
    if (a1 && setChoferes.has(a1)) agregarViaje(a1, "AYUDANTE");
    if (a2 && setChoferes.has(a2)) agregarViaje(a2, "AYUDANTE");
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
      if (mostrarViaticos)
        headerRow.push({ text: "Viáticos", style: "th", alignment: "right" });
      if (mostrarComisiones)
        headerRow.push({ text: "Comisión", style: "th", alignment: "right" });
      if (mostrarTotalDia)
        headerRow.push({ text: "Total Día", style: "th", alignment: "right" });

      const tableBody: any[][] = [headerRow];

      viajesPorChofer[chofer].forEach((v) => {
        const rol = v.rolGenerado;
        const nombreRuta = (v.ruta || "").toUpperCase().trim();
        const monto = Number(v.totalMonto) || 0;

        let viatico = 0;
        let comision = 0;

        if (rol === "CHOFER") {
          viatico = Number(v.viaticoRuta) || 0;
          comision = Number(v.comisionChofer) || 0;
          if (nombreRuta === "TLMK" || nombreRuta === "TLMK 2")
            comision = monto * 0.001;
        } else {
          viatico = 0;
          comision = Number(v.comisionAyudante) || 0;
          if (nombreRuta === "TLMK" || nombreRuta === "TLMK 2")
            comision = monto * 0.001;
        }

        const kg = Number(v.kgTotal) || 0;
        const totalDia = viatico + comision;

        sumaVenta += monto;
        sumaViaticos += viatico;
        sumaComisiones += comision;
        sumaKg += kg;

        const textoRuta = v.ruta || "-";

        const row: any[] = [
          { text: v.fecha, style: "td" },
          { text: v.unidad || "-", style: "td", alignment: "center" },
          { text: textoRuta, style: "td" },
          { text: fNumero(kg), style: "td", alignment: "right" },
          { text: fMoneda(monto), style: "td", alignment: "right" },
        ];
        if (mostrarViaticos)
          row.push({
            text: fMoneda(viatico),
            style: "td",
            alignment: "right",
            color: "#166534",
          });
        if (mostrarComisiones)
          row.push({
            text: fMoneda(comision),
            style: "td",
            alignment: "right",
            color: "#1d4ed8",
          });
        if (mostrarTotalDia)
          row.push({
            text: fMoneda(totalDia),
            style: "tdBold",
            alignment: "right",
          });

        tableBody.push(row);
      });

      const totalRow: any[] = [
        {
          text: `TOTAL SEMANAL (${cantidadRutas} RUTAS)`,
          colSpan: 3,
          style: "thTotal",
          alignment: "right",
        },
        {},
        {},
        { text: fNumero(sumaKg), style: "thTotal", alignment: "right" },
        { text: fMoneda(sumaVenta), style: "thTotal", alignment: "right" },
      ];
      if (mostrarViaticos)
        totalRow.push({
          text: fMoneda(sumaViaticos),
          style: "thTotal",
          alignment: "right",
        });
      if (mostrarComisiones)
        totalRow.push({
          text: fMoneda(sumaComisiones),
          style: "thTotal",
          alignment: "right",
        });
      if (mostrarTotalDia) {
        totalRow.push({
          text: fMoneda(sumaViaticos + sumaComisiones),
          style: "thGranTotal",
          alignment: "right",
        });
      }

      tableBody.push(totalRow);

      const tableWidths: string[] = ["auto", "auto", "*", "auto", "auto"];
      if (mostrarViaticos) tableWidths.push("auto");
      if (mostrarComisiones) tableWidths.push("auto");
      if (mostrarTotalDia) tableWidths.push("auto");

      contentBlocks.push({
        stack: [
          {
            columns: [
              logoBase64
                ? { image: logoBase64, width: 70 }
                : { text: "CIR", bold: true },
              {
                text: `${tituloGlobal}\n(DEL ${fechaInicio} AL ${fechaFin})`,
                style: "mainTitle",
                alignment: "right",
                margin: [0, 5, 0, 0],
              },
            ],
            margin: [0, 0, 0, 10],
          },
          {
            text: `Chofer: ${chofer}`,
            style: "choferTitle",
            margin: [0, 0, 0, 4],
          },
          {
            table: {
              headerRows: 1,
              widths: tableWidths,
              body: tableBody,
            },
            layout: "lightHorizontalLines",
          },
          {
            columns: [
              { width: "*", text: "" },
              {
                width: 170,
                stack: [
                  {
                    canvas: [
                      {
                        type: "line",
                        x1: 0,
                        y1: 0,
                        x2: 170,
                        y2: 0,
                        lineWidth: 1,
                      },
                    ],
                  },
                  {
                    text: `Firma: ${chofer}`,
                    alignment: "center",
                    margin: [0, 5, 0, 0],
                    fontSize: 9,
                    bold: true,
                  },
                ],
                margin: [0, 50, 0, 0],
              },
              { width: "*", text: "" },
              {
                width: 170,
                stack: [
                  {
                    canvas: [
                      {
                        type: "line",
                        x1: 0,
                        y1: 0,
                        x2: 170,
                        y2: 0,
                        lineWidth: 1,
                      },
                    ],
                  },
                  {
                    text: "Firma: Jefe de Reparto",
                    alignment: "center",
                    margin: [0, 5, 0, 0],
                    fontSize: 9,
                    bold: true,
                  },
                ],
                margin: [0, 50, 0, 0],
              },
              { width: "*", text: "" },
            ],
            margin: [0, 10, 0, 20],
          },
        ],
        unbreakable: true,
        margin: [0, 0, 0, 30],
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
  mostrarComisiones: boolean = true,
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
      if (mostrarViaticos)
        headerRow.push({ text: "Viáticos", style: "th", alignment: "right" });
      if (mostrarComisiones)
        headerRow.push({ text: "Comisión", style: "th", alignment: "right" });
      if (mostrarTotalDia)
        headerRow.push({ text: "Total Día", style: "th", alignment: "right" });

      const tableBody: any[][] = [headerRow];

      viajesPorAyudante[ayudante].forEach((v) => {
        const nombreRuta = (v.ruta || "").toUpperCase().trim();
        const monto = Number(v.totalMonto) || 0;
        const viatico = Number(v.viaticoRuta) || 0;
        let comision = Number(v.comisionAyudante) || 0;

        if (nombreRuta === "TLMK" || nombreRuta === "TLMK 2")
          comision = monto * 0.001;

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
        if (mostrarViaticos)
          row.push({
            text: fMoneda(viatico),
            style: "td",
            alignment: "right",
            color: "#166534",
          });
        if (mostrarComisiones)
          row.push({
            text: fMoneda(comision),
            style: "td",
            alignment: "right",
            color: "#1d4ed8",
          });
        if (mostrarTotalDia)
          row.push({
            text: fMoneda(totalDia),
            style: "tdBold",
            alignment: "right",
          });

        tableBody.push(row);
      });

      const totalRow: any[] = [
        {
          text: `TOTAL SEMANAL (${cantidadRutas} RUTAS)`,
          colSpan: 3,
          style: "thTotal",
          alignment: "right",
        },
        {},
        {},
        { text: fNumero(sumaKg), style: "thTotal", alignment: "right" },
        { text: fMoneda(sumaVenta), style: "thTotal", alignment: "right" },
      ];
      if (mostrarViaticos)
        totalRow.push({
          text: fMoneda(sumaViaticos),
          style: "thTotal",
          alignment: "right",
        });
      if (mostrarComisiones)
        totalRow.push({
          text: fMoneda(sumaComisiones),
          style: "thTotal",
          alignment: "right",
        });
      if (mostrarTotalDia) {
        totalRow.push({
          text: fMoneda(sumaViaticos + sumaComisiones),
          style: "thGranTotal",
          alignment: "right",
        });
      }

      tableBody.push(totalRow);

      const tableWidths: string[] = ["auto", "auto", "*", "auto", "auto"];
      if (mostrarViaticos) tableWidths.push("auto");
      if (mostrarComisiones) tableWidths.push("auto");
      if (mostrarTotalDia) tableWidths.push("auto");

      contentBlocks.push({
        stack: [
          {
            columns: [
              logoBase64
                ? { image: logoBase64, width: 70 }
                : { text: "CIR", bold: true },
              {
                text: `${tituloGlobal}\n(DEL ${fechaInicio} AL ${fechaFin})`,
                style: "mainTitle",
                alignment: "right",
                margin: [0, 5, 0, 0],
              },
            ],
            margin: [0, 0, 0, 10],
          },
          {
            text: `Auxiliar: ${ayudante}`,
            style: "choferTitle",
            margin: [0, 0, 0, 4],
          },
          {
            table: {
              headerRows: 1,
              widths: tableWidths,
              body: tableBody,
            },
            layout: "lightHorizontalLines",
          },
          {
            columns: [
              { width: "*", text: "" },
              {
                width: 170,
                stack: [
                  {
                    canvas: [
                      {
                        type: "line",
                        x1: 0,
                        y1: 0,
                        x2: 170,
                        y2: 0,
                        lineWidth: 1,
                      },
                    ],
                  },
                  {
                    text: `Firma: ${ayudante}`,
                    alignment: "center",
                    margin: [0, 5, 0, 0],
                    fontSize: 9,
                    bold: true,
                  },
                ],
                margin: [0, 50, 0, 0],
              },
              { width: "*", text: "" },
              {
                width: 170,
                stack: [
                  {
                    canvas: [
                      {
                        type: "line",
                        x1: 0,
                        y1: 0,
                        x2: 170,
                        y2: 0,
                        lineWidth: 1,
                      },
                    ],
                  },
                  {
                    text: "Firma: Jefe de Reparto",
                    alignment: "center",
                    margin: [0, 5, 0, 0],
                    fontSize: 9,
                    bold: true,
                  },
                ],
                margin: [0, 50, 0, 0],
              },
              { width: "*", text: "" },
            ],
            margin: [0, 10, 0, 20],
          },
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

// ============================================================================
// PDF: RESUMEN GENERAL DE PAGOS (TODOS) - CON CHECKS DE COLUMNAS 🚀
// ============================================================================
export const generarPDFResumenGeneral = async (
  viajes: any[],
  fechaInicio: string,
  fechaFin: string,
  mostrarViaticos: boolean = true, // 🚀 AHORA RECIBE EL VALOR
  mostrarComisiones: boolean = true, // 🚀 AHORA RECIBE EL VALOR
) => {
  const pdfMake = (window as any).pdfMake;
  if (!pdfMake) return alert("Generador PDF cargando...");
  const logoBase64 = await obtenerLogoBase64Local("/CIRLogo.png");

  const totales: Record<
    string,
    { rol: string; viaticos: number; comisiones: number }
  > = {};
  const setChoferes = new Set<string>();

  viajes.forEach((v) => {
    if (v.chofer && v.chofer !== "-")
      setChoferes.add(v.chofer.toUpperCase().trim());
  });

  viajes.forEach((v) => {
    const c = v.chofer ? v.chofer.toUpperCase().trim() : "";
    const a1 = v.ayudante1 ? v.ayudante1.toUpperCase().trim() : "";
    const a2 = v.ayudante2 ? v.ayudante2.toUpperCase().trim() : "";
    const nombreRuta = (v.ruta || "").toUpperCase().trim();
    const monto = Number(v.totalMonto) || 0;

    if (c && c !== "-") {
      if (!totales[c])
        totales[c] = { rol: "CHOFER", viaticos: 0, comisiones: 0 };
      totales[c].viaticos += Number(v.viaticoRuta) || 0;
      let comision = Number(v.comisionChofer) || 0;
      if (nombreRuta === "TLMK" || nombreRuta === "TLMK 2")
        comision = monto * 0.001;
      totales[c].comisiones += comision;
    }

    const procesarAyudante = (ay: string) => {
      if (ay && ay !== "-" && ay !== "SIN AYUDANTE" && ay !== "UNDEFINED") {
        const esChofer = setChoferes.has(ay);
        if (!totales[ay]) {
          totales[ay] = {
            rol: esChofer ? "CHOFER" : "AUXILIAR",
            viaticos: 0,
            comisiones: 0,
          };
        }

        let comision = Number(v.comisionAyudante) || 0;
        if (nombreRuta === "TLMK" || nombreRuta === "TLMK 2")
          comision = monto * 0.001;
        totales[ay].comisiones += comision;

        if (!esChofer) {
          totales[ay].viaticos += Number(v.viaticoRuta) || 0;
        }
      }
    };

    procesarAyudante(a1);
    procesarAyudante(a2);
  });

  // 🚀 CONSTRUIMOS EL ENCABEZADO DEPENDIENDO DE LOS CHECKBOXES
  const headerRow: any[] = [
    { text: "Personal", style: "th" },
    { text: "Puesto", style: "th", alignment: "center" },
  ];
  if (mostrarViaticos)
    headerRow.push({ text: "Viáticos", style: "th", alignment: "right" });
  if (mostrarComisiones)
    headerRow.push({ text: "Comisión", style: "th", alignment: "right" });
  headerRow.push({ text: "Total a Pagar", style: "th", alignment: "right" });

  const tableBody: any[][] = [headerRow];

  let sumaViaticos = 0,
    sumaComisiones = 0,
    sumaTotal = 0;

  Object.keys(totales)
    .sort()
    .forEach((nombre) => {
      const data = totales[nombre];

      // 🚀 SOLO SUMAMOS AL TOTAL LO QUE ESTÉ ACTIVADO
      const viaticoCobrado = mostrarViaticos ? data.viaticos : 0;
      const comisionCobrada = mostrarComisiones ? data.comisiones : 0;
      const total = viaticoCobrado + comisionCobrada;

      if (mostrarViaticos) sumaViaticos += data.viaticos;
      if (mostrarComisiones) sumaComisiones += data.comisiones;
      sumaTotal += total;

      const row: any[] = [
        { text: nombre, style: "td", bold: true },
        { text: data.rol, style: "td", alignment: "center" },
      ];
      if (mostrarViaticos)
        row.push({
          text: fMoneda(data.viaticos),
          style: "td",
          alignment: "right",
          color: "#166534",
        });
      if (mostrarComisiones)
        row.push({
          text: fMoneda(data.comisiones),
          style: "td",
          alignment: "right",
          color: "#1d4ed8",
        });
      row.push({ text: fMoneda(total), style: "tdBold", alignment: "right" });

      tableBody.push(row);
    });

  // 🚀 TOTAL GENERAL DINÁMICO
  const totalRow: any[] = [
    { text: "TOTAL GENERAL", colSpan: 2, style: "thTotal", alignment: "right" },
    {},
  ];
  if (mostrarViaticos)
    totalRow.push({
      text: fMoneda(sumaViaticos),
      style: "thTotal",
      alignment: "right",
    });
  if (mostrarComisiones)
    totalRow.push({
      text: fMoneda(sumaComisiones),
      style: "thTotal",
      alignment: "right",
    });
  totalRow.push({
    text: fMoneda(sumaTotal),
    style: "thGranTotal",
    alignment: "right",
  });

  tableBody.push(totalRow);

  // 🚀 TAMAÑO DE COLUMNAS DINÁMICO
  const tableWidths: string[] = ["*", "auto"];
  if (mostrarViaticos) tableWidths.push("auto");
  if (mostrarComisiones) tableWidths.push("auto");
  tableWidths.push("auto"); // Para el Total a Pagar

  const contentBlocks = [
    {
      columns: [
        logoBase64
          ? { image: logoBase64, width: 70 }
          : { text: "CIR", bold: true },
        {
          text: `RESUMEN GENERAL DE NÓMINA\n(DEL ${fechaInicio} AL ${fechaFin})`,
          style: "mainTitle",
          alignment: "right",
          margin: [0, 5, 0, 0],
        },
      ],
      margin: [0, 0, 0, 15],
    },
    {
      table: {
        headerRows: 1,
        widths: tableWidths,
        body: tableBody,
      },
      layout: "lightHorizontalLines",
    },
    {
      columns: [
        { width: "*", text: "" },
        {
          width: 120,
          stack: [
            {
              canvas: [
                { type: "line", x1: 0, y1: 0, x2: 120, y2: 0, lineWidth: 1 },
              ],
            },
            {
              text: "Recursos Humanos",
              alignment: "center",
              margin: [0, 5, 0, 0],
              fontSize: 8,
              bold: true,
            },
          ],
        },
        { width: "*", text: "" },
        {
          width: 120,
          stack: [
            {
              canvas: [
                { type: "line", x1: 0, y1: 0, x2: 120, y2: 0, lineWidth: 1 },
              ],
            },
            {
              text: "Jefe de Embarques",
              alignment: "center",
              margin: [0, 5, 0, 0],
              fontSize: 8,
              bold: true,
            },
          ],
        },
        { width: "*", text: "" },
        {
          width: 120,
          stack: [
            {
              canvas: [
                { type: "line", x1: 0, y1: 0, x2: 120, y2: 0, lineWidth: 1 },
              ],
            },
            {
              text: "Jefe de Reparto",
              alignment: "center",
              margin: [0, 5, 0, 0],
              fontSize: 8,
              bold: true,
            },
          ],
        },
        { width: "*", text: "" },
      ],
      margin: [0, 60, 0, 0],
    },
  ];

  pdfMake
    .createPdf({
      pageOrientation: "portrait",
      pageMargins: [30, 30, 30, 30],
      content: contentBlocks,
      styles: {
        mainTitle: { fontSize: 13, bold: true },
        th: {
          bold: true,
          fontSize: 9,
          fillColor: "#0f172a",
          color: "white",
          margin: 4,
        },
        td: { fontSize: 8, margin: 4 },
        tdBold: { fontSize: 8, bold: true, margin: 4 },
        thTotal: { bold: true, fontSize: 9, fillColor: "#e2e8f0", margin: 4 },
        thGranTotal: {
          bold: true,
          fontSize: 9,
          fillColor: "#dcfce3",
          color: "#166534",
          margin: 4,
        },
      },
    })
    .download(`Resumen_General_Nomina_${fechaInicio}.pdf`);
};
