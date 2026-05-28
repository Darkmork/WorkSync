# WorkSync

WorkSync is a functional React + Firebase web app for coordinating group schedules and finding the best meeting window.

## Stack

- React + TypeScript + Vite
- Tailwind CSS
- Firebase Auth, Firestore, and Hosting
- Deterministic recommendation engine in `src/domain/recommendations.ts`

## Local Development

```bash
npm install
npm run dev
```

The app runs in demo mode only when Firebase environment variables are missing. The deployed app uses `VITE_REQUIRE_FIREBASE_AUTH=true`, so users must authenticate before entering WorkSync.

## Firebase Setup

1. Create a Firebase project.
2. Enable Authentication with Google and email/password.
3. Create a Firestore database.
4. Copy `.env.example` to `.env.local` and fill the `VITE_FIREBASE_*` values.
5. Copy `.firebaserc.example` to `.firebaserc` and set your Firebase project id.
6. Run `npm run firebase:login`.
7. Run `npm run deploy`.

To test against local Firebase emulators, set `VITE_USE_FIREBASE_EMULATORS=true` in `.env.local` and run:

```bash
npm run emulators
```

## Deploy

```bash
npm run build
firebase deploy
```

The Firebase Hosting rewrite in `firebase.json` supports React Router URLs.
