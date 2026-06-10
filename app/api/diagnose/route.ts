import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.BACKEND_URL ||
  "https://pulseai-backend-dr6f.onrender.com";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const backendRes = await fetch(`${BACKEND_URL}/diagnose`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30000), // 30s au lieu de 60s
    });

    if (!backendRes.ok) {
      const err = await backendRes.json().catch(() => ({
        error: "Erreur du serveur d'analyse",
      }));
      return NextResponse.json(err, { status: backendRes.status });
    }

    const data = await backendRes.json();
    return NextResponse.json(data);

  } catch (err: any) {
    if (err.name === "TimeoutError" || err.name === "AbortError") {
      return NextResponse.json(
        { error: "Analyse trop longue. Le serveur se réveille, réessayez dans 30 secondes." },
        { status: 504 }
      );
    }
    return NextResponse.json(
      { error: "Impossible de contacter le serveur d'analyse." },
      { status: 503 }
    );
  }
}