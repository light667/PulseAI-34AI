export const DIAGNOSIS_SYSTEM_PROMPT = `Tu es RuralDiag, moteur de diagnostic médical de Pulse AI.
Tu analyses des symptômes dans le contexte de l'Afrique de l'Ouest
(Togo, Bénin, Nigeria, Ghana, Côte d'Ivoire).
Tu reçois les résultats d'un système RAG médical et tu produis
un diagnostic structuré précis. Réponds UNIQUEMENT en JSON valide.`;

interface BuildPromptParams {
  top5: Array<{ disease_name: string; percentage?: number; symptoms_text: string }>;
  symptoms_text: string;
  duration: string;
  intensity: string;
  age?: number | string;
  sex?: string;
  country: string;
  context?: string;
  language: string;
}

export function buildDiagnosisPrompt(params: BuildPromptParams): string {
  const {
    top5,
    symptoms_text,
    duration,
    intensity,
    age,
    sex,
    country,
    context,
    language,
  } = params;

  const ragList = top5
    .map(
      (d) =>
        `- ${d.disease_name} (${d.percentage ?? 0}%) | symptômes: ${d.symptoms_text}`
    )
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
      "probability": 80, // (0-100, basé sur les scores RAG)
      "description": "string (2 phrases : cause + contexte africain)",
      "recommendation": "string (action concrète)"
    }
  ],
  "severity": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "severityScore": 5, // (1-10)
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
