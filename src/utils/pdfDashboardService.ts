import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const generarPDFGerencial = (datos: any) => {
  const doc = new jsPDF("p", "pt", "a4");
  const {
    fechas,
    kpis,
    rutas,
    choferesPeso,
    choferesViajes,
    ayudantesViajes,
    finanzas,
    graficoBase64, // Recibimos la imagen del gráfico
  } = datos;

  // --- FORMATOS ---
  const fMoneda = (n: number) =>
    new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(n);
    
  const fNum = (n: number) =>
    new Intl.NumberFormat("es-MX", { maximumFractionDigits: 2 }).format(n);

  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;

  // --- 1. ENCABEZADO ---
  doc.setFillColor(30, 41, 59); // slate-800
  doc.rect(0, 0, pageWidth, 60, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Reporte Gerencial Semanal - Operación Logística", 40, 35);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Periodo: ${fechas.inicio} al ${fechas.fin}`, 40, 50);

  let yPos = 90;

  // Función auxiliar para saltar de página automáticamente si no hay espacio
  const verificarEspacio = (espacioRequerido: number) => {
    if (yPos + espacioRequerido > pageHeight - 40) {
      doc.addPage();
      yPos = 40;
    }
  };

  // --- 2. RESUMEN EJECUTIVO (KPIs) ---
  verificarEspacio(150);
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("1. Resumen Ejecutivo (Indicadores Clave)", 40, yPos);
  yPos += 15;

  const costoPorcentaje =
    kpis.ventas > 0 ? ((kpis.costos / kpis.ventas) * 100).toFixed(2) : "0.00";
  const promVentaViaje = kpis.viajes > 0 ? kpis.ventas / kpis.viajes : 0;
  const promPesoViaje = kpis.viajes > 0 ? kpis.peso / kpis.viajes : 0;

  autoTable(doc, {
    startY: yPos,
    theme: "grid",
    headStyles: {
      fillColor: [241, 245, 249],
      textColor: [71, 85, 105],
      fontStyle: "bold",
    },
    bodyStyles: { textColor: [30, 41, 59], fontSize: 10 },
    head: [["Indicador", "Valor", "Métrica de Eficiencia"]],
    body: [
      [
        "Venta Total Semanal",
        fMoneda(kpis.ventas),
        `Venta Prom. por Viaje: ${fMoneda(promVentaViaje)}`,
      ],
      [
        "Volumen Movido (Peso)",
        `${fNum(kpis.peso)} KG`,
        `Peso Prom. por Viaje: ${fNum(promPesoViaje)} KG`,
      ],
      ["Total de Viajes", `${kpis.viajes} Salidas`, ""],
      [
        "Costo Operativo (Nómina/Viático)",
        fMoneda(kpis.costos),
        `Representa el ${costoPorcentaje}% de la venta bruta`,
      ],
    ],
  });
  yPos = (doc as any).lastAutoTable.finalY + 25;

  // --- GRÁFICO DE TENDENCIA (OPCIONAL) ---
  if (graficoBase64) {
    verificarEspacio(260); // Validamos que quepa la imagen
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("2. Tendencia de Venta", 40, yPos);
    
    // addImage(imagen, formato, x, y, ancho, alto)
    doc.addImage(graficoBase64, "PNG", 40, yPos + 10, 515, 200);
    yPos += 230; 
  }

  // --- DESGLOSE TOTAL POR RUTA ---
  verificarEspacio(100);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(`${graficoBase64 ? "3" : "2"}. Desglose Operativo por Ruta`, 40, yPos);

  autoTable(doc, {
    startY: yPos + 10,
    theme: "striped",
    headStyles: { fillColor: [16, 185, 129] }, // emerald-500
    head: [["Rank", "Ruta", "Ingreso Generado", "Volumen Movido (KG)"]],
    body: rutas
      .sort((a: any, b: any) => b.venta - a.venta) // Ordenamos de mayor a menor venta
      .map((r: any, idx: number) => [
        idx + 1,
        r.nombre,
        fMoneda(r.venta),
        // Busca cualquier variante del nombre para los kilos
        `${fNum(r.peso || r.kg || r.kgTotal || r.kilos || 0)} KG`, 
      ]),
  });
  yPos = (doc as any).lastAutoTable.finalY + 25;

  // --- FINANZAS: NÓMINA Y VIÁTICOS ---
  verificarEspacio(200);
  doc.setFontSize(12);
  doc.text(
    `${graficoBase64 ? "4" : "3"}. Análisis Financiero de Tripulación (Top 5 Más y Menos Costosos)`,
    40,
    yPos,
  );
  yPos += 10;

  const top5Mas = finanzas.slice(0, 5);
  const top5Menos = [...finanzas].reverse().slice(0, 5);

  autoTable(doc, {
    startY: yPos,
    theme: "grid",
    headStyles: { fillColor: [59, 130, 246] }, // blue-500
    head: [
      ["Personal (Mayor Ingreso)", "Viáticos", "Comisiones", "Costo Total"],
    ],
    body: top5Mas.map((c: any) => [
      c.nombre,
      fMoneda(c.viaticos),
      fMoneda(c.comisiones),
      fMoneda(c.total),
    ]),
  });
  yPos = (doc as any).lastAutoTable.finalY + 10;

  autoTable(doc, {
    startY: yPos,
    theme: "grid",
    headStyles: { fillColor: [244, 63, 94] }, // rose-500
    head: [
      ["Personal (Menor Ingreso)", "Viáticos", "Comisiones", "Costo Total"],
    ],
    body: top5Menos.map((c: any) => [
      c.nombre,
      fMoneda(c.viaticos),
      fMoneda(c.comisiones),
      fMoneda(c.total),
    ]),
  });
  yPos = (doc as any).lastAutoTable.finalY + 25;

  // --- PRODUCTIVIDAD Y CARGA FÍSICA ---
  verificarEspacio(160);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(`${graficoBase64 ? "5" : "4"}. Esfuerzo Físico: Top Choferes por Kilos Movidos`, 40, yPos);

  autoTable(doc, {
    startY: yPos + 10,
    theme: "striped",
    headStyles: { fillColor: [139, 92, 246] }, // purple-500
    head: [["Rank", "Chofer", "Volumen Movido (KG)"]],
    body: choferesPeso
      .slice(0, 10)
      .map((c: any, idx: number) => [idx + 1, c.nombre, fNum(c.peso || c.kg || c.kgTotal || c.kilos || 0)]),
  });
  yPos = (doc as any).lastAutoTable.finalY + 25;

  // --- FRECUENCIA DE SALIDAS (EQUIDAD) ---
  verificarEspacio(180);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(`${graficoBase64 ? "6" : "5"}. Frecuencia de Salidas (Equidad de Viajes)`, 40, yPos);
  yPos += 15;

  doc.setFontSize(10);
  doc.text("Viajes por Chofer:", 40, yPos);
  doc.text("Viajes por Ayudante:", 320, yPos);

  const yTablasParalelas = yPos + 5;

  autoTable(doc, {
    startY: yTablasParalelas,
    margin: { left: 40, right: 310 },
    theme: "plain",
    headStyles: { fillColor: [241, 245, 249], textColor: [0, 0, 0] },
    head: [["Chofer", "Viajes"]],
    body: choferesViajes.map((c: any) => [c.nombre, c.viajes]),
  });

  autoTable(doc, {
    startY: yTablasParalelas,
    margin: { left: 320, right: 40 },
    theme: "plain",
    headStyles: { fillColor: [241, 245, 249], textColor: [0, 0, 0] },
    head: [["Ayudante", "Viajes"]],
    body: ayudantesViajes.map((a: any) => [a.nombre, a.viajes]),
  });

  doc.save(`Reporte_Gerencial_${fechas.inicio}_a_${fechas.fin}.pdf`);
};
