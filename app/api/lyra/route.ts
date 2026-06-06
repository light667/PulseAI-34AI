import { NextResponse } from "next/server";
import { getLyraSystemPrompt } from "@/lib/prompts/lyra";
import { retrieveLyraContext } from "@/lib/rag/retrieve";

export async function POST(request: Request) {
  try {
    const { message, conversationHistory, history, language = "fr" } = await request.json();
    const activeHistory = conversationHistory || history || [];

    if (!message?.trim()) {
      return NextResponse.json({ error: "Message required" }, { status: 400 });
    }

    // 1. & 2. Embed & Retrieve context
    const { contextText, retrievedChunks } = await retrieveLyraContext(message);

    // 3. Inject into prompt
    const systemPrompt = getLyraSystemPrompt(language, contextText);

    // Format history for Mistral API
    const formattedMessages = [
      { role: "system", content: systemPrompt },
      ...activeHistory.map((m: any) => ({
        role: m.role,
        content: m.content,
      })),
      { role: "user", content: message },
    ];

    // 4. Call Mistral API with streaming
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
        messages: formattedMessages,
        stream: true,
      }),
    });

    if (!mistralResponse.ok) {
      const errText = await mistralResponse.text();
      console.error("Mistral API error:", errText);
      throw new Error("Failed to generate response from Mistral");
    }

    const reader = mistralResponse.body?.getReader();
    if (!reader) {
      throw new Error("No response body from Mistral API");
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const stream = new ReadableStream({
      async start(controller) {
        // Enqueue retrieved chunks metadata first
        controller.enqueue(
          encoder.encode(
            JSON.stringify({ type: "metadata", retrievedChunks }) + "\n"
          )
        );

        let buffer = "";
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              const cleanLine = line.trim();
              if (!cleanLine) continue;

              if (cleanLine.startsWith("data: ")) {
                const dataStr = cleanLine.substring(6).trim();
                if (dataStr === "[DONE]") {
                  break;
                }

                try {
                  const parsed = JSON.parse(dataStr);
                  const chunkText = parsed.choices?.[0]?.delta?.content || "";
                  if (chunkText) {
                    controller.enqueue(
                      encoder.encode(
                        JSON.stringify({ type: "chunk", text: chunkText }) + "\n"
                      )
                    );
                  }
                } catch (e) {
                  // ignore parsing errors of partial lines
                }
              }
            }
          }
        } catch (e) {
          console.error("Stream reading error:", e);
        } finally {
          // Done streaming
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error) {
    console.error("Lyra route error:", error);
    return NextResponse.json(
      { error: "Lyra is currently resting. Please try again later. 🌿" },
      { status: 503 }
    );
  }
}
