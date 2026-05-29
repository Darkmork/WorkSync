import { defineConfig } from "vitest/config";

// Firestore security-rules tests. They need the emulator, so they run via
// `npm run test:rules` (which wraps this with `firebase emulators:exec`).
export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    testTimeout: 20000,
    hookTimeout: 30000,
    fileParallelism: false,
  },
});
