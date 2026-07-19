import { useState, useEffect } from "react";
import Navbar, { type Vista } from "./components/Navbar";
import AdminPanel from "./components/AdminPanel";
import MapaRutero from "./components/MapaRutero";
import { Lock } from "lucide-react";

export default function RuterMapas() {
  // 1. Estado para saber en qué vista estamos (Rutero o Admin)
  const [vistaActual, setVistaActual] = useState<Vista>(() => {
    if (typeof window !== "undefined") {
      const guardado = localStorage.getItem("vistaActual");
      return (guardado as Vista) || "rutero";
    }
    return "rutero";
  });

  // 2. Estado para proteger el Admin Panel
  const [estaAutenticado, setEstaAutenticado] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      // Usamos sessionStorage para que la sesión muera al cerrar la pestaña
      return sessionStorage.getItem("adminAuth") === "true";
    }
    return false;
  });

  const [passwordInput, setPasswordInput] = useState("");
  const [errorPassword, setErrorPassword] = useState(false);

  // Guarda la vista actual al cambiar de pestaña
  useEffect(() => {
    localStorage.setItem("vistaActual", vistaActual);
  }, [vistaActual]);

  // Función para validar la contraseña
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();

    // AQUÍ DEFINES TU CONTRASEÑA (Ejemplo: "admin123")
    if (passwordInput === "benjasx98") {
      setEstaAutenticado(true);
      sessionStorage.setItem("adminAuth", "true");
      setErrorPassword(false);
      setPasswordInput("");
    } else {
      setErrorPassword(true);
      setPasswordInput(""); // Limpia el input si falla
    }
  };

  const handleLogout = () => {
    // 1. Cambiamos el estado a falso
    setEstaAutenticado(false);
    // 2. Borramos la sesión del navegador
    sessionStorage.removeItem("adminAuth");
    // 3. (Opcional pero recomendado) Devolvemos al usuario a la vista del mapa
    setVistaActual("rutero");
  };

  // Función que decide qué mostrar cuando intentan entrar al admin
  const renderAreaAdmin = () => {
    if (estaAutenticado) {
      // Si ya puso la clave, mostramos tu panel de administración real
      return <AdminPanel onLogout={handleLogout} />;
    }

    // Si NO ha puesto la clave, le mostramos la pantalla de bloqueo
    return (
      <div className="flex w-full h-full items-center justify-center bg-slate-50 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 max-w-sm w-full">
          <div className="flex flex-col items-center mb-6 text-center">
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4">
              <Lock size={24} />
            </div>
            <h2 className="text-xl font-bold text-slate-800">
              Acceso Restringido
            </h2>
            <p className="text-sm text-slate-500 mt-2">
              Ingresa la contraseña maestra para administrar los clientes y
              rutas de RuterX.
            </p>
          </div>

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div>
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => {
                  setPasswordInput(e.target.value);
                  setErrorPassword(false); // Quita el error al escribir de nuevo
                }}
                placeholder="Contraseña"
                autoFocus
                className={`w-full p-3 border rounded-xl focus:outline-none focus:ring-2 transition-all ${
                  errorPassword
                    ? "border-red-300 focus:ring-red-200 bg-red-50"
                    : "border-slate-200 focus:ring-blue-500 focus:border-blue-500 bg-slate-50"
                }`}
              />
              {errorPassword && (
                <span className="text-xs text-red-500 mt-1 ml-1 font-medium">
                  Contraseña incorrecta, intenta de nuevo.
                </span>
              )}
            </div>
            <button
              type="submit"
              className="w-full bg-slate-900 text-white font-semibold p-3 rounded-xl hover:bg-slate-800 transition-colors"
            >
              Desbloquear Panel
            </button>
          </form>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col">
      <Navbar vistaActual={vistaActual} setVistaActual={setVistaActual} />

      <main className="w-full flex-1 overflow-hidden flex">
        {/* Lógica de enrutamiento principal */}
        {vistaActual === "admin" ? renderAreaAdmin() : <MapaRutero />}
      </main>
    </div>
  );
}
