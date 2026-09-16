// src/firebase/altasClientesService.ts
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./config";

export type EstatusAltaCliente = "pendiente" | "aprobada" | "rechazada";

export interface AltaClienteNueva {
  nombreNegocio: string;
  domicilio: string;
  referenciasDomicilio: string;
  nombreContacto: string;
  telefonoContacto: string;
  notas: string;
  vendedorNombre: string;
  ubicacionTexto: string;
  posicion: [number, number];
  creadoPorEmail: string;
}

// 1. CREATE
export const agregarAltaClienteFirebase = async (alta: AltaClienteNueva) => {
  try {
    const altasRef = collection(db, "altasClientes");
    const docRef = await addDoc(altasRef, {
      ...alta,
      estatus: "pendiente" as EstatusAltaCliente,
      motivoRechazo: "",
      creadoEn: serverTimestamp(),
      actualizadoEn: serverTimestamp(),
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error("Error al guardar alta de cliente: ", error);
    return { success: false, error };
  }
};

// 2. READ (Traer todas las altas)
export const obtenerAltasClientesFirebase = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, "altasClientes"));
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("Error al obtener altas de clientes: ", error);
    return [];
  }
};

// 3. UPDATE (edición de campos por el admin)
export const actualizarAltaClienteFirebase = async (
  id: string,
  datos: Partial<AltaClienteNueva>,
) => {
  try {
    const altaRef = doc(db, "altasClientes", id);
    await updateDoc(altaRef, { ...datos, actualizadoEn: serverTimestamp() });
    return { success: true };
  } catch (error) {
    console.error("Error al actualizar alta de cliente: ", error);
    return { success: false, error };
  }
};

// 4. UPDATE (aprobar / rechazar)
export const actualizarEstatusAltaClienteFirebase = async (
  id: string,
  estatus: EstatusAltaCliente,
  motivoRechazo?: string,
) => {
  try {
    const altaRef = doc(db, "altasClientes", id);
    await updateDoc(altaRef, {
      estatus,
      motivoRechazo: motivoRechazo ?? "",
      actualizadoEn: serverTimestamp(),
    });
    return { success: true };
  } catch (error) {
    console.error("Error al actualizar estatus de alta de cliente: ", error);
    return { success: false, error };
  }
};
