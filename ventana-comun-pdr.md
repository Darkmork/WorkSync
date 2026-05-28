---
title: "PDR — Ventana Común"
date: 2026-05-27
type: "pdr"
tags: [producto, coordinacion-horarios, colaboracion, educacion]
---

# PDR — Ventana Común

> **Tagline:** El mejor momento para juntarse, encontrado en un clic.
> **Categoría:** Coordinación colaborativa de horarios / productividad grupal.
> **Valor central:** No es un calendario más; cruza la disponibilidad real del grupo, pondera preferencias y contexto (clima, fecha límite, duración) y **recomienda** el mejor momento — no solo lo muestra.

---

## 1. Idea central

| Campo | Detalle |
|---|---|
| **Nombre** | Ventana Común (alt. moderno: *StudySync*) |
| **Tagline** | "El mejor momento para juntarse, encontrado en un clic." |
| **Categoría** | Coordinación de horarios grupales con recomendación inteligente |
| **Propuesta de valor** | Convierte una matriz semanal de disponibilidad en una **recomendación accionable**: el mejor bloque para reunirse, justificado por disponibilidad, duración, preferencias y contexto. |

La diferencia frente a Doodle, When2meet o un calendario compartido: esas herramientas **muestran** datos y dejan la decisión al humano. Ventana Común **decide y justifica** ("martes 15:30–17:00, todos libres, bloque más largo, clima favorable").

---

## 2. Definición del problema

Coordinar un horario entre 3+ personas hoy implica:

- **Cadenas de mensajes interminables** en WhatsApp → se pierden mensajes, nadie confirma, se decide tarde.
- **Comparación mental de calendarios** → propenso a errores, alguien siempre queda fuera.
- **Doodle/When2meet** → muestran una grilla de disponibilidad pero **no recomiendan**; el grupo sigue discutiendo cuál bloque elegir.
- **No consideran contexto** → eligen un horario presencial y luego llueve; eligen un bloque que tres odian; no contemplan la fecha límite del trabajo.

**Costo:** entre estudiantes, un trabajo grupal puede tardar 2–3 días solo en acordar cuándo juntarse. Entre docentes/equipos, las reuniones de coordinación se posponen por falta de un momento común claro.

**Por qué ahora:** Calendarios digitales (Google, Outlook) ya son ubicuos y exponen APIs de disponibilidad (Freebusy, getSchedule). Es posible automatizar el cruce sin carga manual — la pieza que falta es la capa de recomendación.

---

## 3. Audiencia objetivo

**Usuario primario — Estudiante (secundaria/universidad):**
- Dolor: coordinar trabajos y grupos de estudio antes de pruebas.
- Frecuencia: varias veces por semestre, picos antes de evaluaciones.
- Comportamiento actual: WhatsApp + memoria + suerte.

**Usuarios secundarios:**
- **Docentes** → reuniones de departamento, reforzamientos, entrevistas con apoderados.
- **Equipos de trabajo pequeños** → standups, revisiones, coordinación de proyectos.
- **Coordinación escolar** → reuniones inter-profesores, tutorías, uso de salas.

**Mercados iniciales (orden de ataque):**
1. **Grupos de estudio universitarios** — fáciles de alcanzar (boca a boca en campus), dolor agudo y recurrente.
2. **Cursos de secundaria con trabajos grupales** — adopción viral por curso.
3. **Departamentos docentes** — mayor disposición a pagar / licencia institucional (fase posterior).

---

## 4. Visión de la solución

**El problema:** acordar un momento común es lento, manual y sin criterio.

**La solución:** cada integrante carga (o conecta) su disponibilidad; el sistema cruza automáticamente, puntúa cada bloque candidato y entrega un **ranking de mejores momentos** con justificación. El grupo confirma con un clic y la sesión se propaga a sus calendarios.

