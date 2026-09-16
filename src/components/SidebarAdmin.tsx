import {
  Users,
  Map as MapIcon,
  Briefcase,
  LogOut,
  History,
  ClipboardList,
  Settings,
  LayoutDashboard,
  UserCheck,
  Truck,
  CalendarCheck,
  DatabaseBackup,
  UserCog,
  UserPlus,
  X,
  type LucideIcon,
} from "lucide-react";
import { esAdmin, esJefeReparto } from "../utils/roles";
import type { Vista } from "./Navbar";

export type SubVistaAdmin =
  | "dashboard"
  | "monitorRutas"
  | "clientes"
  | "altasClientes"
  | "distribucion"
  | "rutas"
  | "asistencias"
  | "vendedores"
  | "historial"
  | "historialCompleto"
  | "ajustesNomina"
  | "choferes"
  | "respaldo"
  | "usuarios";

interface SidebarAdminProps {
  vistaActual: Vista;
  menuActivo: SubVistaAdmin;
  onSeleccionarVista: (vista: SubVistaAdmin) => void;
  onIrARutero: () => void;
  abierto: boolean;
  onCerrar: () => void;
  colapsado: boolean;
  usuarioEmail?: string | null;
  onLogout?: () => void;
  esPersonalAutorizado?: boolean;
  esJefeReparto?: boolean;
  esVendedor?: boolean;
}

interface ItemMenu {
  vista: SubVistaAdmin;
  label: string;
  icon: LucideIcon;
  visible: boolean;
}

export default function SidebarAdmin({
  vistaActual,
  menuActivo,
  onSeleccionarVista,
  onIrARutero,
  abierto,
  onCerrar,
  colapsado,
  usuarioEmail,
  onLogout,
  esPersonalAutorizado = false,
  esJefeReparto: esJefeRepartoActual = false,
  esVendedor = false,
}: SidebarAdminProps) {
  // 🚀 PERMISOS RESTRINGIDOS SEGÚN ROL:
  const permisos = {
    dashboard: esAdmin(usuarioEmail),
    monitorRutas: !esVendedor,
    distribucion: !esVendedor,
    asistencias: esAdmin(usuarioEmail) || esJefeReparto(usuarioEmail),
    clientes: esAdmin(usuarioEmail),
    altasClientes: esAdmin(usuarioEmail) || esVendedor,
    rutas: esAdmin(usuarioEmail),
    vendedores: esAdmin(usuarioEmail),
    historial: esAdmin(usuarioEmail),
    historialCompleto: esAdmin(usuarioEmail),
    ajustesNomina: esAdmin(usuarioEmail),
    // 🚀 AHORA EL JEFE DE REPARTO TAMBIÉN PUEDE VER "AÑADIR CHOFERES"
    choferes: esAdmin(usuarioEmail) || esJefeReparto(usuarioEmail),
    respaldo: esAdmin(usuarioEmail),
    usuarios: esAdmin(usuarioEmail),
  };

  const items: ItemMenu[] = [
    { vista: "dashboard", label: "Dashboard", icon: LayoutDashboard, visible: permisos.dashboard },
    { vista: "monitorRutas", label: "Monitor de Rutas", icon: Truck, visible: permisos.monitorRutas },
    { vista: "distribucion", label: "Distribución Diaria", icon: ClipboardList, visible: permisos.distribucion },
    { vista: "asistencias", label: "Asistencia/reparto", icon: CalendarCheck, visible: permisos.asistencias },
    { vista: "clientes", label: "Añadir Clientes", icon: Users, visible: permisos.clientes },
    { vista: "altasClientes", label: "Altas de Clientes", icon: UserPlus, visible: permisos.altasClientes },
    { vista: "rutas", label: "Añadir Rutas", icon: MapIcon, visible: permisos.rutas },
    { vista: "vendedores", label: "Añadir Vendedores", icon: Briefcase, visible: permisos.vendedores },
    { vista: "historial", label: "Equidad Choferes", icon: History, visible: permisos.historial },
    { vista: "historialCompleto", label: "Historial Rutas", icon: ClipboardList, visible: permisos.historialCompleto },
    { vista: "ajustesNomina", label: "Reglas de viaticos", icon: Settings, visible: permisos.ajustesNomina },
    { vista: "choferes", label: "Choferes/Auxiliares", icon: UserCheck, visible: permisos.choferes },
    { vista: "respaldo", label: "Respaldo de Datos", icon: DatabaseBackup, visible: permisos.respaldo },
    { vista: "usuarios", label: "Gestión de Usuarios", icon: UserCog, visible: permisos.usuarios },
  ];

  const inicial = usuarioEmail ? usuarioEmail.charAt(0).toUpperCase() : "U";

  // 🚀 Mismo criterio que usaba el Navbar: el Jefe de Reparto no ve el
  // toggle hacia el Rutero (entra forzosamente al Panel Administrativo).
  const mostrarItemRutero = esPersonalAutorizado && !esJefeRepartoActual;

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 w-64 h-screen shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col p-4 overflow-hidden transition-all duration-200 ease-in-out xl:static xl:translate-x-0 ${
        abierto ? "translate-x-0" : "-translate-x-full"
      } ${colapsado ? "xl:w-0 xl:p-0 xl:border-0" : "xl:w-64"}`}
    >
      <div className="flex-1 min-h-0 flex flex-col">
        {/* Header de marca */}
        <div className="flex items-center gap-3 px-1 pb-4 mb-3 border-b border-slate-100 dark:border-slate-700">
          <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center overflow-hidden shrink-0">
            <img
              src="https://avatars.githubusercontent.com/u/62582879?v=4&size=64"
              alt="Logo RutaSmart"
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 leading-tight truncate">
              RuterX
            </h3>
            <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider truncate">
              Panel Administrativo
            </p>
          </div>
          <button
            onClick={onCerrar}
            className="xl:hidden p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors shrink-0 cursor-pointer"
            aria-label="Cerrar menú"
          >
            <X size={18} />
          </button>
        </div>

        <ul className="space-y-1 flex-1 min-h-0 overflow-y-auto custom-scrollbar">
          {mostrarItemRutero && (
            <li>
              <button
                onClick={onIrARutero}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors cursor-pointer ${
                  vistaActual === "rutero"
                    ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold shadow-sm"
                    : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/60 font-medium"
                }`}
              >
                <MapIcon size={18} className="shrink-0" />
                <span className="truncate">Rutero</span>
              </button>
            </li>
          )}
          {items.map(
            ({ vista, label, icon: Icon, visible }) =>
              visible && (
                <li key={vista}>
                  <button
                    onClick={() => onSeleccionarVista(vista)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors cursor-pointer ${
                      vistaActual === "admin" && menuActivo === vista
                        ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold shadow-sm"
                        : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/60 font-medium"
                    }`}
                  >
                    <Icon size={18} className="shrink-0" />
                    <span className="truncate">{label}</span>
                  </button>
                </li>
              ),
          )}
        </ul>
      </div>

      <div className="shrink-0">
        <div className="h-px bg-slate-100 dark:bg-slate-700 w-full mb-3 mt-3"></div>
        <div className="flex items-center gap-3 px-1 mb-2">
          <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center font-bold text-xs shrink-0">
            {inicial}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">
              Cuenta
            </p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">
              {usuarioEmail}
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            if (onLogout) onLogout();
          }}
          className="flex items-center w-full gap-3 px-3 py-2.5 text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
        >
          <LogOut size={18} /> Cerrar Sesión
        </button>
      </div>
    </aside>
  );
}
