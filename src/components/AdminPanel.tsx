import { useState } from "react";
import GestionRutas from "./GestionRutas";
import PanelClientes from "./PanelClientes";
import PanelVendedores from "./PanelVendedores";
import SidebarAdmin, { type SubVistaAdmin } from "./SidebarAdmin";

import { listaVendedores as mockVendedores } from "../data/mockVendedores";
import type { Vendedor as DatosVendedor } from "../types/index";

interface AdminPanelProps {
  onLogout: () => void;
}

export default function AdminPanel({ onLogout }: AdminPanelProps) {
  // Estado para controlar la navegación
  const [menuActivo, setMenuActivo] = useState<SubVistaAdmin>("clientes");

  // Estado global de vendedores compartido entre paneles
  const [listaVendedores, setListaVendedores] =
    useState<DatosVendedor[]>(mockVendedores);

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
        <PanelClientes vendedores={listaVendedores} />
      )}

      {menuActivo === "rutas" && <GestionRutas />}

      {menuActivo === "vendedores" && (
        <PanelVendedores
          listaVendedores={listaVendedores}
          setListaVendedores={setListaVendedores}
        />
      )}
    </div>
  );
}
