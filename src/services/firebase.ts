// Firebase Modular Initialization
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

export const firebaseConfig = {
  apiKey: "AIzaSyCACuwMyho55QR33trHnft9kZyYxHRQmeQ",
  authDomain: "sims-licensing.firebaseapp.com",
  projectId: "sims-licensing",
  storageBucket: "sims-licensing.firebasestorage.app",
  messagingSenderId: "604400141532",
  appId: "1:604400141532:web:e0ed408f476bf739202019"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
