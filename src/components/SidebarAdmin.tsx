import { Users, Map, Briefcase, LogOut } from "lucide-react";

// Exportamos el tipo para poder usarlo en el Panel Principal
export type SubVistaAdmin = "clientes" | "rutas" | "vendedores";

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
        <ul className="space-y-2">
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
        </ul>
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
