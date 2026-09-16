import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { Loader2 } from "lucide-react";
import { db } from "../firebase/config";
import FormularioAltaCliente from "./FormularioAltaCliente";
import DirectorioAltasClientes, {
  type AltaCliente,
} from "./DirectorioAltasClientes";
import { obtenerAltasClientesFirebase } from "../firebase/altasClientesService";
import { notificarExito, notificarAdvertencia } from "../utils/notificaciones";

interface AltasClientesProps {
  esAdmin: boolean;
  usuarioEmail: string;
}

export default function AltasClientes({
  esAdmin,
  usuarioEmail,
}: AltasClientesProps) {
  const queryClient = useQueryClient();

  const { data: altas = [], isLoading } = useQuery({
    queryKey: ["altasClientes", esAdmin ? "todas" : usuarioEmail],
    queryFn: () =>
      obtenerAltasClientesFirebase(esAdmin ? undefined : usuarioEmail),
  });

  // Mientras el vendedor tenga esta sección abierta, un listener de Firestore
  // detecta en vivo si el admin aprobó/rechazó una de sus altas y avisa con un
  // toast (mismo patrón que RuterMapas.tsx usa para la cuenta deshabilitada).
  const estatusPrevioRef = useRef<Record<string, string>>({});

  useEffect(() => {
    if (esAdmin || !usuarioEmail) return;

    const key = ["altasClientes", usuarioEmail];
    const q = query(
      collection(db, "altasClientes"),
      where("creadoPorEmail", "==", usuarioEmail),
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(
        (d) => ({ id: d.id, ...d.data() }) as AltaCliente,
      );

      docs.forEach((alta) => {
        const anterior = estatusPrevioRef.current[alta.id];
        if (anterior && anterior !== alta.estatus) {
          if (alta.estatus === "aprobada") {
            notificarExito(`Tu alta de "${alta.nombreCliente}" fue aprobada`);
          } else if (alta.estatus === "rechazada") {
            notificarAdvertencia(
              `Tu alta de "${alta.nombreCliente}" fue rechazada${
                alta.motivoRechazo ? `: ${alta.motivoRechazo}` : ""
              }`,
            );
          }
        }
        estatusPrevioRef.current[alta.id] = alta.estatus;
      });

      queryClient.setQueryData(key, docs);
    });

    return () => unsub();
  }, [esAdmin, usuarioEmail, queryClient]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  if (esAdmin) {
    return (
      <DirectorioAltasClientes
        altas={altas as AltaCliente[]}
        esAdmin
        usuarioEmail={usuarioEmail}
      />
    );
  }

  return (
    <div className="flex flex-col xl:flex-row gap-6 w-full">
      <FormularioAltaCliente usuarioEmail={usuarioEmail} />
      <div className="flex-1 w-full h-full min-h-125">
        <DirectorioAltasClientes
          altas={altas as AltaCliente[]}
          esAdmin={false}
          usuarioEmail={usuarioEmail}
        />
      </div>
    </div>
  );
}
