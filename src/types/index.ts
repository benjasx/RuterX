// src/types/index.ts
export interface Vendedor {
  id: string;
  nombre: string;
  correo: string;
  telefono: string;
  rutas: string[];
}

export interface Ubicacion {
  id: string;
  nombre: string;
  posicion: [number, number];
  descripcion: string;
  ruta: string;
  vendedor: string; // Nombre del vendedor
}
