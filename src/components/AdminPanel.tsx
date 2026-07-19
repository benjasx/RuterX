import { useState } from "react";
import {
  UserPlus,
  Save,
  Users,
  Map,
  LogOut,
  Briefcase,
  Trash2,
  Edit,
} from "lucide-react";
import DirectorioClientes from "./DirectorioClientes";
import GestionRutas from "./GestionRutas";

import { RUTAS } from "../data/mockRutas";
import { VENDEDORES } from "../data/mockClients";

// 1. Agregamos "vendedores" a los tipos permitidos
type SubVistaAdmin = "clientes" | "rutas" | "vendedores";

interface AdminPanelProps {
  onLogout: () => void;
}

// 2. Interfaz para los datos del nuevo vendedor
export interface DatosVendedor {
  id: string;
  nombre: string;
  correo: string;
  telefono: string;
  rutas: string[];
}

export default function AdminPanel({ onLogout }: AdminPanelProps) {
  const [menuActivo, setMenuActivo] = useState<SubVistaAdmin>("clientes");

  // ==========================================
  // ESTADOS ORIGINALES DE CLIENTES (Intactos)
  // ==========================================
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

  // ==========================================
  // NUEVOS ESTADOS PARA VENDEDORES
  // ==========================================
  const [listaVendedores, setListaVendedores] = useState<DatosVendedor[]>([
    {
      id: "v-001",
      nombre: "Benjamin R-2",
      correo: "benja02@ejemplo.com",
      telefono: "311-123-4567",
      rutas: ["tlmk", "local", "santiago"],
    },
  ]);
  const [nuevoNombreVend, setNuevoNombreVend] = useState("");
  const [nuevoCorreoVend, setNuevoCorreoVend] = useState("");
  const [nuevoTelefonoVend, setNuevoTelefonoVend] = useState("");
  const [rutasSeleccionadasVend, setRutasSeleccionadasVend] = useState<
    string[]
  >([]);
  const [vendedorEditando, setVendedorEditando] = useState<string | null>(null);

  const toggleRutaVendedor = (r: string) => {
    setRutasSeleccionadasVend((prev) =>
      prev.includes(r) ? prev.filter((ruta) => ruta !== r) : [...prev, r],
    );
  };

  const handleGuardarVendedor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoNombreVend.trim()) {
      alert("El nombre es obligatorio");
      return;
    }

    if (vendedorEditando) {
      setListaVendedores(
        listaVendedores.map((v) =>
          v.id === vendedorEditando
            ? {
                ...v,
                nombre: nuevoNombreVend,
                correo: nuevoCorreoVend,
                telefono: nuevoTelefonoVend,
                rutas: rutasSeleccionadasVend,
              }
            : v,
        ),
      );
      setVendedorEditando(null);
    } else {
      const nuevoVendedor: DatosVendedor = {
        id: `v-${Date.now()}`,
        nombre: nuevoNombreVend,
        correo: nuevoCorreoVend,
        telefono: nuevoTelefonoVend,
        rutas: rutasSeleccionadasVend,
      };
      setListaVendedores([...listaVendedores, nuevoVendedor]);
    }

    // Limpiar formulario de vendedores
    setNuevoNombreVend("");
    setNuevoCorreoVend("");
    setNuevoTelefonoVend("");
    setRutasSeleccionadasVend([]);
  };

  const handleEditarVendedor = (vend: DatosVendedor) => {
    setVendedorEditando(vend.id);
    setNuevoNombreVend(vend.nombre);
    setNuevoCorreoVend(vend.correo);
    setNuevoTelefonoVend(vend.telefono);
    setRutasSeleccionadasVend(vend.rutas);
  };

  const handleEliminarVendedor = (id: string) => {
    if (window.confirm("¿Estás seguro de eliminar este vendedor?")) {
      setListaVendedores(listaVendedores.filter((v) => v.id !== id));
      if (vendedorEditando === id) {
        setVendedorEditando(null);
        setNuevoNombreVend("");
        setNuevoCorreoVend("");
        setNuevoTelefonoVend("");
        setRutasSeleccionadasVend([]);
      }
    }
  };

  return (
    // 3. items-stretch fuerza a que todas las columnas midan lo mismo hacia abajo
    <div className="flex flex-col xl:flex-row items-start gap-5 w-full">
      {/* BARRA LATERAL (Intacta, solo añadida la opción de Vendedores) */}
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
            {/* NUEVA OPCIÓN: VENDEDORES */}
            <li>
              <button
                onClick={() => setMenuActivo("vendedores")}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  menuActivo === "vendedores"
                    ? "bg-blue-50 text-blue-700 font-semibold"
                    : "text-slate-600 hover:bg-slate-50 font-medium"
                }`}
              >
                <Briefcase size={20} />
                Añadir Vendedores
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

      {/* ---------------- VISTA ORIGINAL DE CLIENTES ---------------- */}
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

      {/* ---------------- VISTA ORIGINAL DE RUTAS ---------------- */}
      {menuActivo === "rutas" && <GestionRutas />}

      {/* ---------------- NUEVA VISTA DE VENDEDORES ---------------- */}
      {menuActivo === "vendedores" && (
        <>
          {/* FORMULARIO DE VENDEDORES */}
          <div className="w-full xl:w-100 shrink-0 bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col">
            <div className="flex items-center gap-2 mb-6">
              <Briefcase className="text-blue-600" size={24} />
              <h2 className="text-xl font-bold text-slate-800">
                {vendedorEditando ? "Editar Vendedor" : "Agregar Vendedor"}
              </h2>
            </div>

            <form
              onSubmit={handleGuardarVendedor}
              className="space-y-4 flex flex-col flex-1"
            >
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  value={nuevoNombreVend}
                  onChange={(e) => setNuevoNombreVend(e.target.value)}
                  placeholder="Ej. Benjamin R-2"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Correo Electrónico
                </label>
                <input
                  type="email"
                  value={nuevoCorreoVend}
                  onChange={(e) => setNuevoCorreoVend(e.target.value)}
                  placeholder="Ej. correo@empresa.com"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Teléfono
                </label>
                <input
                  type="text"
                  value={nuevoTelefonoVend}
                  onChange={(e) => setNuevoTelefonoVend(e.target.value)}
                  placeholder="Ej. 311 123 4567"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Rutas Asignadas ({rutasSeleccionadasVend.length})
                </label>
                <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-2 bg-slate-50 border border-slate-200 rounded-lg">
                  {RUTAS.map((ruta) => (
                    <button
                      key={ruta}
                      type="button"
                      onClick={() => toggleRutaVendedor(ruta)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all border ${
                        rutasSeleccionadasVend.includes(ruta)
                          ? "bg-blue-600 text-white border-blue-700 shadow-sm"
                          : "bg-white text-slate-600 border-slate-300 hover:bg-slate-100"
                      }`}
                    >
                      {ruta}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 mt-auto pt-6">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-colors flex justify-center items-center gap-2"
                >
                  <Save size={18} />
                  {vendedorEditando ? "Actualizar" : "Guardar"}
                </button>
                {vendedorEditando && (
                  <button
                    type="button"
                    onClick={() => {
                      setVendedorEditando(null);
                      setNuevoNombreVend("");
                      setNuevoCorreoVend("");
                      setNuevoTelefonoVend("");
                      setRutasSeleccionadasVend([]);
                    }}
                    className="bg-white hover:bg-slate-50 text-slate-600 border border-slate-300 font-medium py-2.5 px-4 rounded-lg transition-colors text-sm"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* LISTA / DIRECTORIO DE VENDEDORES */}
          <div className="flex-1 w-full bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <Briefcase size={18} className="text-slate-400" /> Directorio de
                Vendedores
              </h3>
            </div>

            <div className="overflow-y-auto flex-1 p-0">
              <table className="w-full text-left border-collapse">
                <thead className="bg-white sticky top-0 shadow-sm z-10">
                  <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="px-6 py-4">Vendedor</th>
                    <th className="px-6 py-4">Contacto</th>
                    <th className="px-6 py-4">Rutas Asignadas</th>
                    <th className="px-6 py-4 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {listaVendedores.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-6 py-8 text-center text-slate-400"
                      >
                        No hay vendedores registrados.
                      </td>
                    </tr>
                  ) : (
                    listaVendedores.map((vendedor) => (
                      <tr
                        key={vendedor.id}
                        className="hover:bg-slate-50 transition-colors"
                      >
                        <td className="px-6 py-4 font-bold text-slate-800">
                          {vendedor.nombre}
                        </td>
                        <td className="px-6 py-4 text-slate-600">
                          {vendedor.correo && (
                            <div className="mb-1">{vendedor.correo}</div>
                          )}
                          {vendedor.telefono && (
                            <div className="text-xs text-slate-500">
                              {vendedor.telefono}
                            </div>
                          )}
                          {!vendedor.correo && !vendedor.telefono && (
                            <span className="italic text-slate-400">
                              Sin datos
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {vendedor.rutas.length > 0 ? (
                              vendedor.rutas.map((ruta) => (
                                <span
                                  key={ruta}
                                  className="px-2 py-1 bg-blue-50 text-blue-700 text-[10px] font-bold uppercase rounded border border-blue-100"
                                >
                                  {ruta}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-slate-400 italic">
                                Ninguna
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-3">
                            <button
                              onClick={() => handleEditarVendedor(vendedor)}
                              className="text-slate-400 hover:text-blue-600 transition-colors"
                              title="Editar"
                            >
                              <Edit size={18} />
                            </button>
                            <button
                              onClick={() =>
                                handleEliminarVendedor(vendedor.id)
                              }
                              className="text-slate-400 hover:text-red-600 transition-colors"
                              title="Eliminar"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
