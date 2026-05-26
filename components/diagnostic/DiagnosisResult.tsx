"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { DiagnosisResult as Result } from "@/types/diagnosis";
import SeverityBadge from "./SeverityBadge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Hospital, MessageCircle, RotateCcw } from "lucide-react";

interface DiagnosisResultProps {
  result: Result;
}

export default function DiagnosisResultView({ result }: DiagnosisResultProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-6 space-y-4"
    >
      <SeverityBadge
        severity={result.severity}
        score={result.severityScore}
        message={result.severityMessage}
      />

      <h3 className="font-display text-lg font-semibold">Possible Conditions</h3>
      {result.conditions.map((c, i) => (
        <motion.div
          key={c.name}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className="pulse-card p-4"
        >
          <div className="mb-2 flex justify-between">
            <span className="font-semibold">
              {i + 1}. {c.name}
            </span>
            <span className="text-[var(--accent-green)]">{c.probability}%</span>
          </div>
          <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-[var(--bg-tertiary)]">
            <motion.div
              className="h-full rounded-full bg-[var(--accent-green)]"
              initial={{ width: 0 }}
              animate={{ width: `${c.probability}%` }}
            />
          </div>
          <p className="text-sm text-[var(--text-secondary)]">{c.description}</p>
          <p className="mt-2 text-sm text-[var(--accent-orange)]">
            {c.recommendation}
          </p>
        </motion.div>
      ))}

      <div className="pulse-card p-4">
        <h4 className="mb-2 font-semibold">First Aid</h4>
        <ul className="space-y-1 text-sm text-[var(--text-secondary)]">
          {result.firstAid.map((item) => (
            <li key={item}>✓ {item}</li>
          ))}
          {result.doNots.map((item) => (
            <li key={item} className="text-[var(--accent-orange)]">
              ✗ {item}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex items-start gap-2 rounded-xl border border-[var(--border-default)] p-3 text-xs text-[var(--text-secondary)]">
        <AlertTriangle size={16} className="shrink-0 text-[var(--accent-orange)]" />
        {result.disclaimer}
      </div>

      <div className="flex flex-col gap-2">
        <Link href="/hospitals">
          <Button className="w-full gap-2">
            <Hospital size={18} /> Find Nearest Hospital
          </Button>
        </Link>
        <Link href="/lyra">
          <Button variant="secondary" className="w-full gap-2">
            <MessageCircle size={18} /> Ask Lyra for Support
          </Button>
        </Link>
        <Button variant="ghost" className="gap-2" onClick={() => window.location.reload()}>
          <RotateCcw size={16} /> New Diagnosis
        </Button>
      </div>
    </motion.div>
  );
}
