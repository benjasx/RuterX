import { useState } from "react";
import { useQuery } from "@tanstack/react-query"; // 🚀 IMPORTAMOS TANSTACK QUERY
import GestionRutas from "./GestionRutas";
import PanelClientes from "./PanelClientes";
import PanelVendedores from "./PanelVendedores";
import SidebarAdmin, { type SubVistaAdmin } from "./SidebarAdmin";

import ReporteEmbarques from "./ReporteEmbarques";
import PanelHistorial from "./PanelHistorial";
import PanelHistorialCompleto from "./PanelHistorialCompleto";
import PanelAjustesNomina from "./PanelAjustesNomina";
import Dashboard from "./Dashboard";

import { obtenerVendedoresFirebase } from "../firebase/vendedoresService";
import { obtenerClientesFirebase } from "../firebase/clientesService";
import { obtenerRutasFirebase } from "../firebase/rutasService";
import AdminChoferes from "./AdminChoferes";

interface AdminPanelProps {
  onLogout: () => void;
}

export default function AdminPanel({ onLogout }: AdminPanelProps) {
  const [menuActivo, setMenuActivo] = useState<SubVistaAdmin>("dashboard");

  // 🚀 CARGAMOS LOS CATÁLOGOS CON CACHÉ GLOBAL DE TANSTACK QUERY
  // Estos se descargan 1 sola vez y se comparten con toda la app instantáneamente
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

  // Mantenemos esta función auxiliar por compatibilidad con los estados locales de los paneles
  const setListaClientesDummy = () => {
    refetchClientes();
  };

  const setListaVendedoresDummy = () => {
    // Se actualiza automáticamente vía caché invalidateQueries
  };

  const setListaRutasDummy = () => {
    // Se actualiza automáticamente vía caché invalidateQueries
  };

  return (
    <div className="flex flex-col xl:flex-row items-start gap-5 w-full mt-10">
      <SidebarAdmin
        menuActivo={menuActivo}
        setMenuActivo={setMenuActivo}
        onLogout={onLogout}
      />

      <div className="flex-1 w-full min-w-0">
        {menuActivo === "dashboard" && <Dashboard />}

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
      </div>
    </div>
  );
}
