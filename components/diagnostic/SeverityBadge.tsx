"use client";

import { motion } from "framer-motion";
import type { SeverityLevel } from "@/types/diagnosis";
import { cn } from "@/lib/utils";

const styles: Record<SeverityLevel, string> = {
  LOW: "bg-[var(--severity-low)]/20 text-[var(--severity-low)] border-[var(--severity-low)]/40",
  MEDIUM:
    "bg-[var(--severity-medium)]/20 text-[var(--severity-medium)] border-[var(--severity-medium)]/40",
  HIGH: "bg-[var(--severity-high)]/20 text-[var(--severity-high)] border-[var(--severity-high)]/40",
  CRITICAL:
    "bg-[var(--severity-critical)]/20 text-[var(--severity-critical)] border-[var(--severity-critical)]/40",
};

interface SeverityBadgeProps {
  severity: SeverityLevel;
  score: number;
  message: string;
}

export default function SeverityBadge({
  severity,
  score,
  message,
}: SeverityBadgeProps) {
  return (
    <motion.div
      initial={{ scale: 0.8 }}
      animate={{ scale: [0.8, 1.05, 1] }}
      className={cn(
        "rounded-2xl border p-4",
        styles[severity]
      )}
    >
      <div className="flex items-center justify-between">
        <span className="font-display text-lg font-bold">{severity} RISK</span>
        <span className="text-2xl font-bold">{score}/10</span>
      </div>
      <p className="mt-2 text-sm opacity-90">{message}</p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/20">
        <motion.div
          className="h-full rounded-full bg-current"
          initial={{ width: 0 }}
          animate={{ width: `${score * 10}%` }}
          transition={{ duration: 0.8 }}
        />
      </div>
    </motion.div>
  );
}
