"use client";

import dynamic from "next/dynamic";
import type { HospitalWithDistance } from "@/types/hospital";

const MapComponent = dynamic(
  () => import("./MapComponent"),
  {
    ssr: false,
    loading: () => (
      <div className="h-full min-h-[300px] w-full animate-pulse rounded-2xl bg-[var(--bg-secondary)] flex items-center justify-center border border-[var(--border-default)]">
        <span className="text-sm text-[var(--text-muted)] animate-bounce">Loading interactive map...</span>
      </div>
    ),
  }
);

interface HospitalMapProps {
  hospitals: HospitalWithDistance[];
  center: { lat: number; lon: number };
  selectedId?: string;
  onSelect?: (id: string) => void;
  userLocation?: { lat: number; lon: number } | null;
}

export default function HospitalMap(props: HospitalMapProps) {
  return <MapComponent {...props} />;
}
