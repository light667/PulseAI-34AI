"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Search, MapPin, Filter, Loader2, AlertCircle, Navigation } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import HospitalCard from "@/components/hospitals/HospitalCard";
import HospitalMap from "@/components/hospitals/HospitalMap";

interface Hospital {
  id: string;
  name: string;
  city: string;
  country: string;
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
  "Emergency", "General Medicine", "Surgery", "Maternity",
  "Pediatrics", "Cardiology", "Psychiatry",
];

export default function HospitalsPage() {
  const [location, setLocation] = useState<LocationState>({ status: "idle" });
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [activeServices, setActiveServices] = useState<string[]>([]);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Demande la position GPS à l'utilisateur
  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocation({
        status: "denied",
        reason: "Votre navigateur ne supporte pas la géolocalisation.",
      });
      return;
    }

    setLocation({ status: "requesting" });

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          status: "granted",
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
        });
      },
      (err) => {
        let reason = "Accès à la localisation refusé.";
        if (err.code === err.TIMEOUT) reason = "Délai d'attente dépassé. Réessayez.";
        if (err.code === err.POSITION_UNAVAILABLE)
          reason = "Position non disponible. Vérifiez votre GPS.";
        setLocation({ status: "denied", reason });
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 300000 }
    );
  }, []);

  // Lance la recherche dès que la position est disponible ou que les filtres changent
  const fetchHospitals = useCallback(
    async (lat: number, lon: number, q: string, services: string[]) => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          lat: lat.toString(),
          lon: lon.toString(),
          limit: "25",
          ...(q && { q }),
          ...(services.length > 0 && { services: services.join(",") }),
        });

        const res = await fetch(`/api/hospitals?${params.toString()}`);
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Erreur lors de la recherche.");
          setHospitals([]);
          return;
        }

        setHospitals(data.hospitals || []);
      } catch {
        setError("Impossible de contacter le serveur. Vérifiez votre connexion.");
        setHospitals([]);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Déclenche la recherche quand la position change
  useEffect(() => {
    if (location.status === "granted") {
      fetchHospitals(location.lat, location.lon, query, activeServices);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location]); // intentionnel : on veut déclencher uniquement sur changement de position

  // Debounce sur la recherche textuelle et les filtres
  // Debounce sur la recherche textuelle et les filtres
  useEffect(() => {
    if (location.status !== "granted") return; // Ici, TypeScript comprend que location a désormais .lat et .lon
    
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    
    searchTimeoutRef.current = setTimeout(() => {
      fetchHospitals(location.lat, location.lon, query, activeServices);
    }, 400);
    
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  // CORRECTION : On passe "location" entier au lieu de "location.lat" et "location.lon"
  }, [query, activeServices, location, fetchHospitals]);
  // Demande automatique de position au chargement
  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  const toggleService = (s: string) => {
    setActiveServices((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  };

  const selectedHospital = hospitals.find((h) => h.id === selectedId) || null;

  // ── Écran de demande de permission ──
  if (location.status === "idle" || location.status === "requesting") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4">
        <div className="text-center space-y-3 max-w-md">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--accent-green-glow)]">
            <Navigation className="h-8 w-8 text-[var(--accent-green)]" />
          </div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            Trouvez un hôpital proche
          </h1>
          <p className="text-[var(--text-secondary)] text-sm">
            PulseAI utilise votre position GPS pour calculer les distances réelles routières
            {"jusqu'aux hôpitaux et les classer du plus proche au plus loin."}
          </p>
        </div>

        {location.status === "requesting" ? (
          <div className="flex items-center gap-3 text-[var(--text-secondary)]">
            <Loader2 className="h-5 w-5 animate-spin text-[var(--accent-green)]" />
            <span>Acquisition de votre position...</span>
          </div>
        ) : (
          <Button onClick={requestLocation} className="gap-2 px-6 py-3 text-base">
            <MapPin className="h-5 w-5" />
            Autoriser la localisation
          </Button>
        )}
      </div>
    );
  }

  // ── Écran d'erreur de localisation ──
  if (location.status === "denied") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4">
        <div className="text-center space-y-3 max-w-md">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
            <AlertCircle className="h-8 w-8 text-red-500" />
          </div>
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">
            Localisation non disponible
          </h2>
          <p className="text-[var(--text-secondary)] text-sm">{location.reason}</p>
          <p className="text-xs text-[var(--text-muted)]">
            Pour réactiver : Paramètres du navigateur → Site → Autoriser la localisation
          </p>
        </div>
        <Button variant="secondary" onClick={requestLocation} className="gap-2">
          <Navigation className="h-4 w-4" />
          Réessayer
        </Button>
      </div>
    );
  }

  // ── Vue principale ──
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[var(--bg-primary)]">
      {/* Header sticky */}
      <div className="border-b border-[var(--border-default)] bg-[var(--bg-primary)]/95 backdrop-blur-sm px-4 py-3 space-y-3 shrink-0 z-20">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
            <Input
              placeholder="Nom d'hôpital, ville..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10 bg-[var(--bg-secondary)] border-[var(--border-default)]"
            />
          </div>
          <Button
            size="icon"
            variant="secondary"
            onClick={requestLocation}
            title="Rafraîchir ma position"
            className="shrink-0"
          >
            <MapPin className="h-4 w-4" />
          </Button>
        </div>

        {/* Filtres services */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {SERVICE_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => toggleService(s)}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-all ${
                activeServices.includes(s)
                  ? "bg-[var(--accent-green)] text-white"
                  : "bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Status bar */}
        <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent-green)] animate-pulse" />
            Position GPS active
          </span>
          {!loading && (
            <span>
              {hospitals.length} hôpital{hospitals.length !== 1 ? "s" : ""} trouvé{hospitals.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      {/* Corps principal */}
      <div className="flex flex-1 overflow-hidden">
        {/* Liste hôpitaux */}
        <div className="w-full md:w-[420px] flex-shrink-0 overflow-y-auto px-3 py-3 space-y-3">
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-[var(--text-muted)]">
              <Loader2 className="h-7 w-7 animate-spin text-[var(--accent-green)]" />
              <span className="text-sm">Calcul des distances réelles...</span>
            </div>
          )}

          {!loading && error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {!loading && !error && hospitals.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-[var(--text-muted)]">
              <MapPin className="h-8 w-8 opacity-30" />
              <p className="text-sm">Aucun hôpital trouvé dans votre zone.</p>
              {activeServices.length > 0 && (
                <button
                  onClick={() => setActiveServices([])}
                  className="text-xs text-[var(--accent-green)] underline"
                >
                  Supprimer les filtres
                </button>
              )}
            </div>
          )}

          {!loading &&
            hospitals.map((hospital) => (
              <HospitalCard
                key={hospital.id}
                hospital={{
                  ...hospital,
                  type: "Feature" as const,
                  distanceKm: hospital.distanceKm,
                  distance: hospital.distanceKm,
                  geometry: { type: "Point" as const, coordinates: [hospital.lon, hospital.lat] as [number, number] },
                  properties: {
                    id: hospital.id,
                    name: hospital.name,
                    city: hospital.city,
                    country: hospital.country,
                    type: hospital.type,
                    phone: hospital.phone ?? "",
                    services: hospital.services,
                    specialties: hospital.services,
                    emergency: hospital.emergency,
                    opening_hours: hospital.opening_hours ?? "",
                    latitude: hospital.lat,
                    longitude: hospital.lon,
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

        {/* Carte — cachée sur mobile, visible sur desktop */}
        <div className="hidden md:flex flex-1 p-3">
          <HospitalMap
            hospitals={hospitals.map((h) => ({
              ...h,
              distanceKm: h.distanceKm,
              distance: h.distanceKm,
              type: "Feature" as const,
              geometry: { type: "Point" as const, coordinates: [h.lon, h.lat] as [number, number] },
              properties: {
                id: h.id,
                name: h.name,
                city: h.city,
                country: h.country,
                type: h.type,
                phone: h.phone ?? "",
                services: h.services,
                specialties: h.services,
                emergency: h.emergency,
                opening_hours: h.opening_hours ?? "",
                latitude: h.lat,
                longitude: h.lon,
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