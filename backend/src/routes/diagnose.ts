// backend/src/routes/diagnose.ts

import { Router, Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";
import Groq from "groq-sdk";

const router = Router();

// ─── Clients ────────────────────────────────────────────────────────────────

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! });

// ─── Geo boost (West Africa prevalence) ─────────────────────────────────────

const GEO_BOOST: Record<string, number> = {
  "malaria": 1.9,
  "typhoid fever": 1.7,
  "cholera": 1.5,
  "dengue fever": 1.4,
  "meningitis": 1.3,
  "yellow fever": 1.3,
  "tuberculosis": 1.3,
  "sickle-cell anemia": 1.4,
  "lassa fever": 1.2,
  "hepatitis": 1.2,
  "pneumonia": 1.2,
  "malaria falciparum": 1.9,
  "paludisme": 1.9,
};

// ─── HuggingFace embedding ───────────────────────────────────────────────────

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
          body: JSON.stringify({
            inputs: text,
            options: { wait_for_model: true },
          }),
        }
      );
      if (!res.ok) throw new Error(`HF ${res.status}: ${await res.text()}`);

      // Cast explicite — HuggingFace retourne number[] ou number[][]
      const raw = await res.json() as number[] | number[][];
      return Array.isArray(raw[0]) ? (raw[0] as number[]) : (raw as number[]);

    } catch (err) {
      if (attempt === 2) throw err;
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
    }
  }
  throw new Error("Embedding failed after 3 attempts");
}

// ─── Groq symptom extraction ─────────────────────────────────────────────────

async function extractSymptoms(text: string, language: string): Promise<{
  symptoms_en: string[];
  symptoms_query: string;
  duration: string;
  intensity: string;
}> {
  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    temperature: 0.1,
    max_tokens: 500,
    messages: [
      {
        role: "system",
        content: `Tu es un extracteur médical précis. Extrais les symptômes d'une description en langage naturel.
Réponds UNIQUEMENT en JSON valide, aucun texte autour, pas de markdown.`,
      },
      {
        role: "user",
        content: `Texte : "${text}"

Retourne ce JSON exact :
{
  "symptoms_en": ["symptom1", "symptom2"],
  "symptoms_query": "short english phrase listing symptoms for vector search",
  "duration": "hours|1_day|2_3_days|1_week|more|unknown",
  "intensity": "mild|moderate|severe|unknown"
}

symptoms_en doit utiliser les termes médicaux anglais standards :
fever, headache, fatigue, nausea, vomiting, diarrhea, cough, shortness of breath,
chest pain, abdominal pain, back pain, joint pain, skin rash, dizziness,
loss of appetite, chills, sweating, muscle pain, sore throat, runny nose,
weight loss, jaundice, swollen lymph nodes, confusion, seizures`,
      },
    ],
  });

  try {
    const content = completion.choices[0].message.content || "{}";
    const clean = content.replace(/```json|```/g, "").trim();
    return JSON.parse(clean);
  } catch {
    // Fallback si JSON mal formé
    return {
      symptoms_en: [text],
      symptoms_query: text,
      duration: "unknown",
      intensity: "unknown",
    };
  }
}

// ─── Vector search (double query) ────────────────────────────────────────────

interface DiseaseMatch {
  disease_name: string;
  symptoms_text: string;
  similarity: number;
  geo_boost: number;
  final_score: number;
  percentage: number;
}

async function retrieveDiseases(
  queryA: string,
  queryB: string
): Promise<DiseaseMatch[]> {
  // Double embedding en parallèle
  const [embA, embB] = await Promise.all([
    generateEmbedding(queryA),
    generateEmbedding(queryB),
  ]);

  // Double requête Supabase en parallèle
  const [resA, resB] = await Promise.all([
    supabase.rpc("match_diseases", {
      query_embedding: embA,
      match_count: 8,
    }),
    supabase.rpc("match_diseases", {
      query_embedding: embB,
      match_count: 8,
    }),
  ]);

  if (resA.error) throw new Error(`Supabase A: ${resA.error.message}`);
  if (resB.error) throw new Error(`Supabase B: ${resB.error.message}`);

  // Fusion avec bonus consensus
  const mapA = new Map<string, any>();
  const mapB = new Map<string, any>();

  (resA.data || []).forEach((r: any) => mapA.set(r.disease_name, r));
  (resB.data || []).forEach((r: any) => mapB.set(r.disease_name, r));

  const allNames = new Set([...mapA.keys(), ...mapB.keys()]);
  const merged: DiseaseMatch[] = [];

  for (const name of allNames) {
    const a = mapA.get(name);
    const b = mapB.get(name);
    const geoBoost = GEO_BOOST[name.toLowerCase()] || (a?.geo_boost || b?.geo_boost || 1.0);

    let finalScore: number;
    if (a && b) {
      // Bonus consensus x1.15 si trouvé dans les deux requêtes
      finalScore = ((a.final_score + b.final_score) / 2) * 1.15;
    } else {
      finalScore = (a || b).final_score;
    }

    merged.push({
      disease_name: name,
      symptoms_text: (a || b).symptoms_text,
      similarity: (a || b).similarity,
      geo_boost: geoBoost,
      final_score: finalScore,
      percentage: 0, // calculé après
    });
  }

  // Trier et prendre top 5
  merged.sort((x, y) => y.final_score - x.final_score);
  const top5 = merged.slice(0, 5);

  // Normaliser en pourcentages
  const total = top5.reduce((s, m) => s + m.final_score, 0);
  top5.forEach(m => {
    m.percentage = total > 0 ? Math.round((m.final_score / total) * 100) : 0;
  });

  return top5;
}

