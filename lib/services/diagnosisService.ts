import type { DiagnosisRequest, DiagnosisResult } from "@/types/diagnosis";

/**
 * Returns the backend base URL.
 * - In production: uses NEXT_PUBLIC_BACKEND_URL (Render service URL)
 * - In development: proxies through Next.js /api/diagnose route
 */
function getBackendUrl(): string | null {
  return process.env.NEXT_PUBLIC_BACKEND_URL || null;
}

/**
 * Analyze symptoms via the diagnostic RAG pipeline.
 *
 * Routes:
 *  - If NEXT_PUBLIC_BACKEND_URL is set → calls Express backend on Render directly
 *  - Otherwise → calls the Next.js /api/diagnose proxy route (dev mode)
 */
export async function analyzeSymptoms(
  payload: DiagnosisRequest
): Promise<DiagnosisResult> {
  const backendUrl = getBackendUrl();
  const endpoint = backendUrl
    ? `${backendUrl}/api/diagnose`
    : "/api/diagnose";

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    let errorMsg = "Diagnosis service unavailable";
    try {
      const err = await res.json();
      errorMsg = err.error || errorMsg;
    } catch {
      /* ignore */
    }
    throw new Error(errorMsg);
  }

  return res.json() as Promise<DiagnosisResult>;
}

/**
 * Transcribe audio blob via the Next.js /api/transcribe route.
 * (Audio transcription stays on Next.js edge — no need to route to backend)
 */
export async function transcribeAudio(blob: Blob): Promise<string> {
  const form = new FormData();
  form.append("file", blob, "recording.webm");

  const res = await fetch("/api/transcribe", {
    method: "POST",
    body: form,
  });

  if (!res.ok) throw new Error("Voice transcription failed");
  const data = await res.json();
  return data.text as string;
}
