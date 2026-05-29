# WorkSync — Diseño Fase 1 (y esquema de Fase 2)

**Fecha:** 2026-05-28
**Estado:** Aprobado para implementar (Fase 1)

## Contexto

WorkSync es una app React + TS + Vite + Firebase (Auth, Firestore, Hosting) para coordinar horarios de grupos y recomendar sesiones. Auth con Google ya funciona. Las reglas de Firestore están aseguradas (lectura autenticada, escritura por dueño). Este diseño cubre cuatro mejoras solicitadas por el usuario más una limpieza de datos.

El trabajo se divide en dos fases. La Fase 1 no depende de servicios externos y se despliega de inmediato. La Fase 2 (Google Calendar) requiere habilitar la Calendar API en Google Cloud y se diseñará en detalle aparte.

## Fase 1 — Alcance

1. **Bug: el horario no se guarda.** `updateSchedule` no maneja errores ni da feedback; si la escritura falla, el usuario no se entera.
2. **Notas por bloque del horario.** Texto libre opcional por bloque ("lo que se cumple en cada hora").
3. **To-do list en el inicio.** Tareas rápidas con fecha exacta, por usuario.
4. **Limpieza de datos de prueba.** Borrar grupos/sesiones de prueba de Firestore.

## Modelo de datos

### Tareas (colección nueva `tasks`)

```ts
interface Task {
  id: string;
  userId: string;
  title: string;
  date: string | null;   // ISO YYYY-MM-DD, exacta; null = sin fecha
  done: boolean;
  createdAt: number;      // epoch ms, para ordenar
}
```

Doc id = id generado por la app (`t-<timestamp>`), igual patrón que grupos/sesiones. Top-level `tasks` con campo `userId`.

### Notas por bloque (extensión de `ScheduleBlock`)

```ts
interface ScheduleBlock {
  day: DayKey;
  hour: string;
  state: ScheduleState;
  note?: string;          // NUEVO: texto libre, opcional
}
```

Se persiste dentro de `schedules/{uid}.blocks`. No requiere colección nueva. `normalizeScheduleBlocks` debe preservar `note` al rellenar slots faltantes.

## Reglas de Firestore (añadir)

```
match /tasks/{taskId} {
  allow read, delete: if isSignedIn() && request.auth.uid == resource.data.userId;
  allow create: if isSignedIn()
    && request.auth.uid == request.resource.data.userId
    && isString(request.resource.data.title);
  allow update: if isSignedIn() && request.auth.uid == resource.data.userId;
}
```

`schedules` no cambia: `note` viaja dentro de `blocks` (ya validado como lista).

## Componentes y capas

- **`src/services/tasksRepository.ts`** (nuevo): `loadTasks(uid)`, `saveTask(task)`, `toggleTask(id, done)`, `deleteTask(id)`. Mismo patrón que `worksyncRepository`: `setDoc`/`updateDoc`/`deleteDoc` con id de app; modo demo (sin Firebase) cae a localStorage.
- **`src/components/TaskList.tsx`** (nuevo): tarjeta para el inicio. Input (título + fecha opcional), lista ordenada por fecha/creación, checkbox para marcar hecha, botón borrar. Estados de carga/vacío.
- **`DashboardPage`**: monta `<TaskList />` en la columna lateral o bajo las recomendaciones.
- **`ScheduleGrid`**: en modo edición, clic en un bloque lo selecciona; un editor de nota (input) aparece bajo la grilla para el bloque seleccionado. La nota se muestra como etiqueta pequeña truncada dentro del bloque. Pintar estado y editar nota son acciones separadas (un "modo" o un control aparte) para no romper el flujo de pintura actual.
- **`SchedulePage` / `updateSchedule`**: `try/catch` con mensaje "Guardado ✓" o error visible; el borrador incluye las notas.

## Manejo de errores

- Guardado de horario y de tareas: capturar excepción, mostrar mensaje al usuario, no fallar en silencio.
- Carga de tareas: si falla, mostrar estado de error en la tarjeta, no romper el dashboard.

## Pruebas

- Unit: helpers puros nuevos (orden de tareas por fecha, normalización de bloques preservando `note`).
- Build + typecheck + vitest verdes antes de desplegar.
- No hay credenciales para probar el flujo autenticado en vivo; se valida por build/tests + revisión de código.

## Limpieza de datos

Borrar colecciones `groups` y `sessions` (todo es data de prueba; el usuario aún no creó datos reales). `users` y `schedules` quedan intactos. Vía `firebase firestore:delete`.

## Fase 2 — Google Calendar (esquema, se diseña aparte)

- **Dependencia del usuario:** habilitar Google Calendar API en Google Cloud Console del proyecto `worksync-gangale` y agregar el scope de Calendar al consentimiento OAuth.
- **Token:** Google Identity Services (GIS) token client para obtener el access token de Calendar bajo demanda (apto para SPA sin backend). Alternativa descartada: token de Firebase en memoria (no sobrevive a refresh).
- **Funciones:** leer eventos (hoy/semana) y mostrarlos en el inicio; crear evento en Calendar al confirmar una sesión; cruzar eventos ocupados → bloques "ocupado" del horario.
- Se escribirá su propio spec antes de implementar.
