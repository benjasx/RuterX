import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import DirectorioClientes from "./DirectorioClientes";
import FormularioCliente from "./FormularioCliente";
import type { Vendedor as DatosVendedor } from "../types/index";
import {
  agregarClienteFirebase,
  actualizarClienteFirebase,
  eliminarClienteFirebase,
} from "../firebase/clientesService";
import {
  notificarExito,
  notificarError,
  notificarAdvertencia,
  confirmar,
} from "../utils/notificaciones";

interface PanelClientesProps {
  vendedores: DatosVendedor[];
  listaClientes: any[];
  setListaClientes: React.Dispatch<React.SetStateAction<any[]>>;
  rutas: any[];
}

// 🚀 PROTECCIÓN DE COORDENADAS: rechaza datos que harían tronar el mapa
// (no numéricos, fuera del rango válido de lat/lng, o claramente mal
// capturados) antes de que lleguen a Firebase. El rango de México es una
// validación adicional pensada para atrapar el error más común: escribir la
// longitud sin el signo negativo.
const RANGO_MEXICO = { latMin: 14, latMax: 33, lngMin: -118, lngMax: -86 };

function validarCoordenadas(latStr: string, lngStr: string): string | null {
  if (latStr.trim() === "" || lngStr.trim() === "") {
    return "Debes capturar latitud y longitud.";
  }

  const lat = Number(latStr);
  const lng = Number(lngStr);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return "Latitud y longitud deben ser números válidos.";
  }
  if (lat < -90 || lat > 90) {
    return "La latitud debe estar entre -90 y 90.";
  }
  if (lng < -180 || lng > 180) {
    return "La longitud debe estar entre -180 y 180.";
  }
  if (lat === 0 && lng === 0) {
    return "Latitud y longitud no pueden ser ambas 0. Revisa los datos capturados.";
  }
  if (
    lat < RANGO_MEXICO.latMin ||
    lat > RANGO_MEXICO.latMax ||
    lng < RANGO_MEXICO.lngMin ||
    lng > RANGO_MEXICO.lngMax
  ) {
    return "Las coordenadas quedan fuera del rango esperado para México. Revisa que la longitud tenga el signo negativo (ej. -104.890221) y que no hayas invertido latitud y longitud.";
  }
  return null;
}

export default function PanelClientes({
  vendedores,
  listaClientes,
  setListaClientes,
  rutas,
}: PanelClientesProps) {
  const queryClient = useQueryClient();

  const [nombre, setNombre] = useState("");
  const [domicilio, setDomicilio] = useState("");
  const [vendedorSeleccionado, setVendedorSeleccionado] = useState("");
  const [ruta, setRuta] = useState("");
  const [latitud, setLatitud] = useState("");
  const [longitud, setLongitud] = useState("");

  const [idEditando, setIdEditando] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const limpiarFormulario = () => {
    setIdEditando(null);
    setNombre("");
    setDomicilio("");
    setVendedorSeleccionado("");
    setRuta("");
    setLatitud("");
    setLongitud("");
  };

  const handleGuardarCliente = async (e: React.FormEvent) => {
    e.preventDefault();

    const errorCoordenadas = validarCoordenadas(latitud, longitud);
    if (errorCoordenadas) {
      notificarAdvertencia(errorCoordenadas);
      return;
    }

    setGuardando(true);

    const datosCliente = {
      nombre,
      descripcion: domicilio,
      vendedor: vendedorSeleccionado,
      ruta,
      posicion: [Number(latitud), Number(longitud)] as [number, number],
    };

    try {
      if (idEditando) {
        const res = await actualizarClienteFirebase(idEditando, datosCliente);
        if (res.success) {
          setListaClientes((prev) =>
            prev.map((c) =>
              c.id === idEditando ? { ...c, ...datosCliente } : c,
            ),
          );
          queryClient.invalidateQueries({ queryKey: ["clientes"] });
          notificarExito("Cliente actualizado correctamente");
          limpiarFormulario();
        }
      } else {
        const res = await agregarClienteFirebase(datosCliente);
        if (res.success && res.id) {
          setListaClientes((prev) => [
            ...prev,
            { ...datosCliente, id: res.id },
          ]);
          queryClient.invalidateQueries({ queryKey: ["clientes"] });
          notificarExito("¡Cliente registrado en la nube!");
          limpiarFormulario();
        }
      }
    } catch (error) {
      notificarError("Ocurrió un error al procesar la solicitud.");
    } finally {
      setGuardando(false);
    }
  };

  const handleEditar = (cliente: any) => {
    setIdEditando(cliente.id);
    setNombre(cliente.nombre || "");
    setDomicilio(cliente.descripcion || "");
    setVendedorSeleccionado(cliente.vendedor || "");
    setRuta(cliente.ruta || "");
    setLatitud(cliente.posicion?.[0]?.toString() || "");
    setLongitud(cliente.posicion?.[1]?.toString() || "");
  };

  const handleEliminar = async (id: string) => {
    const ok = await confirmar({
      mensaje: "¿Seguro que deseas eliminar este cliente?",
      peligroso: true,
      textoConfirmar: "Eliminar",
    });
    if (ok) {
      const res = await eliminarClienteFirebase(id);
      if (res.success) {
        setListaClientes((prev) => prev.filter((c) => c.id !== id));
        queryClient.invalidateQueries({ queryKey: ["clientes"] });
        if (idEditando === id) limpiarFormulario();
      }
    }
  };

  return (
    <div className="flex flex-col xl:flex-row gap-6 w-full">
      <FormularioCliente
        idEditando={idEditando}
        nombre={nombre}
        setNombre={setNombre}
        domicilio={domicilio}
        setDomicilio={setDomicilio}
        vendedorSeleccionado={vendedorSeleccionado}
        setVendedorSeleccionado={setVendedorSeleccionado}
        ruta={ruta}
        setRuta={setRuta}
        latitud={latitud}
        setLatitud={setLatitud}
        longitud={longitud}
        setLongitud={setLongitud}
        vendedores={vendedores}
        rutas={rutas}
        guardando={guardando}
        onSubmit={handleGuardarCliente}
        onCancelarEdicion={limpiarFormulario}
      />

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
