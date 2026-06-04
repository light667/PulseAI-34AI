import type { CountryCode, HospitalCollection, HospitalFeature, HospitalProperties } from "@/types/hospital";
import fs from "fs";
import path from "path";

const COUNTRY_FILES: Record<Exclude<CountryCode, "all">, string> = {
  togo: "togo_hospitals.geojson",
  niger: "niger_hospitals.geojson",
  mali: "mali_hospitals.geojson",
  cote_divoire: "ivory_coast_hospitals.geojson",
  ghana: "ghana_hospitals.geojson",
  burkina_faso: "burkina_faso_hospitals.geojson",
  benin: "benin_hospitals.geojson",
};

const cache = new Map<string, HospitalCollection>();

function dataPath(filename: string): string {
  return path.join(process.cwd(), "Hospital_Data", filename);
}

function normalizeFeature(feature: any, country: Exclude<CountryCode, "all">): HospitalFeature {
  const props = feature.properties || {};
  const coords = feature.geometry?.coordinates || [0, 0];
  const lon = Number(coords[0]);
  const lat = Number(coords[1]);

  let services: string[] = [];
  let specialties: string[] = [];

  const addServiceAndSpecialty = (s: string) => {
    const clean = s.trim();
    if (!clean) return;
    const lower = clean.toLowerCase();

    // Map to standard filter values
    if (lower.includes("pediatr") || lower.includes("pédiatr") || lower.includes("enfant")) {
      services.push("Pediatrics");
      specialties.push("Pediatrics");
    } else if (lower.includes("cardio")) {
      services.push("Cardiology");
      specialties.push("Cardiology");
    } else if (lower.includes("psychiatr") || lower.includes("mental") || lower.includes("psycho")) {
      services.push("Psychiatry");
      specialties.push("Psychiatry");
    } else if (lower.includes("matern") || lower.includes("gyn") || lower.includes("obstetr") || lower.includes("accouchement")) {
      services.push("Maternity");
      specialties.push("Maternity");
    } else if (lower.includes("surg") || lower.includes("chirurg")) {
      services.push("Surgery");
      specialties.push("Surgery");
    } else if (lower.includes("trauma")) {
      services.push("Trauma");
      specialties.push("Trauma");
    } else if (lower.includes("emerg") || lower.includes("urgenc")) {
      services.push("Emergency");
      specialties.push("Emergency");
    } else if (lower.includes("general") || lower.includes("général") || lower.includes("medecine") || lower.includes("médecine")) {
      services.push("General Medicine");
      specialties.push("General Medicine");
    } else {
      specialties.push(clean);
    }
  };

  if (Array.isArray(props.services)) {
    props.services.forEach(addServiceAndSpecialty);
  } else if (typeof props.services === "string") {
    props.services.split(/[;,]/).forEach(addServiceAndSpecialty);
  }

  // Also parse healthcare:speciality
  const rawSpecialty = props["healthcare:speciality"] || props["specialty"] || "";
  if (typeof rawSpecialty === "string" && rawSpecialty) {
    rawSpecialty.split(/[;,]/).forEach(addServiceAndSpecialty);
  }

  if (props.emergency === "yes" || props.emergency === true || props.urgences === true) {
    services.push("Emergency");
    specialties.push("Emergency");
  }

  // Deduplicate
  services = Array.from(new Set(services));
  specialties = Array.from(new Set(specialties));

  // Default fallbacks
  if (services.length === 0) {
    services.push("General Medicine");
  }
  if (specialties.length === 0) {
    specialties.push("General Practice");
  }

  const isEmergency = props.emergency === "yes" || props.emergency === true || services.includes("Emergency");

  const normalizedProperties: HospitalProperties = {
    id: props.id ? String(props.id) : `${country}_${props.osm_id || Math.random().toString(36).substr(2, 9)}`,
    name: props.name || props["name:fr"] || props["name:en"] || "Unknown Hospital",
    city: props.city || props["addr:city"] || "",
    country: props.country || country.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    type: props.type || (props["operator:type"] === "public" ? "public" : "private"),
    phone: props.phone || props["contact:phone"] || undefined,
    services,
    specialties,
    emergency: isEmergency,
    latitude: lat,
    longitude: lon,
    opening_hours: props.opening_hours || undefined,
    osm_id: props.osm_id ? Number(props.osm_id) : undefined,
  };

  return {
    type: "Feature",
    geometry: {
      type: "Point",
      coordinates: [lon, lat],
    },
    properties: normalizedProperties,
  };
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

    const normalizedFeatures = (data.features || []).map((f) => normalizeFeature(f, country));
    const normalizedCollection: HospitalCollection = {
      type: "FeatureCollection",
      country: data.country || country,
      features: normalizedFeatures,
    };

    cache.set(filename, normalizedCollection);
    return normalizedCollection;
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
  niger: { lat: 13.5116, lon: 2.1254, name: "Niamey" },
  mali: { lat: 12.6392, lon: -8.0029, name: "Bamako" },
  cote_divoire: { lat: 5.36, lon: -4.0083, name: "Abidjan" },
  ghana: { lat: 5.6037, lon: -0.187, name: "Accra" },
  burkina_faso: { lat: 12.3714, lon: -1.5197, name: "Ouagadougou" },
  benin: { lat: 6.4969, lon: 2.6289, name: "Cotonou" },
};
