import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

// ── Environment ───────────────────────────────────────────────────────────
dotenv.config({ path: path.join(__dirname, "../.env") });
dotenv.config({ path: path.join(__dirname, "../../.env") });
dotenv.config({ path: path.join(__dirname, "../../.env.local") });

const app = express();
const PORT = parseInt(process.env.PORT || "5000", 10);

// ── CORS ─────────────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:3001",
  process.env.FRONTEND_URL,
  process.env.NEXT_PUBLIC_APP_URL,
].filter(Boolean) as string[];

app.use(
  cors({
    origin: (origin, cb) => {
      // Allow requests with no origin (curl, Render health checks)
      if (!origin) return cb(null, true);
      if (ALLOWED_ORIGINS.some((o) => origin.startsWith(o))) return cb(null, true);
      cb(new Error(`CORS: Origin ${origin} not allowed`));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "2mb" }));

// ── Supabase client ───────────────────────────────────────────────────────
let supabase: SupabaseClient | null = null;
const sbUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const sbKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

if (sbUrl && sbKey) {
  supabase = createClient(sbUrl, sbKey);
  console.log("✅  Supabase client ready");
} else {
  console.warn("⚠️  Supabase not configured — vector search will be unavailable");
}

// ── Types ─────────────────────────────────────────────────────────────────
interface ExtractionResult {
  symptoms_en: string[];
  symptoms_query: string;
  duration: string;
  intensity: string;
  body_parts: string[];
  fever: boolean;
  chronic_indicators: boolean;
}

interface DiseaseMatch {
  disease_name: string;
  symptoms_text: string;
  similarity: number;
  geo_boost: number;
  final_score: number;
  percentage?: number;
}

// ── Utilities ─────────────────────────────────────────────────────────────
function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// ── HuggingFace Embeddings ────────────────────────────────────────────────
async function embedQuery(text: string): Promise<number[]> {
  const apiKey = process.env.HUGGINGFACE_API_KEY;
  if (!apiKey) throw new Error("HUGGINGFACE_API_KEY not configured");

  const HF_MODEL = "sentence-transformers/all-MiniLM-L6-v2";
  let delay = 1200;

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
        const err = await res.text();
        if (res.status === 503) {
          console.warn(`[Embed] Model loading (attempt ${attempt}/3) — waiting…`);
          await sleep(delay * 2);
          delay *= 2;
          continue;
        }
        throw new Error(`HF API ${res.status}: ${err.slice(0, 200)}`);
      }

      const result = await res.json();
      if (Array.isArray(result)) {
        const vec = Array.isArray(result[0])
          ? (result[0] as number[])
          : (result as number[]);
        if (vec.length === 384) return vec;
        // handle nested: [[...384 values...]]
        const flat = (result as number[][]).flat();
        if (flat.length === 384) return flat;
        throw new Error(`Unexpected embedding length: ${vec.length}`);
      }
      throw new Error("Unexpected HF response shape");
    } catch (err) {
      console.warn(`[Embed] Attempt ${attempt}/3 failed: ${err}`);
      if (attempt === 3) throw err;
      await sleep(delay);
      delay *= 2;
    }
  }
  throw new Error("Embedding failed after 3 attempts");
}

