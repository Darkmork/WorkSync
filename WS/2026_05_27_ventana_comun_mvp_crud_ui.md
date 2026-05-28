# Ventana Común — MVP CRUD + UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the MVP foundation of Ventana Común — auth, personal weekly schedule, friends, groups, and group sessions — as a React + Firebase web app, leaving the recommendation/scoring engine for a separate plan.

**Architecture:** Single-page React app (Vite) with a thin typed repository layer over Cloud Firestore and Firebase Auth. Pure domain logic (types, schedule validation, overlap detection) lives in framework-free modules that are unit-tested with Vitest. Firestore/Auth repositories are tested against the official Firebase Emulator Suite. UI is built with Tailwind and tested with React Testing Library.

**Tech Stack:** TypeScript, React 18, Vite, Tailwind CSS, React Router, Zustand (auth/session state), Firebase (Auth + Firestore), Vitest + @testing-library/react, Firebase Emulator Suite.

**Out of scope (separate plan):** availability cross-matching, scoring/ranking engine ("Buscar mejor momento"), weather/maps/calendar integrations, chat, voting, tasks, notifications.

---

## File Structure

```
ventana-comun/
├── package.json
├── vite.config.ts
├── vitest.config.ts
├── tailwind.config.js
├── postcss.config.js
├── firebase.json                     # emulator config (Auth + Firestore)
├── .firebaserc
├── index.html
├── src/
│   ├── main.tsx                      # app entry + router
│   ├── App.tsx                       # route table + layout shell
│   ├── index.css                     # tailwind directives
│   ├── firebase.ts                   # firebase app/init + emulator wiring
│   ├── domain/
│   │   ├── types.ts                  # shared domain types
│   │   └── horario.ts                # pure schedule helpers (validation, overlap)
│   ├── services/
│   │   ├── auth.ts                   # Firebase Auth wrapper
│   │   ├── horarioRepo.ts            # Firestore CRUD for bloques_horarios
│   │   ├── amigosRepo.ts             # Firestore CRUD for friends
│   │   ├── gruposRepo.ts             # Firestore CRUD for groups + members
│   │   └── sesionesRepo.ts           # Firestore CRUD for sessions
│   ├── store/
│   │   └── authStore.ts              # Zustand store for current user
│   ├── components/
│   │   ├── ProtectedRoute.tsx
│   │   ├── Layout.tsx
│   │   └── GrillaHorario.tsx         # weekly grid component
│   ├── pages/
│   │   ├── Login.tsx
│   │   ├── Registro.tsx
│   │   ├── MiHorario.tsx
│   │   ├── Amigos.tsx
│   │   ├── Grupos.tsx
│   │   ├── GrupoDetalle.tsx
│   │   └── CrearSesion.tsx
│   └── test/
│       ├── setup.ts                  # vitest global setup
│       └── emulator.ts               # emulator connect + clear helpers
└── tests/                            # (co-located *.test.ts next to source preferred)
```

Each `*Repo.ts` owns one Firestore collection and exposes typed async functions. Pure logic in `domain/` never imports Firebase, so it is trivially unit-testable. UI pages compose repos + store; they hold no business rules beyond rendering and event wiring.

---

## Task 1: Project scaffolding

**Files:**
- Create: `package.json`, `vite.config.ts`, `vitest.config.ts`, `tailwind.config.js`, `postcss.config.js`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/index.css`, `src/test/setup.ts`

- [ ] **Step 1: Scaffold the Vite React-TS project**

Run:
```bash
npm create vite@latest ventana-comun -- --template react-ts
cd ventana-comun
npm install
```
Expected: a `ventana-comun/` directory with a working Vite React-TS starter.

- [ ] **Step 2: Install runtime and dev dependencies**

Run:
```bash
npm install firebase react-router-dom zustand
npm install -D tailwindcss postcss autoprefixer vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom @vitest/coverage-v8
npx tailwindcss init -p
```
Expected: dependencies added; `tailwind.config.js` and `postcss.config.js` created.

- [ ] **Step 3: Configure Tailwind**

Replace `tailwind.config.js`:
```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: { extend: {} },
  plugins: [],
};
```

Replace `src/index.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 4: Configure Vitest**

Create `vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    css: false,
  },
});
```

Create `src/test/setup.ts`:
```ts
import "@testing-library/jest-dom/vitest";
```

Add scripts to `package.json` (merge into existing `"scripts"`):
```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "emu": "firebase emulators:start --only auth,firestore"
  }
}
```

- [ ] **Step 5: Add a smoke test and verify the toolchain runs**

Create `src/domain/smoke.test.ts`:
```ts
import { describe, it, expect } from "vitest";

describe("toolchain", () => {
  it("runs vitest", () => {
    expect(1 + 1).toBe(2);
  });
});
```

Run: `npm test`
Expected: PASS — 1 test passed.

- [ ] **Step 6: Commit**

```bash
git init
git add -A
git commit -m "chore: scaffold Vite React-TS app with Tailwind and Vitest"
```

---

## Task 2: Domain types and pure schedule helpers

**Files:**
- Create: `src/domain/types.ts`
- Create: `src/domain/horario.ts`
- Test: `src/domain/horario.test.ts`
- Delete: `src/domain/smoke.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/domain/horario.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import {
  DIAS,
  minutosDesdeMedianoche,
  esBloqueValido,
  bloquesSeSolapan,
} from "./horario";
import type { BloqueHorario } from "./types";

const base: Omit<BloqueHorario, "id"> = {
  usuarioId: "u1",
  dia: "lun",
  horaInicio: "15:30",
  horaFin: "17:00",
  estado: "libre",
  tipo: "estudio",
};

describe("DIAS", () => {
  it("has the 7 days starting Monday", () => {
    expect(DIAS).toEqual(["lun", "mar", "mie", "jue", "vie", "sab", "dom"]);
  });
});

describe("minutosDesdeMedianoche", () => {
  it("converts HH:mm to minutes", () => {
    expect(minutosDesdeMedianoche("00:00")).toBe(0);
    expect(minutosDesdeMedianoche("15:30")).toBe(930);
    expect(minutosDesdeMedianoche("23:59")).toBe(1439);
  });
});

describe("esBloqueValido", () => {
  it("accepts a well-formed block", () => {
    expect(esBloqueValido({ ...base, id: "b1" })).toBe(true);
  });
  it("rejects when start is not before end", () => {
    expect(esBloqueValido({ ...base, id: "b1", horaInicio: "17:00", horaFin: "15:30" })).toBe(false);
    expect(esBloqueValido({ ...base, id: "b1", horaInicio: "15:30", horaFin: "15:30" })).toBe(false);
  });
  it("rejects malformed time strings", () => {
    expect(esBloqueValido({ ...base, id: "b1", horaInicio: "9:5" })).toBe(false);
    expect(esBloqueValido({ ...base, id: "b1", horaFin: "25:00" })).toBe(false);
  });
});

describe("bloquesSeSolapan", () => {
  const a: BloqueHorario = { ...base, id: "a" };
  it("is false for different days", () => {
    expect(bloquesSeSolapan(a, { ...base, id: "b", dia: "mar" })).toBe(false);
  });
  it("is true when ranges intersect on the same day", () => {
    expect(bloquesSeSolapan(a, { ...base, id: "b", horaInicio: "16:00", horaFin: "18:00" })).toBe(true);
  });
  it("is false for adjacent ranges that only touch", () => {
    expect(bloquesSeSolapan(a, { ...base, id: "b", horaInicio: "17:00", horaFin: "18:00" })).toBe(false);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/domain/horario.test.ts`