// ─── Mistral synthesis ───────────────────────────────────────────────────────

async function synthesizeWithMistral(params: {
  top5: DiseaseMatch[];
  symptoms: string;
  duration: string;
  intensity: string;
  age?: number;
  sex?: string;
  country?: string;
  language: string;
}): Promise<any> {
  const { top5, symptoms, duration, intensity, age, sex, country, language } = params;

  const top5Text = top5
    .map((d, i) => `${i + 1}. ${d.disease_name} (${d.percentage}%) — symptômes: ${d.symptoms_text}`)
    .join("\n");

  const systemPrompt = `Tu es RuralDiag, moteur de diagnostic médical de Pulse AI pour l'Afrique de l'Ouest.
Tu analyses les résultats d'un système RAG médical et produis un diagnostic structuré précis.
Tu réponds UNIQUEMENT en JSON valide, aucun texte autour, pas de markdown.`;

  const userPrompt = `RÉSULTATS RAG — TOP 5 MALADIES :
${top5Text}

PATIENT :
Symptômes : "${symptoms}"
Durée : ${duration} | Intensité : ${intensity}
Âge : ${age || "non précisé"} | Sexe : ${sex || "non précisé"} | Pays : ${country || "Afrique de l'Ouest"}

Analyse et retourne ce JSON exact :
{
  "conditions": [
    {
      "name": "string",
      "probability": number,
      "description": "string (2 phrases : cause + contexte africain)",
      "recommendation": "string (action concrète)"
    }
  ],
  "severity": "LOW|MEDIUM|HIGH|CRITICAL",
  "severityScore": number,
  "severityMessage": "string",
  "firstAid": ["string", "string", "string"],
  "doNots": ["string", "string"],
  "disclaimer": "Ce diagnostic IA est indicatif. Consultez toujours un professionnel de santé qualifié."
}

Règles :
- Utilise les probabilités RAG comme base, affine avec ton raisonnement clinique
- CRITICAL : fièvre > 39.5°C, douleur thoracique, difficulté respiratoire sévère, confusion
- HIGH : symptômes multiples depuis > 3 jours
- Priorise paludisme/typhoïde/méningite/choléra en Afrique de l'Ouest
- Ne prescris jamais de médicaments sur ordonnance
- Réponds en ${language === "fr" ? "français" : "english"}`;

  const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.MISTRAL_API_KEY!}`,
    },
    body: JSON.stringify({
      model: "mistral-medium-latest",
      temperature: 0.2,
      max_tokens: 1500,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Mistral error: ${err}`);
  }

  const data = await res.json();
  const content = data.choices[0].message.content;
  return JSON.parse(content);
}

// ─── POST /diagnose ───────────────────────────────────────────────────────────

router.post("/", async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    const {
      symptoms,
      language = "fr",
      country = "togo",
      age,
      sex,
      context,
    } = req.body;

    if (!symptoms || symptoms.trim().length < 10) {
      return res.status(400).json({
        error: "Veuillez décrire vos symptômes (minimum 10 caractères)",
      });
    }

    // ── Étape 1 : Extraction NLP (Groq) ──────────────────────────────────
    let extraction;
    try {
      extraction = await extractSymptoms(symptoms, language);
    } catch (err) {
      // Fallback si Groq échoue
      extraction = {
        symptoms_en: [symptoms],
        symptoms_query: symptoms,
        duration: "unknown",
        intensity: "unknown",
      };
    }

    // ── Étape 2 : Double RAG (pgvector) ──────────────────────────────────
    const queryA = extraction.symptoms_query;
    const queryB = extraction.symptoms_en.join(", ");

    let top5: DiseaseMatch[];
    try {
      top5 = await retrieveDiseases(queryA, queryB);
    } catch (err: any) {
      return res.status(503).json({
        error: "Service de recherche vectorielle indisponible. Réessayez dans quelques secondes.",
        details: err.message,
      });
    }

    if (top5.length === 0) {
      return res.status(404).json({
        error: "Aucune maladie correspondante trouvée. Vérifiez que la base de données est ingérée.",
      });
    }

    // ── Étape 3 : Synthèse Mistral ────────────────────────────────────────
    let result;
    try {
      result = await synthesizeWithMistral({
        top5,
        symptoms,
        duration: extraction.duration,
        intensity: extraction.intensity,
        age,
        sex,
        country,
        language,
      });
    } catch (err: any) {
      return res.status(503).json({
        error: "Service d'analyse IA indisponible. Réessayez dans quelques instants.",
        details: err.message,
      });
    }

    const elapsed = Date.now() - startTime;
    console.log(`✅ Diagnose completed in ${elapsed}ms — top: ${top5[0]?.disease_name}`);

    return res.json({
      ...result,
      meta: {
        elapsed_ms: elapsed,
        top_rag_match: top5[0]?.disease_name,
        confidence: top5[0]?.percentage,
        low_confidence: (top5[0]?.similarity || 0) < 0.30,
        raw_matches: top5,
      },
    });

  } catch (err: any) {
    console.error("❌ Diagnose error:", err);
    return res.status(500).json({
      error: "Erreur interne du serveur. Veuillez réessayer.",
    });
  }
});

export default router;