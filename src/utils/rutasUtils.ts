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

// URL del contenedor OSRM local (Docker). Si no está configurada, el motor
// alterno simplemente no se ofrece en el panel.
const OSRM_LOCAL_URL = import.meta.env.VITE_OSRM_URL;

// Comprueba si el contenedor OSRM local está corriendo y responde.
export const osrmLocalDisponible = async (): Promise<boolean> => {
  if (!OSRM_LOCAL_URL) return false;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    const response = await fetch(
      `${OSRM_LOCAL_URL}/nearest/v1/driving/${BASE_XALISCO.lng},${BASE_XALISCO.lat}`,
      { signal: controller.signal },
    );
    clearTimeout(timeoutId);
    if (!response.ok) return false;
    const data: { code?: string } = await response.json();
    return data.code?.toLowerCase() === "ok";
  } catch {
    return false;
  }
};

interface OSRMWaypoint {
  waypoint_index: number;
}

interface OSRMTripResponse {
  code?: string;
  waypoints: OSRMWaypoint[];
}

interface OSRMRouteResponse {
  code?: string;
  routes: {
    geometry: { coordinates: [number, number][] };
    distance: number;
    duration: number;
  }[];
}

interface OSRMTableResponse {
  code?: string;
  durations: (number | null)[][];
}

// 1 = Normal, 2 = Prioritario, 3 = Urgente. Se asigna por viaje en el panel,
// no se persiste en el cliente.
export type NivelPrioridad = 1 | 2 | 3;

// Qué tanto "empuja" hacia el frente un punto de prioridad frente al tiempo
// real de manejo (ver ordenarPorPrioridad). Si todos los clientes son
// Normal, este peso nunca entra en juego.
const PESO_PRIORIDAD = 0.5;

const factorPrioridad = (nivel: NivelPrioridad) => nivel - 1;

// Pide a /route/ la geometría, distancia y duración reales del recorrido ya
// ordenado (sin el tramo de regreso a la base).
const obtenerGeometriaRuta = async (rutaCalculada: any[]) => {
  const puntosRuta = [
    [BASE_XALISCO.lng, BASE_XALISCO.lat],
    ...rutaCalculada.map((c) => [c.posicion[1], c.posicion[0]]),
  ];
  const routeUrl =
    `${OSRM_LOCAL_URL}/route/v1/driving/${puntosRuta.map((p) => p.join(",")).join(";")}` +
    `?exclude=toll&overview=full&geometries=geojson`;
  const routeResponse = await fetch(routeUrl);
  const routeData: OSRMRouteResponse = await routeResponse.json();

  if (routeData.code?.toLowerCase() !== "ok" || !routeData.routes?.length) {
    throw new Error(
      `OSRM local respondió con error: ${routeData.code || "sin código"}`,
    );
  }

  const rutaCarretera: [number, number][] =
    routeData.routes[0].geometry.coordinates.map(
      (c: [number, number]) => [c[1], c[0]] as [number, number],
    );

  return {
    rutaCarretera,
    resumen: {
      distanciaKm: routeData.routes[0].distance / 1000,
      duracionMin: routeData.routes[0].duration / 60,
    },
  };
};

