"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  User,
  Activity,
  Search,
  Hospital,
  Leaf,
  ChevronRight,
  Heart,
  Droplets,
  Weight,
  Ruler,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import DailyTip from "@/components/home/DailyTip";
import { createClient } from "@/lib/supabase/client";
import { useHealthStore } from "@/lib/store/useHealthStore";
import { calculateBMI, formatDate, getGreeting } from "@/lib/utils";
import { useAuth } from "@/components/AuthProvider";
import { t } from "@/lib/i18n";
import {
  getLocalProfile,
  getLocalRecentActivity,
  mergeProfile,
  saveLocalProfile,
  setLocalRecentActivity,
} from "@/lib/storage/userLocalStorage";

const quickActions = [
  {
    href: "/diagnostic",
    icon: Search,
    labelKey: "nav.diagnostic" as const,
    descriptionKey: "home.action.diagnosticDesc" as const,
    color: "text-[var(--accent-green)]",
    bg: "bg-[var(--accent-green-subtle)]",
    border: "border-[var(--border-active)]",
  },
  {
    href: "/hospitals",
    icon: Hospital,
    labelKey: "nav.hospitals" as const,
    descriptionKey: "home.action.hospitalsDesc" as const,
    color: "text-[var(--accent-blue)]",
    bg: "bg-[rgba(79,195,247,0.08)]",
    border: "border-[rgba(79,195,247,0.2)]",
  },
  {
    href: "/lyra",
    icon: Leaf,
    labelKey: "nav.lyra" as const,
    descriptionKey: "home.action.lyraDesc" as const,
    color: "text-[var(--lyra-violet)]",
    bg: "bg-[rgba(167,139,250,0.08)]",
    border: "border-[rgba(167,139,250,0.2)]",
  },
];

function getBMICategory(bmi: number, language: "fr" | "en") {
  if (bmi < 18.5)
    return {
      label: language === "fr" ? "Insuffisance" : "Underweight",
      color: "text-[var(--accent-blue)]",
    };
  if (bmi < 25)
    return {
      label: language === "fr" ? "Normal" : "Healthy",
      color: "text-[var(--severity-low)]",
    };
  if (bmi < 30)
    return {
      label: language === "fr" ? "Surpoids" : "Overweight",
      color: "text-[var(--severity-medium)]",
    };
  return {
    label: language === "fr" ? "Obésité" : "Obese",
    color: "text-[var(--severity-high)]",
  };
}

