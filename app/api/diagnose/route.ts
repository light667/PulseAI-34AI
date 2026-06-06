import { NextResponse } from "next/server";
import { extractSymptoms } from "@/lib/rag/diagnosis/extract";
import { retrieveDiseases } from "@/lib/rag/diagnosis/retrieve";
import { buildDiagnosisPrompt, DIAGNOSIS_SYSTEM_PROMPT } from "@/lib/prompts/diagnosis";

export async function POST(request: Request) {
  let attempt = 0;
  const maxAttempts = 2; // retry once on network error

  while (attempt < maxAttempts) {
    try {
      const {
        symptoms,
        language = "fr",
        country = "togo",
        age,
        sex,
        context,
      } = await request.json();

      if (!symptoms || symptoms.trim().length < 10) {
        return NextResponse.json(
          { error: "Symptom description too short" },
          { status: 400 }
        );
      }

      // 1. Extraction NLP via Groq
      const extraction = await extractSymptoms(symptoms, language);

      // 2. Double query RAG + fusion
      const matches = await retrieveDiseases(extraction);

      // 3. Verification - low confidence warning if similarity < 30%
      const lowConfidence = matches.length === 0 || matches[0].similarity < 0.30;

      // 4. Synthesis via Mistral
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
      if (!apiKey) {
        throw new Error("MISTRAL_API_KEY is not configured");
      }

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
          temperature: 0.2, // mandatory for coherence
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
      if (!content) throw new Error("No content from Mistral API");

      const result = JSON.parse(content);

      // 6. Return response (no database writes to diagnoses table as user storage is moved entirely local)
      return NextResponse.json({
        ...result,
        lowConfidence,
        rawMatches: matches,
      });
    } catch (error) {
      attempt++;
      console.error(`Diagnosis API attempt ${attempt} failed:`, error);
      if (attempt >= maxAttempts) {
        return NextResponse.json(
          { error: "Our medical diagnosis engine is busy. Please try again." },
          { status: 503 }
        );
      }
    }
  }

  return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
}