Expected: FAIL — cannot resolve `./horario` / `./types`.

- [ ] **Step 3: Write the types**

Create `src/domain/types.ts`:
```ts
export type DiaSemana = "lun" | "mar" | "mie" | "jue" | "vie" | "sab" | "dom";
export type EstadoBloque = "libre" | "ocupado" | "preferido" | "evitar";
export type TipoBloque = "clase" | "trabajo" | "deporte" | "personal" | "estudio";

export interface BloqueHorario {
  id: string;
  usuarioId: string;
  dia: DiaSemana;
  horaInicio: string; // "HH:mm" 24h
  horaFin: string; // "HH:mm" 24h
  estado: EstadoBloque;
  tipo: TipoBloque;
}

export interface PerfilUsuario {
  id: string; // == Firebase Auth uid
  nombre: string;
  correo: string;
  contexto?: string; // carrera / curso / equipo
  amigos: string[]; // uids
}

export type TipoGrupo = "estudio" | "proyecto" | "trabajo" | "personal";

export interface Grupo {
  id: string;
  nombre: string;
  descripcion: string;
  color: string; // hex
  tipo: TipoGrupo;
  creadoPor: string; // uid
  integrantes: string[]; // uids, includes creator
}

export type Modalidad = "presencial" | "online";
export type EstadoSesion = "propuesta" | "confirmada" | "cancelada";

export interface Sesion {
  id: string;
  grupoId: string;
  fecha: string; // ISO date "YYYY-MM-DD"
  horaInicio: string; // "HH:mm"
  horaFin: string; // "HH:mm"
  modalidad: Modalidad;
  ubicacion: string;
  enlace: string;
  estado: EstadoSesion;
}
```

- [ ] **Step 4: Write the pure helpers**

Create `src/domain/horario.ts`:
```ts
import type { BloqueHorario, DiaSemana } from "./types";

export const DIAS: DiaSemana[] = ["lun", "mar", "mie", "jue", "vie", "sab", "dom"];

const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function minutosDesdeMedianoche(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function esHoraValida(hhmm: string): boolean {
  return HHMM.test(hhmm);
}

export function esBloqueValido(b: BloqueHorario): boolean {
  if (!esHoraValida(b.horaInicio) || !esHoraValida(b.horaFin)) return false;
  return minutosDesdeMedianoche(b.horaInicio) < minutosDesdeMedianoche(b.horaFin);
}

export function bloquesSeSolapan(a: BloqueHorario, b: BloqueHorario): boolean {
  if (a.dia !== b.dia) return false;
  const aIni = minutosDesdeMedianoche(a.horaInicio);
  const aFin = minutosDesdeMedianoche(a.horaFin);
  const bIni = minutosDesdeMedianoche(b.horaInicio);
  const bFin = minutosDesdeMedianoche(b.horaFin);
  return aIni < bFin && bIni < aFin;
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test -- src/domain/horario.test.ts`
Expected: PASS — all assertions green.

- [ ] **Step 6: Remove the smoke test and commit**

```bash
rm src/domain/smoke.test.ts
git add -A
git commit -m "feat: add domain types and pure schedule helpers"
```

---

## Task 3: Firebase init and emulator test harness

**Files:**
- Create: `src/firebase.ts`
- Create: `firebase.json`
- Create: `.firebaserc`
- Create: `src/test/emulator.ts`
- Create: `.env.local`

- [ ] **Step 1: Configure the Firebase Emulator Suite**

Create `firebase.json`:
```json
{
  "emulators": {
    "auth": { "port": 9099 },
    "firestore": { "port": 8080 },
    "ui": { "enabled": true }
  },
  "firestore": {
    "rules": "firestore.rules"
  }
}
```

Create `.firebaserc`:
```json
{ "projects": { "default": "ventana-comun-dev" } }
```

Create `firestore.rules`:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

- [ ] **Step 2: Add Firebase env config**

Create `.env.local` (placeholder values are fine for emulator use):
```
VITE_FIREBASE_API_KEY=demo-key
VITE_FIREBASE_AUTH_DOMAIN=ventana-comun-dev.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=ventana-comun-dev
VITE_FIREBASE_APP_ID=demo-app
VITE_USE_EMULATOR=true
```

- [ ] **Step 3: Write the Firebase init module**

Create `src/firebase.ts`:
```ts
import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";

const app = initializeApp({
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
});

export const auth = getAuth(app);
export const db = getFirestore(app);

if (import.meta.env.VITE_USE_EMULATOR === "true") {
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
}
```

- [ ] **Step 4: Write the emulator test helper**

Create `src/test/emulator.ts`:
```ts
const PROJECT_ID = "ventana-comun-dev";

export async function clearFirestore(): Promise<void> {
  await fetch(
    `http://127.0.0.1:8080/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`,
    { method: "DELETE" },
  );
}

export async function clearAuth(): Promise<void> {
  await fetch(
    `http://127.0.0.1:9099/emulator/v1/projects/${PROJECT_ID}/accounts`,
    { method: "DELETE" },
  );
}
```

- [ ] **Step 5: Verify Firebase imports compile**

Run: `npx tsc --noEmit`
Expected: PASS — no type errors. (No test yet; repositories in later tasks exercise the emulator.)

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: add firebase init and emulator test harness"
```

> **Note for all emulator-backed tests below:** they require the emulator running. Start it in a separate terminal with `npm run emu` before running those test files. Each repo test file clears state in `beforeEach`.

---

## Task 4: Auth service

**Files:**
- Create: `src/services/auth.ts`
- Test: `src/services/auth.test.ts`

- [ ] **Step 1: Write the failing test (emulator-backed)**

Create `src/services/auth.test.ts`:
```ts
import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { registrar, iniciarSesion, cerrarSesion } from "./auth";
import { auth } from "../firebase";
import { clearAuth, clearFirestore } from "../test/emulator";

describe("auth service (emulator)", () => {
  beforeEach(async () => {
    await clearAuth();
    await clearFirestore();
    await cerrarSesion();
  });
  afterAll(async () => {
    await cerrarSesion();
  });

  it("registra un usuario y crea su perfil", async () => {
    const perfil = await registrar("Ana", "ana@test.com", "secret123");
    expect(perfil.nombre).toBe("Ana");
    expect(perfil.correo).toBe("ana@test.com");
    expect(perfil.amigos).toEqual([]);
    expect(auth.currentUser?.uid).toBe(perfil.id);
  });

  it("inicia sesión con credenciales válidas", async () => {
    await registrar("Ana", "ana@test.com", "secret123");
    await cerrarSesion();
    const perfil = await iniciarSesion("ana@test.com", "secret123");
    expect(perfil.correo).toBe("ana@test.com");
  });

  it("rechaza credenciales inválidas", async () => {
    await registrar("Ana", "ana@test.com", "secret123");
    await cerrarSesion();
    await expect(iniciarSesion("ana@test.com", "wrong")).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run (emulator running): `npm test -- src/services/auth.test.ts`
Expected: FAIL — cannot resolve `./auth`.

- [ ] **Step 3: Implement the auth service**

Create `src/services/auth.ts`:
```ts
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import type { PerfilUsuario } from "../domain/types";

function perfilDoc(uid: string) {
  return doc(db, "usuarios", uid);
}

export async function registrar(
  nombre: string,
  correo: string,
  password: string,
): Promise<PerfilUsuario> {
  const cred = await createUserWithEmailAndPassword(auth, correo, password);
  await updateProfile(cred.user, { displayName: nombre });
  const perfil: PerfilUsuario = {
    id: cred.user.uid,
    nombre,
    correo,
    amigos: [],
  };
  await setDoc(perfilDoc(cred.user.uid), perfil);
  return perfil;
}

