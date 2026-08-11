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
// PDF: REPORTE DE CHOFERES (VERTICAL / RETRATO) - ESTILO CORPORATIVO
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
    const a1 = v.auxiliar1 ? v.auxiliar1.toUpperCase().trim() : "";
    const a2 = v.auxiliar2 ? v.auxiliar2.toUpperCase().trim() : "";

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

      viajesPorChofer[chofer].forEach((v, index) => {
        const rol = v.rolGenerado;
        const nombreRuta = (v.ruta || "").toUpperCase().trim();

        // 🚀 CORREGIDO: Leemos de totalSumaDinero y totalSumaKilos
        const monto = Number(v.totalSumaDinero ?? v.totalMonto) || 0;
        const kg = Number(v.totalSumaKilos ?? v.kgTotal) || 0;

        let viatico = 0;
        let comision = 0;

        if (rol === "CHOFER") {
          viatico = Number(v.viaticoRuta) || 0;
          comision = Number(v.comisionChofer) || 0;
          if (nombreRuta === "TLMK" || nombreRuta === "TLMK 2") {
            comision = comision > 0 ? comision : monto * 0.001;
          }
        } else {
          viatico = Number(v.viaticoRuta) || 0;
          comision = Number(v.comisionAyudante) || 0;
          if (nombreRuta === "TLMK" || nombreRuta === "TLMK 2") comision = 0;
        }

        const totalDia = viatico + comision;

        sumaVenta += monto;
        sumaViaticos += viatico;
        sumaComisiones += comision;
        sumaKg += kg;

        const textoRuta =
          rol === "AYUDANTE" ? `${v.ruta || "-"} (APOYO)` : v.ruta || "-";
        const esPar = index % 2 === 0;
        const bgFila = esPar ? "#ffffff" : "#f8fafc";

        const row: any[] = [
          { text: v.fecha, style: "td", fillColor: bgFila },
          { text: v.unidad || "-", style: "tdCenter", fillColor: bgFila },
          { text: textoRuta, style: "td", fillColor: bgFila },
          { text: fNumero(kg), style: "tdRight", fillColor: bgFila },
          {
            text: fMoneda(monto),
            style: "tdRight",
            fillColor: bgFila,
            color: "#047857",
          },
        ];
        if (mostrarViaticos)
          row.push({
            text: fMoneda(viatico),
            style: "tdRight",
            fillColor: bgFila,
            color: "#166534",
          });
        if (mostrarComisiones)
          row.push({
            text: fMoneda(comision),
            style: "tdRight",
            fillColor: bgFila,
            color: "#1d4ed8",
          });
        if (mostrarTotalDia)
          row.push({
            text: fMoneda(totalDia),
            style: "tdBoldRight",
            fillColor: bgFila,
          });

        tableBody.push(row);
      });

      const totalRow: any[] = [
        {
          text: `TOTAL SEMANAL (${cantidadRutas} RUTAS)`,
          colSpan: 3,
          style: "thTotal",
          alignment: "left",
        },
        {},
        {},
        { text: fNumero(sumaKg), style: "thTotalRight", alignment: "right" },
        {
          text: fMoneda(sumaVenta),
          style: "thTotalRight",
          alignment: "right",
          color: "#065f46",
        },
      ];
      if (mostrarViaticos)
        totalRow.push({
          text: fMoneda(sumaViaticos),
          style: "thTotalRight",
          alignment: "right",
          color: "#166534",
        });
      if (mostrarComisiones)
        totalRow.push({
          text: fMoneda(sumaComisiones),
          style: "thTotalRight",
          alignment: "right",
          color: "#1e40af",
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
                ? { image: logoBase64, width: 60 }
                : { text: "CIR", bold: true },
              {
                stack: [
                  {
                    text: tituloGlobal,
                    fontSize: 12,
                    bold: true,
                    color: "#0f172a",
                    alignment: "right",
                  },
                  {
                    text: `PERIODO: DEL ${fechaInicio} AL ${fechaFin}`,
                    fontSize: 8,
                    bold: true,
                    color: "#64748b",
                    alignment: "right",
                    margin: [0, 2, 0, 0],
                  },
                ],
                alignment: "right",
              },
            ],
            margin: [0, 0, 0, 10],
          },
          {
            table: {
              widths: ["*"],
              body: [
                [
                  {
                    text: `CHOFER: ${chofer}`,
                    fontSize: 9,
                    bold: true,
                    color: "#0f172a",
                    margin: [8, 5, 8, 5],
                    fillColor: "#f1f5f9",
                  },
                ],
              ],
            },
            layout: { hLineWidth: () => 0, vLineWidth: () => 0 },
            margin: [0, 0, 0, 8],
          },
          {
            table: {
              headerRows: 1,
              widths: tableWidths,
              body: tableBody,
            },
            layout: {
              hLineWidth: (i: number, node: any) =>
                i === 0 || i === 1 || i === node.table.body.length ? 1 : 0.5,
              vLineWidth: () => 0,
              hLineColor: (i: number, node: any) =>
                i === 0 || i === node.table.body.length ? "#0f172a" : "#e2e8f0",
              paddingTop: () => 5,
              paddingBottom: () => 5,
              paddingLeft: () => 4,
              paddingRight: () => 4,
            },
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
                        lineColor: "#94a3b8",
                      },
                    ],
                  },
                  {
                    text: `Firma: ${chofer}`,
                    alignment: "center",
                    margin: [0, 4, 0, 0],
                    fontSize: 8,
                    bold: true,
                    color: "#334155",
                  },
                ],
                margin: [0, 35, 0, 0],
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
                        lineColor: "#94a3b8",
                      },
                    ],
                  },
                  {
                    text: "Firma: Jefe de Reparto",
                    alignment: "center",
                    margin: [0, 4, 0, 0],
                    fontSize: 8,
                    bold: true,
                    color: "#334155",
                  },
                ],
                margin: [0, 35, 0, 0],
              },
              { width: "*", text: "" },
            ],
            margin: [0, 10, 0, 20],
          },
        ],
        unbreakable: true,
        margin: [0, 0, 0, 20],
      });
    });

  if (Object.keys(viajesPorChofer).length === 0)
    contentBlocks.push({ text: "No hay viajes para calcular.", italics: true });

  pdfMake
    .createPdf({
      pageOrientation: "portrait",
      pageMargins: [25, 25, 25, 25],
      content: contentBlocks,
      styles: {
        th: {
          bold: true,
          fontSize: 8,
          fillColor: "#0f172a",
          color: "white",
          margin: [2, 2],
        },
        td: { fontSize: 7.5, color: "#334155", margin: [2, 2] },
        tdCenter: {
          fontSize: 7.5,
          color: "#334155",
          alignment: "center",
          margin: [2, 2],
        },
        tdRight: {
          fontSize: 7.5,
          color: "#334155",
          alignment: "right",
          margin: [2, 2],
        },
        tdBoldRight: {
          fontSize: 7.5,
          bold: true,
          color: "#0f172a",
          alignment: "right",
          margin: [2, 2],
        },
        thTotal: {
          bold: true,
          fontSize: 8,
          fillColor: "#f8fafc",
          color: "#0f172a",
          margin: [3, 3],
        },
        thTotalRight: {
          bold: true,
          fontSize: 8,
          fillColor: "#f8fafc",
          alignment: "right",
          margin: [3, 3],
        },
        thGranTotal: {
          bold: true,
          fontSize: 8,
          fillColor: "#ecfdf5",
          color: "#047857",
          alignment: "right",
          margin: [3, 3],
        },
      },
    })
    .download(`Reporte_Rutas_Choferes_${fechaInicio}.pdf`);
};

