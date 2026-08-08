import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./config";

// 1. Guardar un nuevo chofer en la colección "choferes"
export const agregarChoferFirebase = async (datosChofer: {
  nombre: string;
  email: string;
  telefono: string;
  tipo: "Chofer" | "Auxiliar";
}) => {
  try {
    const docRef = await addDoc(collection(db, "choferes"), {
      nombre: datosChofer.nombre,
      email: datosChofer.email,
      telefono: datosChofer.telefono,
      tipo: datosChofer.tipo,
      fecha_creacion: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error("Error al agregar chofer:", error);
    throw error;
  }
};

// 2. Obtener la lista de choferes para la tabla y el select del mapa
export const obtenerChoferesFirebase = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, "choferes"));
    const choferes: any[] = [];

    querySnapshot.forEach((documento) => {
      choferes.push({ id: documento.id, ...documento.data() });
    });

    // Respaldo de seguridad si la colección está vacía
    if (choferes.length === 0) {
      return [
        {
          id: "default-1",
          nombre: "Chofer Principal",
          email: "chofer1@ruterx.com",
          tipo: "Chofer",
        },
        {
          id: "default-2",
          nombre: "Chofer Secundario",
          email: "chofer2@ruterx.com",
          tipo: "Chofer",
        },
      ];
    }

    return choferes;
  } catch (error) {
    console.error("Error al obtener choferes:", error);
    return [
      {
        id: "default-1",
        nombre: "Chofer Principal",
        email: "chofer1@ruterx.com",
        tipo: "Chofer",
      },
      {
        id: "default-2",
        nombre: "Chofer Secundario",
        email: "chofer2@ruterx.com",
        tipo: "Chofer",
      },
    ];
  }
};

// 3. Eliminar un chofer si es necesario
export const eliminarChoferFirebase = async (id: string) => {
  try {
    await deleteDoc(doc(db, "choferes", id));
  } catch (error) {
    console.error("Error al eliminar chofer:", error);
    throw error;
  }
};
