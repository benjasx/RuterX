const hoyStr = (): string => new Date().toLocaleDateString("sv-SE");

export const TIPOS_MANTENIMIENTO = ["Preventivo", "Correctivo"] as const;
export type TipoMantenimiento = (typeof TIPOS_MANTENIMIENTO)[number];

export interface MantenimientoUnidad {
  id?: string;
  unidad_id: string;
  unidad_numero: string;
  tipo: TipoMantenimiento;
  descripcion: string;
  taller?: string;
  costo?: number;
  fecha_inicio: string;
  fecha_fin: string;
}

export const enMantenimientoHoy = (
  mantenimientosDeLaUnidad: MantenimientoUnidad[],
  hoy: string = hoyStr(),
): boolean =>
  mantenimientosDeLaUnidad.some(
    (m) => m.fecha_inicio <= hoy && hoy <= m.fecha_fin,
  );

// Disponibilidad a mostrar para una unidad en una fecha dada: el manual
// (Fuera de servicio/Baja) gana; si no, si hay un mantenimiento vigente ese
// día es "En mantenimiento"; si no, "Disponible".
export const disponibilidadEfectiva = (
  unidad: { estado?: string },
  mantenimientosDeLaUnidad: MantenimientoUnidad[],
  hoy: string = hoyStr(),
): string => {
  if (unidad.estado === "Fuera de servicio" || unidad.estado === "Baja") {
    return unidad.estado;
  }
  if (enMantenimientoHoy(mantenimientosDeLaUnidad, hoy)) {
    return "En mantenimiento";
  }
  return unidad.estado || "Disponible";
};
