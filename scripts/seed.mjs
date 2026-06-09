// scripts/seed.mjs
// Lance avec : node scripts/seed.mjs
// Zéro dépendance lourde — juste fetch + @supabase/supabase-js

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

// ── Charger .env.local manuellement ─────────────────────────────────────────
function loadEnv() {
  const files = [".env.local", ".env"];
  for (const f of files) {
    const p = path.join(ROOT, f);
    if (!fs.existsSync(p)) continue;
    fs.readFileSync(p, "utf-8").split("\n").forEach(line => {
      const eq = line.indexOf("=");
      if (eq === -1) return;
      const key = line.slice(0, eq).trim();
      const val = line.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
      if (key && !key.startsWith("#")) process.env[key] = val;
    });
  }
}
loadEnv();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const HF_KEY       = process.env.HUGGINGFACE_API_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY || !HF_KEY) {
  console.error("❌ Variables manquantes. Vérifie .env.local :");
  console.error("   NEXT_PUBLIC_SUPABASE_URL");
  console.error("   SUPABASE_SERVICE_ROLE_KEY");
  console.error("   HUGGINGFACE_API_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const GEO_BOOST = {
  "malaria": 1.9, "typhoid fever": 1.7, "cholera": 1.5,
  "dengue fever": 1.4, "meningitis": 1.3, "yellow fever": 1.3,
  "tuberculosis": 1.3, "sickle-cell anemia": 1.4,
  "lassa fever": 1.2, "hepatitis": 1.2, "pneumonia": 1.2,
};

// ── HuggingFace API (pas de modèle local) ────────────────────────────────────
async function embed(text) {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(
        "https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${HF_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            inputs: text.slice(0, 400),
            options: { wait_for_model: true },
          }),
        }
      );

      if (res.status === 503) {
        process.stdout.write("\n   ⏳ HF model loading, waiting 15s...");
        await sleep(15000);
        continue;
      }
      if (res.status === 429) {
        process.stdout.write("\n   ⏳ Rate limit, waiting 30s...");
        await sleep(30000);
        continue;
      }
      if (!res.ok) throw new Error(`HF ${res.status}: ${await res.text()}`);

      const raw = await res.json();
      return Array.isArray(raw[0]) ? raw[0] : raw;

    } catch (err) {
      if (attempt === 3) throw err;
      await sleep(2000 * (attempt + 1));
    }
  }
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// ── Parse CSV ────────────────────────────────────────────────────────────────
function parseCSV(content) {
  const lines = content.trim().split("\n");
  const headers = lines[0]
    .split(",")
    .map(h => h.trim().replace(/"/g, "").replace(/\r/g, ""));
  return lines.slice(1).map(line => {
    const values = line.split(",")
      .map(v => v.trim().replace(/"/g, "").replace(/\r/g, ""));
    const row = {};
    headers.forEach((h, i) => { row[h] = values[i] || "0"; });
    return row;
  });
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log("🚀 PulseAI — Seed Supabase (HuggingFace API)\n");

  // Vérifier si déjà fait
  const { count } = await supabase
    .from("disease_embeddings")
    .select("*", { count: "exact", head: true });

  if (count && count > 0) {
    console.log(`✅ Déjà ingéré : ${count} maladies. Rien à faire.`);
    console.log("   Pour réingérer : DELETE FROM disease_embeddings; dans Supabase SQL Editor");
    return;
  }

  // Trouver le CSV
  const csvPath = path.join(ROOT, "public", "data", "data_symptom.csv");
  if (!fs.existsSync(csvPath)) {
    console.error("❌ CSV introuvable :", csvPath);
    process.exit(1);
  }
  console.log("📄 CSV:", csvPath);

  const rows = parseCSV(fs.readFileSync(csvPath, "utf-8"));

  // Dédoublonner par maladie
  const diseaseMap = new Map();
  for (const row of rows) {
    const disease = row["diseases"]?.trim();
    if (!disease) continue;
    if (!diseaseMap.has(disease)) diseaseMap.set(disease, new Set());
    Object.entries(row).forEach(([key, val]) => {
      if (key !== "diseases" && val === "1") {
        diseaseMap.get(disease).add(key.replace(/_/g, " "));
      }
    });
  }

  const diseases = Array.from(diseaseMap.entries());
  console.log(`🔬 ${diseases.length} maladies uniques\n`);

  let success = 0;
  let errors  = 0;

  for (const [disease, symptomsSet] of diseases) {
    try {
      const symptomsText = Array.from(symptomsSet).join(", ");
      const geoBoost     = GEO_BOOST[disease.toLowerCase()] || 1.0;

      const embedding = await embed(symptomsText);

      const { error } = await supabase.from("disease_embeddings").insert({
        disease_name:  disease,
        symptoms_text: symptomsText,
        rich_text:     `Patient with ${disease}: ${symptomsText}. West Africa.`,
        symptom_list:  Array.from(symptomsSet),
        geo_boost:     geoBoost,
        embedding,
      });

      if (error) throw new Error(error.message);

      success++;
      const pct = Math.floor((success / diseases.length) * 100);
      const bar = "█".repeat(Math.floor(pct / 5)).padEnd(20, "░");
      process.stdout.write(
        `\r  [${bar}] ${pct}% — ${success}/${diseases.length} ${disease.slice(0, 28).padEnd(28)}`
      );

      // 1 req/sec max sur HF free tier
      await sleep(1100);

    } catch (err) {
      errors++;
      process.stdout.write(`\n  ✗ ${disease}: ${err.message}\n`);
    }
  }

  console.log(`\n\n✅ Terminé : ${success} ok, ${errors} erreurs`);

  const { count: final } = await supabase
    .from("disease_embeddings")
    .select("*", { count: "exact", head: true });
  console.log(`📊 Supabase : ${final} entrées dans disease_embeddings`);
  console.log("🎯 Le diagnostic RAG est prêt !");
}

main().catch(err => {
  console.error("\n💥 Fatal:", err.message);
  process.exit(1);
});