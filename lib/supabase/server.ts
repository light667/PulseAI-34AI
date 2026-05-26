import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

export async function createClient() {
  const cookieStore = await cookies();
  const token = cookieStore.get("supabase_token")?.value;
  const options: any = {};
  if (token) {
    options.global = {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };
  }

  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    options
  );
}

export async function getUserFromToken() {
  const cookieStore = await cookies();
  const token = cookieStore.get("supabase_token")?.value;
  if (!token) return null;
  try {
    const decoded: any = jwt.decode(token);
    return decoded ? { id: decoded.sub, email: decoded.email } : null;
  } catch {
    return null;
  }
}

export async function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
