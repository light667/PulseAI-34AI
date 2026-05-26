"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  LogOut,
  Save,
  User,
  Heart,
  Globe,
  Sun,
  Moon,
  ChevronRight,
  CheckCircle2,
  Camera,
  Droplets,
  Weight,
  Ruler,
  Calendar,
  MapPin,
  Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { useHealthStore } from "@/lib/store/useHealthStore";
import type { HealthProfile } from "@/types/user";
import { useAuth } from "@/components/AuthProvider";
import { auth } from "@/lib/firebase/config";
import { calculateBMI } from "@/lib/utils";

const COUNTRIES = ["Togo", "Nigeria", "Ghana", "Benin", "Côte d'Ivoire"] as const;
const BLOOD_GROUPS = ["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"];

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-[var(--bg-tertiary)] p-3">
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-xl ${color} bg-opacity-10 flex-shrink-0`}
      >
        <Icon size={18} className={color} />
      </div>
      <div>
        <p className="text-[11px] text-[var(--text-muted)]">{label}</p>
        <p className="text-sm font-bold text-[var(--text-primary)]">{value}</p>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [form, setForm] = useState<HealthProfile>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [diagnoses, setDiagnoses] = useState<
    Array<{ id: string; top_condition: string; severity: string; created_at: string }>
  >([]);
  const profile = useHealthStore((s) => s.profile);
  const setProfile = useHealthStore((s) => s.setProfile);
  const language = useHealthStore((s) => s.language);
  const setLanguage = useHealthStore((s) => s.setLanguage);
  const theme = useHealthStore((s) => s.theme);
  const setTheme = useHealthStore((s) => s.setTheme);
  const { user, supabaseToken } = useAuth();

  useEffect(() => {
    const load = async () => {
      if (!user || !supabaseToken) return;
      const supabase = createClient(supabaseToken);

      setEmail(user.email ?? "");

      const { data: prof } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.uid)
        .single();

      if (prof) {
        setForm(prof);
        setProfile(prof);
      }

      const { data: hist } = await supabase
        .from("diagnoses")
        .select("id, top_condition, severity, created_at, result")
        .eq("user_id", user.uid)
        .order("created_at", { ascending: false });

      if (hist) setDiagnoses(hist);
    };
    load();
  }, [user, supabaseToken, setProfile]);

  const save = async () => {
    if (!user || !supabaseToken) return;
    setSaving(true);
    const supabase = createClient(supabaseToken);
    await supabase.from("profiles").upsert({ id: user.uid, ...form });
    setProfile({ ...form, email } as Parameters<typeof setProfile>[0]);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const signOut = async () => {
    await auth.signOut();
    router.replace("/auth/login");
  };

  const bmi =
    form.weight_kg && form.height_cm
      ? calculateBMI(form.weight_kg, form.height_cm)
      : null;

  const initials =
    form.full_name
      ?.split(" ")
      .slice(0, 2)
      .map((n) => n[0])
      .join("") || email?.[0]?.toUpperCase() || "P";

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-10">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Profile</h1>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 rounded-xl bg-[var(--accent-green)] px-4 py-2 text-sm font-semibold text-[var(--text-inverse)] disabled:opacity-60 hover:brightness-110 transition-all"
        >
          {saved ? (
            <>
              <CheckCircle2 size={15} />
              Saved!
            </>
          ) : saving ? (
            "Saving..."
          ) : (
            <>
              <Save size={15} />
              Save
            </>
          )}
        </motion.button>
      </div>

      {/* ── Profile Avatar + Stats ── */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="pulse-card p-5"
      >
        <div className="flex items-center gap-4 mb-5">
          {/* Avatar */}
          <div className="relative">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--accent-green-subtle)] border border-[var(--border-active)] text-[var(--accent-green)] font-display text-2xl font-bold">
              {initials}
            </div>
            <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--bg-tertiary)] border border-[var(--border-default)]">
              <Camera size={11} className="text-[var(--text-secondary)]" />
            </div>
          </div>
          <div>
            <p className="font-display text-lg font-bold">
              {form.full_name || "Your Name"}
            </p>
            <p className="text-sm text-[var(--text-secondary)]">{email}</p>
            {form.country && (
              <div className="flex items-center gap-1 mt-0.5">
                <MapPin size={11} className="text-[var(--accent-green)]" />
                <span className="text-xs text-[var(--text-muted)]">{form.country}</span>
              </div>
            )}
          </div>
        </div>

        {/* Key Stats Row */}
        {(form.blood_group || form.weight_kg || form.height_cm || bmi) && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {form.blood_group && (
              <StatCard
                icon={Droplets}
                label="Blood Type"
                value={form.blood_group}
                color="text-[var(--severity-critical)]"
              />
            )}
            {form.weight_kg && (
              <StatCard
                icon={Weight}
                label="Weight"
                value={`${form.weight_kg} kg`}
                color="text-[var(--accent-blue)]"
              />
            )}
            {form.height_cm && (
              <StatCard
                icon={Ruler}
                label="Height"
                value={`${form.height_cm} cm`}
                color="text-[var(--lyra-violet)]"
              />
            )}
            {bmi && (
              <StatCard
                icon={Heart}
                label="BMI"
                value={`${bmi}`}
                color="text-[var(--accent-green)]"
              />
            )}
          </div>
        )}
      </motion.div>

      {/* ── Personal Info ── */}
      <motion.section
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="pulse-card p-5 space-y-4"
      >
        <div className="flex items-center gap-2 mb-1">
          <User size={16} className="text-[var(--accent-green)]" />
          <h2 className="font-display font-semibold">Personal Information</h2>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-[var(--text-muted)]">Full Name</label>
            <Input
              placeholder="Full name"
              value={form.full_name ?? ""}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-[var(--text-muted)]">Email</label>
            <Input value={email} disabled className="opacity-60 cursor-not-allowed" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-[var(--text-muted)]">Date of Birth</label>
            <Input
              type="date"
              placeholder="DD/MM/YYYY"
              value={form.date_of_birth ?? ""}
              onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-[var(--text-muted)]">Country</label>
            <select
              className="input-field"
              value={form.country ?? "Togo"}
              onChange={(e) =>
                setForm({ ...form, country: e.target.value as HealthProfile["country"] })
              }
            >
              {COUNTRIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Sex selector */}
        <div>
          <label className="mb-2 block text-xs text-[var(--text-muted)]">Sex</label>
          <div className="flex gap-2">
            {["Male", "Female", "Prefer not to say"].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setForm({ ...form, sex: s })}
                className={`flex-1 rounded-xl py-2 text-xs font-medium transition-all ${
                  form.sex === s
                    ? "bg-[var(--accent-green)] text-[var(--text-inverse)]"
                    : "bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--accent-green-subtle)]"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </motion.section>

      {/* ── Health Data ── */}
      <motion.section
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="pulse-card p-5 space-y-4"
      >
        <div className="flex items-center gap-2 mb-1">
          <Heart size={16} className="text-[var(--severity-critical)]" />
          <h2 className="font-display font-semibold">Health Data</h2>
        </div>
        <p className="text-xs text-[var(--text-muted)] -mt-2">
          This information is private and encrypted.
        </p>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs text-[var(--text-muted)]">Weight (kg)</label>
            <Input
              type="number"
              placeholder="e.g. 72"
              value={form.weight_kg ?? ""}
              onChange={(e) =>
                setForm({ ...form, weight_kg: parseFloat(e.target.value) || undefined })
              }
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-[var(--text-muted)]">Height (cm)</label>
            <Input
              type="number"
              placeholder="e.g. 175"
              value={form.height_cm ?? ""}
              onChange={(e) =>
                setForm({ ...form, height_cm: parseFloat(e.target.value) || undefined })
              }
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs text-[var(--text-muted)]">Blood Group</label>
          <select
            className="input-field"
            value={form.blood_group ?? ""}
            onChange={(e) => setForm({ ...form, blood_group: e.target.value })}
          >
            <option value="">Select blood group</option>
            {BLOOD_GROUPS.map((b) => (
              <option key={b}>{b}</option>
            ))}
          </select>
        </div>

        {bmi && (
          <div className="rounded-xl bg-[var(--accent-green-subtle)] border border-[var(--border-active)] p-3">
            <p className="text-xs text-[var(--text-secondary)]">
              Calculated BMI:{" "}
              <span className="font-bold text-[var(--accent-green)]">{bmi}</span>
              <span className="text-[var(--text-muted)] ml-1">
                (
                {bmi < 18.5
                  ? "Underweight"
                  : bmi < 25
                  ? "Healthy weight"
                  : bmi < 30
                  ? "Overweight"
                  : "Obese"}
                )
              </span>
            </p>
          </div>
        )}
      </motion.section>

      {/* ── Preferences ── */}
      <motion.section
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="pulse-card p-5"
      >
        <div className="flex items-center gap-2 mb-4">
          <Globe size={16} className="text-[var(--accent-blue)]" />
          <h2 className="font-display font-semibold">Preferences</h2>
        </div>

        <div className="space-y-4">
          {/* Language */}
          <div>
            <label className="mb-2 block text-xs text-[var(--text-muted)]">Language</label>
            <div className="flex gap-2">
              {(["en", "fr"] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => {
                    setLanguage(l);
                    setForm({ ...form, language: l });
                  }}
                  className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all ${
                    language === l
                      ? "bg-[var(--accent-green)] text-[var(--text-inverse)]"
                      : "bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--accent-green-subtle)]"
                  }`}
                >
                  {l === "en" ? "🇬🇧 English" : "🇫🇷 Français"}
                </button>
              ))}
            </div>
          </div>

          {/* Theme */}
          <div>
            <label className="mb-2 block text-xs text-[var(--text-muted)]">Theme</label>
            <div className="flex gap-2">
              {(["dark", "light"] as const).map((th) => (
                <button
                  key={th}
                  onClick={() => setTheme(th)}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-all ${
                    theme === th
                      ? "bg-[var(--accent-green)] text-[var(--text-inverse)]"
                      : "bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--accent-green-subtle)]"
                  }`}
                >
                  {th === "dark" ? <Moon size={14} /> : <Sun size={14} />}
                  {th === "dark" ? "Dark" : "Light"}
                </button>
              ))}
            </div>
          </div>
        </div>
      </motion.section>

      {/* ── Diagnosis History ── */}
      <motion.section
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="pulse-card p-5"
      >
        <div className="flex items-center gap-2 mb-4">
          <Activity size={16} className="text-[var(--accent-green)]" />
          <h2 className="font-display font-semibold">Diagnosis History</h2>
        </div>
        {diagnoses.length === 0 ? (
          <p className="text-center text-sm text-[var(--text-muted)] py-4">
            No diagnoses yet. Start your first symptom check.
          </p>
        ) : (
          <div className="space-y-2">
            {diagnoses.map((d) => (
              <div
                key={d.id}
                className="flex items-center justify-between border-b border-[var(--border-default)] py-2.5 last:border-0"
              >
                <div>
                  <p className="text-sm font-medium">{d.top_condition}</p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {new Date(d.created_at).toLocaleDateString(
                      language === "en" ? "en-US" : "fr-FR",
                      { day: "numeric", month: "short", year: "numeric" }
                    )}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                    d.severity === "CRITICAL" || d.severity === "HIGH"
                      ? "bg-[var(--accent-orange-glow)] text-[var(--accent-orange)]"
                      : "bg-[var(--accent-green-subtle)] text-[var(--accent-green)]"
                  }`}
                >
                  {d.severity}
                </span>
              </div>
            ))}
          </div>
        )}
      </motion.section>

      {/* ── Account Actions ── */}
      <motion.section
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="space-y-2"
      >
        <button
          onClick={signOut}
          className="flex w-full items-center justify-between rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-4 py-3 text-sm font-medium text-[var(--text-secondary)] hover:border-[var(--severity-critical)] hover:text-[var(--severity-critical)] transition-all"
        >
          <div className="flex items-center gap-2">
            <LogOut size={16} />
            Sign Out
          </div>
          <ChevronRight size={15} />
        </button>
      </motion.section>
    </div>
  );
}
