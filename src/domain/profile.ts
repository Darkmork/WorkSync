import type { UserProfile, WorkSyncData } from "../types/worksync";
import type { MutationResult } from "./mutations";

export function updateProfile(
  data: WorkSyncData,
  userId: string,
  updates: Partial<Pick<UserProfile, "name" | "avatarUrl" | "context">>
): MutationResult {
  return {
    next: {
      ...data,
      users: data.users.map((u) => (u.id === userId ? { ...u, ...updates } : u)),
    },
    write: { kind: "update", collection: "users", id: userId, value: updates as Record<string, unknown> },
  };
}
