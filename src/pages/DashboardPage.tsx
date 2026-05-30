import { CalendarCheck, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { CalendarAgenda } from "../components/CalendarAgenda";
import { DaySummary } from "../components/DaySummary";
import { InsightsPanel } from "../components/InsightsPanel";
import { RecommendationCard } from "../components/RecommendationCard";
import { TaskList } from "../components/TaskList";
import { WeatherWidget } from "../components/WeatherWidget";
import { sessionStatusLabel } from "../domain/labels";
import { useAppData } from "../services/AppDataContext";

export function DashboardPage() {
  const { currentUser, data, recommendations, personalInsights, personalRecommendations, loading } = useAppData();

  if (loading || !data) return <div className="rounded-xl bg-white p-8 shadow-soft">Cargando WorkSync...</div>;

  const nextSession = data.sessions[0];
  const recentSessions = data.sessions.slice(0, 4);

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      <section className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
        <div>
          <h1 className="text-4xl font-bold text-on-surface">Hola, {currentUser?.name?.split(" ")[0] ?? "de nuevo"}.</h1>
          <p className="mt-2 text-lg text-text-secondary">Tienes {data.sessions.length} sesiones y {data.groups.length} grupos activos en WorkSync.</p>
        </div>
        <WeatherWidget />
      </section>

      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary to-secondary p-6 text-white shadow-lift">
        <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-white/75">Proxima sesion</p>
        <h2 className="mt-2 text-2xl font-bold">{nextSession?.title ?? "Crea tu primera sesion"}</h2>
        <div className="mt-5 flex flex-wrap gap-4 text-white/90">
          <span>{nextSession?.dateLabel}</span>
          <span>{nextSession?.start} - {nextSession?.end}</span>
          <span>{nextSession?.location}</span>
        </div>
      </div>

      {/* Masonry: cards pack densely across columns instead of one tall stack,
          so the desktop home shows the most info with the least scroll. */}
      <div className="gap-6 lg:columns-2 xl:columns-3 [&>*]:mb-6 [&>*]:break-inside-avoid">
        <DaySummary />
        <InsightsPanel insights={personalInsights} recommendations={personalRecommendations} />
        {recommendations[0] && (
          <div className="rounded-xl border border-border-subtle bg-white p-6 shadow-soft">
            <div className="mb-4 flex items-center gap-2">
              <Sparkles className="text-primary" />
              <h2 className="text-xl font-bold">Recomendaciones inteligentes</h2>
            </div>
            <RecommendationCard recommendation={recommendations[0]} />
          </div>
        )}
        <div className="rounded-xl border border-border-subtle bg-white p-6 shadow-soft">
          <div className="mb-5 flex items-center justify-between gap-3">
            <h2 className="text-xl font-bold">Sesiones recientes</h2>
            <Link className="shrink-0 text-sm font-bold text-primary" to="/recomendaciones">Buscar momento</Link>
          </div>
          <div className="space-y-3">
            {recentSessions.map((session) => (
              <Link key={session.id} to={`/sesiones/${session.id}`} className="flex items-center gap-3 rounded-xl border border-border-subtle p-3 transition hover:border-primary">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-surface-container text-primary">
                  <CalendarCheck size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-bold">{session.title}</h3>
                  <p className="text-sm text-text-secondary">{session.dateLabel}, {session.start} - {session.end}</p>
                </div>
                <span className="shrink-0 rounded-full bg-status-free/20 px-3 py-1 font-mono text-xs text-tertiary">{sessionStatusLabel(session.status)}</span>
              </Link>
            ))}
          </div>
        </div>
        <CalendarAgenda />
        <TaskList />
      </div>
    </div>
  );
}

