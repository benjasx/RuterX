// src/firebase/ajustesRentabilidadService.ts
import { db } from "./config";
import { doc, getDoc, setDoc } from "firebase/firestore";

export interface AjustesRentabilidad {
  salarioDiarioChofer: number; // sueldo base DIARIO, directo (sin dividir)
  salarioDiarioAyudante: number; // aplica a Auxiliar 1 y 2
  salarioDiarioVendedor: number;
  comisionVendedor: number; // % sobre la venta, ej. 0.02 = 2%
  margenPct: number; // % de margen fijo usado para Margen Bruto $
  metaRentablePct: number; // Rentabilidad % >= esto -> "RENTABLE"
  metaRevisarPct: number; // Rentabilidad % >= esto (y < metaRentablePct) -> "REVISAR"
  costoPorKmUnidades: Record<string, number>; // clave = id de documento en "unidades"
  kmPromedioRutas: Record<string, number>; // clave = nombre de ruta en mayúsculas
  permisoDescargaRutas: Record<string, number>; // clave = nombre de ruta en mayúsculas
}

const DEFAULTS: AjustesRentabilidad = {
  salarioDiarioChofer: 357.14,
  salarioDiarioAyudante: 278.8,
  salarioDiarioVendedor: 0,
  comisionVendedor: 0.02,
  margenPct: 0,
  metaRentablePct: 6,
  metaRevisarPct: 5,
  costoPorKmUnidades: {},
  kmPromedioRutas: {},
  permisoDescargaRutas: {},
};

const DOCUMENTO_REF = doc(db, "configuracion", "ajustes_rentabilidad");

export const obtenerAjustesRentabilidad =
  async (): Promise<AjustesRentabilidad> => {
    try {
      const docSnap = await getDoc(DOCUMENTO_REF);
      if (docSnap.exists()) {
        return { ...DEFAULTS, ...docSnap.data() } as AjustesRentabilidad;
      }
      return DEFAULTS;
    } catch (error) {
      console.error("Error al obtener ajustes de rentabilidad:", error);
      return DEFAULTS;
    }
  };

export const guardarAjustesRentabilidad = async (
  ajustes: AjustesRentabilidad,
): Promise<boolean> => {
  try {
    await setDoc(DOCUMENTO_REF, ajustes);
    return true;
  } catch (error) {
    console.error("Error al guardar ajustes de rentabilidad:", error);
    return false;
  }
};
