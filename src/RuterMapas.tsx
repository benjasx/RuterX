import { useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Navbar, { type Vista } from "./components/Navbar";
import AdminPanel from "./components/AdminPanel";
import MapaRutero from "./components/MapaRutero";
import Login from "./components/Login";

import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { auth } from "./firebase/config";
import { Loader2 } from "lucide-react";
import {
  esAdmin,
  esJefeReparto as checkEsJefeReparto,
  esPersonalAutorizado as checkEsPersonalAutorizado,
} from "./utils/roles";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
      staleTime: 1000 * 60 * 60 * 24,
      gcTime: 1000 * 60 * 60 * 24,
    },
  },
});

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

      if (user) {
        if (esAdmin(user.email) || checkEsJefeReparto(user.email)) {
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

  const esAdminPrincipal = esAdmin(usuarioActual?.email);
  const esJefeRepartoActual = checkEsJefeReparto(usuarioActual?.email);
  const esPersonalAutorizado = checkEsPersonalAutorizado(usuarioActual?.email);

  return (
    <QueryClientProvider client={queryClient}>
      {cargandoSesion ? (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center">
          <Loader2 size={40} className="animate-spin text-blue-600 mb-4" />
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
            Cargando RuterX...
          </h2>
        </div>
      ) : !usuarioActual ? (
        <Login />
      ) : (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans flex flex-col">
          <Navbar
            vistaActual={vistaActual}
            setVistaActual={setVistaActual}
            usuarioEmail={usuarioActual.email}
            onLogout={handleLogout}
            esAdmin={esAdminPrincipal}
            esPersonalAutorizado={esPersonalAutorizado}
            esJefeReparto={esJefeRepartoActual} // 🚀 Pasamos esta validación para ocultar el botón
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
