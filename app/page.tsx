"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import SplashScreen from "@/components/splash/SplashScreen";


export default function RootPage() {
  const router = useRouter();
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const navigate = async () => {
      const onboarded = localStorage.getItem("pulse_onboarded");
      const delay = onboarded ? 1500 : 2500;
      await new Promise((res) => setTimeout(res, delay));
      setShowSplash(false);

      const isAuth = document.cookie.includes("pulse_auth=true");

      if (isAuth) {
        router.replace("/home");
        return;
      }

      if (!onboarded) {
        router.replace("/onboarding");
      } else {
        router.replace("/auth/login");
      }
    };
    navigate();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (showSplash) return <SplashScreen />;
  return null;
}
