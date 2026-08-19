import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import html2canvas from "html2canvas";
import {
  TrendingUp,
  TrendingDown,
  Scale,
  Truck,
  DollarSign,
  Award,
  Map,
  Activity,
  FileDown,
  Users,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// 🚀 IMPORTAMOS EL NUEVO SERVICIO ÚNICO
import { obtenerDistribucionPorRango } from "../firebase/distribucionService";
import { generarPDFGerencial } from "../utils/pdfDashboardService";

// Función para forzar hora local
const obtenerFechaLocalStr = (fecha: Date) => {
  const year = fecha.getFullYear();
  const month = String(fecha.getMonth() + 1).padStart(2, "0");
  const day = String(fecha.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// Etiqueta corta para el eje X del gráfico, ej. "10 ago"
const formatearFechaEje = (fechaISO: string) => {
  const fecha = new Date(`${fechaISO}T00:00:00`);
  const mesCorto = new Intl.DateTimeFormat("es-MX", { month: "short" })
    .format(fecha)
    .replace(".", "");
  return `${fecha.getDate()} ${mesCorto}`;
};

// Fecha completa para el tooltip, ej. "mar. 10 de agosto del 2026"
// (nombres fijos en vez de Intl: el soporte de "weekday: short" con punto
// varía entre navegadores/Node, y queremos el formato exacto siempre).
const DIAS_SEMANA_CORTOS = [
  "dom.",
  "lun.",
  "mar.",
  "mié.",
  "jue.",
  "vie.",
  "sáb.",
];
const MESES_LARGOS = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

const formatearFechaTooltip = (fechaISO: string) => {
  const fecha = new Date(`${fechaISO}T00:00:00`);
  const diaSemana = DIAS_SEMANA_CORTOS[fecha.getDay()];
  const mes = MESES_LARGOS[fecha.getMonth()];
  return `${diaSemana} ${fecha.getDate()} de ${mes} del ${fecha.getFullYear()}`;
};

// Suma rápida de los 4 KPIs para un rango de fechas (se usa para el
// periodo anterior, donde no necesitamos los desgloses por ruta/chofer/unidad).
const calcularKpisPeriodo = (registros: any[]) => {
  let ventas = 0;
  let peso = 0;
  let viajes = 0;
  let costos = 0;
  let viaticos = 0;
  let comisiones = 0;

  registros.forEach((registro) => {
    (registro.filas || []).forEach((v: any) => {
      if (v.chofer && v.chofer !== "-" && v.chofer.trim() !== "") {
        const viatico = Number(v.viaticoRuta) || 0;
        const comision =
          (Number(v.comisionChofer) || 0) + (Number(v.comisionAyudante) || 0);
        ventas += Number(v.totalSumaDinero) || 0;
        peso += Number(v.totalSumaKilos) || 0;
        viajes += 1;
        viaticos += viatico;
        comisiones += comision;
        costos += viatico + comision;
      }
    });
  });

  return { ventas, peso, viajes, costos, viaticos, comisiones };
};

// Variación porcentual vs. el periodo anterior, para las insignias de los KPIs.
const calcularVariacion = (actual: number, previo: number) => {
  if (previo === 0) {
    return actual === 0
      ? ({ tipo: "sinDatos" } as const)
      : ({ tipo: "nuevo" } as const);
  }
  return { tipo: "valor", pct: ((actual - previo) / previo) * 100 } as const;
};

// invertido: para KPIs donde subir es malo (ej. Costo Operativo).
function BadgeVariacion({
  actual,
  previo,
  invertido = false,
}: {
  actual: number;
  previo: number;
  invertido?: boolean;
}) {
  const variacion = calcularVariacion(actual, previo);

  if (variacion.tipo === "sinDatos") return null;

  if (variacion.tipo === "nuevo") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-full mt-1.5">
        Nuevo vs. semana anterior
      </span>
    );
  }

  const esAumento = variacion.pct >= 0;
  const esBueno = invertido ? !esAumento : esAumento;
  const Icono = esAumento ? TrendingUp : TrendingDown;

  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full mt-1.5 ${
        esBueno ? "text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40" : "text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40"
      }`}
    >
      <Icono size={12} />
      {esAumento ? "+" : ""}
      {variacion.pct.toFixed(1)}% vs. sem. anterior
    </span>
  );
}

export default function Dashboard() {
  const [generandoPDF, setGenerandoPDF] = useState(false);

  const hoy = new Date();
  const hace7Dias = new Date();
  hace7Dias.setDate(hoy.getDate() - 6);

  const strHoy = obtenerFechaLocalStr(hoy);
  const strHace7Dias = obtenerFechaLocalStr(hace7Dias);

  // Semana inmediatamente anterior, para la comparativa (WoW) de los KPIs
  const finPeriodoPrevio = new Date(hace7Dias);
  finPeriodoPrevio.setDate(finPeriodoPrevio.getDate() - 1);
  const inicioPeriodoPrevio = new Date(finPeriodoPrevio);
  inicioPeriodoPrevio.setDate(inicioPeriodoPrevio.getDate() - 6);
  const strFinPrevio = obtenerFechaLocalStr(finPeriodoPrevio);
  const strInicioPrevio = obtenerFechaLocalStr(inicioPeriodoPrevio);

  // 🚀 CONECTAMOS A LA NUEVA TABLA DISTRIBUCION_DIARIA
  const {
    data: datosCrudos = [],
    isLoading: cargando,
    isError,
  } = useQuery({
    queryKey: ["distribucion_rango", "dashboard", strHace7Dias, strHoy],
    queryFn: () => obtenerDistribucionPorRango(strHace7Dias, strHoy),
  });

  const { data: datosCrudosPrevios = [] } = useQuery({
    queryKey: [
      "distribucion_rango",
      "dashboard_previo",
      strInicioPrevio,
      strFinPrevio,
    ],
    queryFn: () => obtenerDistribucionPorRango(strInicioPrevio, strFinPrevio),
  });

  const kpisPrevios = useMemo(
    () => calcularKpisPeriodo(datosCrudosPrevios),
    [datosCrudosPrevios],
  );

  const dataProcesada = useMemo(() => {
    let totalVentas = 0;
    let totalPeso = 0;
    let totalViajes = 0;
    let totalCostos = 0;
    let totalViaticos = 0;
    let totalComisiones = 0;

    const agrupadoPorDia: Record<string, number> = {};
    const choferesMap: Record<string, number> = {};
    const unidadesMap: Record<string, number> = {};
    const rutasMap: Record<string, { venta: number; peso: number }> = {};

    const finanzasChoferes: Record<
      string,
      { viaticos: number; comisiones: number; total: number; viajes: number }
    > = {};
    const finanzasAyudantes: Record<
      string,
      { viaticos: number; comisiones: number; total: number; viajes: number }
    > = {};
    const conteoAyudantes: Record<string, number> = {};
    const nombresChoferes = new Set<string>();

    // Un ayudante solo acumula percepción económica si también figura como
    // chofer en el dataset — misma regla que ya usa el reporte de Nómina
    // (pdfNominaService.ts) para no atribuir ingresos a personal sin registro.
    const acumularAyudante = (
      nombreRaw: string,
      viatico: number,
      comision: number,
    ) => {
      const nombre = nombreRaw.toUpperCase().trim();
      if (!nombresChoferes.has(nombre)) return;
      if (!finanzasAyudantes[nombre]) {
        finanzasAyudantes[nombre] = {
          viaticos: 0,
          comisiones: 0,
          total: 0,
          viajes: 0,
        };
      }
      finanzasAyudantes[nombre].viaticos += viatico;
      finanzasAyudantes[nombre].comisiones += comision;
      finanzasAyudantes[nombre].total += viatico + comision;
      finanzasAyudantes[nombre].viajes += 1;
    };

    const agrupadoPorDiaPrevio: Record<string, number> = {};
    const agrupadoPorDiaPeso: Record<string, number> = {};
    const agrupadoPorDiaPesoPrevio: Record<string, number> = {};

    for (let i = 0; i <= 6; i++) {
      const d = new Date(hace7Dias);
      d.setDate(d.getDate() + i);
      agrupadoPorDia[obtenerFechaLocalStr(d)] = 0;
      agrupadoPorDiaPeso[obtenerFechaLocalStr(d)] = 0;

      const dPrevio = new Date(inicioPeriodoPrevio);
      dPrevio.setDate(dPrevio.getDate() + i);
      agrupadoPorDiaPrevio[obtenerFechaLocalStr(dPrevio)] = 0;
      agrupadoPorDiaPesoPrevio[obtenerFechaLocalStr(dPrevio)] = 0;
    }

    datosCrudos.forEach((registro) => {
      // 🚀 AHORA ITERAMOS SOBRE 'filas'
      (registro.filas || []).forEach((v: any) => {
        if (v.chofer && v.chofer !== "-" && v.chofer.trim() !== "") {
          const nombreChofer = v.chofer.toUpperCase().trim();
          nombresChoferes.add(nombreChofer);
          finanzasChoferes[nombreChofer] = {
            viaticos: 0,
            comisiones: 0,
            total: 0,
            viajes: 0,
          };
        }
        // 🚀 AHORA USAMOS 'auxiliar1' y validamos el "-- SIN AUXILIAR --"
        if (
          v.auxiliar1 &&
          v.auxiliar1 !== "-" &&
          v.auxiliar1 !== "-- SIN AUXILIAR --" &&
          v.auxiliar1.trim() !== ""
        )
          conteoAyudantes[v.auxiliar1.toUpperCase().trim()] = 0;
        if (
          v.auxiliar2 &&
          v.auxiliar2 !== "-" &&
          v.auxiliar2 !== "-- SIN AUXILIAR --" &&
          v.auxiliar2.trim() !== ""
        )
          conteoAyudantes[v.auxiliar2.toUpperCase().trim()] = 0;
      });
    });

    datosCrudos.forEach((registro) => {
      const fecha = registro.fecha;
      if (fecha >= strHace7Dias && fecha <= strHoy) {
        const viajes = registro.filas || [];

        viajes.forEach((v: any) => {
          if (v.chofer && v.chofer !== "-") {
            const nombreChofer = v.chofer.toUpperCase().trim();
            // 🚀 TRADUCCIÓN A LOS NUEVOS NOMBRES DE VARIABLES FINANCIERAS
            const venta = Number(v.totalSumaDinero) || 0;
            const peso = Number(v.totalSumaKilos) || 0;
            const viatico = Number(v.viaticoRuta) || 0;
            const comision = Number(v.comisionChofer) || 0;
            const comisionTotalFila = comision + (Number(v.comisionAyudante) || 0);
            const costo = viatico + comisionTotalFila;

            totalVentas += venta;
            totalPeso += peso;
            totalViajes += 1;
            totalCostos += costo;
            totalViaticos += viatico;
            totalComisiones += comisionTotalFila;

            if (agrupadoPorDia[fecha] !== undefined)
              agrupadoPorDia[fecha] += venta;
            if (agrupadoPorDiaPeso[fecha] !== undefined)
              agrupadoPorDiaPeso[fecha] += peso;

            choferesMap[nombreChofer] = (choferesMap[nombreChofer] || 0) + peso;

            const nombreRuta = v.ruta || "SIN RUTA";
            if (!rutasMap[nombreRuta]) {
              rutasMap[nombreRuta] = { venta: 0, peso: 0 };
            }
            rutasMap[nombreRuta].venta += venta;
            rutasMap[nombreRuta].peso += peso;

            if (v.unidad && v.unidad !== "-")
              unidadesMap[v.unidad] = (unidadesMap[v.unidad] || 0) + peso;

            finanzasChoferes[nombreChofer].viaticos += viatico;
            finanzasChoferes[nombreChofer].comisiones += comision;
            finanzasChoferes[nombreChofer].total += viatico + comision;
            finanzasChoferes[nombreChofer].viajes += 1;
          }

          const viaticoFila = Number(v.viaticoRuta) || 0;
          const comisionAyudanteFila = Number(v.comisionAyudante) || 0;

          if (
            v.auxiliar1 &&
            v.auxiliar1 !== "-" &&
            v.auxiliar1 !== "-- SIN AUXILIAR --" &&
            v.auxiliar1.trim() !== ""
          ) {
            conteoAyudantes[v.auxiliar1.toUpperCase().trim()] += 1;
            acumularAyudante(v.auxiliar1, viaticoFila, comisionAyudanteFila);
          }
          if (
            v.auxiliar2 &&
            v.auxiliar2 !== "-" &&
            v.auxiliar2 !== "-- SIN AUXILIAR --" &&
            v.auxiliar2.trim() !== ""
          ) {
            conteoAyudantes[v.auxiliar2.toUpperCase().trim()] += 1;
            acumularAyudante(v.auxiliar2, viaticoFila, comisionAyudanteFila);
          }
        });
      }
    });

    datosCrudosPrevios.forEach((registro) => {
      const fecha = registro.fecha;
      if (fecha >= strInicioPrevio && fecha <= strFinPrevio) {
        (registro.filas || []).forEach((v: any) => {
          if (v.chofer && v.chofer !== "-" && v.chofer.trim() !== "") {
            const venta = Number(v.totalSumaDinero) || 0;
            const peso = Number(v.totalSumaKilos) || 0;
            if (agrupadoPorDiaPrevio[fecha] !== undefined)
              agrupadoPorDiaPrevio[fecha] += venta;
            if (agrupadoPorDiaPesoPrevio[fecha] !== undefined)
              agrupadoPorDiaPesoPrevio[fecha] += peso;
          }
        });
      }
    });

    const arrFinanzas = Object.entries(finanzasChoferes).map(
      ([nombre, data]) => ({ nombre, ...data }),
    );

    return {
      kpis: {
        ventas: totalVentas,
        peso: totalPeso,
        viajes: totalViajes,
        costos: totalCostos,
        viaticos: totalViaticos,
        comisiones: totalComisiones,
      },
      datosGrafico: (() => {
        const fechasActuales = Object.keys(agrupadoPorDia).sort();
        const fechasPrevias = Object.keys(agrupadoPorDiaPrevio).sort();
        return fechasActuales.map((fecha, idx) => ({
          fecha,
          ventas: agrupadoPorDia[fecha],
          peso: agrupadoPorDiaPeso[fecha],
          fechaPrevia: fechasPrevias[idx],
          ventasPrevias: agrupadoPorDiaPrevio[fechasPrevias[idx]] || 0,
          pesoPrevio: agrupadoPorDiaPesoPrevio[fechasPrevias[idx]] || 0,
        }));
      })(),
      todasRutas: Object.entries(rutasMap)
        .sort((a, b) => b[1].venta - a[1].venta)
        .map(([nombre, datos]) => ({
          nombre,
          venta: datos.venta,
          peso: datos.peso,
        })),
      todosChoferesPeso: Object.entries(choferesMap)
        .sort((a, b) => b[1] - a[1])
        .map(([nombre, peso]) => ({ nombre, peso })),
      todasUnidades: Object.entries(unidadesMap)
        .sort((a, b) => b[1] - a[1])
        .map(([nombre, peso]) => ({ nombre, peso })),
      todasFinanzas: arrFinanzas.sort((a, b) => b.total - a.total),
      todosAyudantesViajes: Object.entries(conteoAyudantes)
        .sort((a, b) => b[1] - a[1])
        .map(([nombre, viajes]) => ({ nombre, viajes })),
      todosChoferesViajes: arrFinanzas
        .sort((a, b) => b.viajes - a.viajes)
        .map((c) => ({ nombre: c.nombre, viajes: c.viajes })),
      todosAyudantesFinanzas: Object.entries(finanzasAyudantes)
        .map(([nombre, data]) => ({ nombre, ...data }))
        .sort((a, b) => b.total - a.total),
    };
  }, [
    datosCrudos,
    datosCrudosPrevios,
    strHace7Dias,
    strHoy,
    strInicioPrevio,
    strFinPrevio,
  ]);

  const fMoneda = (c: number) =>
    new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(c);
  const fNumero = (c: number) =>
    new Intl.NumberFormat("es-MX", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(c);

  const handleDescargarReporte = async () => {
    setGenerandoPDF(true);
    let graficoBase64 = null;
    let graficoPesoBase64 = null;

    try {
      const elementoGrafico = document.getElementById("grafico-ventas");
      if (elementoGrafico) {
        const canvas = await html2canvas(elementoGrafico, { scale: 2 });
        graficoBase64 = canvas.toDataURL("image/png");
      }
    } catch (error) {
      console.error("Error capturando el gráfico:", error);
    }

    try {
      const elementoGraficoPeso = document.getElementById("grafico-peso");
      if (elementoGraficoPeso) {
        const canvas = await html2canvas(elementoGraficoPeso, { scale: 2 });
        graficoPesoBase64 = canvas.toDataURL("image/png");
      }
    } catch (error) {
      console.error("Error capturando el gráfico de peso:", error);
    }

    await generarPDFGerencial({
      fechas: { inicio: strHace7Dias, fin: strHoy },
      kpis: dataProcesada.kpis,
      kpisPrevios,
      rutas: dataProcesada.todasRutas,
      choferesPeso: dataProcesada.todosChoferesPeso,
      choferesViajes: dataProcesada.todosChoferesViajes,
      ayudantesViajes: dataProcesada.todosAyudantesViajes,
      ayudantesFinanzas: dataProcesada.todosAyudantesFinanzas,
      finanzas: dataProcesada.todasFinanzas,
      unidades: dataProcesada.todasUnidades,
      graficoBase64,
      graficoPesoBase64,
    });
    setGenerandoPDF(false);
  };

  if (cargando) {
    return (
      <div className="flex w-full h-full items-center justify-center">
        <p className="text-slate-500 dark:text-slate-400 font-bold animate-pulse flex items-center gap-2">
          <Activity size={20} /> Analizando operación de los últimos 7 días...
        </p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex w-full h-full items-center justify-center">
        <p className="text-rose-500 font-bold">
          Ocurrió un error al cargar los datos.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full bg-slate-50/50 dark:bg-slate-900/50 p-6 rounded-xl flex flex-col h-full overflow-y-auto custom-scrollbar">
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <TrendingUp className="text-blue-600 dark:text-blue-400" size={28} />
            Resumen Operativo
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Rendimiento de los últimos 7 días ({strHace7Dias} al {strHoy})
          </p>
        </div>
        <button
          onClick={handleDescargarReporte}
          disabled={generandoPDF}
          className="flex items-center justify-center gap-2 px-5 py-3 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl transition-colors shadow-sm disabled:opacity-50"
        >
          <FileDown size={20} />
          {generandoPDF ? "Generando..." : "Reporte Gerencial PDF"}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
            <DollarSign size={24} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase">
              Venta Total
            </p>
            <p
              className="text-xl lg:text-2xl font-black text-slate-800 dark:text-slate-100 truncate"
              title={fMoneda(dataProcesada.kpis.ventas)}
            >
              {fMoneda(dataProcesada.kpis.ventas)}
            </p>
            <BadgeVariacion
              actual={dataProcesada.kpis.ventas}
              previo={kpisPrevios.ventas}
            />
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
            <Scale size={24} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase">
              Peso Movido
            </p>
            <p
              className="text-xl lg:text-2xl font-black text-slate-800 dark:text-slate-100 truncate"
              title={`${fNumero(dataProcesada.kpis.peso)} KG`}
            >
              {fNumero(dataProcesada.kpis.peso)}{" "}
              <span className="text-sm text-slate-500 dark:text-slate-400 font-bold">KG</span>
            </p>
            <BadgeVariacion
              actual={dataProcesada.kpis.peso}
              previo={kpisPrevios.peso}
            />
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
            <Truck size={24} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase">
              Viajes Realizados
            </p>
            <p
              className="text-xl lg:text-2xl font-black text-slate-800 dark:text-slate-100 truncate"
              title={`${dataProcesada.kpis.viajes} Rutas`}
            >
              {dataProcesada.kpis.viajes}{" "}
              <span className="text-sm text-slate-500 dark:text-slate-400 font-bold">Rutas</span>
            </p>
            <BadgeVariacion
              actual={dataProcesada.kpis.viajes}
              previo={kpisPrevios.viajes}
            />
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
            <Activity size={24} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase">
              Costo Operativo
            </p>
            <p
              className="text-xl lg:text-2xl font-black text-slate-800 dark:text-slate-100 truncate"
              title={fMoneda(dataProcesada.kpis.costos)}
            >
              {fMoneda(dataProcesada.kpis.costos)}
            </p>
            <BadgeVariacion
              actual={dataProcesada.kpis.costos}
              previo={kpisPrevios.costos}
              invertido
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
        <div className="xl:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2">
            Tendencia de Ventas (7 Días)
          </h3>
          <div className="w-full flex-1 min-h-75" id="grafico-ventas">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={dataProcesada.datosGrafico}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorVentas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="colorVentasPrevias" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#94a3b8" stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="0"
                  vertical={false}
                  stroke="#eef2f7"
                />
                <XAxis
                  dataKey="fecha"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: "#94a3b8" }}
                  tickFormatter={formatearFechaEje}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: "#94a3b8" }}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                  width={48}
                />
                <Tooltip
                  cursor={{ stroke: "#cbd5e1", strokeWidth: 1 }}
                  formatter={(value: any, name: any) => [
                    fMoneda(Number(value) || 0),
                    name,
                  ]}
                  labelFormatter={(label) =>
                    formatearFechaTooltip(String(label))
                  }
                  labelStyle={{
                    color: "#1e293b",
                    fontWeight: "bold",
                    marginBottom: 4,
                  }}
                  itemStyle={{
                    fontWeight: 700,
                  }}
                  contentStyle={{
                    borderRadius: "12px",
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 8px 24px -4px rgb(0 0 0 / 0.12)",
                    padding: "10px 14px",
                  }}
                />
                <Legend
                  verticalAlign="top"
                  align="right"
                  iconType="circle"
                  wrapperStyle={{ fontSize: 12, fontWeight: 600 }}
                />
                <Area
                  type="monotone"
                  dataKey="ventasPrevias"
                  name="Semana pasada"
                  stroke="#94a3b8"
                  strokeWidth={2}
                  strokeDasharray="5 4"
                  fillOpacity={1}
                  fill="url(#colorVentasPrevias)"
                  dot={false}
                  activeDot={{
                    r: 5,
                    strokeWidth: 2,
                    stroke: "#fff",
                    fill: "#94a3b8",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="ventas"
                  name="Semana actual"
                  stroke="#10b981"
                  strokeWidth={2}
                  strokeLinecap="round"
                  fillOpacity={1}
                  fill="url(#colorVentas)"
                  dot={{
                    r: 4,
                    strokeWidth: 2,
                    stroke: "#fff",
                    fill: "#10b981",
                  }}
                  activeDot={{
                    r: 6,
                    strokeWidth: 2,
                    stroke: "#fff",
                    fill: "#10b981",
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex-1">
            <h3 className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Award className="text-amber-500" size={18} /> Top 4 Choferes
              (Peso)
            </h3>
            <div className="space-y-4">
              {dataProcesada.todosChoferesPeso.slice(0, 4).map((c, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 shrink-0 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-500 dark:text-slate-400 text-sm">
                      {idx + 1}
                    </div>
                    <p className="font-semibold text-slate-700 dark:text-slate-200 text-sm pr-2">
                      {c.nombre}
                    </p>
                  </div>
                  <p className="font-black text-blue-600 dark:text-blue-400 text-sm shrink-0">
                    {fNumero(c.peso)}{" "}
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold ml-1">
                      KG
                    </span>
                  </p>
                </div>
              ))}
              {dataProcesada.todosChoferesPeso.length === 0 && (
                <p className="text-xs text-slate-400 dark:text-slate-500">Sin datos registrados.</p>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex-1">
            <h3 className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Map className="text-emerald-500" size={18} /> Top 3 Rutas
              (Ventas)
            </h3>
            <div className="space-y-4">
              {dataProcesada.todasRutas.slice(0, 3).map((r, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 shrink-0 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-500 dark:text-slate-400 text-sm">
                      {idx + 1}
                    </div>
                    <p className="font-semibold text-slate-700 dark:text-slate-200 text-sm pr-2">
                      {r.nombre}
                    </p>
                  </div>
                  <p className="font-black text-emerald-600 dark:text-emerald-400 text-sm shrink-0">
                    {fMoneda(r.venta)}
                  </p>
                </div>
              ))}
              {dataProcesada.todasRutas.length === 0 && (
                <p className="text-xs text-slate-400 dark:text-slate-500">Sin datos registrados.</p>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex-1">
            <h3 className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Truck className="text-purple-500" size={18} /> Top 4 Unidades
              (Peso)
            </h3>
            <div className="space-y-4">
              {dataProcesada.todasUnidades.slice(0, 4).map((u, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 shrink-0 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-500 dark:text-slate-400 text-sm">
                      {idx + 1}
                    </div>
                    <p className="font-semibold text-slate-700 dark:text-slate-200 text-sm">
                      Unidad {u.nombre}
                    </p>
                  </div>
                  <p className="font-black text-blue-600 dark:text-blue-400 text-sm shrink-0">
                    {fNumero(u.peso)}{" "}
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold ml-1">
                      KG
                    </span>
                  </p>
                </div>
              ))}
              {dataProcesada.todasUnidades.length === 0 && (
                <p className="text-xs text-slate-400 dark:text-slate-500">Sin datos registrados.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col mb-6">
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2">
          Tendencia de Peso Movido (7 Días)
        </h3>
        <div className="w-full h-80" id="grafico-peso">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={dataProcesada.datosGrafico}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorPeso" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.28} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="colorPesoPrevio" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="#94a3b8" stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="0"
                vertical={false}
                stroke="#eef2f7"
              />
              <XAxis
                dataKey="fecha"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "#94a3b8" }}
                tickFormatter={formatearFechaEje}
                dy={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "#94a3b8" }}
                tickFormatter={(value) => `${(value / 1000).toFixed(1)}t`}
                width={48}
              />
              <Tooltip
                cursor={{ stroke: "#cbd5e1", strokeWidth: 1 }}
                formatter={(value: any, name: any) => [
                  `${fNumero(Number(value) || 0)} KG`,
                  name,
                ]}
                labelFormatter={(label) =>
                  formatearFechaTooltip(String(label))
                }
                labelStyle={{
                  color: "#1e293b",
                  fontWeight: "bold",
                  marginBottom: 4,
                }}
                itemStyle={{
                  fontWeight: 700,
                }}
                contentStyle={{
                  borderRadius: "12px",
                  border: "1px solid #e2e8f0",
                  boxShadow: "0 8px 24px -4px rgb(0 0 0 / 0.12)",
                  padding: "10px 14px",
                }}
              />
              <Legend
                verticalAlign="top"
                align="right"
                iconType="circle"
                wrapperStyle={{ fontSize: 12, fontWeight: 600 }}
              />
              <Area
                type="monotone"
                dataKey="pesoPrevio"
                name="Semana pasada"
                stroke="#94a3b8"
                strokeWidth={2}
                strokeDasharray="5 4"
                fillOpacity={1}
                fill="url(#colorPesoPrevio)"
                dot={false}
                activeDot={{
                  r: 5,
                  strokeWidth: 2,
                  stroke: "#fff",
                  fill: "#94a3b8",
                }}
              />
              <Area
                type="monotone"
                dataKey="peso"
                name="Semana actual"
                stroke="#3b82f6"
                strokeWidth={2}
                strokeLinecap="round"
                fillOpacity={1}
                fill="url(#colorPeso)"
                dot={{
                  r: 4,
                  strokeWidth: 2,
                  stroke: "#fff",
                  fill: "#3b82f6",
                }}
                activeDot={{
                  r: 6,
                  strokeWidth: 2,
                  stroke: "#fff",
                  fill: "#3b82f6",
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 shrink-0 mb-6">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm border-t-4 border-t-emerald-500">
          <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-5 flex items-center gap-2">
            <TrendingUp className="text-emerald-500" size={18} /> Top 10
            Choferes (Más Percibido)
          </h3>
          <div className="space-y-2">
            {dataProcesada.todasFinanzas.slice(0, 10).map((c, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 shrink-0 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs">
                    {idx + 1}
                  </div>
                  <p className="font-semibold text-slate-700 dark:text-slate-200 text-xs pr-2 leading-tight">
                    {c.nombre}
                  </p>
                </div>
                <div className="flex flex-col items-end text-xs shrink-0">
                  <span className="font-black text-emerald-700 dark:text-emerald-300">
                    {fMoneda(c.total)}
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">
                    <span className="font-semibold text-slate-500 dark:text-slate-400">
                      {c.viajes} {c.viajes === 1 ? "viaje" : "viajes"}
                    </span>{" "}
                    | V: {fMoneda(c.viaticos)} | C: {fMoneda(c.comisiones)}
                  </span>
                </div>
              </div>
            ))}
            {dataProcesada.todasFinanzas.length === 0 && (
              <p className="text-xs text-slate-400 dark:text-slate-500">Sin datos registrados.</p>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm border-t-4 border-t-rose-500">
          <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-5 flex items-center gap-2">
            <TrendingDown className="text-rose-500" size={18} /> Top 10 Choferes
            (Menos Percibido)
          </h3>
          <div className="space-y-2">
            {[...dataProcesada.todasFinanzas]
              .reverse()
              .slice(0, 10)
              .map((c, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 shrink-0 rounded-md bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold text-xs">
                      {idx + 1}
                    </div>
                    <p className="font-semibold text-slate-700 dark:text-slate-200 text-xs pr-2 leading-tight">
                      {c.nombre}
                    </p>
                  </div>
                  <div className="flex flex-col items-end text-xs shrink-0">
                    <span className="font-black text-rose-700 dark:text-rose-300">
                      {fMoneda(c.total)}
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">
                      <span className="font-semibold text-slate-500 dark:text-slate-400">
                        {c.viajes} {c.viajes === 1 ? "viaje" : "viajes"}
                      </span>{" "}
                      | V: {fMoneda(c.viaticos)} | C: {fMoneda(c.comisiones)}
                    </span>
                  </div>
                </div>
              ))}
            {dataProcesada.todasFinanzas.length === 0 && (
              <p className="text-xs text-slate-400 dark:text-slate-500">Sin datos registrados.</p>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm border-t-4 border-t-teal-500 mb-6">
        <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-2">
          <Users className="text-teal-500" size={18} /> Percepción Económica de
          Ayudantes
        </h3>
        <p className="text-[11px] text-slate-400 dark:text-slate-500 mb-4">
          Solo se atribuye ingreso a ayudantes que también están registrados
          como chofer (misma regla que Nómina).
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
          {dataProcesada.todosAyudantesFinanzas.slice(0, 10).map((a, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0"
            >
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 shrink-0 rounded-md bg-teal-50 text-teal-600 flex items-center justify-center font-bold text-xs">
                  {idx + 1}
                </div>
                <p className="font-semibold text-slate-700 dark:text-slate-200 text-xs pr-2 leading-tight">
                  {a.nombre}
                </p>
              </div>
              <div className="flex flex-col items-end text-xs shrink-0">
                <span className="font-black text-teal-700">
                  {fMoneda(a.total)}
                </span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500">
                  <span className="font-semibold text-slate-500 dark:text-slate-400">
                    {a.viajes} {a.viajes === 1 ? "viaje" : "viajes"}
                  </span>{" "}
                  | V: {fMoneda(a.viaticos)} | C: {fMoneda(a.comisiones)}
                </span>
              </div>
            </div>
          ))}
          {dataProcesada.todosAyudantesFinanzas.length === 0 && (
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Sin ayudantes con doble rol (también chofer) en este periodo.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
