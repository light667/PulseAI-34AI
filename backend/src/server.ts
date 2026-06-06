import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Initialize Supabase Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

let supabase: any = null;
if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
} else {
  console.warn("⚠️ Warning: Supabase is not fully configured. Vector operations will fail.");
}

// -------------------------------------------------------------
// HELPERS
// -------------------------------------------------------------

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// HuggingFace Embeddings query extraction
async function embedQuery(text: string): Promise<number[]> {
  const apiKey = process.env.HUGGINGFACE_API_KEY;
  if (!apiKey) {
    throw new Error("HUGGINGFACE_API_KEY is not configured");
  }

  const HF_MODEL = "sentence-transformers/all-MiniLM-L6-v2";
  let attempt = 0;
  const maxAttempts = 3;
  let delay = 1000;

  while (attempt < maxAttempts) {
    try {
      const response = await fetch(
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

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`HuggingFace API error: ${response.status} - ${errText}`);
      }

      const result = await response.json();
      if (Array.isArray(result)) {
        if (Array.isArray(result[0])) {
          return result[0].flat() as number[];
        }
        return result as number[];
      }
      throw new Error("Invalid embedding response structure");
    } catch (error) {
      attempt++;
      console.warn(`[Backend] Embedding attempt ${attempt} failed: ${error}`);
      if (attempt >= maxAttempts) throw error;
      await sleep(delay);
      delay *= 2;
    }
  }
  throw new Error("Failed to generate embedding");
}

// Groq NLP symptom extractor
interface ExtractionResult {
  symptoms_en: string[];
  symptoms_query: string;
  duration: string;
  intensity: string;
  body_parts: string[];
  fever: boolean;
  chronic_indicators: boolean;
}

async function extractSymptoms(text: string, language: string): Promise<ExtractionResult> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not configured");
  }

  const systemPrompt = `Tu es un extracteur médical précis. Tu reçois une description de symptômes en langage naturel et tu extrais les informations structurées.
Réponds UNIQUEMENT en JSON valide, aucun texte autour.`;

  const userPrompt = `Texte : ${text}

Extrais et retourne ce JSON :
{
  "symptoms_en": ["symptom1", "symptom2", ...],
  "symptoms_query": "courte phrase en anglais listant les symptômes pour recherche vectorielle",
  "duration": "hours|1_day|2_3_days|1_week|more|unknown",
  "intensity": "mild|moderate|severe|unknown",
  "body_parts": ["head", "chest", ...],
  "fever": true|false,
  "chronic_indicators": true|false
}

Règles :
- symptoms_en : utilise les termes médicaux anglais standards du dataset (fever, headache, fatigue, nausea, vomiting, diarrhea, cough, shortness of breath, chest pain, abdominal pain, back pain, joint pain, skin rash, dizziness, loss of appetite, etc.)
- symptoms_query : phrase optimisée pour similarité vectorielle, ex: 'fever headache fatigue nausea 3 days moderate'
- Si un symptôme est ambigu, l'inclure quand même`;

  let attempt = 0;
  const maxAttempts = 2;

  while (attempt < maxAttempts) {
    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
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
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Groq API error: ${response.status} - ${errText}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) throw new Error("No response content from Groq");

      return JSON.parse(content) as ExtractionResult;
    } catch (error) {
      attempt++;
      console.warn(`[Backend] Extraction attempt ${attempt} failed: ${error}`);
      if (attempt >= maxAttempts) throw error;
    }
  }
  throw new Error("Symptom extraction failed");
}

// Supabase Disease Retriever
interface DiseaseMatch {
  disease_name: string;
  symptoms_text: string;
  similarity: number;
  geo_boost: number;
  final_score: number;
  percentage?: number;
}

