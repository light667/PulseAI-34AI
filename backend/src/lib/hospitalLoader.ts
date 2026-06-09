import fs from "fs";
import path from "path";

// Chemin vers Hospital_Data à la racine du projet Next (pas dans backend/)
function dataPath(filename: string): string {
  const dataDir = process.env.HOSPITAL_DATA_DIR 
    ? path.resolve(process.cwd(), process.env.HOSPITAL_DATA_DIR)
    : path.join(process.cwd(), "..", "Hospital_Data");
  return path.join(dataDir, filename);
}

const COUNTRY_FILES: Record<string, string> = {
  togo: "togo_hospitals.geojson",
  niger: "niger_hospitals.geojson",
  mali: "mali_hospitals.geojson",
  cote_divoire: "ivory_coast_hospitals.geojson",
  ghana: "ghana_hospitals.geojson",
  burkina_faso: "burkina_faso_hospitals.geojson",
  benin: "benin_hospitals.geojson",
};

// Cache en mémoire pour ne pas relire les fichiers à chaque requête
const cache = new Map<string, any[]>();

function normalizeFeature(feature: any, country: string): any | null {
  const props = feature.properties || {};
  const coords = feature.geometry?.coordinates;
  if (!coords || coords.length < 2) return null;

  const lon = Number(coords[0]);
  const lat = Number(coords[1]);
  if (isNaN(lon) || isNaN(lat) || lon === 0 || lat === 0) return null;

  const services: string[] = [];

  const addService = (s: string) => {
    const lower = s.trim().toLowerCase();
    if (!lower) return;
    if (lower.includes("pediatr") || lower.includes("pédiatr")) services.push("Pediatrics");
    else if (lower.includes("cardio")) services.push("Cardiology");
    else if (lower.includes("psychiatr") || lower.includes("mental")) services.push("Psychiatry");
    else if (lower.includes("matern") || lower.includes("gyn") || lower.includes("accouchement")) services.push("Maternity");
    else if (lower.includes("surg") || lower.includes("chirurg")) services.push("Surgery");
    else if (lower.includes("emerg") || lower.includes("urgenc")) services.push("Emergency");
    else if (lower.includes("general") || lower.includes("général") || lower.includes("médecine")) services.push("General Medicine");
    else services.push(s.trim());
  };

  if (Array.isArray(props.services)) props.services.forEach(addService);
  else if (typeof props.services === "string") props.services.split(/[;,]/).forEach(addService);
  if (props.emergency === "yes" || props.emergency === true) services.push("Emergency");
  if (services.length === 0) services.push("General Medicine");

  return {
    id: String(props.id || props.osm_id || `${country}_${Math.random().toString(36).substr(2, 9)}`),
    name: props.name || props["name:fr"] || props["name:en"] || "Hôpital",
    city: props.city || props["addr:city"] || "",
    country: props.country || country.replace("_", " ").replace(/\b\w/g, (c: string) => c.toUpperCase()),
    type: props.type || (props["operator:type"] === "public" ? "public" : "private"),
    phone: props.phone || props["contact:phone"] || null,
    services: Array.from(new Set(services)),
    emergency: props.emergency === "yes" || props.emergency === true || services.includes("Emergency"),
    opening_hours: props.opening_hours || null,
    lat,
    lon,
  };
}

export function loadAllHospitals(): any[] {
  const cacheKey = "__all__";
  if (cache.has(cacheKey)) return cache.get(cacheKey)!;

  const hospitals: any[] = [];

  for (const [country, filename] of Object.entries(COUNTRY_FILES)) {
    const filePath = dataPath(filename);
    if (!fs.existsSync(filePath)) {
      console.warn(`[hospitalLoader] Fichier manquant: ${filePath}`);
      continue;
    }
    try {
      const raw = fs.readFileSync(filePath, "utf-8");
      const data = JSON.parse(raw);
      const features = (data.features || [])
        .map((f: any) => normalizeFeature(f, country))
        .filter(Boolean);
      hospitals.push(...features);
      console.log(`[hospitalLoader] ${country}: ${features.length} hôpitaux chargés`);
    } catch (e) {
      console.error(`[hospitalLoader] Erreur lecture ${filename}:`, e);
    }
  }

  cache.set(cacheKey, hospitals);
  console.log(`[hospitalLoader] Total: ${hospitals.length} hôpitaux`);
  return hospitals;
}

// Invalider le cache (utile pour recharger sans redémarrer)
export function clearHospitalCache(): void {
  cache.clear();
}