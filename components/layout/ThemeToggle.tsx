"use client";
import { useState, useEffect } from "react";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("pulse-theme");
    const dark = stored !== "light";
    setIsDark(dark);
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
  }, []);

  const toggle = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.setAttribute("data-theme", next ? "dark" : "light");
    localStorage.setItem("pulse-theme", next ? "dark" : "light");
  };

  return (
    <button
      onClick={toggle}
      className="p-2 rounded-lg transition-all hover:bg-[var(--bg-tertiary)]"
      title={isDark ? "Mode clair" : "Mode sombre"}
      aria-label="Toggle theme"
    >
      {isDark
        ? <Sun size={18} style={{ color: "var(--accent-green)" }} />
        : <Moon size={18} style={{ color: "var(--accent-green)" }} />
      }
    </button>
  );
}