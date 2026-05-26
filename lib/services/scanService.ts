export interface MedScanResult {
  name: string;
  manufacturer: string | null;
  authenticityAssessment: "LIKELY_AUTHENTIC" | "UNCERTAIN" | "SUSPICIOUS";
  authenticityNote: string;
  treats: string[];
  dosageAdults: string;
  dosageChildren: string;
  interactions: string[];
  sideEffects: string[];
  disclaimer: string;
  error?: string;
}

export async function scanMedication(file: File): Promise<MedScanResult> {
  const form = new FormData();
  form.append("image", file);
  const res = await fetch("/api/scan", { method: "POST", body: form });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Scan failed");
  }
  return res.json();
}
