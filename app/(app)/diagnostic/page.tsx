"use client";

import { motion } from "framer-motion";
import SymptomInput from "@/components/diagnostic/SymptomInput";
import { useHealthStore } from "@/lib/store/useHealthStore";
import { t } from "@/lib/i18n";

export default function DiagnosticPage() {
  const locale = useHealthStore((s) => s.language);
  const setLastDiagnosis = useHealthStore((s) => s.setLastDiagnosis);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto"
    >
      <h1
        className="mb-1 font-display text-2xl font-bold md:text-3xl"
        style={{ fontFamily: "var(--font-syne)" }}
      >
        {t("diagnostic.title", locale)}
      </h1>
      <p className="mb-6 text-sm text-[var(--text-secondary)]">
        Describe how you&apos;re feeling. I&apos;ll help identify what might be
        happening.
      </p>
      <SymptomInput onResult={setLastDiagnosis} />
    </motion.div>
  );
}
