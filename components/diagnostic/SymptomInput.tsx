"use client";

import { useState, useRef } from "react";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { analyzeSymptoms, transcribeAudio } from "@/lib/services/diagnosisService";
import type { DiagnosisResult } from "@/types/diagnosis";
import DiagnosisResultView from "./DiagnosisResult";
import { useHealthStore } from "@/lib/store/useHealthStore";
import { useAuth } from "@/components/AuthProvider";
import { t } from "@/lib/i18n";
import { COMMON_SYMPTOMS } from "@/lib/diagnostic/commonSymptoms";
import {
  addLocalRecentActivity,
  getLocalRecentActivity,
} from "@/lib/storage/userLocalStorage";

const LANGUAGES = [
  { code: "fr", label: "🇫🇷 Français" },
  { code: "en", label: "🇬🇧 English" },
  { code: "ee", label: "🇹🇬 Ewe" },
  { code: "ha", label: "🇳🇬 Hausa" },
  { code: "yo", label: "🇳🇬 Yoruba" },
];

const FACTS_FR = [
  "Le paludisme reste la maladie la plus diagnostiquée en Afrique de l'Ouest.",
  "L'hydratation est essentielle en cas de fièvre.",
  "Ne prenez jamais d'antibiotiques sans prescription médicale.",
];

const FACTS_EN = [
  "Malaria remains the most diagnosed disease in West Africa.",
  "Hydration is essential when you have a fever.",
  "Never take antibiotics without a medical prescription.",
];

interface SymptomInputProps {
  onResult?: (result: DiagnosisResult) => void;
}

export default function SymptomInput({ onResult }: SymptomInputProps) {
  const [symptoms, setSymptoms] = useState("");
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [mode, setMode] = useState<"text" | "voice">("text");
  const [language, setLanguage] = useState("fr");
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [result, setResult] = useState<DiagnosisResult | null>(null);
  const [factIndex, setFactIndex] = useState(0);
  const [error, setError] = useState("");
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const locale = useHealthStore((s) => s.language);
  const setRecentDiagnoses = useHealthStore((s) => s.setRecentDiagnoses);
  const { user } = useAuth();

  const commonSymptoms = COMMON_SYMPTOMS[locale];
  const facts = locale === "fr" ? FACTS_FR : FACTS_EN;

  const toggleSymptom = (symptom: string) => {
    setSelectedSymptoms((prev) => {
      const next = prev.includes(symptom)
        ? prev.filter((s) => s !== symptom)
        : [...prev, symptom];
      setSymptoms(next.join(", "));
      return next;
    });
  };

  const handleAnalyze = async () => {
    if (symptoms.length < 20) {
      setError(
        locale === "fr"
          ? "Décrivez vos symptômes en au moins 20 caractères."
          : "Please describe symptoms in at least 20 characters."
      );
      return;
    }
    setError("");
    setLoading(true);
    const interval = setInterval(
      () => setFactIndex((i) => (i + 1) % facts.length),
      2000
    );
    try {
      const data = await analyzeSymptoms({ symptoms, language });
      setResult(data);
      onResult?.(data);

      if (user) {
        const top = data.conditions[0]?.name ?? "Unknown";
        const activityItem = {
          id: crypto.randomUUID(),
          type: "diagnosis" as const,
          title: top,
          severity: data.severity,
          created_at: new Date().toISOString(),
        };
        addLocalRecentActivity(user.uid, activityItem);
        const all = getLocalRecentActivity(user.uid);
        setRecentDiagnoses(
          all.slice(0, 3).map((a) => ({
            id: a.id,
            top_condition: a.title,
            severity: a.severity ?? "LOW",
            created_at: a.created_at,
          }))
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      clearInterval(interval);
      setLoading(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setLoading(true);
        try {
          const text = await transcribeAudio(blob);
          setSymptoms(text);
        } catch {
          setError(
            locale === "fr"
              ? "Échec de la transcription vocale"
              : "Voice transcription failed"
          );
        } finally {
          setLoading(false);
        }
        stream.getTracks().forEach((t) => t.stop());
      };
      mediaRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch {
      setError(
        locale === "fr"
          ? "Accès au microphone refusé"
          : "Microphone access denied"
      );
    }
  };

  const stopRecording = () => {
    mediaRef.current?.stop();
    setRecording(false);
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-xs font-medium text-[var(--text-muted)]">
          {t("diagnostic.commonSymptoms", locale)}
        </p>
        <div className="flex flex-wrap gap-2">
          {commonSymptoms.map((symptom) => (
            <button
              key={symptom}
              type="button"
              onClick={() => toggleSymptom(symptom)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                selectedSymptoms.includes(symptom)
                  ? "bg-[var(--accent-green)] text-[var(--text-inverse)]"
                  : "bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--accent-green-subtle)]"
              }`}
            >
              {symptom}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        {(["text", "voice"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`rounded-full px-4 py-2 text-sm ${
              mode === m
                ? "bg-[var(--accent-green)] text-[var(--text-inverse)]"
                : "bg-[var(--bg-tertiary)] text-[var(--text-secondary)]"
            }`}
          >
            {m === "text" ? "✍️ Text" : "🎤 Voice"}
          </button>
        ))}
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="ml-auto rounded-full bg-[var(--bg-tertiary)] px-3 py-2 text-sm"
        >
          {LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>
              {l.label}
            </option>
          ))}
        </select>
      </div>

      {mode === "text" ? (
        <>
          <textarea
            value={symptoms}
            onChange={(e) => {
              setSymptoms(e.target.value);
              const parts = e.target.value
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean);
              setSelectedSymptoms(
                parts.filter((p) => commonSymptoms.includes(p))
              );
            }}
            placeholder={t("diagnostic.placeholder", locale)}
            className="input-field min-h-[140px] resize-y"
            maxLength={1000}
          />
          <p className="text-right text-xs text-[var(--text-muted)]">
            {symptoms.length}/1000 (min 20)
          </p>
        </>
      ) : (
        <div className="flex flex-col items-center gap-4 py-8">
          <button
            onClick={recording ? stopRecording : startRecording}
            className={`flex h-24 w-24 items-center justify-center rounded-full ${
              recording
                ? "animate-pulse bg-[var(--accent-orange)]"
                : "bg-[var(--accent-green)]"
            }`}
          >
            {recording ? (
              <MicOff size={36} className="text-[var(--text-inverse)]" />
            ) : (
              <Mic size={36} className="text-[var(--text-inverse)]" />
            )}
          </button>
          {symptoms && (
            <p className="text-sm text-[var(--text-secondary)]">{symptoms}</p>
          )}
        </div>
      )}

      {error && (
        <p className="text-sm text-[var(--accent-orange)]">{error}</p>
      )}

      <Button onClick={handleAnalyze} disabled={loading} className="gap-2">
        {loading ? (
          <>
            <Loader2 className="animate-spin" size={18} />
            {t("diagnostic.analyzing", locale)}
          </>
        ) : (
          <>🔍 {t("diagnostic.submit", locale)}</>
        )}
      </Button>

      {loading && (
        <p className="text-center text-xs text-[var(--text-muted)]">
          {facts[factIndex]}
        </p>
      )}

      {result && <DiagnosisResultView result={result} />}
    </div>
  );
}