async function retrieveDiseases(extraction: ExtractionResult): Promise<DiseaseMatch[]> {
  if (!supabase) {
    throw new Error("Supabase client is not initialized");
  }

  // Double vector query retrieval
  const embeddingA = await embedQuery(extraction.symptoms_query);
  const { data: dataA, error: errorA } = await supabase.rpc("match_diseases", {
    query_embedding: embeddingA,
    match_count: 8,
  });

  if (errorA) throw new Error(`match_diseases A failed: ${errorA.message}`);

  const symptomString = extraction.symptoms_en.join(", ");
  const embeddingB = await embedQuery(symptomString);
  const { data: dataB, error: errorB } = await supabase.rpc("match_diseases", {
    query_embedding: embeddingB,
    match_count: 8,
  });

  if (errorB) throw new Error(`match_diseases B failed: ${errorB.message}`);

  const resultsA = (dataA || []) as DiseaseMatch[];
  const resultsB = (dataB || []) as DiseaseMatch[];

  const mergedMap = new Map<string, DiseaseMatch>();

  resultsA.forEach((r) => {
    mergedMap.set(r.disease_name.toLowerCase(), { ...r });
  });

  resultsB.forEach((r) => {
    const key = r.disease_name.toLowerCase();
    if (mergedMap.has(key)) {
      const existing = mergedMap.get(key)!;
      const avgSimilarity = (existing.similarity + r.similarity) / 2;
      const avgScore = (existing.final_score + r.final_score) / 2;
      existing.similarity = avgSimilarity;
      existing.final_score = avgScore * 1.15; // consensus bonus
    } else {
      mergedMap.set(key, { ...r });
    }
  });

  let sortedMatches = Array.from(mergedMap.values())
    .sort((a, b) => b.final_score - a.final_score)
    .slice(0, 5);

  const scoreSum = sortedMatches.reduce((sum, match) => sum + match.final_score, 0);
  if (scoreSum > 0) {
    sortedMatches = sortedMatches.map((m) => ({
      ...m,
      percentage: Math.round((m.final_score / scoreSum) * 100),
    }));
  } else {
    sortedMatches = sortedMatches.map((m) => ({
      ...m,
      percentage: Math.round(100 / sortedMatches.length),
    }));
  }

  return sortedMatches;
}

// Diagnosis prompts
const DIAGNOSIS_SYSTEM_PROMPT = `Tu es RuralDiag, moteur de diagnostic médical de Pulse AI.
Tu analyses des symptômes dans le contexte de l'Afrique de l'Ouest
(Togo, Bénin, Nigeria, Ghana, Côte d'Ivoire).
Tu reçois les résultats d'un système RAG médical et tu produis
un diagnostic structuré précis. Réponds UNIQUEMENT en JSON valide.`;

interface BuildPromptParams {
  top5: DiseaseMatch[];
  symptoms_text: string;
  duration: string;
  intensity: string;
  age?: number | string;
  sex?: string;
  country: string;
  context?: string;
  language: string;
}

function buildDiagnosisPrompt(params: BuildPromptParams): string {
  const { top5, symptoms_text, duration, intensity, age, sex, country, context, language } = params;

  const ragList = top5
    .map((d) => `- ${d.disease_name} (${d.percentage ?? 0}%) | symptômes: ${d.symptoms_text}`)
    .join("\n");

  return `RÉSULTATS RAG — TOP 5 MALADIES (classées par score) :
${ragList}

DESCRIPTION PATIENT :
Symptômes décrits : ${symptoms_text}
Durée : ${duration} | Intensité : ${intensity}
Âge : ${age ?? "non spécifié"} | Sexe : ${sex ?? "non spécifié"} | Pays : ${country}
Contexte additionnel : ${context ?? "aucun"}

Analyse et produis ce JSON exact :
{
  "conditions": [
    {
      "name": "string",
      "probability": 80,
      "description": "string (2 phrases : cause + contexte africain)",
      "recommendation": "string (action concrète)"
    }
  ],
  "severity": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "severityScore": 5,
  "severityMessage": "string (message clair sur urgence)",
  "firstAid": ["string", "string", "string"],
  "doNots": ["string", "string"],
  "disclaimer": "Ce diagnostic IA est indicatif. Consultez toujours un professionnel de santé qualifié."
}

Règles critiques :
- Utilise les probabilités RAG comme base, ajuste avec ton raisonnement clinique
- CRITICAL si fièvre > 39.5°C ou douleur thoracique ou difficulté respiratoire sévère
- HIGH si symptômes multiples depuis > 3 jours sans amélioration
- Priorise paludisme/typhoïde/méningite en Afrique de l'Ouest
- Réponds en ${language}
- Ne prescris jamais de médicaments sur ordonnance
- Inclure toujours le disclaimer`;
}

