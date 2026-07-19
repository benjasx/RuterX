// src/firebase/rutasService.ts
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  getDocs,
} from "firebase/firestore";
import { db } from "./config";

export interface Ruta {
  id: string;
  nombre: string;
}

// Obtener todas las rutas
export const obtenerRutasFirebase = async (): Promise<Ruta[]> => {
  const snapshot = await getDocs(collection(db, "rutas"));
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    nombre: doc.data().nombre as string,
  }));
};

// Agregar nueva ruta
export const agregarRutaFirebase = async (nombre: string) => {
  try {
    const docRef = await addDoc(collection(db, "rutas"), { nombre });
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error("Error al agregar ruta:", error);
    return { success: false, error };
  }
};

// Eliminar ruta
export const eliminarRutaFirebase = async (id: string) => {
  try {
    await deleteDoc(doc(db, "rutas", id));
    return { success: true };
  } catch (error) {
    console.error("Error al eliminar ruta:", error);
    return { success: false, error };
  }
};
