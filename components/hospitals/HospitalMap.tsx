"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import type { HospitalWithDistance } from "@/types/hospital";

interface HospitalMapProps {
  hospitals: HospitalWithDistance[];
  center: { lat: number; lon: number };
  selectedId?: string;
  onSelect?: (id: string) => void;
  userLocation?: { lat: number; lon: number } | null;
}

export default function HospitalMap({
  hospitals,
  center,
  selectedId,
  onSelect,
  userLocation,
}: HospitalMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: "raster",
            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
          },
        },
        layers: [{ id: "osm", type: "raster", source: "osm" }],
      },
      center: [center.lon, center.lat],
      zoom: 12,
    });

    map.addControl(new maplibregl.NavigationControl(), "top-right");
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [center.lat, center.lon]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    hospitals.forEach((h) => {
      const [lon, lat] = h.geometry.coordinates;
      const el = document.createElement("div");
      el.className = `h-4 w-4 cursor-pointer rounded-full border-2 border-white shadow-lg ${
        h.properties.id === selectedId
          ? "bg-[#00FF87] scale-125"
          : "bg-[#00CC6A]"
      }`;
      el.onclick = () => onSelect?.(h.properties.id);

      const marker = new maplibregl.Marker(el)
        .setLngLat([lon, lat])
        .setPopup(
          new maplibregl.Popup({ offset: 25 }).setHTML(
            `<strong>${h.properties.name}</strong><br/>${h.distanceKm.toFixed(1)} km`
          )
        )
        .addTo(map);
      markersRef.current.push(marker);
    });

    if (userLocation) {
      const userEl = document.createElement("div");
      userEl.className = "h-3 w-3 rounded-full bg-[#4FC3F7] border-2 border-white";
      markersRef.current.push(
        new maplibregl.Marker(userEl)
          .setLngLat([userLocation.lon, userLocation.lat])
          .addTo(map)
      );
    }
  }, [hospitals, selectedId, userLocation, onSelect]);

  return (
    <div
      ref={mapContainer}
      className="h-full min-h-[300px] w-full rounded-2xl overflow-hidden"
    />
  );
}
