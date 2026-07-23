// src/utils/exportaciones.ts

// ==========================================
//        EXPORTACIONES DE CLIENTES
// ==========================================

export const generarPDFDirectorio = (
  clientesFiltrados: any[],
  filtroRuta: string,
) => {
  const pdfMake = (window as any).pdfMake;

  if (!pdfMake) {
    alert(
      "El generador de PDF está cargando... intenta de nuevo en un segundo.",
    );
    return;
  }

  const textoFiltro = filtroRuta ? `Ruta: ${filtroRuta}` : "Todas las rutas";

  const tableBody = [
    [
      { text: "Cliente", style: "tableHeader" },
      { text: "Domicilio", style: "tableHeader" },
      { text: "Ruta", style: "tableHeader" },
      { text: "Vendedor", style: "tableHeader" },
    ],
    ...clientesFiltrados.map((c) => [
      c.nombre || "",
      c.descripcion || "",
      c.ruta || "",
      c.vendedor || "",
    ]),
  ];

  const docDefinition: any = {
    content: [
      { text: "Directorio de Clientes", style: "header" },
      {
        text: `${textoFiltro} - Total: ${clientesFiltrados.length} clientes`,
        style: "subheader",
      },
      {
        table: {
          headerRows: 1,
          widths: ["*", "*", "auto", "auto"],
          body: tableBody,
        },
        layout: "lightHorizontalLines",
      },
    ],
    styles: {
      header: {
        fontSize: 18,
        bold: true,
        margin: [0, 0, 0, 4],
        color: "#1e293b",
      },
      subheader: { fontSize: 11, color: "#64748b", margin: [0, 0, 0, 15] },
      tableHeader: {
        bold: true,
        fontSize: 12,
        color: "#2563eb",
        fillColor: "#eff6ff",
      },
    },
    defaultStyle: { fontSize: 10 },
  };

  pdfMake.createPdf(docDefinition).download("directorio_clientes.pdf");
};

export const generarCSVDirectorio = (clientesFiltrados: any[]) => {
  const cabeceras = [
    "Nombre",
    "Domicilio",
    "Ruta",
    "Vendedor",
    "Latitud",
    "Longitud",
  ];

  const filas = clientesFiltrados.map((c) => [
    `"${c.nombre || ""}"`,
    `"${c.descripcion || ""}"`,
    `"${c.ruta || ""}"`,
    `"${c.vendedor || ""}"`,
    c.posicion && Array.isArray(c.posicion) ? c.posicion[0] : "",
    c.posicion && Array.isArray(c.posicion) ? c.posicion[1] : "",
  ]);

  const contenidoCSV = [cabeceras, ...filas].map((e) => e.join(",")).join("\n");

  const blob = new Blob(["\uFEFF" + contenidoCSV], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", "directorio_clientes.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// ==========================================
//        EXPORTACIONES DE VENDEDORES
// ==========================================

export const generarPDFVendedores = (
  vendedoresFiltrados: any[],
  filtroRuta: string,
) => {
  const pdfMake = (window as any).pdfMake;

  if (!pdfMake) {
    alert(
      "El generador de PDF está cargando... intenta de nuevo en un segundo.",
    );
    return;
  }

  const textoFiltro = filtroRuta ? `Ruta: ${filtroRuta}` : "Todas las rutas";

  const tableBody = [
    [
      { text: "Vendedor", style: "tableHeader" },
      { text: "Correo", style: "tableHeader" },
      { text: "Teléfono", style: "tableHeader" },
      { text: "Rutas Asignadas", style: "tableHeader" },
    ],
    ...vendedoresFiltrados.map((v) => [
      v.nombre || "",
      v.correo || "",
      v.telefono || "",
      (v.rutas || []).join(", "), // Convertimos el arreglo de rutas en un texto separado por comas
    ]),
  ];

  const docDefinition: any = {
    content: [
      { text: "Directorio de Vendedores", style: "header" },
      {
        text: `${textoFiltro} - Total: ${vendedoresFiltrados.length} vendedores`,
        style: "subheader",
      },
      {
        table: {
          headerRows: 1,
          widths: ["*", "auto", "auto", "*"],
          body: tableBody,
        },
        layout: "lightHorizontalLines",
      },
    ],
    styles: {
      header: {
        fontSize: 18,
        bold: true,
        margin: [0, 0, 0, 4],
        color: "#1e293b",
      },
      subheader: { fontSize: 11, color: "#64748b", margin: [0, 0, 0, 15] },
      tableHeader: {
        bold: true,
        fontSize: 12,
        color: "#2563eb",
        fillColor: "#eff6ff",
      },
    },
    defaultStyle: { fontSize: 10 },
  };

  pdfMake.createPdf(docDefinition).download("directorio_vendedores.pdf");
};

export const generarCSVVendedores = (vendedoresFiltrados: any[]) => {
  const cabeceras = ["Nombre", "Correo", "Teléfono", "Rutas Asignadas"];

  const filas = vendedoresFiltrados.map((v) => [
    `"${v.nombre || ""}"`,
    `"${v.correo || ""}"`,
    `"${v.telefono || ""}"`,
    `"${(v.rutas || []).join(", ")}"`, // Convertimos el arreglo de rutas asegurándolo con comillas
  ]);

  const contenidoCSV = [cabeceras, ...filas].map((e) => e.join(",")).join("\n");

  const blob = new Blob(["\uFEFF" + contenidoCSV], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", "directorio_vendedores.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
