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

export type DiaProgramacion =
  | "Sábado"
  | "Lunes"
  | "Martes"
  | "Miércoles"
  | "Jueves"
  | "Viernes";

export const DIAS_PROGRAMACION: DiaProgramacion[] = [
  "Sábado",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
];

export interface FilaProgramacionEntrega {
  id?: string;
  dia: DiaProgramacion;
  ruta_nombre: string;
  monto_minimo: number;
  orden: number;
}

// 1. Agregar una fila (ruta + monto mínimo) a un día
export const agregarFilaProgramacionFirebase = async (datosFila: {
  dia: DiaProgramacion;
  ruta_nombre: string;
  monto_minimo: number;
  orden: number;
}) => {
  try {
    const docRef = await addDoc(collection(db, "programacionEntregas"), {
      dia: datosFila.dia,
      ruta_nombre: datosFila.ruta_nombre,
      monto_minimo: datosFila.monto_minimo,
      orden: datosFila.orden,
      fecha_creacion: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error("Error al agregar fila de programación:", error);
    throw error;
  }
};

// 2. Obtener todas las filas de la programación de entregas
export const obtenerProgramacionFirebase = async (): Promise<
  FilaProgramacionEntrega[]
> => {
  try {
    const querySnapshot = await getDocs(collection(db, "programacionEntregas"));
    const filas: FilaProgramacionEntrega[] = [];

    querySnapshot.forEach((documento) => {
      filas.push({ id: documento.id, ...documento.data() } as FilaProgramacionEntrega);
    });

    return filas;
  } catch (error) {
    console.error("Error al obtener la programación de entregas:", error);
    return [];
  }
};

// 3. Actualizar una fila (monto_minimo y/u orden)
export const actualizarFilaProgramacionFirebase = async (
  id: string,
  data: Partial<Pick<FilaProgramacionEntrega, "monto_minimo" | "orden">>,
) => {
  const docRef = doc(db, "programacionEntregas", id);
  await updateDoc(docRef, data);
};

// 4. Eliminar una fila
export const eliminarFilaProgramacionFirebase = async (id: string) => {
  try {
    await deleteDoc(doc(db, "programacionEntregas", id));
  } catch (error) {
    console.error("Error al eliminar fila de programación:", error);
    throw error;
  }
};
