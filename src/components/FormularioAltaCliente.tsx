import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { UserPlus, Loader2 } from "lucide-react";
import { obtenerVendedoresFirebase } from "../firebase/vendedoresService";
import { agregarAltaClienteFirebase } from "../firebase/altasClientesService";
import { parseUbicacionGoogleMaps } from "../utils/googleMapsUbicacion";
import { notificarExito, notificarError, notificarAdvertencia } from "../utils/notificaciones";

interface FormularioAltaClienteProps {
  usuarioEmail: string;
}

export default function FormularioAltaCliente({
  usuarioEmail,
}: FormularioAltaClienteProps) {
  const queryClient = useQueryClient();

  const { data: vendedores = [] } = useQuery({
    queryKey: ["vendedores"],
    queryFn: obtenerVendedoresFirebase,
  });

  const [nombreNegocio, setNombreNegocio] = useState("");
  const [domicilio, setDomicilio] = useState("");
  const [referenciasDomicilio, setReferenciasDomicilio] = useState("");
  const [nombreContacto, setNombreContacto] = useState("");
  const [telefonoContacto, setTelefonoContacto] = useState("");
  const [notas, setNotas] = useState("");
  const [vendedorNombre, setVendedorNombre] = useState("");
  const [ubicacionTexto, setUbicacionTexto] = useState("");
  const [guardando, setGuardando] = useState(false);

  const limpiarFormulario = () => {
    setNombreNegocio("");
    setDomicilio("");
    setReferenciasDomicilio("");
    setNombreContacto("");
    setTelefonoContacto("");
    setNotas("");
    setVendedorNombre("");
    setUbicacionTexto("");
  };

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();

    const ubicacion = parseUbicacionGoogleMaps(ubicacionTexto);
    if (!ubicacion) {
      notificarAdvertencia(
        "No se reconoció la ubicación. Pega un link largo de Google Maps (con @lat,lng o ?q=lat,lng) o coordenadas sueltas (ej. 19.4326, -99.1332). Si tu link es corto (maps.app.goo.gl), mantén presionado el pin en Maps para copiar las coordenadas.",
      );
      return;
    }

    setGuardando(true);
    try {
      const res = await agregarAltaClienteFirebase({
        nombreNegocio,
        domicilio,
        referenciasDomicilio,
        nombreContacto,
        telefonoContacto,
        notas,
        vendedorNombre,
        ubicacionTexto,
        posicion: [ubicacion.lat, ubicacion.lng],
        creadoPorEmail: usuarioEmail,
      });

      if (res.success) {
        queryClient.invalidateQueries({ queryKey: ["altasClientes"] });
        notificarExito("Alta de cliente guardada");
        limpiarFormulario();
      } else {
        notificarError("Ocurrió un error al guardar el alta.");
      }
    } catch (error) {
      notificarError("Ocurrió un error al guardar el alta.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="w-full xl:w-100 shrink-0 bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col">
      <div className="flex items-center gap-2 mb-6">
        <UserPlus className="text-blue-600 dark:text-blue-400" size={24} />
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
          Nueva Alta de Cliente
        </h2>
      </div>

      <form onSubmit={handleGuardar} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
            Nombre del negocio
          </label>
          <input
            type="text"
            required
            value={nombreNegocio}
            onChange={(e) => setNombreNegocio(e.target.value)}
            className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
            placeholder="Ej. Abarrotes El Sol"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
            Domicilio
          </label>
          <input
            type="text"
            required
            value={domicilio}
            onChange={(e) => setDomicilio(e.target.value)}
            className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
            placeholder="Ej. Av. Principal 123"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
            Referencias de domicilio (opcional)
          </label>
          <input
            type="text"
            value={referenciasDomicilio}
            onChange={(e) => setReferenciasDomicilio(e.target.value)}
            className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
            placeholder="Ej. Frente a la farmacia, portón negro"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
            Nombre de contacto (opcional)
          </label>
          <input
            type="text"
            value={nombreContacto}
            onChange={(e) => setNombreContacto(e.target.value)}
            className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
            Teléfono de contacto
          </label>
          <input
            type="tel"
            required
            value={telefonoContacto}
            onChange={(e) => setTelefonoContacto(e.target.value)}
            className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
            Notas / observaciones (opcional)
          </label>
          <textarea
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            rows={2}
            className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
            Vendedor
          </label>
          <select
            required
            value={vendedorNombre}
            onChange={(e) => setVendedorNombre(e.target.value)}
            className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="">Seleccionar Vendedor...</option>
            {vendedores.map((v) => (
              <option key={v.id} value={v.nombre}>
                {v.nombre}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
            Ubicación de Google Maps
          </label>
          <input
            type="text"
            required
            value={ubicacionTexto}
            onChange={(e) => setUbicacionTexto(e.target.value)}
            className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
            placeholder="Link de Google Maps o coordenadas (19.4326, -99.1332)"
          />
        </div>

        <button
          type="submit"
          disabled={guardando}
          className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
        >
          {guardando ? (
            <>
              <Loader2 size={18} className="animate-spin" /> Guardando...
            </>
          ) : (
            "Guardar Alta"
          )}
        </button>
      </form>
    </div>
  );
}
