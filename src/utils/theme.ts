// src/utils/theme.ts
const STORAGE_KEY = "modoOscuro";

// Se llama una vez, antes del primer render, para evitar el parpadeo
// de tema claro al recargar con modo oscuro guardado.
export const inicializarTema = () => {
  const activo = localStorage.getItem(STORAGE_KEY) === "true";
  document.documentElement.classList.toggle("dark", activo);
  return activo;
};

export const alternarTema = () => {
  const activo = document.documentElement.classList.toggle("dark");
  localStorage.setItem(STORAGE_KEY, String(activo));
  return activo;
};

export const modoOscuroActivo = () =>
  document.documentElement.classList.contains("dark");
