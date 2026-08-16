// src/firebase/backupService.ts
import { collection, getDocs } from "firebase/firestore";
import { db } from "./config";

// Colecciones conocidas de Firestore (ver firestore.rules).
// El SDK web no tiene listCollections(); a diferencia de respaldar.cjs
// (Admin SDK), aquí hay que enumerarlas a mano.
const COLECCIONES = [
  "clientes",
  "rutas",
  "vendedores",
  "choferes",
  "viajes_activos",
  "asistencias",
  "distribucion_diaria",
  "configuracion",
] as const;

export interface ResumenRespaldo {
  coleccion: string;
  documentos: number;
}

export interface RespaldoFirestore {
  datos: Record<string, Record<string, unknown>>;
  resumen: ResumenRespaldo[];
  fecha: string;
}

export const respaldarTodaLaBaseDatos = async (): Promise<RespaldoFirestore> => {
  const datos: Record<string, Record<string, unknown>> = {};
  const resumen: ResumenRespaldo[] = [];

  const snapshots = await Promise.all(
    COLECCIONES.map((nombre) => getDocs(collection(db, nombre))),
  );

  snapshots.forEach((snapshot, i) => {
    const nombre = COLECCIONES[i];
    const coleccion: Record<string, unknown> = {};
    snapshot.forEach((doc) => {
      coleccion[doc.id] = doc.data();
    });
    datos[nombre] = coleccion;
    resumen.push({ coleccion: nombre, documentos: snapshot.size });
  });

  return { datos, resumen, fecha: new Date().toISOString() };
};
