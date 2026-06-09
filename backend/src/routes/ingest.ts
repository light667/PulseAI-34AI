import { Router, Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";
import { generateEmbedding } from "../lib/embeddings";

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

function averageEmbeddings(a: number[], b: number[]): number[] {
  return a.map((v, i) => (v + b[i]) / 2);
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
  // Render clone le repo dans /opt/render/project/src/
  // Le backend tourne depuis /opt/render/project/src/backend
  const cwd = process.cwd();
  const possiblePaths = [
    path.join(cwd, "..", "public", "data", "data_symptom.csv"),
    path.join(cwd, "..", "public", "data", "diseases_symptoms.csv"),
    path.join(cwd, "..", "data_symptom.csv"),
    path.join(cwd, "..", "data", "data_symptom.csv"),
    path.join(cwd, "data", "data_symptom.csv"),
    path.join(cwd, "data_symptom.csv"),
    // Chemin absolu Render
    "/opt/render/project/src/public/data/data_symptom.csv",
    "/opt/render/project/src/public/data/diseases_symptoms.csv",
    "/opt/render/project/src/data_symptom.csv",
  ];

  console.log("📂 CWD:", cwd);
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      console.log("✅ CSV found:", p);
      return p;
    }
  }
  console.error("❌ CSV not found. Searched:", possiblePaths);
  return null;
}

router.post("/", async (req: Request, res: Response) => {
  const secret = req.headers["x-ingest-secret"];
  if (secret !== process.env.INGEST_SECRET) {
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
        error: "data_symptom.csv not found on server",
        hint: "Place the CSV at public/data/data_symptom.csv in the repo root",
      });
    }

    const csvContent = fs.readFileSync(csvPath, "utf-8");
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
    console.log(`🔬 ${diseases.length} diseases to ingest`);

    // Répondre immédiatement — ingestion async
    res.json({
      message: "Ingestion started",
      total: diseases.length,
      status: "processing",
    });

    // Ingestion en arrière-plan
    (async () => {
      let success = 0;
      let errors = 0;
      const BATCH = 3; // Petit batch pour ne pas saturer le modèle local

      for (let i = 0; i < diseases.length; i += BATCH) {
        const batch = diseases.slice(i, i + BATCH);

        for (const [disease, symptomsSet] of batch) {
          try {
            const symptomsText = Array.from(symptomsSet).join(", ");
            const richText = `Patient with ${disease} presents: ${symptomsText}. Common disease in West Africa.`;
            const geoBoost = GEO_BOOST[disease.toLowerCase()] || 1.0;

            // Double embedding → moyenne
            const [embA, embB] = await Promise.all([
              generateEmbedding(symptomsText),
              generateEmbedding(richText),
            ]);
            const embedding = averageEmbeddings(embA, embB);

            const { error } = await supabase
              .from("disease_embeddings")
              .insert({
                disease_name: disease,
                symptoms_text: symptomsText,
                rich_text: richText,
                symptom_list: Array.from(symptomsSet),
                geo_boost: geoBoost,
                embedding,
              });

            if (error) throw error;
            success++;
            console.log(`  ✓ [${success}/${diseases.length}] ${disease}`);
          } catch (err: any) {
            errors++;
            console.error(`  ✗ ${disease}: ${err.message}`);
          }

          // Pause entre chaque item pour le modèle local
          await new Promise(r => setTimeout(r, 200));
        }

        // Pause entre batches
        await new Promise(r => setTimeout(r, 500));
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

router.get("/status", async (_req: Request, res: Response) => {
  const { count, error } = await supabase
    .from("disease_embeddings")
    .select("*", { count: "exact", head: true });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ count: count || 0, ready: (count || 0) > 0 });
});

export default router;