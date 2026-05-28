import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { normalizeScheduleBlocks } from "../data/demoData";
import { auth, db, isFirebaseConfigured } from "./firebase";

export function subscribeAuth(callback: (user: User | null) => void) {
  if (!isFirebaseConfigured || !auth) {
    callback(null);
    return () => undefined;
  }

  return onAuthStateChanged(auth, callback);
}

export async function loginWithEmail(email: string, password: string) {
  if (!auth) return null;
  const credential = await signInWithEmailAndPassword(auth, email, password);
  await ensureUserProfile(credential.user);
  return credential.user;
}

export async function loginWithGoogle() {
  if (!auth) return null;
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  const credential = await signInWithPopup(auth, provider);
  await ensureUserProfile(credential.user);
  return credential.user;
}

export async function registerWithEmail(name: string, email: string, password: string) {
  if (!auth) return null;
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(credential.user, { displayName: name });
  await ensureUserProfile(credential.user, name);
  return credential.user;
}

export async function logout() {
  if (auth) await signOut(auth);
}

export async function ensureUserProfile(user: User, fallbackName?: string) {
  if (!db) return;
  await Promise.all([
    setDoc(
    doc(db, "users", user.uid),
    {
      name: user.displayName || fallbackName || user.email?.split("@")[0] || "Usuario WorkSync",
      email: user.email || "",
      avatarUrl: user.photoURL || `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(user.email || user.uid)}`,
      context: "WorkSync",
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    },
    { merge: true },
    ),
    ensureUserSchedule(user.uid),
  ]);
}

async function ensureUserSchedule(userId: string) {
  if (!db) return;
  const scheduleRef = doc(db, "schedules", userId);
  const existing = await getDoc(scheduleRef);
  if (existing.exists()) return;
  await setDoc(scheduleRef, { blocks: normalizeScheduleBlocks([]) });
}
