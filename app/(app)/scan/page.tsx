"use client";

import { motion } from "framer-motion";
import MedScanUpload from "@/components/scan/MedScanUpload";
import { ScanLine } from "lucide-react";

export default function ScanPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto"
    >
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-orange-glow)] border border-[rgba(255,107,53,0.2)]">
            <ScanLine size={20} className="text-[var(--accent-orange)]" />
          </div>
          <h1 className="font-display text-2xl font-bold md:text-3xl">
            Medication Scanner
          </h1>
        </div>
        <p className="text-sm text-[var(--text-secondary)]">
          Take a photo of any medicine to verify it and understand what it treats.
        </p>
      </div>
      <MedScanUpload />
    </motion.div>
  );
}
