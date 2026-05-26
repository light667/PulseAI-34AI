import { NextResponse } from "next/server";
import { chatCompletion, GROQ_MODELS } from "@/lib/groq";

const TIPS_CACHE: Record<string, string> = {};

export async function GET() {
  const dateKey = new Date().toISOString().split("T")[0];

  if (TIPS_CACHE[dateKey]) {
    return NextResponse.json({ tip: TIPS_CACHE[dateKey], date: dateKey });
  }

  try {
    const system = `You are a public health advisor for West Africa. Generate ONE short, practical daily health tip (max 2 sentences) in French. Focus on hydration, malaria prevention, nutrition, mental wellness, or tropical diseases. Return plain text only, no quotes.`;
    const user = `Date: ${dateKey}. Generate today's unique tip.`;
    const tip = await chatCompletion(system, user, GROQ_MODELS.diagnosis);
    TIPS_CACHE[dateKey] = tip.trim();
    return NextResponse.json({ tip: TIPS_CACHE[dateKey], date: dateKey });
  } catch {
    const fallback =
      "Buvez au moins 2 litres d'eau par jour. Une bonne hydratation réduit les maux de tête de 40%.";
    return NextResponse.json({ tip: fallback, date: dateKey });
  }
}
