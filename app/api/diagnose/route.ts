import { NextResponse } from "next/server";

/**
 * Next.js /api/diagnose — Proxy Route
 *
 * In development (no BACKEND_URL): runs the full RAG pipeline directly
 * on Next.js server using lib/rag modules.
 *
 * In production (BACKEND_URL set): proxies the request to the Express
 * backend deployed on Render, streaming the response back as-is.
 *
 * This lets the frontend always hit /api/diagnose regardless of env.
 */

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL;

// ── Production: proxy to Render backend ──────────────────────────────────
async function proxyToBackend(request: Request): Promise<Response> {
  const body = await request.text();

  const backendRes = await fetch(`${BACKEND_URL}/api/diagnose`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // Forward auth header if present
      ...(request.headers.get("authorization")
        ? { authorization: request.headers.get("authorization")! }
        : {}),
    },
    body,
  });

  const data = await backendRes.json();

  if (!backendRes.ok) {
    return NextResponse.json(data, { status: backendRes.status });
  }

  return NextResponse.json(data);
}

// ── Development: run pipeline inline ─────────────────────────────────────
async function runInline(request: Request): Promise<Response> {
  const { extractSymptoms } = await import("@/lib/rag/diagnosis/extract");
  const { retrieveDiseases } = await import("@/lib/rag/diagnosis/retrieve");
  const { buildDiagnosisPrompt, DIAGNOSIS_SYSTEM_PROMPT } = await import(
    "@/lib/prompts/diagnosis"
  );

  let attempt = 0;
  const maxAttempts = 2;

  while (attempt < maxAttempts) {
    try {
      const { symptoms, language = "fr", country = "togo", age, sex, context } =
        await request.clone().json();

      if (!symptoms || symptoms.trim().length < 10) {
        return NextResponse.json(
          { error: "Symptom description too short" },
          { status: 400 }
        );
      }

      // 1. NLP extraction via Groq
      const extraction = await extractSymptoms(symptoms, language);

      // 2. Vector search via Supabase
      const matches = await retrieveDiseases(extraction);
      const lowConfidence = matches.length === 0 || matches[0].similarity < 0.3;

      // 3. Mistral synthesis
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

      const mistralKey = process.env.MISTRAL_API_KEY;
      if (!mistralKey) throw new Error("MISTRAL_API_KEY not configured");

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
            { role: "user", content: prompt },
          ],
          temperature: 0.2,
          max_tokens: 1800,
          response_format: { type: "json_object" },
        }),
      });

      if (!mistralRes.ok) {
        const err = await mistralRes.text();
        throw new Error(`Mistral ${mistralRes.status}: ${err}`);
      }

      const mistralData = await mistralRes.json();
      const content = mistralData.choices?.[0]?.message?.content;
      if (!content) throw new Error("Empty Mistral response");

      const result = JSON.parse(content);
      return NextResponse.json({
        ...result,
        lowConfidence,
        rawMatches: matches.map((m) => ({
          disease_name: m.disease_name,
          similarity: parseFloat((m.similarity * 100).toFixed(1)),
          percentage: m.percentage,
        })),
      });
    } catch (error) {
      attempt++;
      console.error(`[/api/diagnose] Attempt ${attempt} failed:`, error);
      if (attempt >= maxAttempts) {
        return NextResponse.json(
          { error: "Le moteur de diagnostic est temporairement indisponible." },
          { status: 503 }
        );
      }
    }
  }

  return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
}

// ── Handler ───────────────────────────────────────────────────────────────
export async function POST(request: Request): Promise<Response> {
  if (BACKEND_URL) {
    console.log(`[/api/diagnose] Proxying to backend: ${BACKEND_URL}`);
    return proxyToBackend(request);
  }
  console.log("[/api/diagnose] Running inline (dev mode)");
  return runInline(request);
}
