"use client";

import { cn } from "@/lib/utils";

interface OnboardingDotsProps {
  total: number;
  current: number;
}

export default function OnboardingDots({ total, current }: OnboardingDotsProps) {
  return (
    <div className="flex justify-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "h-2 rounded-full transition-all",
            i === current
              ? "w-6 bg-[var(--accent-green)]"
              : "w-2 bg-[var(--text-muted)]"
          )}
        />
      ))}
    </div>
  );
}
