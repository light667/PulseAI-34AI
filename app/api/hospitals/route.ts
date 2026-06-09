import { NextResponse } from "next/server";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "https://pulseai-backend.onrender.com";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const lat = searchParams.get("lat");
  const lon = searchParams.get("lon");
  const services = searchParams.get("services") ?? "";
  const query = searchParams.get("q") ?? "";
  const limit = searchParams.get("limit") ?? "20";

  // lat et lon sont maintenant OBLIGATOIRES — viennent du GPS du navigateur
  if (!lat || !lon || isNaN(parseFloat(lat)) || isNaN(parseFloat(lon))) {
    return NextResponse.json(
      {
        error: "Position GPS requise. Veuillez autoriser l'accès à votre localisation.",
        hospitals: [],
        needsLocation: true,
      },
      { status: 400 }
    );
  }

  const params = new URLSearchParams({
    lat,
    lon,
    limit,
    ...(services && { services }),
    ...(query && { q: query }),
  });

  try {
    const res = await fetch(`${BACKEND_URL}/hospitals/search?${params.toString()}`, {
      headers: { "Content-Type": "application/json" },
      // next: { revalidate: 60 } // cache 60s côté Next si tu veux
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: "Erreur backend" }));
      return NextResponse.json(errorData, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("[API /hospitals] Erreur:", err);
    return NextResponse.json(
      { error: "Le service de recherche d'hôpitaux est indisponible.", hospitals: [] },
      { status: 503 }
    );
  }
}