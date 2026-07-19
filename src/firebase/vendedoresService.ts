// src/firebase/vendedoresService.ts
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  getDocs, // <--- 1. Asegúrate de añadir esto aquí
} from "firebase/firestore";
import { db } from "./config";
import type { Vendedor as DatosVendedor } from "../types/index";

// Usamos Omit para decirle a TypeScript que vamos a mandar un Vendedor,
// pero sin el 'id', ya que Firebase se encargará de generar ese ID único.
export type NuevoVendedor = Omit<DatosVendedor, "id">;

export const obtenerVendedoresFirebase = async (): Promise<DatosVendedor[]> => {
  try {
    const vendedoresRef = collection(db, "vendedores");
    const querySnapshot = await getDocs(vendedoresRef);

    // Convertimos los documentos de Firebase a un formato que tu app entiende
    const vendedores = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as DatosVendedor[];

    return vendedores;
  } catch (error) {
    console.error("Error al obtener vendedores:", error);
    return [];
  }
};

export const agregarVendedorFirebase = async (vendedor: NuevoVendedor) => {
  try {
    // Apuntamos a una nueva colección llamada "vendedores"
    const vendedoresRef = collection(db, "vendedores");

    // Guardamos el documento en Firebase
    const docRef = await addDoc(vendedoresRef, vendedor);

    console.log("Vendedor guardado en Firebase con ID: ", docRef.id);
    // Devolvemos el ID generado por Firebase para poder actualizar la tabla local
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error("Error al guardar el vendedor en Firebase: ", error);
    return { success: false, error };
  }
};

export const actualizarVendedorFirebase = async (
  id: string,
  datos: Partial<NuevoVendedor>,
) => {
  try {
    const vendedorRef = doc(db, "vendedores", id);
    await updateDoc(vendedorRef, datos);
    return { success: true };
  } catch (error) {
    console.error("Error al actualizar vendedor:", error);
    return { success: false, error };
  }
};

export const eliminarVendedorFirebase = async (id: string) => {
  try {
    const vendedorRef = doc(db, "vendedores", id);
    await deleteDoc(vendedorRef);
    return { success: true };
  } catch (error) {
    console.error("Error al eliminar vendedor:", error);
    return { success: false, error };
  }
};