// Ordena los clientes con vecino-más-cercano + 2-opt sobre tiempos reales de
// manejo (matriz de /table/, evitando cuota), penalizando dejar tarde a un
// cliente prioritario. costoTotal(secuencia) = Σ duración real de cada tramo
// + PESO_PRIORIDAD · Σ factorPrioridad(cliente) · tiempoLlegadaAcumulado. Un
// prioritario que quede tarde en la ruta acumula mucho tiempo de llegada y
// penaliza fuerte, empujándolo hacia el frente sin ser una regla dura.
const ordenarPorPrioridad = async (
  clientesValidos: any[],
  prioridades: Record<string, NivelPrioridad>,
): Promise<any[]> => {
  const puntos = [
    [BASE_XALISCO.lng, BASE_XALISCO.lat],
    ...clientesValidos.map((c) => [c.posicion[1], c.posicion[0]]),
  ];
  const tableUrl =
    `${OSRM_LOCAL_URL}/table/v1/driving/${puntos.map((p) => p.join(",")).join(";")}` +
    `?annotations=duration&exclude=toll`;
  const tableResponse = await fetch(tableUrl);
  const tableData: OSRMTableResponse = await tableResponse.json();

  if (tableData.code?.toLowerCase() !== "ok") {
    throw new Error(
      `OSRM local respondió con error: ${tableData.code || "sin código"}`,
    );
  }

  // Índices 1..n en la matriz corresponden a clientesValidos[0..n-1]; el 0 es
  // la base. factores[0] no se usa (nunca se penaliza la base).
  const matriz = tableData.durations;
  const duracion = (i: number, j: number) => matriz[i][j] ?? Infinity;
  const factores = [
    0,
    ...clientesValidos.map((c) => factorPrioridad(prioridades[c.id] || 1)),
  ];

  // 1. Vecino más cercano, ponderado por la misma penalización de prioridad
  // que el 2-opt (costo local = tramo + penalización de llegar tarde con ese
  // tramo ya sumado).
  const noVisitados = clientesValidos.map((_, i) => i + 1);
  const orden = [0];
  let actual = 0;
  let tiempoAcumulado = 0;
  while (noVisitados.length > 0) {
    let mejorPos = 0;
    let mejorCosto = Infinity;
    for (let k = 0; k < noVisitados.length; k++) {
      const j = noVisitados[k];
      const tramo = duracion(actual, j);
      const costo = tramo + factores[j] * PESO_PRIORIDAD * (tiempoAcumulado + tramo);
      if (costo < mejorCosto) {
        mejorCosto = costo;
        mejorPos = k;
      }
    }
    const siguiente = noVisitados.splice(mejorPos, 1)[0];
    tiempoAcumulado += duracion(actual, siguiente);
    orden.push(siguiente);
    actual = siguiente;
  }

  const costoTotal = (secuencia: number[]) => {
    let acumulado = 0;
    let costo = 0;
    for (let k = 1; k < secuencia.length; k++) {
      const tramo = duracion(secuencia[k - 1], secuencia[k]);
      acumulado += tramo;
      costo += tramo + factores[secuencia[k]] * PESO_PRIORIDAD * acumulado;
    }
    return costo;
  };

  // 2. 2-opt: mismo patrón que calcularRutaOptimaYCarretera, comparando
  // costoTotal en vez de distancia en línea recta.
  let ordenActual = orden;
  let improved = true;
  let iteraciones = 0;
  while (improved && iteraciones < 100) {
    improved = false;
    for (let i = 1; i < ordenActual.length - 1; i++) {
      for (let j = i + 1; j < ordenActual.length; j++) {
        const candidato = [...ordenActual];
        const segmento = candidato.slice(i, j + 1).reverse();
        candidato.splice(i, j - i + 1, ...segmento);
        if (costoTotal(candidato) < costoTotal(ordenActual) - 0.001) {
          ordenActual = candidato;
          improved = true;
        }
      }
    }
    iteraciones++;
  }

  return ordenActual.slice(1).map((idx) => clientesValidos[idx - 1]);
};

// Motor alterno: usa el OSRM local (Docker) para resolver el orden óptimo de
// paradas por tiempo real de manejo (evitando casetas de cuota) y la
// geometría de la carretera. A diferencia de calcularRutaOptimaYCarretera,
// aquí sí se lanza el error si el contenedor no responde, para que la UI
// pueda avisar en vez de fallar en silencio.
//
// Sin prioridades (o todas en Normal): se usa /trip/ (la propia heurística
// TSP de OSRM). OSRM no soporta /trip/ con roundtrip=false cuando el destino
// es libre (source=first + destination=any → "NotImplemented"): sólo permite
// un loop cerrado o ambos extremos fijos. Por eso el orden se pide como loop
// cerrado (roundtrip=true, source=first).
//
// Con al menos un cliente prioritario: OSRM no tiene ningún parámetro de
// prioridad en /trip/ ni /route/, así que el orden se resuelve con
// ordenarPorPrioridad sobre la matriz de /table/.
//
// En ambos casos, ya con el orden final, se pide por separado a /route/ la
// geometría/distancia/duración del recorrido abierto real.
export const calcularRutaOptimaOSRM = async (
  clientesValidos: any[],
  prioridades?: Record<string, NivelPrioridad>,
) => {
  if (clientesValidos.length === 0)
    return { rutaCalculada: null, rutaCarretera: null };
  if (!OSRM_LOCAL_URL) throw new Error("OSRM local no está configurado.");

  const hayPrioridades = clientesValidos.some(
    (c) => (prioridades?.[c.id] || 1) > 1,
  );

  let rutaCalculada: any[];
  if (hayPrioridades) {
    rutaCalculada = await ordenarPorPrioridad(clientesValidos, prioridades!);
  } else {
    const puntosOSRM = [
      [BASE_XALISCO.lng, BASE_XALISCO.lat],
      ...clientesValidos.map((c) => [c.posicion[1], c.posicion[0]]),
    ];
    const coordenadasUrl = puntosOSRM.map((p) => p.join(",")).join(";");

    const tripUrl =
      `${OSRM_LOCAL_URL}/trip/v1/driving/${coordenadasUrl}` +
      `?source=first&roundtrip=true&exclude=toll`;
    const tripResponse = await fetch(tripUrl);
    const tripData: OSRMTripResponse = await tripResponse.json();

    if (tripData.code?.toLowerCase() !== "ok") {
      throw new Error(
        `OSRM local respondió con error: ${tripData.code || "sin código"}`,
      );
    }

    // waypoints[0] es siempre la base; el resto trae el índice de entrada
    // original y el orden dentro del recorrido calculado.
    rutaCalculada = tripData.waypoints
      .slice(1)
      .map((wp, indiceOriginal) => ({
        cliente: clientesValidos[indiceOriginal],
        orden: wp.waypoint_index,
      }))
      .sort((a, b) => a.orden - b.orden)
      .map((item) => item.cliente);
  }

  const { rutaCarretera, resumen } = await obtenerGeometriaRuta(rutaCalculada);

  return { rutaCalculada, rutaCarretera, resumen };
};
