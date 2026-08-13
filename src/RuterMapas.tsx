import { useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Navbar, { type Vista } from "./components/Navbar";
import AdminPanel from "./components/AdminPanel";
import MapaRutero from "./components/MapaRutero";
import Login from "./components/Login";

import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { auth } from "./firebase/config";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
      staleTime: 1000 * 60 * 60 * 24,
    },
  },
});

const CORREO_ADMIN = "admin@ruterx.com";
const CORREO_JEFE_REPARTO = "jefedereparto@ruterx.com";
const CORREO_EMBARQUES_1 = "emb01@ruterx.com";
const CORREO_EMBARQUES_2 = "emb02@ruterx.com";

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

  const checkEsPersonalAutorizado = (email: string | null | undefined) => {
    if (!email) return false;
    return (
      email === CORREO_ADMIN ||
      email === CORREO_JEFE_REPARTO ||
      email === CORREO_EMBARQUES_1 ||
      email === CORREO_EMBARQUES_2
    );
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUsuarioActual(user);

      if (user) {
        if (user.email === CORREO_ADMIN || user.email === CORREO_JEFE_REPARTO) {
          // 🚀 ADMIN Y JEFE DE REPARTO inician forzosamente en el Panel Administrativo
          setVistaActual("admin");
        } else {
          // 🚀 EMBARQUES Y CHOFERES inician en el Mapa (Rutero)
          setVistaActual("rutero");
        }
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

  const esAdminPrincipal = usuarioActual?.email === CORREO_ADMIN;
  const esJefeReparto = usuarioActual?.email === CORREO_JEFE_REPARTO;
  const esPersonalAutorizado = checkEsPersonalAutorizado(usuarioActual?.email);

  return (
    <QueryClientProvider client={queryClient}>
      {cargandoSesion ? (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
          <Loader2 size={40} className="animate-spin text-blue-600 mb-4" />
          <h2 className="text-xl font-bold text-slate-800">
            Cargando RuterX...
          </h2>
        </div>
      ) : !usuarioActual ? (
        <Login />
      ) : (
        <div className="min-h-screen bg-slate-50 font-sans flex flex-col">
          <Navbar
            vistaActual={vistaActual}
            setVistaActual={setVistaActual}
            usuarioEmail={usuarioActual.email}
            onLogout={handleLogout}
            esAdmin={esAdminPrincipal}
            esPersonalAutorizado={esPersonalAutorizado}
            esJefeReparto={esJefeReparto} // 🚀 Pasamos esta validación para ocultar el botón
          />

          <main className="w-full flex-1 overflow-hidden flex">
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
      )}
    </QueryClientProvider>
  );
}
