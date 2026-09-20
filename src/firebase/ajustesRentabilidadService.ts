// src/firebase/ajustesRentabilidadService.ts
import { db } from "./config";
import { doc, getDoc, setDoc } from "firebase/firestore";

export interface AjustesRentabilidad {
  salarioSemanalChofer: number;
  salarioSemanalAyudante: number;
  rendimientoKmPorLitro: number;
  gastoLegalDiario: number;
  gastoMantenimientoDiario: number;
  pctPromedioContribucion: number;
  pctPromedioCostoSinImpuesto: number;
  precioDieselDefault: number;
  metaGastoOperativoPct: number;
}

const DEFAULTS: AjustesRentabilidad = {
  salarioSemanalChofer: 2500,
  salarioSemanalAyudante: 1951.6,
  rendimientoKmPorLitro: 4.21,
  gastoLegalDiario: 160.53,
  gastoMantenimientoDiario: 415.88,
  pctPromedioContribucion: 7.4,
  pctPromedioCostoSinImpuesto: 13.22,
  precioDieselDefault: 28.43,
  metaGastoOperativoPct: 40,
};

const DOCUMENTO_REF = doc(db, "configuracion", "ajustes_rentabilidad");

export const obtenerAjustesRentabilidad =
  async (): Promise<AjustesRentabilidad> => {
    try {
      const docSnap = await getDoc(DOCUMENTO_REF);
      if (docSnap.exists()) {
        return docSnap.data() as AjustesRentabilidad;
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
