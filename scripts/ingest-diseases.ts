/**
 * PulseAI — Disease Embeddings Ingestion Script
 * 
 * Reads data_symptom.csv, deduplicates diseases, generates dual HuggingFace
 * embeddings (symptom list + rich sentence), applies geo-boost for West Africa,
 * and upserts into Supabase disease_embeddings table.
 *
 * Usage:
 *   npx tsx scripts/ingest-diseases.ts
 *
 * Required env vars:
 *   HUGGINGFACE_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

// Load env — try .env first, then .env.local
dotenv.config({ path: path.join(process.cwd(), ".env") });
dotenv.config({ path: path.join(process.cwd(), ".env.local") });

// ── Constants ──────────────────────────────────────────────────────────────

// The CSV is at the project root
const CSV_PATH = path.join(process.cwd(), "data_symptom.csv");

const HF_MODEL = "sentence-transformers/all-MiniLM-L6-v2";
const EMBEDDING_DIM = 384;
const BATCH_SIZE = 5;
const BATCH_DELAY_MS = 1400; // stay under HuggingFace free-tier rate limit

/** Prevalence boost for diseases common in West Africa */
const GEO_BOOSTS: Record<string, number> = {
  malaria: 1.9,
  "typhoid fever": 1.7,
  cholera: 1.5,
  "dengue fever": 1.4,
  "sickle-cell anemia": 1.4,
  meningitis: 1.3,
  "yellow fever": 1.3,
  tuberculosis: 1.3,
  "lassa fever": 1.2,
  schistosomiasis: 1.2,
  hepatitis: 1.2,
  pneumonia: 1.2,
  "urinary tract infection": 1.1,
  "peptic ulcer": 1.1,
};

