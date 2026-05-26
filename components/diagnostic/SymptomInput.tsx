"use client";

import { useState, useRef } from "react";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { analyzeSymptoms, transcribeAudio } from "@/lib/services/diagnosisService";
import type { DiagnosisResult } from "@/types/diagnosis";
import DiagnosisResultView from "./DiagnosisResult";
import { useHealthStore } from "@/lib/store/useHealthStore";
import { t } from "@/lib/i18n";

const LANGUAGES = [
  { code: "fr", label: "🇫🇷 Français" },
  { code: "en", label: "🇬🇧 English" },
  { code: "ee", label: "🇹🇬 Ewe" },
  { code: "ha", label: "🇳🇬 Hausa" },
  { code: "yo", label: "🇳🇬 Yoruba" },
];

const FACTS = [
  "Le paludisme reste la maladie la plus diagnostiquée en Afrique de l'Ouest.",
  "L'hydratation est essentielle en cas de fièvre.",
  "Ne prenez jamais d'antibiotiques sans prescription médicale.",
];

interface SymptomInputProps {
  onResult?: (result: DiagnosisResult) => void;
}

export default function SymptomInput({ onResult }: SymptomInputProps) {
  const [symptoms, setSymptoms] = useState("");
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

  const handleAnalyze = async () => {
    if (symptoms.length < 20) {
      setError("Please describe symptoms in at least 20 characters.");
      return;
    }
    setError("");
    setLoading(true);
    const interval = setInterval(
      () => setFactIndex((i) => (i + 1) % FACTS.length),
      2000
    );
    try {
      const data = await analyzeSymptoms({ symptoms, language });
      setResult(data);
      onResult?.(data);
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
          setError("Voice transcription failed");
        } finally {
          setLoading(false);
        }
        stream.getTracks().forEach((t) => t.stop());
      };
      mediaRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch {
      setError("Microphone access denied");
    }
  };

  const stopRecording = () => {
    mediaRef.current?.stop();
    setRecording(false);
  };

  return (
    <div className="space-y-4">
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
            onChange={(e) => setSymptoms(e.target.value)}
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
          {FACTS[factIndex]}
        </p>
      )}

      {result && <DiagnosisResultView result={result} />}
    </div>
  );
}
