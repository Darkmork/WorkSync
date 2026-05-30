# Plan de funcionalidades WorkSync — por prioridad de importancia para el usuario

**Fecha:** 2026-05-29
**Estado:** propuesto (pendiente de implementar)
**Alcance:** mejoras de producto que fortalecen el uso **en grupo** y el uso **personal** de la app.

> Este documento complementa al plan técnico `2026-05-29-worksync-plan-mejoras.md`
> (seguridad, arquitectura, tooling, dependencias). Aquel es la base; este es el crecimiento
> funcional. Conviene tener cerradas al menos las Fases 1–4 del plan técnico (reglas seguras +
> mutaciones puras + tests) antes de construir encima.

## Cómo usar este documento

Las funcionalidades están ordenadas **por importancia para el usuario final de WorkSync**, no por
esfuerzo. Es decir: P1 es lo que más cambia su experiencia, P4 lo que menos.

El **orden de ejecución puede diferir del orden de prioridad** cuando hay dependencias técnicas
o de infraestructura (por ejemplo, las notificaciones requieren backend; las zonas horarias
sostienen otras piezas). Cada ítem marca su esfuerzo y sus dependencias para poder reordenar
la ejecución sin perder de vista qué es lo más valioso.

Marca cada ítem al completarlo. No cerrar un ítem sin cumplir sus **criterios de aceptación**.

## Diagnóstico de fondo

WorkSync hoy es un **coordinador de horarios grupal con una grilla con forma de horario escolar**:

1. **El uso personal está apagado.** El motor de recomendaciones (`src/domain/recommendations.ts`)
   solo se enciende con un grupo que tenga horarios cargados. Un usuario solo recibe una grilla
   estática + tareas + agenda + clima, sin la "inteligencia" que promete el lema.
2. **La grilla es rígida y escolar.** `timeSlots` en `src/types/worksync.ts` fija clases
   08:00–15:40, almuerzo y horas de tarde; las recomendaciones solo miran **lun–vie**
   (`days.slice(0, 5)` en `recommendations.ts`). No sirve para trabajo, fines de semana ni vida
   personal sin forzarla.
3. **La coordinación es de baja resolución.** Las sesiones (`GroupSession`) tienen un estado
   global (`proposed/confirmed/cancelled`); no hay confirmación por integrante, ni recordatorios,
   ni transparencia de quién está libre cuándo.

## Resumen de prioridades

| # | Prioridad | Funcionalidad | Lado | Esfuerzo | Backend nuevo |
|---|-----------|---------------|------|----------|---------------|
| 1 | **P1** | Panel de insights personales + recomendador personal ✅ **HECHO** | Personal | M | No |
| 2 | **P1** | Mapa de calor de disponibilidad del grupo ✅ **HECHO** | Grupo | M | No |
| 3 | **P2** | Recordatorios y notificaciones ✅ **HECHO (backend A+B)** | Ambos | L | **Sí** (Cloud Functions) |
| 4 | **P2** | RSVP por integrante en sesiones ✅ **HECHO** | Grupo | M | No |
| 5 | **P2** | Integrar tareas con el horario | Personal | M | No |
| 6 | **P3** | Grilla flexible + ventana horaria por grupo | Ambos | M-L | No |
| 7 | **P3** | Modo votación / encuesta de horarios | Grupo | M | No |
| 8 | **P4** | Zonas horarias de punta a punta | Ambos | M | No |
| 9 | **P4** | Sincronización bidireccional con Google Calendar | Personal | M-L | Parcial |
| 10 | **P4** | PWA + push / instalable en móvil | Ambos | M | Parcial |

Esfuerzo: S = pequeño, M = medio, L = grande.

---

## P1 · Lo que más cambia la experiencia

### 1. Panel de insights personales + recomendador personal — ✅ HECHO (2026-05-29)