**Diferenciadores clave:**
- **Recomendación, no solo visualización** → la app dice *cuándo*, no solo *cuándo se puede*.
- **Preferencias además de disponibilidad** → estados "preferido" / "evitar", no solo libre/ocupado.
- **Inteligencia contextual** → clima para presencial, urgencia por fecha límite, duración del bloque.
- **Coordinación end-to-end** → del horario común a la sesión, tareas y recordatorios sin salir de la app.

**Capacidades centrales:**
1. Cruce automático de disponibilidad multi-usuario → ventanas comunes.
2. Motor de puntaje → ranking de bloques con explicación.
3. Sesiones grupales con modalidad, ubicación, clima y tareas.
4. Notificaciones y recordatorios.

---

## 5. Módulos del producto

**Módulo 1 — Horario personal**
- *Input:* el usuario marca bloques de su semana (o conecta Google/Outlook).
- *Proceso:* almacena estado por bloque (libre / ocupado / preferido / evitar) y tipo (clase, trabajo, estudio, personal).
- *Output:* matriz semanal de disponibilidad.
- *Por qué importa:* base de todo; los estados de preferencia son la materia prima de la recomendación.

**Módulo 2 — Amigos y grupos**
- *Input:* el usuario agrega contactos y crea grupos.
- *Proceso:* asocia integrantes a un grupo con tipo y color.
- *Output:* grupos listos para cruzar disponibilidad.
- *Por qué importa:* el grupo es la unidad de coordinación.

**Módulo 3 — Buscar mejor momento (función estrella)**
- *Input:* el usuario selecciona un grupo y (opcional) restricciones (antes del viernes, mínimo 60 min, presencial).
- *Proceso:* cruza disponibilidad, genera bloques candidatos, aplica el motor de puntaje.
- *Output:* ranking de 1–3 mejores momentos, cada uno con justificación.
- *Por qué importa:* es el corazón diferenciador del producto.

**Módulo 4 — Sesión grupal**
- *Input:* el grupo elige un bloque del ranking.
- *Proceso:* crea sesión con fecha, modalidad, ubicación/enlace, clima estimado.
- *Output:* sesión propuesta → confirmada; opción de agendar en calendario.
- *Por qué importa:* convierte la recomendación en compromiso real.

**Módulo 5 — Colaboración (votación, chat, tareas)**
- *Input:* integrantes votan horarios, escriben mensajes, crean tareas con responsable.
- *Proceso:* tallies de votos, hilo de chat por grupo, estado de tareas.
- *Output:* decisión consensuada + coordinación de trabajo centralizada.
- *Por qué importa:* evita salir a WhatsApp; la app se vuelve la sede del grupo.

---

## 6. Flujos de usuario

**Flujo A — Crear y cruzar (camino feliz del MVP)**
1. Usuario marca su horario → sistema guarda la matriz.
2. Usuario crea grupo "Proyecto Matemática" y agrega 3 amigos → sistema notifica e invita.
3. Cada amigo confirma su disponibilidad → sistema actualiza el cruce.
4. Usuario abre el grupo y pulsa **Buscar mejor momento** → sistema devuelve: *"Martes 15:30–17:00, los 4 libres, bloque más largo (90 min)."*
5. Usuario crea la sesión y la confirma → sistema marca sesión confirmada y notifica al grupo.
- **Resultado:** reunión acordada en minutos, sin discusión.

**Flujo B — Modo urgente**
1. Usuario activa "Necesitamos juntarnos antes del viernes".
2. Sistema relaja criterios: busca bloques 100% libres, luego donde falta 1 persona, luego fuera del horario habitual, luego online de 30 min.
3. Sistema devuelve la mejor opción factible con su trade-off explícito.
- **Resultado:** una reunión posible incluso bajo restricción dura.

**Flujo C — Votación**
1. Sistema propone los 3 mejores bloques.
2. Integrantes votan.
3. Sistema elige automáticamente el más votado (desempate por puntaje).
- **Resultado:** decisión colaborativa y legítima.

---

## 7. Diseño frontend

**Stack:**
- Framework: **React** + **Vite**
- Estilos: **Tailwind CSS**
- Estado: **Zustand** (ligero) + datos en tiempo real desde Firestore
- Routing: React Router

