import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyBPtb39ZvhqKJN1DOauIscezEspsbSeWbQ",
  authDomain: "pulse-34ai.firebaseapp.com",
  projectId: "pulse-34ai",
  storageBucket: "pulse-34ai.firebasestorage.app",
  messagingSenderId: "244864484048",
  appId: "1:244864484048:web:a38a05ad536c2c555bd4d5",
  measurementId: "G-KXVX9EG3R5"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export { app, auth, googleProvider };

// Analytics only run on client side
export const initAnalytics = () => {
  if (typeof window !== "undefined") {
    return getAnalytics(app);
  }
  return null;
};
