import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import FormularioAltaCliente from "./FormularioAltaCliente";
import DirectorioAltasClientes from "./DirectorioAltasClientes";
import { obtenerAltasClientesFirebase } from "../firebase/altasClientesService";

interface AltasClientesProps {
  esAdmin: boolean;
  usuarioEmail: string;
}

export default function AltasClientes({
  esAdmin,
  usuarioEmail,
}: AltasClientesProps) {
  const { data: altas = [], isLoading } = useQuery({
    queryKey: ["altasClientes"],
    queryFn: obtenerAltasClientesFirebase,
  });

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
        altas={altas as any}
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
          altas={altas as any}
          esAdmin={false}
          usuarioEmail={usuarioEmail}
        />
      </div>
    </div>
  );
}
