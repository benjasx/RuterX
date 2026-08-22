// src/firebase/usuariosService.ts
import { initializeApp, deleteApp } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import {
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { db, firebaseConfig } from "./config";
import type { RolUsuario } from "../utils/roles";

export interface UsuarioSistema {
  id: string;
  email: string;
  role: RolUsuario;
  activo: boolean;
}

export const obtenerUsuariosFirebase = async (): Promise<UsuarioSistema[]> => {
  try {
    const usuariosRef = query(collection(db, "usuarios"), orderBy("email"));
    const querySnapshot = await getDocs(usuariosRef);

    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as UsuarioSistema[];
  } catch (error) {
    console.error("Error al obtener usuarios:", error);
    return [];
  }
};

// No hay backend (Cloud Functions requiere plan Blaze), así que el usuario se crea
// con una instancia secundaria de Firebase Auth: eso registra la cuenta nueva sin
// cerrar ni afectar la sesión del admin en la instancia principal.
export const crearUsuarioFirebase = async (datos: {
  email: string;
  password: string;
  role: RolUsuario;
}) => {
  const appSecundaria = initializeApp(firebaseConfig, `secundaria-${Date.now()}`);
  const authSecundaria = getAuth(appSecundaria);

  try {
    const credencial = await createUserWithEmailAndPassword(
      authSecundaria,
      datos.email,
      datos.password,
    );

    await setDoc(doc(db, "usuarios", credencial.user.uid), {
      email: datos.email,
      role: datos.role,
      activo: true,
      creadoEn: serverTimestamp(),
    });

    return { success: true };
  } catch (error) {
    console.error("Error al crear el usuario:", error);
    return { success: false, error };
  } finally {
    await signOut(authSecundaria).catch(() => {});
    await deleteApp(appSecundaria).catch(() => {});
  }
};

export const actualizarRolUsuarioFirebase = async (
  uid: string,
  role: RolUsuario,
) => {
  try {
    await setDoc(doc(db, "usuarios", uid), { role }, { merge: true });
    return { success: true };
  } catch (error) {
    console.error("Error al actualizar el rol del usuario:", error);
    return { success: false, error };
  }
};

// Sin Admin SDK no se puede deshabilitar la cuenta en Firebase Auth: esto solo marca
// "activo" en Firestore, y RuterMapas.tsx cierra la sesión de ese usuario al detectarlo.
export const cambiarEstadoUsuarioFirebase = async (
  uid: string,
  activo: boolean,
) => {
  try {
    await setDoc(doc(db, "usuarios", uid), { activo }, { merge: true });
    return { success: true };
  } catch (error) {
    console.error("Error al cambiar el estado del usuario:", error);
    return { success: false, error };
  }
};