> **Estado:** implementado. Módulos puros nuevos `src/domain/personalInsights.ts`
> (`computePersonalInsights`) y `buildPersonalRecommendations` en `src/domain/recommendations.ts`,
> ambos con tests (`personalInsights.test.ts`, casos añadidos a `recommendations.test.ts`).
> El contexto expone `personalInsights` y `personalRecommendations` (memoizados). Nuevo
> componente `src/components/InsightsPanel.tsx` integrado en el Dashboard; el bloque de
> recomendaciones grupales ahora solo aparece si hay grupo. Suite 46/46 verde, lint 0 errores,
> build OK. Pendiente: commit/deploy (a confirmar) y verificación visual.

**Objetivo:** que la app entregue valor real a un usuario **sin grupo**, encendiendo el motor a
nivel individual.

**Por qué importa para el usuario:** es exactamente lo pedido ("mejor evaluada para uso personal").
Hoy un usuario solo no recibe nada del núcleo del producto.

**Qué cambia (alcance):**
- **Insights:** tarjeta/sección con estadísticas de la semana del usuario: horas libres vs
  comprometidas, cantidad de bloques `preferred` aprovechados, día más cargado y más libre,
  "horas de foco disponibles". Todo derivado de su `UserSchedule`.
- **Recomendador personal:** reutilizar `buildRecommendations` para un "grupo de uno" (el propio
  usuario) y mostrar "tus mejores bloques libres/preferidos esta semana" en el Dashboard, aunque
  no exista grupo.

**Archivos:** nuevo `src/domain/personalInsights.ts` (puro, con tests); ajuste en
`src/domain/recommendations.ts` para aceptar un solo `UserSchedule`; nueva sección en
`src/pages/DashboardPage.tsx`; opcional componente `src/components/InsightsPanel.tsx`.

**Esfuerzo:** M. **Dependencias:** ninguna (datos ya existen). **Backend:** no.

**Criterios de aceptación:**
- Un usuario sin grupos ve insights y al menos 1 recomendación personal en el Dashboard.
- La lógica de insights vive en un módulo puro con tests unitarios.
- No rompe el caso con grupo (las recomendaciones grupales siguen igual).

### 2. Mapa de calor de disponibilidad del grupo — ✅ HECHO (2026-05-29)

> **Estado:** implementado. Módulo puro `src/domain/availabilityHeatmap.ts`
> (`computeAvailabilityHeatmap`, `cellAt`) con tests (`availabilityHeatmap.test.ts`). Nuevo
> componente `src/components/AvailabilityHeatmap.tsx` (grilla día×bloque, intensidad de verde
> según cuántos integrantes están libres, tooltip por celda) integrado en `RecommendationsPage`
> bajo las recomendaciones del grupo seleccionado. Suite verde, lint 0 errores, build OK.

**Objetivo:** hacer **visible y confiable** por qué WorkSync recomienda un bloque.

**Por qué importa para el usuario:** hoy solo ve un *score* opaco (0–100). Un mapa de calor le
permite entender y confiar en la coordinación, y negociar manualmente si quiere.

**Qué cambia (alcance):** vista por grupo que muestra, por bloque de la semana, cuántos integrantes
están `free`/`preferred`/`occupied`, con intensidad de color y conteo. Se apoya en `schedules`
(ya cargados) y en la grilla existente (`ScheduleGrid`).

**Archivos:** nuevo `src/domain/availabilityHeatmap.ts` (puro, con tests) que agregue estados por
bloque; nuevo componente `src/components/AvailabilityHeatmap.tsx`; integrarlo en
`src/pages/RecommendationsPage.tsx` o en una vista de grupo.

**Esfuerzo:** M. **Dependencias:** ninguna. **Backend:** no.

**Criterios de aceptación:**
- Para un grupo con ≥2 horarios, se ve el conteo de disponibilidad por bloque.
- La agregación es un módulo puro con tests.
- Consistente con el score: el bloque mejor recomendado es visiblemente el más "caliente".

---

## P2 · Coordinación real y no perder compromisos

### 3. Recordatorios y notificaciones — ✅ BACKEND HECHO (2026-05-29)

