export interface FilaDistribucion {
  ruta?: string;
  unidad?: string;
  chofer?: string;
  totalSumaDinero?: number;
  viaticoRuta?: number;
  comisionChofer?: number;
  comisionAyudante?: number;
}

export interface RentabilidadViaje {
  fecha: string;
  ruta: string;
  chofer: string;
  unidad: string;
  venta: number;
  gastoOperativo: number;
  rentabilidad: number;
  pctGasto: number;
  pctRentabilidad: number;
  esOptima: boolean;
}

// Rentabilidad de un viaje: gasto operativo = viaticoRuta + comisiones (ya
// calculados y guardados por fila); devuelve null si no hay venta, porque el
// % de gasto no se puede calcular dividiendo entre cero.
export const calcularRentabilidad = (
  fila: FilaDistribucion,
  fecha: string,
  metaGastoOperativoPct: number,
): RentabilidadViaje | null => {
  const venta = Number(fila.totalSumaDinero) || 0;
  if (venta <= 0) return null;

  const gastoOperativo =
    (Number(fila.viaticoRuta) || 0) +
    (Number(fila.comisionChofer) || 0) +
    (Number(fila.comisionAyudante) || 0);
  const rentabilidad = venta - gastoOperativo;
  const pctGasto = (gastoOperativo / venta) * 100;
  const pctRentabilidad = 100 - pctGasto;

  return {
    fecha,
    ruta: fila.ruta || "",
    chofer: fila.chofer || "",
    unidad: fila.unidad || "",
    venta,
    gastoOperativo,
    rentabilidad,
    pctGasto,
    pctRentabilidad,
    esOptima: pctGasto <= metaGastoOperativoPct,
  };
};