export default function HomePage() {
  const [name, setName] = useState("there");
  const [profileComplete, setProfileComplete] = useState(false);
  const profile = useHealthStore((s) => s.profile);
  const recent = useHealthStore((s) => s.recentDiagnoses);
  const setRecent = useHealthStore((s) => s.setRecentDiagnoses);
  const setProfile = useHealthStore((s) => s.setProfile);
  const language = useHealthStore((s) => s.language);
  const { user, supabaseToken } = useAuth();

  useEffect(() => {
    const load = async () => {
      if (!user) return;

      const localProfile = getLocalProfile(user.uid);
      let merged = localProfile;

      if (supabaseToken) {
        const supabase = createClient(supabaseToken);
        const { data: prof } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.uid)
          .single();

        merged = mergeProfile(localProfile, prof) ?? localProfile ?? prof;
        if (merged) {
          saveLocalProfile(user.uid, merged);
        }

        const { data: diagnoses } = await supabase
          .from("diagnoses")
          .select("id, top_condition, severity, created_at")
          .eq("user_id", user.uid)
          .order("created_at", { ascending: false })
          .limit(3);

        const localActivity = getLocalRecentActivity(user.uid);
        if (localActivity.length > 0) {
          setRecent(
            localActivity.slice(0, 3).map((a) => ({
              id: a.id,
              top_condition: a.title,
              severity: a.severity ?? "LOW",
              created_at: a.created_at,
            }))
          );
        } else if (diagnoses?.length) {
          const fromDb = diagnoses.map((d) => ({
            id: d.id,
            top_condition: d.top_condition,
            severity: d.severity,
            created_at: d.created_at,
          }));
          setRecent(fromDb);
          setLocalRecentActivity(
            user.uid,
            fromDb.map((d) => ({
              id: d.id,
              type: "diagnosis" as const,
              title: d.top_condition,
              severity: d.severity,
              created_at: d.created_at,
            }))
          );
        }
      } else {
        const localActivity = getLocalRecentActivity(user.uid);
        if (localActivity.length > 0) {
          setRecent(
            localActivity.slice(0, 3).map((a) => ({
              id: a.id,
              top_condition: a.title,
              severity: a.severity ?? "LOW",
              created_at: a.created_at,
            }))
          );
        }
      }

      if (merged) {
        setProfile(merged);
        setName(merged.full_name?.split(" ")[0] || "there");
        setProfileComplete(
          !!(merged.weight_kg && merged.height_cm && merged.blood_group)
        );
      } else {
        setName(user.email?.split("@")[0] || "there");
      }
    };
    load();
  }, [user, supabaseToken, setProfile, setRecent]);

  const bmi =
    profile?.weight_kg && profile?.height_cm
      ? calculateBMI(profile.weight_kg, profile.height_cm)
      : null;

  const bmiCategory = bmi ? getBMICategory(bmi, language) : null;

  const greeting = getGreeting(language);
  const dateStr = formatDate(new Date(), language === "en" ? "en-US" : "fr-FR");

  const hasHealthStats =
    profile?.blood_group || profile?.weight_kg || profile?.height_cm;

  return (
    <div className="min-h-full">
      <header className="mb-6 flex items-start justify-between">
        <div>
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-display text-2xl font-bold md:text-3xl"
          >
            {greeting}, {name} 👋
          </motion.h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            {dateStr}
            {profile?.country ? ` · ${profile.country}` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <button className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--border-active)] hover:text-[var(--accent-green)] transition-all">
            <Bell size={18} />
          </button>
          <Link
            href="/profile"
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-green-subtle)] border border-[var(--border-active)] text-[var(--accent-green)] hover:brightness-110 transition-all"
          >
            <User size={18} />
          </Link>
        </div>
      </header>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-6 overflow-hidden rounded-2xl border border-[var(--border-active)] bg-gradient-to-br from-[var(--accent-green-subtle)] to-[rgba(79,195,247,0.05)] p-5"
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity size={16} className="text-[var(--accent-green)]" />
            <span className="text-sm font-semibold text-[var(--text-secondary)]">
              {t("home.healthOverview", language)}
            </span>
          </div>
          {profileComplete ? (
            <span className="flex items-center gap-1 text-xs text-[var(--severity-low)]">
              <CheckCircle2 size={13} />
              {t("home.complete", language)}
            </span>
          ) : (
            <Link
              href="/profile"
              className="flex items-center gap-1 text-xs text-[var(--accent-green)] hover:underline"
            >
              <AlertCircle size={13} />
              {t("home.completeProfile", language)}
            </Link>
          )}
        </div>

        {hasHealthStats ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="flex items-center gap-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-default)] px-3 py-2">
              <Droplets size={14} className="text-[var(--severity-critical)] flex-shrink-0" />
              <div>
                <p className="text-[10px] text-[var(--text-muted)]">
                  {t("home.blood", language)}
                </p>
                <p className="text-sm font-bold text-[var(--text-primary)]">
                  {profile?.blood_group ?? "—"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-default)] px-3 py-2">
              <Weight size={14} className="text-[var(--accent-blue)] flex-shrink-0" />
              <div>
                <p className="text-[10px] text-[var(--text-muted)]">
                  {t("home.weight", language)}
                </p>
                <p className="text-sm font-bold text-[var(--text-primary)]">
                  {profile?.weight_kg ? `${profile.weight_kg} kg` : "—"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-default)] px-3 py-2">
              <Ruler size={14} className="text-[var(--lyra-violet)] flex-shrink-0" />
              <div>
                <p className="text-[10px] text-[var(--text-muted)]">
                  {t("home.height", language)}
                </p>
                <p className="text-sm font-bold text-[var(--text-primary)]">
                  {profile?.height_cm ? `${profile.height_cm} cm` : "—"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-default)] px-3 py-2">
              <Heart size={14} className="text-[var(--accent-green)] flex-shrink-0" />
              <div>
                <p className="text-[10px] text-[var(--text-muted)]">
                  {t("home.bmi", language)}
                </p>
                <p
                  className={`text-sm font-bold ${bmiCategory?.color ?? "text-[var(--text-primary)]"}`}
                >
                  {bmi ?? "—"}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-[var(--text-muted)]">
              {t("home.noHealthData", language)}
            </p>
            <Link
              href="/profile"
              className="mt-2 inline-block text-xs text-[var(--accent-green)] hover:underline"
            >
              {t("home.completeProfile", language)}
            </Link>
          </div>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-6"
      >
        <DailyTip />
      </motion.div>

      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mb-6"
      >
        <h2 className="mb-3 font-display text-lg font-semibold">
          {t("home.quickActions", language)}
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {quickActions.map(
            ({ href, icon: Icon, labelKey, descriptionKey, color, bg, border }, i) => (
              <Link key={href} href={href}>
                <motion.div
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + i * 0.08 }}
                  className={`pulse-card flex min-h-[110px] flex-col items-start justify-between p-4 cursor-pointer ${border} hover:shadow-lg transition-shadow`}
                >
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl ${bg}`}
                  >
                    <Icon size={20} className={color} />
                  </div>
                  <div>
                    <p className="font-display text-sm font-semibold">
                      {t(labelKey, language)}
                    </p>
                    <p className="text-[11px] text-[var(--text-muted)]">
                      {t(descriptionKey, language)}
                    </p>
                  </div>
                </motion.div>
              </Link>
            )
          )}
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mb-6"
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">
            {t("home.recentActivity", language)}
          </h2>
          <Link
            href="/profile"
            className="flex items-center gap-1 text-xs text-[var(--accent-green)] hover:underline"
          >
            {t("home.seeAll", language)}
            <ChevronRight size={13} />
          </Link>
        </div>

        <AnimatePresence>
          {recent.length === 0 ? (
            <div className="pulse-card p-6 text-center">
              <Search size={28} className="mx-auto mb-2 text-[var(--text-muted)]" />
              <p className="text-sm font-medium text-[var(--text-secondary)]">
                {t("home.noDiagnoses", language)}
              </p>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                {t("home.startCheck", language)}
              </p>
              <Link href="/diagnostic">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  className="mt-3 rounded-full bg-[var(--accent-green)] px-4 py-1.5 text-xs font-semibold text-[var(--text-inverse)]"
                >
                  {t("home.checkSymptoms", language)}
                </motion.button>
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {recent.map((d, i) => (
                <motion.div
                  key={d.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.07 }}
                  className="pulse-card flex items-center justify-between p-3 hover:border-[var(--border-active)] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--bg-tertiary)]">
                      <Activity size={15} className="text-[var(--accent-green)]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{d.top_condition}</p>
                      <p className="text-xs text-[var(--text-muted)]">
                        {new Date(d.created_at).toLocaleDateString(
                          language === "en" ? "en-US" : "fr-FR"
                        )}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                      d.severity === "CRITICAL" || d.severity === "HIGH"
                        ? "bg-[var(--accent-orange-glow)] text-[var(--accent-orange)]"
                        : "bg-[var(--accent-green-subtle)] text-[var(--accent-green)]"
                    }`}
                  >
                    {d.severity}
                  </span>
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>
      </motion.section>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Link href="/lyra">
          <motion.div
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            className="cursor-pointer overflow-hidden rounded-2xl bg-gradient-to-r from-[var(--lyra-violet)]/20 to-[var(--lyra-teal)]/15 border border-[rgba(167,139,250,0.2)] p-5"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="mb-1 flex items-center gap-2">
                  <Leaf size={16} className="text-[var(--lyra-violet)]" />
                  <span className="text-xs font-semibold text-[var(--lyra-violet)] uppercase tracking-wider">
                    {t("home.lyraBadge", language)}
                  </span>
                </div>
                <p className="font-display text-base font-bold">
                  {t("home.lyraTitle", language)}
                </p>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  {t("home.lyraSubtitle", language)}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--lyra-violet)]/20 flex-shrink-0">
                <ChevronRight size={20} className="text-[var(--lyra-violet)]" />
              </div>
            </div>
          </motion.div>
        </Link>
      </motion.div>
    </div>
  );
}