// ============================================================================
// PDF: REPORTE DE AUXILIARES (VERTICAL / RETRATO) - ESTILO CORPORATIVO
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
    procesarAyudante(v.auxiliar1, v);
    procesarAyudante(v.auxiliar2, v);
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

      viajesPorAyudante[ayudante].forEach((v, index) => {
        const nombreRuta = (v.ruta || "").toUpperCase().trim();

        // 🚀 CORREGIDO: Leemos de totalSumaDinero y totalSumaKilos
        const monto = Number(v.totalSumaDinero ?? v.totalMonto) || 0;
        const kg = Number(v.totalSumaKilos ?? v.kgTotal) || 0;

        const viatico = Number(v.viaticoRuta) || 0;
        let comision = Number(v.comisionAyudante) || 0;

        if (nombreRuta === "TLMK" || nombreRuta === "TLMK 2") comision = 0;

        const totalDia = viatico + comision;

        sumaVenta += monto;
        sumaViaticos += viatico;
        sumaComisiones += comision;
        sumaKg += kg;

        const esPar = index % 2 === 0;
        const bgFila = esPar ? "#ffffff" : "#f8fafc";

        const row: any[] = [
          { text: v.fecha, style: "td", fillColor: bgFila },
          { text: v.unidad || "-", style: "tdCenter", fillColor: bgFila },
          { text: v.ruta || "-", style: "td", fillColor: bgFila },
          { text: fNumero(kg), style: "tdRight", fillColor: bgFila },
          {
            text: fMoneda(monto),
            style: "tdRight",
            fillColor: bgFila,
            color: "#047857",
          },
        ];
        if (mostrarViaticos)
          row.push({
            text: fMoneda(viatico),
            style: "tdRight",
            fillColor: bgFila,
            color: "#166534",
          });
        if (mostrarComisiones)
          row.push({
            text: fMoneda(comision),
            style: "tdRight",
            fillColor: bgFila,
            color: "#1d4ed8",
          });
        if (mostrarTotalDia)
          row.push({
            text: fMoneda(totalDia),
            style: "tdBoldRight",
            fillColor: bgFila,
          });

        tableBody.push(row);
      });

      const totalRow: any[] = [
        {
          text: `TOTAL SEMANAL (${cantidadRutas} RUTAS)`,
          colSpan: 3,
          style: "thTotal",
          alignment: "left",
        },
        {},
        {},
        { text: fNumero(sumaKg), style: "thTotalRight", alignment: "right" },
        {
          text: fMoneda(sumaVenta),
          style: "thTotalRight",
          alignment: "right",
          color: "#065f46",
        },
      ];
      if (mostrarViaticos)
        totalRow.push({
          text: fMoneda(sumaViaticos),
          style: "thTotalRight",
          alignment: "right",
          color: "#166534",
        });
      if (mostrarComisiones)
        totalRow.push({
          text: fMoneda(sumaComisiones),
          style: "thTotalRight",
          alignment: "right",
          color: "#1e40af",
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
                ? { image: logoBase64, width: 60 }
                : { text: "CIR", bold: true },
              {
                stack: [
                  {
                    text: tituloGlobal,
                    fontSize: 12,
                    bold: true,
                    color: "#0f172a",
                    alignment: "right",
                  },
                  {
                    text: `PERIODO: DEL ${fechaInicio} AL ${fechaFin}`,
                    fontSize: 8,
                    bold: true,
                    color: "#64748b",
                    alignment: "right",
                    margin: [0, 2, 0, 0],
                  },
                ],
                alignment: "right",
              },
            ],
            margin: [0, 0, 0, 10],
          },
          {
            table: {
              widths: ["*"],
              body: [
                [
                  {
                    text: `AUXILIAR: ${ayudante}`,
                    fontSize: 9,
                    bold: true,
                    color: "#0f172a",
                    margin: [8, 5, 8, 5],
                    fillColor: "#f1f5f9",
                  },
                ],
              ],
            },
            layout: { hLineWidth: () => 0, vLineWidth: () => 0 },
            margin: [0, 0, 0, 8],
          },
          {
            table: {
              headerRows: 1,
              widths: tableWidths,
              body: tableBody,
            },
            layout: {
              hLineWidth: (i: number, node: any) =>
                i === 0 || i === 1 || i === node.table.body.length ? 1 : 0.5,
              vLineWidth: () => 0,
              hLineColor: (i: number, node: any) =>
                i === 0 || i === node.table.body.length ? "#0f172a" : "#e2e8f0",
              paddingTop: () => 5,
              paddingBottom: () => 5,
              paddingLeft: () => 4,
              paddingRight: () => 4,
            },
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
                        lineColor: "#94a3b8",
                      },
                    ],
                  },
                  {
                    text: `Firma: ${ayudante}`,
                    alignment: "center",
                    margin: [0, 4, 0, 0],
                    fontSize: 8,
                    bold: true,
                    color: "#334155",
                  },
                ],
                margin: [0, 35, 0, 0],
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
                        lineColor: "#94a3b8",
                      },
                    ],
                  },
                  {
                    text: "Firma: Jefe de Reparto",
                    alignment: "center",
                    margin: [0, 4, 0, 0],
                    fontSize: 8,
                    bold: true,
                    color: "#334155",
                  },
                ],
                margin: [0, 35, 0, 0],
              },
              { width: "*", text: "" },
            ],
            margin: [0, 10, 0, 20],
          },
        ],
        unbreakable: true,
        margin: [0, 0, 0, 20],
      });
    });

  if (Object.keys(viajesPorAyudante).length === 0)
    contentBlocks.push({ text: "No hay viajes para calcular.", italics: true });

  pdfMake
    .createPdf({
      pageOrientation: "portrait",
      pageMargins: [25, 25, 25, 25],
      content: contentBlocks,
      styles: {
        th: {
          bold: true,
          fontSize: 8,
          fillColor: "#0f172a",
          color: "white",
          margin: [2, 2],
        },
        td: { fontSize: 7.5, color: "#334155", margin: [2, 2] },
        tdCenter: {
          fontSize: 7.5,
          color: "#334155",
          alignment: "center",
          margin: [2, 2],
        },
        tdRight: {
          fontSize: 7.5,
          color: "#334155",
          alignment: "right",
          margin: [2, 2],
        },
        tdBoldRight: {
          fontSize: 7.5,
          bold: true,
          color: "#0f172a",
          alignment: "right",
          margin: [2, 2],
        },
        thTotal: {
          bold: true,
          fontSize: 8,
          fillColor: "#f8fafc",
          color: "#0f172a",
          margin: [3, 3],
        },
        thTotalRight: {
          bold: true,
          fontSize: 8,
          fillColor: "#f8fafc",
          alignment: "right",
          margin: [3, 3],
        },
        thGranTotal: {
          bold: true,
          fontSize: 8,
          fillColor: "#ecfdf5",
          color: "#047857",
          alignment: "right",
          margin: [3, 3],
        },
      },
    })
    .download(`Reporte_Rutas_Auxiliares_${fechaInicio}.pdf`);
};

