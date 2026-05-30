import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "./firebase";
import type { NotificationKind } from "../domain/notifications";

// A notification as persisted by the Cloud Functions backend. `read` and the
// optional server timestamp are added on the server; everything else mirrors the
// derived `AppNotification` shape so the bell can render either source.
export interface StoredNotification {
  id: string;
  kind: NotificationKind | "session_confirmed";
  title: string;
  detail: string;
  to?: string;
  read: boolean;
}

// Subscribe to the signed-in user's inbox. Returns an unsubscribe function; if
// Firebase is not configured the call is a no-op so local/demo mode still works.
export function subscribeNotifications(
  uid: string,
  onChange: (items: StoredNotification[]) => void,
): () => void {
  if (!isFirebaseConfigured || !db) return () => {};

  const items = query(
    collection(db, "notifications", uid, "items"),
    orderBy("createdAt", "desc"),
    limit(30),
  );

  return onSnapshot(
    items,
    (snapshot) => {
      const next = snapshot.docs.map((document) => {
        const value = document.data();
        return {
          id: document.id,
          kind: value.kind,
          title: value.title,
          detail: value.detail,
          to: value.to,
          read: value.read === true,
        } as StoredNotification;
      });
      onChange(next);
    },
    () => onChange([]),
  );
}

export async function markNotificationRead(uid: string, id: string): Promise<void> {
  if (!isFirebaseConfigured || !db) return;
  await updateDoc(doc(db, "notifications", uid, "items", id), { read: true });
}
