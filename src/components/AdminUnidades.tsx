import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase/config";
import {
  obtenerUnidadesFirebase,
  agregarUnidadFirebase,
  actualizarUnidadFirebase,
} from "../firebase/unidadesService";
import {
  obtenerMantenimientosFirebase,
  actualizarMantenimientoFirebase,
} from "../firebase/mantenimientosUnidadesService";
import { disponibilidadEfectiva } from "../utils/unidadesUtils";
import PanelMantenimientosUnidades from "./PanelMantenimientosUnidades";
import {
  notificarExito,
  notificarError,
  notificarAdvertencia,
  confirmar,
} from "../utils/notificaciones";
import {
  Car,
  PlusCircle,
  Loader2,
  ShieldAlert,
  Edit2,
  X,
  Save,
  Search,
  ChevronLeft,
  ChevronRight,
  Wrench,
  Truck,
  FileText,
  CheckCircle2,
} from "lucide-react";

// Fecha de ayer en formato YYYY-MM-DD, para cerrar un mantenimiento "hoy"
// (fecha_fin queda en el último día en que la unidad SÍ estuvo en mantenimiento).
const ayerStr = (): string => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toLocaleDateString("sv-SE");
};

const formatearCapacidad = (valor: number | null | undefined) =>
  valor != null ? Number(valor).toLocaleString("es-MX") : "-";

// FUNCIÓN EXTERNA PARA OBTENER EL LOGO EN BASE64 (mismo patrón que AdminChoferes.tsx)
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

const ITEMS_POR_PAGINA = 10;

const claseDisponibilidadBadge = (disponibilidad: string): string => {
  switch (disponibilidad) {
    case "Disponible":
      return "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800";
    case "En mantenimiento":
      return "bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800";
    case "Fuera de servicio":
      return "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800";
    case "Baja":
      return "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700";
    default:
      return "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800";
  }
};

