import Groq from "groq-sdk";

let groqClient: Groq | null = null;

export function getGroq(): Groq {
  if (!groqClient) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error("GROQ_API_KEY is not configured");
    groqClient = new Groq({ apiKey });
  }
  return groqClient;
}

export const GROQ_MODELS = {
  diagnosis: "llama-3.3-70b-versatile",
  lyra: "llama-3.3-70b-versatile",
  vision: "llama-3.2-90b-vision-preview",
  whisper: "whisper-large-v3",
} as const;

export async function chatCompletion(
  system: string,
  user: string,
  model = GROQ_MODELS.diagnosis
): Promise<string> {
  const groq = getGroq();
  const completion = await groq.chat.completions.create({
    model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    temperature: 0.3,
    max_tokens: 2048,
  });
  return completion.choices[0]?.message?.content ?? "";
}

export function parseJsonFromLLM<T>(text: string): T {
  const cleaned = text.replace(/```json\n?|\n?```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("Invalid JSON response");
  return JSON.parse(cleaned.slice(start, end + 1)) as T;
}
