# WorkSync — Diseño Fase 2: Google Calendar

**Fecha:** 2026-05-29
**Estado:** Aprobado para implementar
**Depende de:** Google Calendar API habilitada en el proyecto `worksync-gangale` (verificado: la API responde 401, no 403).

## Objetivo

Conectar Google Calendar del usuario para: (1) ver los eventos del día en el inicio, (2) crear la sesión como evento al confirmarla, (3) cruzar eventos ocupados con el horario semanal.

## Enfoque de autenticación

Usar el **Google provider de Firebase con scope de Calendar** (en vez de GIS token client) para no requerir el OAuth Client ID. En el login con Google se agrega el scope `https://www.googleapis.com/auth/calendar.events`. Tras `signInWithPopup`, se captura el access token con `GoogleAuthProvider.credentialFromResult(result).accessToken`.

**Limitación conocida:** el token de Firebase no se refresca solo y no sobrevive más de ~1h. Se guarda en `sessionStorage` (sobrevive recargas del tab). Cuando falta o expira (401), la UI muestra un botón "Conectar Google Calendar" que re-ejecuta el popup para obtener un token nuevo. Degradación elegante: sin token, las funciones de Calendar se ocultan/avisan, el resto de la app funciona igual.

## Componentes y capas

- **`src/services/calendar.ts`** (nuevo, framework-free salvo el fetch):
  - Token: `getToken`/`setToken`/`clearToken`/`hasToken` (módulo + `sessionStorage`).
  - `fetchEvents(timeMinISO, timeMaxISO)`: GET `calendar/v3/calendars/primary/events` con Bearer; `singleEvents=true&orderBy=startTime`. Lanza `CalendarAuthError` en 401.
  - `fetchTodayEvents()`, `fetchWeekEvents()` (lunes–domingo de la semana actual).
  - `createEvent({ summary, description, startISO, endISO })`: POST evento.
- **`src/services/auth.ts`**: `loginWithGoogle` agrega el scope y guarda el token; nueva `connectCalendar()` (re-popup para (re)obtener token); `logout` limpia el token.
- **`src/domain/calendarMapping.ts`** (nuevo, puro y testeable):
  - `toEventDateTime(dateISO, hhmm)`: arma ISO local.
  - `eventsToBusyBlocks(events, blocks)`: marca `occupied` + `note` los bloques que solapan cada evento (por día de semana y rango horario). No destructivo: devuelve nuevos bloques.
- **`src/components/CalendarAgenda.tsx`** (nuevo): tarjeta "Agenda de hoy" en el dashboard. Sin token → botón conectar. Con token → lista de eventos (hora + título). 401 → botón reconectar.
- **`DashboardPage`**: monta `<CalendarAgenda />`.
- **`SessionDetailPage`**: al confirmar, si hay token, crea el evento en Calendar (best-effort, no bloquea la confirmación).
- **`SchedulePage`**: botón "Importar de Google Calendar (semana)" → trae eventos de la semana, aplica `eventsToBusyBlocks` al borrador (el usuario revisa y guarda).

## Modelo de datos

- `Recommendation` y `GroupSession` ganan `dateISO?: string` (YYYY-MM-DD), calculado en `buildRecommendations` junto a `dateLabel`. Necesario para crear el evento con fecha real. Opcional para no romper datos demo.

## Manejo de errores

- 401 de Calendar → estado "reconectar", nunca rompe la página.
- Falla al crear evento en confirmación → la sesión igual queda confirmada; se avisa que el evento no se creó.
- Sin token → funciones de Calendar muestran botón conectar; el resto de la app intacto.

## Pruebas

- Unit: `toEventDateTime`, `eventsToBusyBlocks`, `nextDateISO`.
- Build + typecheck + vitest verdes.
- **No hay credenciales de Google para probar el flujo OAuth/Calendar en vivo**; se entrega checklist de prueba al usuario. Toda la capa Calendar degrada con elegancia si el token falla.

## Fuera de alcance (por ahora)

- Sincronización bidireccional continua / webhooks.
- Selección de calendario distinto a `primary`.
- Refresh silencioso de token (requeriría GIS token client + OAuth Client ID).