// Supabase Lyra RAG retriever
const FALLBACK_CONTEXT = [
  "Prendre quelques respirations profondes peut aider à calmer l'anxiété immédiate.",
  "Parler à une personne de confiance est un premier pas important pour la santé mentale.",
  "Le sommeil régulier (7-8h) améliore l'humeur et la résilience au stress.",
  "En Afrique de l'Ouest, la stigmatisation autour de la santé mentale est réelle — demander de l'aide est courageux.",
  "Des activités simples (marche, musique, prière/méditation) peuvent stabiliser l'humeur.",
];

async function retrieveLyraContext(query: string, count = 5): Promise<string> {
  if (!supabase) return FALLBACK_CONTEXT.slice(0, count).join("\n\n");
  try {
    const embedding = await embedQuery(query);
    const { data, error } = await supabase.rpc("match_lyra_knowledge", {
      query_embedding: embedding,
      match_threshold: 0.7,
      match_count: count,
    });

    if (error || !data?.length) {
      return FALLBACK_CONTEXT.slice(0, count).join("\n\n");
    }

    return (data as any[]).map((c) => c.content).join("\n\n");
  } catch (err) {
    console.error("[Backend] Lyra retrieve error:", err);
    return FALLBACK_CONTEXT.slice(0, count).join("\n\n");
  }
}

// Lyra Prompt template
function getLyraSystemPrompt(language: string, retrievedContext: string): string {
  const isFr = language.toLowerCase() === "fr";
  if (isFr) {
    return `Tu es Lyra, thérapeute virtuelle de Pulse AI. Tu es chaleureuse, empathique, culturellement sensible au contexte ouest-africain.
CONTEXTE RÉCUPÉRÉ (RAG) :
${retrievedContext}

RÈGLES :
- Jamais de diagnostic psychiatrique
- Valide toujours les émotions avant de donner une perspective
- Langage simple et humain, pas clinique
- Si l'utilisateur mentionne idées suicidaires : donne immédiatement : SOS Togo : +228 22 22 22 22 | Nigeria : 0800-SAFELINE
- Réponds en fr
- Réponses < 150 mots sauf si soutien étendu nécessaire
- Termine toujours par une question douce ou une affirmation`;
  } else {
    return `You are Lyra, virtual therapist of Pulse AI. You are warm, empathetic, and culturally sensitive to the West African context.
RETRIEVED CONTEXT (RAG):
${retrievedContext}

RULES:
- Never give a psychiatric diagnosis
- Always validate emotions before giving a perspective
- Simple and human language, not clinical
- If the user mentions suicidal thoughts: immediately give: SOS Togo: +228 22 22 22 22 | Nigeria: 0800-SAFELINE
- Respond in en
- Responses < 150 words unless extended support is necessary
- Always end with a gentle question or affirmation`;
  }
}

// -------------------------------------------------------------
// ENDPOINTS
// -------------------------------------------------------------

// Live check
app.get("/health", (req, res) => {
  res.json({ status: "healthy", timestamp: new Date().toISOString() });
});

// POST /api/diagnose
app.post("/api/diagnose", async (req, res) => {
  let attempt = 0;
  const maxAttempts = 2;

  while (attempt < maxAttempts) {
    try {
      const { symptoms, language = "fr", country = "togo", age, sex, context } = req.body;

      if (!symptoms || symptoms.trim().length < 10) {
        return res.status(400).json({ error: "Symptom description too short" });
      }

      // 1. NLP extract symptoms
      const extraction = await extractSymptoms(symptoms, language);

      // 2. Vector search
      const matches = await retrieveDiseases(extraction);

      // 3. Low confidence check
      const lowConfidence = matches.length === 0 || matches[0].similarity < 0.30;

      // 4. Mistral synthesis
      const prompt = buildDiagnosisPrompt({
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

      const apiKey = process.env.MISTRAL_API_KEY;
      if (!apiKey) throw new Error("MISTRAL_API_KEY is not configured");

      const mistralResponse = await fetch("https://api.mistral.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "mistral-medium-latest",
          messages: [
            { role: "system", content: DIAGNOSIS_SYSTEM_PROMPT },
            { role: "user", content: prompt },
          ],
          temperature: 0.2,
          max_tokens: 1500,
          response_format: { type: "json_object" },
        }),
      });

      if (!mistralResponse.ok) {
        const errText = await mistralResponse.text();
        throw new Error(`Mistral API error: ${mistralResponse.status} - ${errText}`);
      }

      const data = await mistralResponse.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) throw new Error("Empty completion from Mistral");

      const result = JSON.parse(content);

      // Return JSON
      return res.json({
        ...result,
        lowConfidence,
        rawMatches: matches,
      });
    } catch (error) {
      attempt++;
      console.error(`[Backend] Diagnose attempt ${attempt} failed:`, error);
      if (attempt >= maxAttempts) {
        return res.status(503).json({ error: "Medical diagnosis engine is busy. Please try again." });
      }
    }
  }
});

