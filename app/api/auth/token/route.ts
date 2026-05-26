import { NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase/admin";
import jwt from "jsonwebtoken";

export async function POST(request: Request) {
  try {
    const adminAuth = getAdminAuth();
    if (!adminAuth) {
      return NextResponse.json(
        { error: "Firebase not configured" },
        { status: 500 }
      );
    }

    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing token" }, { status: 401 });
    }

    const idToken = authHeader.split("Bearer ")[1];
    
    // Verify Firebase token
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    
    // Create Custom Supabase JWT
    const payload = {
      aud: "authenticated",
      exp: Math.floor(Date.now() / 1000) + 60 * 60, // 1 hour
      sub: decodedToken.uid,
      email: decodedToken.email,
      role: "authenticated",
    };

    const secret = process.env.SUPABASE_JWT_SECRET;
    if (!secret) {
      console.error("Missing SUPABASE_JWT_SECRET");
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    const supabaseToken = jwt.sign(payload, secret);

    return NextResponse.json({ supabaseToken });
  } catch (error) {
    console.error("Token exchange error:", error);
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }
}
