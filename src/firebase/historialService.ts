import {
  doc,
  setDoc,
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "./config"; // Asegúrate de que la ruta a tu config sea correcta

// Función para GUARDAR (la que ya tenías)
export const guardarHistorialFirebase = async (
  fecha: string,
  datosProcesados: any[],
) => {
  try {
    const docRef = doc(db, "historial_salidas", fecha);
    const viajesValidos = datosProcesados.filter(
      (f) => f.chofer && f.chofer.trim() !== "" && f.chofer !== "-",
    );
    await setDoc(docRef, {
      fecha: fecha,
      viajes: viajesValidos,
      actualizadoEn: new Date().toISOString(),
    });
    return { success: true };
  } catch (error) {
    console.error("Error al guardar historial en la nube:", error);
    return { success: false };
  }
};

// Función PARA LEER EL HISTORIAL COMPLETO (la que ya tenías)
export const obtenerHistorialFirebase = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, "historial_salidas"));
    const historial: any[] = [];

    querySnapshot.forEach((doc) => {
      historial.push({ id: doc.id, ...doc.data() });
    });

    return historial;
  } catch (error) {
    console.error("Error al obtener el historial de firebase:", error);
    return [];
  }
};

// 🚀 NUEVA FUNCIÓN OPTIMIZADA PARA LEER POR RANGO DE FECHAS
export const obtenerHistorialPorRangoFirebase = async (
  fechaInicio: string,
  fechaFin: string,
) => {
  try {
    // Usamos query y where para filtrar directo en los servidores de Google
    const consulta = query(
      collection(db, "historial_salidas"), // Usando tu nombre real de colección
      where("fecha", ">=", fechaInicio),
      where("fecha", "<=", fechaFin),
    );

    const querySnapshot = await getDocs(consulta);
    const datosFiltrados: any[] = [];

    querySnapshot.forEach((doc) => {
      datosFiltrados.push({ id: doc.id, ...doc.data() });
    });

    return datosFiltrados;
  } catch (error) {
    console.error("Error al obtener el historial por rango:", error);
    return [];
  }
};
