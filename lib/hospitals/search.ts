import type { HospitalFeature, HospitalWithDistance } from "@/types/hospital";

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function searchNearbyHospitals(
  features: HospitalFeature[],
  lat: number,
  lon: number,
  options: {
    maxDistanceKm?: number;
    services?: string[];
    limit?: number;
  } = {}
): HospitalWithDistance[] {
  const { maxDistanceKm = 50, services = [], limit = 50 } = options;

  let results: HospitalWithDistance[] = features
    .map((feature) => {
      const [featureLon, featureLat] = feature.geometry.coordinates;
      const distanceKm = haversineDistance(lat, lon, featureLat, featureLon);
      const bedsEstimate = Math.floor(40 + Math.random() * 50);
      const distance = parseFloat(distanceKm.toFixed(1));
      return {
        ...feature,
        distanceKm,
        distance,
        bedsEstimate,
        properties: {
          ...feature.properties,
          distance,
        },
      };
    })
    .filter((h) => h.distanceKm <= maxDistanceKm);

  if (services.length > 0) {
    results = results.filter((h) =>
      services.some((s) =>
        h.properties.services.some((hs) =>
          hs.toLowerCase().includes(s.toLowerCase())
        )
      )
    );
  }

  return results.sort((a, b) => a.distanceKm - b.distanceKm).slice(0, limit);
}
