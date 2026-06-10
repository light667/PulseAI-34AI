"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Search, MapPin, Loader2, AlertCircle, Navigation,
} from "lucide-react";
import { Input }       from "@/components/ui/input";
import { Button }      from "@/components/ui/button";
import HospitalCard    from "@/components/hospitals/HospitalCard";
import HospitalMap     from "@/components/hospitals/HospitalMap";

interface Hospital {
  id: string;
  name: string;
  city: string;
  country: string;
  countryKey: string;
  type: string;
  phone: string | null;
  services: string[];
  emergency: boolean;
  opening_hours: string | null;
  lat: number;
  lon: number;
  distanceKm: number;
  durationMin: number;
  distanceSource: "osrm" | "haversine";
}

type LocationState =
  | { status: "idle" }
  | { status: "requesting" }
  | { status: "granted"; lat: number; lon: number }
  | { status: "denied"; reason: string };

const SERVICE_FILTERS = [
  "Emergency", "General Medicine", "Surgery",
  "Maternity", "Pediatrics", "Cardiology", "Psychiatry",
];

const COUNTRY_FILTERS = [
  { key: "all",         flag: "🌍", label: "Tous" },
  { key: "togo",        flag: "🇹🇬", label: "Togo" },
  { key: "benin",       flag: "🇧🇯", label: "Bénin" },
  { key: "ghana",       flag: "🇬🇭", label: "Ghana" },
  { key: "cote_divoire",flag: "🇨🇮", label: "Côte d'Ivoire" },
  { key: "burkina_faso",flag: "🇧🇫", label: "Burkina Faso" },
  { key: "nigeria",     flag: "🇳🇬", label: "Nigeria" },
  { key: "niger",       flag: "🇳🇪", label: "Niger" },
  { key: "mali",        flag: "🇲🇱", label: "Mali" },
];

