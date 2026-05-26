import { NextResponse } from "next/server";
import { getGroq, GROQ_MODELS } from "@/lib/groq";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "Audio file required" }, { status: 400 });
    }

    const groq = getGroq();
    const transcription = await groq.audio.transcriptions.create({
      file,
      model: GROQ_MODELS.whisper,
      language: "fr",
    });

    return NextResponse.json({ text: transcription.text });
  } catch (error) {
    console.error("Transcribe error:", error);
    return NextResponse.json(
      { error: "Voice transcription failed" },
      { status: 503 }
    );
  }
}
