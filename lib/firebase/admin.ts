import * as admin from "firebase-admin";

let adminAuth: admin.auth.Auth | null = null;

function initializeFirebaseAdmin() {
  if (adminAuth) return adminAuth;
  
  // Skip initialization if required env vars are missing
  if (
    !process.env.FIREBASE_PRIVATE_KEY ||
    !process.env.FIREBASE_CLIENT_EMAIL ||
    !process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  ) {
    console.warn("Firebase credentials not available - skipping initialization");
    return null;
  }

  try {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          // Replace escaped newlines for private key
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
        }),
      });
    }
    adminAuth = admin.auth();
    return adminAuth;
  } catch (error) {
    console.error("Firebase admin initialization error", error);
    return null;
  }
}

export function getAdminAuth() {
  return initializeFirebaseAdmin();
}