export default function HospitalsPage() {
  const [location,       setLocation]       = useState<LocationState>({ status: "idle" });
  const [hospitals,      setHospitals]      = useState<Hospital[]>([]);
  const [loading,        setLoading]        = useState(false);
  const [error,          setError]          = useState<string | null>(null);
  const [selectedId,     setSelectedId]     = useState<string | null>(null);
  const [query,          setQuery]          = useState("");
  const [activeServices, setActiveServices] = useState<string[]>([]);
  const [activeCountry,  setActiveCountry]  = useState("all");
  const searchRef = useRef<NodeJS.Timeout | null>(null);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocation({ status: "denied", reason: "Géolocalisation non supportée." });
      return;
    }
    setLocation({ status: "requesting" });
    navigator.geolocation.getCurrentPosition(
      (pos) => setLocation({
        status: "granted",
        lat: pos.coords.latitude,
        lon: pos.coords.longitude,
      }),
      (err) => {
        const reason =
          err.code === err.TIMEOUT            ? "Délai dépassé. Réessayez." :
          err.code === err.POSITION_UNAVAILABLE ? "Position indisponible." :
          "Accès à la localisation refusé.";
        setLocation({ status: "denied", reason });
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 300000 }
    );
  }, []);

  const fetchHospitals = useCallback(
    async (lat: number, lon: number, q: string, services: string[], country: string) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          lat:   lat.toString(),
          lon:   lon.toString(),
          limit: "30",
        });
        if (q)               params.set("q", q);
        if (services.length) params.set("services", services.join(","));
        if (country !== "all") params.set("country", country);

        const res  = await fetch(`/api/hospitals?${params.toString()}`);
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Erreur lors de la recherche.");
          setHospitals([]);
          return;
        }
        setHospitals(data.hospitals || []);
      } catch {
        setError("Impossible de contacter le serveur.");
        setHospitals([]);
      } finally {
        setLoading(false);
      }
    }, []
  );

  // Lancer la recherche dès que la position est disponible
  useEffect(() => {
    if (location.status === "granted") {
      fetchHospitals(location.lat, location.lon, query, activeServices, activeCountry);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location]);

  // Debounce sur filtres
  useEffect(() => {
    if (location.status !== "granted") return;
    if (searchRef.current) clearTimeout(searchRef.current);
    searchRef.current = setTimeout(() => {
      fetchHospitals(location.lat, location.lon, query, activeServices, activeCountry);
    }, 400);
    return () => { if (searchRef.current) clearTimeout(searchRef.current); };
  }, [query, activeServices, activeCountry, location, fetchHospitals]);

  useEffect(() => { requestLocation(); }, [requestLocation]);

  const toggleService = (s: string) =>
    setActiveServices(prev =>
      prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
    );

  const selectedHospital = hospitals.find(h => h.id === selectedId) || null;

  // ── Permission screen ──────────────────────────────────────────────────────
  if (location.status === "idle" || location.status === "requesting") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4">
        <div className="text-center space-y-3 max-w-md">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full"
               style={{ background: "var(--accent-green-glow)" }}>
            <Navigation className="h-8 w-8" style={{ color: "var(--accent-green)" }} />
          </div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "Syne, sans-serif", color: "var(--text-primary)" }}>
            Trouvez un hôpital proche
          </h1>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            PulseAI calcule les distances réelles routières depuis votre position GPS
            vers les hôpitaux de 8 pays d&apos;Afrique de l&apos;Ouest.
          </p>
        </div>
        {location.status === "requesting" ? (
          <div className="flex items-center gap-3" style={{ color: "var(--text-secondary)" }}>
            <Loader2 className="h-5 w-5 animate-spin" style={{ color: "var(--accent-green)" }} />
            <span>Acquisition de votre position...</span>
          </div>
        ) : (
          <Button onClick={requestLocation} className="gap-2 px-6 py-3 text-base">
            <MapPin className="h-5 w-5" /> Autoriser la localisation
          </Button>
        )}
      </div>
    );
  }

  // ── Error screen ───────────────────────────────────────────────────────────
  if (location.status === "denied") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4">
        <div className="text-center space-y-3 max-w-md">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
          <h2 className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>
            Localisation non disponible
          </h2>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            {location.reason}
          </p>
        </div>
        <Button variant="secondary" onClick={requestLocation} className="gap-2">
          <Navigation className="h-4 w-4" /> Réessayer
        </Button>
      </div>
    );
  }

  // ── Main view ──────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen flex-col overflow-hidden"
         style={{ background: "var(--bg-primary)" }}>

      {/* Sticky header */}
      <div className="border-b px-4 py-3 space-y-3 shrink-0 z-20 backdrop-blur-sm"
           style={{
             borderColor: "var(--border-default)",
             background: "var(--bg-primary)",
           }}>

        {/* Search bar */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4"
                    style={{ color: "var(--text-tertiary)" }} />
            <Input
              placeholder="Nom d'hôpital, ville..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="pl-10"
              style={{
                background:   "var(--bg-secondary)",
                borderColor:  "var(--border-default)",
                color:        "var(--text-primary)",
              }}
            />
          </div>
          <Button size="icon" variant="secondary" onClick={requestLocation}
                  title="Rafraîchir position">
            <MapPin className="h-4 w-4" />
          </Button>
        </div>

        {/* Country filter */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {COUNTRY_FILTERS.map(c => (
            <button
              key={c.key}
              onClick={() => setActiveCountry(c.key)}
              className="shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-all"
              style={{
                background:  activeCountry === c.key ? "var(--accent-green)"  : "var(--bg-secondary)",
                color:       activeCountry === c.key ? "var(--text-inverse)"  : "var(--text-secondary)",
                border:      activeCountry === c.key ? "1px solid var(--accent-green)" : "1px solid var(--border-default)",
              }}
            >
              {c.flag} {c.label}
            </button>
          ))}
        </div>

        {/* Service filter */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {SERVICE_FILTERS.map(s => (
            <button
              key={s}
              onClick={() => toggleService(s)}
              className="shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-all"
              style={{
                background:  activeServices.includes(s) ? "var(--accent-green)"        : "var(--bg-tertiary)",
                color:       activeServices.includes(s) ? "var(--text-inverse)"        : "var(--text-secondary)",
                border:      activeServices.includes(s) ? "1px solid var(--accent-green)" : "1px solid transparent",
              }}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Status */}
        <div className="flex items-center justify-between text-xs"
             style={{ color: "var(--text-tertiary)" }}>
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full animate-pulse"
                  style={{ background: "var(--accent-green)" }} />
            Position GPS active
          </span>
          {!loading && (
            <span>
              {hospitals.length} hôpital{hospitals.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">

        {/* List */}
        <div className="w-full md:w-[420px] flex-shrink-0 overflow-y-auto px-3 py-3 space-y-3">
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-3"
                 style={{ color: "var(--text-tertiary)" }}>
              <Loader2 className="h-7 w-7 animate-spin" style={{ color: "var(--accent-green)" }} />
              <span className="text-sm">Calcul des distances...</span>
            </div>
          )}

          {!loading && error && (
            <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {!loading && !error && hospitals.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 gap-2"
                 style={{ color: "var(--text-tertiary)" }}>
              <MapPin className="h-8 w-8 opacity-30" />
              <p className="text-sm">Aucun hôpital trouvé.</p>
              {(activeServices.length > 0 || activeCountry !== "all") && (
                <button
                  onClick={() => { setActiveServices([]); setActiveCountry("all"); }}
                  className="text-xs underline"
                  style={{ color: "var(--accent-green)" }}
                >
                  Supprimer les filtres
                </button>
              )}
            </div>
          )}

          {!loading && hospitals.map(hospital => (
            <HospitalCard
              key={hospital.id}
              hospital={{
                ...hospital,
                type:       "Feature" as const,
                distance:   hospital.distanceKm,
                geometry:   {
                  type:        "Point" as const,
                  coordinates: [hospital.lon, hospital.lat] as [number, number],
                },
                properties: {
                  id:            hospital.id,
                  name:          hospital.name,
                  city:          hospital.city,
                  country:       hospital.country,
                  type:          hospital.type,
                  phone:         hospital.phone ?? "",
                  services:      hospital.services,
                  specialties:   hospital.services,
                  emergency:     hospital.emergency,
                  opening_hours: hospital.opening_hours ?? "",
                  latitude:      hospital.lat,
                  longitude:     hospital.lon,
                },
                bedsEstimate: 50,
              }}
              selected={selectedId === hospital.id}
              onSelect={() =>
                setSelectedId(selectedId === hospital.id ? null : hospital.id)
              }
            />
          ))}
        </div>

        {/* Map — desktop only */}
        <div className="hidden md:flex flex-1 p-3">
          <HospitalMap
            hospitals={hospitals.map(h => ({
              ...h,
              type:     "Feature" as const,
              distance: h.distanceKm,
              geometry: {
                type:        "Point" as const,
                coordinates: [h.lon, h.lat] as [number, number],
              },
              properties: {
                id:            h.id,
                name:          h.name,
                city:          h.city,
                country:       h.country,
                type:          h.type,
                phone:         h.phone ?? "",
                services:      h.services,
                specialties:   h.services,
                emergency:     h.emergency,
                opening_hours: h.opening_hours ?? "",
                latitude:      h.lat,
                longitude:     h.lon,
              },
              bedsEstimate: 50,
            }))}
            center={
              selectedHospital
                ? { lat: selectedHospital.lat, lon: selectedHospital.lon }
                : { lat: location.lat, lon: location.lon }
            }
            selectedId={selectedId ?? undefined}
            onSelect={setSelectedId}
            userLocation={{ lat: location.lat, lon: location.lon }}
          />
        </div>
      </div>
    </div>
  );
}