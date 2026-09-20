import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  obtenerPlantillasCorreoFirebase,
  agregarPlantillaCorreoFirebase,
  actualizarPlantillaCorreoFirebase,
  eliminarPlantillaCorreoFirebase,
  type PlantillaCorreo,
} from "../firebase/plantillasCorreoService";
import { notificarExito, notificarAdvertencia, notificarError, confirmar } from "../utils/notificaciones";
import { Mail, PlusCircle, Loader2, Trash2, Pencil, Save, X } from "lucide-react";

interface FormularioPlantilla {
  nombre: string;
  remitente: string;
  asunto: string;
  cuerpo: string;
  destinatariosDefault: string;
  copiaDefault: string;
}

const FORMULARIO_VACIO: FormularioPlantilla = {
  nombre: "",
  remitente: "",
  asunto: "",
  cuerpo: "",
  destinatariosDefault: "",
  copiaDefault: "",
};

export default function PanelCorreos() {
  const queryClient = useQueryClient();

  const { data: plantillas = [], isLoading } = useQuery({
    queryKey: ["plantillasCorreo"],
    queryFn: obtenerPlantillasCorreoFirebase,
  });

  const [formularioAbierto, setFormularioAbierto] = useState(false);
  const [plantillaEditando, setPlantillaEditando] =
    useState<PlantillaCorreo | null>(null);
  const [form, setForm] = useState<FormularioPlantilla>(FORMULARIO_VACIO);

  const agregarMutation = useMutation({
    mutationFn: agregarPlantillaCorreoFirebase,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plantillasCorreo"] });
      notificarExito("Plantilla creada.");
      setFormularioAbierto(false);
    },
    onError: () => notificarError("Error al crear la plantilla."),
  });

  const actualizarMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<Omit<PlantillaCorreo, "id">>;
    }) => actualizarPlantillaCorreoFirebase(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plantillasCorreo"] });
      notificarExito("Plantilla actualizada.");
      setFormularioAbierto(false);
    },
    onError: () => notificarError("Error al actualizar la plantilla."),
  });

  const eliminarMutation = useMutation({
    mutationFn: eliminarPlantillaCorreoFirebase,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plantillasCorreo"] });
      notificarExito("Plantilla eliminada.");
    },
    onError: () => notificarError("Error al eliminar la plantilla."),
  });

  const abrirNuevaPlantilla = () => {
    setPlantillaEditando(null);
    setForm(FORMULARIO_VACIO);
    setFormularioAbierto(true);
  };

  const abrirEditarPlantilla = (plantilla: PlantillaCorreo) => {
    setPlantillaEditando(plantilla);
    setForm({
      nombre: plantilla.nombre,
      remitente: plantilla.remitente,
      asunto: plantilla.asunto,
      cuerpo: plantilla.cuerpo,
      destinatariosDefault: plantilla.destinatariosDefault,
      copiaDefault: plantilla.copiaDefault,
    });
    setFormularioAbierto(true);
  };

  const handleGuardarPlantilla = () => {
    if (!form.nombre.trim())
      return notificarAdvertencia("Captura un nombre para la plantilla.");
    if (!form.remitente.trim())
      return notificarAdvertencia("Captura el correo remitente.");
    if (!form.asunto.trim())
      return notificarAdvertencia("Captura el asunto.");
    if (!form.cuerpo.trim())
      return notificarAdvertencia("Captura el cuerpo del correo.");
    if (!form.destinatariosDefault.trim())
      return notificarAdvertencia("Captura al menos un destinatario por defecto.");

    if (plantillaEditando) {
      actualizarMutation.mutate({ id: plantillaEditando.id!, data: form });
    } else {
      agregarMutation.mutate(form);
    }
  };

  const handleEliminarPlantilla = async (plantilla: PlantillaCorreo) => {
    const ok = await confirmar({
      mensaje: `¿Eliminar la plantilla "${plantilla.nombre}"?`,
      textoConfirmar: "Eliminar",
      peligroso: true,
    });
    if (ok) eliminarMutation.mutate(plantilla.id!);
  };

  const guardando = agregarMutation.isPending || actualizarMutation.isPending;

  return (
    <div className="w-full bg-slate-50/50 dark:bg-slate-900/50 p-6 rounded-xl flex flex-col h-full overflow-y-auto custom-scrollbar">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6 pb-4 border-b border-slate-200 dark:border-slate-700">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-3">
            <Mail className="text-blue-600 dark:text-blue-400" size={28} />
            Correos
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">
            Plantillas reutilizables para pedir la reimpresión de facturas por
            correo.
          </p>
        </div>

        <button
          onClick={abrirNuevaPlantilla}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors"
        >
          <PlusCircle size={16} /> Nueva plantilla
        </button>
      </div>

      {formularioAbierto && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-5 mb-6 max-w-2xl">
          <h2 className="text-sm font-black text-slate-800 dark:text-slate-100 mb-4">
            {plantillaEditando ? "Editar plantilla" : "Nueva plantilla"}
          </h2>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                Nombre de la plantilla
              </label>
              <input
                type="text"
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                placeholder="Ej. Reimpresión de facturas — Cliente X"
                className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-700 dark:text-slate-200 font-medium focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                Remitente (from)
              </label>
              <input
                type="text"
                value={form.remitente}
                onChange={(e) =>
                  setForm({ ...form, remitente: e.target.value })
                }
                placeholder="facturacion@turemitente.com"
                className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-700 dark:text-slate-200 font-medium focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                Asunto
              </label>
              <input
                type="text"
                value={form.asunto}
                onChange={(e) => setForm({ ...form, asunto: e.target.value })}
                className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-700 dark:text-slate-200 font-medium focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                Cuerpo del correo — usa <code>{"{{folios}}"}</code> donde
                quieras que aparezcan los folios al enviar
              </label>
              <textarea
                value={form.cuerpo}
                onChange={(e) => setForm({ ...form, cuerpo: e.target.value })}
                rows={5}
                className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-700 dark:text-slate-200 font-medium focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-900"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                  Destinatarios por defecto
                </label>
                <input
                  type="text"
                  value={form.destinatariosDefault}
                  onChange={(e) =>
                    setForm({ ...form, destinatariosDefault: e.target.value })
                  }
                  placeholder="correo1@ejemplo.com, correo2@ejemplo.com"
                  className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-700 dark:text-slate-200 font-medium focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                  Copia por defecto (opcional)
                </label>
                <input
                  type="text"
                  value={form.copiaDefault}
                  onChange={(e) =>
                    setForm({ ...form, copiaDefault: e.target.value })
                  }
                  placeholder="correo1@ejemplo.com, correo2@ejemplo.com"
                  className="w-full p-2.5 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-700 dark:text-slate-200 font-medium focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-900"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-4">
            <button
              onClick={handleGuardarPlantilla}
              disabled={guardando}
              className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold px-4 py-2.5 rounded-xl transition-colors shadow-sm"
            >
              <Save size={16} />
              {guardando ? "Guardando..." : "Guardar plantilla"}
            </button>
            <button
              onClick={() => setFormularioAbierto(false)}
              className="flex items-center justify-center gap-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 font-bold px-4 py-2.5 rounded-xl transition-colors"
            >
              <X size={16} />
              Cancelar
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center h-full p-16 text-slate-400 dark:text-slate-500 gap-3 font-medium">
          <Loader2 className="animate-spin" size={24} /> Cargando plantillas...
        </div>
      ) : plantillas.length === 0 ? (
        <p className="text-sm text-center text-slate-400 dark:text-slate-500 font-medium p-16">
          Todavía no hay plantillas de correo.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {plantillas.map((plantilla) => (
            <div
              key={plantilla.id}
              className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 flex flex-col gap-2"
            >
              <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 truncate">
                {plantilla.nombre}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">
                De: {plantilla.remitente}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">
                Asunto: {plantilla.asunto}
              </p>

              <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                <button
                  onClick={() => abrirEditarPlantilla(plantilla)}
                  className="flex-1 flex items-center justify-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 py-2 rounded-lg transition-colors"
                >
                  <Pencil size={14} /> Editar
                </button>
                <button
                  onClick={() => handleEliminarPlantilla(plantilla)}
                  className="flex-1 flex items-center justify-center gap-1.5 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 py-2 rounded-lg transition-colors"
                >
                  <Trash2 size={14} /> Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
