import type { Vendedor } from "../types";

export const listaVendedores: Vendedor[] = [
  {
    id: "v-001",
    nombre: "Benjamin R-2",
    correo: "benjamin@ruterx.com",
    telefono: "311-123-4567",
    rutas: ["tlmk", "local", "santiago"],
  },
  {
    id: "v-002",
    nombre: "Carlos López",
    correo: "carlos@ruterx.com",
    telefono: "311-987-6543",
    rutas: ["ixatlan", "tecuala"],
  },
  {
    id: "v-003",
    nombre: "María García",
    correo: "maria@ruterx.com",
    telefono: "311-234-5678",
    rutas: ["moroleón", "salvatierra"],
  },
  {
    id: "v-004",
    nombre: "Juan Martínez",
    correo: "juan@ruterx.com",
    telefono: "311-345-6789",
    rutas: ["léon", "guanajuato"],
  },
  {
    id: "v-005",
    nombre: "Rosa Pérez",
    correo: "rosa@ruterx.com",
    telefono: "311-456-7890",
    rutas: ["acámbaro", "yuriria"],
  },
  {
    id: "v-006",
    nombre: "David Sánchez",
    correo: "david@ruterx.com",
    telefono: "311-567-8901",
    rutas: ["dolores", "san luis de la paz"],
  },
  {
    id: "v-007",
    nombre: "Laura Rodríguez",
    correo: "laura@ruterx.com",
    telefono: "311-678-9012",
    rutas: ["irapuato", "comunidad"],
  },
  {
    id: "v-008",
    nombre: "Roberto Hernández",
    correo: "roberto@ruterx.com",
    telefono: "311-789-0123",
    rutas: ["silao", "abasolo"],
  },
];

// Esto es lo que usarán tus formularios para los selects
export const NOMBRES_VENDEDORES = listaVendedores.map((v) => v.nombre);
