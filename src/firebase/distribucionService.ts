import {
  collection,
  query,
  where,
  getDocs,
  setDoc,
  doc,
  onSnapshot, // 🚀 Importamos onSnapshot para el tiempo real
} from "firebase/firestore";
import { db } from "./config";

// Obtener la distribución guardada para una fecha específica (Lectura única)
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

// 🚀 NUEVA FUNCIÓN: El "Túnel en vivo" para la Distribución
// Esta función escucha los cambios del documento exacto de la fecha seleccionada
export const suscribirDistribucionFecha = (
  fecha: string,
  callback: (datos: any[]) => void,
) => {
  const docRef = doc(db, "distribucion_diaria", fecha);

  // onSnapshot no gasta lecturas a lo loco, solo reacciona cuando alguien modifica este documento
  const unsubscribe = onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      callback(docSnap.data().filas || []);
    } else {
      callback([]); // Si no hay ruta asignada aún hoy, regresa un arreglo vacío
    }
  });

  // Retornamos esta función para que React pueda "apagar" el túnel si cierras la pantalla
  return unsubscribe;
};

// 🚀 NUEVA FUNCIÓN: Obtener distribución por rango de fechas (Para la Nómina)
export const obtenerDistribucionPorRango = async (
  fechaInicio: string,
  fechaFin: string,
) => {
  try {
    const q = query(
      collection(db, "distribucion_diaria"),
      where("fecha", ">=", fechaInicio),
      where("fecha", "<=", fechaFin),
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => doc.data());
  } catch (error) {
    console.error("Error al obtener el rango de distribución:", error);
    return [];
  }
};
