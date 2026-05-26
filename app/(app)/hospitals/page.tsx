"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Map, List, Locate } from "lucide-react";
import HospitalCard from "@/components/hospitals/HospitalCard";
import { searchHospitals } from "@/lib/services/hospitalService";
import type { CountryCode, HospitalWithDistance } from "@/types/hospital";
import { Button } from "@/components/ui/button";

const HospitalMap = dynamic(
  () => import("@/components/hospitals/HospitalMap"),
  { ssr: false, loading: () => <div className="h-[300px] animate-pulse rounded-2xl bg-[var(--bg-secondary)]" /> }
);

const COUNTRIES: { code: CountryCode; label: string }[] = [
  { code: "all", label: "All" },
  { code: "togo", label: "Togo" },
  { code: "nigeria", label: "Nigeria" },
  { code: "ghana", label: "Ghana" },
  { code: "benin", label: "Benin" },
  { code: "cote_divoire", label: "Côte d'Ivoire" },
];

const SERVICES = [
  "urgences",
  "maternite",
  "pediatrie",
  "chirurgie",
  "radiologie",
  "psychiatrie",
];

export default function HospitalsPage() {
  const [hospitals, setHospitals] = useState<HospitalWithDistance[]>([]);
  const [center, setCenter] = useState({ lat: 6.1375, lon: 1.2255 });
  const [country, setCountry] = useState<CountryCode>("togo");
  const [services, setServices] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState<string>();
  const [showMap, setShowMap] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [userLoc, setUserLoc] = useState<{ lat: number; lon: number } | null>(null);

  const load = async (lat: number, lon: number) => {
    setLoading(true);
    try {
      const data = await searchHospitals({
        lat,
        lon,
        country,
        services,
        query,
      });
      setHospitals(data.hospitals ?? []);
      if (data.center) setCenter(data.center);
    } catch {
      setHospitals([]);
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    load(center.lat, center.lon);
  }, [country, services, query]);

  const useLocation = () => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = {
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
        };
        setUserLoc(loc);
        setCenter(loc);
        load(loc.lat, loc.lon);
      },
      () => alert("Location denied. Select a country manually.")
    );
  };

  return (
    <div className="flex h-[calc(100vh-9rem)] md:h-[calc(100vh-4rem)] flex-col">
      <h1 className="mb-4 font-display text-2xl font-bold md:text-3xl">Hospital Finder</h1>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search hospitals by name or city..."
        className="input-field mb-3"
      />

      <div className="mb-3 flex flex-wrap gap-2">
        {COUNTRIES.map((c) => (
          <button
            key={c.code}
            onClick={() => setCountry(c.code)}
            className={`rounded-full px-3 py-1 text-xs ${
              country === c.code
                ? "bg-[var(--accent-green)] text-[var(--text-inverse)]"
                : "bg-[var(--bg-tertiary)]"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="mb-3 flex flex-wrap gap-1">
        {SERVICES.map((s) => (
          <button
            key={s}
            onClick={() =>
              setServices((prev) =>
                prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
              )
            }
            className={`rounded-full px-2 py-0.5 text-xs capitalize ${
              services.includes(s)
                ? "bg-[var(--accent-blue)]/30 text-[var(--accent-blue)]"
                : "bg-[var(--bg-tertiary)]"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="mb-3 flex gap-2">
        <Button size="sm" variant="secondary" onClick={useLocation} className="gap-1">
          <Locate size={14} /> My Location
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setShowMap(!showMap)}
          className="gap-1"
        >
          {showMap ? <List size={14} /> : <Map size={14} />}
          {showMap ? "List" : "Map"}
        </Button>
      </div>

      {showMap && (
        <div className="mb-4 h-[40vh]">
          <HospitalMap
            hospitals={hospitals}
            center={center}
            selectedId={selectedId}
            onSelect={setSelectedId}
            userLocation={userLoc}
          />
        </div>
      )}

      <div className="flex-1 space-y-3 overflow-y-auto pb-4">
        {loading ? (
          <p className="text-[var(--text-muted)]">Loading hospitals...</p>
        ) : hospitals.length === 0 ? (
          <p className="text-center text-[var(--text-muted)]">
            No hospitals found. Add GeoJSON files to public/data/
          </p>
        ) : (
          hospitals.map((h) => (
            <HospitalCard
              key={h.properties.id}
              hospital={h}
              selected={selectedId === h.properties.id}
              onSelect={() => setSelectedId(h.properties.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
