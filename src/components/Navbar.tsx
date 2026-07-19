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
    <nav className="bg-white border-b px-6 py-4 flex justify-between items-center shadow-sm">
      {/* Sección Izquierda: Logo y Título */}
      <div className="flex items-center gap-3">
        {/* Placeholder para tu logo */}
        <div className="w-10 h-10 bg-slate-200 rounded-lg flex items-center justify-center overflow-hidden relative">
          {/* Instrucción: Cuando tengas tu logo, ponlo en la carpeta "public" y cambia el src a "/tu-logo.png" */}
          <img
            src="https://avatars.githubusercontent.com/u/62582879?v=4&size=64"
            alt="Logo RutaSmart"
            className="w-full h-full object-cover z-10 relative"
            onError={(e) => {
              // Esto oculta la imagen rota si el archivo aún no existe
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
          <span className="text-slate-400 text-xs absolute font-medium">
            Logo
          </span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
          RuterX
        </h1>
      </div>

      {/* Sección Derecha: Botones de Navegación */}
      <div className="flex bg-slate-100 p-1 rounded-lg">
        <button
          onClick={() => setVistaActual("admin")}
          className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all text-sm font-medium ${
            vistaActual === "admin"
              ? "bg-slate-900 text-white shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <UserPlus size={18} />
          Admin Panel
        </button>
        <button
          onClick={() => setVistaActual("rutero")}
          className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all text-sm font-medium ${
            vistaActual === "rutero"
              ? "bg-slate-900 text-white shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <MapIcon size={18} />
          Rutero
        </button>
      </div>
    </nav>
  );
}
