import { UserPlus, Map as MapIcon } from "lucide-react";

// Definimos los tipos para las vistas permitidas
export type Vista = "admin" | "rutero";

// Definimos las propiedades (props) que recibirá el Navbar
interface NavbarProps {
  vistaActual: Vista;
  setVistaActual: (vista: Vista) => void;
}

export default function Navbar({ vistaActual, setVistaActual }: NavbarProps) {
  return (
    <nav className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex justify-between items-center shadow-lg transition-all duration-300">
      {/* Sección Izquierda: Logo y Título */}
      <div className="flex items-center gap-4 group cursor-pointer">
        {/* Logo más grande (w-12 h-12) y con animación hover */}
        <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center overflow-hidden relative shadow-inner transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3">
          <img
            src="https://avatars.githubusercontent.com/u/62582879?v=4&size=64"
            alt="Logo RutaSmart"
            className="w-full h-full object-cover z-10 relative transition-transform duration-300"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
          <span className="text-slate-500 text-xs absolute font-medium">
            Logo
          </span>
        </div>

        {/* Título con un degradado sutil que se ilumina al pasar el mouse */}
        <h1 className="text-2xl font-extrabold text-transparent bg-clip-text bg-linear-to-r from-white to-slate-400 tracking-tight transition-all duration-300 group-hover:to-blue-400">
          RuterX
        </h1>
      </div>

      {/* Sección Derecha: Botones de Navegación */}
      <div className="flex bg-slate-800/80 p-1.5 rounded-xl shadow-inner relative ring-1 ring-slate-700/50">
        <button
          onClick={() => setVistaActual("admin")}
          className={`cursor-pointer flex items-center gap-2 px-5 py-2.5 rounded-lg transition-all duration-300 ease-out active:scale-95 text-sm font-semibold ${
            vistaActual === "admin"
              ? "bg-blue-600 text-white shadow-md shadow-blue-900/40"
              : "text-slate-400 hover:text-white hover:bg-slate-700/60"
          }`}
        >
          <UserPlus
            size={18}
            className={`transition-transform duration-300 ${vistaActual === "admin" ? "scale-110" : ""}`}
          />
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
          <MapIcon
            size={18}
            className={`transition-transform duration-300 ${vistaActual === "rutero" ? "scale-110" : ""}`}
          />
          Rutero
        </button>
      </div>
    </nav>
  );
}
