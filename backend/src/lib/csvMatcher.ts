// Matching CSV en mémoire — zéro embedding, zéro réseau
import * as fs from "fs";
import * as path from "path";

interface DiseaseEntry {
  name: string;
  symptoms: Set<string>;
  geoBoost: number;
}

const GEO_BOOST: Record<string, number> = {
  "malaria": 1.9, "typhoid fever": 1.7, "cholera": 1.5,
  "dengue fever": 1.4, "meningitis": 1.3, "yellow fever": 1.3,
  "tuberculosis": 1.3, "sickle-cell anemia": 1.4,
  "lassa fever": 1.2, "hepatitis": 1.2, "pneumonia": 1.2,
};

let _diseases: DiseaseEntry[] | null = null;

function loadDiseases(): DiseaseEntry[] {
  if (_diseases) return _diseases;

  const candidates = [
    "/opt/render/project/src/public/data/data_symptom.csv",
    path.join(process.cwd(), "..", "public", "data", "data_symptom.csv"),
    path.join(process.cwd(), "data_symptom.csv"),
  ];

  let csvContent: string | null = null;
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      csvContent = fs.readFileSync(p, "utf-8");
      console.log(`✅ CSV loaded: ${p}`);
      break;
    }
  }

  if (!csvContent) {
    console.error("❌ CSV not found — using fallback diseases");
    return getFallbackDiseases();
  }

  const lines = csvContent.trim().split("\n");
  const headers = lines[0]
    .split(",")
    .map(h => h.trim().replace(/"/g, "").replace(/\r/g, ""));

  const diseaseMap = new Map<string, Set<string>>();

  for (const line of lines.slice(1)) {
    const values = line.split(",")
      .map(v => v.trim().replace(/"/g, "").replace(/\r/g, ""));
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = values[i] || "0"; });

    const disease = row["diseases"]?.trim();
    if (!disease) continue;

    if (!diseaseMap.has(disease)) diseaseMap.set(disease, new Set());
    Object.entries(row).forEach(([key, val]) => {
      if (key !== "diseases" && val === "1") {
        diseaseMap.get(disease)!.add(key.replace(/_/g, " ").toLowerCase());
      }
    });
  }

  _diseases = Array.from(diseaseMap.entries()).map(([name, symptoms]) => ({
    name,
    symptoms,
    geoBoost: GEO_BOOST[name.toLowerCase()] || 1.0,
  }));

  console.log(`📊 ${_diseases.length} diseases loaded in memory`);
  return _diseases;
}

// Score Jaccard entre symptômes patient et maladie
function jaccardScore(
  patientSymptoms: string[],
  diseaseSymptoms: Set<string>
): number {
  if (patientSymptoms.length === 0) return 0;

  let matches = 0;
  for (const s of patientSymptoms) {
    const normalized = s.toLowerCase().trim();
    // Match exact ou partiel
    if (diseaseSymptoms.has(normalized)) {
      matches++;
    } else {
      // Match partiel — cherche si un mot-clé correspond
      for (const ds of diseaseSymptoms) {
        if (ds.includes(normalized) || normalized.includes(ds)) {
          matches += 0.5;
          break;
        }
      }
    }
  }

  const union = patientSymptoms.length + diseaseSymptoms.size - matches;
  return union > 0 ? matches / union : 0;
}

export interface MatchResult {
  disease_name: string;
  symptoms_text: string;
  similarity: number;
  geo_boost: number;
  final_score: number;
  percentage: number;
}

export function matchDiseases(
  extractedSymptoms: string[],
  topN = 5
): MatchResult[] {
  const diseases = loadDiseases();

  const scored = diseases.map(d => {
    const sim = jaccardScore(extractedSymptoms, d.symptoms);
    return {
      disease_name: d.name,
      symptoms_text: Array.from(d.symptoms).slice(0, 15).join(", "),
      similarity: sim,
      geo_boost: d.geoBoost,
      final_score: sim * d.geoBoost,
      percentage: 0,
    };
  });

  scored.sort((a, b) => b.final_score - a.final_score);
  const top = scored.slice(0, topN).filter(s => s.final_score > 0);

  if (top.length === 0) {
    // Retourner les top par geo_boost si aucun match
    return scored.slice(0, topN).map((s, i) => ({
      ...s,
      percentage: i === 0 ? 40 : i === 1 ? 25 : i === 2 ? 20 : i === 3 ? 10 : 5,
    }));
  }

  const total = top.reduce((s, m) => s + m.final_score, 0);
  top.forEach(m => {
    m.percentage = total > 0 ? Math.round((m.final_score / total) * 100) : 0;
  });

  return top;
}

// Fallback si CSV absent
function getFallbackDiseases(): DiseaseEntry[] {
  return [
    { name: "Malaria", geoBoost: 1.9, symptoms: new Set(["fever", "chills", "headache", "fatigue", "sweating", "nausea", "vomiting", "muscle pain"]) },
    { name: "Typhoid Fever", geoBoost: 1.7, symptoms: new Set(["fever", "headache", "abdominal pain", "diarrhea", "weakness", "loss of appetite"]) },
    { name: "Dengue Fever", geoBoost: 1.4, symptoms: new Set(["fever", "severe headache", "joint pain", "muscle pain", "skin rash", "fatigue"]) },
    { name: "Cholera", geoBoost: 1.5, symptoms: new Set(["diarrhea", "vomiting", "dehydration", "muscle cramps", "weakness"]) },
    { name: "Meningitis", geoBoost: 1.3, symptoms: new Set(["severe headache", "fever", "stiff neck", "vomiting", "confusion", "sensitivity to light"]) },
    { name: "Pneumonia", geoBoost: 1.2, symptoms: new Set(["cough", "fever", "shortness of breath", "chest pain", "fatigue"]) },
    { name: "Tuberculosis", geoBoost: 1.3, symptoms: new Set(["cough", "weight loss", "night sweats", "fever", "fatigue", "blood in sputum"]) },
    { name: "Hepatitis", geoBoost: 1.2, symptoms: new Set(["jaundice", "fatigue", "abdominal pain", "nausea", "vomiting", "loss of appetite"]) },
  ];
}

// Précharger au démarrage
export function preloadDiseases(): void {
  loadDiseases();
}