import type { AjustesRentabilidad } from "../firebase/ajustesRentabilidadService";
import type { AjustesNomina } from "../firebase/ajustesNominaService";

export interface SimulacionRentabilidadInput {
  ruta: string;
  kilometraje: number;
  viaticoChofer: number;
  viaticoAyudante1: number;
  viaticoAyudante2: number;
  ayudante1Va: boolean;
  ayudante2Va: boolean;
  ventaProgramada: number;
  precioDiesel: number;
}

export interface SimulacionRentabilidadResultado {
  salarioChofer: number;
  salarioAyudante1: number;
  salarioAyudante2: number;
  viaticoChofer: number;
  viaticoAyudante1: number;
  viaticoAyudante2: number;
  comisionChofer: number;
  comisionAyudante: number;
  gastoCombustible: number;
  gastoLegal: number;
  gastoMantenimiento: number;
  gastoTotalRuta: number;
  pesosPorKm: number | null;
  ventaProgramada: number;
  cantidadAlCosto: number;
  contribucionPromedioReal: number;
  contribucionRealDespuesGastos: number;
  pctGastoVsAlCosto: number | null;
  pctGastoVsContribucion: number | null;
  pctContribucionRealVsAlCosto: number | null;
  pctContribucionRealVsContribucion: number | null;
  esOptima: boolean | null;
}

// Réplica del modelo de calculo de rentabilidad.pdf: la meta 40/60 del
// usuario aplica sobre Gasto Total Ruta ÷ Contribución Promedio Real (no
// sobre la venta bruta) — ver specs/05-rentabilidad-rutas.md, sección
// "Contexto", para la derivación de las fórmulas.
export const calcularSimulacionRentabilidad = (
  input: SimulacionRentabilidadInput,
  ajustesRentabilidad: AjustesRentabilidad,
  ajustesNomina: AjustesNomina,
): SimulacionRentabilidadResultado => {
  const salarioChofer = ajustesRentabilidad.salarioSemanalChofer / 7;
  const salarioAyudante1 = input.ayudante1Va
    ? ajustesRentabilidad.salarioSemanalAyudante / 7
    : 0;
  const salarioAyudante2 = input.ayudante2Va
    ? ajustesRentabilidad.salarioSemanalAyudante / 7
    : 0;

  const viaticoChofer = input.viaticoChofer;
  const viaticoAyudante1 = input.ayudante1Va ? input.viaticoAyudante1 : 0;
  const viaticoAyudante2 = input.ayudante2Va ? input.viaticoAyudante2 : 0;

  const comisionChofer = input.ventaProgramada * ajustesNomina.comisionChofer;
  const comisionAyudante = input.ayudante1Va
    ? input.ventaProgramada * ajustesNomina.comisionAyudante
    : 0;

  const gastoCombustible =
    (input.kilometraje * input.precioDiesel) /
    ajustesRentabilidad.rendimientoKmPorLitro;
  const gastoLegal = ajustesRentabilidad.gastoLegalDiario;
  const gastoMantenimiento = ajustesRentabilidad.gastoMantenimientoDiario;

  const gastoTotalRuta =
    salarioChofer +
    salarioAyudante1 +
    salarioAyudante2 +
    viaticoChofer +
    viaticoAyudante1 +
    viaticoAyudante2 +
    comisionChofer +
    comisionAyudante +
    gastoCombustible +
    gastoLegal +
    gastoMantenimiento;

  const pesosPorKm =
    input.kilometraje > 0 ? gastoTotalRuta / input.kilometraje : null;

  const ventaProgramada = input.ventaProgramada;
  const cantidadAlCosto =
    ventaProgramada * (1 - ajustesRentabilidad.pctPromedioCostoSinImpuesto / 100);
  const contribucionPromedioReal =
    cantidadAlCosto * (ajustesRentabilidad.pctPromedioContribucion / 100);
  const contribucionRealDespuesGastos =
    contribucionPromedioReal - gastoTotalRuta;

  const pctGastoVsAlCosto =
    cantidadAlCosto > 0 ? (gastoTotalRuta / cantidadAlCosto) * 100 : null;
  const pctGastoVsContribucion =
    contribucionPromedioReal > 0
      ? (gastoTotalRuta / contribucionPromedioReal) * 100
      : null;
  const pctContribucionRealVsAlCosto =
    cantidadAlCosto > 0
      ? (contribucionRealDespuesGastos / cantidadAlCosto) * 100
      : null;
  const pctContribucionRealVsContribucion =
    contribucionPromedioReal > 0
      ? (contribucionRealDespuesGastos / contribucionPromedioReal) * 100
      : null;

  const esOptima =
    pctGastoVsContribucion !== null
      ? pctGastoVsContribucion <= ajustesRentabilidad.metaGastoOperativoPct
      : null;

  return {
    salarioChofer,
    salarioAyudante1,
    salarioAyudante2,
    viaticoChofer,
    viaticoAyudante1,
    viaticoAyudante2,
    comisionChofer,
    comisionAyudante,
    gastoCombustible,
    gastoLegal,
    gastoMantenimiento,
    gastoTotalRuta,
    pesosPorKm,
    ventaProgramada,
    cantidadAlCosto,
    contribucionPromedioReal,
    contribucionRealDespuesGastos,
    pctGastoVsAlCosto,
    pctGastoVsContribucion,
    pctContribucionRealVsAlCosto,
    pctContribucionRealVsContribucion,
    esOptima,
  };
};
