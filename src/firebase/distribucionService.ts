import {
  collection,
  query,
  where,
  getDocs,
  setDoc,
  doc,
} from "firebase/firestore";
import { db } from "./config";

// Obtener la distribución guardada para una fecha específica
export const obtenerDistribucionPorFecha = async (fecha: string) => {
  try {
    const q = query(
      collection(db, "distribucion_diaria"),
      where("fecha", "==", fecha),
    );
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) return [];

    // Devolvemos las filas guardadas de esa fecha
    const docData = querySnapshot.docs[0].data();
    return docData.filas || [];
  } catch (error) {
    console.error("Error al obtener la distribución:", error);
    return [];
  }
};

// Guardar la tabla completa de distribución para una fecha
export const guardarDistribucionFecha = async (fecha: string, filas: any[]) => {
  try {
    // Usamos la fecha como ID del documento (ej. "2026-08-09") para sobreescribir o crear fácil
    const docRef = doc(db, "distribucion_diaria", fecha);
    await setDoc(docRef, {
      fecha,
      filas,
      actualizado_en: new Date(),
    });
  } catch (error) {
    console.error("Error al guardar la distribución:", error);
    throw error;
  }
};
