import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as XLSX from "xlsx";
import {
  obtenerChoferesFirebase,
  agregarChoferFirebase,
  eliminarChoferFirebase,
  actualizarChoferFirebase,
} from "../firebase/choferesService";
import {
  UserPlus,
  Trash2,
  Loader2,
  UserCheck,
  ShieldAlert,
  Edit2,
  X,
  Save,
  Search,
  Download,
  FileText,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

// 🚀 FUNCIÓN EXTERNA PARA OBTENER EL LOGO EN BASE64
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

const ITEMS_POR_PAGINA = 20;

export default function AdminChoferes() {
  const queryClient = useQueryClient();

  // Estados del formulario
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [tipo, setTipo] = useState<"Chofer" | "Auxiliar">("Chofer");
  const [estado, setEstado] = useState("Disponible");

  // Estados para Búsqueda y Filtro
  const [busqueda, setBusqueda] = useState("");
  const [filtroRol, setFiltroRol] = useState("Todos");

  // Estado para Paginación
  const [paginaActual, setPaginaActual] = useState(1);

  // Obtener choferes
  const { data: choferes = [], isLoading } = useQuery({
    queryKey: ["choferes"],
    queryFn: obtenerChoferesFirebase,
  });

  // Lógica de filtrado
  const choferesFiltrados = choferes.filter((c: any) => {
    const coincideNombre = (c.nombre || "")
      .toLowerCase()
      .includes(busqueda.toLowerCase());
    const coincideRol = filtroRol === "Todos" || c.tipo === filtroRol;
    return coincideNombre && coincideRol;
  });

  // Si cambiamos el filtro o la búsqueda, regresamos a la página 1
  useEffect(() => {
    setPaginaActual(1);
  }, [busqueda, filtroRol]);

  // Lógica de Paginación
  const totalPaginas =
    Math.ceil(choferesFiltrados.length / ITEMS_POR_PAGINA) || 1;
  const choferesPaginados = choferesFiltrados.slice(
    (paginaActual - 1) * ITEMS_POR_PAGINA,
    paginaActual * ITEMS_POR_PAGINA,
  );

  const limpiarFormulario = () => {
    setNombre("");
    setEmail("");
    setTelefono("");
    setTipo("Chofer");
    setEstado("Disponible");
    setEditingId(null);
  };

  const agregarMutation = useMutation({
    mutationFn: agregarChoferFirebase,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["choferes"] });
      limpiarFormulario();
      alert("¡Personal registrado con éxito!");
    },
    onError: () => alert("Error al registrar el personal."),
  });

  const actualizarMutation = useMutation({
    mutationFn: (data: any) => actualizarChoferFirebase(editingId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["choferes"] });
      limpiarFormulario();
      alert("¡Personal actualizado correctamente!");
    },
    onError: () => alert("Error al actualizar los datos."),
  });

  const eliminarMutation = useMutation({
    mutationFn: eliminarChoferFirebase,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["choferes"] });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre || !email)
      return alert("Por favor completa los campos obligatorios.");
    const dataToSend = { nombre, email, telefono, tipo, estado };
    if (editingId) {
      actualizarMutation.mutate(dataToSend);
    } else {
      agregarMutation.mutate(dataToSend);
    }
  };

  const handleEdit = (chofer: any) => {
    setEditingId(chofer.id);
    setNombre(chofer.nombre || "");
    setEmail(chofer.email || chofer.correo || "");
    setTelefono(chofer.telefono || "");
    setTipo(chofer.tipo || "Chofer");
    setEstado(chofer.estado || "Disponible");
  };

  // FUNCIÓN: EXPORTAR A EXCEL
  const exportarExcel = () => {
    const dataAExportar = choferesFiltrados.map((c: any) => ({
      "Nombre Completo": c.nombre || "Sin nombre",
      "Correo Electrónico": c.email || c.correo || "Sin correo",
      Teléfono: c.telefono || "N/A",
      "Rol / Puesto": c.tipo || "Chofer",
      Estado: c.estado || "Disponible",
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataAExportar);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Personal");
    const fecha = new Date().toLocaleDateString("sv-SE");
    XLSX.writeFile(workbook, `Directorio_Personal_${fecha}.xlsx`);
  };

  // 🚀 FUNCIÓN: EXPORTAR A PDF (ACTUALIZADA CON LOGO Y RESUMEN)
  const exportarPDF = async () => {
    const pdfMake = (window as any).pdfMake;
    if (!pdfMake) return alert("Generador PDF cargando...");

    // 1. Obtener Logo
    const logoBase64 = await obtenerLogoBase64Local("/CIRLogo.png");

    // 2. Calcular Estadísticas para el Resumen
    const choferesActivos = choferesFiltrados.filter(
      (c: any) =>
        c.tipo === "Chofer" && (c.estado === "Disponible" || !c.estado),
    ).length;
    const auxiliaresActivos = choferesFiltrados.filter(
      (c: any) =>
        c.tipo === "Auxiliar" && (c.estado === "Disponible" || !c.estado),
    ).length;
    const totalActivos = choferesActivos + auxiliaresActivos;

    // 3. Preparar cuerpo de la tabla principal
    const bodyData = choferesFiltrados.map((c: any, index: number) => {
      const esPar = index % 2 === 0;
      const bgFila = esPar ? "#ffffff" : "#f8fafc";
      return [
        { text: c.nombre || "Sin nombre", style: "td", fillColor: bgFila },
        { text: c.email || c.correo || "-", style: "td", fillColor: bgFila },
        { text: c.telefono || "-", style: "tdCenter", fillColor: bgFila },
        { text: c.tipo || "Chofer", style: "tdCenter", fillColor: bgFila },
        {
          text: c.estado || "Disponible",
          style: "tdCenter",
          fillColor: bgFila,
        },
      ];
    });

    const documentDefinition = {
      pageOrientation: "portrait",
      pageMargins: [30, 30, 30, 30],
      content: [
        // 🚀 CABECERA CON LOGO Y TÍTULO
        {
          columns: [
            logoBase64
              ? { image: logoBase64, width: 70 }
              : { text: "CIR", bold: true, fontSize: 18 },
            {
              text: `DIRECTORIO DE PERSONAL DE REPARTO\n${new Date().toLocaleDateString("es-MX")}`,
              style: "mainTitle",
              alignment: "right",
              margin: [0, 5, 0, 0],
            },
          ],
          margin: [0, 0, 0, 20],
        },
        // 🚀 SECCIÓN DE RESUMEN EJECUTIVO (PLANTILLA)
        {
          table: {
            widths: ["*", "*", "*"],
            body: [
              [
                {
                  text: "RESUMEN DE PLANTILLA (ACTIVOS)",
                  colSpan: 3,
                  style: "thResumen",
                  alignment: "center",
                },
                {},
                {},
              ],
              [
                {
                  text: `Total Activos: ${totalActivos}`,
                  style: "tdResumenBold",
                  alignment: "center",
                },
                {
                  text: `Choferes: ${choferesActivos}`,
                  style: "tdResumen",
                  alignment: "center",
                },
                {
                  text: `Auxiliares: ${auxiliaresActivos}`,
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
        // 🚀 TABLA DE DIRECTORIO GENERAL
        {
          table: {
            headerRows: 1,
            widths: ["*", "auto", "auto", "auto", "auto"],
            body: [
              [
                { text: "NOMBRE COMPLETO", style: "th" },
                { text: "CORREO", style: "th" },
                { text: "TELÉFONO", style: "th", alignment: "center" },
                { text: "ROL", style: "th", alignment: "center" },
                { text: "ESTADO", style: "th", alignment: "center" },
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

    const fechaStr = new Date().toLocaleDateString("sv-SE");
    pdfMake
      .createPdf(documentDefinition)
      .download(`Directorio_Personal_${fechaStr}.pdf`);
  };

  return (
    <div className="w-full bg-slate-50/50 p-6 rounded-xl flex flex-col h-full overflow-y-auto custom-scrollbar">
      {/* Cabecera Principal */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-black text-slate-800 flex items-center gap-3">
            <UserCheck className="text-blue-600" size={28} />
            Gestión de Personal de Reparto
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Administra los choferes y auxiliares disponibles para las rutas
            logísticas.
          </p>
        </div>

        {/* BOTONES DE EXPORTACIÓN GENERAL */}
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={exportarExcel}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors"
          >
            <Download size={16} /> Excel (XLSX)
          </button>
          <button
            onClick={exportarPDF}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors"
          >
            <FileText size={16} /> Reporte PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* FORMULARIO DE REGISTRO/EDICIÓN */}
        <div className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-fit sticky top-6">
          <h2 className="text-base font-bold text-slate-800 mb-5 flex items-center gap-2">
            {editingId ? (
              <>
                <Edit2 size={18} className="text-amber-500" /> Editando Registro
              </>
            ) : (
              <>
                <UserPlus size={18} className="text-blue-600" /> Nuevo Registro
              </>
            )}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Nombre Completo
              </label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value.toUpperCase())}
                placeholder="EJ. JUAN PÉREZ"
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-slate-800"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Correo Electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="chofer@ruterx.com"
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-800"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Teléfono
              </label>
              <input
                type="text"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="311 000 0000"
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-800"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Rol
                </label>
                <select
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value as any)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-800 cursor-pointer uppercase"
                >
                  <option value="Chofer">Chofer</option>
                  <option value="Auxiliar">Auxiliar</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Estado
                </label>
                <select
                  value={estado}
                  onChange={(e) => setEstado(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-800 cursor-pointer uppercase"
                >
                  <option value="Disponible">Disponible</option>
                  <option value="Inactivo">Inactivo</option>
                  <option value="Incapacidad">Incapacidad</option>
                </select>
              </div>
            </div>

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
                    <Save size={18} /> Actualizar Personal
                  </>
                ) : (
                  <>
                    <UserPlus size={18} /> Registrar Personal
                  </>
                )}
              </button>

              {editingId && (
                <button
                  type="button"
                  onClick={limpiarFormulario}
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer text-sm"
                >
                  <X size={18} /> Cancelar Edición
                </button>
              )}
            </div>
          </form>
        </div>

        {/* TABLA DE PERSONAL Y CONTROLES */}
        <div className="lg:col-span-3 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          {/* BARRA DE BÚSQUEDA Y FILTROS */}
          <div className="p-5 border-b border-slate-100 bg-slate-50/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex flex-col">
              <h2 className="text-base font-bold text-slate-800">
                Directorio de Empleados
              </h2>
              <span className="text-[10px] bg-blue-100 text-blue-700 font-black px-2.5 py-1 rounded-md tracking-widest w-fit mt-1.5 uppercase">
                {choferesFiltrados.length} Registros Encontrados
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative w-full sm:w-64">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  size={16}
                />
                <input
                  type="text"
                  placeholder="Buscar por nombre..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-700 shadow-sm"
                />
              </div>

              <select
                value={filtroRol}
                onChange={(e) => setFiltroRol(e.target.value)}
                className="w-full sm:w-auto px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-700 cursor-pointer shadow-sm"
              >
                <option value="Todos">Todos los roles</option>
                <option value="Chofer">Choferes</option>
                <option value="Auxiliar">Auxiliares</option>
              </select>
            </div>
          </div>

          <div className="flex-1 overflow-x-auto min-h-[400px]">
            {isLoading ? (
              <div className="flex items-center justify-center h-full p-16 text-slate-400 gap-3 font-medium">
                <Loader2 className="animate-spin" size={24} /> Cargando
                directorio...
              </div>
            ) : choferes.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-16 text-center text-slate-400">
                <ShieldAlert size={48} className="mb-4 opacity-30" />
                <p className="font-semibold text-base">
                  No hay personal registrado todavía.
                </p>
              </div>
            ) : choferesFiltrados.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-16 text-center text-slate-400">
                <Search size={48} className="mb-4 opacity-30" />
                <p className="font-semibold text-base">
                  No se encontraron empleados.
                </p>
                <p className="text-sm mt-1">
                  Intenta con otro nombre o ajusta los filtros.
                </p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] font-black text-slate-500 uppercase tracking-widest bg-slate-50/50">
                    <th className="p-4 pl-6">Nombre</th>
                    <th className="p-4">Contacto</th>
                    <th className="p-4 text-center">Rol</th>
                    <th className="p-4 text-center">Estado</th>
                    <th className="p-4 text-center pr-6">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {choferesPaginados.map((c: any) => (
                    <tr
                      key={c.id}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      <td className="p-4 pl-6 font-bold text-slate-800 uppercase">
                        {c.nombre || "Sin nombre"}
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-600">
                            {c.telefono || "Sin Teléfono"}
                          </span>
                          <span className="text-xs text-slate-400 font-mono mt-0.5">
                            {c.email || c.correo}
                          </span>
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <span
                          className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-md tracking-wider ${c.tipo === "Auxiliar" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}
                        >
                          {c.tipo || "Chofer"}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <span
                          className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full tracking-wider border ${c.estado === "Disponible" || !c.estado ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-rose-50 text-rose-700 border-rose-200"}`}
                        >
                          {c.estado || "Disponible"}
                        </span>
                      </td>
                      <td className="p-4 pr-6">
                        <div className="flex items-center justify-center gap-2 opacity-100 lg:opacity-50 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleEdit(c)}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => {
                              if (
                                confirm(`¿Eliminar a ${c.nombre || c.email}?`)
                              )
                                eliminarMutation.mutate(c.id);
                            }}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* FOOTER: CONTROLES DE PAGINACIÓN */}
          {choferesFiltrados.length > 0 && (
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Mostrando{" "}
                {Math.min(
                  (paginaActual - 1) * ITEMS_POR_PAGINA + 1,
                  choferesFiltrados.length,
                )}{" "}
                a{" "}
                {Math.min(
                  paginaActual * ITEMS_POR_PAGINA,
                  choferesFiltrados.length,
                )}{" "}
                de {choferesFiltrados.length}
              </span>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setPaginaActual((p) => Math.max(1, p - 1))}
                  disabled={paginaActual === 1}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={14} /> Anterior
                </button>

                <span className="text-xs font-bold text-slate-700 bg-slate-200 px-3 py-1.5 rounded-lg">
                  {paginaActual} / {totalPaginas}
                </span>

                <button
                  onClick={() =>
                    setPaginaActual((p) => Math.min(totalPaginas, p + 1))
                  }
                  disabled={paginaActual === totalPaginas}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Siguiente <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
