import { NextResponse } from "next/server";
import {
  loadAllHospitals,
  loadCountryHospitals,
  COUNTRY_CAPITALS,
} from "@/lib/hospitals/loader";
import { searchNearbyHospitals } from "@/lib/hospitals/search";
import type { CountryCode } from "@/types/hospital";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = parseFloat(searchParams.get("lat") ?? "");
  const lon = parseFloat(searchParams.get("lon") ?? "");
  const country = (searchParams.get("country") ?? "all") as CountryCode;
  const services = searchParams.get("services")?.split(",").filter(Boolean) ?? [];
  const query = searchParams.get("q")?.toLowerCase() ?? "";
  const limit = parseInt(searchParams.get("limit") ?? "30", 10);

  let searchLat = lat;
  let searchLon = lon;

  if (isNaN(searchLat) || isNaN(searchLon)) {
    const capital =
      country !== "all" ? COUNTRY_CAPITALS[country] : COUNTRY_CAPITALS.togo;
    searchLat = capital.lat;
    searchLon = capital.lon;
  }

  let collection =
    country !== "all"
      ? loadCountryHospitals(country)
      : loadAllHospitals();

  if (!collection || collection.features.length === 0) {
    return NextResponse.json({
      hospitals: [],
      message:
        "No hospital data loaded. Add GeoJSON files to public/data/.",
      center: { lat: searchLat, lon: searchLon },
    });
  }

  let features = collection.features;

  if (query) {
    features = features.filter(
      (f) =>
        f.properties.name.toLowerCase().includes(query) ||
        f.properties.city.toLowerCase().includes(query)
    );
  }

  const hospitals = searchNearbyHospitals(features, searchLat, searchLon, {
    services,
    limit,
    maxDistanceKm: 100,
  });

  return NextResponse.json({
    hospitals,
    center: { lat: searchLat, lon: searchLon },
    total: hospitals.length,
  });
}
