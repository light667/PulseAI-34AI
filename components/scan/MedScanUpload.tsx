"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { Camera, Upload, Loader2, Scan } from "lucide-react";
import { Button } from "@/components/ui/button";
import { scanMedication, type MedScanResult } from "@/lib/services/scanService";
import MedScanResultView from "./MedScanResult";

export default function MedScanUpload() {
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MedScanResult | null>(null);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File) => {
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setResult(null);
    setError("");
  };

  const handleScan = async () => {
    if (!file) return;
    setLoading(true);
    setError("");
    try {
      const data = await scanMedication(file);
      if (data.error) {
        setError(data.error);
      } else {
        setResult(data);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Scan failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />

      {!preview ? (
        <div className="flex min-h-[200px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[var(--border-active)] p-8">
          <Camera size={48} className="mb-4 text-[var(--accent-green)]" />
          <p className="mb-4 text-center text-[var(--text-secondary)]">
            Take a photo or upload from gallery
          </p>
          <div className="flex gap-3">
            <Button onClick={() => inputRef.current?.click()} className="gap-2">
              <Camera size={18} /> Camera
            </Button>
            <Button
              variant="secondary"
              onClick={() => inputRef.current?.click()}
              className="gap-2"
            >
              <Upload size={18} /> Upload
            </Button>
          </div>
        </div>
      ) : (
        <div className="relative overflow-hidden rounded-2xl">
          <Image
            src={preview}
            alt="Medication"
            width={400}
            height={300}
            className="w-full object-cover"
          />
          {loading && (
            <div className="absolute inset-0 flex flex-col justify-center bg-black/50">
              <div className="h-1 w-full animate-pulse bg-[var(--accent-green)]" />
              <p className="mt-2 text-center text-sm text-white">Scanning...</p>
            </div>
          )}
          <Button
            variant="ghost"
            className="mt-2 w-full"
            onClick={() => {
              setPreview(null);
              setFile(null);
              setResult(null);
            }}
          >
            Retake
          </Button>
        </div>
      )}

      {preview && !result && (
        <Button onClick={handleScan} disabled={loading} className="gap-2">
          {loading ? (
            <Loader2 className="animate-spin" size={18} />
          ) : (
            <Scan size={18} />
          )}
          Analyze Medication
        </Button>
      )}

      {error && (
        <p className="text-sm text-[var(--accent-orange)]">{error}</p>
      )}

      {result && <MedScanResultView result={result} />}
    </div>
  );
}
