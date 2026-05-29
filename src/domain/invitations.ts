import type { WorkGroup } from "../types/worksync";
import type { WriteOp } from "./mutations";

export interface InvitationResolution {
  groups: WorkGroup[];
  writes: WriteOp[];
}

// A user invited by email auto-joins on load: add their uid to memberIds and
// remove their email from invitedEmails. Pure — the caller persists the writes
// and may tolerate write failures while still showing the updated groups.
export function resolveInvitations(groups: WorkGroup[], userId: string, email: string): InvitationResolution {
  const lowerEmail = email.toLowerCase();
  const writes: WriteOp[] = [];
  const resolved = groups.map((group) => {
    const memberIds = group.memberIds ?? [];
    const invited = group.invitedEmails ?? [];
    const isMember = memberIds.includes(userId);
    const isInvited = lowerEmail !== "" && invited.some((entry) => entry.toLowerCase() === lowerEmail);
    if (isInvited && !isMember) {
      const nextMembers = [...memberIds, userId];
      const nextInvited = invited.filter((entry) => entry.toLowerCase() !== lowerEmail);
      writes.push({
        kind: "update",
        collection: "groups",
        id: group.id,
        value: { memberIds: nextMembers, invitedEmails: nextInvited },
      });
      return { ...group, memberIds: nextMembers, invitedEmails: nextInvited };
    }
    return group;
  });
  return { groups: resolved, writes };
}