> **V1 sin backend (hecha):** centro de notificaciones in-app derivado de datos que el usuario
> ya carga. Módulo puro `src/domain/notifications.ts` (`computeNotifications`, `now` inyectable)
> con tests. Componente `src/components/NotificationsBell.tsx` (campana + badge + panel) en
> `AppShell`. Cubre: invitación pendiente por correo, sesión propuesta esperando confirmación,
> y sesión confirmada dentro de los próximos 2 días. Sigue activo como *fallback* cuando Firebase
> no está configurado (modo demo/local).
>
> **Backend (hecho — Capas A+B):** Cloud Functions v2 en `functions/src/index.ts`:
> - `onSessionCreated` (trigger Firestore) → avisa a los miembros del grupo cuando se **propone**
>   una sesión.
> - `onSessionConfirmed` (trigger Firestore) → avisa cuando una sesión pasa a **confirmada**.
> - `sendSessionReminders` (scheduler, cada 15 min, TZ `America/Santiago`) → **recordatorio** a
>   los miembros ~1 h antes de una sesión confirmada; marca `reminderSent` para no repetir.
>
> Fan-out idempotente a `notifications/{uid}/items/{key}` con claves deterministas
> (`proposed-…`, `confirmed-…`, `reminder-…`). Escrituras **solo** desde Functions (Admin SDK
> salta las reglas); las reglas permiten al dueño leer y marcar como leído, y prohíben
> create/delete a clientes. Cliente: `src/services/notifications.ts` (`subscribeNotifications`
> con `onSnapshot`, `markNotificationRead`); `NotificationsBell` se suscribe al inbox cuando
> `firebaseEnabled` y muestra estado **leído/no leído** persistente. Estado "leído" persistente
> ✅. Verificado en el **emulador** (Firestore + Functions): `proposed-*` y `confirmed-*` creados
> end-to-end (`SMOKE OK`, ver `functions/smoke.js`). Funciones compilan; web 55/55 tests, lint y
> build OK.
>
> **Pendiente (futuro):** notificaciones por **correo** y **push** móvil (se cruza con ítem 10,
> PWA + push). El `deploy` de las Functions requiere `firebase deploy --only functions`
> (proyecto ya en Blaze) — aún no desplegado.

**Objetivo:** que el usuario no pierda sesiones ni tareas y se entere de invitaciones/cambios.

**Por qué importa para el usuario:** una app de coordinación sin avisos se olvida. Altísimo valor
de retención y utilidad (aunque es el ítem de mayor esfuerzo).

**Qué cambia (alcance):**
- Avisos al ser invitado a un grupo, al proponerse/confirmarse una sesión, y recordatorio antes
  de una sesión o de una tarea con fecha.
- Empezar simple: notificaciones **in-app** (campana + lista) leyendo el estado existente; luego
  email vía Cloud Functions; push como evolución (ver ítem 10).

**Archivos:** Cloud Functions nuevas (carpeta `functions/`), o disparadores en Firestore;
`src/components/AppShell.tsx` (campana/centro de notificaciones); nueva colección `notifications`.

**Esfuerzo:** L. **Dependencias:** reglas seguras (Fase 1 del plan técnico) ya cerradas.
**Backend:** **sí** (Cloud Functions + plan Blaze).

**Criterios de aceptación:**
- Al invitar a alguien y confirmar una sesión, el destinatario ve una notificación in-app.
- Existe al menos un recordatorio temporal (antes de la sesión) funcionando.

### 4. RSVP por integrante en sesiones — ✅ HECHO (2026-05-29)

> **Hecho:** cada integrante marca *Asisto / Quizás / No asisto* en
> `SessionDetailPage`; la sesión muestra "X de Y confirmados" y el detalle por
> persona (badge de estado, incluidos los "sin responder"). `GroupSession` gana
> el mapa `rsvps` (userId → estado). Lógica nueva: módulo puro
> `src/domain/rsvp.ts` (`summarizeRsvps`, con tests), mutación pura
> `setRsvp` en `mutations.ts` (write con *path* anidado `rsvps.<uid>` para tocar
> solo la propia respuesta), helper `rsvpLabel`. Contexto expone `setRsvp`.
> **Reglas Firestore:** `rsvpEditIsOwnOnly()` — un miembro solo puede editar su
> propia clave en `rsvps` (verificado con `diff().affectedKeys().hasOnly([uid])`);
> nadie edita la de otro. Verificado: web 60/60 tests, **20/20 rules tests** (4
> nuevos de RSVP), lint y build OK.

