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

export const obtenerViajeActivoChofer = async (
  email: string,
  fechaHoy: string,
) => {
  try {
    const q = query(
      collection(db, "viajes_activos"),
      where("chofer_email", "==", email),
    );

    const querySnapshot = await getDocs(q);
    let viajeEncontrado = null;

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.estado === "pendiente" && data.fecha_salida === fechaHoy) {
        // 🚀 Re-convertimos los objetos planos de vuelta al formato de tuplas [lat, lng] que usa Leaflet
        const carreteraConvertida = data.ruta_carretera
          ? data.ruta_carretera.map(
              (pt: any) => [pt.lat, pt.lng] as [number, number],
            )
          : null;

        viajeEncontrado = {
          id: doc.id,
          ...data,
          ruta_carretera: carreteraConvertida,
        };
      }
    });

    return viajeEncontrado;
  } catch (error) {
    console.error("Error al obtener el viaje del chofer:", error);
    return null;
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
