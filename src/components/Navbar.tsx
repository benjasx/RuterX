import { UserPlus, Map as MapIcon, LogOut, UserCircle } from "lucide-react";

export type Vista = "admin" | "rutero";

interface NavbarProps {
  vistaActual: Vista;
  setVistaActual: (vista: Vista) => void;
  usuarioEmail?: string | null;
  onLogout?: () => void;
  esAdmin?: boolean;
  esPersonalAutorizado?: boolean;
  esJefeReparto?: boolean; // 🚀 Recibimos si es el Jefe
}

export default function Navbar({
  vistaActual,
  setVistaActual,
  usuarioEmail,
  onLogout,
  esPersonalAutorizado = false,
  esJefeReparto = false, // 🚀 Añadido
}: NavbarProps) {
  return (
    <nav className="bg-slate-900 border-b border-slate-800 px-3 sm:px-6 py-3 sm:py-4 flex justify-between items-center shadow-lg transition-all duration-300">
      <div className="flex items-center gap-2 sm:gap-4 group cursor-pointer">
        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-slate-800 rounded-xl flex items-center justify-center overflow-hidden relative shadow-inner transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3 shrink-0">
          <img
            src="https://avatars.githubusercontent.com/u/62582879?v=4&size=64"
            alt="Logo RutaSmart"
            className="w-full h-full object-cover z-10 relative transition-transform duration-300"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        </div>

        <h1 className="text-xl sm:text-2xl font-extrabold text-transparent bg-clip-text bg-linear-to-r from-white to-slate-400 tracking-tight transition-all duration-300 group-hover:to-blue-400">
          RuterX
        </h1>
      </div>

      <div className="flex items-center gap-2 sm:gap-6">
        {/* BOTONES DE VISTA */}
        {/* 🚀 Ocultamos TODO el bloque si el usuario es el Jefe de Reparto (para que no vea ni el Admin Panel duplicado ni el Rutero) */}
        {esPersonalAutorizado && !esJefeReparto && (
          <div className="hidden md:flex bg-slate-800/80 p-1.5 rounded-xl shadow-inner relative ring-1 ring-slate-700/50">
            <button
              onClick={() => setVistaActual("admin")}
              className={`cursor-pointer flex items-center gap-2 px-5 py-2.5 rounded-lg transition-all duration-300 ease-out active:scale-95 text-sm font-semibold ${
                vistaActual === "admin"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-900/40"
                  : "text-slate-400 hover:text-white hover:bg-slate-700/60"
              }`}
            >
              <UserPlus size={18} />
              Admin Panel
            </button>

            <button
              onClick={() => setVistaActual("rutero")}
              className={`cursor-pointer flex items-center gap-2 px-5 py-2.5 rounded-lg transition-all duration-300 ease-out active:scale-95 text-sm font-semibold ${
                vistaActual === "rutero"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-900/40"
                  : "text-slate-400 hover:text-white hover:bg-slate-700/60"
              }`}
            >
              <MapIcon size={18} />
              Rutero
            </button>
          </div>
        )}

        {/* PERFIL Y CERRAR SESIÓN */}
        {(usuarioEmail || onLogout) && (
          <div className="flex items-center gap-2 sm:gap-3 sm:pl-4 border-l-0 sm:border-l border-slate-700 max-w-[50vw]">
            {usuarioEmail && (
              <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-300 bg-slate-800/80 px-2 sm:px-3 py-1.5 rounded-full border border-slate-700 shadow-inner max-w-full">
                <UserCircle size={16} className="text-blue-400 shrink-0" />
                <span className="font-medium tracking-wide truncate">
                  {usuarioEmail}
                </span>
              </div>
            )}

            {onLogout && (
              <button
                onClick={onLogout}
                title="Cerrar sesión"
                className="flex items-center justify-center text-rose-400 hover:text-white hover:bg-rose-500/20 p-2 sm:px-3 sm:py-2 rounded-lg transition-all duration-200 shrink-0"
              >
                <LogOut size={18} />
                <span className="hidden sm:inline text-sm font-semibold ml-2">
                  Salir
                </span>
              </button>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
