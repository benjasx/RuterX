import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  obtenerChoferesFirebase,
  agregarChoferFirebase,
  eliminarChoferFirebase,
} from "../firebase/choferesService";
import {
  UserPlus,
  Trash2,
  Loader2,
  UserCheck,
  ShieldAlert,
} from "lucide-react";

export default function AdminChoferes() {
  const queryClient = useQueryClient();
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [tipo, setTipo] = useState<"Chofer" | "Auxiliar">("Chofer");

  // Obtener choferes con React Query
  const { data: choferes = [], isLoading } = useQuery({
    queryKey: ["choferes"],
    queryFn: obtenerChoferesFirebase,
  });

  // Mutación para agregar
  const agregarMutation = useMutation({
    mutationFn: agregarChoferFirebase,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["choferes"] });
      setNombre("");
      setEmail("");
      setTelefono("");
      alert("¡Personal registrado con éxito y colección creada en Firebase!");
    },
    onError: () => alert("Error al registrar el personal."),
  });

  // Mutación para eliminar
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
    agregarMutation.mutate({ nombre, email, telefono, tipo });
  };

  return (
    <div className="flex-1 p-6 bg-slate-50 overflow-y-auto">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Cabecera */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <UserCheck className="text-blue-600" /> Gestión de Personal de
              Reparto
            </h1>
            <p className="text-sm text-slate-500">
              Agrega choferes o auxiliares que aparecerán disponibles al asignar
              despachos.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Formulario de Registro */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 h-fit">
            <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
              <UserPlus size={18} className="text-blue-600" /> Nuevo Registro
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej. Juan Pérez"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-700"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Correo Electrónico
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="chofer@ruterx.com"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-700"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Teléfono
                </label>
                <input
                  type="text"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="311 000 0000"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-700"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Rol / Puesto
                </label>
                <select
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value as any)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-700 cursor-pointer"
                >
                  <option value="Chofer">Chofer</option>
                  <option value="Auxiliar">Auxiliar de Reparto</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={agregarMutation.isPending}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-3 rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer mt-2 text-sm"
              >
                {agregarMutation.isPending ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Guardando...
                  </>
                ) : (
                  <>
                    <UserPlus size={16} /> Registrar Personal
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Listado de Personal Registrado */}
          <div className="md:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-800">
                Personal de Reparto
              </h2>
              <span className="text-xs bg-blue-100 text-blue-700 font-bold px-2.5 py-1 rounded-full">
                {choferes.length} Activos
              </span>
            </div>

            <div className="flex-1 overflow-x-auto">
              {isLoading ? (
                <div className="flex items-center justify-center p-12 text-slate-400 gap-2 font-medium">
                  <Loader2 className="animate-spin" /> Cargando personal...
                </div>
              ) : choferes.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-center text-slate-400">
                  <ShieldAlert size={32} className="mb-2 opacity-50" />
                  <p className="font-medium text-sm">
                    No hay personal registrado todavía.
                  </p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                      <th className="p-4">Nombre</th>
                      <th className="p-4">Correo</th>
                      <th className="p-4">Teléfono</th>
                      <th className="p-4">Rol</th>
                      <th className="p-4 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm text-slate-600">
                    {choferes.map((c: any) => (
                      <tr
                        key={c.id}
                        className="hover:bg-slate-50/80 transition-colors"
                      >
                        <td className="p-4 font-semibold text-slate-800">
                          {c.nombre || "Sin nombre"}
                        </td>
                        <td className="p-4 font-mono text-xs">
                          {c.email || c.correo}
                        </td>
                        <td className="p-4">{c.telefono || "N/A"}</td>
                        <td className="p-4">
                          <span
                            className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${c.tipo === "Auxiliar" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}
                          >
                            {c.tipo || "Chofer"}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => {
                              if (
                                confirm(
                                  `¿Deseas eliminar a ${c.nombre || c.email}?`,
                                )
                              ) {
                                eliminarMutation.mutate(c.id);
                              }
                            }}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Eliminar"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
