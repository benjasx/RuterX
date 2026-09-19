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

// 1. Programar un mantenimiento para una unidad
export const agregarMantenimientoFirebase = async (datosMantenimiento: {
  unidad_id: string;
  unidad_numero: string;
  tipo: string;
  descripcion: string;
  taller?: string;
  costo?: number;
  fecha_inicio: string;
  fecha_fin: string;
}) => {
  try {
    const docRef = await addDoc(collection(db, "mantenimientosUnidades"), {
      unidad_id: datosMantenimiento.unidad_id,
      unidad_numero: datosMantenimiento.unidad_numero,
      tipo: datosMantenimiento.tipo,
      descripcion: datosMantenimiento.descripcion,
      taller: datosMantenimiento.taller || "",
      costo: datosMantenimiento.costo || 0,
      fecha_inicio: datosMantenimiento.fecha_inicio,
      fecha_fin: datosMantenimiento.fecha_fin,
      fecha_creacion: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error("Error al agregar mantenimiento:", error);
    throw error;
  }
};

// 2. Obtener el historial completo de mantenimientos (todas las unidades)
export const obtenerMantenimientosFirebase = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, "mantenimientosUnidades"));
    const mantenimientos: any[] = [];

    querySnapshot.forEach((documento) => {
      mantenimientos.push({ id: documento.id, ...documento.data() });
    });

    return mantenimientos;
  } catch (error) {
    console.error("Error al obtener mantenimientos:", error);
    return [];
  }
};

// 3. Editar un mantenimiento ya registrado
export const actualizarMantenimientoFirebase = async (id: string, data: any) => {
  const docRef = doc(db, "mantenimientosUnidades", id);
  await updateDoc(docRef, data);
};

// 4. Eliminar un registro de mantenimiento
export const eliminarMantenimientoFirebase = async (id: string) => {
  try {
    await deleteDoc(doc(db, "mantenimientosUnidades", id));
  } catch (error) {
    console.error("Error al eliminar mantenimiento:", error);
    throw error;
  }
};
