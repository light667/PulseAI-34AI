import { Router, Request, Response } from "express";
import Groq from "groq-sdk";
import { matchDiseases, type MatchResult } from "../lib/csvMatcher";

const router = Router();
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! });

// ── Extraction symptômes via Groq ────────────────────────────────────────────

async function extractSymptoms(text: string): Promise<string[]> {
  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: 0.1,
      max_tokens: 300,
      messages: [
        {
          role: "system",
          content: `Extract symptoms from patient description. Return ONLY a JSON array of English medical terms. No other text.`,
        },
        {
          role: "user",
          content: `"${text.slice(0, 500)}"

Return JSON array like: ["fever", "headache", "fatigue"]
Use standard terms: fever, headache, fatigue, nausea, vomiting, diarrhea, cough, shortness of breath, chest pain, abdominal pain, back pain, joint pain, skin rash, dizziness, loss of appetite, chills, sweating, muscle pain, sore throat, jaundice, swollen lymph nodes, confusion`,
        },
      ],
    });

    const content = completion.choices[0].message.content || "[]";
    const clean = content.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);
    return Array.isArray(parsed) ? parsed : [text];
  } catch {
    // Fallback : extraire mots-clés simples
    const keywords = ["fever", "headache", "fatigue", "nausea", "vomiting",
      "diarrhea", "cough", "chest pain", "abdominal pain", "dizziness",
      "chills", "sweating", "rash", "jaundice", "weakness"];
    return keywords.filter(k => text.toLowerCase().includes(k));
  }
}

// ── Synthèse Mistral ─────────────────────────────────────────────────────────

interface MistralResponse {
  choices: Array<{ message: { content: string } }>;
}

async function synthesize(params: {
  top5: MatchResult[];
  symptoms: string;
  age?: number;
  sex?: string;
  country?: string;
  language: string;
}): Promise<any> {
  const { top5, symptoms, age, sex, country, language } = params;

  const top5Text = top5
    .map((d, i) => `${i + 1}. ${d.disease_name} (${d.percentage}%)`)
    .join("\n");

  const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.MISTRAL_API_KEY!}`,
    },
    body: JSON.stringify({
      model: "mistral-medium-latest",
      temperature: 0.2,
      max_tokens: 1200,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `Tu es RuralDiag, moteur de diagnostic médical pour l'Afrique de l'Ouest. Réponds UNIQUEMENT en JSON valide.`,
        },
        {
          role: "user",
          content: `TOP 5 MALADIES CANDIDATES :
${top5Text}

PATIENT : "${symptoms}"
Âge: ${age || "?"} | Sexe: ${sex || "?"} | Pays: ${country || "Afrique de l'Ouest"}

Retourne ce JSON exact :
{
  "conditions": [
    {"name": "string", "probability": number, "description": "string", "recommendation": "string"}
  ],
  "severity": "LOW|MEDIUM|HIGH|CRITICAL",
  "severityScore": number,
  "severityMessage": "string",
  "firstAid": ["string", "string", "string"],
  "doNots": ["string"],
  "disclaimer": "Ce diagnostic IA est indicatif. Consultez toujours un professionnel de santé."
}

Règles: CRITICAL si fièvre sévère/douleur thoracique/confusion. HIGH si >3 jours. Réponds en ${language === "fr" ? "français" : "english"}.`,
        },
      ],
    }),
  });

  if (!res.ok) throw new Error(`Mistral ${res.status}`);
  const data = await res.json() as MistralResponse;
  return JSON.parse(data.choices[0].message.content);
}

// ── POST /diagnose ────────────────────────────────────────────────────────────

router.post("/", async (req: Request, res: Response) => {
  const start = Date.now();
  const { symptoms, language = "fr", country = "togo", age, sex } = req.body;

  if (!symptoms || symptoms.trim().length < 10) {
    return res.status(400).json({
      error: "Veuillez décrire vos symptômes (minimum 10 caractères)",
    });
  }

  try {
    // Étape 1 — Extraction symptômes (Groq)
    const extracted = await extractSymptoms(symptoms);
    console.log(`🔍 Extracted: ${extracted.join(", ")}`);

    // Étape 2 — Matching CSV en mémoire (instantané, zéro réseau)
    const top5 = matchDiseases(extracted, 5);
    console.log(`📊 Top match: ${top5[0]?.disease_name} (${top5[0]?.percentage}%)`);

    if (top5.length === 0) {
      return res.status(404).json({ error: "Aucune maladie correspondante." });
    }

    // Étape 3 — Synthèse Mistral
    const result = await synthesize({ top5, symptoms, age, sex, country, language });

    console.log(`✅ Diagnose in ${Date.now() - start}ms`);
    return res.json({
      ...result,
      meta: {
        elapsed_ms: Date.now() - start,
        top_match: top5[0]?.disease_name,
        confidence: top5[0]?.percentage,
        extracted_symptoms: extracted,
      },
    });

  } catch (err: any) {
    console.error("Diagnose error:", err.message);
    return res.status(500).json({ error: "Erreur d'analyse. Réessayez." });
  }
});

export default router;