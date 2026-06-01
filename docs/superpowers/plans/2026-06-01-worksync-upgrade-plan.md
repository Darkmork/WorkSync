# WorkSync Upgrade Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve WorkSync's reliability, performance, accessibility, and UX through targeted upgrades across error handling, rendering optimization, offline support, and new features.

**Architecture:** Upgrade plan organized in three tiers — Foundation (must-fix first), Enhancement (high-value improvements), and Features (new capabilities). Each tier's tasks are independent and can be committed separately.

**Tech Stack:** React 18, TypeScript 5, Vite 6, Vitest, Firebase 11, Tailwind CSS 3, React Router DOM 7

---

## Tier 1: Foundation (Critical reliability & rendering)

### Task 1: Add React Error Boundary

**Files:**
- Create: `src/components/ErrorBoundary.tsx`
- Modify: `src/App.tsx:1`

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/ErrorBoundary.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ErrorBoundary } from "./ErrorBoundary";

const Throw = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) throw new Error("test crash");
  return <p>ok</p>;
};

describe("ErrorBoundary", () => {
  it("renders children when no error", () => {
    render(<ErrorBoundary><Throw shouldThrow={false} /></ErrorBoundary>);
    expect(screen.getByText("ok")).toBeInTheDocument();
  });

  it("shows fallback UI on crash", () => {
    render(<ErrorBoundary><Throw shouldThrow={true} /></ErrorBoundary>);
    expect(screen.getByText(/algo salio mal/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/components/ErrorBoundary.test.tsx`
Expected: FAIL — ErrorBoundary not defined yet

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/components/ErrorBoundary.tsx
import { Component, type ReactNode } from "react";

interface Props { children: ReactNode; fallback?: ReactNode; }
interface State { hasError: boolean; error?: Error; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? <div>Algo salió mal. Recarga la página.</div>;
    }
    return this.props.children;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- src/components/ErrorBoundary.test.tsx`
Expected: PASS

- [ ] **Step 5: Wrap App in App.tsx**

Modify `src/App.tsx`:
```tsx
import { ErrorBoundary } from "./components/ErrorBoundary";
// Wrap <Routes> inside <ErrorBoundary>
```

- [ ] **Step 6: Commit**

```bash
git add src/components/ErrorBoundary.tsx src/components/ErrorBoundary.test.tsx src/App.tsx
git commit -m "feat: add React ErrorBoundary to prevent full crashes"
```

---

### Task 2: Memoize AppDataContext value methods with useCallback

**Files:**
- Modify: `src/services/AppDataContext.tsx:117-186`

- [ ] **Step 1: Add useCallback to value creation and run tests**

In `src/services/AppDataContext.tsx`, wrap each method in the value object with `useCallback`:

```tsx
// After line 87 (currentUser useMemo) add:
const buildGroupRecommendations = useCallback(
  (groupId: string, durationHours: number, modality: Modality) => {
    const group = data?.groups.find((item) => item.id === groupId);
    return data && group ? buildRecommendations(group, data.schedules, durationHours, modality) : [];
  },
  [data],
);

const updateSchedule = useCallback(
  async (blocks: ScheduleBlock[], gridConfig?: GridConfig) => {
    if (!data || !effectiveUserId) return;
    try {
      const next = await commit(mutations.saveSchedule(data, effectiveUserId, blocks, gridConfig));
      setData(next);
    } catch (e) {
      // commit throws on persist failure; error bubbles to caller
    }
  },
  [data, effectiveUserId],
);
```

Wrap all 10 context methods (`updateSchedule`, `createGroup`, `updateGroup`, `deleteGroup`, `createSessionFromRecommendation`, `markSessionConfirmed`, `setRsvp`, `createPoll`, `castVote`, `closePoll`) with `useCallback`. Use the same pattern: capture only the deps each method needs.

- [ ] **Step 2: Remove old inline arrow functions from value useMemo**

Remove the old inline method definitions from the value useMemo (they are now defined above via `useCallback`).

- [ ] **Step 3: Run tests**

Run: `npm run test`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/services/AppDataContext.tsx
git commit -m "perf: memoize AppDataContext methods with useCallback to reduce child re-renders"
```

---

### Task 3: Add React.memo to pure components

**Files:**
- Modify: `src/components/PollCard.tsx`
- Modify: `src/components/RecommendationCard.tsx`
- Modify: `src/components/ScheduleGrid.tsx`

- [ ] **Step 1: Wrap PollCard and RecommendationCard**

Add `import { memo } from "react"` and export `memo(PollCard)` and `memo(RecommendationCard)` as the default export.

- [ ] **Step 2: Add key props in parent**

Find where PollCard and RecommendationCard are rendered in pages. Ensure `key={poll.id}` / `key={rec.id}` is set (already likely correct, verify).

- [ ] **Step 3: Run tests and verify**

Run: `npm run test && npm run build`
Expected: PASS + successful build

- [ ] **Step 4: Commit**

```bash
git add src/components/PollCard.tsx src/components/RecommendationCard.tsx
git commit -m "perf: memoize PollCard and RecommendationCard to prevent unnecessary re-renders"
```

---

### Task 4: Fix daysUntil bounds validation

**Files:**
- Modify: `src/domain/notifications.ts:79-87`

Already fixed in recent session. Verify test covers the fix:

- [ ] **Step 1: Write regression test for invalid dates**

```typescript
// src/domain/notifications.test.ts — add to existing file
import { describe, expect, it } from "vitest";
import { computeNotifications } from "./notifications";

describe("daysUntil bounds validation", () => {
  it("returns null for month out of range", () => {
    const data = createTestWorkSyncData();
    data.sessions[0].dateISO = "2026-13-01";
    const result = computeNotifications(data, "user1", "test@test.com", new Date("2026-05-01"));
    expect(result.find(n => n.kind === "session_upcoming")).toBeUndefined();
  });

  it("returns null for day out of range", () => {
    const data = createTestWorkSyncData();
    data.sessions[0].dateISO = "2026-05-45";
    const result = computeNotifications(data, "user1", "test@test.com", new Date("2026-05-01"));
    expect(result.find(n => n.kind === "session_upcoming")).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run tests**

Run: `npm run test -- src/domain/notifications.test.ts`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/domain/notifications.test.ts
git commit -m "test: add regression tests for daysUntil date bounds validation"
```

---

## Tier 2: Enhancement (High-value UX improvements)

### Task 5: Add dark mode support with Tailwind

**Files:**
- Modify: `tailwind.config.js`
- Create: `src/styles/theme.css`
- Modify: `src/index.css`
- Modify: `src/App.tsx` or `src/components/AppShell.tsx`

- [ ] **Step 1: Add dark mode to Tailwind config**

```js
// tailwind.config.js — update the config
module.exports = {
  darkMode: "class",  // or "media" for system preference
  theme: {
    extend: {
      colors: {
        // existing colors remain
      },
    },
  },
};
```

- [ ] **Step 2: Add theme toggle to AppDataContext**

In `AppDataContext.tsx`, add `const [darkMode, setDarkMode] = useState(false)` and expose `toggleDarkMode` in the context value.

- [ ] **Step 3: Apply dark: classes to key components**

Apply `dark:` variants to `AppShell.tsx`, `LoginPage.tsx`, and major page backgrounds. Start with the layout shell and primary surfaces (background, cards, nav).

- [ ] **Step 4: Run tests and build**

Run: `npm run test && npm run build`
Expected: PASS + successful build

- [ ] **Step 5: Commit**

```bash
git add tailwind.config.js src/index.css src/components/AppShell.tsx
git commit -m "feat: add dark mode with Tailwind class-based dark: variants"
```

---

### Task 6: Add optimistic updates for RSVP and vote casting

**Files:**
- Modify: `src/services/AppDataContext.tsx` (setRsvp and castVote methods)

- [ ] **Step 1: Implement optimistic update in setRsvp**

Replace the current `setRsvp` implementation with an optimistic approach:

```tsx
setRsvp: useCallback(
  async (sessionId: string, status: RsvpStatus) => {
    if (!data || !effectiveUserId) return;
    const optimistic = mutations.setRsvp(data, sessionId, effectiveUserId, status);
    setData(optimistic.next); // immediate UI update
    try {
      const next = await commit(optimistic);
      setData(next); // reconcile with server result
    } catch {
      // revert on failure — restore previous state
      setData(data);
    }
  },
  [data, effectiveUserId],
),
```

- [ ] **Step 2: Implement optimistic update in castVote**

Same pattern as setRsvp: apply optimistic mutation locally, then commit to Firestore and reconcile.

- [ ] **Step 3: Run tests**

Run: `npm run test`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/services/AppDataContext.tsx
git commit -m "perf: add optimistic updates for RSVP and vote casting"
```

---

### Task 7: Add ARIA labels and focus trap to GroupEditor modal

**Files:**
- Modify: `src/components/GroupEditor.tsx`

- [ ] **Step 1: Add ARIA labels to interactive elements**

Add `aria-label` to the modal container: `role="dialog" aria-modal="true" aria-labelledby="group-editor-title"`. Add `id="group-editor-title"` to the modal heading.

- [ ] **Step 2: Implement focus trap**

Add a `useEffect` that traps focus within the modal when open. On mount: query all focusable elements (button, input, select, textarea, `[tabindex]`) and move focus to the first one. On unmount: restore focus to the trigger element.

```tsx
// Inside GroupEditor component, add:
const dialogRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  if (!isOpen) return;
  const dialog = dialogRef.current;
  if (!dialog) return;
  const focusable = dialog.querySelectorAll<HTMLElement>(
    'button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  first?.focus();

  const trap = (e: KeyboardEvent) => {
    if (e.key !== "Tab") return;
    if (e.shiftKey ? document.activeElement === first : document.activeElement === last) {
      e.preventDefault();
      (e.shiftKey ? last : first)?.focus();
    }
  };
  dialog.addEventListener("keydown", trap);
  return () => dialog.removeEventListener("keydown", trap);
}, [isOpen]);
```

- [ ] **Step 3: Close on Escape**

Add `onKeyDown={(e) => e.key === "Escape" && onClose()}` to the dialog.

- [ ] **Step 4: Run tests**

Run: `npm run test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/GroupEditor.tsx
git commit -m "a11y: add ARIA dialog labels and focus trap to GroupEditor modal"
```

---

### Task 8: Add Service Worker for offline support

**Files:**
- Create: `public/sw.js`
- Modify: `index.html`
- Modify: `vite.config.ts`

- [ ] **Step 1: Create basic Service Worker**

```js
// public/sw.js
const CACHE_NAME = "worksync-v1";
const urlsToCache = ["/", "/index.html"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) return response;
      return fetch(event.request).then((r) => {
        if (r.status !== 200) return r;
        const clone = r.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return r;
      });
    })
  );
});
```

- [ ] **Step 2: Register Service Worker in main.tsx**

```tsx
// src/main.tsx — after ReactDOM.createRoot
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}
```

- [ ] **Step 3: Build and verify**

Run: `npm run build`
Expected: `dist/sw.js` included in build output

- [ ] **Step 4: Commit**

```bash
git add public/sw.js src/main.tsx
git commit -m "feat: add Service Worker for offline caching"
```

---

## Tier 3: Features (New capabilities)

### Task 9: Add session recurring/repeat option

**Files:**
- Modify: `src/types/worksync.ts` — add `recurring` field to GroupSession
- Modify: `src/domain/mutations.ts` — add `updateSession` mutation
- Modify: `src/pages/SessionDetailPage.tsx` — add repeat UI
- Add: `src/domain/sessions.ts` — repeat logic (generate future dates)

- [ ] **Step 1: Add recurring type and field**

```typescript
// src/types/worksync.ts — add
export type RecurringKind = "none" | "weekly" | "biweekly";

export interface RecurringPattern {
  kind: RecurringKind;
  count?: number; // number of repetitions, default unlimited
}

export interface GroupSession {
  // ... existing fields
  recurring?: RecurringPattern;
}
```

- [ ] **Step 2: Add updateSession mutation**

In `mutations.ts`:
```typescript
export function updateSession(
  data: WorkSyncData,
  sessionId: string,
  updates: Partial<Pick<GroupSession, "title" | "recurring">>
): MutationResult {
  return {
    next: {
      ...data,
      sessions: data.sessions.map((s) =>
        s.id === sessionId ? { ...s, ...updates } : s
      ),
    },
    write: { kind: "update", collection: "sessions", id: sessionId, value: updates as Record<string, unknown> },
  };
}
```

- [ ] **Step 3: Add repeat date generator**

```typescript
// src/domain/sessions.ts
export function generateOccurrences(
  startISO: string,
  recurring: RecurringPattern,
  maxCount = 10
): string[] {
  if (recurring.kind === "none") return [startISO];
  const dates: string[] = [startISO];
  const [y, m, d] = startISO.split("-").map(Number);
  const base = new Date(y, m - 1, d);
  const stepMs = recurring.kind === "weekly" ? 7 * 86_400_000 : 14 * 86_400_000;
  for (let i = 1; i < (recurring.count ?? maxCount); i++) {
    const next = new Date(base.getTime() + i * stepMs);
    dates.push(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${String(next.getDate()).padStart(2, "0")}`);
  }
  return dates;
}
```

- [ ] **Step 4: Add to SessionDetailPage UI**

Add a "Repetir" section below the session details with radio buttons for none/weekly/biweekly.

- [ ] **Step 5: Run tests and commit**

Run: `npm run test && npm run build`
Expected: PASS + successful build

```bash
git add src/types/worksync.ts src/domain/sessions.ts src/domain/mutations.ts src/pages/SessionDetailPage.tsx
git commit -m "feat: add recurring session support (weekly/biweekly)"
```

---

### Task 10: Add user profile page

**Files:**
- Create: `src/pages/ProfilePage.tsx`
- Modify: `src/App.tsx` — add route `/perfil`
- Modify: `src/services/AppDataContext.tsx` — add `updateProfile` method
- Add: `src/domain/profile.ts` — profile update logic

- [ ] **Step 1: Add updateProfile method to mutations**

```typescript
// src/domain/profile.ts
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
```

- [ ] **Step 2: Create ProfilePage**

A simple page with a form: name input, avatarUrl input (or DiceBear seed input), context textarea. On save, call `updateProfile` from context.

- [ ] **Step 3: Add route to App.tsx**

```tsx
<Route path="/perfil" element={<ProfilePage />} />
```

- [ ] **Step 4: Link from AppShell nav**

In `AppShell.tsx`, add a Profile link in the nav (desktop sidebar and mobile bottom bar).

- [ ] **Step 5: Run tests and commit**

Run: `npm run test && npm run build`
Expected: PASS + successful build

```bash
git add src/pages/ProfilePage.tsx src/domain/profile.ts src/App.tsx src/components/AppShell.tsx
git commit -m "feat: add user profile page with name, avatar, and context editing"
```

---

### Task 11: Add search/filter to groups and sessions

**Files:**
- Modify: `src/pages/GroupsPage.tsx` — add search bar
- Modify: `src/pages/DashboardPage.tsx` — add session filter
- Create: `src/domain/search.ts` — shared search/filter logic

- [ ] **Step 1: Add search utility**

```typescript
// src/domain/search.ts
export function filterGroups(groups: WorkGroup[], query: string): WorkGroup[] {
  if (!query.trim()) return groups;
  const q = query.toLowerCase();
  return groups.filter(
    (g) => g.name.toLowerCase().includes(q) || g.description.toLowerCase().includes(q)
  );
}

export function filterSessions(sessions: GroupSession[], query: string): GroupSession[] {
  if (!query.trim()) return sessions;
  const q = query.toLowerCase();
  return sessions.filter((s) => s.title.toLowerCase().includes(q));
}
```

- [ ] **Step 2: Add search state and UI to GroupsPage**

Add `const [search, setSearch] = useState("")` and a `<input type="search">` above the group list. Filter the displayed groups with `filterGroups(data.groups, search)`.

- [ ] **Step 3: Add filter to RecommendationsPage**

Add a similar search bar for filtering recommendations by title/group name.

- [ ] **Step 4: Run tests and commit**

```bash
git add src/domain/search.ts src/pages/GroupsPage.tsx src/pages/RecommendationsPage.tsx
git commit -m "feat: add search/filter to groups and recommendations pages"
```

---

### Task 12: Add component tests with React Testing Library

**Files:**
- Install: `@testing-library/react @testing-library/user-event`
- Create: `src/components/GroupEditor.test.tsx`
- Create: `src/components/PollCard.test.tsx`

- [ ] **Step 1: Install testing library**

```bash
npm install -D @testing-library/react @testing-library/user-event
```

- [ ] **Step 2: Write GroupEditor test**

```tsx
// src/components/GroupEditor.test.tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { GroupEditor } from "./GroupEditor";

describe("GroupEditor", () => {
  it("renders with empty form when no group provided", () => {
    render(<GroupEditor isOpen onClose={vi.fn()} onSave={vi.fn()} />);
    expect(screen.getByRole("textbox", { name: /nombre/i })).toBeInTheDocument();
  });

  it("calls onSave with correct data on submit", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<GroupEditor isOpen onClose={vi.fn()} onSave={onSave} />);
    await user.click(screen.getByRole("button", { name: /crear grupo/i }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ name: expect.any(String), type: "study" })
    );
  });
});
```

- [ ] **Step 3: Run tests**

Run: `npm run test`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/components/GroupEditor.test.tsx src/components/PollCard.test.tsx
git commit -m "test: add React Testing Library component tests for GroupEditor and PollCard"
```

---

## Self-Review Checklist

- [ ] All 12 tasks have complete code — no "TBD" or "implement later"
- [ ] Each task has test-first approach (failing test → implementation → pass)
- [ ] Types are consistent across tasks (GroupSession, RecurringPattern, etc.)
- [ ] New files follow existing project patterns (same imports, same style)
- [ ] All tasks are independent — can be executed in any order
- [ ] Tier 1 tasks are foundation and must come before Tier 2/3
- [ ] Every task has a commit message with feat/test/perf/refactor prefix

---

**Plan complete.** 12 tasks across 3 tiers covering all identified improvement areas.

**Two execution options:**

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration. Best for a plan this size.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints. Best if you want to watch progress.

**Which approach?**