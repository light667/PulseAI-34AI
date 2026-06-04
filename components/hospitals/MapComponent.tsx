"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { HospitalWithDistance } from "@/types/hospital";

// Custom controller to update map viewport when center changes
function MapController({ center }: { center: { lat: number; lon: number } }) {
  const map = useMap();
  useEffect(() => {
    if (center.lat && center.lon) {
      map.setView([center.lat, center.lon], map.getZoom() || 12, {
        animate: true,
        duration: 0.8,
      });
    }
  }, [center, map]);
  return null;
}

// Create custom hospital markers using L.divIcon to avoid default asset issues
const createHospitalIcon = (isSelected: boolean) => {
  return L.divIcon({
    html: `<div class="h-4.5 w-4.5 rounded-full border-2 border-white shadow-md transition-all duration-300 flex items-center justify-center ${
      isSelected
        ? "bg-[var(--accent-green)] scale-125 ring-4 ring-[var(--accent-green)]/20"
        : "bg-[var(--accent-blue)] hover:bg-[var(--accent-green)]"
    }">
      <div class="h-1.5 w-1.5 rounded-full bg-white"></div>
    </div>`,
    className: "custom-hospital-marker",
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
};

// Pulsing user location icon
const createUserIcon = () => {
  return L.divIcon({
    html: `<div class="relative flex h-6 w-6 items-center justify-center">
      <div class="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-60"></div>
      <div class="relative h-3.5 w-3.5 rounded-full border-2 border-white bg-sky-500 shadow-md"></div>
    </div>`,
    className: "custom-user-marker",
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

interface MapComponentProps {
  hospitals: HospitalWithDistance[];
  center: { lat: number; lon: number };
  selectedId?: string;
  onSelect?: (id: string) => void;
  userLocation?: { lat: number; lon: number } | null;
}

export default function MapComponent({
  hospitals,
  center,
  selectedId,
  onSelect,
  userLocation,
}: MapComponentProps) {
  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl border border-[var(--border-default)] shadow-sm bg-[var(--bg-secondary)]">
      <MapContainer
        center={[center.lat, center.lon]}
        zoom={12}
        className="h-full w-full z-10"
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapController center={center} />

        {/* User Location Marker */}
        {userLocation && (
          <Marker
            position={[userLocation.lat, userLocation.lon]}
            icon={createUserIcon()}
          >
            <Popup>
              <div className="p-1 font-sans text-xs">
                <p className="font-semibold text-sky-600">Your Location</p>
                <p className="text-[var(--text-secondary)]">
                  Lat: {userLocation.lat.toFixed(4)}, Lon: {userLocation.lon.toFixed(4)}
                </p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Hospital Markers */}
        {hospitals.map((h) => {
          const [lon, lat] = h.geometry.coordinates;
          const isSelected = h.properties.id === selectedId;

          return (
            <Marker
              key={h.properties.id}
              position={[lat, lon]}
              icon={createHospitalIcon(isSelected)}
              eventHandlers={{
                click: () => {
                  onSelect?.(h.properties.id);
                },
              }}
            >
              <Popup>
                <div className="p-1 min-w-[180px] font-sans text-xs">
                  <h4 className="font-bold text-sm text-[var(--text-primary)] mb-1 leading-tight">
                    {h.properties.name}
                  </h4>
                  <p className="text-[var(--accent-green)] font-semibold mb-2">
                    {h.distanceKm.toFixed(1)} km away
                  </p>
                  <div className="flex flex-wrap gap-1 mb-3">
                    {h.properties.services.slice(0, 3).map((s) => (
                      <span
                        key={s}
                        className="px-1.5 py-0.5 rounded-full bg-[var(--bg-tertiary)] text-[var(--text-secondary)] text-[10px] font-medium capitalize"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect?.(h.properties.id);
                    }}
                    className="w-full bg-[var(--accent-green)] hover:bg-[var(--accent-green-hover)] text-white text-[11px] py-1.5 px-3 rounded-lg font-semibold shadow-sm transition-all duration-200"
                  >
                    View Details
                  </button>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
