import { useState } from "react";
import { CalendarDays, CheckCircle2, MapPin, Video } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { useAppData } from "../services/AppDataContext";
import { modalityLabel, rsvpLabel, sessionStatusLabel } from "../domain/labels";
import { createEvent, hasCalendarToken } from "../services/calendar";
import { toEventDateTime } from "../domain/calendarMapping";
import { summarizeRsvps, type RsvpResponse } from "../domain/rsvp";
import type { RsvpStatus } from "../types/worksync";

const rsvpOptions: Array<{ value: RsvpStatus; label: string }> = [
  { value: "yes", label: "Asisto" },
  { value: "maybe", label: "Quizás" },
  { value: "no", label: "No asisto" },
];

const rsvpBadgeClass = (status: RsvpResponse): string => {
  if (status === "yes") return "bg-status-free/20 text-tertiary";
  if (status === "no") return "bg-status-occupied/20 text-error-red";
  if (status === "maybe") return "bg-secondary-container/25 text-primary";
  return "bg-surface-container text-text-secondary";
};

const rsvpBadgeLabel = (status: RsvpResponse): string =>
  status === "pending" ? "Sin responder" : rsvpLabel(status);

export function SessionDetailPage() {
  const { sessionId } = useParams();
  const { data, currentUser, markSessionConfirmed, setRsvp } = useAppData();
  const [calendarMessage, setCalendarMessage] = useState("");
  const session = data?.sessions.find((item) => item.id === sessionId);
  const group = data?.groups.find((item) => item.id === session?.groupId);

  if (!data || !session) {
    return (
      <div className="rounded-xl border border-border-subtle bg-white p-8 shadow-soft">
        <h1 className="text-2xl font-bold">Sesion no encontrada</h1>
        <Link className="mt-4 inline-block font-bold text-primary" to="/recomendaciones">Volver a recomendaciones</Link>
      </div>
    );
  }

  const memberIds = group?.memberIds ?? [];
  const summary = summarizeRsvps(memberIds, session.rsvps);
  const myId = currentUser?.id;
  const isMember = Boolean(myId && memberIds.includes(myId));
  const myRsvp = myId ? session.rsvps?.[myId] : undefined;
  const userById = (id: string) => data.users.find((user) => user.id === id);

  const confirm = async () => {
    await markSessionConfirmed(session.id);
    if (hasCalendarToken() && session.dateISO) {
      try {
        await createEvent({
          summary: session.title,
          description: session.justification,
          startISO: toEventDateTime(session.dateISO, session.start),
          endISO: toEventDateTime(session.dateISO, session.end),
        });
        setCalendarMessage("Evento agregado a tu Google Calendar.");
      } catch {
        setCalendarMessage("Sesion confirmada, pero no se pudo crear el evento en Calendar.");
      }
    }
  };

  return (
    <div className="grid gap-8 pb-20 lg:grid-cols-[1.2fr_0.8fr] lg:pb-0">
      <section className="rounded-xl border border-border-subtle bg-white p-8 shadow-soft">
        <div className="flex items-center justify-between gap-4">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-primary">Detalle de sesion</p>
          <span
            className={`rounded-full px-3 py-1 font-mono text-xs ${
              session.status === "confirmed"
                ? "bg-status-free/20 text-tertiary"
                : session.status === "cancelled"
                  ? "bg-status-occupied/20 text-error-red"
                  : "bg-secondary-container/25 text-primary"
            }`}
          >
            {sessionStatusLabel(session.status)}
          </span>
        </div>
        <h1 className="mt-3 text-4xl font-bold">{session.title}</h1>
        <p className="mt-3 text-lg text-text-secondary">{group?.name}</p>

        <div className="mt-8 grid gap-5 md:grid-cols-2">
          <div className="flex items-start gap-3 rounded-xl bg-surface-container-low p-4">
            <CalendarDays className="text-primary" />
            <div>
              <p className="font-mono text-xs uppercase text-text-secondary">Fecha</p>
              <p className="font-bold">{session.dateLabel}, {session.start} - {session.end}</p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-xl bg-surface-container-low p-4">
            <Video className="text-primary" />
            <div>
              <p className="font-mono text-xs uppercase text-text-secondary">Modalidad</p>
              <p className="font-bold">{modalityLabel(session.modality)}</p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-xl bg-surface-container-low p-4 md:col-span-2">
            <MapPin className="text-primary" />
            <div>
              <p className="font-mono text-xs uppercase text-text-secondary">Lugar</p>
              <p className="font-bold">{session.location}</p>
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-xl border border-primary/20 bg-primary-container/10 p-5">
          <h2 className="font-bold text-primary">Justificacion WorkSync</h2>
          <p className="mt-2 text-on-surface-variant">{session.justification}</p>
        </div>

        {isMember && (
          <div className="mt-8 rounded-xl border border-border-subtle p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-bold">Tu asistencia</h2>
              <span className="font-mono text-xs text-text-secondary">
                {summary.yes} de {summary.total} confirmados
              </span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {rsvpOptions.map((option) => {
                const active = myRsvp === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => void setRsvp(session.id, option.value)}
                    className={`rounded-lg border px-4 py-2 text-sm font-bold transition-transform active:scale-95 ${
                      active
                        ? "border-primary bg-primary text-white"
                        : "border-border-subtle text-on-surface-variant hover:border-primary hover:text-primary"
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="mt-8 flex flex-wrap gap-3">
          <button
            onClick={confirm}
            disabled={session.status === "confirmed"}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-bold text-white transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <CheckCircle2 size={18} />
            {session.status === "confirmed" ? "Sesion confirmada" : "Confirmar sesion"}
          </button>
          <Link to="/recomendaciones" className="rounded-lg border border-border-subtle px-6 py-3 font-bold text-primary">Ver otras opciones</Link>
        </div>
        {calendarMessage && <p className="mt-4 rounded-lg bg-primary-fixed px-4 py-3 text-sm text-primary">{calendarMessage}</p>}
      </section>

      <aside className="rounded-xl border border-border-subtle bg-white p-6 shadow-soft">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-2xl font-bold">Integrantes</h2>
          <span className="rounded-full bg-status-free/15 px-3 py-1 font-mono text-xs font-bold text-tertiary">
            {summary.yes}/{summary.total} asisten
          </span>
        </div>
        <p className="mt-1 text-sm text-text-secondary">
          {summary.yes} asisten · {summary.maybe} quizás · {summary.no} no · {summary.pending} sin responder
        </p>
        <div className="mt-5 space-y-3">
          {summary.entries.map((entry) => {
            const user = userById(entry.userId);
            return (
              <div key={entry.userId} className="flex items-center gap-3 rounded-xl border border-border-subtle p-3">
                <img
                  src={user?.avatarUrl ?? `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(entry.userId)}`}
                  alt={user?.name ?? "Integrante"}
                  className="h-10 w-10 rounded-full bg-primary-fixed"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">{user?.name ?? "Integrante"}</p>
                  <p className="truncate text-sm text-text-secondary">{user?.context ?? "WorkSync"}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 font-mono text-[11px] font-bold ${rsvpBadgeClass(entry.status)}`}>
                  {rsvpBadgeLabel(entry.status)}
                </span>
              </div>
            );
          })}
        </div>
      </aside>
    </div>
  );
}
