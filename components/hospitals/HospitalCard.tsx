"use client";

import type { HospitalWithDistance } from "@/types/hospital";
import { MapPin, Phone, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HospitalCardProps {
  hospital: HospitalWithDistance;
  selected?: boolean;
  onSelect?: () => void;
}

export default function HospitalCard({
  hospital,
  selected,
  onSelect,
}: HospitalCardProps) {
  const { properties, distanceKm, bedsEstimate = 50 } = hospital;
  const bedsPct = bedsEstimate;

  return (
    <div
      onClick={onSelect}
      className={`pulse-card cursor-pointer p-4 transition-all ${
        selected ? "border-[var(--accent-green)] ring-1 ring-[var(--accent-green)]" : ""
      }`}
    >
      <div className="flex items-start justify-between">
        <h3 className="font-semibold">{properties.name}</h3>
        <span className="text-xs text-[var(--accent-green)]">
          {distanceKm.toFixed(1)} km
        </span>
      </div>
      <p className="mt-1 flex items-center gap-1 text-sm text-[var(--text-secondary)]">
        <MapPin size={14} />
        {properties.city}, {properties.country}
      </p>
      <div className="mt-2 flex flex-wrap gap-1">
        {properties.services.slice(0, 4).map((s) => (
          <span
            key={s}
            className="rounded-full bg-[var(--bg-tertiary)] px-2 py-0.5 text-xs capitalize"
          >
            {s}
          </span>
        ))}
      </div>
      <div className="mt-3">
        <div className="mb-1 flex justify-between text-xs text-[var(--text-muted)]">
          <span>Beds (est.)</span>
          <span>{bedsPct}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-[var(--bg-tertiary)]">
          <div
            className="h-full rounded-full bg-[var(--accent-green)]"
            style={{ width: `${bedsPct}%` }}
          />
        </div>
      </div>
      <p className="mt-2 text-xs text-[var(--accent-green)]">
        🟢 {properties.opening_hours || "Open"}
      </p>
      <div className="mt-3 flex gap-2">
        <Button
          size="sm"
          variant="secondary"
          className="flex-1 gap-1 text-xs"
          onClick={(e) => {
            e.stopPropagation();
            const [lon, lat] = hospital.geometry.coordinates;
            window.open(
              `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`,
              "_blank"
            );
          }}
        >
          <Navigation size={14} /> Directions
        </Button>
        {properties.phone && (
          <Button
            size="sm"
            variant="ghost"
            className="gap-1 text-xs"
            onClick={(e) => {
              e.stopPropagation();
              window.open(`tel:${properties.phone}`);
            }}
          >
            <Phone size={14} />
          </Button>
        )}
      </div>
    </div>
  );
}