// POST /api/lyra (Streaming response)
app.post("/api/lyra", async (req, res) => {
  try {
    const { message, conversationHistory, history, language = "fr" } = req.body;
    const activeHistory = conversationHistory || history || [];

    if (!message?.trim()) {
      return res.status(400).json({ error: "Message required" });
    }

    // 1. & 2. Retrieve Lyra RAG Context
    const contextText = await retrieveLyraContext(message);

    // 3. Build prompts
    const systemPrompt = getLyraSystemPrompt(language, contextText);

    const formattedMessages = [
      { role: "system", content: systemPrompt },
      ...activeHistory.map((m: any) => ({
        role: m.role,
        content: m.content,
      })),
      { role: "user", content: message },
    ];

    const apiKey = process.env.MISTRAL_API_KEY;
    if (!apiKey) throw new Error("MISTRAL_API_KEY is not configured");

    const mistralResponse = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "mistral-medium-latest",
        messages: formattedMessages,
        stream: true,
      }),
    });

    if (!mistralResponse.ok) {
      const errText = await mistralResponse.text();
      throw new Error(`Mistral API error: ${mistralResponse.status} - ${errText}`);
    }

    const reader = mistralResponse.body;
    if (!reader) throw new Error("No response body from Mistral");

    // Configure SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    // Send metadata first (retrieved RAG context information)
    const retrievedChunks = [
      {
        id: "context",
        content: contextText,
        source: "vector_db",
        similarity: 1.0,
      },
    ];
    res.write(JSON.stringify({ type: "metadata", retrievedChunks }) + "\n");

    // Replicate reader chunk piping for Node.js Readable stream
    const nodeReader = reader as any;
    
    // In Node.js environment, the response body might be a web ReadableStream or a Node stream
    if (typeof nodeReader.getReader === "function") {
      const webReader = nodeReader.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      
      try {
        while (true) {
          const { done, value } = await webReader.read();
          if (done) break;
          
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          
          for (const line of lines) {
            const cleanLine = line.trim();
            if (!cleanLine) continue;
            
            if (cleanLine.startsWith("data: ")) {
              const dataStr = cleanLine.substring(6).trim();
              if (dataStr === "[DONE]") break;
              
              try {
                const parsed = JSON.parse(dataStr);
                const chunkText = parsed.choices?.[0]?.delta?.content || "";
                if (chunkText) {
                  res.write(JSON.stringify({ type: "chunk", text: chunkText }) + "\n");
                }
              } catch {
                // partial JSON parsing error
              }
            }
          }
        }
      } catch (err) {
        console.error("[Backend] WebStream read error:", err);
      } finally {
        res.end();
      }
    } else {
      // Node.js stream
      nodeReader.on("data", (chunk: Buffer) => {
        const lines = chunk.toString().split("\n");
        for (const line of lines) {
          const cleanLine = line.trim();
          if (!cleanLine) continue;
          
          if (cleanLine.startsWith("data: ")) {
            const dataStr = cleanLine.substring(6).trim();
            if (dataStr === "[DONE]") {
              res.end();
              return;
            }
            try {
              const parsed = JSON.parse(dataStr);
              const chunkText = parsed.choices?.[0]?.delta?.content || "";
              if (chunkText) {
                res.write(JSON.stringify({ type: "chunk", text: chunkText }) + "\n");
              }
            } catch {
              // ignore partial line parse errors
            }
          }
        }
      });
      nodeReader.on("end", () => {
        res.end();
      });
      nodeReader.on("error", (err: any) => {
        console.error("[Backend] Node stream error:", err);
        res.end();
      });
    }
  } catch (error) {
    console.error("[Backend] Lyra streaming error:", error);
    res.status(503).json({ error: "Lyra is currently resting. Please try again." });
  }
});

// Start listening
app.listen(PORT, () => {
  console.log(`🚀 Standalone Render Backend listening on port ${PORT}`);
});
