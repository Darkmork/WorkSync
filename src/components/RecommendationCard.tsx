import { CalendarDays, CheckCircle2, Clock, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAppData } from "../services/AppDataContext";
import type { Recommendation } from "../types/worksync";

export function RecommendationCard({ recommendation, featured = false }: { recommendation: Recommendation; featured?: boolean }) {
  const navigate = useNavigate();
  const { createSessionFromRecommendation } = useAppData();

  const createSession = async () => {
    const session = await createSessionFromRecommendation(recommendation);
    navigate(`/sesiones/${session.id}`);
  };

  return (
    <article
      className={`relative rounded-xl border bg-white p-6 shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift ${
        featured ? "border-primary" : "border-border-subtle"
      }`}
    >
      <div className="mb-5 flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-primary">
            {featured ? "Opcion #1" : "Alternativa"}
          </p>
          <h3 className="mt-1 text-2xl font-bold text-on-surface">{recommendation.dateLabel}</h3>
        </div>
        <div className="rounded-xl bg-primary-container px-5 py-3 text-center text-white">
          <div className="text-2xl font-bold">{recommendation.score}%</div>
          <div className="font-mono text-[11px] uppercase">compatibilidad</div>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-full bg-secondary-container/25 text-primary">
            <CalendarDays size={20} />
          </div>
          <div>
            <p className="font-mono text-xs uppercase text-text-secondary">Fecha y hora</p>
            <p className="font-bold">{recommendation.start} - {recommendation.end}</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-full bg-status-free/20 text-tertiary">
            <Users size={20} />
          </div>
          <div>
            <p className="font-mono text-xs uppercase text-text-secondary">Disponibilidad</p>
            <p className="font-bold">{recommendation.availableCount}/{recommendation.memberCount} integrantes</p>
          </div>
        </div>
      </div>
      <div className="my-5 flex flex-wrap gap-2">
        {recommendation.badges.map((badge) => (
          <span key={badge} className="inline-flex items-center gap-1 rounded-full bg-surface-container px-3 py-1.5 font-mono text-xs text-on-surface-variant">
            <CheckCircle2 size={14} />
            {badge}
          </span>
        ))}
      </div>
      <p className="mb-5 text-sm leading-6 text-on-surface-variant">{recommendation.justification}</p>
      <button
        type="button"
        onClick={createSession}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 font-bold text-white transition-transform active:scale-95 md:w-auto"
      >
        <Clock size={18} />
        Crear sesion
      </button>
    </article>
  );
}

