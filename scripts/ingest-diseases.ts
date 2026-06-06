import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { embedQuery } from "../lib/rag/diagnosis/embed";

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), ".env.local") });
dotenv.config({ path: path.join(process.cwd(), ".env") });

const CSV_PATH = path.join(process.cwd(), "public", "data", "diseases_symptoms.csv");

const GEO_BOOSTS: Record<string, number> = {
  "malaria": 1.9,
  "typhoid fever": 1.7,
  "cholera": 1.5,
  "dengue fever": 1.4,
  "meningitis": 1.3,
  "yellow fever": 1.3,
  "tuberculosis": 1.3,
  "sickle-cell anemia": 1.4,
  "lassa fever": 1.2,
  "schistosomiasis": 1.2,
  "hepatitis": 1.2,
  "pneumonia": 1.2,
};

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseCSVLine(text: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

function capitalize(s: string): string {
  return s.split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

async function run() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

    if (!url || !key) {
      console.error("❌ SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables are missing.");
      process.exit(1);
    }

    const supabase = createClient(url, key);

    // 6. Check for idempotence
    const { count, error: countError } = await supabase
      .from("disease_embeddings")
      .select("*", { count: "exact", head: true });

    if (countError) {
      console.error("❌ Failed to query database count:", countError.message);
      process.exit(1);
    }

    if (count !== null && count > 0) {
      console.log("ℹ️ Table 'disease_embeddings' is already populated. Ingestion skipped.");
      process.exit(0);
    }

    if (!fs.existsSync(CSV_PATH)) {
      console.error(`❌ CSV file not found at: ${CSV_PATH}`);
      process.exit(1);
    }

    console.log("📖 Reading and parsing CSV...");
    const rawCSV = fs.readFileSync(CSV_PATH, "utf-8");
    const lines = rawCSV.split(/\r?\n/);
    if (lines.length < 2) {
      console.error("❌ Empty or invalid CSV file.");
      process.exit(1);
    }

    const headers = parseCSVLine(lines[0]);
    const symptomNames = headers.slice(1).map((s) => s.trim().replace(/"/g, ""));

    // 2. Deduplicate by disease and merge symptoms
    const diseaseSymptoms = new Map<string, Set<string>>();

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const columns = parseCSVLine(line);
      if (columns.length < 2) continue;

      const disease = columns[0].trim().replace(/"/g, "").toLowerCase();
      if (!diseaseSymptoms.has(disease)) {
        diseaseSymptoms.set(disease, new Set<string>());
      }

      const symptomsSet = diseaseSymptoms.get(disease)!;
      for (let j = 1; j < columns.length; j++) {
        const val = columns[j]?.trim();
        if (val === "1" || val === "1.0") {
          symptomsSet.add(symptomNames[j - 1]);
        }
      }
    }

    const diseasesList = Array.from(diseaseSymptoms.keys());
    console.log(`🧪 Found ${diseasesList.length} unique diseases. Starting double-embedding generation...`);

    const batch: any[] = [];
    const batchSize = 5;

    for (let index = 0; index < diseasesList.length; index++) {
      const disease = diseasesList[index];
      const symptomsSet = diseaseSymptoms.get(disease)!;
      const symptomsArray = Array.from(symptomsSet);

      if (symptomsArray.length === 0) continue;

      const symptomsText = symptomsArray.join(", ");

      // 3. Build two embedding texts
      // Text A - symptoms only
      const textA = symptomsText;
      // Text B - rich sentence
      const textB = `Patient with ${capitalize(disease)} presents: ${symptomsText}. Common tropical disease in West Africa.`;

      // Generate embeddings
      const embA = await embedQuery(textA);
      const embB = await embedQuery(textB);

      // Average the two embeddings
      const embedding = new Array(384).fill(0);
      for (let d = 0; d < 384; d++) {
        embedding[d] = (embA[d] + embB[d]) / 2;
      }

      // 4. Apply geo_boost
      const geo_boost = GEO_BOOSTS[disease] || 1.0;

      batch.push({
        disease_name: capitalize(disease),
        symptoms_text: symptomsText,
        rich_text: textB,
        symptom_list: symptomsArray,
        geo_boost,
        embedding,
      });

      console.log(`✓ [${index + 1}/${diseasesList.length}] ${capitalize(disease)} — boost: ${geo_boost}`);

      // 5. Insert to Supabase in batches of 5 with 1200ms sleep
      if (batch.length === batchSize || index === diseasesList.length - 1) {
        const { error: insertError } = await supabase
          .from("disease_embeddings")
          .insert(batch);

        if (insertError) {
          console.error(`❌ Batch insert failed: ${insertError.message}`);
        } else {
          console.log(`🚀 Successfully inserted batch of ${batch.length} diseases.`);
        }

        // Clear batch
        batch.length = 0;

        if (index < diseasesList.length - 1) {
          await sleep(1200);
        }
      }
    }

    console.log("✨ Ingestion completed successfully!");
  } catch (error) {
    console.error("❌ Unhandled ingestion error:", error);
    process.exit(1);
  }
}

run();
