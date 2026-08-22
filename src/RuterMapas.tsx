import { useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Navbar, { type Vista } from "./components/Navbar";
import AdminPanel from "./components/AdminPanel";
import MapaRutero from "./components/MapaRutero";
import Login from "./components/Login";

import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { auth, db } from "./firebase/config";
import { Loader2 } from "lucide-react";
import {
  esAdmin,
  esJefeReparto as checkEsJefeReparto,
  esPersonalAutorizado as checkEsPersonalAutorizado,
  setRolDinamico,
  type RolUsuario,
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
  const [mensajeSesion, setMensajeSesion] = useState("");

  const MENSAJE_CUENTA_DESHABILITADA =
    "Tu cuenta fue deshabilitada. Comunícate con el administrador.";

  useEffect(() => {
    // Escucha en vivo del doc "usuarios/{uid}" del usuario logueado: si el admin
    // lo deshabilita mientras tiene la sesión abierta, lo expulsamos al instante.
    let unsubUsuario: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (unsubUsuario) {
        unsubUsuario();
        unsubUsuario = null;
      }

      if (user) {
        // Resolvemos el rol asignado desde "Gestión de Usuarios" (si existe) antes
        // de decidir la vista inicial, y respetamos si la cuenta fue deshabilitada.
        try {
          const snap = await getDoc(doc(db, "usuarios", user.uid));
          const datos = snap.exists()
            ? (snap.data() as { role?: RolUsuario; activo?: boolean })
            : null;

          if (datos?.activo === false) {
            setMensajeSesion(MENSAJE_CUENTA_DESHABILITADA);
            await signOut(auth);
            setUsuarioActual(null);
            setCargandoSesion(false);
            return;
          }

          setMensajeSesion("");
          setRolDinamico(user.email, datos?.role ?? null);
        } catch (error) {
          console.error("Error al resolver el rol del usuario:", error);
          setRolDinamico(null, null);
        }

        unsubUsuario = onSnapshot(doc(db, "usuarios", user.uid), (snap) => {
          const datos = snap.data() as { activo?: boolean } | undefined;
          if (datos?.activo === false) {
            setMensajeSesion(MENSAJE_CUENTA_DESHABILITADA);
            signOut(auth);
          }
        });
      } else {
        setRolDinamico(null, null);
      }

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

    return () => {
      unsubscribeAuth();
      if (unsubUsuario) unsubUsuario();
    };
  }, []);

  useEffect(() => {
    localStorage.setItem("vistaActual", vistaActual);
  }, [vistaActual]);

  const handleLogout = async () => {
    try {
      setMensajeSesion("");
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
        <Login mensajeInicial={mensajeSesion} />
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
