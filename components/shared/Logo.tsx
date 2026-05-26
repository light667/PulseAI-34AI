"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

interface LogoProps {
  size?: number;
  showText?: boolean;
  className?: string;
}

export default function Logo({ size = 48, showText = true, className }: LogoProps) {
  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <Image
        src="/logo.png"
        alt="Pulse AI"
        width={size}
        height={size}
        className="rounded-full object-cover"
        priority
      />
      {showText && (
        <span
          className="font-display text-lg font-bold tracking-wider text-[var(--text-primary)]"
          style={{ fontFamily: "var(--font-syne)" }}
        >
          PULSE AI
        </span>
      )}
    </div>
  );
}
