"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, Search, Hospital, Leaf, User, LogOut, Sun, Moon, Globe } from "lucide-react";
import { useHealthStore } from "@/lib/store/useHealthStore";
import { useAuth } from "@/components/AuthProvider";
import { auth } from "@/lib/firebase/config";
import { t } from "@/lib/i18n";
import Image from "next/image";
import { cn } from "@/lib/utils";

const links = [
  { href: "/home", icon: Home, key: "nav.home" as const },
  { href: "/diagnostic", icon: Search, key: "nav.diagnostic" as const },
  { href: "/hospitals", icon: Hospital, key: "nav.hospitals" as const },
  { href: "/lyra", icon: Leaf, key: "nav.lyra" as const },
  { href: "/profile", icon: User, key: "nav.profile" as const },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const theme = useHealthStore((s) => s.theme);
  const setTheme = useHealthStore((s) => s.setTheme);
  const language = useHealthStore((s) => s.language);
  const setLanguage = useHealthStore((s) => s.setLanguage);
  const profile = useHealthStore((s) => s.profile);

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const toggleLanguage = () => {
    setLanguage(language === "en" ? "fr" : "en");
  };

  const handleSignOut = async () => {
    await auth.signOut();
    router.replace("/auth/login");
  };

  return (
    <aside className="fixed left-0 top-0 bottom-0 z-30 hidden w-64 flex-col border-r border-[var(--border-default)] bg-[var(--bg-secondary)] py-6 px-4 md:flex">
      {/* Brand Logo & Name */}
      <div className="flex items-center gap-3 px-2 mb-8">
        <Image
          src="/logo.png"
          alt="Pulse AI"
          width={40}
          height={40}
          className="rounded-full object-cover"
        />
        <span className="font-display text-xl font-bold tracking-wider text-[var(--accent-green)]">
          PULSE AI
        </span>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 space-y-1.5">
        {links.map(({ href, icon: Icon, key }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                active
                  ? "bg-[var(--accent-green-subtle)] text-[var(--accent-green)] border border-[var(--border-active)]"
                  : "text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
              )}
            >
              <Icon size={18} />
              <span>{t(key, language)}</span>
            </Link>
          );
        })}
      </nav>

      {/* System Settings & Toggles */}
      <div className="border-t border-[var(--border-default)] pt-4 mt-auto space-y-3">
        {/* Theme and Language buttons */}
        <div className="flex items-center justify-between gap-2 px-2">
          <button
            onClick={toggleTheme}
            className="flex items-center justify-center p-2 rounded-xl bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors flex-1 gap-1 text-xs"
            title="Toggle Theme"
          >
            {theme === "dark" ? (
              <>
                <Sun size={15} />
                <span>Light</span>
              </>
            ) : (
              <>
                <Moon size={15} />
                <span>Dark</span>
              </>
            )}
          </button>

          <button
            onClick={toggleLanguage}
            className="flex items-center justify-center p-2 rounded-xl bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors flex-1 gap-1 text-xs"
            title="Toggle Language"
          >
            <Globe size={15} />
            <span>{language === "en" ? "Français" : "English"}</span>
          </button>
        </div>

        {/* User profile card or sign out */}
        {user && (
          <div className="flex items-center justify-between p-2 rounded-xl bg-[var(--bg-tertiary)]/50">
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent-green-subtle)] text-[var(--accent-green)] font-bold text-xs uppercase flex-shrink-0">
                {profile?.full_name ? profile.full_name[0] : user.email ? user.email[0] : "P"}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold truncate text-[var(--text-primary)]">
                  {profile?.full_name || "User"}
                </span>
                <span className="text-[10px] text-[var(--text-muted)] truncate">
                  {user.email}
                </span>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="text-[var(--text-secondary)] hover:text-[var(--severity-critical)] p-1 rounded transition-colors"
              title="Sign Out"
            >
              <LogOut size={16} />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
