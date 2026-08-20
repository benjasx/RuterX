// Cálculo de vacaciones según art. 76 LFT (reforma "Vacaciones Dignas" 2023):
// 12 días el 1er año, +2 por cada año hasta el 5º (20), luego +2 por cada quinquenio.

export const diasVacacionesPorAnios = (anios: number): number => {
  if (anios <= 0) return 0;
  if (anios <= 5) return 10 + 2 * anios;
  return 20 + 2 * Math.ceil((anios - 5) / 5);
};

// Suma/resta días a una fecha "YYYY-MM-DD" sin problemas de zona horaria (mediodía UTC).
const parseFecha = (fecha: string): Date => {
  const [y, m, d] = fecha.split("-").map(Number);
  return new Date(Date.UTC(y, (m || 1) - 1, d || 1, 12));
};

const hoyStr = (): string => new Date().toLocaleDateString("sv-SE");

export const calcularAntiguedad = (
  fechaIngreso?: string | null,
  hoy: string = hoyStr(),
): { anios: number; meses: number } => {
  if (!fechaIngreso) return { anios: 0, meses: 0 };
  const ingreso = parseFecha(fechaIngreso);
  const actual = parseFecha(hoy);
  if (actual < ingreso) return { anios: 0, meses: 0 };

  let anios = actual.getUTCFullYear() - ingreso.getUTCFullYear();
  let meses = actual.getUTCMonth() - ingreso.getUTCMonth();
  if (actual.getUTCDate() < ingreso.getUTCDate()) meses -= 1;
  if (meses < 0) {
    anios -= 1;
    meses += 12;
  }
  return { anios: Math.max(0, anios), meses: Math.max(0, meses) };
};

// Año-aniversario en curso (del último aniversario cumplido al siguiente).
export const periodoAniversarioVigente = (
  fechaIngreso: string,
  hoy: string = hoyStr(),
): { inicio: string; fin: string; numeroAnio: number } | null => {
  if (!fechaIngreso) return null;
  const ingreso = parseFecha(fechaIngreso);
  const actual = parseFecha(hoy);
  if (actual < ingreso) return null;

  const { anios } = calcularAntiguedad(fechaIngreso, hoy);
  const numeroAnio = anios + 1;

  const inicio = new Date(
    Date.UTC(
      ingreso.getUTCFullYear() + anios,
      ingreso.getUTCMonth(),
      ingreso.getUTCDate(),
      12,
    ),
  );
  const fin = new Date(
    Date.UTC(
      ingreso.getUTCFullYear() + anios + 1,
      ingreso.getUTCMonth(),
      ingreso.getUTCDate() - 1,
      12,
    ),
  );

  return {
    inicio: inicio.toLocaleDateString("sv-SE"),
    fin: fin.toLocaleDateString("sv-SE"),
    numeroAnio,
  };
};

