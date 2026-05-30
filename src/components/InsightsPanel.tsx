import { CalendarRange, Clock, Sparkles, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import type { PersonalInsights } from "../domain/personalInsights";
import type { DayKey, Recommendation } from "../types/worksync";
import { days } from "../types/worksync";

const dayLabel = (key: DayKey | null) => (key ? days.find((day) => day.key === key)?.label ?? "—" : "—");

export function InsightsPanel({
  insights,
  recommendations,
}: {
  insights: PersonalInsights | null;
  recommendations: Recommendation[];
}) {
  if (!insights) return null;

  if (insights.marked === 0) {
    return (
      <div className="rounded-xl border border-border-subtle bg-white p-6 shadow-soft">
        <div className="mb-3 flex items-center gap-2">
          <TrendingUp className="text-primary" />
          <h2 className="text-xl font-bold">Tu semana</h2>
        </div>
        <p className="text-sm leading-6 text-text-secondary">
          Aún no pintas tu disponibilidad. Marca tus bloques en el horario y WorkSync te mostrará tus mejores
          horas de foco y un resumen de tu semana.
        </p>
        <Link to="/horario" className="mt-4 inline-flex items-center gap-2 font-bold text-primary">
          <CalendarRange size={16} />
          Pintar mi horario
        </Link>
      </div>
    );
  }

  const stats = [
    { label: "Foco disponible", value: `${insights.available}`, hint: "bloques libres + preferidos" },
    { label: "Comprometido", value: `${insights.committed}`, hint: "ocupado + evitar" },
    { label: "Día más libre", value: dayLabel(insights.freestDay), hint: "más disponibilidad" },
    { label: "Día más cargado", value: dayLabel(insights.busiestDay), hint: "más compromisos" },
  ];

  return (
    <div className="rounded-xl border border-border-subtle bg-white p-6 shadow-soft">
      <div className="mb-5 flex items-center gap-2">
        <TrendingUp className="text-primary" />
        <h2 className="text-xl font-bold">Tu semana</h2>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-xl bg-surface-container-low p-4">
            <p className="font-mono text-[11px] uppercase text-text-secondary">{stat.label}</p>
            <p className="mt-1 text-xl font-bold text-on-surface">{stat.value}</p>
            <p className="mt-0.5 text-[11px] text-text-secondary">{stat.hint}</p>
          </div>
        ))}
      </div>

      {recommendations.length > 0 && (
        <div className="mt-6">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles size={16} className="text-primary" />
            <h3 className="font-bold">Tus mejores bloques</h3>
          </div>
          <div className="space-y-2">
            {recommendations.slice(0, 3).map((rec) => (
              <div
                key={rec.id}
                className="flex items-center gap-3 rounded-xl border border-border-subtle p-3"
              >
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary-fixed text-primary">
                  <Clock size={18} />
                </div>
                <div className="flex-1">
                  <p className="font-bold">{rec.dateLabel}</p>
                  <p className="text-sm text-text-secondary">
                    {rec.start} - {rec.end}
                  </p>
                </div>
                <span className="rounded-full bg-status-free/20 px-3 py-1 font-mono text-xs text-tertiary">
                  {rec.score}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