export default function AdminUnidades() {
  const queryClient = useQueryClient();

  const [pestana, setPestana] = useState<"unidades" | "mantenimientos">(
    "unidades",
  );

  // Estados del formulario
  const [editingId, setEditingId] = useState<string | null>(null);
  const [numero, setNumero] = useState("");
  const [tipo, setTipo] = useState("");
  const [capacidadKg, setCapacidadKg] = useState<number | "">("");
  const [capacidadM3, setCapacidadM3] = useState<number | "">("");
  const [estado, setEstado] = useState("Disponible");
  const [motivoFueraServicio, setMotivoFueraServicio] = useState("");
  const [motivoBaja, setMotivoBaja] = useState("");

  const [busqueda, setBusqueda] = useState("");
  const [filtroDisponibilidad, setFiltroDisponibilidad] = useState("Todas");
  const [paginaActual, setPaginaActual] = useState(1);

  const { data: unidades = [], isLoading } = useQuery({
    queryKey: ["unidades"],
    queryFn: obtenerUnidadesFirebase,
  });

  const { data: mantenimientos = [] } = useQuery({
    queryKey: ["mantenimientosUnidades"],
    queryFn: obtenerMantenimientosFirebase,
  });

  // Escucha en vivo: si alguien más cambia una unidad o un mantenimiento
  // mientras este panel está abierto, la caché se actualiza sola, sin toast
  // (ver specs/04-gestion-unidades.md).
  useEffect(() => {
    const unsubUnidades = onSnapshot(collection(db, "unidades"), (snapshot) => {
      const docs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      queryClient.setQueryData(["unidades"], docs);
    });
    const unsubMantenimientos = onSnapshot(
      collection(db, "mantenimientosUnidades"),
      (snapshot) => {
        const docs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        queryClient.setQueryData(["mantenimientosUnidades"], docs);
      },
    );
    return () => {
      unsubUnidades();
      unsubMantenimientos();
    };
  }, [queryClient]);

  const hoyStr = new Date().toLocaleDateString("sv-SE");
  const mantenimientosPorUnidad = (id: string) =>
    mantenimientos.filter((m: any) => m.unidad_id === id);

  const unidadesConDisponibilidad = unidades.map((u: any) => ({
    ...u,
    _disponibilidad: disponibilidadEfectiva(
      u,
      mantenimientosPorUnidad(u.id),
      hoyStr,
    ),
  }));

  const unidadesFiltradas = unidadesConDisponibilidad
    .filter((u: any) => {
      const coincideNumero = (u.numero || "")
        .toLowerCase()
        .includes(busqueda.toLowerCase());
      const coincideDisponibilidad =
        filtroDisponibilidad === "Todas" ||
        u._disponibilidad === filtroDisponibilidad;
      return coincideNumero && coincideDisponibilidad;
    })
    .sort((a: any, b: any) =>
      (a.numero || "").localeCompare(b.numero || "", undefined, {
        numeric: true,
      }),
    );

  useEffect(() => {
    setPaginaActual(1);
  }, [busqueda, filtroDisponibilidad]);

  const totalPaginas =
    Math.ceil(unidadesFiltradas.length / ITEMS_POR_PAGINA) || 1;
  const unidadesPaginadas = unidadesFiltradas.slice(
    (paginaActual - 1) * ITEMS_POR_PAGINA,
    paginaActual * ITEMS_POR_PAGINA,
  );

  const limpiarFormulario = () => {
    setEditingId(null);
    setNumero("");
    setTipo("");
    setCapacidadKg("");
    setCapacidadM3("");
    setEstado("Disponible");
    setMotivoFueraServicio("");
    setMotivoBaja("");
  };

  const agregarMutation = useMutation({
    mutationFn: agregarUnidadFirebase,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["unidades"] });
      limpiarFormulario();
      notificarExito("¡Unidad registrada con éxito!");
    },
    onError: () => notificarError("Error al registrar la unidad."),
  });

  const actualizarMutation = useMutation({
    mutationFn: (data: any) => actualizarUnidadFirebase(editingId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["unidades"] });
      limpiarFormulario();
      notificarExito("¡Unidad actualizada correctamente!");
    },
    onError: () => notificarError("Error al actualizar la unidad."),
  });

  // Cierra hoy un mantenimiento en curso (ej. la unidad se reparó antes de lo
  // previsto), para que vuelva a aparecer disponible de inmediato.
  const finalizarMantenimientoMutation = useMutation({
    mutationFn: (mantenimientoId: string) =>
      actualizarMantenimientoFirebase(mantenimientoId, {
        fecha_fin: ayerStr(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mantenimientosUnidades"] });
      notificarExito("Mantenimiento finalizado. La unidad ya está disponible.");
    },
    onError: () => notificarError("Error al finalizar el mantenimiento."),
  });

  const handleFinalizarMantenimiento = async (unidad: any) => {
    const mantenimientoActivo = mantenimientos.find(
      (m: any) =>
        m.unidad_id === unidad.id &&
        m.fecha_inicio <= hoyStr &&
        hoyStr <= m.fecha_fin,
    );
    if (!mantenimientoActivo) return;

    const ok = await confirmar({
      mensaje: `¿Finalizar hoy el mantenimiento de la unidad ${unidad.numero}? Quedará disponible para asignarse a una ruta.`,
      textoConfirmar: "Finalizar",
    });
    if (ok) finalizarMantenimientoMutation.mutate(mantenimientoActivo.id);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!numero.trim() || !tipo.trim())
      return notificarAdvertencia("Completa el número y el tipo de unidad.");
    if (capacidadKg === "" || capacidadM3 === "")
      return notificarAdvertencia("Completa ambas capacidades.");

    const numeroDuplicado = unidades.some(
      (u: any) =>
        u.id !== editingId &&
        u.estado !== "Baja" &&
        (u.numero || "").trim().toLowerCase() === numero.trim().toLowerCase(),
    );
    if (numeroDuplicado)
      return notificarAdvertencia(
        "Ya existe una unidad activa con ese número.",
      );

    const dataToSend = {
      numero: numero.trim(),
      tipo: tipo.trim(),
      capacidad_kg: Number(capacidadKg),
      capacidad_m3: Number(capacidadM3),
      estado,
      motivo_fuera_servicio:
        estado === "Fuera de servicio" ? motivoFueraServicio.trim() : "",
      motivo_baja: estado === "Baja" ? motivoBaja.trim() : "",
    };

    if (editingId) {
      actualizarMutation.mutate(dataToSend);
    } else {
      agregarMutation.mutate(dataToSend);
    }
  };

  const handleEdit = (u: any) => {
    setEditingId(u.id);
    setNumero(u.numero || "");
    setTipo(u.tipo || "");
    setCapacidadKg(u.capacidad_kg ?? "");
    setCapacidadM3(u.capacidad_m3 ?? "");
    setEstado(u.estado || "Disponible");
    setMotivoFueraServicio(u.motivo_fuera_servicio || "");
    setMotivoBaja(u.motivo_baja || "");
  };

  // Exporta el directorio completo de unidades (respeta búsqueda/filtro
  // activos) con su disponibilidad actual, sin importar la fecha de una ruta.
  const exportarPDF = async () => {
    const pdfMake = (window as any).pdfMake;
    if (!pdfMake) return notificarAdvertencia("Generador PDF cargando...");

    const logoBase64 = await obtenerLogoBase64Local("/CIRLogo.png");

    const conteoPorDisponibilidad = unidadesFiltradas.reduce(
      (acc: Record<string, number>, u: any) => {
        acc[u._disponibilidad] = (acc[u._disponibilidad] || 0) + 1;
        return acc;
      },
      {},
    );

    const bodyData = unidadesFiltradas.map((u: any, index: number) => {
      const esPar = index % 2 === 0;
      const bgFila = esPar ? "#ffffff" : "#f8fafc";
      return [
        { text: u.numero || "-", style: "td", fillColor: bgFila },
        { text: u.tipo || "-", style: "td", fillColor: bgFila },
        {
          text:
            u.capacidad_kg != null
              ? Number(u.capacidad_kg).toLocaleString("es-MX")
              : "-",
          style: "tdCenter",
          fillColor: bgFila,
        },
        {
          text:
            u.capacidad_m3 != null
              ? Number(u.capacidad_m3).toLocaleString("es-MX")
              : "-",
          style: "tdCenter",
          fillColor: bgFila,
        },
        { text: u._disponibilidad, style: "tdCenter", fillColor: bgFila },
      ];
    });

    const documentDefinition = {
      pageOrientation: "portrait",
      pageMargins: [30, 30, 30, 30],
      content: [
        {
          columns: [
            logoBase64
              ? { image: logoBase64, width: 70 }
              : { text: "CIR", bold: true, fontSize: 18 },
            {
              text: `DIRECTORIO DE UNIDADES\n${new Date().toLocaleDateString("es-MX")}`,
              style: "mainTitle",
              alignment: "right",
              margin: [0, 5, 0, 0],
            },
          ],
          margin: [0, 0, 0, 20],
        },
        {
          table: {
            widths: ["*", "*", "*", "*", "*"],
            body: [
              [
                {
                  text: "RESUMEN DE FLOTA",
                  colSpan: 5,
                  style: "thResumen",
                  alignment: "center",
                },
                {},
                {},
                {},
                {},
              ],
              [
                {
                  text: `Total: ${unidadesFiltradas.length}`,
                  style: "tdResumenBold",
                  alignment: "center",
                },
                {
                  text: `Disponibles: ${conteoPorDisponibilidad["Disponible"] || 0}`,
                  style: "tdResumen",
                  alignment: "center",
                },
                {
                  text: `En mantenimiento: ${conteoPorDisponibilidad["En mantenimiento"] || 0}`,
                  style: "tdResumen",
                  alignment: "center",
                },
                {
                  text: `Fuera de servicio: ${conteoPorDisponibilidad["Fuera de servicio"] || 0}`,
                  style: "tdResumen",
                  alignment: "center",
                },
                {
                  text: `Baja: ${conteoPorDisponibilidad["Baja"] || 0}`,
                  style: "tdResumen",
                  alignment: "center",
                },
              ],
            ],
          },
          layout: {
            hLineWidth: () => 0.5,
            vLineWidth: () => 0,
            hLineColor: () => "#e2e8f0",
            paddingTop: () => 6,
            paddingBottom: () => 6,
          },
          margin: [0, 0, 0, 25],
        },
        {
          table: {
            headerRows: 1,
            widths: [40, "*", 55, 55, 75],
            body: [
              [
                { text: "#", style: "th" },
                { text: "TIPO", style: "th" },
                { text: "CAP. (KG)", style: "th", alignment: "center" },
                { text: "CAP. (M³)", style: "th", alignment: "center" },
                { text: "DISPONIBILIDAD", style: "th", alignment: "center" },
              ],
              ...bodyData,
            ],
          },
          layout: "lightHorizontalLines",
        },
      ],
      styles: {
        mainTitle: { fontSize: 13, bold: true, color: "#0f172a" },
        thResumen: {
          bold: true,
          fontSize: 10,
          fillColor: "#f1f5f9",
          color: "#0f172a",
          margin: [4, 4],
        },
        tdResumen: { fontSize: 10, color: "#334155", margin: [4, 4] },
        tdResumenBold: {
          fontSize: 10,
          bold: true,
          color: "#0f172a",
          margin: [4, 4],
        },
        th: {
          bold: true,
          fontSize: 8.5,
          fillColor: "#0f172a",
          color: "#ffffff",
          margin: [4, 4],
        },
        td: { fontSize: 8, color: "#334155", margin: [4, 4] },
        tdCenter: {
          fontSize: 8,
          color: "#334155",
          alignment: "center",
          margin: [4, 4],
        },
      },
    };

    const fecha = new Date().toLocaleDateString("sv-SE");
    pdfMake
      .createPdf(documentDefinition)
      .download(`Directorio_Unidades_${fecha}.pdf`);
  };

  return (
    <div className="w-full bg-slate-50/50 dark:bg-slate-900/50 p-6 rounded-xl flex flex-col h-full overflow-y-auto custom-scrollbar">
      {/* Cabecera Principal */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6 pb-4 border-b border-slate-200 dark:border-slate-700">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-3">
            <Truck className="text-blue-600 dark:text-blue-400" size={28} />
            Gestión de Unidades
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">
            Administra los vehículos, su disponibilidad y sus mantenimientos
            programados.
          </p>
        </div>

        {pestana === "unidades" && (
          <button
            onClick={exportarPDF}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors"
          >
            <FileText size={16} /> Reporte PDF
          </button>
        )}
      </div>

      {/* BARRA DE PESTAÑAS */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setPestana("unidades")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-colors cursor-pointer ${
            pestana === "unidades"
              ? "bg-blue-600 text-white shadow-sm"
              : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
          }`}
        >
          <Car size={16} /> Unidades
        </button>
        <button
          onClick={() => setPestana("mantenimientos")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-colors cursor-pointer ${
            pestana === "mantenimientos"
              ? "bg-orange-600 text-white shadow-sm"
              : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
          }`}
        >
          <Wrench size={16} /> Mantenimientos
        </button>
      </div>

      {pestana === "mantenimientos" ? (
        <PanelMantenimientosUnidades
          unidades={unidades}
          mantenimientos={mantenimientos}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* FORMULARIO DE REGISTRO/EDICIÓN */}
          <div className="lg:col-span-1 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 h-fit sticky top-6">
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-5 flex items-center gap-2">
              {editingId ? (
                <>
                  <Edit2 size={18} className="text-amber-500" /> Editando Unidad
                </>
              ) : (
                <>
                  <PlusCircle
                    size={18}
                    className="text-blue-600 dark:text-blue-400"
                  />{" "}
                  Nueva Unidad
                </>
              )}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Número de Unidad
                </label>
                <input
                  type="text"
                  value={numero}
                  onChange={(e) => setNumero(e.target.value)}
                  placeholder="Ej. 01"
                  className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-slate-800 dark:text-slate-100"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Tipo
                </label>
                <input
                  type="text"
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value)}
                  placeholder="Ej. Fotón, Isuzu"
                  className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-800 dark:text-slate-100"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    Capacidad (kg)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={capacidadKg}
                    onChange={(e) =>
                      setCapacidadKg(
                        e.target.value === "" ? "" : Number(e.target.value),
                      )
                    }
                    className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-800 dark:text-slate-100"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    Capacidad (m³)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={capacidadM3}
                    onChange={(e) =>
                      setCapacidadM3(
                        e.target.value === "" ? "" : Number(e.target.value),
                      )
                    }
                    className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-800 dark:text-slate-100"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Estado
                </label>
                <select
                  value={estado}
                  onChange={(e) => setEstado(e.target.value)}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-800 dark:text-slate-100 cursor-pointer uppercase"
                >
                  <option value="Disponible">Disponible</option>
                  <option value="Fuera de servicio">Fuera de servicio</option>
                  <option value="Baja">Baja</option>
                </select>
              </div>

              {estado === "Fuera de servicio" && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    Motivo (opcional)
                  </label>
                  <input
                    type="text"
                    value={motivoFueraServicio}
                    onChange={(e) => setMotivoFueraServicio(e.target.value)}
                    placeholder="Ej. Llanta ponchada"
                    className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-800 dark:text-slate-100"
                  />
                </div>
              )}

              {estado === "Baja" && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    Motivo de baja (opcional)
                  </label>
                  <input
                    type="text"
                    value={motivoBaja}
                    onChange={(e) => setMotivoBaja(e.target.value)}
                    placeholder="Ej. Donada a Matriz"
                    className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-800 dark:text-slate-100"
                  />
                </div>
              )}

              <div className="pt-2 flex flex-col gap-2">
                <button
                  type="submit"
                  disabled={
                    agregarMutation.isPending || actualizarMutation.isPending
                  }
                  className={`w-full text-white font-bold py-3.5 rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer text-sm ${editingId ? "bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300" : "bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400"}`}
                >
                  {agregarMutation.isPending || actualizarMutation.isPending ? (
                    <>
                      <Loader2 size={18} className="animate-spin" /> Guardando...
                    </>
                  ) : editingId ? (
                    <>
                      <Save size={18} /> Actualizar Unidad
                    </>
                  ) : (
                    <>
                      <PlusCircle size={18} /> Registrar Unidad
                    </>
                  )}
                </button>

                {editingId && (
                  <button
                    type="button"
                    onClick={limpiarFormulario}
                    className="w-full bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer text-sm"
                  >
                    <X size={18} /> Cancelar Edición
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* TABLA DE UNIDADES Y CONTROLES */}
          <div className="lg:col-span-3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-100 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex flex-col">
                <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
                  Directorio de Unidades
                </h2>
                <span className="text-[10px] bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-black px-2.5 py-1 rounded-md tracking-widest w-fit mt-1.5 uppercase">
                  {unidadesFiltradas.length} Registros Encontrados
                </span>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="relative w-full sm:w-64">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
                    size={16}
                  />
                  <input
                    type="text"
                    placeholder="Buscar por número..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-700 dark:text-slate-200 shadow-sm"
                  />
                </div>

                <select
                  value={filtroDisponibilidad}
                  onChange={(e) => setFiltroDisponibilidad(e.target.value)}
                  className="w-full sm:w-auto px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-700 dark:text-slate-200 cursor-pointer shadow-sm"
                >
                  <option value="Todas">Todas las disponibilidades</option>
                  <option value="Disponible">Disponible</option>
                  <option value="En mantenimiento">En mantenimiento</option>
                  <option value="Fuera de servicio">Fuera de servicio</option>
                  <option value="Baja">Baja</option>
                </select>
              </div>
            </div>

            <div className="flex-1 overflow-x-auto min-h-100">
              {isLoading ? (
                <div className="flex items-center justify-center h-full p-16 text-slate-400 dark:text-slate-500 gap-3 font-medium">
                  <Loader2 className="animate-spin" size={24} /> Cargando
                  unidades...
                </div>
              ) : unidades.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full p-16 text-center text-slate-400 dark:text-slate-500">
                  <ShieldAlert size={48} className="mb-4 opacity-30" />
                  <p className="font-semibold text-base">
                    No hay unidades registradas todavía.
                  </p>
                </div>
              ) : unidadesFiltradas.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full p-16 text-center text-slate-400 dark:text-slate-500">
                  <Search size={48} className="mb-4 opacity-30" />
                  <p className="font-semibold text-base">
                    No se encontraron unidades.
                  </p>
                  <p className="text-sm mt-1">
                    Intenta con otro número o ajusta los filtros.
                  </p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700 text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest bg-slate-50/50 dark:bg-slate-900/50">
                      <th className="p-4 pl-6">Número</th>
                      <th className="p-4">Tipo</th>
                      <th className="p-4 text-center">Cap. (kg)</th>
                      <th className="p-4 text-center">Cap. (m³)</th>
                      <th className="p-4 text-center">Disponibilidad</th>
                      <th className="p-4 text-center pr-6">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-sm">
                    {unidadesPaginadas.map((u: any) => (
                      <tr
                        key={u.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-900/50 transition-colors group"
                      >
                        <td className="p-4 pl-6 font-bold text-slate-800 dark:text-slate-100">
                          {u.numero}
                        </td>
                        <td className="p-4 font-medium text-slate-600 dark:text-slate-300">
                          {u.tipo}
                        </td>
                        <td className="p-4 text-center text-slate-600 dark:text-slate-300">
                          {formatearCapacidad(u.capacidad_kg)}
                        </td>
                        <td className="p-4 text-center text-slate-600 dark:text-slate-300">
                          {formatearCapacidad(u.capacidad_m3)}
                        </td>
                        <td className="p-4 text-center">
                          <span
                            className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full tracking-wider border ${claseDisponibilidadBadge(u._disponibilidad)}`}
                            title={u.motivo_fuera_servicio || u.motivo_baja || undefined}
                          >
                            {u._disponibilidad}
                          </span>
                        </td>
                        <td className="p-4 pr-6">
                          <div className="flex items-center justify-center gap-2 opacity-100 lg:opacity-50 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleEdit(u)}
                              className="p-2 text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors"
                              title="Editar"
                            >
                              <Edit2 size={18} />
                            </button>
                            {u._disponibilidad === "En mantenimiento" && (
                              <button
                                onClick={() => handleFinalizarMantenimiento(u)}
                                className="p-2 text-slate-400 dark:text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg transition-colors"
                                title="Finalizar mantenimiento (reparada antes de tiempo)"
                              >
                                <CheckCircle2 size={18} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* FOOTER: CONTROLES DE PAGINACIÓN */}
            {unidadesFiltradas.length > 0 && (
              <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                  Mostrando{" "}
                  {Math.min(
                    (paginaActual - 1) * ITEMS_POR_PAGINA + 1,
                    unidadesFiltradas.length,
                  )}{" "}
                  a{" "}
                  {Math.min(
                    paginaActual * ITEMS_POR_PAGINA,
                    unidadesFiltradas.length,
                  )}{" "}
                  de {unidadesFiltradas.length}
                </span>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setPaginaActual((p) => Math.max(1, p - 1))}
                    disabled={paginaActual === 1}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft size={14} /> Anterior
                  </button>

                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-200 dark:bg-slate-700 px-3 py-1.5 rounded-lg">
                    {paginaActual} / {totalPaginas}
                  </span>

                  <button
                    onClick={() =>
                      setPaginaActual((p) => Math.min(totalPaginas, p + 1))
                    }
                    disabled={paginaActual === totalPaginas}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Siguiente <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
