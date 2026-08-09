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
          alert("Cliente actualizado correctamente");
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
          alert("¡Cliente registrado en la nube!");
          limpiarFormulario();
        }
      }
    } catch (error) {
      alert("Ocurrió un error al procesar la solicitud.");
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
    if (window.confirm("¿Seguro que deseas eliminar este cliente?")) {
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
