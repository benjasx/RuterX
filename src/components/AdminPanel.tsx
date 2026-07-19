import { useState } from "react";
import { UserPlus, Save, Users, Map, LogOut } from "lucide-react";
import DirectorioClientes from "./DirectorioClientes";
import GestionRutas from "./GestionRutas";

import { RUTAS } from "../data/mockRutas";
import { VENDEDORES } from "../data/mockClients";

type SubVistaAdmin = "clientes" | "rutas";

interface AdminPanelProps {
  onLogout: () => void;
}

export default function AdminPanel({ onLogout }: AdminPanelProps) {
  const [menuActivo, setMenuActivo] = useState<SubVistaAdmin>("clientes");

  const [nombre, setNombre] = useState("");
  const [domicilio, setDomicilio] = useState("");
  const [vendedor, setVendedor] = useState("");
  const [ruta, setRuta] = useState("");
  const [latitud, setLatitud] = useState("");
  const [longitud, setLongitud] = useState("");

  const handleGuardarCliente = (e: React.FormEvent) => {
    e.preventDefault();
    const nuevoCliente = {
      nombre,
      domicilio,
      vendedor,
      ruta,
      coordenadas: [parseFloat(latitud) || 0, parseFloat(longitud) || 0],
    };

    console.log("Cliente a guardar:", nuevoCliente);
    alert(`¡Cliente ${nombre} registrado con éxito!`);

    setNombre("");
    setDomicilio("");
    setVendedor("");
    setRuta("");
    setLatitud("");
    setLongitud("");
  };

  return (
    // 3. items-stretch fuerza a que todas las columnas midan lo mismo hacia abajo
    <div className="flex flex-col xl:flex-row items-start gap-5 w-full">
      {/* BARRA LATERAL */}
      <aside className="w-full xl:w-62.5 shrink-0 bg-white rounded-xl shadow-sm border border-slate-100 flex flex-col justify-between p-4">
        <div>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 px-3">
            Opciones
          </h3>
          <ul className="space-y-2">
            <li>
              <button
                onClick={() => setMenuActivo("clientes")}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  menuActivo === "clientes"
                    ? "bg-blue-50 text-blue-700 font-semibold"
                    : "text-slate-600 hover:bg-slate-50 font-medium"
                }`}
              >
                <Users size={20} />
                Añadir Clientes
              </button>
            </li>
            <li>
              <button
                onClick={() => setMenuActivo("rutas")}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  menuActivo === "rutas"
                    ? "bg-blue-50 text-blue-700 font-semibold"
                    : "text-slate-600 hover:bg-slate-50 font-medium"
                }`}
              >
                <Map size={20} />
                Añadir Rutas
              </button>
            </li>
          </ul>
        </div>

        <div>
          <div className="h-px bg-slate-100 w-full mb-4"></div>
          <button
            onClick={() => {
              alert("Cerrando sesión de administrador...");
              onLogout(); // Llama a la función que destruye la sesión
            }}
            className="flex items-center w-full gap-3 px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-50 rounded-xl transition-colors mt-auto"
          >
            <LogOut size={18} />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* RENDERIZADO CONDICIONAL DE LAS PANTALLAS */}
      {menuActivo === "clientes" && (
        <>
          {/* FORMULARIO */}
          <div className="w-full xl:w-100 shrink-0 bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col">
            <div className="flex items-center gap-2 mb-6">
              <UserPlus className="text-blue-600" size={24} />
              <h2 className="text-xl font-bold text-slate-800">
                Agregar Cliente
              </h2>
            </div>

            {/* flex-1 dentro del form permite al botón irse hacia abajo si lo deseas, o mantiene todo compacto */}
            <form
              onSubmit={handleGuardarCliente}
              className="space-y-4 flex flex-col flex-1"
            >
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Nombre del Cliente
                </label>
                <input
                  type="text"
                  required
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ej. Abarrotes El Sol"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Domicilio
                </label>
                <input
                  type="text"
                  required
                  value={domicilio}
                  onChange={(e) => setDomicilio(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ej. Av. Principal 123"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Vendedor
                </label>
                <select
                  required
                  value={vendedor}
                  onChange={(e) => setVendedor(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  {VENDEDORES.map((v, index) => (
                    <option
                      key={index}
                      value={v === "Seleccionar Vendedor..." ? "" : v}
                    >
                      {v}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Ruta
                </label>
                <select
                  required
                  value={ruta}
                  onChange={(e) => setRuta(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">Seleccionar Ruta...</option>
                  {RUTAS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Latitud (Lat)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={latitud}
                    onChange={(e) => setLatitud(e.target.value)}
                    placeholder="21.4425"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Longitud (Log)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={longitud}
                    onChange={(e) => setLongitud(e.target.value)}
                    placeholder="-104.8983"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* mt-auto empuja el botón de guardar hacia el fondo del contenedor si es necesario */}
              <button type="submit" className="w-full mt-auto pt-6">
                <div className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-colors flex justify-center items-center gap-2">
                  <Save size={18} />
                  Guardar Cliente
                </div>
              </button>
            </form>
          </div>

          {/* DIRECTORIO */}
          <div className="flex-1 w-full h-full">
            <DirectorioClientes />
          </div>
        </>
      )}

      {menuActivo === "rutas" && <GestionRutas />}
    </div>
  );
}
