"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import dynamic from "next/dynamic";
import {
  Map,
  List,
  Locate,
  MapPin,
  Search,
  X,
  Phone,
  Navigation,
  Sparkles,
  AlertTriangle,
  Clock,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import HospitalCard from "@/components/hospitals/HospitalCard";
import { searchHospitals } from "@/lib/services/hospitalService";
import type { CountryCode, HospitalWithDistance } from "@/types/hospital";
import { Button } from "@/components/ui/button";
import { useHealthStore } from "@/lib/store/useHealthStore";
import { t } from "@/lib/i18n";
import { motion, AnimatePresence } from "framer-motion";

const DEFAULT_CENTER = { lat: 6.1375, lon: 1.2255 };

const HospitalMap = dynamic(
  () => import("@/components/hospitals/HospitalMap"),
  {
    ssr: false,
    loading: () => (
      <div className="h-full min-h-[300px] w-full animate-pulse rounded-2xl bg-[var(--bg-secondary)] flex items-center justify-center border border-[var(--border-default)]">
        <span className="text-sm text-[var(--text-muted)]">Loading Map...</span>
      </div>
    ),
  }
);

const COUNTRIES: { code: CountryCode; label: string; lat: number; lon: number }[] = [
  { code: "all", label: "All Countries", lat: 6.1375, lon: 1.2255 },
  { code: "togo", label: "Togo", lat: 6.1375, lon: 1.2255 },
  { code: "niger", label: "Niger", lat: 13.5116, lon: 2.1254 },
  { code: "mali", label: "Mali", lat: 12.6392, lon: -8.0029 },
  { code: "cote_divoire", label: "Côte d'Ivoire", lat: 5.36, lon: -4.0083 },
  { code: "ghana", label: "Ghana", lat: 5.6037, lon: -0.187 },
  { code: "burkina_faso", label: "Burkina Faso", lat: 12.3714, lon: -1.5197 },
  { code: "benin", label: "Benin", lat: 6.4969, lon: 2.6289 },
];

const FILTER_SERVICES = [
  "Emergency",
  "General Medicine",
  "Pediatrics",
  "Cardiology",
  "Surgery",
  "Psychiatry",
  "Maternity",
  "Trauma",
];

// Map diagnosis condition to service categories
function getRecommendedService(conditionName: string): string {
  const cond = conditionName.toLowerCase();
  if (
    cond.includes("malaria") ||
    cond.includes("paludisme") ||
    cond.includes("typhoid") ||
    cond.includes("typhoïde") ||
    cond.includes("cholera") ||
    cond.includes("choléra") ||
    cond.includes("fever") ||
    cond.includes("fièvre") ||
    cond.includes("cough") ||
    cond.includes("toux") ||
    cond.includes("influenza") ||
    cond.includes("grippe")
  ) {
    return "General Medicine";
  }
  if (
    cond.includes("pregnancy") ||
    cond.includes("grossesse") ||
    cond.includes("childbirth") ||
    cond.includes("accouchement") ||
    cond.includes("maternity") ||
    cond.includes("maternité") ||
    cond.includes("gyn") ||
    cond.includes("obstet")
  ) {
    return "Maternity";
  }
  if (
    cond.includes("child") ||
    cond.includes("enfant") ||
    cond.includes("pediatr") ||
    cond.includes("pédiatr")
  ) {
    return "Pediatrics";
  }
  if (cond.includes("heart") || cond.includes("coeur") || cond.includes("cardio")) {
    return "Cardiology";
  }
  if (
    cond.includes("surgery") ||
    cond.includes("chirurgie") ||
    cond.includes("appendi") ||
    cond.includes("hernia") ||
    cond.includes("hernie")
  ) {
    return "Surgery";
  }
  if (
    cond.includes("depress") ||
    cond.includes("anxiety") ||
    cond.includes("anxiété") ||
    cond.includes("mental") ||
    cond.includes("psychiatr") ||
    cond.includes("bipolar") ||
    cond.includes("stress")
  ) {
    return "Psychiatry";
  }
  if (
    cond.includes("fracture") ||
    cond.includes("accident") ||
    cond.includes("trauma") ||
    cond.includes("wound") ||
    cond.includes("blessure") ||
    cond.includes("burn") ||
    cond.includes("brûlure") ||
    cond.includes("cut")
  ) {
    return "Trauma";
  }
  if (cond.includes("emergency") || cond.includes("urgence")) {
    return "Emergency";
  }
  return "General Medicine";
}

function getSeverityLabel(severity: string): string {
  switch (severity?.toUpperCase()) {
    case "LOW":
      return "Mild";
    case "MEDIUM":
      return "Moderate";
    case "HIGH":
      return "Severe";
    case "CRITICAL":
      return "Critical";
    default:
      return severity || "Moderate";
  }
}

export default function HospitalsPage() {
  const language = useHealthStore((s) => s.language);
  const lastDiagnosis = useHealthStore((s) => s.lastDiagnosis);

  // States
  const [hospitals, setHospitals] = useState<HospitalWithDistance[]>([]);
  const [center, setCenter] = useState(DEFAULT_CENTER);
  const [country, setCountry] = useState<CountryCode>("all");
  const [services, setServices] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState<string>();
  const [showMap, setShowMap] = useState(true); // Default to map split-view
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [userLoc, setUserLoc] = useState<{ lat: number; lon: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<
    "pending" | "granted" | "denied" | "unavailable"
  >("pending");
  const [dismissDiagnosis, setDismissDiagnosis] = useState(false);
  const geoRequested = useRef(false);

  // Diagnostic recommendation derivation
  const diagnosisInfo = useMemo(() => {
    if (!lastDiagnosis || dismissDiagnosis) return null;
    const condition = lastDiagnosis.conditions[0]?.name ?? "Unknown Condition";
    const severity = getSeverityLabel(lastDiagnosis.severity);
    const recommended_service = getRecommendedService(condition);
    return { condition, severity, recommended_service };
  }, [lastDiagnosis, dismissDiagnosis]);

  // Load hospitals from API
  const load = useCallback(
    async (lat: number, lon: number) => {
      setLoading(true);
      try {
        const data = await searchHospitals({
          lat,
          lon,
          country,
          limit: 150, // Load enough for flexible client-side filter
        });
        setHospitals(data.hospitals ?? []);
        if (data.center) setCenter(data.center);
      } catch {
        setHospitals([]);
      } finally {
        setLoading(false);
      }
    },
    [country]
  );

  // Get user location
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
      () => {
        setLocationStatus("denied");
      },
      { enableHighAccuracy: true, timeout: 10000 }
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

  // Handle manual country change -> update center to country capital
  const handleCountryChange = (code: CountryCode) => {
    setCountry(code);
    const target = COUNTRIES.find((c) => c.code === code);
    if (target) {
      setCenter({ lat: target.lat, lon: target.lon });
    }
  };

  // Score and filter logic on client
  const processedHospitals = useMemo(() => {
    return hospitals
      .map((h) => {
        let serviceMatch = 0;
        let emergencyCapability = h.properties.emergency ? 1 : 0;
        let distanceWeight = Math.exp(-h.distanceKm / 15);

        // Check if hospital provides diagnosis recommended service
        if (diagnosisInfo) {
          const reqService = diagnosisInfo.recommended_service.toLowerCase();
          const matchesService =
            h.properties.services.some((s) => s.toLowerCase() === reqService) ||
            h.properties.specialties.some((s) => s.toLowerCase() === reqService);
          serviceMatch = matchesService ? 1 : 0;
        }

        // Calculate recommendation score: (serviceMatch * 50) + (emergencyCapability * 20) + (distanceWeight * 30)
        const score = serviceMatch * 50 + emergencyCapability * 20 + distanceWeight * 30;

        return {
          ...h,
          recommendationScore: score,
          serviceMatch: serviceMatch === 1,
        };
      })
      // Client-side Instant Keyword Search (name, city, services, specialties)
      .filter((h) => {
        if (!query) return true;
        const q = query.toLowerCase();
        return (
          h.properties.name.toLowerCase().includes(q) ||
          h.properties.city.toLowerCase().includes(q) ||
          h.properties.services.some((s) => s.toLowerCase().includes(q)) ||
          h.properties.specialties.some((s) => s.toLowerCase().includes(q))
        );
      })
      // Client-side Filter Chips
      .filter((h) => {
        if (services.length === 0) return true;
        return services.some((s) =>
          h.properties.services.some((hs) => hs.toLowerCase() === s.toLowerCase())
        );
      });
  }, [hospitals, diagnosisInfo, query, services]);

  // Split into Recommended and regular list
  const { recommendedList, standardList } = useMemo(() => {
    // If diagnosis recommendation is active
    if (diagnosisInfo) {
      const rec = processedHospitals.filter((h) => h.serviceMatch);
      const std = processedHospitals.filter((h) => !h.serviceMatch);

      // Recommended section sorted by Score desc
      const sortedRec = rec.sort((a, b) => b.recommendationScore - a.recommendationScore);
      // Standard list sorted by Distance asc
      const sortedStd = std.sort((a, b) => a.distanceKm - b.distanceKm);

      return { recommendedList: sortedRec, standardList: sortedStd };
    }

    // Otherwise, all sorted by distance
    const sortedAll = [...processedHospitals].sort((a, b) => a.distanceKm - b.distanceKm);
    return { recommendedList: [], standardList: sortedAll };
  }, [processedHospitals, diagnosisInfo]);

  // Find currently selected hospital
  const selectedHospital = useMemo(() => {
    return processedHospitals.find((h) => h.properties.id === selectedId);
  }, [processedHospitals, selectedId]);

  return (
    <div className="flex h-[calc(100vh-9.5rem)] md:h-[calc(100vh-4rem)] flex-col gap-4 overflow-hidden relative">
      
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between shrink-0 gap-2">
        <div>
          <h1 className="font-display text-2xl font-bold md:text-3xl text-[var(--text-primary)]">
            {t("hospitals.title", language)}
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Access nearest verified medical centers instantly
          </p>
        </div>

        {/* Top Controls */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={requestLocation}
            className="gap-1.5 text-xs font-semibold rounded-xl"
          >
            <Locate size={14} />
            Recenter GPS
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowMap(!showMap)}
            className="gap-1.5 text-xs font-semibold rounded-xl border border-[var(--border-default)]"
          >
            {showMap ? <List size={14} /> : <Map size={14} />}
            {showMap ? "Show List View" : "Show Map View"}
          </Button>
        </div>
      </div>

      {/* Geolocation Denial warning Banner */}
      {locationStatus === "denied" && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 shrink-0 shadow-sm">
          <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-xs font-bold text-amber-600">Location Access Blocked</h4>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Select a country below manually to view capitals, or enable browser permissions and click Recenter GPS.
            </p>
          </div>
          <button
            onClick={() => setLocationStatus("granted")}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* AI Diagnostic Integration Header Banner */}
      {diagnosisInfo && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl border border-[var(--accent-green)]/20 bg-[var(--accent-green-glow)] p-4 shrink-0 shadow-sm"
        >
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-[var(--accent-green)]/10 p-2 text-[var(--accent-green)] shrink-0">
              <Sparkles size={18} />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-[var(--accent-green)] uppercase tracking-wider">
                  AI Diagnostic Integration Active
                </h4>
                <button
                  onClick={() => setDismissDiagnosis(true)}
                  className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                  title="Clear recommendation filter"
                >
                  <X size={14} />
                </button>
              </div>
              <p className="text-sm font-semibold text-[var(--text-primary)] mt-1">
                Prioritizing facilities with <span className="underline decoration-[var(--accent-green)] decoration-2">{diagnosisInfo.recommended_service}</span> services
              </p>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Calculated for diagnosed symptoms: <span className="font-semibold text-[var(--text-secondary)]">{diagnosisInfo.condition}</span> ({diagnosisInfo.severity} Risk)
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Filter and Search Bar Section */}
      <div className="flex flex-col gap-3 shrink-0">
        {/* Instant Search input */}
        <div className="relative">
          <Search
            size={16}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("hospitals.search", language)}
            className="w-full bg-[var(--bg-secondary)]/50 border border-[var(--border-default)] rounded-2xl py-3 pl-11 pr-4 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none focus:border-[var(--accent-green)]/50 focus:ring-1 focus:ring-[var(--accent-green)]/20 transition-all shadow-sm"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Country Selector Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] mr-1">Country:</span>
          {COUNTRIES.map((c) => (
            <button
              key={c.code}
              onClick={() => handleCountryChange(c.code)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all duration-200 ${
                country === c.code
                  ? "bg-[var(--accent-green)] text-[var(--text-inverse)] shadow-sm"
                  : "bg-[var(--bg-secondary)]/50 border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Specialty Filter Chips */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] mr-1">Service:</span>
          {FILTER_SERVICES.map((s) => {
            const isSelected = services.includes(s);
            const isRecService = diagnosisInfo?.recommended_service.toLowerCase() === s.toLowerCase();
            return (
              <button
                key={s}
                onClick={() =>
                  setServices((prev) =>
                    prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
                  )
                }
                className={`group rounded-full px-3 py-1 text-xs font-medium capitalize transition-all duration-200 flex items-center gap-1 ${
                  isSelected
                    ? "bg-[var(--accent-blue)]/20 border border-[var(--accent-blue)]/30 text-[var(--accent-blue)]"
                    : isRecService
                    ? "bg-[var(--accent-green-glow)] border border-[var(--accent-green)]/30 text-[var(--accent-green)] hover:bg-[var(--accent-green)]/10"
                    : "bg-[var(--bg-secondary)]/40 border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]/80"
                }`}
              >
                {isRecService && <Sparkles size={10} className="animate-pulse" />}
                {s}
              </button>
            );
          })}
          {services.length > 0 && (
            <button
              onClick={() => setServices([])}
              className="text-xs text-[var(--accent-orange)] font-semibold hover:underline ml-2"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Main content grid */}
      <div className="flex-1 flex gap-4 min-h-0 relative overflow-hidden">
        
        {/* Left Side: Hospital list (flex column layout) */}
        <div
          className={`flex-1 flex flex-col min-h-0 transition-all duration-300 ${
            showMap ? "hidden md:flex md:max-w-md lg:max-w-lg" : "flex"
          }`}
        >
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-2 p-8 text-[var(--text-muted)] bg-[var(--bg-secondary)]/30 rounded-2xl border border-[var(--border-default)]">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--accent-green)] border-t-transparent" />
              <p className="text-sm font-semibold">{t("hospitals.loading", language)}</p>
            </div>
          ) : processedHospitals.length === 0 ? (
            /* Empty State */
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[var(--bg-secondary)]/30 rounded-2xl border border-[var(--border-default)] shadow-sm">
              <div className="rounded-full bg-[var(--bg-tertiary)] p-4 text-[var(--text-muted)] mb-4">
                <AlertTriangle size={32} />
              </div>
              <h3 className="font-semibold text-lg text-[var(--text-primary)]">
                No hospitals matching this service were found nearby.
              </h3>
              <p className="text-sm text-[var(--text-muted)] max-w-sm mt-1">
                Try expanding your search query, selecting "All Countries", or clearing active service filter chips.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setServices([]);
                    setQuery("");
                    setDismissDiagnosis(true);
                  }}
                  className="rounded-xl font-semibold"
                >
                  Remove filters
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    setServices([]);
                    setQuery("");
                    setDismissDiagnosis(true);
                    setCountry("all");
                  }}
                  className="rounded-xl font-semibold"
                >
                  Browse all hospitals
                </Button>
              </div>
            </div>
          ) : (
            /* Hospital scroll container */
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 pb-6">
              
              {/* RECOMMENDED FOR YOUR DIAGNOSIS SECTION */}
              {diagnosisInfo && recommendedList.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider font-bold text-[var(--accent-green)] px-1">
                    <Sparkles size={14} className="animate-pulse" />
                    Recommended For Your Diagnosis
                  </div>
                  <div className="grid gap-3">
                    {recommendedList.map((h) => (
                      <HospitalCard
                        key={h.properties.id}
                        hospital={h}
                        selected={selectedId === h.properties.id}
                        isRecommended={true}
                        recommendationScore={h.recommendationScore}
                        onSelect={() => setSelectedId(h.properties.id)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* ALL OTHER HOSPITALS SECTION */}
              <div className="space-y-3 pt-2">
                {diagnosisInfo && recommendedList.length > 0 && (
                  <div className="text-xs uppercase tracking-wider font-bold text-[var(--text-muted)] px-1">
                    Other Healthcare Facilities Nearby
                  </div>
                )}
                <div className="grid gap-3">
                  {standardList.map((h) => (
                    <HospitalCard
                      key={h.properties.id}
                      hospital={h}
                      selected={selectedId === h.properties.id}
                      isRecommended={false}
                      recommendationScore={h.recommendationScore}
                      onSelect={() => setSelectedId(h.properties.id)}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Map (shown in desktop, optional on mobile) */}
        {showMap && (
          <div className="flex-1 h-full min-h-[300px]">
            <HospitalMap
              hospitals={processedHospitals}
              center={center}
              selectedId={selectedId}
              onSelect={setSelectedId}
              userLocation={userLoc}
            />
          </div>
        )}
      </div>

      {/* Hospital Detail Drawer / Modal - Sliding framer-motion Overlay */}
      <AnimatePresence>
        {selectedHospital && (
          <>
            {/* Backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedId(undefined)}
              className="absolute inset-0 bg-black z-40 backdrop-blur-sm cursor-pointer"
            />

            {/* Slide-out Sheet Panel */}
            <motion.div
              initial={{ x: "100%", y: 0 }}
              animate={{ x: 0, y: 0 }}
              exit={{ x: "100%", y: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="absolute top-0 right-0 h-full w-full sm:w-[450px] bg-[var(--bg-secondary)] border-l border-[var(--border-default)] shadow-2xl z-50 p-6 flex flex-col justify-between"
            >
              {/* Header and Details */}
              <div className="overflow-y-auto space-y-6 flex-1 pr-1">
                {/* Close Button */}
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                    Facility Details
                  </span>
                  <button
                    onClick={() => setSelectedId(undefined)}
                    className="p-1.5 rounded-full hover:bg-[var(--bg-tertiary)] transition-colors text-[var(--text-secondary)]"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Score badge at top if matching diagnosis */}
                {selectedHospital.serviceMatch && (
                  <div className="rounded-xl border border-[var(--accent-green)]/30 bg-[var(--accent-green-glow)] p-3 text-xs text-[var(--accent-green)] font-semibold flex items-center gap-2">
                    <Sparkles size={14} className="shrink-0" />
                    Recommended fit: {Math.round(selectedHospital.recommendationScore)}% Match Score
                  </div>
                )}

                {/* Hospital Header Name */}
                <div>
                  <h2 className="text-xl font-bold text-[var(--text-primary)] leading-snug">
                    {selectedHospital.properties.name}
                  </h2>
                  <p className="text-xs text-[var(--accent-green)] font-bold mt-1 inline-flex items-center bg-[var(--accent-green-glow)] px-2.5 py-0.5 rounded-md">
                    {selectedHospital.distanceKm.toFixed(1)} km away
                  </p>
                </div>

                {/* Location Meta */}
                <div className="space-y-3 py-2 border-y border-[var(--border-default)]/50">
                  <div className="flex items-start gap-2.5 text-xs text-[var(--text-secondary)]">
                    <MapPin size={16} className="text-[var(--text-muted)] shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-[var(--text-primary)]">Location Address</p>
                      <p className="text-[var(--text-secondary)] mt-0.5">
                        {selectedHospital.properties.city ? `${selectedHospital.properties.city}, ` : ""}{selectedHospital.properties.country}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 text-xs text-[var(--text-secondary)]">
                    <Clock size={16} className="text-[var(--text-muted)] shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-[var(--text-primary)]">Availability</p>
                      <p className="text-[var(--text-secondary)] mt-0.5">
                        {selectedHospital.properties.opening_hours || "Open 24 Hours / 7 Days"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 text-xs text-[var(--text-secondary)]">
                    <ShieldCheck size={16} className="text-[var(--text-muted)] shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-[var(--text-primary)]">Facility Category</p>
                      <p className="text-[var(--text-secondary)] mt-0.5 capitalize font-medium">
                        {selectedHospital.properties.type || "Private"} Healthcare Center
                      </p>
                    </div>
                  </div>
                </div>

                {/* Emergency capability status */}
                <div>
                  <h4 className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                    Emergency Support
                  </h4>
                  <div className="flex items-center gap-2">
                    {selectedHospital.properties.emergency ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-600">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                        Emergency Care Available
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--bg-tertiary)] border border-[var(--border-default)] px-3 py-1 text-xs font-semibold text-[var(--text-muted)]">
                        <span className="h-1.5 w-1.5 rounded-full bg-[var(--text-muted)]"></span>
                        No Dedicated Emergency Station
                      </span>
                    )}
                  </div>
                </div>

                {/* Services list */}
                <div>
                  <h4 className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                    Available Medical Services
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedHospital.properties.services.map((s) => (
                      <span
                        key={s}
                        className="rounded-lg bg-[var(--bg-tertiary)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] capitalize"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Specialties list */}
                <div>
                  <h4 className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                    Specialties
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedHospital.properties.specialties.map((spec) => (
                      <span
                        key={spec}
                        className="rounded-lg bg-[var(--bg-tertiary)]/50 border border-[var(--border-default)] px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)]"
                      >
                        {spec}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Footer */}
              <div className="pt-4 border-t border-[var(--border-default)]/50 space-y-2 mt-4 shrink-0">
                <Button
                  className="w-full gap-2 py-3 font-semibold rounded-xl"
                  onClick={() => {
                    const [lon, lat] = selectedHospital.geometry.coordinates;
                    window.open(
                      `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`,
                      "_blank"
                    );
                  }}
                >
                  <Navigation size={16} /> Get Routing Directions
                </Button>
                {selectedHospital.properties.phone && (
                  <Button
                    variant="secondary"
                    className="w-full gap-2 py-3 font-semibold rounded-xl"
                    onClick={() => {
                      window.open(`tel:${selectedHospital.properties.phone}`);
                    }}
                  >
                    <Phone size={16} /> Call {selectedHospital.properties.phone}
                  </Button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
