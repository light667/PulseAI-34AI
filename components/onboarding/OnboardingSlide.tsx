"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

interface OnboardingSlideProps {
  title: string;
  body: string;
  illustration: ReactNode;
  accentClass?: string;
}

export default function OnboardingSlide({
  title,
  body,
  illustration,
  accentClass = "text-[var(--accent-green)]",
}: OnboardingSlideProps) {
  return (
    <motion.div
      className="flex h-full flex-col items-center justify-center px-8 text-center"
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
    >
      <div className="mb-8">{illustration}</div>
      <h2
        className={`mb-4 text-2xl font-bold ${accentClass}`}
        style={{ fontFamily: "var(--font-syne)" }}
      >
        {title}
      </h2>
      <p className="max-w-sm text-base leading-relaxed text-[var(--text-secondary)]">
        {body}
      </p>
    </motion.div>
  );
}