**Pantallas:**

1. **Mi horario**
   - Propósito: marcar disponibilidad semanal.
   - Elementos: grilla semanal (días × bloques), selector de estado, leyenda de colores.
   - Datos: bloques del usuario.
   - Colores: gris = ocupado, verde = libre, azul = preferido, amarillo = disponible con dificultad.

2. **Mis grupos**
   - Propósito: ver y crear grupos.
   - Elementos: tarjetas de grupo (color, tipo, nº integrantes), botón "nuevo grupo".
   - Datos: grupos del usuario y miembros.

3. **Buscar horario común**
   - Propósito: ejecutar la recomendación.
   - Elementos: botón **Buscar mejor momento**, tarjeta de recomendación destacada, lista de bloques alternativos con puntaje, filtros (duración mínima, antes de fecha, modalidad).
   - Datos: ranking de bloques, % disponibilidad, nº integrantes libres, duración.

4. **Propuesta de reunión**
   - Propósito: confirmar y agendar.
   - Elementos: fecha/hora, modalidad, lugar/enlace, widget de clima, tareas asociadas, botones "confirmar" y "agregar a Calendar".
   - Datos: detalle de la sesión.

5. **Grupo (detalle)** *(fase 2)*
   - Propósito: chat, votación y tareas.
   - Elementos: hilo de mensajes, panel de votación, lista de tareas con responsable/estado.

**Estructura de carpetas:**
```
src/
├── components/    (Grilla, TarjetaGrupo, CardRecomendacion, WidgetClima…)
├── pages/         (MiHorario, MisGrupos, BuscarHorario, Sesion)
├── services/      (api, calendario, clima, auth)
├── store/         (useHorarioStore, useGrupoStore)
└── hooks/         (useCruceDisponibilidad, useRanking)
```

---

## 8. Arquitectura técnica

**Opción recomendada (MVP rápido) — Firebase:**
- Auth: **Firebase Auth** (email + Google).
- DB: **Cloud Firestore** (tiempo real + offline, ideal para colaboración).
- Lógica: **Cloud Functions** para el motor de puntaje y llamadas a APIs externas (clima, calendario) sin exponer claves en el cliente.
- Hosting: **Firebase Hosting**.

**Opción robusta (si se busca proyecto formal/escalable):**
- Backend: **Spring Boot** (Java) o Node/Express.
- DB: **PostgreSQL** + ORM (JPA/Hibernate o Prisma).
- Capas: Controller → Service → Repository → External APIs.

**Capas del sistema (modelo conceptual, aplica a ambas):**
1. **Controller/Functions** — reciben peticiones del cliente.
2. **Service** — motor de cruce y puntaje, reglas de negocio.
3. **Repository** — acceso a datos.
4. **Integraciones externas** — Calendar, Clima, Maps, notificaciones.

**Integraciones:**
- Google Calendar (Freebusy + crear eventos) — para disponibilidad e invitaciones.
- Microsoft Graph (getSchedule) — disponibilidad institucional (fase 3).
- Open-Meteo — pronóstico por hora/coordenadas para sesiones presenciales.
- Google Maps — punto medio sugerido (fase 3).
- SendGrid/Resend — correos de invitación y recordatorio.

---

## 9. Capa de inteligencia (motor de recomendación)

En el MVP no se requiere LLM: el "inteligente" es un **motor de puntaje determinista**. Una capa de IA generativa es opcional en fases avanzadas.

**Agente 1 — Motor de cruce de disponibilidad**
- Función: intersecta las matrices de todos los integrantes y genera bloques candidatos contiguos.
- Input: matrices semanales + restricciones (duración, ventana de fechas, modalidad).
- Output: lista de bloques candidatos con % de disponibilidad y nº de integrantes libres.

**Agente 2 — Motor de puntaje (ranking)**
- Función: asigna puntaje a cada bloque candidato.
- Tabla de criterios (configurable):