// ── Groq NLP Symptom Extractor ────────────────────────────────────────────
async function extractSymptoms(
  text: string,
  language: string
): Promise<ExtractionResult> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY not configured");

  const systemPrompt =
    "Tu es un extracteur médical précis. Tu reçois une description de symptômes en langage naturel et extrais les informations structurées. Réponds UNIQUEMENT en JSON valide, aucun texte autour.";

  const userPrompt = `Texte du patient (langue: ${language}): "${text}"

Extrais et retourne ce JSON exact:
{
  "symptoms_en": ["symptom1_en", "symptom2_en"],
  "symptoms_query": "short english phrase of all symptoms for vector search",
  "duration": "hours|1_day|2_3_days|1_week|more|unknown",
  "intensity": "mild|moderate|severe|unknown",
  "body_parts": ["head", "chest", "abdomen"],
  "fever": true,
  "chronic_indicators": false
}

Règles:
- symptoms_en: termes médicaux anglais standards (fever, headache, fatigue, nausea, vomiting, diarrhea, cough, shortness_of_breath, chest_pain, abdominal_pain, back_pain, joint_pain, skin_rash, dizziness, loss_of_appetite, chills, sweating, sore_throat, runny_nose, muscle_pain)
- symptoms_query: phrase optimisée pour similarité vectorielle ex: "fever headache fatigue nausea 3 days moderate"
- Si symptôme ambigu, l'inclure quand même`;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.1,
          response_format: { type: "json_object" },
          max_tokens: 500,
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Groq API ${res.status}: ${err.slice(0, 200)}`);
      }

      const data = await res.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) throw new Error("Empty Groq response");

      const parsed = JSON.parse(content) as ExtractionResult;
      // Sanitize
      if (!Array.isArray(parsed.symptoms_en)) parsed.symptoms_en = [];
      if (!parsed.symptoms_query) parsed.symptoms_query = parsed.symptoms_en.join(" ");
      return parsed;
    } catch (err) {
      console.warn(`[Extract] Attempt ${attempt}/2 failed: ${err}`);
      if (attempt === 2) throw err;
    }
  }
  throw new Error("Symptom extraction failed");
}

// ── Supabase Vector Search ────────────────────────────────────────────────
async function retrieveDiseases(
  extraction: ExtractionResult
): Promise<DiseaseMatch[]> {
  if (!supabase) throw new Error("Supabase not initialized");

  // Dual query: symptoms_query + raw symptom list → merge with consensus bonus
  const [embA, embB] = await Promise.all([
    embedQuery(extraction.symptoms_query),
    embedQuery(extraction.symptoms_en.join(", ")),
  ]);

  const [resA, resB] = await Promise.all([
    supabase.rpc("match_diseases", { query_embedding: embA, match_count: 8 }),
    supabase.rpc("match_diseases", { query_embedding: embB, match_count: 8 }),
  ]);

  if (resA.error) throw new Error(`match_diseases A: ${resA.error.message}`);
  if (resB.error) throw new Error(`match_diseases B: ${resB.error.message}`);

  const merged = new Map<string, DiseaseMatch>();

  for (const r of (resA.data || []) as DiseaseMatch[]) {
    merged.set(r.disease_name.toLowerCase(), { ...r });
  }

  for (const r of (resB.data || []) as DiseaseMatch[]) {
    const key = r.disease_name.toLowerCase();
    if (merged.has(key)) {
      const existing = merged.get(key)!;
      // Consensus bonus: diseases appearing in BOTH queries get +15%
      existing.similarity = (existing.similarity + r.similarity) / 2;
      existing.final_score = ((existing.final_score + r.final_score) / 2) * 1.15;
    } else {
      merged.set(key, { ...r });
    }
  }

  let top5 = Array.from(merged.values())
    .sort((a, b) => b.final_score - a.final_score)
    .slice(0, 5);

  // Normalize to percentages (sum = 100%)
  const total = top5.reduce((s, m) => s + m.final_score, 0);
  if (total > 0) {
    top5 = top5.map((m) => ({
      ...m,
      percentage: Math.round((m.final_score / total) * 100),
    }));
  } else {
    top5 = top5.map((m) => ({ ...m, percentage: Math.round(100 / top5.length) }));
  }

  return top5;
}

// ── Diagnosis Prompt Builder ──────────────────────────────────────────────
const DIAGNOSIS_SYSTEM_PROMPT = `Tu es RuralDiag, moteur de diagnostic médical de Pulse AI.
Tu analyses des symptômes dans le contexte de l'Afrique de l'Ouest (Togo, Bénin, Nigeria, Ghana, Côte d'Ivoire).
Tu reçois les résultats d'un système RAG médical et produis un diagnostic structuré précis.
Réponds UNIQUEMENT en JSON valide, aucun texte avant ou après.`;

function buildDiagnosisPrompt(params: {
  top5: DiseaseMatch[];
  symptoms_text: string;
  duration: string;
  intensity: string;
  age?: number | string;
  sex?: string;
  country: string;
  context?: string;
  language: string;
}): string {
  const ragList =
    params.top5.length > 0
      ? params.top5
          .map(
            (d) =>
              `- ${d.disease_name} (${d.percentage ?? 0}%) | similarité: ${(d.similarity * 100).toFixed(1)}% | symptômes: ${d.symptoms_text.slice(0, 100)}`
          )
          .join("\n")
      : "- Aucune correspondance vectorielle trouvée — raisonnement clinique pur requis";

  return `RÉSULTATS RAG — TOP 5 MALADIES (classées par score vectoriel):
${ragList}

PROFIL PATIENT:
Symptômes décrits: ${params.symptoms_text}
Durée: ${params.duration} | Intensité: ${params.intensity}
Âge: ${params.age ?? "non spécifié"} | Sexe: ${params.sex ?? "non spécifié"} | Pays: ${params.country}
Contexte: ${params.context ?? "aucun"}

Produis ce JSON exact (aucun commentaire, aucun markdown):
{
  "conditions": [
    {
      "name": "Nom de la maladie",
      "probability": 85,
      "description": "Description en 2 phrases: cause + contexte africain",
      "recommendation": "Action concrète et immédiate"
    }
  ],
  "severity": "LOW",
  "severityScore": 4,
  "severityMessage": "Message clair sur l'urgence",
  "firstAid": ["Action 1", "Action 2", "Action 3"],
  "doNots": ["Ne pas faire 1", "Ne pas faire 2"],
  "disclaimer": "Ce diagnostic IA est indicatif. Consultez toujours un professionnel de santé qualifié."
}

Règles critiques:
- severity: "CRITICAL" si fièvre > 39.5°C, douleur thoracique, ou détresse respiratoire sévère
- severity: "HIGH" si symptômes multiples depuis > 3 jours ou aggravation rapide
- severity: "MEDIUM" si symptômes modérés < 3 jours
- severity: "LOW" si symptômes légers ou en amélioration
- severityScore: 1-10 (10 = urgence absolue)
- Priorise paludisme/typhoïde/méningite/choléra en contexte ouest-africain
- conditions: 2 à 5 entrées ordonnées par probabilité décroissante
- Réponds en ${params.language === "fr" ? "français" : params.language === "en" ? "anglais" : params.language}
- Ne prescris JAMAIS de médicaments sur ordonnance
- Inclure toujours le disclaimer`;
}

// ── Lyra Helpers ──────────────────────────────────────────────────────────
const LYRA_FALLBACK = [
  "Prendre quelques respirations profondes peut aider à calmer l'anxiété immédiate.",
  "Parler à une personne de confiance est un premier pas important pour la santé mentale.",
  "Le sommeil régulier (7-8h) améliore l'humeur et la résilience au stress.",
  "En Afrique de l'Ouest, la stigmatisation autour de la santé mentale est réelle — demander de l'aide est courageux.",
  "Des activités simples (marche, musique, prière/méditation) peuvent stabiliser l'humeur.",
];

async function getLyraContext(query: string, count = 5): Promise<string> {
  if (!supabase) return LYRA_FALLBACK.slice(0, count).join("\n\n");
  try {
    const embedding = await embedQuery(query);
    const { data, error } = await supabase.rpc("match_lyra_knowledge", {
      query_embedding: embedding,
      match_threshold: 0.65,
      match_count: count,
    });
    if (error || !data?.length) return LYRA_FALLBACK.slice(0, count).join("\n\n");
    return (data as { content: string }[]).map((c) => c.content).join("\n\n");
  } catch {
    return LYRA_FALLBACK.slice(0, count).join("\n\n");
  }
}

function lyraSystemPrompt(language: string, context: string): string {
  if (language === "fr") {
    return `Tu es Lyra, thérapeute virtuelle de Pulse AI. Tu es chaleureuse, empathique, culturellement sensible au contexte ouest-africain.

CONTEXTE RAG:
${context}

RÈGLES:
- Jamais de diagnostic psychiatrique
- Valide toujours les émotions avant de donner une perspective
- Langage simple et humain, pas clinique
- Si l'utilisateur mentionne des idées suicidaires: donne immédiatement SOS Togo: +228 22 22 22 22 | Nigeria: 0800-SAFELINE
- Réponds en français
- Réponses < 150 mots sauf si soutien étendu nécessaire
- Termine toujours par une question douce ou une affirmation`;
  }
  return `You are Lyra, Pulse AI's virtual therapist. You are warm, empathetic, and culturally sensitive to the West African context.

RETRIEVED CONTEXT:
${context}

RULES:
- Never give a psychiatric diagnosis
- Always validate emotions before offering perspective
- Simple, human language — not clinical
- If the user mentions suicidal thoughts: immediately provide SOS Togo: +228 22 22 22 22 | Nigeria: 0800-SAFELINE
- Respond in English
- Responses < 150 words unless extended support is needed
- Always end with a gentle question or affirmation`;
}

// ── ROUTES ────────────────────────────────────────────────────────────────

// Health check
app.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    services: {
      supabase: !!supabase,
      mistral: !!process.env.MISTRAL_API_KEY,
      groq: !!process.env.GROQ_API_KEY,
      huggingface: !!process.env.HUGGINGFACE_API_KEY,
    },
  });
});

// POST /api/diagnose
app.post("/api/diagnose", async (req: Request, res: Response) => {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const {
        symptoms,
        language = "fr",
        country = "togo",
        age,
        sex,
        context,
      } = req.body;

      if (!symptoms || typeof symptoms !== "string" || symptoms.trim().length < 10) {
        return res.status(400).json({ error: "Symptom description too short (min 10 chars)" });
      }

      const mistralKey = process.env.MISTRAL_API_KEY;
      if (!mistralKey) throw new Error("MISTRAL_API_KEY not configured");

      console.log(`[Diagnose] Attempt ${attempt} — language: ${language}, country: ${country}`);

      // Step 1 — NLP extraction via Groq
      console.log("[Diagnose] Step 1: Extracting symptoms via Groq…");
      const extraction = await extractSymptoms(symptoms, language);
      console.log(
        `[Diagnose] Extracted: ${extraction.symptoms_en.length} symptoms | query: "${extraction.symptoms_query}"`
      );

      // Step 2 — Vector search via Supabase
      console.log("[Diagnose] Step 2: Vector search in Supabase…");
      let matches: DiseaseMatch[] = [];
      let lowConfidence = true;

      try {
        matches = await retrieveDiseases(extraction);
        lowConfidence = matches.length === 0 || matches[0].similarity < 0.3;
        console.log(
          `[Diagnose] Found ${matches.length} matches | top: ${matches[0]?.disease_name} (${(matches[0]?.similarity * 100 || 0).toFixed(1)}%)`
        );
      } catch (ragErr) {
        console.error("[Diagnose] Vector search failed (continuing):", ragErr);
        lowConfidence = true;
      }

      // Step 3 — Mistral synthesis (RAG + clinical reasoning)
      console.log("[Diagnose] Step 3: Mistral synthesis…");
      const diagPrompt = buildDiagnosisPrompt({
        top5: matches,
        symptoms_text: symptoms,
        duration: extraction.duration,
        intensity: extraction.intensity,
        age,
        sex,
        country,
        context,
        language,
      });

      const mistralRes = await fetch("https://api.mistral.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${mistralKey}`,
        },
        body: JSON.stringify({
          model: "mistral-medium-latest",
          messages: [
            { role: "system", content: DIAGNOSIS_SYSTEM_PROMPT },
            { role: "user", content: diagPrompt },
          ],
          temperature: 0.2,
          max_tokens: 1800,
          response_format: { type: "json_object" },
        }),
      });

      if (!mistralRes.ok) {
        const errText = await mistralRes.text();
        throw new Error(`Mistral API ${mistralRes.status}: ${errText.slice(0, 200)}`);
      }

      const mistralData = await mistralRes.json();
      const content = mistralData.choices?.[0]?.message?.content;
      if (!content) throw new Error("Empty Mistral response");

      const result = JSON.parse(content);
      console.log(
        `[Diagnose] ✅ Done — severity: ${result.severity}, conditions: ${result.conditions?.length}`
      );

      return res.json({
        ...result,
        lowConfidence,
        rawMatches: matches.map((m) => ({
          disease_name: m.disease_name,
          similarity: parseFloat((m.similarity * 100).toFixed(1)),
          percentage: m.percentage,
        })),
      });
    } catch (err) {
      console.error(`[Diagnose] Attempt ${attempt}/2 failed:`, err);
      if (attempt >= 2) {
        return res.status(503).json({
          error:
            "Le moteur de diagnostic est temporairement indisponible. Réessayez dans quelques instants.",
        });
      }
      await sleep(1500);
    }
  }
});

