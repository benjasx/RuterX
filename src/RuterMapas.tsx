import { useState, useEffect } from "react";
import Navbar, { type Vista } from "./components/Navbar";
import AdminPanel from "./components/AdminPanel";
import MapaRutero from "./components/MapaRutero";
import Login from "./components/Login";

import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { auth } from "./firebase/config";
import { Loader2 } from "lucide-react";

// 🚀 CORREOS AUTORIZADOS PARA EL PANEL DE ADMINISTRACIÓN / OPERACIÓN
const CORREO_ADMIN = "admin@ruterx.com";
const CORREO_JEFE_REPARTO = "jefedereparto@ruterx.com";

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

      // Si entra un chofer normal (que no es admin ni jefe), lo forzamos siempre al mapa
      if (
        user &&
        user.email !== CORREO_ADMIN &&
        user.email !== CORREO_JEFE_REPARTO
      ) {
        setVistaActual("rutero");
      } else if (
        user &&
        user.email === CORREO_JEFE_REPARTO &&
        vistaActual === "rutero"
      ) {
        // Opcional: si entra el jefe de reparto, podemos mandarlo directo a "admin" si está en rutero
        setVistaActual("admin");
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

  // 🚀 Verificamos roles
  const esAdminPrincipal = usuarioActual.email === CORREO_ADMIN;
  const esPersonalAutorizado =
    usuarioActual.email === CORREO_ADMIN ||
    usuarioActual.email === CORREO_JEFE_REPARTO;

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col">
      <Navbar
        vistaActual={vistaActual}
        setVistaActual={setVistaActual}
        usuarioEmail={usuarioActual.email}
        onLogout={handleLogout}
        esAdmin={esAdminPrincipal}
      />

      <main className="w-full flex-1 overflow-hidden flex">
        {/* Si intentan ir a admin y son admin o jefe de reparto, les abrimos el AdminPanel */}
        {vistaActual === "admin" && esPersonalAutorizado ? (
          <AdminPanel
            onLogout={handleLogout}
            usuarioEmail={usuarioActual.email}
          />
        ) : (
          <MapaRutero
            esAdmin={esPersonalAutorizado}
            usuarioEmail={usuarioActual.email}
          />
        )}
      </main>
    </div>
  );
}
