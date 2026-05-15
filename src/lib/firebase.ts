import { initializeApp, getApps } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
};

const hasConfig = Object.values(config).every(Boolean);

const app = hasConfig
  ? getApps()[0] ?? initializeApp(config as Record<string, string>)
  : null;

const auth = app ? getAuth(app) : null;
const googleProvider = new GoogleAuthProvider();

export const firebaseEnabled = Boolean(auth);

export async function firebaseSignUp(email: string, password: string) {
  if (!auth) throw new Error("Firebase is not configured.");
  return createUserWithEmailAndPassword(auth, email, password);
}

export async function firebaseSignIn(email: string, password: string) {
  if (!auth) throw new Error("Firebase is not configured.");
  return signInWithEmailAndPassword(auth, email, password);
}

export async function firebaseSignInWithGoogle() {
  if (!auth) throw new Error("Firebase is not configured.");
  return signInWithPopup(auth, googleProvider);
}

export async function firebaseSignOut() {
  if (!auth) return;
  await signOut(auth);
}

export function subscribeAuth(cb: (user: User | null) => void) {
  if (!auth) return () => undefined;
  return onAuthStateChanged(auth, cb);
}
