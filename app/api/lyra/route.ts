import { NextResponse } from "next/server";
import { getLyraSystemPrompt } from "@/lib/prompts/lyra";
import { retrieveLyraContext } from "@/lib/rag/retrieve";
import { chatCompletion, GROQ_MODELS } from "@/lib/groq";
import { createClient, getUserFromToken } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const { message, history = [], language = "fr" } = await request.json();

    if (!message?.trim()) {
      return NextResponse.json({ error: "Message required" }, { status: 400 });
    }

    const context = await retrieveLyraContext(message);
    const system = getLyraSystemPrompt(language, context);

    const historyText = history
      .slice(-6)
      .map(
        (m: { role: string; content: string }) =>
          `${m.role === "user" ? "User" : "Lyra"}: ${m.content}`
      )
      .join("\n");

    const userPrompt = `${historyText ? `Previous conversation:\n${historyText}\n\n` : ""}User: ${message}`;

    const reply = await chatCompletion(system, userPrompt, GROQ_MODELS.lyra);

    const supabase = await createClient();
    const user = await getUserFromToken();

    if (user) {
      const newMessages = [
        ...history,
        {
          role: "user",
          content: message,
          timestamp: new Date().toISOString(),
        },
        {
          role: "assistant",
          content: reply,
          timestamp: new Date().toISOString(),
        },
      ];
      await supabase.from("lyra_conversations").upsert(
        {
          user_id: user.id,
          messages: newMessages,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );
    }

    return NextResponse.json({ reply });
  } catch (error) {
    console.error("Lyra error:", error);
    return NextResponse.json(
      { error: "Lyra is unavailable. Please try again." },
      { status: 503 }
    );
  }
}
