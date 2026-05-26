"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import Logo from "@/components/shared/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase/config";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.replace("/home");
    } catch (err: any) {
      setError(err.message || "Failed to sign in");
      setLoading(false);
    }
  };

  const googleLogin = async () => {
    setError("");
    try {
      const res = await signInWithPopup(auth, googleProvider);
      const user = res.user;

      const idToken = await user.getIdToken();
      const tokenRes = await fetch("/api/auth/token", {
        method: "POST",
        headers: { Authorization: `Bearer ${idToken}` },
      });

      if (tokenRes.ok) {
        const { supabaseToken } = await tokenRes.json();
        const supabase = createClient(supabaseToken);

        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.uid)
          .single();

        if (!profile) {
          await supabase.from("profiles").upsert({
            id: user.uid,
            full_name: user.displayName || user.email?.split("@")[0] || "User",
            country: "Togo",
          });
        }
      }

      router.replace("/home");
    } catch (err: any) {
      setError(err.message || "Failed to sign in with Google");
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center ecg-bg px-4 py-10">
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-[500px] w-[500px] rounded-full bg-[var(--accent-green)] opacity-[0.03] blur-[120px]" />
      </div>

      {/* Back button */}
      <Link
        href="/onboarding"
        className="absolute left-4 top-4 flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
      >
        <ArrowLeft size={18} />
      </Link>

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 25 }}
        className="glass-panel w-full max-w-[420px] p-8"
      >
        {/* Logo */}
        <Logo size={40} className="mb-6" />

        {/* Heading */}
        <h1 className="mb-1 font-display text-2xl font-bold">Welcome back 👋</h1>
        <p className="mb-6 text-sm text-[var(--text-secondary)]">
          Sign in to your Pulse AI account
        </p>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs text-[var(--text-muted)]">
              Email address
            </label>
            <Input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-xs text-[var(--text-muted)]">Password</label>
              <button
                type="button"
                className="text-xs text-[var(--accent-green)] hover:underline"
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <Input
                type={showPass ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <motion.p
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl bg-[var(--accent-orange-glow)] px-3 py-2 text-sm text-[var(--accent-orange)]"
            >
              {error}
            </motion.p>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="!mt-4 w-full rounded-xl bg-[var(--accent-green)] py-2.5 font-semibold text-[var(--text-inverse)] hover:brightness-110 active:scale-95 transition-all disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Sign In"}
          </Button>
        </form>

        {/* Divider */}
        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-[var(--border-default)]" />
          <span className="text-xs text-[var(--text-muted)]">or continue with</span>
          <div className="h-px flex-1 bg-[var(--border-default)]" />
        </div>

        {/* Google button */}
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={googleLogin}
          className="flex w-full items-center justify-center gap-3 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-4 py-2.5 text-sm font-medium text-[var(--text-primary)] hover:border-[var(--border-active)] hover:bg-[var(--bg-tertiary)] transition-all"
        >
          <Image
            src="/google.jpg"
            alt="Google"
            width={20}
            height={20}
            className="rounded-full object-cover"
          />
          Continue with Google
        </motion.button>

        {/* Sign up link */}
        <p className="mt-6 text-center text-sm text-[var(--text-secondary)]">
          Don&apos;t have an account?{" "}
          <Link
            href="/auth/signup"
            className="font-semibold text-[var(--accent-green)] hover:underline"
          >
            Sign up
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
