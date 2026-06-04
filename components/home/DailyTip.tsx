"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight, Lightbulb } from "lucide-react";
import { DAILY_TIPS } from "@/lib/tips";
import { t } from "@/lib/i18n";
import { useHealthStore } from "@/lib/store/useHealthStore";

export default function DailyTip() {
  const language = useHealthStore((s) => s.language);
  const scrollRef = useRef<HTMLDivElement>(null);
  const tips = DAILY_TIPS[language];

  const scroll = (direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.85;
    el.scrollBy({ left: direction === "left" ? -amount : amount, behavior: "smooth" });
  };

  return (
    <div className="pulse-card border-l-4 border-l-[var(--accent-green)] p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Lightbulb size={18} className="text-[var(--accent-green)]" />
          <span className="font-semibold">{t("home.tip", language)}</span>
        </div>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => scroll("left")}
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--accent-green)] transition-colors"
            aria-label="Previous tip"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={() => scroll("right")}
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--accent-green)] transition-colors"
            aria-label="Next tip"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-1"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {tips.map((tip, i) => (
          <div
            key={i}
            className="min-w-[85%] flex-shrink-0 snap-start rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-default)] px-4 py-3"
          >
            <p className="text-sm leading-relaxed text-[var(--text-secondary)]">{tip}</p>
          </div>
        ))}
      </div>

      <div className="mt-2 flex justify-center gap-1">
        {tips.map((_, i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-[var(--bg-tertiary)]"
          />
        ))}
      </div>
    </div>
  );
}
