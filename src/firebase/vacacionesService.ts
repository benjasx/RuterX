import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "./config";

// 1. Registrar un periodo de ausencia (vacaciones, incapacidad, permiso o descanso)
export const agregarVacacionFirebase = async (datosVacacion: {
  chofer_id: string;
  chofer_nombre: string;
  tipo?: string;
  fecha_inicio: string;
  fecha_fin: string;
  dias: number;
  observaciones?: string;
}) => {
  try {
    const docRef = await addDoc(collection(db, "vacaciones"), {
      chofer_id: datosVacacion.chofer_id,
      chofer_nombre: datosVacacion.chofer_nombre,
      tipo: datosVacacion.tipo || "Vacaciones",
      fecha_inicio: datosVacacion.fecha_inicio,
      fecha_fin: datosVacacion.fecha_fin,
      dias: datosVacacion.dias,
      observaciones: datosVacacion.observaciones || "",
      fecha_creacion: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error("Error al agregar vacación:", error);
    throw error;
  }
};

// 2. Obtener todos los periodos de vacaciones registrados
export const obtenerVacacionesFirebase = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, "vacaciones"));
    const vacaciones: any[] = [];

    querySnapshot.forEach((documento) => {
      vacaciones.push({ id: documento.id, ...documento.data() });
    });

    return vacaciones;
  } catch (error) {
    console.error("Error al obtener vacaciones:", error);
    return [];
  }
};

// 3. Eliminar un periodo de vacaciones
export const eliminarVacacionFirebase = async (id: string) => {
  try {
    await deleteDoc(doc(db, "vacaciones", id));
  } catch (error) {
    console.error("Error al eliminar vacación:", error);
    throw error;
  }
};

export const actualizarVacacionFirebase = async (id: string, data: any) => {
  const docRef = doc(db, "vacaciones", id);
  await updateDoc(docRef, data);
};
