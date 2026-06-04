"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { User, onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase/config";
import { getLocalProfile } from "@/lib/storage/userLocalStorage";
import { useHealthStore } from "@/lib/store/useHealthStore";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  supabaseToken: string | null;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  supabaseToken: null,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [supabaseToken, setSupabaseToken] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        const localProfile = getLocalProfile(currentUser.uid);
        if (localProfile) {
          useHealthStore.getState().setProfile(localProfile);
        }

        document.cookie = "pulse_auth=true; path=/; max-age=3600";
        
        // Fetch Supabase custom token
        try {
          const idToken = await currentUser.getIdToken();
          const res = await fetch("/api/auth/token", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${idToken}`,
            },
          });
          if (res.ok) {
            const data = await res.json();
            setSupabaseToken(data.supabaseToken);
            document.cookie = `supabase_token=${data.supabaseToken}; path=/; max-age=3600; SameSite=Strict`;
          }
        } catch (err) {
          console.error("Failed to fetch supabase token", err);
        }
      } else {
        document.cookie = "pulse_auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        document.cookie = "supabase_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        setSupabaseToken(null);
        useHealthStore.getState().setProfile(null);
        useHealthStore.getState().setRecentDiagnoses([]);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, supabaseToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
