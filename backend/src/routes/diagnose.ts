import { Router, Request, Response } from "express";
import Groq from "groq-sdk";
import { matchDiseases, type MatchResult } from "../lib/csvMatcher";

const router = Router();
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! });

// ── Extraction symptômes — ultra-rapide ──────────────────────────────────────

async function extractSymptoms(text: string): Promise<string[]> {
  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: 0.0,
      max_tokens: 150,          // Réduit de 300 → 150
      messages: [
        {
          role: "system",
          content: `Extract symptoms. Return ONLY a JSON array of English terms. Example: ["fever","headache"]`,
        },
        {
          role: "user",
          content: text.slice(0, 300), // Réduit de 500 → 300
        },
      ],
    });

    const content = completion.choices[0].message.content || "[]";
    const match = content.match(/\[.*?\]/s);
    if (!match) return fallbackExtract(text);
    const parsed = JSON.parse(match[0]);
    return Array.isArray(parsed) ? parsed : fallbackExtract(text);
  } catch {
    return fallbackExtract(text);
  }
}

function fallbackExtract(text: string): string[] {
  const keywords = [
    "fever", "headache", "fatigue", "nausea", "vomiting", "diarrhea",
    "cough", "chest pain", "abdominal pain", "dizziness", "chills",
    "sweating", "rash", "jaundice", "weakness", "joint pain", "back pain",
    "sore throat", "shortness of breath", "confusion", "weight loss",
    // Termes français → mapping
    "fievre", "fièvre", "maux de tete", "tête", "fatigue", "nausee",
    "nausée", "toux", "diarrhee", "diarrhée", "vomissement",
  ];
  const lower = text.toLowerCase();
  const found: string[] = [];
  if (lower.includes("fiev") || lower.includes("fever")) found.push("fever");
  if (lower.includes("tete") || lower.includes("head")) found.push("headache");
  if (lower.includes("fatigue") || lower.includes("tired")) found.push("fatigue");
  if (lower.includes("naus")) found.push("nausea");
  if (lower.includes("vomit") || lower.includes("vomiss")) found.push("vomiting");
  if (lower.includes("diarr")) found.push("diarrhea");
  if (lower.includes("toux") || lower.includes("cough")) found.push("cough");
  if (lower.includes("douleur") || lower.includes("pain")) found.push("pain");
  if (lower.includes("friss") || lower.includes("chill")) found.push("chills");
  if (lower.includes("sueur") || lower.includes("sweat")) found.push("sweating");
  if (lower.includes("vertige") || lower.includes("dizz")) found.push("dizziness");
  if (lower.includes("jaun") || lower.includes("ictere")) found.push("jaundice");
  return found.length > 0 ? found : ["fever", "fatigue"];
}

// ── Synthèse Mistral — rapide ────────────────────────────────────────────────

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
  const isFr = language === "fr";

  const top5Text = top5
    .map((d, i) => `${i + 1}. ${d.disease_name} ${d.percentage}%`)
    .join(", ");

  const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.MISTRAL_API_KEY!}`,
    },
    body: JSON.stringify({
      model: "mistral-small-latest",   // small = 3x plus rapide que medium
      temperature: 0.1,
      max_tokens: 800,                  // Réduit de 1200 → 800
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `Medical diagnosis AI for West Africa. Respond ONLY in valid JSON. Language: ${isFr ? "French" : "English"}.`,
        },
        {
          role: "user",
          content: `Candidates: ${top5Text}
Patient: "${symptoms.slice(0, 200)}" | Age:${age||"?"} Sex:${sex||"?"} Country:${country||"West Africa"}

JSON:
{"conditions":[{"name":"str","probability":int,"description":"str","recommendation":"str"}],"severity":"LOW|MEDIUM|HIGH|CRITICAL","severityScore":int,"severityMessage":"str","firstAid":["str","str","str"],"doNots":["str"],"disclaimer":"Diagnostic IA indicatif. Consultez un médecin."}`,
        },
      ],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Mistral ${res.status}: ${errText.slice(0, 100)}`);
  }

  const data = await res.json() as MistralResponse;
  return JSON.parse(data.choices[0].message.content);
}

// ── POST /diagnose ────────────────────────────────────────────────────────────

router.post("/", async (req: Request, res: Response) => {
  const start = Date.now();
  const { symptoms, language = "fr", country = "togo", age, sex } = req.body;

  if (!symptoms || symptoms.trim().length < 5) {
    return res.status(400).json({
      error: isFr(language)
        ? "Décrivez vos symptômes"
        : "Please describe your symptoms",
    });
  }

  try {
    // Étape 1 + 2 en parallèle — Groq extraction ET matching CSV simultanés
    const [extracted, quickMatch] = await Promise.all([
      extractSymptoms(symptoms),
      Promise.resolve(matchDiseases(fallbackExtract(symptoms), 5)),
    ]);

    // Re-matcher avec les symptômes extraits par Groq
    const top5 = matchDiseases(extracted, 5);
    // Prendre le meilleur des deux matchings
    const finalTop5 = top5[0]?.final_score > (quickMatch[0]?.final_score || 0)
      ? top5
      : quickMatch;

    console.log(`🔍 ${extracted.join(",")} → ${finalTop5[0]?.disease_name} (${finalTop5[0]?.percentage}%)`);

    // Étape 3 — Mistral synthèse
    const result = await synthesize({
      top5: finalTop5,
      symptoms,
      age,
      sex,
      country,
      language,
    });

    const elapsed = Date.now() - start;
    console.log(`✅ ${elapsed}ms`);

    return res.json({
      ...result,
      meta: {
        elapsed_ms: elapsed,
        top_match: finalTop5[0]?.disease_name,
        confidence: finalTop5[0]?.percentage,
        extracted_symptoms: extracted,
      },
    });

  } catch (err: any) {
    console.error("Diagnose error:", err.message);
    return res.status(500).json({
      error: isFr(language)
        ? "Erreur d'analyse. Réessayez dans quelques secondes."
        : "Analysis error. Please retry.",
    });
  }
});

function isFr(lang: string) { return lang === "fr"; }

export default router;