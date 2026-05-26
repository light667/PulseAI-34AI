import { NextResponse } from "next/server";
import { getDiagnosisSystemPrompt } from "@/lib/prompts/diagnosis";
import { chatCompletion, parseJsonFromLLM, GROQ_MODELS } from "@/lib/groq";
import { createClient, getUserFromToken } from "@/lib/supabase/server";
import type { DiagnosisResult } from "@/types/diagnosis";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { symptoms, language = "fr", age, sex, context } = body;

    if (!symptoms || symptoms.length < 10) {
      return NextResponse.json(
        { error: "Symptoms description too short" },
        { status: 400 }
      );
    }

    const system = getDiagnosisSystemPrompt(language);
    const userPrompt = `Symptoms: ${symptoms}
${age ? `Age: ${age}` : ""}
${sex ? `Sex: ${sex}` : ""}
${context ? `Additional context: ${context}` : ""}`;

    const raw = await chatCompletion(system, userPrompt, GROQ_MODELS.diagnosis);
    const result = parseJsonFromLLM<DiagnosisResult>(raw);

    const supabase = await createClient();
    const user = await getUserFromToken();

    if (user) {
      const top = result.conditions[0]?.name ?? "Unknown";
      await supabase.from("diagnoses").insert({
        user_id: user.id,
        symptoms,
        language,
        result,
        top_condition: top,
        severity: result.severity,
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Diagnose error:", error);
    return NextResponse.json(
      { error: "Our AI is busy. Please wait a moment and try again." },
      { status: 503 }
    );
  }
}
