/**
 * Firebase Client SDK Configuration
 * Team Vector | SIH 2026 Problem Statement 26155
 */

export const firebaseConfig = {
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "sih-2026-sentinel",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:260719433276:web:07c5d1b2b547a27b5d1539",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "sih-2026-sentinel.firebasestorage.app",
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyBcvPvTtSjDnZaWkoSDCDLJL4joX-W6VBE",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "sih-2026-sentinel.firebaseapp.com",
  messagingSenderId: "260719433276",
  projectNumber: "360067873630",
};
