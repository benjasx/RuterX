import {
  Users,
  Map,
  Briefcase,
  LogOut,
  Calculator,
  History,
  ClipboardList,
  Settings, // <-- 1. Importamos el icono de configuración
} from "lucide-react";

// 2. Agregamos "ajustesNomina" a los tipos permitidos
export type SubVistaAdmin =
  | "clientes"
  | "rutas"
  | "vendedores"
  | "tablamontos"
  | "historial"
  | "historialCompleto"
  | "ajustesNomina";

interface SidebarAdminProps {
  menuActivo: SubVistaAdmin;
  setMenuActivo: (vista: SubVistaAdmin) => void;
  onLogout: () => void;
}

export default function SidebarAdmin({
  menuActivo,
  setMenuActivo,
  onLogout,
}: SidebarAdminProps) {
  return (
    <aside className="w-full xl:w-62.5 shrink-0 bg-white rounded-xl shadow-sm border border-slate-100 flex flex-col justify-between p-4">
      <div>
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 px-3">
          Opciones
        </h3>
        <ul className="space-y-2 mb-2">
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
        </ul>

        {/* BOTÓN PARA EL HISTORIAL */}
        <button
          onClick={() => setMenuActivo("historial")}
          className={`flex items-center gap-3 w-full p-3 rounded-xl font-semibold transition-all duration-300 mb-1 ${
            menuActivo === "historial"
              ? "bg-blue-50 text-blue-700 shadow-sm border border-blue-100"
              : "text-slate-600 hover:bg-slate-50 hover:text-blue-600"
          }`}
        >
          <History size={20} />
          <span>Equidad Choferes</span>
        </button>

        {/* BOTÓN: HISTORIAL COMPLETO DE RUTAS */}
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

        {/* 🚀 3. NUEVO BOTÓN: AJUSTES DE NÓMINA Y VIÁTICOS */}
        <button
          onClick={() => setMenuActivo("ajustesNomina")}
          className={`flex items-center gap-3 w-full p-3 rounded-xl font-semibold transition-all duration-300 mt-2 ${
            menuActivo === "ajustesNomina"
              ? "bg-blue-50 text-blue-700 shadow-sm border border-blue-100"
              : "text-slate-600 hover:bg-slate-50 hover:text-blue-600"
          }`}
        >
          <Settings size={20} />
          <span>Reglas de viaticos</span>
        </button>
      </div>

      <div>
        <div className="h-px bg-slate-100 w-full mb-4"></div>
        <button
          onClick={() => {
            alert("Cerrando sesión de administrador...");
            onLogout();
          }}
          className="flex items-center w-full gap-3 px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-50 rounded-xl transition-colors mt-auto"
        >
          <LogOut size={18} /> Cerrar Sesión
        </button>
      </div>
    </aside>
  );
}