// ── Helpers ────────────────────────────────────────────────────────────────

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function capitalize(s: string): string {
  return s
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/**
 * Robust CSV line parser that handles quoted fields with commas inside.
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Call HuggingFace inference API to get a 384-dim embedding vector.
 * Retries up to 3 times with exponential back-off.
 */
async function embedText(text: string, apiKey: string): Promise<number[]> {
  let delay = 1500;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(
        `https://api-inference.huggingface.co/pipeline/feature-extraction/${HF_MODEL}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ inputs: text }),
        }
      );

      if (!res.ok) {
        const errText = await res.text();
        // 503 = model loading — wait longer
        if (res.status === 503) {
          console.warn(`  ⏳ HF model loading (attempt ${attempt}/3)…`);
          await sleep(delay * 2);
          delay *= 2;
          continue;
        }
        throw new Error(`HF API ${res.status}: ${errText.slice(0, 200)}`);
      }

      const result = await res.json();

      // The API may return [[...]] or [...]
      if (Array.isArray(result)) {
        const flat = Array.isArray(result[0]) ? (result[0] as number[]) : (result as number[]);
        if (flat.length === EMBEDDING_DIM) return flat;
        throw new Error(`Unexpected embedding length: ${flat.length}`);
      }
      throw new Error("Unexpected response shape from HuggingFace");
    } catch (err) {
      console.warn(`  ⚠ Embedding attempt ${attempt} failed: ${err}`);
      if (attempt === 3) throw err;
      await sleep(delay);
      delay *= 2;
    }
  }
  throw new Error("Embedding failed after 3 attempts");
}

/** Element-wise average of two equal-length vectors */
function avgVectors(a: number[], b: number[]): number[] {
  return a.map((v, i) => (v + b[i]) / 2);
}

// ── Main ───────────────────────────────────────────────────────────────────

async function run() {
  // ── 1. Validate environment ──────────────────────────────────────────────
  const hfKey = process.env.HUGGINGFACE_API_KEY;
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

  if (!hfKey) {
    console.error("❌  HUGGINGFACE_API_KEY is missing from environment.");
    process.exit(1);
  }
  if (!supabaseUrl || !supabaseKey) {
    console.error("❌  SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY is missing.");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // ── 2. Idempotence check ─────────────────────────────────────────────────
  const { count, error: countErr } = await supabase
    .from("disease_embeddings")
    .select("*", { count: "exact", head: true });

  if (countErr) {
    console.error(
      "❌  Cannot query disease_embeddings. Did you run supabase/disease_embeddings.sql?",
      countErr.message
    );
    process.exit(1);
  }

  if (count !== null && count > 0) {
    console.log(
      `ℹ️  disease_embeddings already has ${count} rows. Skipping ingestion.\n` +
        `   To re-ingest, truncate the table first:\n` +
        `   TRUNCATE TABLE disease_embeddings RESTART IDENTITY CASCADE;`
    );
    process.exit(0);
  }

  // ── 3. Read & parse CSV ──────────────────────────────────────────────────
  if (!fs.existsSync(CSV_PATH)) {
    console.error(`❌  CSV not found at: ${CSV_PATH}`);
    process.exit(1);
  }

  console.log(`📖  Reading ${CSV_PATH} …`);
  const raw = fs.readFileSync(CSV_PATH, "utf-8");
  const lines = raw.split(/\r?\n/);

  if (lines.length < 2) {
    console.error("❌  CSV is empty or has no data rows.");
    process.exit(1);
  }

  // Header row — first column is the disease name, rest are symptom names
  const headers = parseCSVLine(lines[0]);
  const symptomNames = headers
    .slice(1)
    .map((s) => s.trim().replace(/"/g, "").replace(/_/g, " ").toLowerCase());

  console.log(
    `   → ${symptomNames.length} symptom columns | ${lines.length - 1} data rows`
  );

  // ── 4. Deduplicate: merge symptom sets per disease ───────────────────────
  const diseaseMap = new Map<string, Set<string>>();

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cols = parseCSVLine(line);
    if (cols.length < 2) continue;

    const disease = cols[0]
      .trim()
      .replace(/"/g, "")
      .toLowerCase()
      .trim();
    if (!disease) continue;

    if (!diseaseMap.has(disease)) {
      diseaseMap.set(disease, new Set<string>());
    }

    const set = diseaseMap.get(disease)!;
    for (let j = 1; j < cols.length; j++) {
      const val = cols[j]?.trim();
      if (val === "1" || val === "1.0") {
        const symptom = symptomNames[j - 1];
        if (symptom) set.add(symptom);
      }
    }
  }

  const diseases = Array.from(diseaseMap.keys());
  console.log(`\n🧪  ${diseases.length} unique diseases found. Starting ingestion…\n`);

  // ── 5. Embed & upsert in batches ─────────────────────────────────────────
  let successCount = 0;
  let errorCount = 0;
  const batchBuffer: object[] = [];

  for (let idx = 0; idx < diseases.length; idx++) {
    const disease = diseases[idx];
    const symptomsSet = diseaseMap.get(disease)!;
    const symptomsArray = Array.from(symptomsSet);

    if (symptomsArray.length === 0) {
      console.log(`  ⚠ [${idx + 1}/${diseases.length}] Skipping "${disease}" — no symptoms.`);
      continue;
    }

    const symptomsText = symptomsArray.join(", ");
    const richText = `Patient with ${capitalize(disease)} presents: ${symptomsText}. Common tropical disease in West Africa.`;
    const geo_boost = GEO_BOOSTS[disease] || 1.0;

    try {
      // Dual embedding: symptom list + rich sentence → average
      const [embA, embB] = await Promise.all([
        embedText(symptomsText, hfKey),
        embedText(richText, hfKey),
      ]);
      const embedding = avgVectors(embA, embB);

      batchBuffer.push({
        disease_name: capitalize(disease),
        symptoms_text: symptomsText,
        rich_text: richText,
        symptom_list: symptomsArray,
        geo_boost,
        embedding,
      });

      console.log(
        `  ✓ [${idx + 1}/${diseases.length}] ${capitalize(disease)} — ${symptomsArray.length} symptoms | boost: ${geo_boost}`
      );

      // Flush batch
      if (batchBuffer.length >= BATCH_SIZE || idx === diseases.length - 1) {
        const { error: insertErr } = await supabase
          .from("disease_embeddings")
          .insert(batchBuffer);

        if (insertErr) {
          console.error(`  ❌  Batch insert failed: ${insertErr.message}`);
          errorCount += batchBuffer.length;
        } else {
          console.log(`  🚀  Inserted batch of ${batchBuffer.length}\n`);
          successCount += batchBuffer.length;
        }

        batchBuffer.length = 0;

        // Respect HF rate limit between batches
        if (idx < diseases.length - 1) {
          await sleep(BATCH_DELAY_MS);
        }
      }
    } catch (err) {
      console.error(
        `  ❌  [${idx + 1}/${diseases.length}] "${disease}" embedding failed: ${err}`
      );
      errorCount++;
    }
  }

  console.log("\n" + "═".repeat(60));
  console.log(`✨  Ingestion complete!`);
  console.log(`    ✓ Inserted: ${successCount} diseases`);
  console.log(`    ✗ Failed:   ${errorCount} diseases`);
  console.log("═".repeat(60));
}

run().catch((err) => {
  console.error("❌  Fatal error:", err);
  process.exit(1);
});
