// src/firebase/ajustesNominaService.ts
import { db } from "./config";
import { doc, getDoc, setDoc } from "firebase/firestore";

export interface AjustesNomina {
  comisionChofer: number;
  comisionAyudante: number;
  viaticosRutas: Record<string, number>; // Ej: { "MAZATLAN": 300, "VALLARTA": 190 }
}

const DOCUMENTO_REF = doc(db, "configuracion", "ajustes_nomina");

export const obtenerAjustesNomina = async (): Promise<AjustesNomina> => {
  try {
    const docSnap = await getDoc(DOCUMENTO_REF);
    if (docSnap.exists()) {
      return docSnap.data() as AjustesNomina;
    } else {
      // Si es la primera vez y no existe en la nube, devolvemos tus valores por defecto
      return {
        comisionChofer: 0.00075,
        comisionAyudante: 0.00035,
        viaticosRutas: {},
      };
    }
  } catch (error) {
    console.error("Error al obtener ajustes de nómina:", error);
    return {
      comisionChofer: 0.00075,
      comisionAyudante: 0.00035,
      viaticosRutas: {},
    };
  }
};

export const guardarAjustesNomina = async (
  ajustes: AjustesNomina,
): Promise<boolean> => {
  try {
    await setDoc(DOCUMENTO_REF, ajustes);
    return true;
  } catch (error) {
    console.error("Error al guardar ajustes de nómina:", error);
    return false;
  }
};
