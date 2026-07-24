import { useEffect, useState } from "react";
import GestionRutas from "./GestionRutas";
import PanelClientes from "./PanelClientes";
import PanelVendedores from "./PanelVendedores";
import SidebarAdmin, { type SubVistaAdmin } from "./SidebarAdmin";

// --- 1. IMPORTAMOS EL NUEVO COMPONENTE ---
import ReporteEmbarques from "./ReporteEmbarques";

import type { Vendedor as DatosVendedor } from "../types/index";
// Importamos tus servicios de Firebase
import { obtenerVendedoresFirebase } from "../firebase/vendedoresService";
import { obtenerClientesFirebase } from "../firebase/clientesService";
import { obtenerRutasFirebase } from "../firebase/rutasService";
import PanelHistorial from "./PanelHistorial";
import PanelHistorialCompleto from "./PanelHistorialCompleto";

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
    <div className="flex flex-col xl:flex-row items-start gap-5 w-full mt-10">
      {/* COMPONENTE DE NAVEGACIÓN */}
      <SidebarAdmin
        menuActivo={menuActivo}
        setMenuActivo={setMenuActivo}
        onLogout={onLogout}
      />

      {/* RENDERIZADO CONDICIONAL MODULAR */}
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

      {/* --- 2. COLOCAMOS EL COMPONENTE CORRECTO AQUÍ --- */}
      {menuActivo === "tablamontos" && <ReporteEmbarques rutas={listaRutas} />}

      {menuActivo === "historial" && <PanelHistorial />}
      {menuActivo === "historialCompleto" && <PanelHistorialCompleto />}
    </div>
  );
}
