import { useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  UserPlus,
  Loader2,
  X,
  User,
  MapPin,
  Phone,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { obtenerVendedoresFirebase } from "../firebase/vendedoresService";
import {
  agregarAltaClienteFirebase,
  actualizarAltaClienteFirebase,
  type AltaClienteNueva,
  type TipoCliente,
} from "../firebase/altasClientesService";
import { parseUbicacionGoogleMaps } from "../utils/googleMapsUbicacion";
import { notificarExito, notificarError, notificarAdvertencia } from "../utils/notificaciones";

export type AltaClienteConId = AltaClienteNueva & { id: string };

interface FormularioAltaClienteProps {
  usuarioEmail: string;
  altaEditando?: AltaClienteConId | null;
  onGuardado?: () => void;
  onCancelarEdicion?: () => void;
}

const ETIQUETA_TIPO_CLIENTE: Record<TipoCliente, string> = {
  credito: "Crédito",
  contado: "Contado",
  pagoAnticipado: "Pago anticipado",
};

const inputClase =
  "w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100";
const labelClase =
  "block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1";

function Seccion({
  icon: Icon,
  titulo,
  children,
}: {
  icon: LucideIcon;
  titulo: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 pb-1 border-b border-slate-100 dark:border-slate-700">
        <Icon size={14} className="text-blue-600 dark:text-blue-400" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {titulo}
        </h3>
      </div>
      {children}
    </div>
  );
}

export default function FormularioAltaCliente({
  usuarioEmail,
  altaEditando = null,
  onGuardado,
  onCancelarEdicion,
}: FormularioAltaClienteProps) {
  const queryClient = useQueryClient();

  const { data: vendedores = [] } = useQuery({
    queryKey: ["vendedores"],
    queryFn: obtenerVendedoresFirebase,
  });

  const [nombreCliente, setNombreCliente] = useState(altaEditando?.nombreCliente ?? "");
  const [nombreNegocio, setNombreNegocio] = useState(altaEditando?.nombreNegocio ?? "");
  const [domicilio, setDomicilio] = useState(altaEditando?.domicilio ?? "");
  const [entreCalles, setEntreCalles] = useState(altaEditando?.entreCalles ?? "");
  const [referenciasDomicilio, setReferenciasDomicilio] = useState(
    altaEditando?.referenciasDomicilio ?? "",
  );
  const [nombreContacto, setNombreContacto] = useState(altaEditando?.nombreContacto ?? "");
  const [telefonoContacto, setTelefonoContacto] = useState(
    altaEditando?.telefonoContacto ?? "",
  );
  const [telefonoReferencia, setTelefonoReferencia] = useState(
    altaEditando?.telefonoReferencia ?? "",
  );
  const [correo, setCorreo] = useState(altaEditando?.correo ?? "");
  const [tipoCliente, setTipoCliente] = useState<TipoCliente | "">(
    altaEditando?.tipoCliente ?? "",
  );
  const [notas, setNotas] = useState(altaEditando?.notas ?? "");
  const [vendedorNombre, setVendedorNombre] = useState(altaEditando?.vendedorNombre ?? "");
  const [ubicacionTexto, setUbicacionTexto] = useState(altaEditando?.ubicacionTexto ?? "");
  const [guardando, setGuardando] = useState(false);

  const limpiarFormulario = () => {
    setNombreCliente("");
    setNombreNegocio("");
    setDomicilio("");
    setEntreCalles("");
    setReferenciasDomicilio("");
    setNombreContacto("");
    setTelefonoContacto("");
    setTelefonoReferencia("");
    setCorreo("");
    setTipoCliente("");
    setNotas("");
    setVendedorNombre("");
    setUbicacionTexto("");
  };

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!tipoCliente) {
      notificarAdvertencia("Selecciona el tipo de cliente (Crédito, Contado o Pago anticipado).");
      return;
    }

    const ubicacion = parseUbicacionGoogleMaps(ubicacionTexto);
    if (!ubicacion) {
      notificarAdvertencia(
        "No se reconoció la ubicación. Pega un link largo de Google Maps (con @lat,lng o ?q=lat,lng) o coordenadas sueltas (ej. 19.4326, -99.1332). Si tu link es corto (maps.app.goo.gl), mantén presionado el pin en Maps para copiar las coordenadas.",
      );
      return;
    }

    const datosAlta: AltaClienteNueva = {
      nombreCliente,
      nombreNegocio,
      domicilio,
      entreCalles,
      referenciasDomicilio,
      nombreContacto,
      telefonoContacto,
      telefonoReferencia,
      correo,
      tipoCliente,
      notas,
      vendedorNombre,
      ubicacionTexto,
      posicion: [ubicacion.lat, ubicacion.lng],
      creadoPorEmail: altaEditando ? altaEditando.creadoPorEmail : usuarioEmail,
    };

    setGuardando(true);
    try {
      const res = altaEditando
        ? await actualizarAltaClienteFirebase(altaEditando.id, datosAlta)
        : await agregarAltaClienteFirebase(datosAlta);

      if (res.success) {
        queryClient.invalidateQueries({ queryKey: ["altasClientes"] });
        notificarExito(
          altaEditando ? "Alta de cliente actualizada" : "Alta de cliente guardada",
        );
        limpiarFormulario();
        onGuardado?.();
      } else {
        notificarError("Ocurrió un error al guardar el alta.");
      }
    } catch {
      notificarError("Ocurrió un error al guardar el alta.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="w-full xl:w-120 shrink-0 bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col">
      <div className="flex items-center justify-between gap-2 mb-6">
        <div className="flex items-center gap-2">
          <UserPlus className="text-blue-600 dark:text-blue-400" size={24} />
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
            {altaEditando ? "Editar Alta de Cliente" : "Nueva Alta de Cliente"}
          </h2>
        </div>
        {altaEditando && onCancelarEdicion && (
          <button
            type="button"
            onClick={onCancelarEdicion}
            className="text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
            title="Cancelar edición"
          >
            <X size={20} />
          </button>
        )}
      </div>

      <form onSubmit={handleGuardar} className="space-y-6">
        <Seccion icon={User} titulo="Datos del cliente">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClase}>Nombre del cliente</label>
              <input
                type="text"
                required
                value={nombreCliente}
                onChange={(e) => setNombreCliente(e.target.value)}
                className={inputClase}
                placeholder="Ej. Juan Pérez"
              />
            </div>
            <div>
              <label className={labelClase}>Nombre del negocio</label>
              <input
                type="text"
                required
                value={nombreNegocio}
                onChange={(e) => setNombreNegocio(e.target.value)}
                className={inputClase}
                placeholder="Ej. Abarrotes El Sol"
              />
            </div>
          </div>
        </Seccion>

        <Seccion icon={MapPin} titulo="Domicilio">
          <div>
            <label className={labelClase}>Domicilio</label>
            <input
              type="text"
              required
              value={domicilio}
              onChange={(e) => setDomicilio(e.target.value)}
              className={inputClase}
              placeholder="Ej. Blvd. Tepic-Xalisco 111, Huertas de Matatipac, 63787 Xalisco, Nay."
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClase}>Entre calles (opcional)</label>
              <input
                type="text"
                value={entreCalles}
                onChange={(e) => setEntreCalles(e.target.value)}
                className={inputClase}
                placeholder="Ej. Entre Av. Insurgentes y Calle Hidalgo"
              />
            </div>
            <div>
              <label className={labelClase}>Referencias de domicilio (opcional)</label>
              <input
                type="text"
                value={referenciasDomicilio}
                onChange={(e) => setReferenciasDomicilio(e.target.value)}
                className={inputClase}
                placeholder="Ej. Frente a la farmacia, portón negro"
              />
            </div>
          </div>
        </Seccion>

        <Seccion icon={Phone} titulo="Contacto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClase}>Nombre de contacto (opcional)</label>
              <input
                type="text"
                value={nombreContacto}
                onChange={(e) => setNombreContacto(e.target.value)}
                className={inputClase}
              />
            </div>
            <div>
              <label className={labelClase}>Teléfono de contacto</label>
              <input
                type="tel"
                required
                value={telefonoContacto}
                onChange={(e) => setTelefonoContacto(e.target.value)}
                className={inputClase}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClase}>Teléfono de referencia (opcional)</label>
              <input
                type="tel"
                value={telefonoReferencia}
                onChange={(e) => setTelefonoReferencia(e.target.value)}
                className={inputClase}
              />
            </div>
            <div>
              <label className={labelClase}>Correo (opcional)</label>
              <input
                type="email"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                className={inputClase}
              />
            </div>
          </div>
        </Seccion>

        <Seccion icon={Wallet} titulo="Comercial">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClase}>Vendedor</label>
              <select
                required
                value={vendedorNombre}
                onChange={(e) => setVendedorNombre(e.target.value)}
                className={`${inputClase} cursor-pointer`}
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
              <label className={labelClase}>Tipo de cliente</label>
              <select
                required
                value={tipoCliente}
                onChange={(e) => setTipoCliente(e.target.value as TipoCliente)}
                className={`${inputClase} cursor-pointer`}
              >
                <option value="">Seleccionar...</option>
                {(Object.entries(ETIQUETA_TIPO_CLIENTE) as [TipoCliente, string][]).map(
                  ([valor, etiqueta]) => (
                    <option key={valor} value={valor}>
                      {etiqueta}
                    </option>
                  ),
                )}
              </select>
            </div>
          </div>
          <div>
            <label className={labelClase}>Notas / observaciones (opcional)</label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={2}
              className={inputClase}
            />
          </div>
        </Seccion>

        <Seccion icon={MapPin} titulo="Ubicación">
          <div>
            <label className={labelClase}>Ubicación de Google Maps</label>
            <input
              type="text"
              required
              value={ubicacionTexto}
              onChange={(e) => setUbicacionTexto(e.target.value)}
              className={inputClase}
              placeholder="Link de Google Maps o coordenadas (19.4326, -99.1332)"
            />
          </div>
        </Seccion>

        <button
          type="submit"
          disabled={guardando}
          className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
        >
          {guardando ? (
            <>
              <Loader2 size={18} className="animate-spin" /> Guardando...
            </>
          ) : altaEditando ? (
            "Actualizar Alta"
          ) : (
            "Guardar Alta"
          )}
        </button>
      </form>
    </div>
  );
}
