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

export interface PlantillaCorreo {
  id?: string;
  nombre: string;
  remitente: string;
  asunto: string;
  cuerpo: string;
  destinatariosDefault: string;
  copiaDefault: string;
}

// 1. Agregar una plantilla nueva
export const agregarPlantillaCorreoFirebase = async (datosPlantilla: {
  nombre: string;
  remitente: string;
  asunto: string;
  cuerpo: string;
  destinatariosDefault: string;
  copiaDefault: string;
}) => {
  try {
    const docRef = await addDoc(collection(db, "plantillasCorreo"), {
      nombre: datosPlantilla.nombre,
      remitente: datosPlantilla.remitente,
      asunto: datosPlantilla.asunto,
      cuerpo: datosPlantilla.cuerpo,
      destinatariosDefault: datosPlantilla.destinatariosDefault,
      copiaDefault: datosPlantilla.copiaDefault,
      fecha_creacion: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error("Error al agregar plantilla de correo:", error);
    throw error;
  }
};

// 2. Obtener todas las plantillas
export const obtenerPlantillasCorreoFirebase = async (): Promise<
  PlantillaCorreo[]
> => {
  try {
    const querySnapshot = await getDocs(collection(db, "plantillasCorreo"));
    const plantillas: PlantillaCorreo[] = [];

    querySnapshot.forEach((documento) => {
      plantillas.push({ id: documento.id, ...documento.data() } as PlantillaCorreo);
    });

    return plantillas;
  } catch (error) {
    console.error("Error al obtener plantillas de correo:", error);
    return [];
  }
};

// 3. Actualizar una plantilla
export const actualizarPlantillaCorreoFirebase = async (
  id: string,
  data: Partial<
    Pick<
      PlantillaCorreo,
      | "nombre"
      | "remitente"
      | "asunto"
      | "cuerpo"
      | "destinatariosDefault"
      | "copiaDefault"
    >
  >,
) => {
  const docRef = doc(db, "plantillasCorreo", id);
  await updateDoc(docRef, data);
};

// 4. Eliminar una plantilla
export const eliminarPlantillaCorreoFirebase = async (id: string) => {
  try {
    await deleteDoc(doc(db, "plantillasCorreo", id));
  } catch (error) {
    console.error("Error al eliminar plantilla de correo:", error);
    throw error;
  }
};
