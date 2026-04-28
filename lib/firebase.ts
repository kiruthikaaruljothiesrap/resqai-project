import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

let app: any;
let analyticsInstance: any = null;
let authInstance: any = null;
let dbInstance: any = null;
let storageInstance: any = null;

if (firebaseConfig.projectId && firebaseConfig.projectId !== "YOUR_PROJECT_ID") {
  app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  
  // These can run on server or client
  try { dbInstance = getFirestore(app); } catch (e) { console.error("Firestore init error:", e); }
  try { authInstance = getAuth(app); } catch (e) { console.error("Auth init error:", e); }
  try { storageInstance = getStorage(app); } catch (e) { console.error("Storage init error:", e); }


  // Analytics only works on the client
  if (typeof window !== "undefined") {
    try { analyticsInstance = getAnalytics(app); } catch (e) {}
  }
}

export const analytics = analyticsInstance;
export const auth = authInstance;
export const db = dbInstance;
export const storage = storageInstance;
export default app;