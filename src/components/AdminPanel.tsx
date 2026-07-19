import { useState } from "react";
import { UserPlus, Save, Users, Map, LogOut, Briefcase } from "lucide-react";
import DirectorioClientes from "./DirectorioClientes";
import GestionRutas from "./GestionRutas";

import { RUTAS } from "../data/mockRutas";
import { listaVendedores as mockVendedores } from "../data/mockVendedores";
import DirectorioVendedores from "./DirectorioVendedores";
import type { Vendedor as DatosVendedor } from "../types/index";

// 1. Agregamos "vendedores" a los tipos permitidos
type SubVistaAdmin = "clientes" | "rutas" | "vendedores";

interface AdminPanelProps {
  onLogout: () => void;
}

export default function AdminPanel({ onLogout }: AdminPanelProps) {
  const [menuActivo, setMenuActivo] = useState<SubVistaAdmin>("clientes");

  // ==========================================
  // NUEVOS ESTADOS PARA VENDEDORES
  // ==========================================
  const [listaVendedores, setListaVendedores] =
    useState<DatosVendedor[]>(mockVendedores);
  const [nuevoNombreVend, setNuevoNombreVend] = useState("");
  const [nuevoCorreoVend, setNuevoCorreoVend] = useState("");
  const [nuevoTelefonoVend, setNuevoTelefonoVend] = useState("");
  const [rutasSeleccionadasVend, setRutasSeleccionadasVend] = useState<
    string[]
  >([]);
  const [vendedorEditando, setVendedorEditando] = useState<string | null>(null);

  // Lista dinámica para el Select de Clientes
  const opcionesVendedores = [
    "Seleccionar Vendedor...",
    ...listaVendedores.map((v) => v.nombre),
  ];

  // ==========================================
  // ESTADOS ORIGINALES DE CLIENTES
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
  // FUNCIONES DE VENDEDORES CORREGIDAS
  // ==========================================
  const toggleRutaVendedor = (r: string) => {
    setRutasSeleccionadasVend((prev) => {
      // Verificamos si la ruta ya existe ignorando mayúsculas/minúsculas
      const existe = prev.some(
        (rutaGuardada) => rutaGuardada.toLowerCase() === r.toLowerCase(),
      );

      if (existe) {
        // Si ya la tiene, filtramos y quitamos cualquier coincidencia
        return prev.filter(
          (rutaGuardada) => rutaGuardada.toLowerCase() !== r.toLowerCase(),
        );
      } else {
        // Si no la tiene, la agregamos
        return [...prev, r];
      }
    });
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
              onLogout();
            }}
            className="flex items-center w-full gap-3 px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-50 rounded-xl transition-colors mt-auto"
          >
            <LogOut size={18} />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* ---------------- VISTA DE CLIENTES ---------------- */}
      {menuActivo === "clientes" && (
        <>
          <div className="w-full xl:w-100 shrink-0 bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col">
            <div className="flex items-center gap-2 mb-6">
              <UserPlus className="text-blue-600" size={24} />
              <h2 className="text-xl font-bold text-slate-800">
                Agregar Cliente
              </h2>
            </div>

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
                  {opcionesVendedores.map((v, index) => (
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

              <button type="submit" className="w-full mt-auto pt-6">
                <div className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-colors flex justify-center items-center gap-2">
                  <Save size={18} />
                  Guardar Cliente
                </div>
              </button>
            </form>
          </div>

          <div className="flex-1 w-full h-full">
            <DirectorioClientes />
          </div>
        </>
      )}

      {/* ---------------- VISTA DE RUTAS ---------------- */}
      {menuActivo === "rutas" && <GestionRutas />}

      {/* ---------------- VISTA DE VENDEDORES ---------------- */}
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
                  {RUTAS.map((ruta) => {
                    // AQUÍ ESTÁ LA CORRECCIÓN: Comparamos ignorando mayúsculas/minúsculas
                    const isSelected = rutasSeleccionadasVend.some(
                      (rutaGuardada) =>
                        rutaGuardada.toLowerCase() === ruta.toLowerCase(),
                    );

                    return (
                      <button
                        key={ruta}
                        type="button"
                        onClick={() => toggleRutaVendedor(ruta)}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all border ${
                          isSelected
                            ? "bg-blue-600 text-white border-blue-700 shadow-sm"
                            : "bg-white text-slate-600 border-slate-300 hover:bg-slate-100"
                        }`}
                      >
                        {ruta}
                      </button>
                    );
                  })}
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
          {/* LISTA / DIRECTORIO DE VENDEDORES (Ahora usando el nuevo componente) */}
          <div className="flex-1 w-full h-full">
            <DirectorioVendedores
              vendedores={listaVendedores}
              onEdit={handleEditarVendedor}
              onDelete={handleEliminarVendedor}
            />
          </div>
        </>
      )}
    </div>
  );
}
