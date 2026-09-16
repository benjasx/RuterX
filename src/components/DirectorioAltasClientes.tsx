import { Fragment, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  ListTodo,
  Pencil,
  MapPin,
  Check,
  X as IconX,
  Loader2,
} from "lucide-react";
import FormularioAltaCliente, {
  type AltaClienteConId,
} from "./FormularioAltaCliente";
import {
  actualizarEstatusAltaClienteFirebase,
  type TipoCliente,
} from "../firebase/altasClientesService";
import { notificarExito, notificarError } from "../utils/notificaciones";

export interface AltaCliente extends AltaClienteConId {
  estatus: "pendiente" | "aprobada" | "rechazada";
  motivoRechazo?: string;
}

interface DirectorioAltasClientesProps {
  altas: AltaCliente[];
  esAdmin: boolean;
  usuarioEmail: string;
}

const ETIQUETA_ESTATUS: Record<AltaCliente["estatus"], string> = {
  pendiente: "Pendiente",
  aprobada: "Aprobada",
  rechazada: "Rechazada",
};

const ESTILO_ESTATUS: Record<AltaCliente["estatus"], string> = {
  pendiente:
    "bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300",
  aprobada:
    "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300",
  rechazada: "bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300",
};

const ETIQUETA_TIPO_CLIENTE: Record<TipoCliente, string> = {
  credito: "Crédito",
  contado: "Contado",
  pagoAnticipado: "Pago anticipado",
};

