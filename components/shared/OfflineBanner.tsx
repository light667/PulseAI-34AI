"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";
import { isOnline } from "@/lib/utils";
import { useHealthStore } from "@/lib/store/useHealthStore";
import { t } from "@/lib/i18n";

export default function OfflineBanner() {
  const [offline, setOffline] = useState(false);
  const language = useHealthStore((s) => s.language);

  useEffect(() => {
    const update = () => setOffline(!isOnline());
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  if (!offline) return null;

  return (
    <div className="flex items-center justify-center gap-2 bg-[var(--accent-orange)]/20 px-4 py-2 text-sm text-[var(--accent-orange)]">
      <WifiOff size={16} />
      {t("offline", language)}
    </div>
  );
}
