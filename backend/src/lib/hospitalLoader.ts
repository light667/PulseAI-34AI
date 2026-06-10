import fs from "fs";
import path from "path";

function getDataDir(): string {
  if (process.env.HOSPITAL_DATA_DIR) {
    const resolved = path.resolve(process.cwd(), process.env.HOSPITAL_DATA_DIR);
    if (fs.existsSync(resolved)) return resolved;
  }

  const candidates = [
    "/opt/render/project/src/Hospital_Data",
    path.join(process.cwd(), "..", "Hospital_Data"),
    path.join(process.cwd(), "Hospital_Data"),
  ];

  for (const p of candidates) {
    if (fs.existsSync(p)) {
      console.log(`[hospitalLoader] Data dir: ${p}`);
      return p;
    }
  }

  console.error("[hospitalLoader] ❌ Hospital_Data directory not found!");
  console.error("[hospitalLoader] Searched:", candidates);
  return candidates[0]; // return anyway, will fail gracefully per file
}

const COUNTRY_FILES: Record<string, string> = {
  togo:         "togo_hospitals.geojson",
  benin:        "benin_hospitals.geojson",
  ghana:        "ghana_hospitals.geojson",
  cote_divoire: "ivory_coast_hospitals.geojson",
  burkina_faso: "burkina_faso_hospitals.geojson",
  niger:        "niger_hospitals.geojson",
  mali:         "mali_hospitals.geojson",
  nigeria:      "nigeria_hospitals.geojson",
};

const COUNTRY_LABELS: Record<string, string> = {
  togo:         "Togo",
  benin:        "Bénin",
  ghana:        "Ghana",
  cote_divoire: "Côte d'Ivoire",
  burkina_faso: "Burkina Faso",
  niger:        "Niger",
  mali:         "Mali",
  nigeria:      "Nigeria",
};

const cache = new Map<string, any[]>();

function normalizeFeature(feature: any, countryKey: string): any | null {
  const props  = feature.properties || {};
  const coords = feature.geometry?.coordinates;
  if (!coords || coords.length < 2) return null;

  const lon = Number(coords[0]);
  const lat = Number(coords[1]);
  if (isNaN(lon) || isNaN(lat) || lon === 0 || lat === 0) return null;

  // Validation zone Afrique de l'Ouest
  if (lat < -5 || lat > 25 || lon < -20 || lon > 20) return null;

  const services: string[] = [];
  const addService = (s: string) => {
    const lower = s.trim().toLowerCase();
    if (!lower) return;
    if (lower.includes("pediatr") || lower.includes("pédiatr"))           services.push("Pediatrics");
    else if (lower.includes("cardio"))                                      services.push("Cardiology");
    else if (lower.includes("psychiatr") || lower.includes("mental"))      services.push("Psychiatry");
    else if (lower.includes("matern") || lower.includes("gyn") ||
             lower.includes("accouchement") || lower.includes("obstet"))   services.push("Maternity");
    else if (lower.includes("surg") || lower.includes("chirurg"))          services.push("Surgery");
    else if (lower.includes("emerg") || lower.includes("urgenc"))          services.push("Emergency");
    else if (lower.includes("general") || lower.includes("général") ||
             lower.includes("médecine") || lower.includes("medicine"))     services.push("General Medicine");
    else services.push(s.trim());
  };

  if (Array.isArray(props.services))        props.services.forEach(addService);
  else if (typeof props.services === "string") props.services.split(/[;,]/).forEach(addService);
  if (props.emergency === "yes" || props.emergency === true) {
    if (!services.includes("Emergency")) services.push("Emergency");
  }
  if (services.length === 0) services.push("General Medicine");

  return {
    id: String(
      props.id || props.osm_id ||
      `${countryKey}_${Math.random().toString(36).substr(2, 9)}`
    ),
    name:          props.name || props["name:fr"] || props["name:en"] || "Hôpital",
    city:          props.city || props["addr:city"] || props["addr:town"] || "",
    country:       COUNTRY_LABELS[countryKey] || countryKey,
    countryKey,                           // clé pour le filtre
    type:          props["operator:type"] === "public" ? "public" : "private",
    phone:         props.phone || props["contact:phone"] || null,
    services:      Array.from(new Set(services)) as string[],
    emergency:     props.emergency === "yes" || props.emergency === true ||
                   services.includes("Emergency"),
    opening_hours: props.opening_hours || null,
    lat,
    lon,
  };
}

export function loadAllHospitals(): any[] {
  const cacheKey = "__all__";
  if (cache.has(cacheKey)) return cache.get(cacheKey)!;

  const dataDir  = getDataDir();
  const hospitals: any[] = [];

  for (const [countryKey, filename] of Object.entries(COUNTRY_FILES)) {
    const filePath = path.join(dataDir, filename);
    if (!fs.existsSync(filePath)) {
      console.warn(`[hospitalLoader] Manquant: ${filePath}`);
      continue;
    }
    try {
      const raw      = fs.readFileSync(filePath, "utf-8");
      const data     = JSON.parse(raw);
      const features = (data.features || [])
        .map((f: any) => normalizeFeature(f, countryKey))
        .filter(Boolean);
      hospitals.push(...features);
      console.log(`[hospitalLoader] ${countryKey}: ${features.length} hôpitaux`);
    } catch (e) {
      console.error(`[hospitalLoader] Erreur ${filename}:`, e);
    }
  }

  cache.set(cacheKey, hospitals);
  console.log(`[hospitalLoader] ✅ Total: ${hospitals.length} hôpitaux`);
  return hospitals;
}

export function clearHospitalCache(): void {
  cache.clear();
}