"use client";

import { motion } from "framer-motion";
import Image from "next/image";

export default function SplashScreen() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[var(--bg-primary)]">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col items-center"
      >
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, delay: 0.4 }}
          className="relative"
        >
          <Image
            src="/logo.png"
            alt="Pulse AI"
            width={120}
            height={120}
            className="rounded-full"
            priority
          />
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-[var(--accent-green)]"
            initial={{ scale: 1, opacity: 0.6 }}
            animate={{ scale: 2.5, opacity: 0 }}
            transition={{ duration: 1.2, delay: 1.8, repeat: Infinity }}
          />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="mt-6 font-display text-2xl font-bold tracking-widest"
          style={{ fontFamily: "var(--font-syne)" }}
        >
          PULSE AI
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.3 }}
          className="mt-2 text-[var(--text-secondary)]"
        >
          Your Health. Intelligent.
        </motion.p>
      </motion.div>

      <motion.div
        className="absolute bottom-0 left-0 h-1 bg-[var(--accent-green)]"
        initial={{ width: "0%" }}
        animate={{ width: "100%" }}
        transition={{ duration: 2.5, ease: "linear" }}
      />
    </div>
  );
}
