// backend/src/routes/ingest.ts
// POST /ingest — charge data_symptom.csv → embeddings → Supabase
// Protégé par INGEST_SECRET pour éviter les appels non autorisés

import { Router, Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

const router = Router();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const GEO_BOOST: Record<string, number> = {
  "malaria": 1.9, "typhoid fever": 1.7, "cholera": 1.5,
  "dengue fever": 1.4, "meningitis": 1.3, "yellow fever": 1.3,
  "tuberculosis": 1.3, "sickle-cell anemia": 1.4, "lassa fever": 1.2,
  "hepatitis": 1.2, "pneumonia": 1.2,
};

async function generateEmbedding(text: string): Promise<number[]> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(
        "https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY!}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ inputs: text, options: { wait_for_model: true } }),
        }
      );
      if (!res.ok) throw new Error(`HF ${res.status}`);
      const data = await res.json();
      return Array.isArray(data[0]) ? data[0] : data;
    } catch (err) {
      if (attempt === 2) throw err;
      await new Promise(r => setTimeout(r, 1500 * (attempt + 1)));
    }
  }
  throw new Error("Embedding failed");
}

function averageEmbeddings(a: number[], b: number[]): number[] {
  return a.map((v, i) => (v + b[i]) / 2);
}

function parseCSV(content: string): Record<string, string>[] {
  const lines = content.trim().split("\n");
  const headers = lines[0].split(",").map(h => h.trim().replace(/"/g, "").replace(/\r/g, ""));
  return lines.slice(1).map(line => {
    const values = line.split(",").map(v => v.trim().replace(/"/g, "").replace(/\r/g, ""));
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = values[i] || "0"; });
    return row;
  });
}

router.post("/", async (req: Request, res: Response) => {
  // Sécurité simple
  const secret = req.headers["x-ingest-secret"];
  if (secret !== process.env.INGEST_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    // Vérifier si déjà ingéré
    const { count } = await supabase
      .from("disease_embeddings")
      .select("*", { count: "exact", head: true });

    if (count && count > 0) {
      return res.json({ message: `Already ingested (${count} diseases)`, skipped: true });
    }

    // Chercher le CSV (racine du repo ou backend/data/)
    const possiblePaths = [
      path.join(process.cwd(), "..", "data_symptom.csv"),
      path.join(process.cwd(), "data", "data_symptom.csv"),
      path.join(process.cwd(), "data_symptom.csv"),
    ];

    let csvContent: string | null = null;
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        csvContent = fs.readFileSync(p, "utf-8");
        console.log(`📄 CSV found at: ${p}`);
        break;
      }
    }

    if (!csvContent) {
      return res.status(404).json({ error: "data_symptom.csv not found" });
    }

    const rows = parseCSV(csvContent);

    // Dédoublonner par maladie
    const diseaseMap = new Map<string, Set<string>>();
    for (const row of rows) {
      const disease = row["diseases"]?.trim();
      if (!disease) continue;
      if (!diseaseMap.has(disease)) diseaseMap.set(disease, new Set());
      Object.entries(row).forEach(([key, val]) => {
        if (key !== "diseases" && val === "1") {
          diseaseMap.get(disease)!.add(key.replace(/_/g, " "));
        }
      });
    }

    const diseases = Array.from(diseaseMap.entries());
    console.log(`🔬 ${diseases.length} unique diseases to ingest`);

    res.json({
      message: "Ingestion started",
      total: diseases.length,
      status: "processing"
    });

    // Ingestion async (ne bloque pas la réponse)
    (async () => {
      let success = 0;
      let errors = 0;
      const BATCH = 5;

      for (let i = 0; i < diseases.length; i += BATCH) {
        const batch = diseases.slice(i, i + BATCH);
        await Promise.all(batch.map(async ([disease, symptomsSet]) => {
          try {
            const symptomsText = Array.from(symptomsSet).join(", ");
            const richText = `Patient with ${disease} presents symptoms: ${symptomsText}. Common in West Africa.`;
            const geoBoost = GEO_BOOST[disease.toLowerCase()] || 1.0;

            // Double embedding → moyenne
            const [embA, embB] = await Promise.all([
              generateEmbedding(symptomsText),
              generateEmbedding(richText),
            ]);
            const embedding = averageEmbeddings(embA, embB);

            await supabase.from("disease_embeddings").insert({
              disease_name: disease,
              symptoms_text: symptomsText,
              rich_text: richText,
              symptom_list: Array.from(symptomsSet),
              geo_boost: geoBoost,
              embedding,
            });
            success++;
            console.log(`  ✓ [${success}/${diseases.length}] ${disease}`);
          } catch (err: any) {
            errors++;
            console.error(`  ✗ ${disease}: ${err.message}`);
          }
        }));
        await new Promise(r => setTimeout(r, 1200));
      }
      console.log(`\n✅ Ingestion done: ${success} ok, ${errors} errors`);
    })();

  } catch (err: any) {
    console.error("Ingest error:", err);
    return res.status(500).json({ error: err.message });
  }
});

// GET /ingest/status — vérifie combien de maladies sont en base
router.get("/status", async (_req: Request, res: Response) => {
  const { count, error } = await supabase
    .from("disease_embeddings")
    .select("*", { count: "exact", head: true });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ count, ready: (count || 0) > 0 });
});

export default router;