export async function iniciarSesion(
  correo: string,
  password: string,
): Promise<PerfilUsuario> {
  const cred = await signInWithEmailAndPassword(auth, correo, password);
  const snap = await getDoc(perfilDoc(cred.user.uid));
  if (!snap.exists()) throw new Error("Perfil no encontrado");
  return snap.data() as PerfilUsuario;
}

export async function cerrarSesion(): Promise<void> {
  await signOut(auth);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run (emulator running): `npm test -- src/services/auth.test.ts`
Expected: PASS — 3 tests green.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add Firebase auth service with profile creation"
```

---

## Task 5: Auth store and protected routing

**Files:**
- Create: `src/store/authStore.ts`
- Create: `src/components/ProtectedRoute.tsx`
- Test: `src/store/authStore.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/store/authStore.test.ts`:
```ts
import { describe, it, expect, beforeEach } from "vitest";
import { useAuthStore } from "./authStore";
import type { PerfilUsuario } from "../domain/types";

const perfil: PerfilUsuario = {
  id: "u1",
  nombre: "Ana",
  correo: "ana@test.com",
  amigos: [],
};

describe("authStore", () => {
  beforeEach(() => {
    useAuthStore.setState({ usuario: null, cargando: true });
  });

  it("starts with no user and loading true", () => {
    const s = useAuthStore.getState();
    expect(s.usuario).toBeNull();
    expect(s.cargando).toBe(true);
  });

  it("setUsuario stores the profile and clears loading", () => {
    useAuthStore.getState().setUsuario(perfil);
    const s = useAuthStore.getState();
    expect(s.usuario).toEqual(perfil);
    expect(s.cargando).toBe(false);
  });

  it("limpiar resets the user", () => {
    useAuthStore.getState().setUsuario(perfil);
    useAuthStore.getState().limpiar();
    expect(useAuthStore.getState().usuario).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/store/authStore.test.ts`
Expected: FAIL — cannot resolve `./authStore`.

- [ ] **Step 3: Implement the store**

Create `src/store/authStore.ts`:
```ts
import { create } from "zustand";
import type { PerfilUsuario } from "../domain/types";

interface AuthState {
  usuario: PerfilUsuario | null;
  cargando: boolean;
  setUsuario: (u: PerfilUsuario) => void;
  limpiar: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  usuario: null,
  cargando: true,
  setUsuario: (u) => set({ usuario: u, cargando: false }),
  limpiar: () => set({ usuario: null, cargando: false }),
}));
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- src/store/authStore.test.ts`
Expected: PASS — 3 tests green.

- [ ] **Step 5: Implement the ProtectedRoute (no separate test; covered by routing usage)**

Create `src/components/ProtectedRoute.tsx`:
```tsx
import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuthStore } from "../store/authStore";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { usuario, cargando } = useAuthStore();
  if (cargando) return <div className="p-8 text-gray-500">Cargando…</div>;
  if (!usuario) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add auth store and protected route guard"
```

---

## Task 6: Horario repository

**Files:**
- Create: `src/services/horarioRepo.ts`
- Test: `src/services/horarioRepo.test.ts`

- [ ] **Step 1: Write the failing test (emulator-backed)**

Create `src/services/horarioRepo.test.ts`:
```ts
import { describe, it, expect, beforeEach } from "vitest";
import { guardarBloque, listarBloques, eliminarBloque } from "./horarioRepo";
import { clearFirestore } from "../test/emulator";
import type { BloqueHorario } from "../domain/types";

const nuevo: Omit<BloqueHorario, "id"> = {
  usuarioId: "u1",
  dia: "lun",
  horaInicio: "15:30",
  horaFin: "17:00",
  estado: "libre",
  tipo: "estudio",
};

describe("horarioRepo (emulator)", () => {
  beforeEach(async () => {
    await clearFirestore();
  });

  it("guarda y lista bloques por usuario", async () => {
    const b = await guardarBloque(nuevo);
    expect(b.id).toBeTruthy();
    const lista = await listarBloques("u1");
    expect(lista).toHaveLength(1);
    expect(lista[0].horaInicio).toBe("15:30");
  });

  it("rechaza un bloque inválido", async () => {
    await expect(
      guardarBloque({ ...nuevo, horaInicio: "17:00", horaFin: "15:30" }),
    ).rejects.toThrow(/inválido/i);
  });

  it("no devuelve bloques de otros usuarios", async () => {
    await guardarBloque(nuevo);
    await guardarBloque({ ...nuevo, usuarioId: "u2" });
    const lista = await listarBloques("u1");
    expect(lista).toHaveLength(1);
  });

  it("elimina un bloque", async () => {
    const b = await guardarBloque(nuevo);
    await eliminarBloque(b.id);
    expect(await listarBloques("u1")).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run (emulator running): `npm test -- src/services/horarioRepo.test.ts`
Expected: FAIL — cannot resolve `./horarioRepo`.

- [ ] **Step 3: Implement the repository**

Create `src/services/horarioRepo.ts`:
```ts
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "../firebase";
import type { BloqueHorario } from "../domain/types";
import { esBloqueValido } from "../domain/horario";

const col = collection(db, "bloques_horarios");

export async function guardarBloque(
  data: Omit<BloqueHorario, "id">,
): Promise<BloqueHorario> {
  const candidato: BloqueHorario = { id: "tmp", ...data };
  if (!esBloqueValido(candidato)) {
    throw new Error("Bloque inválido: revisa las horas");
  }
  const ref = await addDoc(col, data);
  return { id: ref.id, ...data };
}

export async function listarBloques(usuarioId: string): Promise<BloqueHorario[]> {
  const q = query(col, where("usuarioId", "==", usuarioId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<BloqueHorario, "id">) }));
}

export async function eliminarBloque(id: string): Promise<void> {
  await deleteDoc(doc(db, "bloques_horarios", id));
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run (emulator running): `npm test -- src/services/horarioRepo.test.ts`
Expected: PASS — 4 tests green.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add bloques_horarios repository with validation"
```

---

## Task 7: Weekly grid component

**Files:**
- Create: `src/components/GrillaHorario.tsx`
- Test: `src/components/GrillaHorario.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/GrillaHorario.test.tsx`:
```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GrillaHorario } from "./GrillaHorario";
import type { BloqueHorario } from "../domain/types";

const bloques: BloqueHorario[] = [
  {
    id: "b1",
    usuarioId: "u1",
    dia: "lun",
    horaInicio: "15:00",
    horaFin: "16:00",
    estado: "preferido",
    tipo: "estudio",
  },
];

describe("GrillaHorario", () => {
  it("renders the 7 day headers", () => {
    render(<GrillaHorario bloques={[]} onSeleccionar={() => {}} />);
    ["lun", "mar", "mie", "jue", "vie", "sab", "dom"].forEach((d) => {
      expect(screen.getByText(d)).toBeInTheDocument();
    });
  });

  it("marks a cell with the block estado class", () => {
    render(<GrillaHorario bloques={bloques} onSeleccionar={() => {}} />);
    const celda = screen.getByTestId("celda-lun-15");
    expect(celda.className).toContain("bg-blue-400"); // preferido
  });

  it("calls onSeleccionar with day and hour on click", async () => {
    const onSel = vi.fn();
    render(<GrillaHorario bloques={[]} onSeleccionar={onSel} />);
    await userEvent.click(screen.getByTestId("celda-mar-9"));
    expect(onSel).toHaveBeenCalledWith("mar", 9);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/components/GrillaHorario.test.tsx`
Expected: FAIL — cannot resolve `./GrillaHorario`.

- [ ] **Step 3: Implement the component**

Create `src/components/GrillaHorario.tsx`:
```tsx
import type { BloqueHorario, DiaSemana, EstadoBloque } from "../domain/types";
import { DIAS } from "../domain/horario";

const HORAS = Array.from({ length: 15 }, (_, i) => i + 7); // 7..21

const COLOR: Record<EstadoBloque, string> = {
  ocupado: "bg-gray-400",
  libre: "bg-green-400",
  preferido: "bg-blue-400",
  evitar: "bg-yellow-300",
};

function estadoEnCelda(
  bloques: BloqueHorario[],
  dia: DiaSemana,
  hora: number,
): EstadoBloque | null {
  const b = bloques.find(
    (x) =>
      x.dia === dia &&
      Number(x.horaInicio.slice(0, 2)) <= hora &&
      Number(x.horaFin.slice(0, 2)) > hora,
  );
  return b ? b.estado : null;
}

interface Props {
  bloques: BloqueHorario[];
  onSeleccionar: (dia: DiaSemana, hora: number) => void;
}

export function GrillaHorario({ bloques, onSeleccionar }: Props) {
  return (
    <div className="grid grid-cols-8 gap-px bg-gray-200 text-xs">
      <div className="bg-white p-1" />
      {DIAS.map((d) => (
        <div key={d} className="bg-white p-1 text-center font-semibold">
          {d}
        </div>
      ))}
      {HORAS.map((h) => (
        <Fila key={h} hora={h} bloques={bloques} onSeleccionar={onSeleccionar} />
      ))}
    </div>
  );
}

function Fila({
  hora,
  bloques,
  onSeleccionar,
}: {
  hora: number;
  bloques: BloqueHorario[];
  onSeleccionar: (dia: DiaSemana, hora: number) => void;
}) {
  return (
    <>
      <div className="bg-white p-1 text-right text-gray-500">{hora}:00</div>
      {DIAS.map((d) => {
        const estado = estadoEnCelda(bloques, d, hora);
        const color = estado ? COLOR[estado] : "bg-white";
        return (
          <button
            key={`${d}-${hora}`}
            data-testid={`celda-${d}-${hora}`}
            onClick={() => onSeleccionar(d, hora)}
            className={`h-6 ${color} hover:opacity-70`}
          />
        );
      })}
    </>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- src/components/GrillaHorario.test.tsx`
Expected: PASS — 3 tests green.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add weekly schedule grid component"
```

---

## Task 8: Amigos repository

**Files:**
- Create: `src/services/amigosRepo.ts`
- Test: `src/services/amigosRepo.test.ts`

- [ ] **Step 1: Write the failing test (emulator-backed)**

Create `src/services/amigosRepo.test.ts`:
```ts
import { describe, it, expect, beforeEach } from "vitest";
import { agregarAmigoPorCorreo, listarAmigos } from "./amigosRepo";
import { clearFirestore } from "../test/emulator";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import type { PerfilUsuario } from "../domain/types";

async function crearPerfil(p: PerfilUsuario) {
  await setDoc(doc(db, "usuarios", p.id), p);
}

describe("amigosRepo (emulator)", () => {
  beforeEach(async () => {
    await clearFirestore();
    await crearPerfil({ id: "u1", nombre: "Ana", correo: "ana@test.com", amigos: [] });
    await crearPerfil({ id: "u2", nombre: "Beto", correo: "beto@test.com", amigos: [] });
  });

  it("agrega un amigo por correo", async () => {
    await agregarAmigoPorCorreo("u1", "beto@test.com");
    const amigos = await listarAmigos("u1");
    expect(amigos.map((a) => a.id)).toContain("u2");
  });

  it("falla si el correo no existe", async () => {
    await expect(agregarAmigoPorCorreo("u1", "nadie@test.com")).rejects.toThrow(/no existe/i);
  });

  it("no se agrega a sí mismo", async () => {
    await expect(agregarAmigoPorCorreo("u1", "ana@test.com")).rejects.toThrow(/ti mismo/i);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run (emulator running): `npm test -- src/services/amigosRepo.test.ts`
Expected: FAIL — cannot resolve `./amigosRepo`.

- [ ] **Step 3: Implement the repository**

Create `src/services/amigosRepo.ts`:
```ts
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  updateDoc,
  where,
  arrayUnion,
} from "firebase/firestore";
import { db } from "../firebase";
import type { PerfilUsuario } from "../domain/types";

export async function agregarAmigoPorCorreo(
  uid: string,
  correo: string,
): Promise<void> {
  const q = query(collection(db, "usuarios"), where("correo", "==", correo));
  const snap = await getDocs(q);
  if (snap.empty) throw new Error("Ese correo no existe");
  const amigo = snap.docs[0];
  if (amigo.id === uid) throw new Error("No puedes agregarte a ti mismo");
  await updateDoc(doc(db, "usuarios", uid), { amigos: arrayUnion(amigo.id) });
}

export async function listarAmigos(uid: string): Promise<PerfilUsuario[]> {
  const snap = await getDoc(doc(db, "usuarios", uid));
  if (!snap.exists()) return [];
  const ids = (snap.data() as PerfilUsuario).amigos;
  const perfiles = await Promise.all(
    ids.map(async (id) => {
      const s = await getDoc(doc(db, "usuarios", id));
      return s.exists() ? (s.data() as PerfilUsuario) : null;
    }),
  );
  return perfiles.filter((p): p is PerfilUsuario => p !== null);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run (emulator running): `npm test -- src/services/amigosRepo.test.ts`
Expected: PASS — 3 tests green.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add amigos repository (add by email, list)"
```

---

## Task 9: Grupos repository

**Files:**
- Create: `src/services/gruposRepo.ts`
- Test: `src/services/gruposRepo.test.ts`

- [ ] **Step 1: Write the failing test (emulator-backed)**

Create `src/services/gruposRepo.test.ts`:
```ts
import { describe, it, expect, beforeEach } from "vitest";
import { crearGrupo, listarGruposDe, agregarIntegrante, obtenerGrupo } from "./gruposRepo";
import { clearFirestore } from "../test/emulator";

describe("gruposRepo (emulator)", () => {
  beforeEach(async () => {
    await clearFirestore();
  });

  it("crea un grupo con el creador como integrante", async () => {
    const g = await crearGrupo("u1", {
      nombre: "Proyecto Mate",
      descripcion: "Trabajo final",
      color: "#3b82f6",
      tipo: "proyecto",
    });
    expect(g.id).toBeTruthy();
    expect(g.creadoPor).toBe("u1");
    expect(g.integrantes).toEqual(["u1"]);
  });

  it("lista grupos donde el usuario es integrante", async () => {
    await crearGrupo("u1", { nombre: "A", descripcion: "", color: "#000", tipo: "estudio" });
    await crearGrupo("u2", { nombre: "B", descripcion: "", color: "#000", tipo: "estudio" });
    const lista = await listarGruposDe("u1");
    expect(lista).toHaveLength(1);
    expect(lista[0].nombre).toBe("A");
  });

  it("agrega un integrante al grupo", async () => {
    const g = await crearGrupo("u1", { nombre: "A", descripcion: "", color: "#000", tipo: "estudio" });
    await agregarIntegrante(g.id, "u2");
    const actualizado = await obtenerGrupo(g.id);
    expect(actualizado?.integrantes).toContain("u2");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run (emulator running): `npm test -- src/services/gruposRepo.test.ts`
Expected: FAIL — cannot resolve `./gruposRepo`.

- [ ] **Step 3: Implement the repository**

Create `src/services/gruposRepo.ts`:
```ts
import {
  collection,
  addDoc,
  doc,
  getDoc,
  getDocs,
  query,
  updateDoc,
  where,
  arrayUnion,
} from "firebase/firestore";
import { db } from "../firebase";
import type { Grupo, TipoGrupo } from "../domain/types";

interface NuevoGrupo {
  nombre: string;
  descripcion: string;
  color: string;
  tipo: TipoGrupo;
}

const col = collection(db, "grupos");

export async function crearGrupo(uid: string, data: NuevoGrupo): Promise<Grupo> {
  const payload = { ...data, creadoPor: uid, integrantes: [uid] };
  const ref = await addDoc(col, payload);
  return { id: ref.id, ...payload };
}

export async function listarGruposDe(uid: string): Promise<Grupo[]> {
  const q = query(col, where("integrantes", "array-contains", uid));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Grupo, "id">) }));
}

export async function obtenerGrupo(id: string): Promise<Grupo | null> {
  const snap = await getDoc(doc(db, "grupos", id));
  return snap.exists() ? ({ id: snap.id, ...(snap.data() as Omit<Grupo, "id">) }) : null;
}

export async function agregarIntegrante(grupoId: string, uid: string): Promise<void> {
  await updateDoc(doc(db, "grupos", grupoId), { integrantes: arrayUnion(uid) });
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run (emulator running): `npm test -- src/services/gruposRepo.test.ts`
Expected: PASS — 3 tests green.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add grupos repository (create, list, add member)"
```

---

## Task 10: Sesiones repository

**Files:**
- Create: `src/services/sesionesRepo.ts`
- Test: `src/services/sesionesRepo.test.ts`

- [ ] **Step 1: Write the failing test (emulator-backed)**

Create `src/services/sesionesRepo.test.ts`:
```ts
import { describe, it, expect, beforeEach } from "vitest";
import { crearSesion, listarSesionesDeGrupo, cambiarEstadoSesion } from "./sesionesRepo";
import { clearFirestore } from "../test/emulator";
import type { Sesion } from "../domain/types";

const nueva: Omit<Sesion, "id" | "estado"> = {
  grupoId: "g1",
  fecha: "2026-06-03",
  horaInicio: "15:30",
  horaFin: "17:00",
  modalidad: "online",
  ubicacion: "",
  enlace: "https://meet.example/abc",
};

describe("sesionesRepo (emulator)", () => {
  beforeEach(async () => {
    await clearFirestore();
  });

  it("crea una sesión en estado propuesta", async () => {
    const s = await crearSesion(nueva);
    expect(s.id).toBeTruthy();
    expect(s.estado).toBe("propuesta");
  });

  it("rechaza horas inválidas", async () => {
    await expect(
      crearSesion({ ...nueva, horaInicio: "17:00", horaFin: "15:30" }),
    ).rejects.toThrow(/inválid/i);
  });

  it("lista sesiones del grupo y permite confirmarlas", async () => {
    const s = await crearSesion(nueva);
    await cambiarEstadoSesion(s.id, "confirmada");
    const lista = await listarSesionesDeGrupo("g1");
    expect(lista).toHaveLength(1);
    expect(lista[0].estado).toBe("confirmada");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run (emulator running): `npm test -- src/services/sesionesRepo.test.ts`
Expected: FAIL — cannot resolve `./sesionesRepo`.

- [ ] **Step 3: Implement the repository**

Create `src/services/sesionesRepo.ts`:
```ts
import {
  collection,
  addDoc,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../firebase";
import type { Sesion, EstadoSesion } from "../domain/types";
import { esHoraValida, minutosDesdeMedianoche } from "../domain/horario";

const col = collection(db, "sesiones");

export async function crearSesion(
  data: Omit<Sesion, "id" | "estado">,
): Promise<Sesion> {
  if (
    !esHoraValida(data.horaInicio) ||
    !esHoraValida(data.horaFin) ||
    minutosDesdeMedianoche(data.horaInicio) >= minutosDesdeMedianoche(data.horaFin)
  ) {
    throw new Error("Horario de sesión inválido");
  }
  const payload = { ...data, estado: "propuesta" as EstadoSesion };
  const ref = await addDoc(col, payload);
  return { id: ref.id, ...payload };
}

export async function listarSesionesDeGrupo(grupoId: string): Promise<Sesion[]> {
  const q = query(col, where("grupoId", "==", grupoId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Sesion, "id">) }));
}

export async function cambiarEstadoSesion(
  id: string,
  estado: EstadoSesion,
): Promise<void> {
  await updateDoc(doc(db, "sesiones", id), { estado });
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run (emulator running): `npm test -- src/services/sesionesRepo.test.ts`
Expected: PASS — 3 tests green.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add sesiones repository with state transitions"
```

---

## Task 11: Auth pages (Login + Registro)

**Files:**
- Create: `src/pages/Login.tsx`
- Create: `src/pages/Registro.tsx`
- Test: `src/pages/Login.test.tsx`

- [ ] **Step 1: Write the failing test (auth service mocked)**

Create `src/pages/Login.test.tsx`:
```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { Login } from "./Login";
import { useAuthStore } from "../store/authStore";

vi.mock("../services/auth", () => ({
  iniciarSesion: vi.fn().mockResolvedValue({
    id: "u1",
    nombre: "Ana",
    correo: "ana@test.com",
    amigos: [],
  }),
}));

import { iniciarSesion } from "../services/auth";

describe("Login page", () => {
  beforeEach(() => {
    useAuthStore.setState({ usuario: null, cargando: false });
    vi.clearAllMocks();
  });

  it("submits credentials and stores the profile", async () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );
    await userEvent.type(screen.getByLabelText(/correo/i), "ana@test.com");
    await userEvent.type(screen.getByLabelText(/contraseña/i), "secret123");
    await userEvent.click(screen.getByRole("button", { name: /entrar/i }));

    expect(iniciarSesion).toHaveBeenCalledWith("ana@test.com", "secret123");
    expect(useAuthStore.getState().usuario?.correo).toBe("ana@test.com");
  });

  it("shows an error message on failure", async () => {
    (iniciarSesion as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error("credenciales inválidas"),
    );
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );
    await userEvent.type(screen.getByLabelText(/correo/i), "ana@test.com");
    await userEvent.type(screen.getByLabelText(/contraseña/i), "bad");
    await userEvent.click(screen.getByRole("button", { name: /entrar/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/credenciales/i);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/pages/Login.test.tsx`
Expected: FAIL — cannot resolve `./Login`.

- [ ] **Step 3: Implement Login**

Create `src/pages/Login.tsx`:
```tsx
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { iniciarSesion } from "../services/auth";
import { useAuthStore } from "../store/authStore";

export function Login() {
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const setUsuario = useAuthStore((s) => s.setUsuario);
  const navigate = useNavigate();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const perfil = await iniciarSesion(correo, password);
      setUsuario(perfil);
      navigate("/horario");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al iniciar sesión");
    }
  }

  return (
    <div className="mx-auto mt-16 max-w-sm p-6">
      <h1 className="mb-4 text-2xl font-bold">Entrar</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <label className="block">
          Correo
          <input
            type="email"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            className="mt-1 w-full rounded border p-2"
          />
        </label>
        <label className="block">
          Contraseña
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded border p-2"
          />
        </label>
        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}
        <button type="submit" className="w-full rounded bg-blue-600 p-2 text-white">
          Entrar
        </button>
      </form>
      <p className="mt-4 text-sm">
        ¿No tienes cuenta? <Link to="/registro" className="text-blue-600">Regístrate</Link>
      </p>
    </div>
  );
}
```

- [ ] **Step 4: Implement Registro**

Create `src/pages/Registro.tsx`:
```tsx
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { registrar } from "../services/auth";
import { useAuthStore } from "../store/authStore";

export function Registro() {
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const setUsuario = useAuthStore((s) => s.setUsuario);
  const navigate = useNavigate();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const perfil = await registrar(nombre, correo, password);
      setUsuario(perfil);
      navigate("/horario");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al registrar");
    }
  }

  return (
    <div className="mx-auto mt-16 max-w-sm p-6">
      <h1 className="mb-4 text-2xl font-bold">Crear cuenta</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <label className="block">
          Nombre
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} className="mt-1 w-full rounded border p-2" />
        </label>
        <label className="block">
          Correo
          <input type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} className="mt-1 w-full rounded border p-2" />
        </label>
        <label className="block">
          Contraseña
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 w-full rounded border p-2" />
        </label>
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        <button type="submit" className="w-full rounded bg-blue-600 p-2 text-white">Registrarme</button>
      </form>
      <p className="mt-4 text-sm">
        ¿Ya tienes cuenta? <Link to="/login" className="text-blue-600">Entra</Link>
      </p>
    </div>
  );
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm test -- src/pages/Login.test.tsx`
Expected: PASS — 2 tests green.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add login and registro pages"
```

---

## Task 12: Mi Horario page

**Files:**
- Create: `src/pages/MiHorario.tsx`
- Test: `src/pages/MiHorario.test.tsx`

- [ ] **Step 1: Write the failing test (repo + store mocked)**

Create `src/pages/MiHorario.test.tsx`:
```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MiHorario } from "./MiHorario";
import { useAuthStore } from "../store/authStore";

vi.mock("../services/horarioRepo", () => ({
  listarBloques: vi.fn().mockResolvedValue([]),
  guardarBloque: vi.fn().mockImplementation(async (b) => ({ id: "new", ...b })),
  eliminarBloque: vi.fn(),
}));

import { guardarBloque, listarBloques } from "../services/horarioRepo";

describe("MiHorario page", () => {
  beforeEach(() => {
    useAuthStore.setState({
      usuario: { id: "u1", nombre: "Ana", correo: "ana@test.com", amigos: [] },
      cargando: false,
    });
    vi.clearAllMocks();
  });

  it("loads the user's blocks on mount", async () => {
    render(<MiHorario />);
    await waitFor(() => expect(listarBloques).toHaveBeenCalledWith("u1"));
  });

  it("saves a block when a cell is clicked with the active estado", async () => {
    render(<MiHorario />);
    await userEvent.click(screen.getByTestId("celda-lun-15"));
    await waitFor(() =>
      expect(guardarBloque).toHaveBeenCalledWith(
        expect.objectContaining({ usuarioId: "u1", dia: "lun", horaInicio: "15:00", estado: "libre" }),
      ),
    );
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/pages/MiHorario.test.tsx`
Expected: FAIL — cannot resolve `./MiHorario`.

- [ ] **Step 3: Implement the page**

Create `src/pages/MiHorario.tsx`:
```tsx
import { useEffect, useState } from "react";
import { GrillaHorario } from "../components/GrillaHorario";
import { listarBloques, guardarBloque } from "../services/horarioRepo";
import { useAuthStore } from "../store/authStore";
import type { BloqueHorario, DiaSemana, EstadoBloque } from "../domain/types";

const ESTADOS: EstadoBloque[] = ["libre", "preferido", "evitar", "ocupado"];

export function MiHorario() {
  const usuario = useAuthStore((s) => s.usuario);
  const [bloques, setBloques] = useState<BloqueHorario[]>([]);
  const [estadoActivo, setEstadoActivo] = useState<EstadoBloque>("libre");

  useEffect(() => {
    if (usuario) listarBloques(usuario.id).then(setBloques);
  }, [usuario]);

  async function onSeleccionar(dia: DiaSemana, hora: number) {
    if (!usuario) return;
    const nuevo = {
      usuarioId: usuario.id,
      dia,
      horaInicio: `${String(hora).padStart(2, "0")}:00`,
      horaFin: `${String(hora + 1).padStart(2, "0")}:00`,
      estado: estadoActivo,
      tipo: "personal" as const,
    };
    const guardado = await guardarBloque(nuevo);
    setBloques((prev) => [...prev, guardado]);
  }

  return (
    <div className="p-6">
      <h1 className="mb-4 text-2xl font-bold">Mi horario</h1>
      <div className="mb-4 flex gap-2">
        {ESTADOS.map((e) => (
          <button
            key={e}
            onClick={() => setEstadoActivo(e)}
            className={`rounded border px-3 py-1 text-sm ${estadoActivo === e ? "bg-blue-600 text-white" : "bg-white"}`}
          >
            {e}
          </button>
        ))}
      </div>
      <GrillaHorario bloques={bloques} onSeleccionar={onSeleccionar} />
    </div>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- src/pages/MiHorario.test.tsx`
Expected: PASS — 2 tests green.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add Mi Horario page with estado palette"
```

---

## Task 13: Amigos and Grupos pages

**Files:**
- Create: `src/pages/Amigos.tsx`
- Create: `src/pages/Grupos.tsx`
- Create: `src/pages/GrupoDetalle.tsx`
- Test: `src/pages/Grupos.test.tsx`

- [ ] **Step 1: Write the failing test for Grupos (repo + store mocked)**

Create `src/pages/Grupos.test.tsx`:
```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { Grupos } from "./Grupos";
import { useAuthStore } from "../store/authStore";

vi.mock("../services/gruposRepo", () => ({
  listarGruposDe: vi.fn().mockResolvedValue([
    { id: "g1", nombre: "Proyecto Mate", descripcion: "", color: "#3b82f6", tipo: "proyecto", creadoPor: "u1", integrantes: ["u1"] },
  ]),
  crearGrupo: vi.fn().mockImplementation(async (uid, data) => ({ id: "g2", creadoPor: uid, integrantes: [uid], ...data })),
}));

import { crearGrupo, listarGruposDe } from "../services/gruposRepo";

describe("Grupos page", () => {
  beforeEach(() => {
    useAuthStore.setState({
      usuario: { id: "u1", nombre: "Ana", correo: "ana@test.com", amigos: [] },
      cargando: false,
    });
    vi.clearAllMocks();
  });

  it("lists the user's groups", async () => {
    render(<MemoryRouter><Grupos /></MemoryRouter>);
    expect(await screen.findByText("Proyecto Mate")).toBeInTheDocument();
    expect(listarGruposDe).toHaveBeenCalledWith("u1");
  });

  it("creates a new group from the form", async () => {
    render(<MemoryRouter><Grupos /></MemoryRouter>);
    await userEvent.type(screen.getByLabelText(/nombre/i), "Grupo PAES");
    await userEvent.click(screen.getByRole("button", { name: /crear grupo/i }));
    await waitFor(() =>
      expect(crearGrupo).toHaveBeenCalledWith("u1", expect.objectContaining({ nombre: "Grupo PAES" })),
    );
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/pages/Grupos.test.tsx`
Expected: FAIL — cannot resolve `./Grupos`.

- [ ] **Step 3: Implement Grupos**

Create `src/pages/Grupos.tsx`:
```tsx
import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { listarGruposDe, crearGrupo } from "../services/gruposRepo";
import { useAuthStore } from "../store/authStore";
import type { Grupo, TipoGrupo } from "../domain/types";

export function Grupos() {
  const usuario = useAuthStore((s) => s.usuario);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState<TipoGrupo>("estudio");

  useEffect(() => {
    if (usuario) listarGruposDe(usuario.id).then(setGrupos);
  }, [usuario]);

  async function onCrear(e: FormEvent) {
    e.preventDefault();
    if (!usuario || !nombre.trim()) return;
    const g = await crearGrupo(usuario.id, { nombre, descripcion: "", color: "#3b82f6", tipo });
    setGrupos((prev) => [...prev, g]);
    setNombre("");
  }

  return (
    <div className="p-6">
      <h1 className="mb-4 text-2xl font-bold">Mis grupos</h1>
      <form onSubmit={onCrear} className="mb-6 flex flex-wrap items-end gap-2">
        <label className="block">
          Nombre
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} className="mt-1 block rounded border p-2" />
        </label>
        <label className="block">
          Tipo
          <select value={tipo} onChange={(e) => setTipo(e.target.value as TipoGrupo)} className="mt-1 block rounded border p-2">
            <option value="estudio">estudio</option>
            <option value="proyecto">proyecto</option>
            <option value="trabajo">trabajo</option>
            <option value="personal">personal</option>
          </select>
        </label>
        <button type="submit" className="rounded bg-blue-600 px-4 py-2 text-white">Crear grupo</button>
      </form>
      <ul className="space-y-2">
        {grupos.map((g) => (
          <li key={g.id} className="rounded border p-3">
            <Link to={`/grupos/${g.id}`} className="font-semibold text-blue-700">{g.nombre}</Link>
            <span className="ml-2 text-sm text-gray-500">({g.tipo}) · {g.integrantes.length} integrantes</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 4: Implement Amigos**

Create `src/pages/Amigos.tsx`:
```tsx
import { useEffect, useState, type FormEvent } from "react";
import { agregarAmigoPorCorreo, listarAmigos } from "../services/amigosRepo";
import { useAuthStore } from "../store/authStore";
import type { PerfilUsuario } from "../domain/types";

export function Amigos() {
  const usuario = useAuthStore((s) => s.usuario);
  const [amigos, setAmigos] = useState<PerfilUsuario[]>([]);
  const [correo, setCorreo] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (usuario) listarAmigos(usuario.id).then(setAmigos);
  }, [usuario]);

  async function onAgregar(e: FormEvent) {
    e.preventDefault();
    if (!usuario) return;
    setError("");
    try {
      await agregarAmigoPorCorreo(usuario.id, correo);
      setAmigos(await listarAmigos(usuario.id));
      setCorreo("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al agregar");
    }
  }

  return (
    <div className="p-6">
      <h1 className="mb-4 text-2xl font-bold">Amigos</h1>
      <form onSubmit={onAgregar} className="mb-4 flex items-end gap-2">
        <label className="block">
          Correo del amigo
          <input type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} className="mt-1 block rounded border p-2" />
        </label>
        <button type="submit" className="rounded bg-blue-600 px-4 py-2 text-white">Agregar</button>
      </form>
      {error && <p role="alert" className="mb-2 text-sm text-red-600">{error}</p>}
      <ul className="space-y-1">
        {amigos.map((a) => (
          <li key={a.id} className="rounded border p-2">{a.nombre} · {a.correo}</li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 5: Implement GrupoDetalle (add members from friends)**

Create `src/pages/GrupoDetalle.tsx`:
```tsx
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { obtenerGrupo, agregarIntegrante } from "../services/gruposRepo";
import { listarAmigos } from "../services/amigosRepo";
import { useAuthStore } from "../store/authStore";
import type { Grupo, PerfilUsuario } from "../domain/types";

export function GrupoDetalle() {
  const { id } = useParams<{ id: string }>();
  const usuario = useAuthStore((s) => s.usuario);
  const [grupo, setGrupo] = useState<Grupo | null>(null);
  const [amigos, setAmigos] = useState<PerfilUsuario[]>([]);

  useEffect(() => {
    if (id) obtenerGrupo(id).then(setGrupo);
    if (usuario) listarAmigos(usuario.id).then(setAmigos);
  }, [id, usuario]);

  async function onAgregar(uid: string) {
    if (!id) return;
    await agregarIntegrante(id, uid);
    setGrupo(await obtenerGrupo(id));
  }

  if (!grupo) return <div className="p-6 text-gray-500">Cargando…</div>;

  return (
    <div className="p-6">
      <h1 className="mb-2 text-2xl font-bold">{grupo.nombre}</h1>
      <p className="mb-4 text-sm text-gray-500">{grupo.integrantes.length} integrantes</p>

      <h2 className="mb-2 font-semibold">Agregar desde amigos</h2>
      <ul className="mb-6 space-y-1">
        {amigos
          .filter((a) => !grupo.integrantes.includes(a.id))
          .map((a) => (
            <li key={a.id} className="flex items-center justify-between rounded border p-2">
              <span>{a.nombre}</span>
              <button onClick={() => onAgregar(a.id)} className="rounded bg-blue-600 px-3 py-1 text-sm text-white">Agregar</button>
            </li>
          ))}
      </ul>

      <Link to={`/grupos/${grupo.id}/sesion`} className="rounded bg-green-600 px-4 py-2 text-white">
        Crear sesión
      </Link>
    </div>
  );
}
```

- [ ] **Step 6: Run the Grupos test to verify it passes**

Run: `npm test -- src/pages/Grupos.test.tsx`
Expected: PASS — 2 tests green.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add amigos, grupos and grupo-detalle pages"
```

---

## Task 14: Crear Sesión page

**Files:**
- Create: `src/pages/CrearSesion.tsx`
- Test: `src/pages/CrearSesion.test.tsx`

- [ ] **Step 1: Write the failing test (repo mocked)**

Create `src/pages/CrearSesion.test.tsx`:
```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { CrearSesion } from "./CrearSesion";

vi.mock("../services/sesionesRepo", () => ({
  crearSesion: vi.fn().mockImplementation(async (d) => ({ id: "s1", estado: "propuesta", ...d })),
  listarSesionesDeGrupo: vi.fn().mockResolvedValue([]),
}));

import { crearSesion } from "../services/sesionesRepo";

function renderEnRuta() {
  return render(
    <MemoryRouter initialEntries={["/grupos/g1/sesion"]}>
      <Routes>
        <Route path="/grupos/:id/sesion" element={<CrearSesion />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("CrearSesion page", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates a session with the group id from the route", async () => {
    renderEnRuta();
    await userEvent.type(screen.getByLabelText(/fecha/i), "2026-06-03");
    await userEvent.type(screen.getByLabelText(/inicio/i), "15:30");
    await userEvent.type(screen.getByLabelText(/fin/i), "17:00");
    await userEvent.click(screen.getByRole("button", { name: /crear sesión/i }));
    await waitFor(() =>
      expect(crearSesion).toHaveBeenCalledWith(
        expect.objectContaining({ grupoId: "g1", fecha: "2026-06-03", horaInicio: "15:30", horaFin: "17:00" }),
      ),
    );
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/pages/CrearSesion.test.tsx`
Expected: FAIL — cannot resolve `./CrearSesion`.

- [ ] **Step 3: Implement the page**

Create `src/pages/CrearSesion.tsx`:
```tsx
import { useEffect, useState, type FormEvent } from "react";
import { useParams } from "react-router-dom";
import { crearSesion, listarSesionesDeGrupo } from "../services/sesionesRepo";
import type { Modalidad, Sesion } from "../domain/types";

export function CrearSesion() {
  const { id: grupoId } = useParams<{ id: string }>();
  const [fecha, setFecha] = useState("");
  const [horaInicio, setHoraInicio] = useState("");
  const [horaFin, setHoraFin] = useState("");
  const [modalidad, setModalidad] = useState<Modalidad>("online");
  const [ubicacion, setUbicacion] = useState("");
  const [enlace, setEnlace] = useState("");
  const [error, setError] = useState("");
  const [sesiones, setSesiones] = useState<Sesion[]>([]);

  useEffect(() => {
    if (grupoId) listarSesionesDeGrupo(grupoId).then(setSesiones);
  }, [grupoId]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!grupoId) return;
    setError("");
    try {
      const s = await crearSesion({ grupoId, fecha, horaInicio, horaFin, modalidad, ubicacion, enlace });
      setSesiones((prev) => [...prev, s]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear");
    }
  }

  return (
    <div className="p-6">
      <h1 className="mb-4 text-2xl font-bold">Crear sesión</h1>
      <form onSubmit={onSubmit} className="mb-6 max-w-sm space-y-3">
        <label className="block">Fecha
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="mt-1 w-full rounded border p-2" />
        </label>
        <label className="block">Inicio
          <input type="time" value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)} className="mt-1 w-full rounded border p-2" />
        </label>
        <label className="block">Fin
          <input type="time" value={horaFin} onChange={(e) => setHoraFin(e.target.value)} className="mt-1 w-full rounded border p-2" />
        </label>
        <label className="block">Modalidad
          <select value={modalidad} onChange={(e) => setModalidad(e.target.value as Modalidad)} className="mt-1 w-full rounded border p-2">
            <option value="online">online</option>
            <option value="presencial">presencial</option>
          </select>
        </label>
        {modalidad === "presencial" ? (
          <label className="block">Ubicación
            <input value={ubicacion} onChange={(e) => setUbicacion(e.target.value)} className="mt-1 w-full rounded border p-2" />
          </label>
        ) : (
          <label className="block">Enlace
            <input value={enlace} onChange={(e) => setEnlace(e.target.value)} className="mt-1 w-full rounded border p-2" />
          </label>
        )}
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        <button type="submit" className="w-full rounded bg-green-600 p-2 text-white">Crear sesión</button>
      </form>

      <h2 className="mb-2 font-semibold">Sesiones del grupo</h2>
      <ul className="space-y-1">
        {sesiones.map((s) => (
          <li key={s.id} className="rounded border p-2 text-sm">
            {s.fecha} · {s.horaInicio}–{s.horaFin} · {s.modalidad} · <em>{s.estado}</em>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- src/pages/CrearSesion.test.tsx`
Expected: PASS — 1 test green.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add crear-sesion page with session list"
```

---

## Task 15: App shell, routing, and auth bootstrap

**Files:**
- Create: `src/components/Layout.tsx`
- Modify: `src/App.tsx`
- Modify: `src/main.tsx`

- [ ] **Step 1: Implement the Layout with nav and logout**

Create `src/components/Layout.tsx`:
```tsx
import type { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { cerrarSesion } from "../services/auth";
import { useAuthStore } from "../store/authStore";

export function Layout({ children }: { children: ReactNode }) {
  const usuario = useAuthStore((s) => s.usuario);
  const limpiar = useAuthStore((s) => s.limpiar);
  const navigate = useNavigate();

  async function onSalir() {
    await cerrarSesion();
    limpiar();
    navigate("/login");
  }

  return (
    <div>
      <header className="flex items-center justify-between border-b bg-white px-6 py-3">
        <nav className="flex gap-4">
          <Link to="/horario" className="font-medium">Mi horario</Link>
          <Link to="/amigos" className="font-medium">Amigos</Link>
          <Link to="/grupos" className="font-medium">Grupos</Link>
        </nav>
        {usuario && (
          <div className="flex items-center gap-3 text-sm">
            <span>{usuario.nombre}</span>
            <button onClick={onSalir} className="rounded border px-3 py-1">Salir</button>
          </div>
        )}
      </header>
      <main>{children}</main>
    </div>
  );
}
```

- [ ] **Step 2: Implement App routing**

Replace `src/App.tsx`:
```tsx
import { Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Login } from "./pages/Login";
import { Registro } from "./pages/Registro";
import { MiHorario } from "./pages/MiHorario";
import { Amigos } from "./pages/Amigos";
import { Grupos } from "./pages/Grupos";
import { GrupoDetalle } from "./pages/GrupoDetalle";
import { CrearSesion } from "./pages/CrearSesion";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/registro" element={<Registro />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Layout>
              <Routes>
                <Route path="/horario" element={<MiHorario />} />
                <Route path="/amigos" element={<Amigos />} />
                <Route path="/grupos" element={<Grupos />} />
                <Route path="/grupos/:id" element={<GrupoDetalle />} />
                <Route path="/grupos/:id/sesion" element={<CrearSesion />} />
                <Route path="*" element={<Navigate to="/horario" replace />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
```

- [ ] **Step 3: Wire the router and auth bootstrap in main.tsx**

Replace `src/main.tsx`:
```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import App from "./App";
import "./index.css";
import { auth, db } from "./firebase";
import { useAuthStore } from "./store/authStore";
import type { PerfilUsuario } from "./domain/types";

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    useAuthStore.getState().limpiar();
    return;
  }
  const snap = await getDoc(doc(db, "usuarios", user.uid));
  if (snap.exists()) {
    useAuthStore.getState().setUsuario(snap.data() as PerfilUsuario);
  } else {
    useAuthStore.getState().limpiar();
  }
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
```

- [ ] **Step 4: Verify full type-check, test suite, and build**

Run:
```bash
npx tsc --noEmit
npm test
npm run build
```
Expected: type-check clean; all unit/component tests pass (emulator must be running for the `*Repo.test.ts` files — run `npm run emu` in another terminal first, or run those separately); build succeeds.

- [ ] **Step 5: Manual smoke test against the emulator**

Run (two terminals):
```bash
# terminal 1
npm run emu
# terminal 2
npm run dev
```
Steps: open the app → register → mark a block in Mi Horario → add a friend (register a second account first) → create a group → open the group, add the friend → create a session.
Expected: each action persists and reappears after a page reload.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: wire routing, layout shell and auth bootstrap"
```

---

## Self-Review Notes

- **Spec coverage (MVP CRUD + UI slice):** registro/login (Tasks 4, 11), perfil de usuario (Task 4), horario manual con estados libre/ocupado/preferido/evitar (Tasks 2, 6, 7, 12), agregar amigos (Tasks 8, 13), crear/listar grupos + integrantes (Tasks 9, 13), crear sesión grupal manual (Tasks 10, 14), navegación protegida (Tasks 5, 15). The recommendation/scoring engine, weather, calendar, chat, voting and tasks are intentionally deferred to a separate plan.
- **Type consistency:** `BloqueHorario`, `PerfilUsuario`, `Grupo`, `Sesion` are defined once in `src/domain/types.ts` and reused. Function names referenced across tasks match their definitions: `esBloqueValido`, `esHoraValida`, `minutosDesdeMedianoche` (Task 2) are used in Tasks 6 and 10; `setUsuario`/`limpiar` (Task 5) used in Tasks 11, 12, 15; repo signatures (`guardarBloque`, `listarBloques`, `crearGrupo`, `agregarIntegrante`, `obtenerGrupo`, `crearSesion`, etc.) are consistent between their defining task and their consuming pages.
- **No placeholders:** every code step contains full code; every run step states the exact command and expected result.
- **Emulator dependency:** repo tests (Tasks 4, 6, 8, 9, 10) require `npm run emu`; this is called out at Task 3 and Task 15 Step 4. Page/component tests mock the repos and run without the emulator.
```