export default function DirectorioAltasClientes({
  altas = [],
  esAdmin,
  usuarioEmail,
}: DirectorioAltasClientesProps) {
  const queryClient = useQueryClient();

  const [altaEditando, setAltaEditando] = useState<AltaCliente | null>(null);
  const [rechazandoId, setRechazandoId] = useState<string | null>(null);
  const [motivoRechazo, setMotivoRechazo] = useState("");
  const [procesandoId, setProcesandoId] = useState<string | null>(null);

  const altasVisibles = useMemo(() => {
    if (esAdmin) return altas;
    return altas.filter((a) => a.creadoPorEmail === usuarioEmail);
  }, [altas, esAdmin, usuarioEmail]);

  const handleVerUbicacion = (alta: AltaCliente) => {
    const [lat, lng] = alta.posicion || [];
    if (lat == null || lng == null) return;
    window.open(`https://www.google.com/maps?q=${lat},${lng}`, "_blank");
  };

  const handleAprobar = async (id: string) => {
    setProcesandoId(id);
    try {
      const res = await actualizarEstatusAltaClienteFirebase(id, "aprobada");
      if (res.success) {
        queryClient.invalidateQueries({ queryKey: ["altasClientes"] });
        notificarExito("Alta aprobada");
      } else {
        notificarError("Ocurrió un error al aprobar el alta.");
      }
    } finally {
      setProcesandoId(null);
    }
  };

  const handleConfirmarRechazo = async (id: string) => {
    setProcesandoId(id);
    try {
      const res = await actualizarEstatusAltaClienteFirebase(
        id,
        "rechazada",
        motivoRechazo,
      );
      if (res.success) {
        queryClient.invalidateQueries({ queryKey: ["altasClientes"] });
        notificarExito("Alta rechazada");
        setRechazandoId(null);
        setMotivoRechazo("");
      } else {
        notificarError("Ocurrió un error al rechazar el alta.");
      }
    } finally {
      setProcesandoId(null);
    }
  };

  return (
    <div className="w-full bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col h-full">
      <div className="flex items-center gap-3 mb-6 shrink-0">
        <ListTodo className="text-blue-600 dark:text-blue-400" size={24} />
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-3">
          {esAdmin ? "Bandeja de Altas de Clientes" : "Mis Altas de Clientes"}
          <span className="bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 text-xs font-bold px-2.5 py-1 rounded-full border border-blue-200 dark:border-blue-800">
            {altasVisibles.length}
          </span>
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
        <table className="w-full text-left border-collapse min-w-200">
          <thead className="bg-slate-50 dark:bg-slate-900">
            <tr className="border-b border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              <th className="px-6 py-3 text-left">Cliente</th>
              <th className="px-6 py-3 text-left">Contacto</th>
              <th className="px-6 py-3 text-left">Vendedor</th>
              <th className="px-6 py-3 text-left">Tipo</th>
              {esAdmin && <th className="px-6 py-3 text-left">Capturado por</th>}
              <th className="px-6 py-3 text-left">Estatus</th>
              <th className="px-6 py-3 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-100 dark:divide-slate-700">
            {altasVisibles.length > 0 ? (
              altasVisibles.map((alta) => (
                <Fragment key={alta.id}>
                  <tr
                    className="hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-900 dark:text-slate-100">
                        {alta.nombreCliente}
                      </p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {alta.nombreNegocio}
                      </p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">
                        {alta.domicilio}
                      </p>
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-600 dark:text-slate-300">
                      <p>{alta.nombreContacto || "—"}</p>
                      <p className="text-slate-500 dark:text-slate-400">
                        {alta.telefonoContacto}
                      </p>
                      {alta.correo && (
                        <p className="text-slate-500 dark:text-slate-400">
                          {alta.correo}
                        </p>
                      )}
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-600 dark:text-slate-300">
                      {alta.vendedorNombre}
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-600 dark:text-slate-300">
                      {ETIQUETA_TIPO_CLIENTE[alta.tipoCliente]}
                    </td>
                    {esAdmin && (
                      <td className="py-3 px-4 text-sm text-slate-600 dark:text-slate-300">
                        {alta.creadoPorEmail}
                      </td>
                    )}
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${ESTILO_ESTATUS[alta.estatus]}`}
                      >
                        {ETIQUETA_ESTATUS[alta.estatus]}
                      </span>
                      {alta.estatus === "rechazada" && alta.motivoRechazo && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          {alta.motivoRechazo}
                        </p>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <button
                        onClick={() => handleVerUbicacion(alta)}
                        className="text-slate-400 dark:text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors p-2 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-full cursor-pointer"
                        title="Ver ubicación"
                      >
                        <MapPin size={18} />
                      </button>
                      {(esAdmin || alta.estatus !== "aprobada") && (
                        <button
                          onClick={() => setAltaEditando(alta)}
                          className="text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors p-2 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-full cursor-pointer"
                          title="Editar"
                        >
                          <Pencil size={18} />
                        </button>
                      )}
                      {esAdmin && (
                        <>
                          <button
                            onClick={() => handleAprobar(alta.id)}
                            disabled={procesandoId === alta.id}
                            className="text-slate-400 dark:text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors p-2 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-full cursor-pointer disabled:opacity-50"
                            title="Aprobar"
                          >
                            {procesandoId === alta.id ? (
                              <Loader2 size={18} className="animate-spin" />
                            ) : (
                              <Check size={18} />
                            )}
                          </button>
                          <button
                            onClick={() => {
                              setRechazandoId(alta.id);
                              setMotivoRechazo("");
                            }}
                            className="text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 transition-colors p-2 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-full cursor-pointer"
                            title="Rechazar"
                          >
                            <IconX size={18} />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                  {esAdmin && rechazandoId === alta.id && (
                    <tr className="bg-red-50 dark:bg-red-950/20">
                      <td colSpan={esAdmin ? 7 : 6} className="px-4 py-3">
                        <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                          <input
                            type="text"
                            value={motivoRechazo}
                            onChange={(e) => setMotivoRechazo(e.target.value)}
                            placeholder="Motivo de rechazo (opcional)"
                            className="flex-1 w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-red-500 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleConfirmarRechazo(alta.id)}
                              disabled={procesandoId === alta.id}
                              className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50 cursor-pointer"
                            >
                              Confirmar rechazo
                            </button>
                            <button
                              onClick={() => setRechazandoId(null)}
                              className="px-4 py-2 text-slate-500 dark:text-slate-400 text-sm hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))
            ) : (
              <tr>
                <td
                  colSpan={esAdmin ? 7 : 6}
                  className="text-center py-12 text-slate-500 dark:text-slate-400"
                >
                  No hay altas de clientes.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {altaEditando && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="max-h-[90vh] overflow-y-auto">
            <FormularioAltaCliente
              usuarioEmail={usuarioEmail}
              altaEditando={altaEditando}
              onGuardado={() => setAltaEditando(null)}
              onCancelarEdicion={() => setAltaEditando(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
