import { doc, setDoc, collection, getDocs } from "firebase/firestore";
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

// 🚀 NUEVA FUNCIÓN PARA LEER EL HISTORIAL
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
