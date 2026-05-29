# Plan de mejoras WorkSync — paso a paso por prioridad

**Fecha:** 2026-05-29
**Estado:** propuesto (pendiente de implementar)
**Alcance:** seguridad, arquitectura (profundización de módulos), tooling y actualizaciones.

## Cómo usar este documento

Cada fase es independiente y entregable por separado. Implementar **en orden**: las primeras
reducen riesgo real y preparan la red de seguridad (tests + lint) que protege los refactors
posteriores. Marca cada paso al completarlo. No avanzar de fase sin cumplir sus
**criterios de aceptación**.

Vocabulario de arquitectura usado abajo:
- **Módulo** = interfaz + implementación. **Costura (seam)** = punto donde se altera comportamiento sin editar en sitio.
- **Profundo** = mucho comportamiento tras una interfaz pequeña. **Somero** = interfaz casi tan compleja como la implementación.
- **Localidad** = cambios/bugs concentrados en un solo lugar. **Palanca** = lo que el llamador gana de la profundidad.

## Resumen de prioridades

| Fase | Tema | Riesgo de no hacerlo | Riesgo del cambio | Esfuerzo |
|------|------|----------------------|-------------------|----------|
| 1 | Seguridad de reglas Firestore | **Alto** (datos expuestos hoy) | Bajo | S |
| 2 | Borrar código muerto REST | Medio (mantenibilidad) | Muy bajo | S |
| 3 | Red de seguridad: ESLint + tests base | Medio (refactors a ciegas) | Bajo | M |
| 4 | Refactor de testabilidad (mutaciones puras + memo) | Medio (lógica intesteable) | Medio | L |
| 5 | Consolidar persistencia (una costura) | Bajo | Bajo | M |
| 6 | Actualizar dependencias | Bajo | Medio | M |

---

## Fase 1 — Seguridad de reglas Firestore (PRIORIDAD MÁXIMA)

**Objetivo:** cerrar la lectura/escritura global. Hoy cualquier usuario autenticado puede leer
todos los grupos, horarios y perfiles (incluye emails) y crear/confirmar sesiones de grupos ajenos.

**Por qué primero:** es la única mejora que expone datos reales en producción *ahora mismo*.

> **Hallazgo de implementación (2026-05-29):** *las reglas de Firestore no filtran, rechazan.*
> Restringir la lectura de una colección por pertenencia hace que una *list query* sin
> restringir (`getDocs(collection(...))`) sea **denegada por completo**. Por eso esta fase
> NO es "solo tocar `firestore.rules`": exige reescribir las consultas del cliente para que
> estén acotadas a lo que la regla permite. Consecuencias:
> - **`groups`**: asegurable ahora (consultas `array-contains` por miembro / email invitado). **HECHO.**
> - **`sessions` escritura**: asegurable vía `get()` de pertenencia al grupo (write de un solo doc). **HECHO.**
> - **`sessions`/`users`/`schedules` lectura**: una regla "solo co-miembros" NO es expresable
>   para list queries sin desnormalizar (el límite de ~10 `get()` por evaluación lo impide, y
>   los horarios de co-miembros son necesarios para las recomendaciones). Se quedan en
>   `isSignedIn()` documentado; el cierre real se mueve a la **Fase 1b** (desnormalización).

**Pasos:**
1. Preparar entorno de prueba de reglas con el emulador de Firestore
   (`npm run emulators`) para validar sin tocar producción.
2. **B1 — Lectura por pertenencia en `groups`:** cambiar `allow read: if isSignedIn()` por
   una regla que exija ser dueño, miembro (`request.auth.uid in resource.data.memberIds`) o
   invitado (`request.auth.token.email in resource.data.invitedEmails`).
3. **B1 — Horarios:** restringir lectura de `schedules/{userId}` al propio usuario y/o a
   miembros de un grupo compartido (decidir alcance en grilling). Mínimo: dueño del horario.
4. **B1 — Usuarios:** restringir lectura de `users/{userId}` (no exponer email de todos).
   Mínimo viable: solo el propio perfil + perfiles de co-miembros de grupo.
5. **B2 — `sessions`:** atar `create`/`update` a pertenencia al grupo en vez de solo
   `isSignedIn()`. Quitar el comentario "follow-up" del archivo una vez resuelto.
6. Probar cada regla en el emulador con casos: dueño OK, miembro OK, invitado OK, ajeno DENEGADO.
7. `firebase deploy --only firestore:rules` y verificar en producción con una cuenta secundaria.

**Archivos:** `firestore.rules` (único cambio de código).

**Riesgo a vigilar:** que el filtrado client-side de `loadWorkSyncData` ya no reciba grupos
ajenos puede dejar al descubierto consultas que dependían de leer todo. Verificar que
dashboard, grupos y recomendaciones siguen cargando para dueño/miembro/invitado.