// Días entre dos fechas (inclusive), excluyendo domingos.
export const contarDiasVacaciones = (
  fechaInicio: string,
  fechaFin: string,
): number => {
  if (!fechaInicio || !fechaFin) return 0;
  const inicio = parseFecha(fechaInicio);
  const fin = parseFecha(fechaFin);
  if (fin < inicio) return 0;

  let dias = 0;
  const cursor = new Date(inicio);
  while (cursor <= fin) {
    if (cursor.getUTCDay() !== 0) dias++;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dias;
};

// Tipos de ausencia que se pueden registrar como periodo (con rango de fechas).
// Solo "Vacaciones" consume días del derecho legal; los demás son solo de control/bitácora.
export const TIPOS_AUSENCIA = [
  "Vacaciones",
  "Incapacidad",
  "Permiso con goce",
  "Permiso sin goce",
  "Descanso",
  "Falta injustificada",
] as const;

export type TipoAusencia = (typeof TIPOS_AUSENCIA)[number];

export interface PeriodoVacacion {
  id?: string;
  chofer_id?: string;
  tipo?: TipoAusencia;
  fecha_inicio: string;
  fecha_fin: string;
  dias?: number;
  observaciones?: string;
}

// Registros antiguos no tienen "tipo" guardado: se tratan como "Vacaciones" (comportamiento original).
const tipoDe = (p: PeriodoVacacion): TipoAusencia => p.tipo || "Vacaciones";

export const estaDeVacacionesHoy = (
  periodosDelEmpleado: PeriodoVacacion[],
  hoy: string = hoyStr(),
): boolean =>
  periodosDelEmpleado.some(
    (p) => p.fecha_inicio <= hoy && hoy <= p.fecha_fin,
  );

// Tipo de ausencia activa hoy (el primero que cubra la fecha), si hay alguna.
export const tipoAusenciaActivaHoy = (
  periodosDelEmpleado: PeriodoVacacion[],
  hoy: string = hoyStr(),
): TipoAusencia | undefined => {
  const activo = periodosDelEmpleado.find(
    (p) => p.fecha_inicio <= hoy && hoy <= p.fecha_fin,
  );
  return activo ? tipoDe(activo) : undefined;
};

export interface ResumenVacaciones {
  anios: number;
  diasDerecho: number;
  diasTomados: number;
  diasPendientes: number;
  deVacacionesHoy: boolean;
  tipoActivoHoy?: TipoAusencia;
}

export const resumenVacaciones = (
  chofer: { fecha_ingreso?: string | null },
  periodosDelEmpleado: PeriodoVacacion[],
  hoy: string = hoyStr(),
): ResumenVacaciones => {
  if (!chofer.fecha_ingreso) {
    return {
      anios: 0,
      diasDerecho: 0,
      diasTomados: 0,
      diasPendientes: 0,
      deVacacionesHoy: false,
    };
  }

  const { anios } = calcularAntiguedad(chofer.fecha_ingreso, hoy);
  const diasDerecho = diasVacacionesPorAnios(anios);
  const periodoVigente = periodoAniversarioVigente(chofer.fecha_ingreso, hoy);

  const diasTomados = periodoVigente
    ? periodosDelEmpleado
        .filter(
          (p) =>
            tipoDe(p) === "Vacaciones" &&
            p.fecha_inicio <= periodoVigente.fin &&
            p.fecha_fin >= periodoVigente.inicio,
        )
        .reduce((acc, p) => acc + (p.dias || 0), 0)
    : 0;

  return {
    anios,
    diasDerecho,
    diasTomados,
    diasPendientes: Math.max(0, diasDerecho - diasTomados),
    deVacacionesHoy: estaDeVacacionesHoy(periodosDelEmpleado, hoy),
    tipoActivoHoy: tipoAusenciaActivaHoy(periodosDelEmpleado, hoy),
  };
};

// Clases Tailwind para la píldora de estado/tipo de ausencia (usada en Directorio y Vacaciones).
export const claseEstadoBadge = (estado: string): string => {
  switch (estado) {
    case "Disponible":
      return "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800";
    case "Vacaciones":
    case "Incapacidad":
    case "Permiso con goce":
    case "Permiso sin goce":
      return "bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800";
    case "Inactivo":
      return "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800";
    case "Descanso":
      return "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800";
    case "Falta injustificada":
      return "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800";
    default:
      return "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800";
  }
};

// Código usado en Control de Asistencia (PanelAsistencia) para cada tipo de ausencia,
// para precargar el estado del día a partir de los periodos de vacaciones/permisos.
export const CODIGO_ASISTENCIA_POR_TIPO: Record<string, string> = {
  Vacaciones: "V",
  Incapacidad: "I",
  "Permiso con goce": "PCG",
  "Permiso sin goce": "PSG",
  Descanso: "DS",
  "Falta injustificada": "F",
  Inactivo: "S",
};

// Estado a mostrar para el empleado en una fecha dada: el manual (Incapacidad/Inactivo) gana;
// si no, el tipo del periodo de ausencia vigente ese día (Vacaciones/Incapacidad/Permiso.../Descanso).
export const estadoEfectivo = (
  chofer: { estado?: string; fecha_ingreso?: string | null },
  periodosDelEmpleado: PeriodoVacacion[],
  hoy: string = hoyStr(),
): string => {
  if (chofer.estado === "Incapacidad" || chofer.estado === "Inactivo") {
    return chofer.estado;
  }
  const tipoActivo = tipoAusenciaActivaHoy(periodosDelEmpleado, hoy);
  if (tipoActivo) return tipoActivo;
  return chofer.estado || "Disponible";
};
