"use client";

import { useEffect, useState } from "react";
import { useHealthStore } from "@/lib/store/useHealthStore";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useHealthStore((s) => s.theme);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const root = window.document.documentElement;
    if (theme === "light") {
      root.classList.add("light");
      root.classList.remove("dark");
    } else {
      root.classList.add("dark");
      root.classList.remove("light");
    }
  }, [theme, mounted]);

  // Prevent flash by matching server side initially if needed, but since it's client-persisted:
  return <>{children}</>;
}
