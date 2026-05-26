import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { DiagnosisResult } from "@/types/diagnosis";
import type { HealthProfile } from "@/types/user";

interface HealthState {
  profile: HealthProfile | null;
  lastDiagnosis: DiagnosisResult | null;
  recentDiagnoses: Array<{
    id: string;
    top_condition: string;
    severity: string;
    created_at: string;
  }>;
  language: "fr" | "en";
  theme: "dark" | "light";
  setProfile: (profile: HealthProfile | null) => void;
  setLastDiagnosis: (result: DiagnosisResult | null) => void;
  setRecentDiagnoses: (
    items: HealthState["recentDiagnoses"]
  ) => void;
  setLanguage: (lang: "fr" | "en") => void;
  setTheme: (theme: "dark" | "light") => void;
}

export const useHealthStore = create<HealthState>()(
  persist(
    (set) => ({
      profile: null,
      lastDiagnosis: null,
      recentDiagnoses: [],
      language: "en",
      theme: "dark",
      setProfile: (profile) => set({ profile }),
      setLastDiagnosis: (lastDiagnosis) => set({ lastDiagnosis }),
      setRecentDiagnoses: (recentDiagnoses) => set({ recentDiagnoses }),
      setLanguage: (language) => set({ language }),
      setTheme: (theme) => set({ theme }),
    }),
    { name: "pulse-health-store" }
  )
);
