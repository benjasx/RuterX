import { useState, useEffect } from "react";
import Navbar, { type Vista } from "./components/Navbar";
import AdminPanel from "./components/AdminPanel";
import MapaRutero from "./components/MapaRutero";
import Login from "./components/Login";

import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { auth } from "./firebase/config";
import { Loader2 } from "lucide-react";

// 🚀 AQUÍ DEFINES TU CORREO DE ADMINISTRADOR
// (Solo este correo tendrá acceso a los botones de edición)
const CORREO_ADMIN = "admin@ruterx.com";

export default function RuterMapas() {
  const [vistaActual, setVistaActual] = useState<Vista>(() => {
    if (typeof window !== "undefined") {
      const guardado = localStorage.getItem("vistaActual");
      return (guardado as Vista) || "rutero";
    }
    return "rutero";
  });

  const [usuarioActual, setUsuarioActual] = useState<User | null>(null);
  const [cargandoSesion, setCargandoSesion] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUsuarioActual(user);

      // Si entra un chofer, lo forzamos siempre a la vista de rutero (mapa)
      if (user && user.email !== CORREO_ADMIN) {
        setVistaActual("rutero");
      }

      setCargandoSesion(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    localStorage.setItem("vistaActual", vistaActual);
  }, [vistaActual]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setVistaActual("rutero");
    } catch (error) {
      console.error("Error al cerrar sesión", error);
    }
  };

  if (cargandoSesion) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <Loader2 size={40} className="animate-spin text-blue-600 mb-4" />
        <h2 className="text-xl font-bold text-slate-800">Cargando RuterX...</h2>
      </div>
    );
  }

  if (!usuarioActual) {
    return <Login />;
  }

  // 🚀 Comprobamos si el usuario actual es el administrador
  const esAdmin = usuarioActual.email === CORREO_ADMIN;

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col">
      <Navbar
        vistaActual={vistaActual}
        setVistaActual={setVistaActual}
        usuarioEmail={usuarioActual.email}
        onLogout={handleLogout}
        esAdmin={esAdmin} // 🚀 Le pasamos este "poder" al Navbar
      />

      <main className="w-full flex-1 overflow-hidden flex">
        {/* Si intentan ir a admin pero no son admin, los bloqueamos y forzamos el mapa */}
        {vistaActual === "admin" && esAdmin ? (
          <AdminPanel onLogout={handleLogout} />
        ) : (
          <MapaRutero esAdmin={esAdmin} />
        )}
      </main>
    </div>
  );
}
