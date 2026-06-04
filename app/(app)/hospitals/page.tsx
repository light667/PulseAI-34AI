"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { Map, List, Locate, MapPin } from "lucide-react";
import HospitalCard from "@/components/hospitals/HospitalCard";
import { searchHospitals } from "@/lib/services/hospitalService";
import type { CountryCode, HospitalWithDistance } from "@/types/hospital";
import { Button } from "@/components/ui/button";
import { useHealthStore } from "@/lib/store/useHealthStore";
import { t } from "@/lib/i18n";

const DEFAULT_CENTER = { lat: 6.1375, lon: 1.2255 };

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
  const language = useHealthStore((s) => s.language);
  const [hospitals, setHospitals] = useState<HospitalWithDistance[]>([]);
  const [center, setCenter] = useState(DEFAULT_CENTER);
  const [country, setCountry] = useState<CountryCode>("togo");
  const [services, setServices] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState<string>();
  const [showMap, setShowMap] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [userLoc, setUserLoc] = useState<{ lat: number; lon: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<
    "pending" | "granted" | "denied" | "unavailable"
  >("pending");
  const geoRequested = useRef(false);

  const load = useCallback(
    async (lat: number, lon: number) => {
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
    },
    [country, services, query]
  );

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationStatus("unavailable");
      return;
    }

    setLocationStatus("pending");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = {
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
        };
        setUserLoc(loc);
        setCenter(loc);
        setLocationStatus("granted");
      },
      () => setLocationStatus("denied"),
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }, []);

  useEffect(() => {
    if (geoRequested.current) return;
    geoRequested.current = true;
    requestLocation();
  }, [requestLocation]);

  useEffect(() => {
    load(center.lat, center.lon);
  }, [center.lat, center.lon, load]);

  return (
    <div className="flex h-[calc(100vh-9rem)] md:h-[calc(100vh-4rem)] flex-col">
      <h1 className="mb-4 font-display text-2xl font-bold md:text-3xl">
        {t("hospitals.title", language)}
      </h1>

      {locationStatus !== "granted" && (
        <div
          className={`mb-4 flex items-start gap-3 rounded-xl border p-4 ${
            locationStatus === "denied"
              ? "border-[var(--accent-orange)]/30 bg-[var(--accent-orange-glow)]"
              : "border-[var(--border-active)] bg-[var(--accent-green-subtle)]"
          }`}
        >
          <MapPin
            size={18}
            className={
              locationStatus === "denied"
                ? "text-[var(--accent-orange)]"
                : "text-[var(--accent-green)]"
            }
          />
          <div className="flex-1">
            <p className="text-sm text-[var(--text-secondary)]">
              {locationStatus === "denied"
                ? t("hospitals.locationDenied", language)
                : t("hospitals.locationPrompt", language)}
            </p>
            {locationStatus === "denied" && (
              <Button
                size="sm"
                variant="secondary"
                onClick={requestLocation}
                className="mt-2 gap-1"
              >
                <Locate size={14} />
                {t("hospitals.myLocation", language)}
              </Button>
            )}
          </div>
        </div>
      )}

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t("hospitals.search", language)}
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
        <Button size="sm" variant="secondary" onClick={requestLocation} className="gap-1">
          <Locate size={14} /> {t("hospitals.myLocation", language)}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setShowMap(!showMap)}
          className="gap-1"
        >
          {showMap ? <List size={14} /> : <Map size={14} />}
          {showMap ? t("hospitals.list", language) : t("hospitals.map", language)}
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
          <p className="text-[var(--text-muted)]">{t("hospitals.loading", language)}</p>
        ) : hospitals.length === 0 ? (
          <p className="text-center text-[var(--text-muted)]">
            {t("hospitals.none", language)}
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