| Criterio | Puntaje |
|---|---|
| Todos libres | +50 |
| Bloque largo | +20 |
| Horario preferido por integrantes | +15 |
| Clima favorable (si presencial) | +10 |
| Cercano a la fecha límite | +10 |
| Horario marcado "evitar" | −15 c/u |
| Muy tarde / fuera de rango | −10 |

- Output: ranking ordenado + **justificación legible** generada a partir de los criterios que más sumaron.

**Agente 3 — Enriquecimiento contextual**
- Función: consulta Open-Meteo (clima del bloque/ubicación) y la fecha límite del grupo, alimentando al motor de puntaje.
- Output: factores de contexto que ajustan el ranking y disparan recomendaciones ("se sugiere online por probabilidad de lluvia").

**Interacción:** Cruce → Enriquecimiento → Puntaje → Recomendación final mostrada al usuario.

*(Fase 4 opcional)* — Capa LLM para resúmenes semanales del grupo en lenguaje natural y para parsear pedidos en lenguaje libre ("júntennos un rato esta semana, mejor en la tarde").

---

## 10. Esquema de base de datos

```
usuarios
- id (PK)
- nombre
- correo
- foto
- contexto        (carrera / curso / equipo)
- preferencias    (json: horarios favoritos, etc.)
- created_at / updated_at

bloques_horarios
- id (PK)
- usuario_id (FK → usuarios)
- dia            (lun..dom)
- hora_inicio
- hora_fin
- estado         (libre | ocupado | preferido | evitar)
- tipo           (clase | trabajo | deporte | personal | estudio)

grupos
- id (PK)
- nombre
- descripcion
- color
- tipo           (estudio | proyecto | trabajo | personal)
- creado_por (FK → usuarios)

grupo_integrantes        (tabla puente N:M)
- grupo_id (FK → grupos)
- usuario_id (FK → usuarios)
- rol            (admin | miembro)

sesiones
- id (PK)
- grupo_id (FK → grupos)
- fecha
- hora_inicio
- hora_fin
- modalidad      (presencial | online)
- ubicacion
- enlace
- clima          (json: resumen del pronóstico)
- estado         (propuesta | confirmada | cancelada)

votos                    (fase 2)
- id (PK)
- sesion_propuesta_id (FK)
- usuario_id (FK)

tareas
- id (PK)
- sesion_id (FK → sesiones)
- titulo
- responsable_id (FK → usuarios)
- estado         (pendiente | en_proceso | listo)
- fecha_entrega
- comentario

mensajes                 (fase 2)
- id (PK)
- grupo_id (FK → grupos)
- usuario_id (FK)
- texto
- created_at
```

**Relaciones:**
- usuario 1—N bloques_horarios
- grupo N—N usuarios (vía grupo_integrantes)
- grupo 1—N sesiones; sesión 1—N tareas
- grupo 1—N mensajes

> En Firestore esto se modela como colecciones (`usuarios`, `grupos`, `sesiones`) con subcolecciones (`grupos/{id}/mensajes`, `sesiones/{id}/tareas`) y un campo `integrantes` en cada grupo.

---

## 11. Endpoints de API

> Si se usa Firebase, gran parte es SDK directo a Firestore; los listados abajo aplican a la variante con backend propio (Spring Boot/Express).

```
Autenticación
POST   /api/auth/register
POST   /api/auth/login
GET    /api/auth/me
POST   /api/auth/logout

Horario
GET    /api/horarios/:usuarioId
PUT    /api/horarios/:usuarioId/bloques
POST   /api/horarios/import/google      (Freebusy)

Amigos / Grupos
POST   /api/grupos
GET    /api/grupos
GET    /api/grupos/:id
PUT    /api/grupos/:id
POST   /api/grupos/:id/integrantes
DELETE /api/grupos/:id/integrantes/:usuarioId

Recomendación (función estrella)
POST   /api/grupos/:id/buscar-mejor-momento
       body: { duracionMin, antesDe, modalidad }
       resp: { ranking: [{ inicio, fin, puntaje, disponibilidad, justificacion }] }

Sesiones
POST   /api/sesiones
GET    /api/sesiones/:id
PUT    /api/sesiones/:id            (confirmar / cancelar)
POST   /api/sesiones/:id/calendar   (crear evento en Google/Outlook)

Colaboración (fase 2)
POST   /api/sesiones/:id/votos
GET    /api/grupos/:id/mensajes
POST   /api/grupos/:id/mensajes
POST   /api/sesiones/:id/tareas
PUT    /api/tareas/:id

Contexto
GET    /api/clima?lat=&lon=&fecha=    (proxy a Open-Meteo)
```

