import {
  Users,
  Map,
  Briefcase,
  LogOut,
  Calculator,
  History,
  ClipboardList,
  Settings,
  LayoutDashboard,
  UserCheck,
  Truck,
  CalendarCheck, // 🚀 Icono para Control de Asistencia
} from "lucide-react";

export type SubVistaAdmin =
  | "dashboard"
  | "monitorRutas"
  | "clientes"
  | "distribucion"
  | "rutas"
  | "asistencias"
  | "vendedores"
  | "tablamontos"
  | "historial"
  | "historialCompleto"
  | "ajustesNomina"
  | "choferes";

interface SidebarAdminProps {
  menuActivo: SubVistaAdmin;
  setMenuActivo: (vista: SubVistaAdmin) => void;
  onLogout: () => void;
  usuarioEmail: string | null;
}

export default function SidebarAdmin({
  menuActivo,
  setMenuActivo,
  onLogout,
  usuarioEmail,
}: SidebarAdminProps) {
  const esJefeReparto = usuarioEmail === "jefedereparto@ruterx.com";
  const esAdmin = !esJefeReparto;

  // 🚀 PERMISOS RESTRINGIDOS: Puedes habilitar asistencias para ambos o solo admin cambiando a `true` o `esAdmin`
  const permisos = {
    dashboard: esAdmin,
    monitorRutas: true,
    distribucion: true,
    asistencias: true, // 🚀 Activado para que el Jefe de Reparto y el Admin puedan llevar el control
    clientes: esAdmin,
    rutas: esAdmin,
    vendedores: esAdmin,
    tablamontos: esAdmin,
    historial: esAdmin,
    historialCompleto: esAdmin,
    ajustesNomina: esAdmin,
    choferes: esAdmin,
  };

  return (
    <aside className="w-full xl:w-62.5 shrink-0 bg-white rounded-xl shadow-sm border border-slate-100 flex flex-col justify-between p-4">
      <div>
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 px-3">
          Opciones
        </h3>
        <ul className="space-y-2 mb-2">
          {permisos.dashboard && (
            <li>
              <button
                onClick={() => setMenuActivo("dashboard")}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  menuActivo === "dashboard"
                    ? "bg-blue-50 text-blue-700 font-semibold"
                    : "text-slate-600 hover:bg-slate-50 font-medium"
                }`}
              >
                <LayoutDashboard size={20} /> Dashboard
              </button>
            </li>
          )}

          {permisos.monitorRutas && (
            <li>
              <button
                onClick={() => setMenuActivo("monitorRutas")}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  menuActivo === "monitorRutas"
                    ? "bg-blue-50 text-blue-700 font-semibold"
                    : "text-slate-600 hover:bg-slate-50 font-medium"
                }`}
              >
                <Truck size={20} /> Monitor de Rutas
              </button>
            </li>
          )}

          {permisos.distribucion && (
            <li>
              <button
                onClick={() => setMenuActivo("distribucion")}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  menuActivo === "distribucion"
                    ? "bg-blue-50 text-blue-700 font-semibold"
                    : "text-slate-600 hover:bg-slate-50 font-medium"
                }`}
              >
                <ClipboardList size={20} /> Distribución Diaria
              </button>
            </li>
          )}

          {/* 🚀 NUEVO BOTÓN: CONTROL DE ASISTENCIA */}
          {permisos.asistencias && (
            <li>
              <button
                onClick={() => setMenuActivo("asistencias")}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  menuActivo === "asistencias"
                    ? "bg-blue-50 text-blue-700 font-semibold"
                    : "text-slate-600 hover:bg-slate-50 font-medium"
                }`}
              >
                <CalendarCheck size={20} /> Asistencia/reparto
              </button>
            </li>
          )}

          {permisos.clientes && (
            <li>
              <button
                onClick={() => setMenuActivo("clientes")}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  menuActivo === "clientes"
                    ? "bg-blue-50 text-blue-700 font-semibold"
                    : "text-slate-600 hover:bg-slate-50 font-medium"
                }`}
              >
                <Users size={20} /> Añadir Clientes
              </button>
            </li>
          )}

          {permisos.rutas && (
            <li>
              <button
                onClick={() => setMenuActivo("rutas")}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  menuActivo === "rutas"
                    ? "bg-blue-50 text-blue-700 font-semibold"
                    : "text-slate-600 hover:bg-slate-50 font-medium"
                }`}
              >
                <Map size={20} /> Añadir Rutas
              </button>
            </li>
          )}

          {permisos.vendedores && (
            <li>
              <button
                onClick={() => setMenuActivo("vendedores")}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  menuActivo === "vendedores"
                    ? "bg-blue-50 text-blue-700 font-semibold"
                    : "text-slate-600 hover:bg-slate-50 font-medium"
                }`}
              >
                <Briefcase size={20} /> Añadir Vendedores
              </button>
            </li>
          )}

          {permisos.tablamontos && (
            <li>
              <button
                onClick={() => setMenuActivo("tablamontos")}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  menuActivo === "tablamontos"
                    ? "bg-blue-50 text-blue-700 font-semibold"
                    : "text-slate-600 hover:bg-slate-50 font-medium"
                }`}
              >
                <Calculator size={20} /> Tabla de Montos
              </button>
            </li>
          )}
        </ul>

        {permisos.historial && (
          <button
            onClick={() => setMenuActivo("historial")}
            className={`flex items-center gap-3 w-full p-3 rounded-xl font-semibold transition-all duration-300 mb-1 mt-4 ${
              menuActivo === "historial"
                ? "bg-blue-50 text-blue-700 shadow-sm border border-blue-100"
                : "text-slate-600 hover:bg-slate-50 hover:text-blue-600"
            }`}
          >
            <History size={20} />
            <span>Equidad Choferes</span>
          </button>
        )}

        {permisos.historialCompleto && (
          <button
            onClick={() => setMenuActivo("historialCompleto")}
            className={`flex items-center gap-3 w-full p-3 rounded-xl font-semibold transition-all duration-300 mb-1 ${
              menuActivo === "historialCompleto"
                ? "bg-blue-50 text-blue-700 shadow-sm border border-blue-100"
                : "text-slate-600 hover:bg-slate-50 hover:text-blue-600"
            }`}
          >
            <ClipboardList size={20} />
            <span>Historial Rutas</span>
          </button>
        )}

        {permisos.ajustesNomina && (
          <button
            onClick={() => setMenuActivo("ajustesNomina")}
            className={`flex items-center gap-3 w-full p-3 rounded-xl font-semibold transition-all duration-300 mb-1 ${
              menuActivo === "ajustesNomina"
                ? "bg-blue-50 text-blue-700 shadow-sm border border-blue-100"
                : "text-slate-600 hover:bg-slate-50 hover:text-blue-600"
            }`}
          >
            <Settings size={20} />
            <span>Reglas de viaticos</span>
          </button>
        )}

        {permisos.choferes && (
          <button
            onClick={() => setMenuActivo("choferes")}
            className={`flex items-center gap-3 w-full p-3 rounded-xl font-semibold transition-all duration-300 mt-2 ${
              menuActivo === "choferes"
                ? "bg-blue-50 text-blue-700 shadow-sm border border-blue-100"
                : "text-slate-600 hover:bg-slate-50 hover:text-blue-600"
            }`}
          >
            <UserCheck size={20} />
            <span>Añadir Choferes</span>
          </button>
        )}
      </div>

      <div>
        <div className="h-px bg-slate-100 w-full mb-4 mt-6"></div>
        <button
          onClick={() => {
            onLogout();
          }}
          className="flex items-center w-full gap-3 px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-50 rounded-xl transition-colors mt-auto cursor-pointer"
        >
          <LogOut size={18} /> Cerrar Sesión
        </button>
      </div>
    </aside>
  );
}
