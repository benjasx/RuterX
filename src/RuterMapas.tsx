import { useState, useEffect, useRef } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Navbar, { type Vista } from "./components/Navbar";
import AdminPanel from "./components/AdminPanel";
import SidebarAdmin, { type SubVistaAdmin } from "./components/SidebarAdmin";
import MapaRutero from "./components/MapaRutero";
import Login from "./components/Login";
import Notificaciones from "./components/Notificaciones";

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

  // 🚀 Sub-vista del Panel Administrativo: vive aquí (y no dentro de
  // AdminPanel) porque el sidebar ahora es parte del shell general, visible
  // también desde la vista Rutero.
  const [menuActivo, setMenuActivo] = useState<SubVistaAdmin>(() => {
    const guardado = localStorage.getItem("menuActivoAdmin") as SubVistaAdmin | null;
    return guardado || "dashboard";
  });
  const [sidebarAbierto, setSidebarAbierto] = useState(false);
  // 🚀 Colapsar el sidebar en escritorio (útil en el Rutero, donde el panel
  // de clientes + el mapa ya compiten por ancho).
  const [sidebarColapsado, setSidebarColapsado] = useState(false);

  useEffect(() => {
    localStorage.setItem("menuActivoAdmin", menuActivo);
  }, [menuActivo]);

  const MENSAJE_CUENTA_DESHABILITADA =
    "Tu cuenta fue deshabilitada. Comunícate con el administrador.";

  // 🚀 onAuthStateChanged se dispara tanto en un login real como al restaurar
  // la sesión en un refresh de página. Solo queremos forzar la vista inicial
  // (admin/rutero + sub-vista) en el primer caso; en un refresh respetamos lo
  // que ya había guardado en localStorage.
  const esPrimeraResolucionRef = useRef(true);

  useEffect(() => {
    // Escucha en vivo del doc "usuarios/{uid}" del usuario logueado: si el admin
    // lo deshabilita mientras tiene la sesión abierta, lo expulsamos al instante.
    let unsubUsuario: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      const esRefrescoDeSesion = esPrimeraResolucionRef.current;
      esPrimeraResolucionRef.current = false;

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

      if (user && !esRefrescoDeSesion) {
        if (esAdmin(user.email) || checkEsJefeReparto(user.email)) {
          // 🚀 ADMIN Y JEFE DE REPARTO inician forzosamente en el Panel Administrativo
          setVistaActual("admin");
        } else {
          // 🚀 EMBARQUES Y CHOFERES inician en el Mapa (Rutero)
          setVistaActual("rutero");
        }

        // Si no hay una sub-vista guardada de una sesión previa, entra al
        // Dashboard (Admin) o al Monitor de Rutas (Jefe/Embarques).
        if (!localStorage.getItem("menuActivoAdmin")) {
          setMenuActivo(esAdmin(user.email) ? "dashboard" : "monitorRutas");
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

  const esJefeRepartoActual = checkEsJefeReparto(usuarioActual?.email);
  const esPersonalAutorizado = checkEsPersonalAutorizado(usuarioActual?.email);

  const irASubVista = (vista: SubVistaAdmin) => {
    setMenuActivo(vista);
    setVistaActual("admin");
    setSidebarAbierto(false);
  };

  const irARutero = () => {
    setVistaActual("rutero");
    setSidebarAbierto(false);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <Notificaciones />
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
        <div className="h-screen bg-slate-50 dark:bg-slate-950 font-sans flex overflow-hidden">
          <SidebarAdmin
            vistaActual={vistaActual}
            menuActivo={menuActivo}
            onSeleccionarVista={irASubVista}
            onIrARutero={irARutero}
            abierto={sidebarAbierto}
            onCerrar={() => setSidebarAbierto(false)}
            colapsado={sidebarColapsado}
            usuarioEmail={usuarioActual.email}
            onLogout={handleLogout}
            esPersonalAutorizado={esPersonalAutorizado}
            esJefeReparto={esJefeRepartoActual}
          />

          {sidebarAbierto && (
            <div
              className="fixed inset-0 bg-black/40 z-30 xl:hidden"
              onClick={() => setSidebarAbierto(false)}
            />
          )}

          <div className="flex-1 min-w-0 flex flex-col">
            <Navbar
              usuarioEmail={usuarioActual.email}
              onLogout={handleLogout}
              onToggleSidebar={() => setSidebarAbierto(true)}
              sidebarColapsado={sidebarColapsado}
              onToggleColapsarSidebar={() => setSidebarColapsado((v) => !v)}
            />

            <main className="flex-1 min-h-0 overflow-y-auto">
              {vistaActual === "admin" && esPersonalAutorizado ? (
                <AdminPanel
                  menuActivo={menuActivo}
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
        </div>
      )}
    </QueryClientProvider>
  );
}
