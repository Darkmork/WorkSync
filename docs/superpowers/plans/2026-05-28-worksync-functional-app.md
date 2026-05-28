# WorkSync Functional App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a functional React + Firebase WorkSync web app from the existing MD product docs and `worksync_definitive` UI references.

**Architecture:** A Vite React SPA with React Router, Tailwind, Firebase Auth/Firestore services, and pure TypeScript domain logic for recommendations. Demo data is bundled for local use when Firebase env vars are missing.

**Tech Stack:** React, TypeScript, Vite, Tailwind CSS, React Router, Firebase, Vitest-ready project structure.

---

### Task 1: Project Foundation

**Files:**
- Create `package.json`, `index.html`, `vite.config.ts`, `tsconfig.json`, `tailwind.config.js`, `postcss.config.js`, `firebase.json`, `.firebaserc.example`, `.env.example`
- Create `src/main.tsx`, `src/App.tsx`, `src/index.css`

- [x] Add Vite, React, Tailwind, Firebase, and routing configuration.
- [x] Define WorkSync design tokens in Tailwind.
- [x] Add Firebase Hosting config.

### Task 2: Domain And Data

**Files:**
- Create `src/types/worksync.ts`
- Create `src/data/demoData.ts`
- Create `src/domain/recommendations.ts`

- [x] Define typed users, schedule blocks, groups, recommendations, and sessions.
- [x] Seed demo users, schedules, groups, and sessions.
- [x] Implement deterministic recommendation scoring.

### Task 3: Firebase Services

**Files:**
- Create `src/services/firebase.ts`
- Create `src/services/auth.ts`
- Create `src/services/worksyncRepository.ts`
- Create `src/services/AppDataContext.tsx`

- [x] Detect whether Firebase env vars are available.
- [x] Support auth and Firestore when configured.
- [x] Fall back to demo data locally.

### Task 4: Shared UI

**Files:**
- Create `src/components/AppShell.tsx`
- Create `src/components/Logo.tsx`
- Create `src/components/ScheduleGrid.tsx`
- Create `src/components/RecommendationCard.tsx`

- [x] Build a shared top nav using WorkSync definitive styling.
- [x] Build reusable cards and schedule grid patterns.
- [x] Keep layout responsive and visually aligned with the references.

### Task 5: Pages

**Files:**
- Create `src/pages/LoginPage.tsx`
- Create `src/pages/DashboardPage.tsx`
- Create `src/pages/SchedulePage.tsx`
- Create `src/pages/GroupsPage.tsx`
- Create `src/pages/RecommendationsPage.tsx`
- Create `src/pages/SessionDetailPage.tsx`

- [x] Implement the functional route set.
- [x] Wire actions for schedule editing, group creation, recommendation generation, and session confirmation.
- [x] Keep user-facing app copy mostly Spanish with WorkSync brand.

### Task 6: Verification

**Commands:**
- Run `npm install`
- Run `npm run build`
- Start dev server and inspect main route

- [x] Install dependencies.
- [x] Build the app.
- [x] Report any environment or Firebase deployment blockers.

### Task 7: Functional Recommendation Controls

**Files:**
- Modify `src/domain/recommendations.ts`
- Modify `src/services/AppDataContext.tsx`
- Modify `src/pages/RecommendationsPage.tsx`

- [x] Make group, duration, and modality filters update the generated ranking.
- [x] Keep recommendation generation deterministic and client-side for the MVP.
- [x] Verify creating a session from a filtered recommendation opens the correct detail page.

### Task 8: Firebase Auth Profile Completeness

**Files:**
- Modify `src/services/auth.ts`
- Modify `src/services/AppDataContext.tsx`
- Modify `src/pages/LoginPage.tsx`

- [x] Create or update the user profile document after registration.
- [x] Prefer the signed-in Firebase user as `currentUserId` when Firebase is configured.
- [x] Keep demo mode working when Firebase env vars are absent.

### Task 9: Group Creation UX

**Files:**
- Modify `src/pages/GroupsPage.tsx`
- Modify `src/services/AppDataContext.tsx`

- [x] Allow selecting members when creating a group.
- [x] Include selected members in the saved group.
- [x] Keep the current user as owner and member.

### Task 10: Build Output Tuning

**Files:**
- Modify `vite.config.ts`

- [x] Split Firebase and vendor dependencies into separate chunks.
- [x] Verify the production build no longer emits the oversized single-chunk warning.
