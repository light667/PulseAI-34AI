import { NextResponse } from "next/server";

// URL correcte avec le suffixe render
const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.BACKEND_URL ||
  "https://pulseai-backend-dr6f.onrender.com";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const lat     = searchParams.get("lat");
  const lon     = searchParams.get("lon");
  const services = searchParams.get("services") ?? "";
  const query   = searchParams.get("q") ?? "";
  const limit   = searchParams.get("limit") ?? "20";
  const country = searchParams.get("country") ?? "";

  if (!lat || !lon || isNaN(parseFloat(lat)) || isNaN(parseFloat(lon))) {
    return NextResponse.json(
      { error: "Position GPS requise.", hospitals: [], needsLocation: true },
      { status: 400 }
    );
  }

  const params = new URLSearchParams({ lat, lon, limit });
  if (services) params.set("services", services);
  if (query)    params.set("q", query);
  if (country)  params.set("country", country);

  try {
    const res = await fetch(
      `${BACKEND_URL}/hospitals/search?${params.toString()}`,
      {
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(15000),
      }
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Erreur backend" }));
      return NextResponse.json(err, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: any) {
    if (err.name === "TimeoutError") {
      return NextResponse.json(
        { error: "Le service est lent. Réessayez.", hospitals: [] },
        { status: 504 }
      );
    }
    return NextResponse.json(
      { error: "Service indisponible.", hospitals: [] },
      { status: 503 }
    );
  }
}