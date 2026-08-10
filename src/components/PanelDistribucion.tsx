import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Calendar,
  Save,
  Plus,
  Trash2,
  Loader2,
  FileSpreadsheet,
  Download,
  FileText,
} from "lucide-react";
import {
  obtenerDistribucionPorFecha,
  guardarDistribucionFecha,
} from "../firebase/distribucionService";
import { obtenerChoferesFirebase } from "../firebase/choferesService";
import { LISTA_UNIDADES, LISTA_RUTAS } from "../utils/mapaUtils";
import { exportarDistribucionPDF } from "../utils/reportesDistribucionUtils";

export default function PanelDistribucion() {
  const hoyStr = new Date().toLocaleDateString("sv-SE");
  const [fechaSeleccionada, setFechaSeleccionada] = useState(hoyStr);
  const [filas, setFilas] = useState<any[]>([]);
  const [guardando, setGuardando] = useState(false);
  const queryClient = useQueryClient();

  // Consultar catálogo de personal
  const { data: choferesData = [], isLoading: cargandoChoferes } = useQuery({
    queryKey: ["choferes"],
    queryFn: obtenerChoferesFirebase,
  });

  // Consultar distribución de la fecha seleccionada
  const { data: distribucionGuardada = [], isLoading: cargandoDistribucion } =
    useQuery({
      queryKey: ["distribucion", fechaSeleccionada],
      queryFn: () => obtenerDistribucionPorFecha(fechaSeleccionada),
    });

  useEffect(() => {
    if (distribucionGuardada.length > 0) {
      setFilas(distribucionGuardada);
    } else {
      setFilas([
        {
          id: Date.now(),
          ruta: "",
          unidad: "",
          chofer: "",
          auxiliar1: "",
          auxiliar2: "",
          embarqueCredito: "",
          embarqueContado: "",
        },
      ]);
    }
  }, [distribucionGuardada, fechaSeleccionada]);

  // Separar Choferes de Auxiliares y asegurar mayúsculas
  const { listaChoferes, listaAuxiliares } = useMemo(() => {
    const choferes: string[] = [];
    const auxiliares: string[] = [];

    choferesData.forEach((c: any) => {
      const nombre = (c.nombre || "").toUpperCase();
      const rol = (c.rol || c.puesto || c.tipo || "").toLowerCase();
      if (rol.includes("ayudante") || rol.includes("auxiliar")) {
        auxiliares.push(nombre);
      } else {
        choferes.push(nombre);
      }
    });

    return {
      listaChoferes:
        choferes.length > 0
          ? choferes
          : choferesData.map((c: any) => (c.nombre || "").toUpperCase()),
      listaAuxiliares:
        auxiliares.length > 0
          ? auxiliares
          : choferesData.map((c: any) => (c.nombre || "").toUpperCase()),
    };
  }, [choferesData]);

  // Bloqueos inteligentes de recursos ya usados en otras filas
  const { unidadesUsadas, choferesUsados, auxiliaresUsados } = useMemo(() => {
    const unidades = new Set<string>();
    const choferes = new Set<string>();
    const auxiliares = new Set<string>();

    filas.forEach((f) => {
      if (f.unidad) unidades.add(f.unidad);
      if (f.chofer) choferes.add(f.chofer);
      if (f.auxiliar1) auxiliares.add(f.auxiliar1);
      if (f.auxiliar2) auxiliares.add(f.auxiliar2);
    });

    return {
      unidadesUsadas: unidades,
      choferesUsados: choferes,
      auxiliaresUsados: auxiliares,
    };
  }, [filas]);

  const actualizarCelda = (index: number, campo: string, valor: string) => {
    const nuevasFilas = [...filas];
    const valorFormateado =
      campo === "embarqueCredito" || campo === "embarqueContado"
        ? valor.toUpperCase()
        : valor;

    nuevasFilas[index] = { ...nuevasFilas[index], [campo]: valorFormateado };
    setFilas(nuevasFilas);
  };

  const agregarFila = () => {
    setFilas([
      ...filas,
      {
        id: Date.now(),
        ruta: "",
        unidad: "",
        chofer: "",
        auxiliar1: "",
        auxiliar2: "",
        embarqueCredito: "",
        embarqueContado: "",
      },
    ]);
  };

  const eliminarFila = (index: number) => {
    if (filas.length === 1) {
      setFilas([
        {
          id: Date.now(),
          ruta: "",
          unidad: "",
          chofer: "",
          auxiliar1: "",
          auxiliar2: "",
          embarqueCredito: "",
          embarqueContado: "",
        },
      ]);
      return;
    }
    const nuevasFilas = filas.filter((_, i) => i !== index);
    setFilas(nuevasFilas);
  };

  const handleGuardar = async () => {
    for (let i = 0; i < filas.length; i++) {
      const f = filas[i];
      if (f.ruta || f.unidad || f.chofer) {
        const creditoLleno =
          f.embarqueCredito && f.embarqueCredito.trim() !== "";
        const contadoLleno =
          f.embarqueContado && f.embarqueContado.trim() !== "";
        if (!creditoLleno && !contadoLleno) {
          alert(
            `⚠️ LA FILA ${i + 1} TIENE DATOS ASIGNADOS PERO LE FALTA CAPTURAR AL MENOS UN EMBARQUE (CRÉDITO O CONTADO).`,
          );
          return;
        }
      }
    }

    setGuardando(true);
    try {
      await guardarDistribucionFecha(fechaSeleccionada, filas);
      queryClient.invalidateQueries({
        queryKey: ["distribucion", fechaSeleccionada],
      });
      alert("¡DISTRIBUCIÓN GUARDADA CORRECTAMENTE!");
    } catch (error) {
      alert("ERROR AL GUARDAR LA TABLA.");
    } finally {
      setGuardando(false);
    }
  };

  // EXPORTAR A EXCEL (CSV)
  const exportarExcel = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent +=
      "RUTA,UNIDAD,CHOFER,AUXILIAR 1,AUXILIAR 2,EMB. CREDITO,EMB. CONTADO\r\n";

    filas.forEach((f) => {
      const filaArr = [
        `"${(f.ruta || "").toUpperCase()}"`,
        `"${(f.unidad || "").toUpperCase()}"`,
        `"${(f.chofer || "").toUpperCase()}"`,
        `"${(f.auxiliar1 || "").toUpperCase()}"`,
        `"${(f.auxiliar2 || "").toUpperCase()}"`,
        `"${(f.embarqueCredito || "").toUpperCase()}"`,
        `"${(f.embarqueContado || "").toUpperCase()}"`,
      ];
      csvContent += filaArr.join(",") + "\r\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `DISTRIBUCION_RUTAS_${fechaSeleccionada}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (cargandoChoferes || cargandoDistribucion) {
    return (
      <div className="flex w-full h-125 items-center justify-center">
        <Loader2 className="animate-spin text-blue-600" size={40} />
      </div>
    );
  }

  return (
    <div className="w-full bg-white p-6 rounded-xl shadow-sm border border-slate-100 min-h-[calc(100vh-120px)] uppercase">
      {/* ENCABEZADO Y SELECTOR DE FECHA */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b border-slate-100">
        <div>
          <h1 className="text-2xl font-black text-slate-800 flex items-center gap-3">
            <FileSpreadsheet className="text-blue-600" size={28} />
            Tabla de Distribución Diaria
          </h1>
          <p className="text-slate-500 font-medium mt-1 normal-case">
            Control operativo de rutas, unidades, personal y embarques por fecha
          </p>
        </div>

        <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
          <Calendar size={20} className="text-slate-500" />
          <span className="text-xs font-bold text-slate-600 uppercase">
            Fecha de Salida:
          </span>
          <input
            type="date"
            value={fechaSeleccionada}
            onChange={(e) => setFechaSeleccionada(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-1.5 bg-white font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          />
        </div>
      </div>

      {/* TABLA DE DISTRIBUCIÓN */}
      <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-sm mb-6">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-800 text-white text-xs uppercase tracking-wider">
              <th className="p-3 border-r border-slate-700 w-48">Ruta</th>
              <th className="p-3 border-r border-slate-700 w-48">Unidad</th>
              <th className="p-3 border-r border-slate-700 w-56">Chofer</th>
              <th className="p-3 border-r border-slate-700 w-56">Auxiliar 1</th>
              <th className="p-3 border-r border-slate-700 w-56">Auxiliar 2</th>
              <th className="p-3 border-r border-slate-700 w-36">
                Emb. Crédito
              </th>
              <th className="p-3 border-r border-slate-700 w-36">
                Emb. Contado
              </th>
              <th className="p-3 text-center w-16">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-sm">
            {filas.map((fila, index) => (
              <tr
                key={fila.id || index}
                className="hover:bg-slate-50 transition-colors"
              >
                {/* RUTA */}
                <td className="p-2 border-r border-slate-200">
                  <select
                    value={fila.ruta}
                    onChange={(e) =>
                      actualizarCelda(index, "ruta", e.target.value)
                    }
                    className="w-full p-2 bg-transparent border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 font-semibold cursor-pointer uppercase text-xs"
                  >
                    <option value="">-- SELECCIONAR RUTA --</option>
                    {LISTA_RUTAS.map((rutaNombre, i) => (
                      <option key={i} value={rutaNombre.toUpperCase()}>
                        {rutaNombre.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </td>

                {/* UNIDAD */}
                <td className="p-2 border-r border-slate-200">
                  <select
                    value={fila.unidad}
                    onChange={(e) =>
                      actualizarCelda(index, "unidad", e.target.value)
                    }
                    className="w-full p-2 bg-transparent border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 font-bold text-blue-600 cursor-pointer text-xs"
                  >
                    <option value="">-- UNIDAD --</option>
                    {LISTA_UNIDADES.map((u) => {
                      const estaOcupada =
                        unidadesUsadas.has(u) && fila.unidad !== u;
                      return (
                        <option key={u} value={u} disabled={estaOcupada}>
                          {u} {estaOcupada ? "(OCUPADA)" : ""}
                        </option>
                      );
                    })}
                  </select>
                </td>

                {/* CHOFER */}
                <td className="p-2 border-r border-slate-200">
                  <select
                    value={fila.chofer}
                    onChange={(e) =>
                      actualizarCelda(index, "chofer", e.target.value)
                    }
                    className="w-full p-2 bg-transparent border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer text-xs uppercase"
                  >
                    <option value="">-- SELECCIONAR CHOFER --</option>
                    {listaChoferes.map((nombreChofer: string, i: number) => {
                      const estaOcupado =
                        (choferesUsados.has(nombreChofer) ||
                          auxiliaresUsados.has(nombreChofer)) &&
                        fila.chofer !== nombreChofer;
                      return (
                        <option
                          key={i}
                          value={nombreChofer}
                          disabled={estaOcupado}
                        >
                          {nombreChofer} {estaOcupado ? "(EN RUTA)" : ""}
                        </option>
                      );
                    })}
                  </select>
                </td>

                {/* AUXILIAR 1 */}
                <td className="p-2 border-r border-slate-200">
                  <select
                    value={fila.auxiliar1}
                    onChange={(e) =>
                      actualizarCelda(index, "auxiliar1", e.target.value)
                    }
                    className="w-full p-2 bg-transparent border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer text-xs uppercase"
                  >
                    <option value="">-- SIN AUXILIAR ASIGNADO --</option>
                    {listaAuxiliares.map((nombreAux: string, i: number) => {
                      const estaOcupado =
                        (choferesUsados.has(nombreAux) ||
                          auxiliaresUsados.has(nombreAux)) &&
                        fila.auxiliar1 !== nombreAux;
                      return (
                        <option
                          key={i}
                          value={nombreAux}
                          disabled={estaOcupado}
                        >
                          {nombreAux} {estaOcupado ? "(OCUPADO)" : ""}
                        </option>
                      );
                    })}
                  </select>
                </td>

                {/* AUXILIAR 2 */}
                <td className="p-2 border-r border-slate-200">
                  <select
                    value={fila.auxiliar2}
                    onChange={(e) =>
                      actualizarCelda(index, "auxiliar2", e.target.value)
                    }
                    className="w-full p-2 bg-transparent border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer text-xs uppercase"
                  >
                    <option value="">-- SIN AUXILIAR ASIGNADO --</option>
                    {listaAuxiliares.map((nombreAux: string, i: number) => {
                      const estaOcupado =
                        (choferesUsados.has(nombreAux) ||
                          auxiliaresUsados.has(nombreAux)) &&
                        fila.auxiliar2 !== nombreAux;
                      return (
                        <option
                          key={i}
                          value={nombreAux}
                          disabled={estaOcupado}
                        >
                          {nombreAux} {estaOcupado ? "(OCUPADO)" : ""}
                        </option>
                      );
                    })}
                  </select>
                </td>

                {/* EMBARQUE CRÉDITO */}
                <td className="p-2 border-r border-slate-200">
                  <input
                    type="text"
                    value={fila.embarqueCredito}
                    onChange={(e) =>
                      actualizarCelda(index, "embarqueCredito", e.target.value)
                    }
                    placeholder="EJ. B39520"
                    className="w-full p-2 bg-transparent border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 font-mono text-center uppercase text-xs"
                  />
                </td>

                {/* EMBARQUE CONTADO */}
                <td className="p-2 border-r border-slate-200">
                  <input
                    type="text"
                    value={fila.embarqueContado}
                    onChange={(e) =>
                      actualizarCelda(index, "embarqueContado", e.target.value)
                    }
                    placeholder="EJ. B39521"
                    className="w-full p-2 bg-transparent border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 font-mono text-center uppercase text-xs"
                  />
                </td>

                {/* ELIMINAR FILA */}
                <td className="p-2 text-center">
                  <button
                    onClick={() => eliminarFila(index)}
                    className="text-red-500 hover:text-red-700 p-1.5 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                    title="Eliminar fila"
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* BOTONES INFERIORES */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <button
          onClick={agregarFila}
          className="flex items-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold px-5 py-2.5 rounded-xl transition-colors cursor-pointer border border-blue-200 shadow-sm text-xs"
        >
          <Plus size={18} /> Añadir Ruta
        </button>

        <div className="flex items-center gap-3">
          {/* BOTÓN EXCEL */}
          <button
            onClick={exportarExcel}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-3 rounded-xl transition-colors shadow-lg shadow-emerald-600/20 cursor-pointer text-xs"
          >
            <Download size={18} /> EXCEL
          </button>

          {/* BOTÓN PDF */}
          <button
            onClick={() => exportarDistribucionPDF(filas, fechaSeleccionada)}
            className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white font-bold px-5 py-3 rounded-xl transition-colors shadow-lg shadow-rose-600/20 cursor-pointer text-xs"
          >
            <FileText size={18} /> PDF
          </button>

          {/* BOTÓN GUARDAR */}
          <button
            onClick={handleGuardar}
            disabled={guardando}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold px-6 py-3 rounded-xl transition-colors shadow-lg shadow-blue-600/30 cursor-pointer text-xs"
          >
            {guardando ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <Save size={20} />
            )}
            {guardando ? "GUARDANDO..." : "GUARDAR DISTRIBUCIÓN DEL DÍA"}
          </button>
        </div>
      </div>
    </div>
  );
}
