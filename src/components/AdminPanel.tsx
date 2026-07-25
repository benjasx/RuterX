import { useEffect, useState } from "react";
import GestionRutas from "./GestionRutas";
import PanelClientes from "./PanelClientes";
import PanelVendedores from "./PanelVendedores";
import SidebarAdmin, { type SubVistaAdmin } from "./SidebarAdmin";

import ReporteEmbarques from "./ReporteEmbarques";
import PanelHistorial from "./PanelHistorial";
import PanelHistorialCompleto from "./PanelHistorialCompleto";

// 🚀 IMPORTAMOS EL NUEVO COMPONENTE DE AJUSTES
import PanelAjustesNomina from "./PanelAjustesNomina";

import type { Vendedor as DatosVendedor } from "../types/index";
import { obtenerVendedoresFirebase } from "../firebase/vendedoresService";
import { obtenerClientesFirebase } from "../firebase/clientesService";
import { obtenerRutasFirebase } from "../firebase/rutasService";

interface AdminPanelProps {
  onLogout: () => void;
}

export default function AdminPanel({ onLogout }: AdminPanelProps) {
  const [menuActivo, setMenuActivo] = useState<SubVistaAdmin>("clientes");
  const [listaVendedores, setListaVendedores] = useState<DatosVendedor[]>([]);
  const [listaClientes, setListaClientes] = useState<any[]>([]);
  const [listaRutas, setListaRutas] = useState<any[]>([]);

  // Carga inicial de datos reales desde Firebase
  useEffect(() => {
    const cargarDatos = async () => {
      const [vendedores, clientes, rutas] = await Promise.all([
        obtenerVendedoresFirebase(),
        obtenerClientesFirebase(),
        obtenerRutasFirebase(),
      ]);

      setListaVendedores(vendedores);
      setListaClientes(clientes);
      setListaRutas(rutas);
    };

    cargarDatos();
  }, []);

  return (
    // Quitamos la clase relative y corregimos los paddings
    <div className="flex flex-col xl:flex-row items-start gap-5 w-full mt-10">
      {/* COMPONENTE DE NAVEGACIÓN (Se encarga de su propio ancho) */}
      <SidebarAdmin
        menuActivo={menuActivo}
        setMenuActivo={setMenuActivo}
        onLogout={onLogout}
      />

      {/* 🚀 CORRECCIÓN: Le quitamos el xl:ml-[280px] para que no empuje el contenido */}
      <div className="flex-1 w-full min-w-0">
        {menuActivo === "clientes" && (
          <PanelClientes
            vendedores={listaVendedores}
            listaClientes={listaClientes}
            setListaClientes={setListaClientes}
            rutas={listaRutas}
          />
        )}

        {menuActivo === "rutas" && (
          <GestionRutas listaRutas={listaRutas} setListaRutas={setListaRutas} />
        )}

        {menuActivo === "vendedores" && (
          <PanelVendedores
            listaVendedores={listaVendedores}
            setListaVendedores={setListaVendedores}
            rutas={listaRutas}
          />
        )}

        {menuActivo === "tablamontos" && <ReporteEmbarques />}

        {menuActivo === "historial" && <PanelHistorial />}

        {menuActivo === "historialCompleto" && <PanelHistorialCompleto />}

        {/* COMPONENTE DE NÓMINA */}
        {menuActivo === "ajustesNomina" && <PanelAjustesNomina />}
      </div>
    </div>
  );
}
