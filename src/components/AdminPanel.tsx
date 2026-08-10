import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import GestionRutas from "./GestionRutas";
import PanelClientes from "./PanelClientes";
import PanelVendedores from "./PanelVendedores";
import SidebarAdmin, { type SubVistaAdmin } from "./SidebarAdmin";

import ReporteEmbarques from "./ReporteEmbarques";
import PanelHistorial from "./PanelHistorial";
import PanelHistorialCompleto from "./PanelHistorialCompleto";
import PanelAjustesNomina from "./PanelAjustesNomina";
import Dashboard from "./Dashboard";
import AdminChoferes from "./AdminChoferes";

// 🚀 Importamos el nuevo componente
import MonitorRutas from "./MonitorRutas";

import { obtenerVendedoresFirebase } from "../firebase/vendedoresService";
import { obtenerClientesFirebase } from "../firebase/clientesService";
import { obtenerRutasFirebase } from "../firebase/rutasService";
import PanelDistribucion from "./PanelDistribucion";

// 🚀 Recibimos el usuarioEmail desde App.tsx para pasarlo al Sidebar
interface AdminPanelProps {
  onLogout: () => void;
  usuarioEmail: string | null;
}

export default function AdminPanel({
  onLogout,
  usuarioEmail,
}: AdminPanelProps) {
  // Si el que entra es el jefe, lo mandamos directo al monitor por defecto
  const esJefeReparto = usuarioEmail === "jefedereparto@ruterx.com";
  const [menuActivo, setMenuActivo] = useState<SubVistaAdmin>(
    esJefeReparto ? "monitorRutas" : "dashboard",
  );

  const { data: listaVendedores = [] } = useQuery({
    queryKey: ["vendedores"],
    queryFn: obtenerVendedoresFirebase,
  });

  const { data: listaClientes = [], refetch: refetchClientes } = useQuery({
    queryKey: ["clientes"],
    queryFn: obtenerClientesFirebase,
  });

  const { data: listaRutas = [] } = useQuery({
    queryKey: ["rutas"],
    queryFn: obtenerRutasFirebase,
  });

  const setListaClientesDummy = () => {
    refetchClientes();
  };
  const setListaVendedoresDummy = () => {};
  const setListaRutasDummy = () => {};

  return (
    <div className="flex flex-col xl:flex-row items-start gap-5 w-full mt-10">
      <SidebarAdmin
        menuActivo={menuActivo}
        setMenuActivo={setMenuActivo}
        onLogout={onLogout}
        usuarioEmail={usuarioEmail} // 🚀 Le pasamos el correo al menú
      />

      <div className="flex-1 w-full min-w-0">
        {menuActivo === "dashboard" && <Dashboard />}

        {/* 🚀 Renderizamos el Monitor de Rutas */}
        {menuActivo === "monitorRutas" && <MonitorRutas />}

        {menuActivo === "clientes" && (
          <PanelClientes
            vendedores={listaVendedores}
            listaClientes={listaClientes}
            setListaClientes={setListaClientesDummy}
            rutas={listaRutas}
          />
        )}

        {menuActivo === "rutas" && (
          <GestionRutas
            listaRutas={listaRutas}
            setListaRutas={setListaRutasDummy}
          />
        )}

        {menuActivo === "vendedores" && (
          <PanelVendedores
            listaVendedores={listaVendedores}
            setListaVendedores={setListaVendedoresDummy}
            rutas={listaRutas}
          />
        )}

        {menuActivo === "tablamontos" && <ReporteEmbarques />}

        {menuActivo === "historial" && <PanelHistorial />}

        {menuActivo === "historialCompleto" && <PanelHistorialCompleto />}

        {menuActivo === "ajustesNomina" && <PanelAjustesNomina />}

        {menuActivo === "choferes" && <AdminChoferes />}

        {menuActivo === "distribucion" && <PanelDistribucion />}
      </div>
    </div>
  );
}