**Estado de los pasos (2026-05-29):**
- [x] Regla de lectura de `groups` por pertenencia (miembro/dueño o email invitado).
- [x] Cliente reescrito: `loadWorkSyncData` consulta grupos con dos `array-contains` y deduplica.
- [x] `sessions` create/update atados a `isGroupMember()` vía `get()`.
- [x] Comentarios en `users`/`schedules`/`sessions`-read documentando la limitación.
- [x] Reglas compilan (emulador arranca sin errores), `npm run build` y `npm test` (22) verdes.
- [x] **Tests de reglas** con `@firebase/rules-unit-testing` (16 casos permitir/denegar) en
      `tests/firestore.rules.test.ts`, ejecutables con `npm run test:rules`. Todos verdes.
- [x] **Desplegado** reglas + bundle juntos (`npm run deploy`, 2026-05-29). Bundle `index-BDHVg8bj.js`.
- [ ] **Recomendado:** smoke test manual con una segunda cuenta en producción
      (cuenta B no ve grupos de A; no puede confirmar sesiones ajenas).

**Criterios de aceptación:**
- [ ] Una cuenta B NO puede leer un grupo de la cuenta A vía API directa.
- [ ] Una cuenta B NO puede crear/confirmar sesiones en un grupo donde no es miembro.
- [ ] Dueño, miembro e invitado siguen viendo lo suyo en la UI.
- [ ] Auto-join por email (invitado que entra) sigue funcionando.

### Fase 1b — Cierre de lectura de `users`/`schedules`/`sessions` (follow-up)

Requiere desnormalizar para poder expresar "co-miembros" en reglas de list query, p. ej. un campo
`readableBy: [uid...]` mantenido al editar grupos, o mover el email a un subdocumento privado.
Es un cambio arquitectónico propio; no bloquea el resto del plan.

---

## Fase 2 — Borrar código muerto del repositorio (REST pública)

**Objetivo:** eliminar la ruta REST "sin auth", confirmada como código muerto
(`VITE_REQUIRE_FIREBASE_AUTH=true` está fijo en `.env.local` y `.env.example`).

**Por qué ahora:** riesgo casi nulo y despeja el terreno para las Fases 4 y 5. Es la
superficie **somera** más grande del proyecto: reimplementa a mano el SDK de Firebase.

**Test de borrado aplicado:** si se elimina, ¿reaparece complejidad en los llamadores?
No, porque ningún entorno ejecuta `requiresFirebaseAuth === false`.

**Pasos:**
1. Eliminar de `src/services/worksyncRepository.ts`:
   `loadPublicFirebaseData`, `savePublicDocument`, `fetchPublicCollection`, `publicBaseUrl`,
   `documentIdFromName`, `toFirestoreFields`, `toFirestoreValue`, `fromFirestoreFields`,
   `fromFirestoreValue`, el tipo `FirestoreRestValue` y `mergeUsers` (solo lo usaba la ruta pública).
2. Quitar las ramas `else { await savePublicDocument(...) }` en `saveSchedule`, `saveGroup`,
   `updateGroup`, `saveSession`, `confirmSession`. La condición queda
   `if (isFirebaseConfigured && db)` con un solo camino SDK.
3. Quitar el `import { firebaseConfig }` si deja de usarse.
4. Decidir el modo demo/local: si se quiere conservar la app sin Firebase (localStorage),
   dejar esa rama; si no, simplificar también.
5. `npm test` y `npm run build` para confirmar que no se rompió nada.

**Archivos:** `src/services/worksyncRepository.ts`.

**Decisión a registrar:** si en el futuro se quiere modo público sin auth, anotarlo como ADR
en lugar de mantener el código muerto.

**Criterios de aceptación:**
- [ ] `worksyncRepository.ts` baja ~120 líneas.
- [ ] Un solo camino de persistencia (SDK) por mutación.
- [ ] `npm test` y `npm run build` verdes.

---

## Fase 3 — Red de seguridad: ESLint + tests base

**Objetivo:** instalar la red que protege los refactors de las Fases 4 y 5.

**Por qué antes del refactor grande:** hoy el script `lint` es solo `tsc --noEmit` (no es lint
real) y los módulos con más lógica (`AppDataContext`, `worksyncRepository`) no tienen tests.
Refactorizar sin esto es trabajar a ciegas.

**Pasos:**
1. Añadir `eslint`, `@typescript-eslint/*`, `eslint-plugin-react-hooks`,
   `eslint-plugin-react-refresh` como devDependencies.
2. Crear config de ESLint (flat config) con reglas de hooks activadas
   (`react-hooks/exhaustive-deps`).
3. Cambiar el script: `"lint": "eslint . && tsc -b --noEmit"`.
4. Corregir los hallazgos de hooks (probable: dependencias de `useEffect`/`useMemo` en
   `AppDataContext` y páginas).
