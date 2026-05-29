import { collection, deleteDoc, doc, getDocs, query, setDoc, updateDoc, where } from "firebase/firestore";
import { db, isFirebaseConfigured, requiresFirebaseAuth } from "./firebase";
import type { Task } from "../types/worksync";

// Not a React hook: a plain predicate for whether Firestore is the backend.
const firestoreEnabled = () => isFirebaseConfigured && requiresFirebaseAuth && Boolean(db);
const localKey = (userId: string) => `worksync-tasks-${userId}`;

export async function loadTasks(userId: string): Promise<Task[]> {
  if (firestoreEnabled() && db) {
    const snap = await getDocs(query(collection(db, "tasks"), where("userId", "==", userId)));
    return snap.docs.map((item) => ({ ...item.data(), id: item.id }) as Task);
  }
  const stored = localStorage.getItem(localKey(userId));
  return stored ? (JSON.parse(stored) as Task[]) : [];
}

// Persist the full list to localStorage only in demo mode (no Firebase). In
// authenticated mode, Firestore is the source of truth.
export function persistTasks(userId: string, tasks: Task[]) {
  if (!isFirebaseConfigured) localStorage.setItem(localKey(userId), JSON.stringify(tasks));
}

export async function addTask(task: Task) {
  if (firestoreEnabled() && db) await setDoc(doc(db, "tasks", task.id), task);
}

export async function updateTaskDone(id: string, done: boolean) {
  if (firestoreEnabled() && db) await updateDoc(doc(db, "tasks", id), { done });
}

export async function deleteTask(id: string) {
  if (firestoreEnabled() && db) await deleteDoc(doc(db, "tasks", id));
}
