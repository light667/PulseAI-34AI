"use client";

import { useEffect, useState } from "react";
import { Lightbulb } from "lucide-react";
import { todayKey } from "@/lib/utils";

export default function DailyTip() {
  const [tip, setTip] = useState("");

  useEffect(() => {
    const key = `pulse_tip_${todayKey()}`;
    const cached = localStorage.getItem(key);
    if (cached) {
      setTip(cached);
      return;
    }
    fetch("/api/tip")
      .then((r) => r.json())
      .then((d) => {
        setTip(d.tip);
        localStorage.setItem(key, d.tip);
      })
      .catch(() =>
        setTip(
          "Buvez au moins 2 litres d'eau par jour pour réduire les maux de tête."
        )
      );
  }, []);

  return (
    <div className="pulse-card border-l-4 border-l-[var(--accent-green)] p-4">
      <div className="mb-2 flex items-center gap-2">
        <Lightbulb size={18} className="text-[var(--accent-green)]" />
        <span className="font-semibold">Today&apos;s Tip</span>
      </div>
      <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
        {tip || "Loading tip..."}
      </p>
    </div>
  );
}
