import type { AjustesRentabilidad } from "../firebase/ajustesRentabilidadService";
import type { AjustesNomina } from "../firebase/ajustesNominaService";

// Normaliza mayúsculas/acentos y empareja por substring en cualquier
// dirección, mismo criterio que ya usa calcularFinanzas en
// PanelDistribucion.tsx para viaticosRutas.
export const buscarValorPorRuta = (
  rutaNombre: string,
  catalogo: Record<string, number>,
): number => {
  if (!rutaNombre) return 0;
  const normalizar = (s: string) =>
    s
      .toUpperCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .trim();
  const rutaNormalizada = normalizar(rutaNombre);
  for (const [rutaCatalogo, valor] of Object.entries(catalogo)) {
    const catNorm = normalizar(rutaCatalogo);
    if (rutaNormalizada.includes(catNorm) || catNorm.includes(rutaNormalizada)) {
      return valor;
    }
  }
  return 0;
};

export interface SimulacionRentabilidadInput {
  unidadId: string;
  ruta: string;
  costoPorKm: number;
  kmTrayecto: number;
  permisoDescarga: number;
  viaticoChofer: number;
  viaticoAyudante1: number;
  viaticoAyudante2: number;
  ayudante1Va: boolean;
  ayudante2Va: boolean;
  ventaProgramada: number;
}

export interface SimulacionRentabilidadResultado {
  salarioChofer: number;
  salarioAyudante1: number;
  salarioAyudante2: number;
  salarioVendedor: number;
  viaticoChofer: number;
  viaticoAyudante1: number;
  viaticoAyudante2: number;
  comisionChofer: number;
  comisionAyudante1: number;
  comisionAyudante2: number;
  comisionVendedor: number;
  gastoCombustible: number;
  permisoDescarga: number;
  totalCosto: number;
  ventaProgramada: number;
  margenBruto: number;
  utilidadRuta: number;
  rentabilidadPct: number | null;
  semaforo: "RENTABLE" | "REVISAR" | "NO_RENTABLE" | null;
}

// Modelo Venta/Margen/Utilidad/Semáforo — ver specs/08-rentabilidad-rutas-v2.md,
// sección "Contexto", para la derivación de las fórmulas y de los umbrales
// del semáforo (equivalente a la fórmula de la hoja de cálculo del usuario:
// =SI(Rentabilidad%>=6%,"RENTABLE",SI(Rentabilidad%>=5%,"REVISAR","NO RENTABLE"))).
export const calcularSimulacionRentabilidad = (
  input: SimulacionRentabilidadInput,
  ajustesRentabilidad: AjustesRentabilidad,
  ajustesNomina: AjustesNomina,
): SimulacionRentabilidadResultado => {
  const salarioChofer = ajustesRentabilidad.salarioDiarioChofer;
  const salarioAyudante1 = input.ayudante1Va
    ? ajustesRentabilidad.salarioDiarioAyudante
    : 0;
  const salarioAyudante2 = input.ayudante2Va
    ? ajustesRentabilidad.salarioDiarioAyudante
    : 0;
  const salarioVendedor = ajustesRentabilidad.salarioDiarioVendedor;

  const viaticoChofer = input.viaticoChofer;
  const viaticoAyudante1 = input.ayudante1Va ? input.viaticoAyudante1 : 0;
  const viaticoAyudante2 = input.ayudante2Va ? input.viaticoAyudante2 : 0;

  const comisionChofer = input.ventaProgramada * ajustesNomina.comisionChofer;
  const comisionAyudante1 = input.ayudante1Va
    ? input.ventaProgramada * ajustesNomina.comisionAyudante
    : 0;
  const comisionAyudante2 = input.ayudante2Va
    ? input.ventaProgramada * ajustesNomina.comisionAyudante
    : 0;

  // Comisión del Vendedor sobre el Margen Bruto $ (Venta × Margen %), no
  // sobre la Venta directa — confirmado contra la fórmula real de la hoja
  // de cálculo del usuario (=C25*2%, donde C25 es la celda de Margen Bruto).
  const margenBruto =
    input.ventaProgramada * (ajustesRentabilidad.margenPct / 100);
  const comisionVendedor = margenBruto * ajustesRentabilidad.comisionVendedor;

  const gastoCombustible = input.costoPorKm * input.kmTrayecto;
  const permisoDescarga = input.permisoDescarga;

  const totalCosto =
    salarioChofer +
    salarioAyudante1 +
    salarioAyudante2 +
    salarioVendedor +
    viaticoChofer +
    viaticoAyudante1 +
    viaticoAyudante2 +
    comisionChofer +
    comisionAyudante1 +
    comisionAyudante2 +
    comisionVendedor +
    gastoCombustible +
    permisoDescarga;

  const ventaProgramada = input.ventaProgramada;
  const utilidadRuta = margenBruto - totalCosto;
  const rentabilidadPct =
    ventaProgramada > 0 ? (utilidadRuta / ventaProgramada) * 100 : null;

  const semaforo =
    rentabilidadPct === null
      ? null
      : rentabilidadPct >= ajustesRentabilidad.metaRentablePct
        ? "RENTABLE"
        : rentabilidadPct >= ajustesRentabilidad.metaRevisarPct
          ? "REVISAR"
          : "NO_RENTABLE";

  return {
    salarioChofer,
    salarioAyudante1,
    salarioAyudante2,
    salarioVendedor,
    viaticoChofer,
    viaticoAyudante1,
    viaticoAyudante2,
    comisionChofer,
    comisionAyudante1,
    comisionAyudante2,
    comisionVendedor,
    gastoCombustible,
    permisoDescarga,
    totalCosto,
    ventaProgramada,
    margenBruto,
    utilidadRuta,
    rentabilidadPct,
    semaforo,
  };
};
