import { useState, useEffect } from "react";
import Navbar, { type Vista } from "./components/Navbar"; // Asegura la ruta
import AdminPanel from "./components/AdminPanel";
import MapaRutero from "./components/MapaRutero";

export default function RuterMapas() {
  // Inicializamos leyendo de localStorage. Si no hay nada guardado, iniciamos en 'rutero'
  const [vistaActual, setVistaActual] = useState<Vista>(() => {
    // Verificamos si estamos en el navegador para evitar errores en SSR
    if (typeof window !== "undefined") {
      const guardado = localStorage.getItem("vistaActual");
      return (guardado as Vista) || "rutero";
    }
    return "rutero";
  });

  // Guardamos en localStorage cada vez que el usuario cambie de vista
  useEffect(() => {
    localStorage.setItem("vistaActual", vistaActual);
  }, [vistaActual]);

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col">
      {/* Pasamos el estado y el setter al Navbar */}
      <Navbar vistaActual={vistaActual} setVistaActual={setVistaActual} />

      <main className="w-full flex-1 overflow-hidden">
        {vistaActual === "admin" ? <AdminPanel /> : <MapaRutero />}
      </main>
    </div>
  );
}
