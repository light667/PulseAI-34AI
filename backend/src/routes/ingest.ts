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
  "tuberculosis": 1.3, "sickle-cell anemia": 1.4,
  "lassa fever": 1.2, "hepatitis": 1.2, "pneumonia": 1.2,
};

// ── HuggingFace API directement — pas de modèle local ───────────────────────
async function embedHF(text: string): Promise<number[]> {
  const HF_KEY = process.env.HUGGINGFACE_API_KEY!;

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
        console.log("   ⏳ HF model loading, waiting 15s...");
        await sleep(15000);
        continue;
      }
      if (res.status === 429) {
        console.log("   ⏳ HF rate limit, waiting 30s...");
        await sleep(30000);
        continue;
      }
      if (!res.ok) throw new Error(`HF ${res.status}: ${await res.text()}`);

      const raw = await res.json() as number[] | number[][];
      return Array.isArray(raw[0]) ? (raw[0] as number[]) : (raw as number[]);

    } catch (err) {
      if (attempt === 3) throw err;
      await sleep(2000 * (attempt + 1));
    }
  }
  throw new Error("Embed failed after 4 attempts");
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

function parseCSV(content: string): Record<string, string>[] {
  const lines = content.trim().split("\n");
  const headers = lines[0]
    .split(",")
    .map(h => h.trim().replace(/"/g, "").replace(/\r/g, ""));
  return lines.slice(1).map(line => {
    const values = line.split(",")
      .map(v => v.trim().replace(/"/g, "").replace(/\r/g, ""));
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = values[i] || "0"; });
    return row;
  });
}

function findCSV(): string | null {
  const cwd = process.cwd();
  const candidates = [
    // Chemin exact confirmé par debug Render
    "/opt/render/project/src/public/data/data_symptom.csv",
    path.join(cwd, "..", "public", "data", "data_symptom.csv"),
    path.join(cwd, "..", "data_symptom.csv"),
    path.join(cwd, "data_symptom.csv"),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      console.log(`✅ CSV found: ${p}`);
      return p;
    }
  }
  console.error("❌ CSV not found. Searched:", candidates);
  return null;
}

// ── POST /ingest ─────────────────────────────────────────────────────────────
router.post("/", async (req: Request, res: Response) => {
  const secret = req.headers["x-ingest-secret"];
  const validSecret = process.env.INGEST_SECRET;
  if (validSecret && secret !== validSecret) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const { count } = await supabase
      .from("disease_embeddings")
      .select("*", { count: "exact", head: true });

    if (count && count > 0) {
      return res.json({
        message: `Already ingested (${count} diseases)`,
        skipped: true,
        count,
      });
    }

    const csvPath = findCSV();
    if (!csvPath) {
      return res.status(404).json({
        error: "data_symptom.csv not found",
        cwd: process.cwd(),
      });
    }

    const rows = parseCSV(fs.readFileSync(csvPath, "utf-8"));

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
    console.log(`🔬 ${diseases.length} diseases to ingest via HuggingFace API`);

    // Répondre immédiatement
    res.json({
      message: "Ingestion started",
      total: diseases.length,
      note: "Check /ingest/status for progress",
    });

    // Ingestion async
    (async () => {
      let success = 0;
      let errors  = 0;

      for (const [disease, symptomsSet] of diseases) {
        try {
          const symptomsText = Array.from(symptomsSet).join(", ");
          const geoBoost = GEO_BOOST[disease.toLowerCase()] || 1.0;

          const embedding = await embedHF(symptomsText);

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
          console.log(`  ✓ [${success}/${diseases.length}] ${disease}`);

          // 1.1s entre chaque appel HF
          await sleep(1100);

        } catch (err: any) {
          errors++;
          console.error(`  ✗ ${disease}: ${err.message}`);
        }
      }

      console.log(`\n✅ Ingestion done: ${success} ok, ${errors} errors`);
    })();

  } catch (err: any) {
    console.error("Ingest error:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    }
  }
});

// ── GET /ingest/status ────────────────────────────────────────────────────────
router.get("/status", async (_req: Request, res: Response) => {
  const { count, error } = await supabase
    .from("disease_embeddings")
    .select("*", { count: "exact", head: true });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ count: count || 0, ready: (count || 0) > 0 });
});

export default router;