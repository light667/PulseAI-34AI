"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, Hospital, Leaf, User } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useHealthStore } from "@/lib/store/useHealthStore";
import { t } from "@/lib/i18n";

const tabs = [
  { href: "/home", icon: Home, key: "nav.home" as const },
  { href: "/diagnostic", icon: Search, key: "nav.diagnostic" as const },
  { href: "/hospitals", icon: Hospital, key: "nav.hospitals" as const },
  { href: "/lyra", icon: Leaf, key: "nav.lyra" as const },
  { href: "/profile", icon: User, key: "nav.profile" as const },
];

export default function BottomNavBar() {
  const pathname = usePathname();
  const language = useHealthStore((s) => s.language);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--border-default)] bg-[var(--bg-secondary)] pb-safe backdrop-blur-md">
      <div className="flex items-center justify-around px-2 py-2 max-w-screen-sm mx-auto">
        {tabs.map(({ href, icon: Icon, key }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className="relative flex min-h-[52px] min-w-[52px] flex-col items-center justify-center gap-0.5 px-2 rounded-xl transition-colors"
            >
              <div
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-xl transition-all",
                  active
                    ? "bg-[var(--accent-green-subtle)]"
                    : "hover:bg-[var(--bg-tertiary)]"
                )}
              >
                <Icon
                  size={20}
                  className={cn(
                    "transition-colors",
                    active
                      ? "text-[var(--accent-green)]"
                      : "text-[var(--text-muted)]"
                  )}
                />
              </div>
              <span
                className={cn(
                  "text-[10px] font-medium transition-colors",
                  active
                    ? "text-[var(--accent-green)]"
                    : "text-[var(--text-muted)]"
                )}
              >
                {t(key, language)}
              </span>
              {active && (
                <motion.div
                  layoutId="nav-active-dot"
                  className="absolute -bottom-0 left-1/2 -translate-x-1/2 h-0.5 w-5 rounded-full bg-[var(--accent-green)]"
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
