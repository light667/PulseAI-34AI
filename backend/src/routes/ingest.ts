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

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

// HF API — un seul appel à la fois, libère immédiatement
async function embedOne(text: string): Promise<number[] | null> {
  const key = process.env.HUGGINGFACE_API_KEY!;
  try {
    const res = await fetch(
      "https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ inputs: text.slice(0, 300), options: { wait_for_model: true } }),
      }
    );
    if (res.status === 503) { await sleep(15000); return null; }
    if (res.status === 429) { await sleep(35000); return null; }
    if (!res.ok) return null;
    const raw = await res.json() as number[] | number[][];
    return Array.isArray(raw[0]) ? (raw[0] as number[]) : (raw as number[]);
  } catch {
    return null;
  }
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

// État global de progression (pour /ingest/progress)
let ingestState = {
  running: false,
  total: 0,
  done: 0,
  errors: 0,
  lastDisease: "",
};

router.post("/", async (req: Request, res: Response) => {
  const secret = req.headers["x-ingest-secret"];
  const validSecret = process.env.INGEST_SECRET;
  if (validSecret && secret !== validSecret) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (ingestState.running) {
    return res.json({
      message: "Ingestion already running",
      progress: `${ingestState.done}/${ingestState.total}`,
    });
  }

  try {
    const { count } = await supabase
      .from("disease_embeddings")
      .select("*", { count: "exact", head: true });

    if (count && count > 0) {
      return res.json({ message: `Already done (${count})`, skipped: true });
    }

    // Trouver le CSV
    const csvPath = "/opt/render/project/src/public/data/data_symptom.csv";
    if (!fs.existsSync(csvPath)) {
      return res.status(404).json({ error: "CSV not found", path: csvPath });
    }

    const rows = parseCSV(fs.readFileSync(csvPath, "utf-8"));

    // Dédoublonner
    const diseaseMap = new Map<string, string[]>();
    for (const row of rows) {
      const disease = row["diseases"]?.trim();
      if (!disease) continue;
      if (!diseaseMap.has(disease)) diseaseMap.set(disease, []);
      Object.entries(row).forEach(([key, val]) => {
        if (key !== "diseases" && val === "1") {
          diseaseMap.get(disease)!.push(key.replace(/_/g, " "));
        }
      });
    }

    // Dédupliquer les symptômes
    const diseases: [string, string[]][] = Array.from(diseaseMap.entries())
      .map(([d, s]) => [d, [...new Set(s)]]);

    ingestState = { running: true, total: diseases.length, done: 0, errors: 0, lastDisease: "" };

    // Répondre immédiatement
    res.json({ message: "Ingestion started", total: diseases.length });

    // Traitement séquentiel strict — un par un
    ;(async () => {
      for (const [disease, symptoms] of diseases) {
        // Texte court pour économiser mémoire
        const symptomsText = symptoms.slice(0, 20).join(", ");
        const geoBoost = GEO_BOOST[disease.toLowerCase()] || 1.0;

        // Retry si null (503 ou rate limit)
        let embedding: number[] | null = null;
        for (let retry = 0; retry < 3 && !embedding; retry++) {
          embedding = await embedOne(symptomsText);
          if (!embedding) await sleep(5000);
        }

        if (!embedding) {
          ingestState.errors++;
          console.error(`  ✗ ${disease}: embedding failed`);
          continue;
        }

        const { error } = await supabase.from("disease_embeddings").insert({
          disease_name:  disease,
          symptoms_text: symptomsText,
          rich_text:     `${disease}: ${symptomsText}`,
          symptom_list:  symptoms,
          geo_boost:     geoBoost,
          embedding,
        });

        if (error) {
          ingestState.errors++;
          console.error(`  ✗ ${disease}: ${error.message}`);
        } else {
          ingestState.done++;
          ingestState.lastDisease = disease;
          console.log(`  ✓ [${ingestState.done}/${diseases.length}] ${disease}`);
        }

        // Libérer la mémoire + respecter rate limit HF
        embedding = null;
        await sleep(1200);
      }

      ingestState.running = false;
      console.log(`\n✅ Ingestion done: ${ingestState.done} ok, ${ingestState.errors} errors`);
    })();

  } catch (err: any) {
    ingestState.running = false;
    console.error("Ingest error:", err);
    if (!res.headersSent) res.status(500).json({ error: err.message });
  }
});

// Progression en temps réel
router.get("/progress", (_req: Request, res: Response) => {
  res.json(ingestState);
});

router.get("/status", async (_req: Request, res: Response) => {
  const { count, error } = await supabase
    .from("disease_embeddings")
    .select("*", { count: "exact", head: true });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ count: count || 0, ready: (count || 0) > 0 });
});

export default router;