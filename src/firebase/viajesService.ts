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
  onSnapshot,
} from "firebase/firestore";
import { db } from "./config";

export const asignarViajeFirebase = async (datosViaje: {
  choferEmail: string;
  fechaSalida: string;
  rutaNombre: string;
  rutaBase?: string;
  clientes: any[];
  rutaCarretera?: [number, number][] | null;
  unidad?: string;
}) => {
  try {
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
      ruta_base: datosViaje.rutaBase || datosViaje.rutaNombre,
      unidad_utilizada: datosViaje.unidad || "",
      estado: "pendiente",
      fecha_creacion: serverTimestamp(),
      ruta_carretera: carreteraPlana,
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

export const actualizarViajeFirebase = async (
  viajeId: string,
  datosViaje: {
    choferEmail: string;
    fechaSalida: string;
    rutaNombre: string;
    rutaBase?: string;
    clientes: any[];
    rutaCarretera?: [number, number][] | null;
    unidad?: string;
  },
) => {
  try {
    const viajeRef = doc(db, "viajes_activos", viajeId);

    const carreteraPlana = datosViaje.rutaCarretera
      ? datosViaje.rutaCarretera.map((coord) => ({
          lat: coord[0],
          lng: coord[1],
        }))
      : null;

    await updateDoc(viajeRef, {
      chofer_email: datosViaje.choferEmail,
      fecha_salida: datosViaje.fechaSalida,
      ruta_nombre: datosViaje.rutaNombre,
      ruta_base: datosViaje.rutaBase || datosViaje.rutaNombre,
      unidad_utilizada: datosViaje.unidad || "",
      ruta_carretera: carreteraPlana,
      clientes: datosViaje.clientes.map((c, index) => ({
        id: c.id,
        nombre: c.nombre,
        descripcion: c.descripcion,
        posicion: c.posicion,
        orden: index + 1,
        estado_entrega: c.estado_entrega || "pendiente",
        hora_entrega: c.hora_entrega || null,
      })),
    });
  } catch (error) {
    console.error("Error al actualizar el viaje:", error);
    throw error;
  }
};

export const obtenerViajeActivoChofer = async (
  choferEmail: string,
  hoyStr: string,
) => {
  try {
    const q = query(
      collection(db, "viajes_activos"),
      where("chofer_email", "==", choferEmail),
      where("fecha_salida", ">=", hoyStr),
      orderBy("fecha_salida", "asc"),
      limit(1),
    );
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) return null;
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
        return { ...c, estado_entrega: nuevoEstado, hora_entrega: horaActual };
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

export const iniciarViajeFirebase = async (viajeId: string) => {
  try {
    const viajeRef = doc(db, "viajes_activos", viajeId);
    const horaInicio = new Date().toLocaleTimeString("es-MX", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    await updateDoc(viajeRef, { hora_inicio: horaInicio });
  } catch (error) {
    console.error("Error al iniciar el viaje:", error);
    throw error;
  }
};

export const obtenerViajesDelDia = async (fecha: string) => {
  try {
    const q = query(
      collection(db, "viajes_activos"),
      where("fecha_salida", "==", fecha),
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error al obtener los viajes del día:", error);
    throw error;
  }
};

// Túnel en vivo de los viajes del día: reacciona solo cuando algún viaje
// de "fecha" cambia, sin necesidad de repreguntar por polling.
export const suscribirViajesDelDia = (
  fecha: string,
  callback: (viajes: any[]) => void,
) => {
  const q = query(
    collection(db, "viajes_activos"),
    where("fecha_salida", "==", fecha),
  );

  const unsubscribe = onSnapshot(q, (querySnapshot) => {
    callback(
      querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
    );
  });

  return unsubscribe;
};
