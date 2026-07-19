// src/firebase/clientesService.ts
import { collection, addDoc } from "firebase/firestore";
import { db } from "./config"; // Importamos la conexión a la base de datos que creaste

export interface ClienteNuevo {
  nombre: string;
  descripcion: string;
  ruta: string;
  vendedor: string;
  posicion: [number, number];
}

export const agregarClienteFirebase = async (cliente: ClienteNuevo) => {
  try {
    // Apuntamos a la colección "clientes" (si no existe, Firestore la crea sola)
    const clientesRef = collection(db, "clientes");

    // addDoc guarda el documento y le genera un ID único automático
    const docRef = await addDoc(clientesRef, cliente);

    console.log("Cliente guardado con ID: ", docRef.id);
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error("Error al guardar el cliente en Firebase: ", error);
    return { success: false, error };
  }
};
