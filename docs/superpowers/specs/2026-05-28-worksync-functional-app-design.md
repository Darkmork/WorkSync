# WorkSync Functional App Design

## Goal

Build WorkSync as a functional web app using React, Tailwind CSS, and Firebase. The UI must use the `WS/*worksync_definitive` screens as the visual source, while the product behavior follows the Ventana Comun PDR: personal availability, groups, intelligent recommendations, and confirmed sessions.

## Product Scope

The MVP includes:

- Firebase email/password authentication.
- A dashboard (`Inicio`) with upcoming sessions and recommendation highlights.
- A personal schedule page (`Mi horario`) where users mark availability as free, preferred, occupied, or avoid.
- A groups page (`Mis grupos`) where users create and inspect coordination groups.
- An `Intelligent Recommendations` page that finds the best meeting windows for a selected group.
- A session detail page that confirms a recommended window.
- Firebase Hosting configuration so the app can be published as a web page.

Calendar, weather, maps, chat, voting, and email reminders are deferred. The UI may show placeholders for future integrations, but the core workflow must work without them.

## Visual Direction

Use WorkSync as the only product name. Keep the visual system from the definitive screens:

- Hanken Grotesk for UI text.
- JetBrains Mono for labels and time/grid metadata.
- Primary blue `#0058be`, neutral light surfaces, and semantic schedule colors.
- A sticky top navigation shell.
- Rounded cards with subtle borders and shadows.
- Dense, scannable dashboard and scheduling layouts.

The app should be mostly Spanish in user-facing copy, because the PDR and target workflow are Spanish. Keep `Intelligent Recommendations` as the feature label where useful, paired with `Mejores momentos`.

## Data Model

Firestore collections:

- `users/{uid}`: profile data and timestamps.
- `schedules/{uid}`: weekly block states keyed by day and hour.
- `groups/{groupId}`: name, description, type, owner, member ids, and color.
- `sessions/{sessionId}`: group id, selected window, modality, status, score, and justification.

Local demo data is used when Firebase environment variables are absent. This keeps the app usable during development and review, while Firebase becomes active when configuration is provided.

## Recommendation Logic

The MVP recommendation engine is deterministic:

1. Build candidate windows from working hours.
2. Read all member schedules available to the client.
3. Score each candidate by member availability, preferred slots, avoided slots, and duration.
4. Return the top three windows with a readable justification.

This is not an LLM feature. It is explainable business logic that can later move to a Cloud Function.

## Architecture

React routes render pages. Zustand is avoided for the first version to keep state simple; React context owns auth and app data. Firebase services are isolated under `src/services`, while pure domain logic lives under `src/domain`.

The app must run locally without Firebase credentials and switch to Firebase when `.env` contains the required Vite Firebase variables.

## Validation

Minimum verification:

- `npm run build` succeeds.
- The app renders the main routes.
- A user can navigate through Inicio, Mi horario, Mis grupos, Intelligent Recommendations, and session detail.
- The recommendation engine returns ranked results from seeded data.