**Objetivo:** pasar de un estado global de sesión a "quién asiste".

**Por qué importa para el usuario:** saber cuántos y quiénes confirmaron es el dato que de verdad
necesita el organizador y los integrantes.

**Qué cambia (alcance):** cada integrante marca *asisto / no / quizás*; la sesión muestra
"3 de 5 confirmados" y la lista por persona. `GroupSession` gana un mapa de respuestas por usuario.

**Archivos:** `src/types/worksync.ts` (campo `rsvps` en `GroupSession`); mutación nueva en
`src/domain/mutations.ts` (`setRsvp`, pura, con tests); `src/pages/SessionDetailPage.tsx` (UI);
reglas Firestore para que un usuario solo edite su propio RSVP.

**Esfuerzo:** M. **Dependencias:** ninguna fuerte. **Backend:** no (Firestore directo).

**Criterios de aceptación:**
- Cada integrante puede fijar/cambiar su propia respuesta y nadie puede editar la de otro.
- La sesión muestra el conteo y el detalle por persona.
- La mutación de RSVP es pura y testeada.

### 5. Integrar tareas con el horario

**Objetivo:** cerrar el loop de planificación personal (tareas + disponibilidad en un solo lugar).

**Por qué importa para el usuario:** hoy `Task` no se conecta con la grilla ni las sesiones; las
tareas viven aisladas. Conectarlas convierte la app en un planificador real del día.

**Qué cambia (alcance):**
- Ver las tareas del día en la agenda (`CalendarAgenda`) junto a los eventos.
- "Agendar" una tarea en un bloque libre del horario.
- Resumen tipo "hoy tienes 3 tareas y 4 bloques libres".

**Archivos:** `src/types/worksync.ts` (opcional: `blockRef` o `scheduledAt` en `Task`);
`src/domain/tasks.ts` (lógica de cruce tareas↔bloques, pura + tests);
`src/components/CalendarAgenda.tsx` y `src/components/TaskList.tsx`.

**Esfuerzo:** M. **Dependencias:** se potencia con el ítem 1 (insights). **Backend:** no.

**Criterios de aceptación:**
- Las tareas del día aparecen en la agenda.
- Se puede asociar una tarea a un bloque libre y se refleja en la grilla/agenda.
- La lógica de cruce está en un módulo puro con tests.

---

## P3 · Flexibilidad y alcance

### 6. Grilla flexible + ventana horaria por grupo

**Objetivo:** quitar la forma escolar fija y permitir otros casos de uso (trabajo, fines de semana,
vida personal).

**Por qué importa para el usuario:** la grilla actual (clases + almuerzo + lun–vie) no representa
a la mayoría de los usos reales fuera de un contexto escolar.

**Qué cambia (alcance):**
- Que el usuario elija horario laboral, granularidad e incluir fines de semana en su grilla.
- Que cada grupo defina su **ventana válida** (días/horas), y que `buildRecommendations` la respete
  en lugar de asumir lun–vie y `timeSlots` escolares.

**Archivos:** `src/types/worksync.ts` (config de grilla y ventana de grupo);
`src/domain/recommendations.ts` (parametrizar días/slots en vez de constantes fijas);
`src/components/ScheduleGrid.tsx`, `src/pages/SchedulePage.tsx`, `src/pages/GroupsPage.tsx`.

**Esfuerzo:** M-L (toca el modelo y datos existentes → cuidar migración). **Dependencias:** conviene
hacerlo antes de zonas horarias (ítem 8). **Backend:** no.

**Criterios de aceptación:**
- Las recomendaciones consideran fin de semana y horas configurables, no solo lun–vie escolar.
- Los horarios ya guardados siguen cargando (migración/compatibilidad verificada).

### 7. Modo votación / encuesta de horarios

**Objetivo:** decidir en grupo entre varias opciones cuando no hay un claro ganador.

**Por qué importa para el usuario:** complementa la recomendación automática con decisión humana
(estilo Doodle), útil cuando los horarios no coinciden bien.

**Qué cambia (alcance):** el organizador propone 2–3 bloques candidatos (tomados de las
recomendaciones) y los integrantes votan; gana el más votado y se convierte en sesión.

