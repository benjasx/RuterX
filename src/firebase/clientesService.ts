// src/firebase/clientesService.ts
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db } from "./config";

export interface ClienteNuevo {
  nombre: string;
  descripcion: string;
  ruta: string;
  vendedor: string;
  posicion: [number, number];
}

// 1. CREATE
export const agregarClienteFirebase = async (cliente: ClienteNuevo) => {
  try {
    const clientesRef = collection(db, "clientes");
    const docRef = await addDoc(clientesRef, cliente);
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error("Error al guardar cliente: ", error);
    return { success: false, error };
  }
};

// 2. READ (Traer todos los clientes)
export const obtenerClientesFirebase = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, "clientes"));
    // Mapeamos los datos para incluir el ID del documento
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("Error al obtener clientes: ", error);
    return [];
  }
};

// 3. UPDATE
export const actualizarClienteFirebase = async (
  id: string,
  datos: Partial<ClienteNuevo>,
) => {
  try {
    const clienteRef = doc(db, "clientes", id);
    await updateDoc(clienteRef, datos);
    return { success: true };
  } catch (error) {
    console.error("Error al actualizar cliente: ", error);
    return { success: false, error };
  }
};

// 4. DELETE
export const eliminarClienteFirebase = async (id: string) => {
  try {
    const clienteRef = doc(db, "clientes", id);
    await deleteDoc(clienteRef);
    return { success: true };
  } catch (error) {
    console.error("Error al eliminar cliente: ", error);
    return { success: false, error };
  }
};
