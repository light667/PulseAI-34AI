"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Search, Hospital, Leaf, Pill } from "lucide-react";

const actions = [
  { href: "/diagnostic", icon: Search, label: "Diagnostic" },
  { href: "/hospitals", icon: Hospital, label: "Hôpitaux" },
  { href: "/lyra", icon: Leaf, label: "Lyra" },
  { href: "/scan", icon: Pill, label: "Scanner" },
];

export default function QuickActions() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {actions.map(({ href, icon: Icon, label }, i) => (
        <Link key={href} href={href}>
          <motion.div
            whileTap={{ scale: 0.95 }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="pulse-card flex min-h-[100px] flex-col items-center justify-center gap-2 p-4"
          >
            <Icon size={32} className="text-[var(--accent-green)]" />
            <span className="text-sm font-medium">{label}</span>
          </motion.div>
        </Link>
      ))}
    </div>
  );
}
