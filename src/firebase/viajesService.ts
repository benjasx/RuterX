import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  getDoc,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "./config";

export const asignarViajeFirebase = async (datosViaje: {
  choferEmail: string;
  fechaSalida: string;
  rutaNombre: string;
  clientes: any[];
  rutaCarretera?: [number, number][] | null;
}) => {
  try {
    // 🚀 Convertimos las coordenadas de la carretera a un formato plano de objetos {lat, lng}
    // para evitar el error de arreglos anidados en Firebase.
    const carreteraPlana = datosViaje.rutaCarretera
      ? datosViaje.rutaCarretera.map((coord) => ({
          lat: coord[0],
          lng: coord[1],
        }))
      : null;

    const docRef = await addDoc(collection(db, "viajes_activos"), {
      chofer_email: datosViaje.choferEmail,
      fecha_salida: datosViaje.fechaSalida,
      ruta_nombre: datosViaje.rutaNombre,
      estado: "pendiente",
      fecha_creacion: serverTimestamp(),
      ruta_carretera: carreteraPlana, // Guardamos la versión plana segura
      clientes: datosViaje.clientes.map((c, index) => ({
        id: c.id,
        nombre: c.nombre,
        descripcion: c.descripcion,
        posicion: c.posicion,
        orden: index + 1,
        estado_entrega: "pendiente",
        hora_entrega: null,
      })),
    });
    return docRef.id;
  } catch (error) {
    console.error("Error al asignar el viaje:", error);
    throw error;
  }
};

// (Asegúrate de importar orderBy y limit si no los tenías)
export const obtenerViajeActivoChofer = async (
  choferEmail: string,
  hoyStr: string,
) => {
  try {
    const q = query(
      collection(db, "viajes_activos"),
      // 👇 AQUI ESTA LA CORRECCIÓN: usamos chofer_email y fecha_salida
      where("chofer_email", "==", choferEmail),
      where("fecha_salida", ">=", hoyStr),
      orderBy("fecha_salida", "asc"),
      limit(1),
    );

    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return null;
    }

    const docViaje = querySnapshot.docs[0];
    return { id: docViaje.id, ...docViaje.data() };
  } catch (error) {
    console.error("Error al obtener el viaje del chofer:", error);
    throw error;
  }
};

export const actualizarEstadoEntregaFirebase = async (
  viajeId: string,
  clienteId: string,
  nuevoEstado: "entregado" | "cancelado" | "no_entregado",
) => {
  try {
    const viajeRef = doc(db, "viajes_activos", viajeId);
    const viajeSnap = await getDoc(viajeRef);

    if (!viajeSnap.exists()) throw new Error("Viaje no encontrado");

    const data = viajeSnap.data();
    const horaActual = new Date().toLocaleTimeString("es-MX", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    const clientesActualizados = data.clientes.map((c: any) => {
      if (c.id === clienteId) {
        return {
          ...c,
          estado_entrega: nuevoEstado,
          hora_entrega: horaActual,
        };
      }
      return c;
    });

    await updateDoc(viajeRef, { clientes: clientesActualizados });
    return { estado: nuevoEstado, hora: horaActual };
  } catch (error) {
    console.error("Error al actualizar la entrega:", error);
    throw error;
  }
};

// Finalizar el viaje completo
export const finalizarViajeFirebase = async (
  viajeId: string,
  datosCierre: {
    motivo: string;
    rutaReal: string;
    unidad: string;
    foliosNoEmbarcados: string;
  },
) => {
  try {
    const viajeRef = doc(db, "viajes_activos", viajeId);
    const horaFinalizacion = new Date().toLocaleTimeString("es-MX", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    await updateDoc(viajeRef, {
      estado: "finalizado",
      motivo_finalizacion: datosCierre.motivo,
      ruta_real_realizada: datosCierre.rutaReal,
      unidad_utilizada: datosCierre.unidad,
      folios_no_embarcados: datosCierre.foliosNoEmbarcados || "Ninguno",
      hora_finalizacion: horaFinalizacion,
    });
  } catch (error) {
    console.error("Error al finalizar el viaje:", error);
    throw error;
  }
};

// Iniciar el viaje (Guardar hora de inicio)
export const iniciarViajeFirebase = async (viajeId: string) => {
  try {
    const viajeRef = doc(db, "viajes_activos", viajeId);
    const horaInicio = new Date().toLocaleTimeString("es-MX", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    await updateDoc(viajeRef, {
      hora_inicio: horaInicio,
    });
  } catch (error) {
    console.error("Error al iniciar el viaje:", error);
    throw error;
  }
};
