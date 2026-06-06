export interface ExtractionResult {
  symptoms_en: string[];
  symptoms_query: string;
  duration: "hours" | "1_day" | "2_3_days" | "1_week" | "more" | "unknown";
  intensity: "mild" | "moderate" | "severe" | "unknown";
  body_parts: string[];
  fever: boolean;
  chronic_indicators: boolean;
}

export async function extractSymptoms(
  text: string,
  language: string
): Promise<ExtractionResult> {
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

      const result = JSON.parse(content) as ExtractionResult;
      return result;
    } catch (error) {
      attempt++;
      console.warn(`Extraction attempt ${attempt} failed: ${error}`);
      if (attempt >= maxAttempts) {
        throw error;
      }
    }
  }

  throw new Error("Symptom extraction failed after retries");
}