---

## 12. Go-to-market

**Posicionamiento:** No "otro calendario", sino *"el botón que encuentra el mejor momento para tu grupo"*. Se vende el resultado (decisión rápida y justa), no la grilla.

**Estrategia de adopción:** viral por grupo — basta que una persona lo use y agregue a sus compañeros para que el curso/equipo adopte. Crecimiento bottom-up en campus.

**Precios (cuando aplique monetización):**
- **Gratis** → uso individual y grupos pequeños (hasta 5 integrantes, ingreso manual de horario). Suficiente para estudiantes.
- **Pro** (bajo costo mensual) → grupos ilimitados, integración Google Calendar, recordatorios por correo, modo urgente.
- **Institucional** (licencia por colegio/depto) → Microsoft 365/Graph, reserva de salas, panel de coordinación, soporte.

**Diferenciación:**
- Frente a Doodle/When2meet → ellos muestran, nosotros **recomendamos y justificamos**.
- Frente a Google Calendar → ellos gestionan eventos propios, nosotros **cruzamos varios calendarios y deciden el momento**.
- Contexto (clima, urgencia, preferencias) que ningún competidor combina.

**Lanzamiento:**
- Fase 1: MVP gratuito en un par de cursos/universidades piloto → validar que reduce el tiempo de coordinación.
- Fase 2: features colaborativos → aumentar retención y uso recurrente.
- Fase 3: integraciones → habilitar venta institucional.

---

## 13. Roadmap MVP

**Fase 1 — MVP**
Debe tener:
- Registro / inicio de sesión.
- Crear horario manual (estados libre/ocupado/preferido/evitar).
- Agregar amigos y crear grupos.
- Cruzar disponibilidad → mostrar bloques libres comunes.
- **Recomendación simple**: mejor bloque (todos libres + más largo) con justificación.
- Crear sesión grupal.

No debe tener (todavía):
- Integraciones con calendarios externos.
- Clima, mapas, chat, votación, tareas.
- App móvil nativa (web responsive basta).

Métrica de éxito: un grupo nuevo pasa de "necesitamos juntarnos" a "sesión confirmada" en **< 10 minutos**, sin recurrir a WhatsApp.

**Fase 2 — Colaboración**
- Votación de horarios.
- Chat de grupo.
- Tareas compartidas (responsable, estado, fecha).
- Notificaciones y recordatorios (correo).
- Estados de asistencia.

**Fase 3 — Integraciones**
- Google Calendar (Freebusy + crear eventos).
- Microsoft Outlook / Teams (getSchedule).
- Open-Meteo (clima para presencial).
- Google Maps (punto medio).
- Reuniones online (Meet/Zoom).

**Fase 4 — Inteligencia**
- Recomendación automática avanzada con motor de puntaje completo.
- Ranking ponderado de mejores horarios.
- Detección de conflictos.
- Modo urgente con relajación progresiva de criterios.
- Resumen semanal del grupo (opcional con LLM).

---

## Apéndice — Alternativas de nombre

| Nombre | Tono |
|---|---|
| **Ventana Común** *(recomendado)* | educativo, claro, en español |
| **StudySync** | moderno, orientado a estudiantes |
| TiempoComún / Coordina+ / LibreYa | español, directos |
| MeetMatch / PlanTogether / SyncTime | inglés, genéricos de productividad |
