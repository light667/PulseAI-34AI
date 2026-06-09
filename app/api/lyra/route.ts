import { NextRequest } from "next/server";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.BACKEND_URL ||
  "https://pulseai-backend-dr6f.onrender.com";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const backendRes = await fetch(`${BACKEND_URL}/lyra`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(45000),
    });

    if (!backendRes.ok) {
      return new Response(
        JSON.stringify({ error: "Backend Lyra indisponible" }),
        { status: backendRes.status, headers: { "Content-Type": "application/json" } }
      );
    }

    // Streamer la réponse SSE directement au client
    return new Response(backendRes.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: "Impossible de contacter Lyra" }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }
}