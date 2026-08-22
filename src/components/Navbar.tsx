import { useState } from "react";
import {
  LogOut,
  UserCircle,
  Sun,
  Moon,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { alternarTema, modoOscuroActivo } from "../utils/theme";

export type Vista = "admin" | "rutero";

interface NavbarProps {
  usuarioEmail?: string | null;
  onLogout?: () => void;
  onToggleSidebar?: () => void;
  sidebarColapsado?: boolean;
  onToggleColapsarSidebar?: () => void;
}

export default function Navbar({
  usuarioEmail,
  onLogout,
  onToggleSidebar,
  sidebarColapsado = false,
  onToggleColapsarSidebar,
}: NavbarProps) {
  const [oscuro, setOscuro] = useState(modoOscuroActivo);

  return (
    <nav className="h-16 shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-3 sm:px-6 flex justify-between items-center transition-all duration-300">
      <div className="flex items-center gap-1 sm:gap-2">
        <button
          onClick={onToggleSidebar}
          className="xl:hidden flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 p-2 rounded-lg transition-all duration-200 shrink-0 cursor-pointer"
          aria-label="Abrir menú"
        >
          <Menu size={20} />
        </button>
        <button
          onClick={onToggleColapsarSidebar}
          title={sidebarColapsado ? "Mostrar menú" : "Ocultar menú"}
          className="hidden xl:flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 p-2 rounded-lg transition-all duration-200 shrink-0 cursor-pointer"
        >
          {sidebarColapsado ? (
            <PanelLeftOpen size={20} />
          ) : (
            <PanelLeftClose size={20} />
          )}
        </button>
      </div>

      <div className="flex items-center gap-2 sm:gap-6">
        <button
          onClick={() => setOscuro(alternarTema())}
          title={oscuro ? "Modo claro" : "Modo oscuro"}
          className="flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 p-2 sm:p-2.5 rounded-lg transition-all duration-200 shrink-0 cursor-pointer"
        >
          {oscuro ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* PERFIL Y CERRAR SESIÓN */}
        {(usuarioEmail || onLogout) && (
          <div className="flex items-center gap-2 sm:gap-3 sm:pl-4 border-l-0 sm:border-l border-slate-200 dark:border-slate-700 max-w-[50vw]">
            {usuarioEmail && (
              <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 px-2 sm:px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 max-w-full">
                <UserCircle size={16} className="text-blue-500 dark:text-blue-400 shrink-0" />
                <span className="font-medium tracking-wide truncate">
                  {usuarioEmail}
                </span>
              </div>
            )}

            {onLogout && (
              <button
                onClick={onLogout}
                title="Cerrar sesión"
                className="flex items-center justify-center text-rose-500 dark:text-rose-400 hover:text-white hover:bg-rose-500 p-2 sm:px-3 sm:py-2 rounded-lg transition-all duration-200 shrink-0 cursor-pointer"
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
