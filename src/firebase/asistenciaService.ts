import { db } from "./config";
import { doc, getDoc, setDoc } from "firebase/firestore";

export const obtenerAsistenciaPorFecha = async (fecha: string) => {
  try {
    const docRef = doc(db, "asistencias", fecha);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data().registros || [];
    }
    return [];
  } catch (error) {
    console.error("Error al obtener asistencia:", error);
    return [];
  }
};

export const guardarAsistenciaFecha = async (
  fecha: string,
  registros: any[],
) => {
  try {
    const docRef = doc(db, "asistencias", fecha);
    await setDoc(docRef, {
      fecha,
      registros,
      actualizado: new Date().toISOString(),
    });
    return true;
  } catch (error) {
    console.error("Error al guardar asistencia:", error);
    throw error;
  }
};
