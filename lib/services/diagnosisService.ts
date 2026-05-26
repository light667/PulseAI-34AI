import type { DiagnosisRequest, DiagnosisResult } from "@/types/diagnosis";

export async function analyzeSymptoms(
  payload: DiagnosisRequest
): Promise<DiagnosisResult> {
  const res = await fetch("/api/diagnose", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Diagnosis failed");
  }

  return res.json();
}

export async function transcribeAudio(blob: Blob): Promise<string> {
  const form = new FormData();
  form.append("file", blob, "recording.webm");
  const res = await fetch("/api/transcribe", {
    method: "POST",
    body: form,
  });
  if (!res.ok) throw new Error("Transcription failed");
  const data = await res.json();
  return data.text as string;
}
