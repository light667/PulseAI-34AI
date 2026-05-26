import type { CountryCode, HospitalCollection } from "@/types/hospital";
import fs from "fs";
import path from "path";

const COUNTRY_FILES: Record<Exclude<CountryCode, "all">, string> = {
  togo: "hospitals_togo.geojson",
  nigeria: "hospitals_nigeria.geojson",
  ghana: "hospitals_ghana.geojson",
  benin: "hospitals_benin.geojson",
  cote_divoire: "hospitals_cote_divoire.geojson",
};

const cache = new Map<string, HospitalCollection>();

function dataPath(filename: string): string {
  return path.join(process.cwd(), "public", "data", filename);
}

export function loadCountryHospitals(
  country: Exclude<CountryCode, "all">
): HospitalCollection | null {
  const filename = COUNTRY_FILES[country];
  if (cache.has(filename)) return cache.get(filename)!;

  const filePath = dataPath(filename);
  if (!fs.existsSync(filePath)) return null;

  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    const data = JSON.parse(raw) as HospitalCollection;
    cache.set(filename, data);
    return data;
  } catch {
    return null;
  }
}

export function loadAllHospitals(): HospitalCollection {
  const features: HospitalCollection["features"] = [];

  for (const country of Object.keys(COUNTRY_FILES) as Array<
    Exclude<CountryCode, "all">
  >) {
    const collection = loadCountryHospitals(country);
    if (collection?.features?.length) {
      features.push(...collection.features);
    }
  }

  return { type: "FeatureCollection", features };
}

export const COUNTRY_CAPITALS: Record<
  Exclude<CountryCode, "all">,
  { lat: number; lon: number; name: string }
> = {
  togo: { lat: 6.1375, lon: 1.2255, name: "Lomé" },
  nigeria: { lat: 9.0765, lon: 7.3986, name: "Abuja" },
  ghana: { lat: 5.6037, lon: -0.187, name: "Accra" },
  benin: { lat: 6.4969, lon: 2.6289, name: "Cotonou" },
  cote_divoire: { lat: 5.36, lon: -4.0083, name: "Abidjan" },
};
