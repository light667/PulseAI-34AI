"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import Logo from "@/components/shared/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createUserWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase/config";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";
import type { CountryOption } from "@/types/user";

const COUNTRIES: CountryOption[] = [
  "Togo",
  "Nigeria",
  "Ghana",
  "Benin",
  "Côte d'Ivoire",
];

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    confirm: "",
    country: "Togo" as CountryOption,
    date_of_birth: "",
    sex: "",
    blood_group: "",
    weight_kg: "",
    height_cm: "",
  });
  const [showPass, setShowPass] = useState(false);

  const nextStep = async () => {
    if (step === 1) {
      if (form.password !== form.confirm) {
        setError("Passwords do not match");
        return;
      }
      if (form.password.length < 6) {
        setError("Password must be at least 6 characters");
        return;
      }
      setError("");
      setStep(2);
      return;
    }
    if (step === 2) {
      setStep(3);
      await register();
    }
  };

  const register = async () => {
    setLoading(true);
    setError("");
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, form.email, form.password);
      
      // Get Firebase ID token
      const idToken = await userCredential.user.getIdToken();
      
      // Exchange for Supabase custom JWT
      const res = await fetch("/api/auth/token", {
        method: "POST",
        headers: { Authorization: `Bearer ${idToken}` }
      });
      
      if (!res.ok) {
        throw new Error("Failed to authenticate with database");
      }
      
      const { supabaseToken } = await res.json();
      const supabase = createClient(supabaseToken);

      await supabase.from("profiles").upsert({
        id: userCredential.user.uid,
        full_name: form.full_name,
        country: form.country,
        date_of_birth: form.date_of_birth || null,
        sex: form.sex || null,
        blood_group: form.blood_group || null,
        weight_kg: form.weight_kg ? parseFloat(form.weight_kg) : null,
        height_cm: form.height_cm ? parseFloat(form.height_cm) : null,
      });

      setLoading(false);
      router.replace("/home");
    } catch (err: any) {
      setError(err.message || "Failed to sign up");
      setLoading(false);
    }
  };
  const googleSignup = async () => {
    setError("");
    try {
      const res = await signInWithPopup(auth, googleProvider);
      const user = res.user;

      // Get Firebase ID token
      const idToken = await user.getIdToken();

      // Exchange for Supabase custom JWT
      const tokenRes = await fetch("/api/auth/token", {
        method: "POST",
        headers: { Authorization: `Bearer ${idToken}` }
      });

      if (tokenRes.ok) {
        const { supabaseToken } = await tokenRes.json();
        const supabase = createClient(supabaseToken);

        // Check if profile exists
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.uid)
          .single();

        if (!profile) {
          // Create initial profile
          await supabase.from("profiles").upsert({
            id: user.uid,
            full_name: user.displayName || user.email?.split("@")[0] || "User",
            country: form.country || "Togo",
          });
        }
      }

      router.replace("/home");
    } catch (err: any) {
      setError(err.message || "Failed to sign up with Google");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center ecg-bg px-4 py-8">
      <div className="glass-panel w-full max-w-[400px] p-8">
        <Logo size={36} className="mb-4" />
        <div className="mb-6 flex justify-center gap-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-2 w-8 rounded-full ${
                s <= step ? "bg-[var(--accent-green)]" : "bg-[var(--bg-tertiary)]"
              }`}
            />
          ))}
        </div>

        {step === 1 && (
          <>
            <h1 className="mb-4 font-display text-xl font-bold">
              Create your account (1/3)
            </h1>
            <div className="space-y-3">
              <Input
                placeholder="Full Name"
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              />
              <Input
                type="email"
                placeholder="Email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
              <div className="relative">
                <Input
                  type={showPass ? "text" : "password"}
                  placeholder="Password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <Input
                type="password"
                placeholder="Confirm Password"
                value={form.confirm}
                onChange={(e) => setForm({ ...form, confirm: e.target.value })}
              />
              <select
                className="input-field"
                value={form.country}
                onChange={(e) =>
                  setForm({ ...form, country: e.target.value as CountryOption })
                }
              >
                {COUNTRIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>

              <div className="my-4 flex items-center gap-3">
                <div className="h-px flex-1 bg-[var(--border-default)]" />
                <span className="text-xs text-[var(--text-muted)]">or</span>
                <div className="h-px flex-1 bg-[var(--border-default)]" />
              </div>

              <Button
                variant="secondary"
                type="button"
                className="w-full gap-3 bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-[var(--text-primary)]"
                onClick={googleSignup}
              >
                <Image
                  src="/google.jpg"
                  alt="Google"
                  width={20}
                  height={20}
                  className="rounded-full object-cover"
                />
                <span>Sign Up with Google</span>
              </Button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h1 className="mb-2 font-display text-xl font-bold">
              Your health profile (2/3)
            </h1>
            <p className="mb-4 text-sm text-[var(--text-secondary)]">
              Optional — helps personalize your health advice. Private and encrypted.
            </p>
            <div className="space-y-3">
              <Input
                placeholder="Date of birth (DD/MM/YYYY)"
                value={form.date_of_birth}
                onChange={(e) =>
                  setForm({ ...form, date_of_birth: e.target.value })
                }
              />
              <div className="flex gap-2">
                {["Male", "Female", "Prefer not to say"].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setForm({ ...form, sex: s })}
                    className={`flex-1 rounded-xl py-2 text-xs ${
                      form.sex === s
                        ? "bg-[var(--accent-green)] text-[var(--text-inverse)]"
                        : "bg-[var(--bg-tertiary)]"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <select
                className="input-field"
                value={form.blood_group}
                onChange={(e) => setForm({ ...form, blood_group: e.target.value })}
              >
                <option value="">Blood group</option>
                {["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"].map((b) => (
                  <option key={b}>{b}</option>
                ))}
              </select>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="Weight (kg)"
                  value={form.weight_kg}
                  onChange={(e) => setForm({ ...form, weight_kg: e.target.value })}
                />
                <Input
                  placeholder="Height (cm)"
                  value={form.height_cm}
                  onChange={(e) => setForm({ ...form, height_cm: e.target.value })}
                />
              </div>
            </div>
          </>
        )}

        {step === 3 && (
          <div className="text-center">
            <h1 className="mb-4 font-display text-xl font-bold">
              You&apos;re all set! (3/3)
            </h1>
            <ul className="mb-6 space-y-2 text-left text-sm text-[var(--accent-green)]">
              <li>✅ Account created</li>
              <li>✅ Profile saved</li>
              <li>✅ Ready to use Pulse AI</li>
            </ul>
            <Button onClick={() => router.replace("/home")} className="w-full">
              Go to Pulse AI
            </Button>
          </div>
        )}

        {error && (
          <p className="mt-3 text-sm text-[var(--accent-orange)]">{error}</p>
        )}

        {step < 3 && (
          <div className="mt-6 flex gap-2">
            {step === 2 && (
              <Button
                variant="ghost"
                onClick={async () => {
                  setStep(3);
                  await register();
                }}
              >
                Skip for now
              </Button>
            )}
            <Button
              className="flex-1"
              onClick={nextStep}
              disabled={loading}
            >
              {loading ? "Creating..." : "Continue"}
            </Button>
          </div>
        )}

        <p className="mt-4 text-center text-sm">
          <Link href="/auth/login" className="text-[var(--accent-green)]">
            Already have an account?
          </Link>
        </p>
      </div>
    </div>
  );
}
