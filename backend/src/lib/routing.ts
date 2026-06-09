import fetch from "node-fetch";

export interface RouteResult {
  distanceKm: number;
  durationMin: number;
  source: "osrm" | "haversine"; // fallback si OSRM échoue
}

// Haversine (vol d'oiseau) — utilisé uniquement comme pré-filtre ou fallback
export function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// OSRM public instance — gratuit, pas de clé API, supporte l'Afrique de l'Ouest
const OSRM_BASE = "https://router.project-osrm.org/route/v1/driving";

// Calcule la distance routière réelle entre un point et jusqu'à 25 destinations
// OSRM supporte les requêtes multi-destinations avec "?destinations=all&sources=0"
// mais on utilise la table API pour la batch
async function getOSRMRoutes(
  userLat: number,
  userLon: number,
  destinations: { lat: number; lon: number }[]
): Promise<Map<number, RouteResult>> {
  const results = new Map<number, RouteResult>();

  if (destinations.length === 0) return results;

  // OSRM Table API : 1 source → N destinations en 1 requête
  // Limite: 100 coordonnées par requête (1 source + 99 destinations max)
  const BATCH_SIZE = 24;

  for (let i = 0; i < destinations.length; i += BATCH_SIZE) {
    const batch = destinations.slice(i, i + BATCH_SIZE);

    // Format: source;dest1;dest2;...
    const coords = [
      `${userLon},${userLat}`,
      ...batch.map((d) => `${d.lon},${d.lat}`),
    ].join(";");

    const sources = "0";
    const destIndices = batch.map((_, idx) => idx + 1).join(";");

    const url = `https://router.project-osrm.org/table/v1/driving/${coords}?sources=${sources}&destinations=${destIndices}&annotations=duration,distance`;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000); // 8s timeout

      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);

      if (!res.ok) throw new Error(`OSRM HTTP ${res.status}`);

      const data = (await res.json()) as any;

      if (data.code !== "Ok") throw new Error(`OSRM code: ${data.code}`);

      const durations: number[] = data.durations?.[0] || [];
      const distances: number[] = data.distances?.[0] || [];

      batch.forEach((_, batchIdx) => {
        const globalIdx = i + batchIdx;
        const distMeters = distances[batchIdx + 1]; // +1 car sources[0] est la première
        const durSec = durations[batchIdx + 1];

        if (distMeters != null && distMeters > 0) {
          results.set(globalIdx, {
            distanceKm: parseFloat((distMeters / 1000).toFixed(2)),
            durationMin: Math.round(durSec / 60),
            source: "osrm",
          });
        } else {
          // Fallback haversine pour ce point précis
          results.set(globalIdx, {
            distanceKm: parseFloat(
              haversine(userLat, userLon, batch[batchIdx].lat, batch[batchIdx].lon).toFixed(2)
            ),
            durationMin: 0,
            source: "haversine",
          });
        }
      });
    } catch (err) {
      console.warn(`[routing] OSRM batch ${i}-${i + BATCH_SIZE - 1} failed:`, (err as Error).message);
      // Fallback haversine pour tout le batch
      batch.forEach((dest, batchIdx) => {
        const globalIdx = i + batchIdx;
        results.set(globalIdx, {
          distanceKm: parseFloat(haversine(userLat, userLon, dest.lat, dest.lon).toFixed(2)),
          durationMin: 0,
          source: "haversine",
        });
      });
    }
  }

  return results;
}

export interface HospitalWithRoute {
  id: string;
  name: string;
  city: string;
  country: string;
  type: string;
  phone: string | null;
  services: string[];
  emergency: boolean;
  opening_hours: string | null;
  lat: number;
  lon: number;
  distanceKm: number;
  durationMin: number;
  distanceSource: "osrm" | "haversine";
}

export async function findNearbyHospitals(
  userLat: number,
  userLon: number,
  allHospitals: any[],
  options: {
    services?: string[];
    query?: string;
    limit?: number;
    preFilterKm?: number; // pré-filtre haversine avant OSRM (perf)
  } = {}
): Promise<HospitalWithRoute[]> {
  const {
    services = [],
    query = "",
    limit = 30,
    preFilterKm = 150, // on ne calcule OSRM que pour les hôpitaux < 150km vol d'oiseau
  } = options;

  let filtered = allHospitals;

  // Filtre textuel
  if (query) {
    const q = query.toLowerCase();
    filtered = filtered.filter(
      (h) =>
        h.name.toLowerCase().includes(q) ||
        h.city.toLowerCase().includes(q) ||
        h.country.toLowerCase().includes(q)
    );
  }

  // Filtre par services
  if (services.length > 0) {
    filtered = filtered.filter((h) =>
      services.some((s) =>
        h.services.some((hs: string) => hs.toLowerCase().includes(s.toLowerCase()))
      )
    );
  }

  // Pré-filtre haversine : retire ce qui est clairement trop loin
  // Cela évite d'envoyer 3000 requêtes OSRM
  const preFiltered = filtered
    .map((h) => ({
      ...h,
      _haversine: haversine(userLat, userLon, h.lat, h.lon),
    }))
    .filter((h) => h._haversine <= preFilterKm)
    .sort((a, b) => a._haversine - b._haversine)
    .slice(0, 100); // max 100 pour OSRM (4 batches de 25)

  if (preFiltered.length === 0) return [];

  // Calcul distances routières réelles via OSRM
  const destinations = preFiltered.map((h) => ({ lat: h.lat, lon: h.lon }));
  const routeMap = await getOSRMRoutes(userLat, userLon, destinations);

  const withRoutes: HospitalWithRoute[] = preFiltered.map((h, idx) => {
    const route = routeMap.get(idx) || {
      distanceKm: parseFloat(h._haversine.toFixed(2)),
      durationMin: 0,
      source: "haversine" as const,
    };
    return {
      id: h.id,
      name: h.name,
      city: h.city,
      country: h.country,
      type: h.type,
      phone: h.phone,
      services: h.services,
      emergency: h.emergency,
      opening_hours: h.opening_hours,
      lat: h.lat,
      lon: h.lon,
      distanceKm: route.distanceKm,
      durationMin: route.durationMin,
      distanceSource: route.source,
    };
  });

  // Tri final par distance routière croissante
  return withRoutes
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, limit);
}