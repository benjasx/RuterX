import { useQuery } from "@tanstack/react-query";
import GestionRutas from "./GestionRutas";
import PanelClientes from "./PanelClientes";
import PanelVendedores from "./PanelVendedores";
import type { SubVistaAdmin } from "./SidebarAdmin";

import PanelHistorial from "./PanelHistorial";
import PanelHistorialCompleto from "./PanelHistorialCompleto";
import PanelAjustesNomina from "./PanelAjustesNomina";
import Dashboard from "./Dashboard";
import AdminChoferes from "./AdminChoferes";
import AdminUnidades from "./AdminUnidades";
import PanelRentabilidad from "./PanelRentabilidad";
import MonitorRutas from "./MonitorRutas";
import PanelDistribucion from "./PanelDistribucion";
import PanelRespaldo from "./PanelRespaldo";
import GestionUsuarios from "./GestionUsuarios";
import AltasClientes from "./AltasClientes";

// 🚀 Importamos el nuevo componente de Control de Asistencia
import PanelAsistencia from "./PanelAsistencia";

import { obtenerVendedoresFirebase } from "../firebase/vendedoresService";
import { obtenerClientesFirebase } from "../firebase/clientesService";
import { obtenerRutasFirebase } from "../firebase/rutasService";
import { esAdmin } from "../utils/roles";

interface AdminPanelProps {
  menuActivo: SubVistaAdmin;
  usuarioEmail: string | null;
}

export default function AdminPanel({
  menuActivo,
  usuarioEmail,
}: AdminPanelProps) {
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
    <div className="w-full h-full p-4 sm:p-6">
      {menuActivo === "dashboard" && <Dashboard />}

      {menuActivo === "monitorRutas" && <MonitorRutas />}

      {menuActivo === "distribucion" && <PanelDistribucion />}

      {/* 🚀 Renderizamos el Control de Asistencia */}
      {menuActivo === "asistencias" && <PanelAsistencia />}

      {menuActivo === "altasClientes" && (
        <AltasClientes
          esAdmin={esAdmin(usuarioEmail)}
          usuarioEmail={usuarioEmail ?? ""}
        />
      )}

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

      {menuActivo === "historial" && <PanelHistorial />}

      {menuActivo === "historialCompleto" && <PanelHistorialCompleto />}

      {menuActivo === "ajustesNomina" && <PanelAjustesNomina />}

      {menuActivo === "choferes" && <AdminChoferes />}

      {menuActivo === "unidades" && <AdminUnidades />}

      {menuActivo === "rentabilidad" && <PanelRentabilidad />}

      {menuActivo === "respaldo" && (
        <PanelRespaldo usuarioEmail={usuarioEmail} />
      )}

      {menuActivo === "usuarios" && (
        <GestionUsuarios usuarioEmail={usuarioEmail} />
      )}
    </div>
  );
}