**Archivos:** nueva entidad `Poll` en `src/types/worksync.ts`; mutaciones puras en
`src/domain/mutations.ts`; UI en `src/pages/RecommendationsPage.tsx` / nueva página de votación.

**Esfuerzo:** M. **Dependencias:** se apoya en ítem 4 (RSVP/votos) y en notificaciones (ítem 3)
para avisar. **Backend:** no (Firestore directo).

**Criterios de aceptación:**
- Se puede crear una encuesta con candidatos, votar y cerrarla creando la sesión ganadora.
- Mutaciones puras y testeadas.

---

## P4 · Robustez de plataforma

### 8. Zonas horarias de punta a punta

**Objetivo:** que la grilla y las recomendaciones respeten zonas horarias (hoy solo `calendar.ts`
usa `userTimeZone()`).

**Por qué importa para el usuario:** sin TZ, los grupos con integrantes en husos distintos calculan
mal los bloques comunes.

**Qué cambia (alcance):** almacenar y mostrar bloques/sesiones con TZ explícita; normalizar al
cruzar horarios de distintos usuarios.

**Archivos:** `src/types/worksync.ts`, `src/domain/recommendations.ts`,
`src/domain/calendarMapping.ts`, componentes de horario.

**Esfuerzo:** M. **Dependencias:** mejor después de la grilla flexible (ítem 6). **Backend:** no.

**Criterios de aceptación:**
- Dos usuarios en husos distintos obtienen recomendaciones coherentes en su hora local.

### 9. Sincronización bidireccional con Google Calendar

**Objetivo:** mantener horario ↔ Calendar sincronizados, no solo un import puntual.

**Por qué importa para el usuario:** hoy el import marca todo como *ocupado* de una sola vez y
`createEvent` siempre escribe en `primary`. Una sync real reduce trabajo manual.

**Qué cambia (alcance):** elegir calendario destino, re-importar manteniendo estados, y reflejar
sesiones confirmadas en el calendario elegido.

**Archivos:** `src/services/calendar.ts` (parametrizar calendario en `createEvent`);
`src/domain/calendarMapping.ts`; `src/pages/SchedulePage.tsx` y `SessionDetailPage.tsx`.

**Esfuerzo:** M-L. **Dependencias:** zonas horarias (ítem 8) ayudan a la precisión.
**Backend:** parcial (refresh de token / OAuth robusto).

**Criterios de aceptación:**
- El usuario elige a qué calendario se crean los eventos.
- Re-importar no pisa estados marcados manualmente sin avisar.

### 10. PWA + push / instalable en móvil

**Objetivo:** que WorkSync se sienta una app móvil instalable con notificaciones push.

**Por qué importa para el usuario:** la app se siente de escritorio; instalable + push mejora mucho
el uso diario y habilita los recordatorios del ítem 3 en el móvil.

**Qué cambia (alcance):** manifest + service worker (PWA), instalación en pantalla de inicio, y push
sobre la infraestructura de notificaciones.

**Archivos:** `vite.config` / plugin PWA, `public/manifest`, service worker; integración con
Cloud Messaging y el centro de notificaciones del ítem 3.

**Esfuerzo:** M. **Dependencias:** ítem 3 (notificaciones) para el push. **Backend:** parcial (FCM).

**Criterios de aceptación:**
- La app es instalable (pasa auditoría PWA básica).
- Llega al menos un push de recordatorio en móvil.

---

## Notas de secuencia recomendada (ejecución)

Aunque la **prioridad por valor** es la de arriba, una secuencia de **ejecución** sensata sería:

1. **Ítems 1 y 2** (P1, sin backend, reutilizan datos) → valor inmediato, bajo riesgo.
2. **Ítem 4** (RSVP) y **ítem 5** (tareas↔horario) → coordinación y planificación sin backend.
3. **Ítem 6** (grilla flexible) → desbloquea casos de uso y prepara el terreno.
4. **Ítem 3** (notificaciones) → primer trabajo de backend serio; habilita ítems 7 y 10.
5. **Ítems 8, 9, 7, 10** → robustez y extras encima de lo anterior.
