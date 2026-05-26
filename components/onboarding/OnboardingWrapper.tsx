"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { MapPin, Stethoscope, Hospital, Sparkles } from "lucide-react";
import OnboardingSlide from "./OnboardingSlide";
import OnboardingDots from "./OnboardingDots";
import { Button } from "@/components/ui/button";

const slides = [
  {
    title: "Healthcare Intelligence for Africa",
    body: "Get accurate health insights in seconds. Available in French, English, and local languages.",
    icon: MapPin,
    accent: "text-[var(--accent-green)]",
  },
  {
    title: "Describe. Diagnose. Act.",
    body: "Type or speak your symptoms. Pulse AI ranks possible conditions by probability and tells you what to do next.",
    icon: Stethoscope,
    accent: "text-[var(--accent-green)]",
  },
  {
    title: "The Right Hospital. Right Now.",
    body: "Find the nearest hospital that can treat your condition — across 5 countries.",
    icon: Hospital,
    accent: "text-[var(--accent-blue)]",
  },
  {
    title: "Meet Lyra. Your Mental Health Companion.",
    body: "An AI therapist who listens without judgment, 24/7. Your wellbeing matters — mind and body.",
    icon: Sparkles,
    accent: "text-[var(--lyra-violet)]",
  },
];

export default function OnboardingWrapper() {
  const [index, setIndex] = useState(0);
  const router = useRouter();
  const isLast = index === slides.length - 1;

  const finish = () => {
    localStorage.setItem("pulse_onboarded", "true");
    router.push("/auth/signup");
  };

  return (
    <div className="relative flex min-h-screen flex-col ecg-bg">
      <button
        onClick={() => router.push("/auth/login")}
        className="absolute right-4 top-4 z-10 text-sm text-[var(--text-secondary)]"
      >
        Skip
      </button>

      <div className="flex-1 overflow-hidden pt-12">
        <AnimatePresence mode="wait">
          <OnboardingSlide
            key={index}
            title={slides[index].title}
            body={slides[index].body}
            accentClass={slides[index].accent}
            illustration={
              <div
                className={`flex h-32 w-32 items-center justify-center rounded-full bg-[var(--accent-green-subtle)] ${slides[index].accent}`}
              >
                {(() => {
                  const Icon = slides[index].icon;
                  return <Icon size={56} />;
                })()}
              </div>
            }
          />
        </AnimatePresence>
      </div>

      <div className="space-y-6 px-8 pb-12">
        <OnboardingDots total={slides.length} current={index} />
        <div className="flex gap-3">
          {index > 0 && (
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setIndex((i) => i - 1)}
            >
              Back
            </Button>
          )}
          <Button
            className="flex-1"
            onClick={() => (isLast ? finish() : setIndex((i) => i + 1))}
          >
            {isLast ? "Get Started" : "Next"}
          </Button>
        </div>
        {isLast && (
          <button
            onClick={() => {
              localStorage.setItem("pulse_onboarded", "true");
              router.push("/auth/login");
            }}
            className="w-full text-center text-sm text-[var(--text-secondary)]"
          >
            I already have an account
          </button>
        )}
      </div>
    </div>
  );
}
