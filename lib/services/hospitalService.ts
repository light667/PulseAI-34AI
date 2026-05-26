import type { CountryCode } from "@/types/hospital";

export async function searchHospitals(params: {
  lat: number;
  lon: number;
  country?: CountryCode;
  services?: string[];
  query?: string;
  limit?: number;
}) {
  const searchParams = new URLSearchParams({
    lat: String(params.lat),
    lon: String(params.lon),
    limit: String(params.limit ?? 30),
  });
  if (params.country) searchParams.set("country", params.country);
  if (params.services?.length)
    searchParams.set("services", params.services.join(","));
  if (params.query) searchParams.set("q", params.query);

  const res = await fetch(`/api/hospitals?${searchParams}`);
  if (!res.ok) throw new Error("Hospital search failed");
  return res.json();
}