// POST /api/lyra (streaming SSE)
app.post("/api/lyra", async (req: Request, res: Response) => {
  try {
    const { message, conversationHistory, history, language = "fr" } = req.body;
    const activeHistory = conversationHistory || history || [];

    if (!message?.trim()) {
      return res.status(400).json({ error: "Message required" });
    }

    const mistralKey = process.env.MISTRAL_API_KEY;
    if (!mistralKey) throw new Error("MISTRAL_API_KEY not configured");

    // Retrieve RAG context from lyra_knowledge
    const contextText = await getLyraContext(message);

    const messages = [
      { role: "system", content: lyraSystemPrompt(language, contextText) },
      ...activeHistory.map((m: { role: string; content: string }) => ({
        role: m.role,
        content: m.content,
      })),
      { role: "user", content: message },
    ];

    const mistralRes = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${mistralKey}`,
      },
      body: JSON.stringify({
        model: "mistral-medium-latest",
        messages,
        stream: true,
        temperature: 0.7,
        max_tokens: 400,
      }),
    });

    if (!mistralRes.ok) {
      const errText = await mistralRes.text();
      throw new Error(`Mistral API ${mistralRes.status}: ${errText}`);
    }

    // SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");

    // Send RAG metadata first
    res.write(
      JSON.stringify({
        type: "metadata",
        retrievedChunks: [{ id: "ctx", content: contextText, source: "vector_db", similarity: 1.0 }],
      }) + "\n"
    );

    // Stream response
    const nodeStream = mistralRes.body as unknown as NodeJS.ReadableStream & {
      getReader?: () => ReadableStreamDefaultReader<Uint8Array>;
    };

    if (typeof (nodeStream as any).getReader === "function") {
      // Web ReadableStream (Node 18+)
      const reader = (nodeStream as any).getReader() as ReadableStreamDefaultReader<Uint8Array>;
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";

        for (const line of lines) {
          const clean = line.trim();
          if (!clean.startsWith("data: ")) continue;
          const payload = clean.slice(6).trim();
          if (payload === "[DONE]") break;
          try {
            const parsed = JSON.parse(payload);
            const text = parsed.choices?.[0]?.delta?.content || "";
            if (text) res.write(JSON.stringify({ type: "chunk", text }) + "\n");
          } catch {
            /* partial line */
          }
        }
      }
      res.end();
    } else {
      // Node.js stream
      nodeStream.on("data", (chunk: Buffer) => {
        for (const line of chunk.toString().split("\n")) {
          const clean = line.trim();
          if (!clean.startsWith("data: ")) continue;
          const payload = clean.slice(6).trim();
          if (payload === "[DONE]") { res.end(); return; }
          try {
            const parsed = JSON.parse(payload);
            const text = parsed.choices?.[0]?.delta?.content || "";
            if (text) res.write(JSON.stringify({ type: "chunk", text }) + "\n");
          } catch { /* partial */ }
        }
      });
      nodeStream.on("end", () => res.end());
      nodeStream.on("error", () => res.end());
    }
  } catch (err) {
    console.error("[Lyra] Error:", err);
    if (!res.headersSent) {
      res.status(503).json({ error: "Lyra is temporarily unavailable." });
    } else {
      res.end();
    }
  }
});

// 404 catch-all
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "Endpoint not found" });
});

// Error middleware
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("[Server Error]", err.message);
  res.status(500).json({ error: err.message });
});

// ── Start ─────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀  PulseAI Backend listening on port ${PORT}`);
  console.log(`   ENV: MISTRAL=${!!process.env.MISTRAL_API_KEY} | GROQ=${!!process.env.GROQ_API_KEY} | HF=${!!process.env.HUGGINGFACE_API_KEY} | Supabase=${!!supabase}`);
});

export default app;
