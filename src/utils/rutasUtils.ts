import { calcularDistancia, BASE_XALISCO } from "./mapaUtils";

export const calcularRutaOptimaYCarretera = async (clientesValidos: any[]) => {
  if (clientesValidos.length === 0)
    return { rutaCalculada: null, rutaCarretera: null };

  let noVisitados = [...clientesValidos];
  let ubicacionActual: [number, number] = [BASE_XALISCO.lat, BASE_XALISCO.lng];
  let rutaCalculada: any[] = [];

  // 1. Algoritmo del Vecino más Cercano
  while (noVisitados.length > 0) {
    let indexMasCercano = -1;
    let distanciaMinima = Infinity;
    for (let i = 0; i < noVisitados.length; i++) {
      const d = calcularDistancia(
        ubicacionActual[0],
        ubicacionActual[1],
        noVisitados[i].posicion[0],
        noVisitados[i].posicion[1],
      );
      if (d < distanciaMinima) {
        distanciaMinima = d;
        indexMasCercano = i;
      }
    }
    const cliente = noVisitados.splice(indexMasCercano, 1)[0];
    rutaCalculada.push(cliente);
    ubicacionActual = cliente.posicion;
  }

  // 2. Optimización 2-opt (Quitar cruces de líneas)
  let fullRouteCoords = [
    [BASE_XALISCO.lat, BASE_XALISCO.lng] as [number, number],
    ...rutaCalculada.map((c) => c.posicion),
  ];
  let improved = true;
  let iteraciones = 0;

  while (improved && iteraciones < 100) {
    improved = false;
    for (let i = 1; i < fullRouteCoords.length - 2; i++) {
      for (let j = i + 1; j < fullRouteCoords.length - 1; j++) {
        const d1 =
          calcularDistancia(
            fullRouteCoords[i - 1][0],
            fullRouteCoords[i - 1][1],
            fullRouteCoords[i][0],
            fullRouteCoords[i][1],
          ) +
          calcularDistancia(
            fullRouteCoords[j][0],
            fullRouteCoords[j][1],
            fullRouteCoords[j + 1][0],
            fullRouteCoords[j + 1][1],
          );
        const d2 =
          calcularDistancia(
            fullRouteCoords[i - 1][0],
            fullRouteCoords[i - 1][1],
            fullRouteCoords[j][0],
            fullRouteCoords[j][1],
          ) +
          calcularDistancia(
            fullRouteCoords[i][0],
            fullRouteCoords[i][1],
            fullRouteCoords[j + 1][0],
            fullRouteCoords[j + 1][1],
          );

        if (d2 < d1 - 0.001) {
          const subArrayCoords = fullRouteCoords.slice(i, j + 1).reverse();
          fullRouteCoords.splice(i, j - i + 1, ...subArrayCoords);
          const subArrayClientes = rutaCalculada.slice(i - 1, j).reverse();
          rutaCalculada.splice(i - 1, j - i + 1, ...subArrayClientes);
          improved = true;
        }
      }
    }
    iteraciones++;
  }

  // 3. Consulta a OSRM para dibujar la carretera
  let coordsCarreteraFinal: [number, number][] = [];
  try {
    const puntosOSRM = [
      [BASE_XALISCO.lng, BASE_XALISCO.lat],
      ...rutaCalculada.map((c) => [c.posicion[1], c.posicion[0]]),
    ];
    const CHUNK_SIZE = 90;

    for (let i = 0; i < puntosOSRM.length - 1; i += CHUNK_SIZE - 1) {
      const chunk = puntosOSRM.slice(i, i + CHUNK_SIZE);
      const coordenadasUrl = chunk.map((p) => p.join(",")).join(";");
      const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${coordenadasUrl}?overview=full&geometries=geojson`;

      const response = await fetch(osrmUrl);
      const data = await response.json();

      if (data.code?.toLowerCase() === "ok" && data.routes?.length > 0) {
        const chunkCoords = data.routes[0].geometry.coordinates.map(
          (c: [number, number]) => [c[1], c[0]] as [number, number],
        );
        if (i > 0) chunkCoords.shift();
        coordsCarreteraFinal = coordsCarreteraFinal.concat(chunkCoords);
      }
    }
  } catch (error) {
    console.error("Error OSRM", error);
  }

  return {
    rutaCalculada,
    rutaCarretera:
      coordsCarreteraFinal.length > 0 ? coordsCarreteraFinal : null,
  };
};
