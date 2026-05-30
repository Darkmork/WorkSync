import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { User } from "firebase/auth";
import { buildPersonalRecommendations, buildRecommendations } from "../domain/recommendations";
import { computePersonalInsights, type PersonalInsights } from "../domain/personalInsights";
import * as mutations from "../domain/mutations";
import type { GridConfig, GroupSession, Modality, PollCandidate, Recommendation, RsvpStatus, ScheduleBlock, WorkGroup, WorkSyncData } from "../types/worksync";
import { ensureUserProfile, subscribeAuth } from "./auth";
import { isFirebaseConfigured, requiresFirebaseAuth } from "./firebase";
import { commit, loadWorkSyncData } from "./worksyncRepository";

interface AppDataContextValue {
  data: WorkSyncData | null;
  loading: boolean;
  firebaseEnabled: boolean;
  isAuthenticated: boolean;
  currentUser: WorkSyncData["users"][number] | null;
  loadError: string;
  recommendations: Recommendation[];
  personalInsights: PersonalInsights | null;
  personalRecommendations: Recommendation[];
  buildGroupRecommendations: (groupId: string, durationHours: number, modality: Modality) => Recommendation[];
  updateSchedule: (blocks: ScheduleBlock[], gridConfig?: GridConfig) => Promise<void>;
  createGroup: (payload: Pick<WorkGroup, "name" | "description" | "type"> & { memberIds?: string[]; invitedEmails?: string[] }) => Promise<void>;
  updateGroup: (group: WorkGroup) => Promise<void>;
  deleteGroup: (groupId: string) => Promise<void>;
  createSessionFromRecommendation: (recommendation: Recommendation) => Promise<GroupSession>;
  markSessionConfirmed: (sessionId: string) => Promise<void>;
  setRsvp: (sessionId: string, status: RsvpStatus) => Promise<void>;
  createPoll: (input: { groupId: string; title: string; candidates: PollCandidate[] }) => Promise<void>;
  castVote: (pollId: string, candidateId: string) => Promise<void>;
  closePoll: (pollId: string) => Promise<void>;
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

  const authProfile = useMemo(
    () =>
      authUser
        ? {
            id: authUser.uid,
            name: authUser.displayName || authUser.email?.split("@")[0] || "Usuario WorkSync",
            email: authUser.email || "",
            avatarUrl: authUser.photoURL || `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(authUser.email || authUser.uid)}`,
            context: "WorkSync",
          }
        : null,
    [authUser],
  );

  const currentUser = useMemo(
    () => data?.users.find((user) => user.id === effectiveUserId) ?? authProfile ?? null,
    [data, effectiveUserId, authProfile],
  );

  const primaryGroup = useMemo(
    () => data?.groups.find((group) => group.status === "active") ?? data?.groups[0],
    [data],
  );

  const recommendations = useMemo(
    () => (data && primaryGroup ? buildRecommendations(primaryGroup, data.schedules, 2, "hybrid") : []),
    [data, primaryGroup],
  );

  // The current user's own schedule, used to power the personal (group-less)
  // insights and recommendations.
  const personalSchedule = useMemo(
    () => data?.schedules.find((schedule) => schedule.userId === effectiveUserId) ?? null,
    [data, effectiveUserId],
  );

  const personalInsights = useMemo(() => computePersonalInsights(personalSchedule), [personalSchedule]);

  const personalRecommendations = useMemo(
    () => buildPersonalRecommendations(personalSchedule, 2, "hybrid"),
    [personalSchedule],
  );

  // Thin adapter: wire React state -> pure mutation module -> persistence seam.
  // Memoized so context consumers don't re-render unless a dependency changes.
  const value = useMemo<AppDataContextValue>(
    () => ({
      data,
      loading,
      loadError,
      firebaseEnabled: isFirebaseConfigured,
      isAuthenticated: !isFirebaseConfigured || !requiresFirebaseAuth || Boolean(authUser),
      currentUser,
      recommendations,
      personalInsights,
      personalRecommendations,
      buildGroupRecommendations: (groupId, durationHours, modality) => {
        const group = data?.groups.find((item) => item.id === groupId);
        return data && group ? buildRecommendations(group, data.schedules, durationHours, modality) : [];
      },
      updateSchedule: async (blocks, gridConfig) => {
        if (!data || !effectiveUserId) return;
        setData(await commit(mutations.saveSchedule(data, effectiveUserId, blocks, gridConfig)));
      },
      createGroup: async (payload) => {
        if (!data || !effectiveUserId) return;
        setData(await commit(mutations.createGroup(data, effectiveUserId, currentUser?.email, payload)));
      },
      updateGroup: async (group) => {
        if (!data) return;
        setData(await commit(mutations.updateGroup(data, group, currentUser?.email)));
      },
      deleteGroup: async (groupId) => {
        if (!data) return;
        setData(await commit(mutations.deleteGroup(data, groupId)));
      },
      createSessionFromRecommendation: async (recommendation) => {
        if (!data) throw new Error("App data is not ready");
        const result = mutations.createSessionFromRecommendation(data, recommendation);
        setData(await commit(result));
        return result.session;
      },
      markSessionConfirmed: async (sessionId) => {
        if (!data) return;
        setData(await commit(mutations.confirmSession(data, sessionId)));
      },
      setRsvp: async (sessionId, status) => {
        if (!data || !effectiveUserId) return;
        setData(await commit(mutations.setRsvp(data, sessionId, effectiveUserId, status)));
      },
      createPoll: async (input) => {
        if (!data || !effectiveUserId) return;
        setData(await commit(mutations.createPoll(data, effectiveUserId, input)));
      },
      castVote: async (pollId, candidateId) => {
        if (!data || !effectiveUserId) return;
        setData(await commit(mutations.castVote(data, pollId, effectiveUserId, candidateId)));
      },
      closePoll: async (pollId) => {
        if (!data) return;
        setData(await commit(mutations.closePoll(data, pollId)));
      },
    }),
    [
      data,
      loading,
      loadError,
      authUser,
      currentUser,
      recommendations,
      personalInsights,
      personalRecommendations,
      effectiveUserId,
    ],
  );

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
