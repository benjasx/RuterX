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
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { obtenerHistorialPorRangoFirebase } from "../firebase/historialService";
import { generarPDFGerencial } from "../utils/pdfDashboardService";

// Función para forzar hora local
const obtenerFechaLocalStr = (fecha: Date) => {
  const year = fecha.getFullYear();
  const month = String(fecha.getMonth() + 1).padStart(2, "0");
  const day = String(fecha.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default function Dashboard() {
  const [generandoPDF, setGenerandoPDF] = useState(false);

  const hoy = new Date();
  const hace7Dias = new Date();
  hace7Dias.setDate(hoy.getDate() - 6);

  const strHoy = obtenerFechaLocalStr(hoy);
  const strHace7Dias = obtenerFechaLocalStr(hace7Dias);

  const {
    data: datosCrudos = [],
    isLoading: cargando,
    isError,
  } = useQuery({
    queryKey: ["historial_salidas", "dashboard", strHace7Dias, strHoy],
    queryFn: () => obtenerHistorialPorRangoFirebase(strHace7Dias, strHoy),
  });

  const dataProcesada = useMemo(() => {
    let totalVentas = 0;
    let totalPeso = 0;
    let totalViajes = 0;
    let totalCostos = 0;

    const agrupadoPorDia: Record<string, number> = {};
    const choferesMap: Record<string, number> = {};
    const unidadesMap: Record<string, number> = {};
    const rutasMap: Record<string, { venta: number; peso: number }> = {};

    const finanzasChoferes: Record<
      string,
      { viaticos: number; comisiones: number; total: number; viajes: number }
    > = {};
    const conteoAyudantes: Record<string, number> = {};

    for (let i = 0; i <= 6; i++) {
      const d = new Date(hace7Dias);
      d.setDate(d.getDate() + i);
      agrupadoPorDia[obtenerFechaLocalStr(d)] = 0;
    }

    datosCrudos.forEach((registro) => {
      (registro.viajes || []).forEach((v: any) => {
        if (v.chofer && v.chofer !== "-" && v.chofer.trim() !== "") {
          finanzasChoferes[v.chofer.toUpperCase().trim()] = {
            viaticos: 0,
            comisiones: 0,
            total: 0,
            viajes: 0,
          };
        }
        if (v.ayudante1 && v.ayudante1 !== "-" && v.ayudante1.trim() !== "")
          conteoAyudantes[v.ayudante1.toUpperCase().trim()] = 0;
        if (v.ayudante2 && v.ayudante2 !== "-" && v.ayudante2.trim() !== "")
          conteoAyudantes[v.ayudante2.toUpperCase().trim()] = 0;
      });
    });

    datosCrudos.forEach((registro) => {
      const fecha = registro.fecha;
      if (fecha >= strHace7Dias && fecha <= strHoy) {
        const viajes = registro.viajes || [];

        viajes.forEach((v: any) => {
          if (v.chofer && v.chofer !== "-") {
            const nombreChofer = v.chofer.toUpperCase().trim();
            const venta = Number(v.totalMonto) || 0;
            const peso = Number(v.kgTotal) || 0;
            const viatico = Number(v.viaticoRuta) || 0;
            const comision = Number(v.comisionChofer) || 0;
            const costo =
              viatico + comision + (Number(v.comisionAyudante) || 0);

            totalVentas += venta;
            totalPeso += peso;
            totalViajes += 1;
            totalCostos += costo;

            if (agrupadoPorDia[fecha] !== undefined)
              agrupadoPorDia[fecha] += venta;

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

          if (v.ayudante1 && v.ayudante1 !== "-" && v.ayudante1.trim() !== "")
            conteoAyudantes[v.ayudante1.toUpperCase().trim()] += 1;
          if (v.ayudante2 && v.ayudante2 !== "-" && v.ayudante2.trim() !== "")
            conteoAyudantes[v.ayudante2.toUpperCase().trim()] += 1;
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
      },
      datosGrafico: Object.keys(agrupadoPorDia)
        .sort()
        .map((fecha) => ({
          fecha: fecha.substring(5),
          ventas: agrupadoPorDia[fecha],
        })),
      todasRutas: Object.entries(rutasMap)
        .sort((a, b) => b[1].venta - a[1].venta)
        .map(([nombre, datos]) => ({ nombre, venta: datos.venta, peso: datos.peso })),
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
    };
  }, [datosCrudos, strHace7Dias, strHoy]);

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
    
    try {
      const elementoGrafico = document.getElementById("grafico-ventas");
      if (elementoGrafico) {
        const canvas = await html2canvas(elementoGrafico, { scale: 2 });
        graficoBase64 = canvas.toDataURL("image/png");
      }
    } catch (error) {
      console.error("Error capturando el gráfico:", error);
    }

    generarPDFGerencial({
      fechas: { inicio: strHace7Dias, fin: strHoy },
      kpis: dataProcesada.kpis,
      rutas: dataProcesada.todasRutas,
      choferesPeso: dataProcesada.todosChoferesPeso,
      choferesViajes: dataProcesada.todosChoferesViajes,
      ayudantesViajes: dataProcesada.todosAyudantesViajes,
      finanzas: dataProcesada.todasFinanzas,
      unidades: dataProcesada.todasUnidades,
      graficoBase64,
    });
    setGenerandoPDF(false);
  };

  if (cargando) {
    return (
      <div className="flex w-full h-full items-center justify-center">
        <p className="text-slate-500 font-bold animate-pulse flex items-center gap-2">
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
    <div className="w-full bg-slate-50/50 p-6 rounded-xl flex flex-col h-full overflow-y-auto custom-scrollbar">
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            <TrendingUp className="text-blue-600" size={28} />
            Resumen Operativo
          </h2>
          <p className="text-slate-500 mt-1 font-medium">
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
            <DollarSign size={24} />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-400 uppercase">
              Venta Total
            </p>
            <p className="text-2xl font-black text-slate-800">
              {fMoneda(dataProcesada.kpis.ventas)}
            </p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
            <Scale size={24} />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-400 uppercase">
              Peso Movido
            </p>
            <p className="text-2xl font-black text-slate-800">
              {fNumero(dataProcesada.kpis.peso)}{" "}
              <span className="text-sm text-slate-500 font-bold">KG</span>
            </p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 shrink-0">
            <Truck size={24} />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-400 uppercase">
              Viajes Realizados
            </p>
            <p className="text-2xl font-black text-slate-800">
              {dataProcesada.kpis.viajes}{" "}
              <span className="text-sm text-slate-500 font-bold">Rutas</span>
            </p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 shrink-0">
            <Activity size={24} />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-400 uppercase">
              Costo Operativo
            </p>
            <p className="text-2xl font-black text-slate-800">
              {fMoneda(dataProcesada.kpis.costos)}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
        <div className="xl:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col">
          <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
            Tendencia de Ventas (7 Días)
          </h3>
          <div className="w-full flex-1 min-h-100" id="grafico-ventas">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={dataProcesada.datosGrafico}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorVentas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#e2e8f0"
                />
                <XAxis
                  dataKey="fecha"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: "#64748b" }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: "#64748b" }}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(value: any) => [
                    fMoneda(Number(value) || 0),
                    "Ventas",
                  ]}
                  labelStyle={{ color: "#1e293b", fontWeight: "bold" }}
                  contentStyle={{
                    borderRadius: "8px",
                    border: "none",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="ventas"
                  stroke="#10b981"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorVentas)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex-1">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Award className="text-amber-500" size={18} /> Top 4 Choferes
              (Peso)
            </h3>
            <div className="space-y-4">
              {dataProcesada.todosChoferesPeso.slice(0, 4).map((c, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 shrink-0 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 text-sm">
                      {idx + 1}
                    </div>
                    <p className="font-semibold text-slate-700 text-sm pr-2">
                      {c.nombre}
                    </p>
                  </div>
                  <p className="font-black text-blue-600 text-sm shrink-0">
                    {fNumero(c.peso)}{" "}
                    <span className="text-[10px] text-slate-400 font-bold ml-1">
                      KG
                    </span>
                  </p>
                </div>
              ))}
              {dataProcesada.todosChoferesPeso.length === 0 && (
                <p className="text-xs text-slate-400">Sin datos registrados.</p>
              )}
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex-1">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Map className="text-emerald-500" size={18} /> Top 3 Rutas
              (Ventas)
            </h3>
            <div className="space-y-4">
              {dataProcesada.todasRutas.slice(0, 3).map((r, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 shrink-0 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 text-sm">
                      {idx + 1}
                    </div>
                    <p className="font-semibold text-slate-700 text-sm pr-2">
                      {r.nombre}
                    </p>
                  </div>
                  <p className="font-black text-emerald-600 text-sm shrink-0">
                    {fMoneda(r.venta)}
                  </p>
                </div>
              ))}
              {dataProcesada.todasRutas.length === 0 && (
                <p className="text-xs text-slate-400">Sin datos registrados.</p>
              )}
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex-1">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Truck className="text-purple-500" size={18} /> Top 4 Unidades
              (Peso)
            </h3>
            <div className="space-y-4">
              {dataProcesada.todasUnidades.slice(0, 4).map((u, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 shrink-0 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 text-sm">
                      {idx + 1}
                    </div>
                    <p className="font-semibold text-slate-700 text-sm">
                      Unidad {u.nombre}
                    </p>
                  </div>
                  <p className="font-black text-blue-600 text-sm shrink-0">
                    {fNumero(u.peso)}{" "}
                    <span className="text-[10px] text-slate-400 font-bold ml-1">
                      KG
                    </span>
                  </p>
                </div>
              ))}
              {dataProcesada.todasUnidades.length === 0 && (
                <p className="text-xs text-slate-400">Sin datos registrados.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 shrink-0 mb-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm border-t-4 border-t-emerald-500">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-5 flex items-center gap-2">
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
                  <div className="w-6 h-6 shrink-0 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs">
                    {idx + 1}
                  </div>
                  <p className="font-semibold text-slate-700 text-xs pr-2 leading-tight">
                    {c.nombre}
                  </p>
                </div>
                <div className="flex flex-col items-end text-xs shrink-0">
                  <span className="font-black text-emerald-700">
                    {fMoneda(c.total)}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    <span className="font-semibold text-slate-500">
                      {c.viajes} {c.viajes === 1 ? "viaje" : "viajes"}
                    </span>{" "}
                    | V: {fMoneda(c.viaticos)} | C: {fMoneda(c.comisiones)}
                  </span>
                </div>
              </div>
            ))}
            {dataProcesada.todasFinanzas.length === 0 && (
              <p className="text-xs text-slate-400">Sin datos registrados.</p>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm border-t-4 border-t-rose-500">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-5 flex items-center gap-2">
            <TrendingDown className="text-rose-500" size={18} /> Top 10 Choferes (Menos Percibido)
          </h3>
          <div className="space-y-2">
            {[...dataProcesada.todasFinanzas].reverse().slice(0, 10).map((c, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 shrink-0 rounded-md bg-rose-50 text-rose-600 flex items-center justify-center font-bold text-xs">
                    {idx + 1}
                  </div>
                  <p className="font-semibold text-slate-700 text-xs pr-2 leading-tight">
                    {c.nombre}
                  </p>
                </div>
                <div className="flex flex-col items-end text-xs shrink-0">
                  <span className="font-black text-rose-700">
                    {fMoneda(c.total)}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    <span className="font-semibold text-slate-500">
                      {c.viajes} {c.viajes === 1 ? "viaje" : "viajes"}
                    </span>{" "}
                    | V: {fMoneda(c.viaticos)} | C: {fMoneda(c.comisiones)}
                  </span>
                </div>
              </div>
            ))}
            {dataProcesada.todasFinanzas.length === 0 && (
              <p className="text-xs text-slate-400">Sin datos registrados.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
