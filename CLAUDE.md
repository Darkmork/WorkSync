# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Stack

- React 18 + TypeScript + Vite
- Tailwind CSS
- Firebase Auth, Firestore, Hosting
- Vitest for tests

## Build & Test Commands

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run lint         # ESLint + type check
npm run test         # Run all tests
npm run test:rules   # Test Firestore rules against emulators
npm run deploy       # Build + firebase deploy
npm run emulators    # Start local Firebase emulators (auth, firestore, hosting)
```

## Architecture

WorkSync is a group schedule coordinator. It matches members' availability against group time windows to find the best meeting slots.

### Data flow

```
Firestore (or localStorage in demo mode)
  → worksyncRepository.ts (load/save, demo fallback)
    → AppDataContext (React context, single source of truth)
      → pages & components (read-only selectors)
```

### Key layers

| Layer | Location | Purpose |
|---|---|---|
| Types | `src/types/worksync.ts` | Core types: `WorkGroup`, `GroupSession`, `ScheduleBlock`, `Poll`, `RSVP`, etc. |
| Domain | `src/domain/*.ts` | Pure business logic — no React, no Firebase |
| Services | `src/services/*.ts` | Firebase/Firestore integration + demo data |
| Components | `src/components/*.tsx` | Shared UI components (AppShell, ScheduleGrid, AvailabilityHeatmap, etc.) |
| Pages | `src/pages/*.tsx` | Route-level components |

### Domain logic (src/domain/)

Core scheduling engine is pure functions, fully testable without Firebase:

- `recommendations.ts` — deterministic slot scoring against group windows
- `groupWindow.ts` — `GroupWindow` type and matching logic (`groupIntersectsSlot`, `allMembersAvailable`)
- `scheduleStates.ts` — block state transitions (free/preferred/occupied/avoid)
- `availabilityHeatmap.ts` — aggregates member schedules into a heatmap
- `polls.ts`, `rsvp.ts`, `invitations.ts` — feature domain logic
- `mutations.ts` — write intent types (`WriteOp`) used by the repository layer

### Firestore data model

Collections: `users`, `groups`, `sessions`, `schedules`, `polls`
- `groups` document has `memberIds[]` and `invitedEmails[]` (for invite resolution)
- RSVP edits are gated to only the caller's own uid via Firestore rules
- Poll vote edits are similarly gated via `voteEditIsOwnOnly()` rule

### Demo mode

When `VITE_FIREBASE_*` env vars are absent, the app runs in demo mode using `localStorage` via `demoData.ts`. The `AppDataContext` switches automatically.

### Firebase Auth

Production requires `VITE_REQUIRE_FIREBASE_AUTH=true`. The app redirects unauthenticated users to `/login`.

## Project conventions

- `.env.example` → copy to `.env.local` for local dev
- `.firebaserc.example` → copy to `.firebaserc` for deployment target
- `firebase.json` has a hosting rewrite for React Router (SPA)
- Firestore rules in `firestore.rules` — tested with `test:rules`