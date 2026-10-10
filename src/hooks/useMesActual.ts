import { useEffect, useState } from "react";

// Mes local del equipo (0–11). Se recalcula al volver a la pestaña, por si la sesión
// estuvo abierta al cruzar de mes. setState con el mismo valor no vuelve a renderizar.
export const useMesActual = () => {
  const [mes, setMes] = useState(() => new Date().getMonth());

  useEffect(() => {
    const actualizar = () => {
      if (document.visibilityState === "visible") setMes(new Date().getMonth());
    };
    document.addEventListener("visibilitychange", actualizar);
    return () => document.removeEventListener("visibilitychange", actualizar);
  }, []);

  return mes;
};
