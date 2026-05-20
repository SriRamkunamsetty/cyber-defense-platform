// Firebase Client SDK — TRINETRA AI Authentication
import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User as FirebaseUser,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDhqxMy_mm_C9yk8MUf-Qf5PKE-aAKPCVw",
  authDomain: "iithyderabad-apk.firebaseapp.com",
  projectId: "iithyderabad-apk",
  storageBucket: "iithyderabad-apk.firebasestorage.app",
  messagingSenderId: "938147400184",
  appId: "1:938147400184:web:ceacf0df69f107a7f6ee0d",
  measurementId: "G-CNVFY0EFP6",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

const googleProvider = new GoogleAuthProvider();
googleProvider.addScope("email");
googleProvider.addScope("profile");

/** Sign in with Google popup */
export async function signInWithGoogle(): Promise<FirebaseUser> {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

/** Sign in with email/password */
export async function signInWithEmail(
  email: string,
  password: string
): Promise<FirebaseUser> {
  const result = await signInWithEmailAndPassword(auth, email, password);
  return result.user;
}

/** Register with email/password */
export async function registerWithEmail(
  email: string,
  password: string
): Promise<FirebaseUser> {
  const result = await createUserWithEmailAndPassword(auth, email, password);
  return result.user;
}

/** Sign out */
export async function signOut(): Promise<void> {
  await firebaseSignOut(auth);
}

/** Get current user's ID token for API calls */
export async function getIdToken(): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;
  return user.getIdToken();
}

/** Subscribe to auth state changes */
export function onAuthChange(
  callback: (user: FirebaseUser | null) => void
): () => void {
  return onAuthStateChanged(auth, callback);
}

export type { FirebaseUser };
