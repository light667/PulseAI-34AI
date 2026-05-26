"use client";

import Sidebar from "@/components/layout/Sidebar";
import BottomNavBar from "@/components/layout/BottomNavBar";
import OfflineBanner from "@/components/shared/OfflineBanner";
import { useHealthStore } from "@/lib/store/useHealthStore";
import { Sun, Moon, Globe } from "lucide-react";
import Image from "next/image";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const theme = useHealthStore((s) => s.theme);
  const setTheme = useHealthStore((s) => s.setTheme);
  const language = useHealthStore((s) => s.language);
  const setLanguage = useHealthStore((s) => s.setLanguage);

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const toggleLanguage = () => {
    setLanguage(language === "en" ? "fr" : "en");
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] transition-colors duration-200">
      {/* Sidebar on desktop */}
      <Sidebar />

      {/* Main content wrapper */}
      <div className="flex flex-col min-h-screen md:pl-64">
        {/* Mobile Header */}
        <header className="flex md:hidden h-14 items-center justify-between px-4 border-b border-[var(--border-default)] bg-[var(--bg-secondary)] sticky top-0 z-20">
          <div className="flex items-center gap-2">
            <Image
              src="/logo.png"
              alt="Pulse AI"
              width={32}
              height={32}
              className="rounded-full object-cover"
            />
            <span className="font-display font-bold text-sm tracking-wider text-[var(--accent-green)]">
              PULSE AI
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleLanguage}
              className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors"
              title="Toggle Language"
            >
              <Globe size={18} />
            </button>
            <button
              onClick={toggleTheme}
              className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors"
              title="Toggle Theme"
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </header>

        <OfflineBanner />

        {/* Content body */}
        <main className="flex-1 pb-24 md:pb-8 p-4 md:p-8 max-w-6xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Bottom Nav Bar on mobile only */}
      <div className="md:hidden">
        <BottomNavBar />
      </div>
    </div>
  );
}
