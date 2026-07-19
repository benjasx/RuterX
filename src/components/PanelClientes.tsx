// src/components/PanelClientes.tsx
import { useState } from "react";
import { UserPlus, Save } from "lucide-react";
import DirectorioClientes from "./DirectorioClientes";
import { RUTAS } from "../data/mockRutas";
import type { Vendedor as DatosVendedor } from "../types/index";

// 1. IMPORTAMOS NUESTRA NUEVA FUNCIÓN DE FIREBASE
import { agregarClienteFirebase } from "../firebase/clientesService";

interface PanelClientesProps {
  vendedores: DatosVendedor[];
}

export default function PanelClientes({ vendedores }: PanelClientesProps) {
  const [nombre, setNombre] = useState("");
  const [domicilio, setDomicilio] = useState("");
  const [vendedorSeleccionado, setVendedorSeleccionado] = useState("");
  const [ruta, setRuta] = useState("");
  const [latitud, setLatitud] = useState("");
  const [longitud, setLongitud] = useState("");

  // Estado para saber si estamos guardando (para deshabilitar el botón)
  const [guardando, setGuardando] = useState(false);

  const opcionesVendedores = [
    "Seleccionar Vendedor...",
    ...vendedores.map((v) => v.nombre),
  ];

  // 2. CONVERTIMOS LA FUNCIÓN A ASÍNCRONA (async)
  const handleGuardarCliente = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true); // Bloqueamos el botón temporalmente

    const nuevoCliente = {
      nombre,
      descripcion: domicilio, // Lo llamamos descripcion para que empate con tu interfaz
      vendedor: vendedorSeleccionado,
      ruta,
      posicion: [parseFloat(latitud) || 0, parseFloat(longitud) || 0] as [
        number,
        number,
      ],
    };

    // 3. ENVIAMOS LOS DATOS A FIREBASE
    const resultado = await agregarClienteFirebase(nuevoCliente);

    if (resultado.success) {
      alert(`¡Cliente ${nombre} registrado con éxito en la nube!`);
      // Limpiamos el formulario solo si fue exitoso
      setNombre("");
      setDomicilio("");
      setVendedorSeleccionado("");
      setRuta("");
      setLatitud("");
      setLongitud("");
    } else {
      alert("Hubo un error al guardar el cliente. Revisa la consola.");
    }

    setGuardando(false); // Volvemos a habilitar el botón
  };

  return (
    <>
      <div className="w-full xl:w-100 shrink-0 bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col">
        <div className="flex items-center gap-2 mb-6">
          <UserPlus className="text-blue-600" size={24} />
          <h2 className="text-xl font-bold text-slate-800">Agregar Cliente</h2>
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
              value={vendedorSeleccionado}
              onChange={(e) => setVendedorSeleccionado(e.target.value)}
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
                required
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
                required
                value={longitud}
                onChange={(e) => setLongitud(e.target.value)}
                placeholder="-104.8983"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={guardando}
            className="w-full mt-auto pt-6 disabled:opacity-70"
          >
            <div className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-colors flex justify-center items-center gap-2">
              <Save size={18} />
              {guardando ? "Guardando en la nube..." : "Guardar Cliente"}
            </div>
          </button>
        </form>
      </div>

      <div className="flex-1 w-full h-full">
        <DirectorioClientes />
      </div>
    </>
  );
}
