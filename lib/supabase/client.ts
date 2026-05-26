import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export function createClient(customToken?: string) {
  const options: any = {};
  if (customToken) {
    options.global = {
      headers: {
        Authorization: `Bearer ${customToken}`,
      },
    };
  }

  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    options
  );
}