// ============================================================================
// PDF: RESUMEN GENERAL DE PAGOS (TODOS) - ESTILO CORPORATIVO
// ============================================================================
export const generarPDFResumenGeneral = async (
  viajes: any[],
  fechaInicio: string,
  fechaFin: string,
  mostrarViaticos: boolean = true,
  mostrarComisiones: boolean = true,
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
    const a1 = v.auxiliar1 ? v.auxiliar1.toUpperCase().trim() : "";
    const a2 = v.auxiliar2 ? v.auxiliar2.toUpperCase().trim() : "";
    const nombreRuta = (v.ruta || "").toUpperCase().trim();

    // 🚀 CORREGIDO: Leemos de totalSumaDinero y totalSumaKilos
    const monto = Number(v.totalSumaDinero ?? v.totalMonto) || 0;

    if (c && c !== "-") {
      if (!totales[c])
        totales[c] = { rol: "CHOFER", viaticos: 0, comisiones: 0 };
      totales[c].viaticos += Number(v.viaticoRuta) || 0;
      let comision = Number(v.comisionChofer) || 0;
      if (nombreRuta === "TLMK" || nombreRuta === "TLMK 2") {
        comision = comision > 0 ? comision : monto * 0.001;
      }
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
        if (nombreRuta === "TLMK" || nombreRuta === "TLMK 2") comision = 0;
        totales[ay].comisiones += comision;
        totales[ay].viaticos += Number(v.viaticoRuta) || 0;
      }
    };

    procesarAyudante(a1);
    procesarAyudante(a2);
  });

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
    .forEach((nombre, index) => {
      const data = totales[nombre];

      const viaticoCobrado = mostrarViaticos ? data.viaticos : 0;
      const comisionCobrada = mostrarComisiones ? data.comisiones : 0;
      const total = viaticoCobrado + comisionCobrada;

      if (mostrarViaticos) sumaViaticos += data.viaticos;
      if (mostrarComisiones) sumaComisiones += data.comisiones;
      sumaTotal += total;

      const esPar = index % 2 === 0;
      const bgFila = esPar ? "#ffffff" : "#f8fafc";

      const row: any[] = [
        { text: nombre, style: "td", bold: true, fillColor: bgFila },
        { text: data.rol, style: "tdCenter", fillColor: bgFila },
      ];
      if (mostrarViaticos)
        row.push({
          text: fMoneda(data.viaticos),
          style: "tdRight",
          fillColor: bgFila,
          color: "#166534",
        });
      if (mostrarComisiones)
        row.push({
          text: fMoneda(data.comisiones),
          style: "tdRight",
          fillColor: bgFila,
          color: "#1d4ed8",
        });
      row.push({
        text: fMoneda(total),
        style: "tdBoldRight",
        fillColor: bgFila,
      });

      tableBody.push(row);
    });

  const totalRow: any[] = [
    { text: "TOTAL GENERAL", colSpan: 2, style: "thTotal", alignment: "right" },
    {},
  ];
  if (mostrarViaticos)
    totalRow.push({
      text: fMoneda(sumaViaticos),
      style: "thTotalRight",
      alignment: "right",
      color: "#166534",
    });
  if (mostrarComisiones)
    totalRow.push({
      text: fMoneda(sumaComisiones),
      style: "thTotalRight",
      alignment: "right",
      color: "#1e40af",
    });
  totalRow.push({
    text: fMoneda(sumaTotal),
    style: "thGranTotal",
    alignment: "right",
  });

  tableBody.push(totalRow);

  const tableWidths: string[] = ["*", "auto"];
  if (mostrarViaticos) tableWidths.push("auto");
  if (mostrarComisiones) tableWidths.push("auto");
  tableWidths.push("auto");

  const contentBlocks = [
    {
      columns: [
        logoBase64
          ? { image: logoBase64, width: 60 }
          : { text: "CIR", bold: true },
        {
          stack: [
            {
              text: "RESUMEN GENERAL DE NÓMINA",
              fontSize: 12,
              bold: true,
              color: "#0f172a",
              alignment: "right",
            },
            {
              text: `PERIODO: DEL ${fechaInicio} AL ${fechaFin}`,
              fontSize: 8,
              bold: true,
              color: "#64748b",
              alignment: "right",
              margin: [0, 2, 0, 0],
            },
          ],
          alignment: "right",
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
      layout: {
        hLineWidth: (i: number, node: any) =>
          i === 0 || i === 1 || i === node.table.body.length ? 1 : 0.5,
        vLineWidth: () => 0,
        hLineColor: (i: number, node: any) =>
          i === 0 || i === node.table.body.length ? "#0f172a" : "#e2e8f0",
        paddingTop: () => 5,
        paddingBottom: () => 5,
        paddingLeft: () => 4,
        paddingRight: () => 4,
      },
    },
    {
      columns: [
        { width: "*", text: "" },
        {
          width: 120,
          stack: [
            {
              canvas: [
                {
                  type: "line",
                  x1: 0,
                  y1: 0,
                  x2: 120,
                  y2: 0,
                  lineWidth: 1,
                  lineColor: "#94a3b8",
                },
              ],
            },
            {
              text: "Recursos Humanos",
              alignment: "center",
              margin: [0, 4, 0, 0],
              fontSize: 8,
              bold: true,
              color: "#334155",
            },
          ],
        },
        { width: "*", text: "" },
        {
          width: 120,
          stack: [
            {
              canvas: [
                {
                  type: "line",
                  x1: 0,
                  y1: 0,
                  x2: 120,
                  y2: 0,
                  lineWidth: 1,
                  lineColor: "#94a3b8",
                },
              ],
            },
            {
              text: "Jefe de Embarques",
              alignment: "center",
              margin: [0, 4, 0, 0],
              fontSize: 8,
              bold: true,
              color: "#334155",
            },
          ],
        },
        { width: "*", text: "" },
        {
          width: 120,
          stack: [
            {
              canvas: [
                {
                  type: "line",
                  x1: 0,
                  y1: 0,
                  x2: 120,
                  y2: 0,
                  lineWidth: 1,
                  lineColor: "#94a3b8",
                },
              ],
            },
            {
              text: "Jefe de Reparto",
              alignment: "center",
              margin: [0, 4, 0, 0],
              fontSize: 8,
              bold: true,
              color: "#334155",
            },
          ],
        },
        { width: "*", text: "" },
      ],
      margin: [0, 50, 0, 0],
    },
  ];

  pdfMake
    .createPdf({
      pageOrientation: "portrait",
      pageMargins: [25, 25, 25, 25],
      content: contentBlocks,
      styles: {
        th: {
          bold: true,
          fontSize: 8.5,
          fillColor: "#0f172a",
          color: "white",
          margin: [2, 2],
        },
        td: { fontSize: 8, color: "#334155", margin: [2, 2] },
        tdCenter: {
          fontSize: 8,
          color: "#334155",
          alignment: "center",
          margin: [2, 2],
        },
        tdRight: {
          fontSize: 8,
          color: "#334155",
          alignment: "right",
          margin: [2, 2],
        },
        tdBoldRight: {
          fontSize: 8,
          bold: true,
          color: "#0f172a",
          alignment: "right",
          margin: [2, 2],
        },
        thTotal: {
          bold: true,
          fontSize: 8.5,
          fillColor: "#f8fafc",
          color: "#0f172a",
          margin: [4, 4],
        },
        thTotalRight: {
          bold: true,
          fontSize: 8.5,
          fillColor: "#f8fafc",
          alignment: "right",
          margin: [4, 4],
        },
        thGranTotal: {
          bold: true,
          fontSize: 8.5,
          fillColor: "#ecfdf5",
          color: "#047857",
          alignment: "right",
          margin: [4, 4],
        },
      },
    })
    .download(`Resumen_General_Nomina_${fechaInicio}.pdf`);
};
