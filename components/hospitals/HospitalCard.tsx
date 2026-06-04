"use client";

import type { HospitalWithDistance } from "@/types/hospital";
import { MapPin, Phone, Navigation, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

interface HospitalCardProps {
  hospital: HospitalWithDistance;
  selected?: boolean;
  onSelect?: () => void;
  isRecommended?: boolean;
  recommendationScore?: number;
}

export default function HospitalCard({
  hospital,
  selected,
  onSelect,
  isRecommended,
  recommendationScore,
}: HospitalCardProps) {
  const { properties, distanceKm, bedsEstimate = 50 } = hospital;
  const bedsPct = bedsEstimate;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      onClick={onSelect}
      className={`relative overflow-hidden rounded-2xl border p-5 transition-all duration-300 cursor-pointer backdrop-blur-md ${
        selected
          ? "border-[var(--accent-green)] bg-[var(--bg-secondary)]/80 shadow-md ring-1 ring-[var(--accent-green)]/30"
          : "border-[var(--border-default)] bg-[var(--bg-secondary)]/50 hover:bg-[var(--bg-secondary)]/80 hover:shadow-sm"
      }`}
    >
      {/* Top Background Glow for Recommended Card */}
      {isRecommended && (
        <div className="absolute top-0 right-0 h-24 w-24 bg-[var(--accent-green)]/5 rounded-full blur-2xl pointer-events-none" />
      )}

      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1">
          {isRecommended && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--accent-green-glow)] px-2.5 py-0.5 text-[10px] font-bold text-[var(--accent-green)] border border-[var(--accent-green)]/20 uppercase tracking-wider mb-1">
              <Sparkles size={10} />
              ✓ Recommended for your symptoms
            </span>
          )}
          <h3 className="font-semibold text-[var(--text-primary)] leading-snug text-base">
            {properties.name}
          </h3>
        </div>
        <span className="shrink-0 text-sm font-bold text-[var(--accent-green)] bg-[var(--accent-green-glow)] px-2.5 py-1 rounded-lg">
          {distanceKm.toFixed(1)} km
        </span>
      </div>

      <p className="mt-2 flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
        <MapPin size={12} className="text-[var(--text-muted)]" />
        {properties.city ? `${properties.city}, ` : ""}{properties.country}
      </p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {properties.services.slice(0, 4).map((s) => (
          <span
            key={s}
            className="rounded-full bg-[var(--bg-tertiary)]/70 hover:bg-[var(--bg-tertiary)] px-2.5 py-0.5 text-[10px] font-medium text-[var(--text-secondary)] capitalize transition-colors"
          >
            {s}
          </span>
        ))}
      </div>

      {/* Beds Estimate Indicator */}
      <div className="mt-4">
        <div className="mb-1 flex justify-between text-[10px] font-medium text-[var(--text-muted)]">
          <span>Bed Capacity (est.)</span>
          <span className="font-bold text-[var(--text-secondary)]">{bedsPct}% Available</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-[var(--bg-tertiary)]/50">
          <motion.div
            className="h-full rounded-full bg-[var(--accent-green)]"
            initial={{ width: 0 }}
            animate={{ width: `${bedsPct}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-4 pt-1">
        <span className="inline-flex items-center text-xs text-[var(--accent-green)] font-medium">
          <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-[var(--accent-green)] animate-pulse"></span>
          {properties.opening_hours || "Open 24/7"}
        </span>

        {recommendationScore !== undefined && recommendationScore > 0 && (
          <span className="text-[10px] text-[var(--text-muted)]">
            Match Score: <span className="font-bold text-[var(--text-secondary)]">{Math.round(recommendationScore)}%</span>
          </span>
        )}
      </div>

      <div className="mt-4 flex gap-2">
        <Button
          size="sm"
          variant="secondary"
          className="flex-1 gap-1.5 text-xs font-semibold h-9 rounded-xl transition-all"
          onClick={(e) => {
            e.stopPropagation();
            const [lon, lat] = hospital.geometry.coordinates;
            window.open(
              `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`,
              "_blank"
            );
          }}
        >
          <Navigation size={13} /> Directions
        </Button>
        {properties.phone && (
          <Button
            size="sm"
            variant="ghost"
            className="gap-1.5 text-xs h-9 w-9 p-0 rounded-xl hover:bg-[var(--bg-tertiary)]"
            onClick={(e) => {
              e.stopPropagation();
              window.open(`tel:${properties.phone}`);
            }}
          >
            <Phone size={14} className="text-[var(--text-secondary)]" />
          </Button>
        )}
      </div>
    </motion.div>
  );
}
