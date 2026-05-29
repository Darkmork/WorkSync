import { CalendarCheck, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { RecommendationCard } from "../components/RecommendationCard";
import { WeatherWidget } from "../components/WeatherWidget";
import { useAppData } from "../services/AppDataContext";

export function DashboardPage() {
  const { currentUser, data, recommendations, loading } = useAppData();

  if (loading || !data) return <div className="rounded-xl bg-white p-8 shadow-soft">Cargando WorkSync...</div>;

  const nextSession = data.sessions[0];

  return (
    <div className="space-y-8 pb-20 lg:pb-0">
      <section className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
        <div>
          <h1 className="text-4xl font-bold text-on-surface">Hola, {currentUser?.name?.split(" ")[0] ?? "de nuevo"}.</h1>
          <p className="mt-2 text-lg text-text-secondary">Tienes {data.sessions.length} sesiones y {data.groups.length} grupos activos en WorkSync.</p>
        </div>
        <WeatherWidget />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.45fr_0.95fr]">
        <div className="space-y-6">
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary to-secondary p-6 text-white shadow-lift">
            <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-white/75">Proxima sesion</p>
            <h2 className="mt-2 text-2xl font-bold">{nextSession?.title ?? "Crea tu primera sesion"}</h2>
            <div className="mt-5 flex flex-wrap gap-4 text-white/90">
              <span>{nextSession?.dateLabel}</span>
              <span>{nextSession?.start} - {nextSession?.end}</span>
              <span>{nextSession?.location}</span>
            </div>
          </div>

          <div className="rounded-xl border border-border-subtle bg-white p-6 shadow-soft">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-2xl font-bold">Sesiones recientes</h2>
              <Link className="font-bold text-primary" to="/recomendaciones">Buscar mejor momento</Link>
            </div>
            <div className="space-y-3">
              {data.sessions.map((session) => (
                <Link key={session.id} to={`/sesiones/${session.id}`} className="flex items-center gap-4 rounded-xl border border-border-subtle p-4 transition hover:border-primary">
                  <div className="grid h-14 w-14 place-items-center rounded-lg bg-surface-container text-primary">
                    <CalendarCheck />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold">{session.title}</h3>
                    <p className="text-sm text-text-secondary">{session.dateLabel}, {session.start} - {session.end}</p>
                  </div>
                  <span className="rounded-full bg-status-free/20 px-3 py-1 font-mono text-xs text-tertiary">{session.status}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        <aside className="space-y-6">
          <div className="rounded-xl border border-border-subtle bg-white p-6 shadow-soft">
            <div className="mb-4 flex items-center gap-2">
              <Sparkles className="text-primary" />
              <h2 className="text-xl font-bold">Intelligent Recommendations</h2>
            </div>
            {recommendations[0] && <RecommendationCard recommendation={recommendations[0]} />}
          </div>
        </aside>
      </section>
    </div>
  );
}

