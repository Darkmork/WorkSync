import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { User } from "firebase/auth";
import { createDefaultSchedule } from "../data/demoData";
import { buildRecommendations } from "../domain/recommendations";
import type { GroupSession, Modality, Recommendation, ScheduleBlock, WorkGroup, WorkSyncData } from "../types/worksync";
import { ensureUserProfile, subscribeAuth } from "./auth";
import { isFirebaseConfigured, requiresFirebaseAuth } from "./firebase";
import { confirmSession, deleteGroup as removeGroup, loadWorkSyncData, saveGroup, saveSchedule, saveSession, updateGroup as persistGroup } from "./worksyncRepository";

interface AppDataContextValue {
  data: WorkSyncData | null;
  loading: boolean;
  firebaseEnabled: boolean;
  isAuthenticated: boolean;
  currentUser: WorkSyncData["users"][number] | null;
  loadError: string;
  recommendations: Recommendation[];
  buildGroupRecommendations: (groupId: string, durationHours: number, modality: Modality) => Recommendation[];
  updateSchedule: (blocks: ScheduleBlock[]) => Promise<void>;
  createGroup: (payload: Pick<WorkGroup, "name" | "description" | "type"> & { memberIds?: string[]; invitedEmails?: string[] }) => Promise<void>;
  updateGroup: (group: WorkGroup) => Promise<void>;
  deleteGroup: (groupId: string) => Promise<void>;
  createSessionFromRecommendation: (recommendation: Recommendation) => Promise<GroupSession>;
  markSessionConfirmed: (sessionId: string) => Promise<void>;
}

const AppDataContext = createContext<AppDataContextValue | null>(null);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<WorkSyncData | null>(null);
  const [loading, setLoading] = useState(true);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(!isFirebaseConfigured || !requiresFirebaseAuth);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    if (isFirebaseConfigured && !requiresFirebaseAuth) return;
    return subscribeAuth((user) => {
      setAuthUser(user);
      setAuthReady(true);
      if (user) void ensureUserProfile(user);
    });
  }, []);

  useEffect(() => {
    if (isFirebaseConfigured && !authReady) return;
    if (isFirebaseConfigured && requiresFirebaseAuth && !authUser) {
      setData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError("");
    withTimeout(loadWorkSyncData(authUser?.uid, authUser?.email ?? undefined), 8000)
      .then(setData)
      .catch((error) => {
        setLoadError(error instanceof Error ? error.message : "No se pudo cargar Firestore.");
      })
      .finally(() => setLoading(false));
  }, [authReady, authUser]);

  const effectiveUserId = isFirebaseConfigured && requiresFirebaseAuth && authUser ? authUser.uid : data?.currentUserId;
  const authProfile = authUser
    ? {
        id: authUser.uid,
        name: authUser.displayName || authUser.email?.split("@")[0] || "Usuario WorkSync",
        email: authUser.email || "",
        avatarUrl: authUser.photoURL || `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(authUser.email || authUser.uid)}`,
        context: "WorkSync",
      }
    : null;
  const currentUser = data?.users.find((user) => user.id === effectiveUserId) ?? authProfile ?? null;
  const primaryGroup = data?.groups.find((group) => group.status === "active") ?? data?.groups[0];
  const recommendations = useMemo(
    () => (data && primaryGroup ? buildRecommendations(primaryGroup, data.schedules, 2, "hybrid") : []),
    [data, primaryGroup],
  );

  const value: AppDataContextValue = {
    data,
    loading,
    loadError,
    firebaseEnabled: isFirebaseConfigured,
    isAuthenticated: !isFirebaseConfigured || !requiresFirebaseAuth || Boolean(authUser),
    currentUser,
    recommendations,
    buildGroupRecommendations: (groupId, durationHours, modality) => {
      const group = data?.groups.find((item) => item.id === groupId);
      return data && group ? buildRecommendations(group, data.schedules, durationHours, modality) : [];
    },
    updateSchedule: async (blocks) => {
      if (!data || !effectiveUserId) return;
      const next = await saveSchedule(effectiveUserId, blocks, {
        ...data,
        schedules: data.schedules.some((schedule) => schedule.userId === effectiveUserId)
          ? data.schedules
          : [...data.schedules, createDefaultSchedule(effectiveUserId)],
      });
      setData(next);
    },
    createGroup: async (payload) => {
      if (!data || !effectiveUserId) return;
      const memberIds = Array.from(new Set([effectiveUserId, ...(payload.memberIds ?? [])]));
      const ownEmail = currentUser?.email?.toLowerCase();
      const invitedEmails = Array.from(
        new Set((payload.invitedEmails ?? []).map((entry) => entry.trim().toLowerCase()).filter((entry) => entry && entry !== ownEmail)),
      );
      const group: WorkGroup = {
        id: `g-${Date.now()}`,
        name: payload.name,
        description: payload.description,
        type: payload.type,
        color: payload.type === "study" ? "#0058be" : "#006b2c",
        ownerId: effectiveUserId,
        memberIds,
        invitedEmails,
        status: "active",
      };
      const next = await saveGroup(group, data);
      setData(next);
    },
    updateGroup: async (group) => {
      if (!data) return;
      const ownEmail = currentUser?.email?.toLowerCase();
      const invitedEmails = Array.from(
        new Set((group.invitedEmails ?? []).map((entry) => entry.trim().toLowerCase()).filter((entry) => entry && entry !== ownEmail)),
      );
      const next = await persistGroup({ ...group, invitedEmails }, data);
      setData(next);
    },
    deleteGroup: async (groupId) => {
      if (!data) return;
      const next = await removeGroup(groupId, data);
      setData(next);
    },
    createSessionFromRecommendation: async (recommendation) => {
      if (!data) throw new Error("App data is not ready");
      const group = data.groups.find((item) => item.id === recommendation.groupId);
      const session: GroupSession = {
        id: `s-${Date.now()}`,
        groupId: recommendation.groupId,
        title: group ? `Sesion ${group.name}` : "Sesion WorkSync",
        dateLabel: recommendation.dateLabel,
        dateISO: recommendation.dateISO,
        start: recommendation.start,
        end: recommendation.end,
        modality: recommendation.modality,
        location:
          recommendation.modality === "remote"
            ? "Google Meet"
            : recommendation.modality === "in_person"
              ? "Biblioteca central"
              : "Biblioteca central + Meet",
        status: "proposed",
        score: recommendation.score,
        justification: recommendation.justification,
      };
      const next = await saveSession(session, data);
      setData(next);
      return session;
    },
    markSessionConfirmed: async (sessionId) => {
      if (!data) return;
      const next = await confirmSession(sessionId, data);
      setData(next);
    },
  };

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => reject(new Error("Firestore tardo demasiado en responder. Revisa conexion o reglas.")), timeoutMs);
    promise
      .then((value) => {
        window.clearTimeout(timeout);
        resolve(value);
      })
      .catch((error) => {
        window.clearTimeout(timeout);
        reject(error);
      });
  });
}

export function useAppData() {
  const context = useContext(AppDataContext);
  if (!context) throw new Error("useAppData must be used inside AppDataProvider");
  return context;
}
