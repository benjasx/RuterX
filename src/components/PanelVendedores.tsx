// src/components/PanelVendedores.tsx
import { useState } from "react";
import { Briefcase, Save } from "lucide-react";
import DirectorioVendedores from "./DirectorioVendedores";
import { RUTAS } from "../data/mockRutas";
import type { Vendedor as DatosVendedor } from "../types/index";

// IMPORTAMOS LOS TRES SERVICIOS DE FIREBASE
import {
  agregarVendedorFirebase,
  actualizarVendedorFirebase,
  eliminarVendedorFirebase,
} from "../firebase/vendedoresService";

interface PanelVendedoresProps {
  listaVendedores: DatosVendedor[];
  setListaVendedores: React.Dispatch<React.SetStateAction<DatosVendedor[]>>;
}

export default function PanelVendedores({
  listaVendedores,
  setListaVendedores,
}: PanelVendedoresProps) {
  const [nuevoNombreVend, setNuevoNombreVend] = useState("");
  const [nuevoCorreoVend, setNuevoCorreoVend] = useState("");
  const [nuevoTelefonoVend, setNuevoTelefonoVend] = useState("");
  const [rutasSeleccionadasVend, setRutasSeleccionadasVend] = useState<
    string[]
  >([]);
  const [vendedorEditando, setVendedorEditando] = useState<string | null>(null);

  // ESTADO PARA BLOQUEAR LOS BOTONES MIENTRAS SE PROCESA LA PETICIÓN
  const [guardando, setGuardando] = useState(false);

  const toggleRutaVendedor = (r: string) => {
    setRutasSeleccionadasVend((prev) => {
      const existe = prev.some(
        (rutaGuardada) => rutaGuardada.toLowerCase() === r.toLowerCase(),
      );
      if (existe) {
        return prev.filter(
          (rutaGuardada) => rutaGuardada.toLowerCase() !== r.toLowerCase(),
        );
      } else {
        return [...prev, r];
      }
    });
  };

  const handleGuardarVendedor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoNombreVend.trim()) return alert("El nombre es obligatorio");

    setGuardando(true);

    if (vendedorEditando) {
      // --- LÓGICA DE ACTUALIZACIÓN EN FIREBASE ---
      const datosActualizados = {
        nombre: nuevoNombreVend,
        correo: nuevoCorreoVend,
        telefono: nuevoTelefonoVend,
        rutas: rutasSeleccionadasVend,
      };

      const resultado = await actualizarVendedorFirebase(
        vendedorEditando,
        datosActualizados,
      );

      if (resultado.success) {
        setListaVendedores(
          listaVendedores.map((v) =>
            v.id === vendedorEditando ? { ...v, ...datosActualizados } : v,
          ),
        );
        alert("Vendedor actualizado en la nube correctamente.");
        setVendedorEditando(null);
        limpiarFormulario();
      } else {
        alert("Error al actualizar en Firebase. Revisa la consola.");
      }
    } else {
      // --- LÓGICA DE CREACIÓN EN FIREBASE ---
      const nuevoVendedor = {
        nombre: nuevoNombreVend,
        correo: nuevoCorreoVend,
        telefono: nuevoTelefonoVend,
        rutas: rutasSeleccionadasVend,
      };

      const resultado = await agregarVendedorFirebase(nuevoVendedor);

      if (resultado.success && resultado.id) {
        alert(`¡Vendedor ${nuevoNombreVend} registrado en la nube con éxito!`);
        const vendedorConIdReal: DatosVendedor = {
          ...nuevoVendedor,
          id: resultado.id,
        };
        setListaVendedores([...listaVendedores, vendedorConIdReal]);
        limpiarFormulario();
      } else {
        alert("Hubo un error al guardar en Firebase.");
      }
    }

    setGuardando(false);
  };

  const limpiarFormulario = () => {
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

  const handleEliminarVendedor = async (id: string) => {
    // --- LÓGICA DE ELIMINACIÓN EN FIREBASE ---
    if (
      window.confirm(
        "¿Estás seguro de eliminar este vendedor de la base de datos?",
      )
    ) {
      setGuardando(true);

      const resultado = await eliminarVendedorFirebase(id);

      if (resultado.success) {
        setListaVendedores(listaVendedores.filter((v) => v.id !== id));
        if (vendedorEditando === id) {
          setVendedorEditando(null);
          limpiarFormulario();
        }
        alert("Vendedor eliminado de la nube.");
      } else {
        alert("Error al eliminar el vendedor de Firebase.");
      }

      setGuardando(false);
    }
  };

  return (
    <>
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
              placeholder="Ej. 311-123-4567"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Rutas Asignadas ({rutasSeleccionadasVend.length})
            </label>
            <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-2 bg-slate-50 border border-slate-200 rounded-lg">
              {RUTAS.map((ruta) => {
                const isSelected = rutasSeleccionadasVend.some(
                  (r) => r.toLowerCase() === ruta.toLowerCase(),
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
              disabled={guardando}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-colors flex justify-center items-center gap-2 disabled:opacity-70"
            >
              <Save size={18} />{" "}
              {guardando
                ? "Procesando..."
                : vendedorEditando
                  ? "Actualizar"
                  : "Guardar"}
            </button>
            {vendedorEditando && (
              <button
                type="button"
                onClick={() => {
                  setVendedorEditando(null);
                  limpiarFormulario();
                }}
                className="bg-white hover:bg-slate-50 text-slate-600 border border-slate-300 font-medium py-2.5 px-4 rounded-lg transition-colors text-sm"
              >
                Cancelar
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="flex-1 w-full h-full">
        <DirectorioVendedores
          vendedores={listaVendedores}
          onEdit={handleEditarVendedor}
          onDelete={handleEliminarVendedor}
        />
      </div>
    </>
  );
}
