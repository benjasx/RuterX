import { useEffect, useState } from "react";
import GestionRutas from "./GestionRutas";
import PanelClientes from "./PanelClientes";
import PanelVendedores from "./PanelVendedores";
import SidebarAdmin, { type SubVistaAdmin } from "./SidebarAdmin";

import type { Vendedor as DatosVendedor } from "../types/index";
// Importamos tus servicios de Firebase
import { obtenerVendedoresFirebase } from "../firebase/vendedoresService";
import { obtenerClientesFirebase } from "../firebase/clientesService";
import { obtenerRutasFirebase } from "../firebase/rutasService";

interface AdminPanelProps {
  onLogout: () => void;
}

export default function AdminPanel({ onLogout }: AdminPanelProps) {
  // 1. Estados definidos (¡Aquí estaba el error! faltaba listaClientes)
  const [menuActivo, setMenuActivo] = useState<SubVistaAdmin>("clientes");
  const [listaVendedores, setListaVendedores] = useState<DatosVendedor[]>([]);
  const [listaClientes, setListaClientes] = useState<any[]>([]);
  const [listaRutas, setListaRutas] = useState<any[]>([]);

  // 2. Carga inicial de datos reales desde Firebase
  useEffect(() => {
    const cargarDatos = async () => {
      // 2. Cargamos las 3 colecciones a la vez
      const [vendedores, clientes, rutas] = await Promise.all([
        obtenerVendedoresFirebase(),
        obtenerClientesFirebase(),
        obtenerRutasFirebase(),
      ]);

      setListaVendedores(vendedores);
      setListaClientes(clientes);
      setListaRutas(rutas); // 3. Guardamos las rutas reales
    };

    cargarDatos();
  }, []);

  return (
    <div className="flex flex-col xl:flex-row items-start gap-5 w-full">
      {/* 1. COMPONENTE DE NAVEGACIÓN */}
      <SidebarAdmin
        menuActivo={menuActivo}
        setMenuActivo={setMenuActivo}
        onLogout={onLogout}
      />

      {/* 2. RENDERIZADO CONDICIONAL MODULAR */}
      {menuActivo === "clientes" && (
        <PanelClientes
          vendedores={listaVendedores}
          listaClientes={listaClientes}
          setListaClientes={setListaClientes}
          rutas={listaRutas}
        />
      )}

      {/* --- CAMBIO AQUÍ --- */}
      {menuActivo === "rutas" && (
        <GestionRutas listaRutas={listaRutas} setListaRutas={setListaRutas} />
      )}

      {menuActivo === "vendedores" && (
        <PanelVendedores
          listaVendedores={listaVendedores}
          setListaVendedores={setListaVendedores}
        />
      )}
    </div>
  );
}
