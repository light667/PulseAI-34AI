"use client";

import type { MedScanResult } from "@/lib/services/scanService";
import { AlertTriangle, CheckCircle, HelpCircle } from "lucide-react";

const authStyles = {
  LIKELY_AUTHENTIC: {
    icon: CheckCircle,
    color: "text-[var(--accent-green)]",
    label: "LIKELY AUTHENTIC",
  },
  UNCERTAIN: {
    icon: HelpCircle,
    color: "text-[var(--severity-medium)]",
    label: "UNCERTAIN",
  },
  SUSPICIOUS: {
    icon: AlertTriangle,
    color: "text-[var(--accent-orange)]",
    label: "SUSPICIOUS",
  },
};

export default function MedScanResultView({ result }: { result: MedScanResult }) {
  const auth = authStyles[result.authenticityAssessment];
  const AuthIcon = auth.icon;

  return (
    <div className="pulse-card space-y-4 p-4">
      <div>
        <h3 className="text-xl font-bold">💊 {result.name}</h3>
        {result.manufacturer && (
          <p className="text-sm text-[var(--text-secondary)]">
            {result.manufacturer}
          </p>
        )}
      </div>

      <div className={`flex items-center gap-2 ${auth.color}`}>
        <AuthIcon size={20} />
        <span className="font-semibold">{auth.label}</span>
      </div>
      <p className="text-sm text-[var(--text-secondary)]">
        {result.authenticityNote}
      </p>

      <div>
        <h4 className="mb-1 font-semibold text-[var(--accent-blue)]">
          What it treats
        </h4>
        <ul className="text-sm text-[var(--text-secondary)]">
          {result.treats.map((t) => (
            <li key={t}>• {t}</li>
          ))}
        </ul>
      </div>

      <div>
        <h4 className="mb-1 font-semibold">Dosage</h4>
        <p className="text-sm">Adults: {result.dosageAdults}</p>
        <p className="text-sm">Children: {result.dosageChildren}</p>
      </div>

      {result.interactions.length > 0 && (
        <div>
          <h4 className="mb-1 font-semibold text-[var(--accent-orange)]">
            Interactions
          </h4>
          <ul className="text-sm text-[var(--text-secondary)]">
            {result.interactions.map((i) => (
              <li key={i}>⚠ {i}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-xl border border-[var(--border-default)] p-3 text-xs text-[var(--text-secondary)]">
        {result.disclaimer}
      </div>
    </div>
  );
}
