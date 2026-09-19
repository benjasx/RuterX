import {
  collection,
  addDoc,
  getDocs,
  doc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "./config";

// 1. Guardar una nueva unidad en la colección "unidades"
export const agregarUnidadFirebase = async (datosUnidad: {
  numero: string;
  tipo: string;
  capacidad_kg: number;
  capacidad_m3: number;
}) => {
  try {
    const docRef = await addDoc(collection(db, "unidades"), {
      numero: datosUnidad.numero,
      tipo: datosUnidad.tipo,
      capacidad_kg: datosUnidad.capacidad_kg,
      capacidad_m3: datosUnidad.capacidad_m3,
      estado: "Disponible",
      motivo_fuera_servicio: "",
      fecha_creacion: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error("Error al agregar unidad:", error);
    throw error;
  }
};

// 2. Obtener la lista de unidades para el panel y los selects de unidad
export const obtenerUnidadesFirebase = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, "unidades"));
    const unidades: any[] = [];

    querySnapshot.forEach((documento) => {
      unidades.push({ id: documento.id, ...documento.data() });
    });

    return unidades;
  } catch (error) {
    console.error("Error al obtener unidades:", error);
    return [];
  }
};

// 3. Actualizar datos de una unidad (datos, estado, motivo_fuera_servicio)
export const actualizarUnidadFirebase = async (id: string, data: any) => {
  const docRef = doc(db, "unidades", id);
  await updateDoc(docRef, data);
};
