import { CalendarDays, CheckCircle2, MapPin, Video } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { useAppData } from "../services/AppDataContext";
import { modalityLabel, sessionStatusLabel } from "../domain/labels";

export function SessionDetailPage() {
  const { sessionId } = useParams();
  const { data, markSessionConfirmed } = useAppData();
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

        <div className="mt-8 flex flex-wrap gap-3">
          <button
            onClick={() => markSessionConfirmed(session.id)}
            disabled={session.status === "confirmed"}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-bold text-white transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <CheckCircle2 size={18} />
            {session.status === "confirmed" ? "Sesion confirmada" : "Confirmar sesion"}
          </button>
          <Link to="/recomendaciones" className="rounded-lg border border-border-subtle px-6 py-3 font-bold text-primary">Ver otras opciones</Link>
        </div>
      </section>

      <aside className="rounded-xl border border-border-subtle bg-white p-6 shadow-soft">
        <h2 className="text-2xl font-bold">Integrantes</h2>
        <div className="mt-5 space-y-3">
          {data.users
            .filter((user) => group?.memberIds.includes(user.id))
            .map((user) => (
              <div key={user.id} className="flex items-center gap-3 rounded-xl border border-border-subtle p-3">
                <img src={user.avatarUrl} alt={user.name} className="h-10 w-10 rounded-full bg-primary-fixed" />
                <div>
                  <p className="font-bold">{user.name}</p>
                  <p className="text-sm text-text-secondary">{user.context}</p>
                </div>
              </div>
            ))}
        </div>
      </aside>
    </div>
  );
}
