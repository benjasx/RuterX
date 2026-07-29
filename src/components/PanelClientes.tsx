import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query"; // 🚀 1. IMPORTAMOS LA HERRAMIENTA DE CACHÉ
import { UserPlus, X } from "lucide-react";
import DirectorioClientes from "./DirectorioClientes";
import type { Vendedor as DatosVendedor } from "../types/index";
import {
  agregarClienteFirebase,
  actualizarClienteFirebase,
  eliminarClienteFirebase,
} from "../firebase/clientesService";

interface PanelClientesProps {
  vendedores: DatosVendedor[];
  listaClientes: any[];
  setListaClientes: React.Dispatch<React.SetStateAction<any[]>>;
  rutas: any[];
}

export default function PanelClientes({
  vendedores,
  listaClientes,
  setListaClientes,
  rutas,
}: PanelClientesProps) {
  // 🚀 2. INICIALIZAMOS EL CLIENTE DE CACHÉ
  const queryClient = useQueryClient();

  const [nombre, setNombre] = useState("");
  const [domicilio, setDomicilio] = useState("");
  const [vendedorSeleccionado, setVendedorSeleccionado] = useState("");
  const [ruta, setRuta] = useState("");
  const [latitud, setLatitud] = useState("");
  const [longitud, setLongitud] = useState("");

  const [idEditando, setIdEditando] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const opcionesVendedores = [
    "Seleccionar Vendedor...",
    ...vendedores.map((v) => v.nombre),
  ];

  const handleGuardarCliente = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);

    const datosCliente = {
      nombre,
      descripcion: domicilio,
      vendedor: vendedorSeleccionado,
      ruta,
      posicion: [parseFloat(latitud) || 0, parseFloat(longitud) || 0] as [
        number,
        number,
      ],
    };

    if (idEditando) {
      const res = await actualizarClienteFirebase(idEditando, datosCliente);
      if (res.success) {
        setListaClientes(
          listaClientes.map((c) =>
            c.id === idEditando ? { ...c, ...datosCliente } : c,
          ),
        );
        // 🚀 3. INVALIDAMOS LA CACHÉ PARA QUE EL MAPA SE ACTUALICE SOLO
        queryClient.invalidateQueries({ queryKey: ["clientes"] });

        alert("Cliente actualizado correctamente");
        limpiarFormulario();
      }
    } else {
      const res = await agregarClienteFirebase(datosCliente);
      if (res.success && res.id) {
        setListaClientes([...listaClientes, { ...datosCliente, id: res.id }]);

        // 🚀 3. INVALIDAMOS LA CACHÉ PARA QUE EL MAPA SE ACTUALICE SOLO
        queryClient.invalidateQueries({ queryKey: ["clientes"] });

        alert("¡Cliente registrado en la nube!");
        limpiarFormulario();
      }
    }
    setGuardando(false);
  };

  const handleEditar = (cliente: any) => {
    setIdEditando(cliente.id);
    setNombre(cliente.nombre);
    setDomicilio(cliente.descripcion);
    setVendedorSeleccionado(cliente.vendedor);
    setRuta(cliente.ruta);
    setLatitud(cliente.posicion[0]?.toString() || "");
    setLongitud(cliente.posicion[1]?.toString() || "");
  };

  const handleEliminar = async (id: string) => {
    if (window.confirm("¿Seguro que deseas eliminar este cliente?")) {
      const res = await eliminarClienteFirebase(id);
      if (res.success) {
        setListaClientes(listaClientes.filter((c) => c.id !== id));

        // 🚀 3. INVALIDAMOS LA CACHÉ AL ELIMINAR
        queryClient.invalidateQueries({ queryKey: ["clientes"] });

        if (idEditando === id) limpiarFormulario();
      }
    }
  };

  const limpiarFormulario = () => {
    setIdEditando(null);
    setNombre("");
    setDomicilio("");
    setVendedorSeleccionado("");
    setRuta("");
    setLatitud("");
    setLongitud("");
  };

  return (
    <div className="flex flex-col xl:flex-row gap-6 w-full">
      <div className="w-full xl:w-100 shrink-0 bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col">
        <div className="flex items-center gap-2 mb-6">
          <UserPlus className="text-blue-600" size={24} />
          <h2 className="text-xl font-bold text-slate-800">
            {idEditando ? "Editar Cliente" : "Agregar Cliente"}
          </h2>
        </div>

        <form onSubmit={handleGuardarCliente} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Nombre
            </label>
            <input
              type="text"
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
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
              className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ej. Av. Principal 123"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Vendedor
            </label>
            <select
              required
              value={vendedorSeleccionado}
              onChange={(e) => setVendedorSeleccionado(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              {opcionesVendedores.map((v, i) => (
                <option
                  key={i}
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
              className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="">Seleccionar Ruta...</option>
              {rutas.map((r) => (
                <option key={r.id} value={r.nombre}>
                  {r.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Latitud
              </label>
              <input
                type="number"
                step="any"
                required
                placeholder="ej. 19.432608"
                value={latitud}
                onChange={(e) => setLatitud(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Longitud
              </label>
              <input
                type="number"
                step="any"
                required
                placeholder="ej. -99.133209"
                value={longitud}
                onChange={(e) => setLongitud(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={guardando}
            className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
          >
            {guardando
              ? "Procesando..."
              : idEditando
                ? "Actualizar Cliente"
                : "Guardar Cliente"}
          </button>

          {idEditando && (
            <button
              type="button"
              onClick={limpiarFormulario}
              className="w-full text-slate-500 text-sm flex justify-center items-center gap-1 hover:text-slate-700 transition-colors mt-2"
            >
              <X size={16} /> Cancelar edición
            </button>
          )}
        </form>
      </div>

      <div className="flex-1 w-full h-full min-h-125">
        <DirectorioClientes
          clientes={listaClientes}
          rutas={rutas}
          onEdit={handleEditar}
          onDelete={handleEliminar}
        />
      </div>
    </div>
  );
}
