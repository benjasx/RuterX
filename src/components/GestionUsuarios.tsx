import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { UserPlus, ShieldCheck, Ban, CheckCircle2 } from "lucide-react";

import {
  obtenerUsuariosFirebase,
  crearUsuarioFirebase,
  actualizarRolUsuarioFirebase,
  cambiarEstadoUsuarioFirebase,
} from "../firebase/usuariosService";
import type { RolUsuario } from "../utils/roles";
import {
  notificarExito,
  notificarError,
  notificarAdvertencia,
  confirmar,
} from "../utils/notificaciones";

const ETIQUETA_ROL: Record<RolUsuario, string> = {
  admin: "Administrador",
  jefeReparto: "Jefe de Reparto",
  embarques: "Embarques",
  vendedor: "Vendedor",
  chofer: "Chofer",
};

interface GestionUsuariosProps {
  usuarioEmail: string | null;
}

export default function GestionUsuarios({ usuarioEmail }: GestionUsuariosProps) {
  const queryClient = useQueryClient();

  const { data: usuarios = [], isLoading } = useQuery({
    queryKey: ["usuarios"],
    queryFn: obtenerUsuariosFirebase,
  });

  const [nuevoEmail, setNuevoEmail] = useState("");
  const [nuevoPassword, setNuevoPassword] = useState("");
  const [nuevoRol, setNuevoRol] = useState<RolUsuario>("chofer");
  const [guardando, setGuardando] = useState(false);

  const handleCrearUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoEmail.trim() || !nuevoPassword.trim()) {
      return notificarAdvertencia("Correo y contraseña son obligatorios.");
    }
    if (nuevoPassword.length < 6) {
      return notificarAdvertencia("La contraseña debe tener al menos 6 caracteres.");
    }

    setGuardando(true);
    const resultado = await crearUsuarioFirebase({
      email: nuevoEmail.trim(),
      password: nuevoPassword,
      role: nuevoRol,
    });

    if (resultado.success) {
      queryClient.invalidateQueries({ queryKey: ["usuarios"] });
      notificarExito(`Usuario ${nuevoEmail} creado correctamente.`);
      setNuevoEmail("");
      setNuevoPassword("");
      setNuevoRol("chofer");
    } else {
      notificarError("Error al crear el usuario. Revisa la consola.");
    }
    setGuardando(false);
  };

  const handleCambiarRol = async (uid: string, role: RolUsuario) => {
    const resultado = await actualizarRolUsuarioFirebase(uid, role);
    if (resultado.success) {
      queryClient.invalidateQueries({ queryKey: ["usuarios"] });
    } else {
      notificarError("Error al actualizar el rol. Revisa la consola.");
    }
  };

  // 🚀 PROTECCIÓN: evita quedarte sin forma de reactivar una cuenta.
  // "Deshabilitar" cierra la sesión de inmediato (ver RuterMapas.tsx), así que
  // deshabilitarte a ti mismo o al último admin activo te dejaría sin nadie
  // con acceso al panel para revertirlo.
  const adminsActivos = usuarios.filter(
    (u) => u.role === "admin" && u.activo,
  );

  const motivoBloqueo = (usuario: (typeof usuarios)[number]): string | null => {
    if (!usuario.activo) return null; // reactivar siempre está permitido
    if (usuarioEmail && usuario.email === usuarioEmail) {
      return "No puedes deshabilitar tu propia cuenta.";
    }
    if (usuario.role === "admin" && adminsActivos.length <= 1) {
      return "No puedes deshabilitar al último administrador activo.";
    }
    return null;
  };

  const handleCambiarEstado = async (
    usuario: (typeof usuarios)[number],
    activo: boolean,
  ) => {
    if (!activo) {
      const bloqueo = motivoBloqueo(usuario);
      if (bloqueo) {
        notificarAdvertencia(bloqueo);
        return;
      }
    }

    const ok = await confirmar({
      mensaje: activo
        ? "¿Reactivar el acceso de este usuario?"
        : "¿Deshabilitar el acceso de este usuario? No podrá iniciar sesión.",
      peligroso: !activo,
      textoConfirmar: activo ? "Reactivar" : "Deshabilitar",
    });
    if (!ok) return;

    const resultado = await cambiarEstadoUsuarioFirebase(usuario.id, activo);
    if (resultado.success) {
      queryClient.invalidateQueries({ queryKey: ["usuarios"] });
    } else {
      notificarError("Error al cambiar el estado del usuario. Revisa la consola.");
    }
  };

  return (
    <div className="flex flex-col xl:flex-row gap-6 w-full">
      <div className="w-full xl:w-100 shrink-0 bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col">
        <div className="flex items-center gap-2 mb-6">
          <UserPlus className="text-blue-600 dark:text-blue-400" size={24} />
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
            Crear Usuario
          </h2>
        </div>

        <form
          onSubmit={handleCrearUsuario}
          className="space-y-4 flex flex-col flex-1"
        >
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
              Correo Electrónico
            </label>
            <input
              type="email"
              value={nuevoEmail}
              onChange={(e) => setNuevoEmail(e.target.value)}
              placeholder="Ej. chofer03@ruterx.com"
              className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
              Contraseña
            </label>
            <input
              type="text"
              value={nuevoPassword}
              onChange={(e) => setNuevoPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
              Rol
            </label>
            <select
              value={nuevoRol}
              onChange={(e) => setNuevoRol(e.target.value as RolUsuario)}
              className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {Object.entries(ETIQUETA_ROL).map(([valor, etiqueta]) => (
                <option key={valor} value={valor}>
                  {etiqueta}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-auto pt-6">
            <button
              type="submit"
              disabled={guardando}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-colors flex justify-center items-center gap-2 disabled:opacity-70"
            >
              <ShieldCheck size={18} />{" "}
              {guardando ? "Creando..." : "Crear Usuario"}
            </button>
          </div>
        </form>
      </div>

      <div className="flex-1 w-full bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4">
          Usuarios del Sistema
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          "Deshabilitar" bloquea el acceso dentro de RuterX apenas el usuario
          abre la app, pero no impide el inicio de sesión a nivel de Firebase
          Auth.
        </p>

        {isLoading ? (
          <p className="text-slate-500 dark:text-slate-400">Cargando...</p>
        ) : usuarios.length === 0 ? (
          <p className="text-slate-500 dark:text-slate-400">
            Aún no hay usuarios creados desde este panel.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                  <th className="py-2 pr-4 font-semibold">Correo</th>
                  <th className="py-2 pr-4 font-semibold">Rol</th>
                  <th className="py-2 pr-4 font-semibold">Estado</th>
                  <th className="py-2 pr-4 font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map((usuario) => (
                  <tr
                    key={usuario.id}
                    className="border-b border-slate-100 dark:border-slate-700"
                  >
                    <td className="py-2 pr-4 text-slate-800 dark:text-slate-100">
                      {usuario.email}
                    </td>
                    <td className="py-2 pr-4">
                      <select
                        value={usuario.role}
                        onChange={(e) =>
                          handleCambiarRol(
                            usuario.id,
                            e.target.value as RolUsuario,
                          )
                        }
                        className="border border-slate-300 dark:border-slate-600 rounded-md px-2 py-1 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200"
                      >
                        {Object.entries(ETIQUETA_ROL).map(
                          ([valor, etiqueta]) => (
                            <option key={valor} value={valor}>
                              {etiqueta}
                            </option>
                          ),
                        )}
                      </select>
                    </td>
                    <td className="py-2 pr-4">
                      {usuario.activo ? (
                        <span className="inline-flex items-center gap-1 text-green-700 dark:text-green-400 font-medium">
                          <CheckCircle2 size={16} /> Activo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 font-medium">
                          <Ban size={16} /> Deshabilitado
                        </span>
                      )}
                    </td>
                    <td className="py-2 pr-4">
                      <button
                        onClick={() =>
                          handleCambiarEstado(usuario, !usuario.activo)
                        }
                        disabled={!!motivoBloqueo(usuario)}
                        title={motivoBloqueo(usuario) ?? undefined}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors border disabled:opacity-40 disabled:cursor-not-allowed ${
                          usuario.activo
                            ? "text-red-600 dark:text-red-400 border-red-200 dark:border-red-900 hover:bg-red-50 dark:hover:bg-red-950/40 disabled:hover:bg-transparent"
                            : "text-green-700 dark:text-green-400 border-green-200 dark:border-green-900 hover:bg-green-50 dark:hover:bg-green-950/40"
                        }`}
                      >
                        {usuario.activo ? "Deshabilitar" : "Reactivar"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