5. Escribir tests de caracterización para la lógica que se moverá en Fase 4
   (estado actual como referencia), aunque sea sobre helpers existentes.

**Archivos:** `package.json`, `eslint.config.js` (nuevo), correcciones puntuales en `src/`.

**Criterios de aceptación:**
- [ ] `npm run lint` corre ESLint + typecheck y pasa.
- [ ] CI local (`npm test`) sigue verde.

---

## Fase 4 — Refactor de testabilidad: mutaciones puras + memo de contexto

**Objetivo:** profundizar `AppDataContext` (hoy un orquestador **somero** de 193 líneas) y
extraer la lógica de negocio a un módulo puro testeable.

**Por qué:** la lógica de grupos/sesiones/invitaciones vive incrustada en un componente React
atado a hooks → **sin localidad** y **sin tests**. Es el módulo que más decisiones toma y el
único core sin cobertura.

**Pasos:**
1. **A1 — Módulo de mutaciones puro** (`src/domain/mutations.ts` o similar):
   funciones `data + intención → { siguiente data, doc a persistir }` para
   crear/actualizar/borrar grupo, crear/confirmar sesión, guardar horario. Incluye dedup de
   `invitedEmails` y generación de IDs (inyectar un `now()`/`id()` para testear deterministamente).
2. **A4 — `resolveInvitations(groups, userId, email) → { groups, writes[] }`** como función
   pura extraída de `loadWorkSyncData`. El llamador ejecuta los `writes`; cargar deja de tener
   efecto de escritura embebido.
3. Reescribir `AppDataContext` como adaptador delgado: cablea estado React → módulo puro →
   repositorio. Mantener la misma interfaz pública (`AppDataContextValue`) intacta.
4. **C2 — Memoizar** el `value` del contexto con `useMemo`/`useCallback` para que los
   consumidores no re-rendericen ante cualquier cambio.
5. Tests unitarios directos sobre `mutations.ts` y `resolveInvitations`.

**Archivos:** `src/services/AppDataContext.tsx`, `src/services/worksyncRepository.ts`,
nuevos `src/domain/mutations.ts` + `mutations.test.ts`, `src/domain/invitations.ts` + test.

**Criterios de aceptación:**
- [ ] La interfaz `AppDataContextValue` no cambia (las páginas no se tocan).
- [ ] Lógica de mutaciones e invitaciones cubierta por tests puros.
- [ ] `value` del contexto memoizado.
- [ ] `npm test`, `npm run lint`, `npm run build` verdes.

---

## Fase 5 — Consolidar persistencia en una sola costura

**Objetivo:** eliminar la forma duplicada "escribe Firestore + muta copia local + persistLocal"
repetida en 6 funciones del repositorio.

**Depende de:** Fase 2 (sin la rama REST, la consolidación es trivial).

**Pasos:**
1. Crear una costura `persistDoc(coleccion, id, valor)` y `removeDoc(coleccion, id)` que
   escondan la decisión SDK/local.
2. Reescribir `saveSchedule`, `saveGroup`, `updateGroup`, `deleteGroup`, `saveSession`,
   `confirmSession` para llamar a la costura una vez cada una.
3. Tests sobre la costura con un doble (mock) de Firestore.

**Archivos:** `src/services/worksyncRepository.ts`.

**Criterios de aceptación:**
- [ ] Un cambio de estrategia de persistencia toca un solo lugar.
- [ ] `npm test` y `npm run build` verdes.

---

## Fase 6 — Actualizar dependencias

**Objetivo:** subir versiones mayores con la red de seguridad ya puesta.

**Por qué al final:** React 18→19 y Firebase ^11 tienen mayores disponibles; conviene hacerlo
con ESLint + tests cubriendo, no antes.

**Pasos:**
1. Revisar changelog de React 19 y migrar (revisar APIs deprecadas).
2. Revisar Firebase mayor disponible y migrar imports si cambian.
3. `react-router-dom` ya en v7: verificar que no haya warnings.
4. `npm test`, `npm run lint`, `npm run build` y smoke test manual completo.

**Archivos:** `package.json`, ajustes puntuales por breaking changes.

**Criterios de aceptación:**
- [ ] Build, tests y lint verdes tras la actualización.
- [ ] Smoke test: login, horario, grupos, recomendaciones, calendario.

---

## Notas de seguimiento

- Considerar crear `CONTEXT.md` con el glosario de dominio (grupo, horario, sesión,
  recomendación, invitación) y ADRs para decisiones que no deban re-litigarse
  (ej. "no hay modo público sin auth").
- Las Fases 4 y 5 deberían reducir el tamaño de `AppDataContext` y `worksyncRepository`
  significativamente; medir antes/después.
