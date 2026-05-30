import { useMemo, useState } from "react";
import { Filter, Sparkles } from "lucide-react";
import { RecommendationCard } from "../components/RecommendationCard";
import { AvailabilityHeatmap } from "../components/AvailabilityHeatmap";
import { useAppData } from "../services/AppDataContext";
import type { Modality } from "../types/worksync";

export function RecommendationsPage() {
  const { data, buildGroupRecommendations } = useAppData();
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [durationHours, setDurationHours] = useState(2);
  const [modality, setModality] = useState<Modality>("hybrid");
  const groupId = selectedGroupId || data?.groups[0]?.id || "";
  const group = data?.groups.find((item) => item.id === groupId) ?? data?.groups[0];
  const recommendations = useMemo(
    () => (group ? buildGroupRecommendations(group.id, durationHours, modality) : []),
    [buildGroupRecommendations, durationHours, group, modality],
  );

  if (!data || !group) return <div className="rounded-xl bg-white p-8 shadow-soft">Cargando recomendaciones...</div>;

  return (
    <div className="flex flex-col gap-8 pb-20 md:flex-row md:items-start lg:pb-0">
      <aside className="w-full space-y-6 md:sticky md:top-24 md:w-72">
        <div className="rounded-xl border border-border-subtle bg-white p-6 shadow-soft">
          <div className="mb-6 flex items-center gap-2">
            <Filter className="text-primary" />
            <h2 className="text-xl font-bold">Filtros</h2>
          </div>
          <div className="space-y-5">
            <label className="block">
              <span className="font-mono text-xs uppercase text-text-secondary">Grupo</span>
              <select
                className="mt-2 w-full rounded-lg border-0 bg-surface-container-low p-3 outline-none focus:ring-2 focus:ring-primary"
                value={group.id}
                onChange={(event) => setSelectedGroupId(event.target.value)}
              >
                {data.groups.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="font-mono text-xs uppercase text-text-secondary">Duracion</span>
              <select
                className="mt-2 w-full rounded-lg border-0 bg-surface-container-low p-3 outline-none focus:ring-2 focus:ring-primary"
                value={durationHours}
                onChange={(event) => setDurationHours(Number(event.target.value))}
              >
                <option value="1">1 hora</option>
                <option value="2">2 horas</option>
                <option value="3">3 horas</option>
              </select>
            </label>
            <label className="block">
              <span className="font-mono text-xs uppercase text-text-secondary">Modalidad</span>
              <select
                className="mt-2 w-full rounded-lg border-0 bg-surface-container-low p-3 outline-none focus:ring-2 focus:ring-primary"
                value={modality}
                onChange={(event) => setModality(event.target.value as Modality)}
              >
                <option value="hybrid">Hibrida</option>
                <option value="remote">Online</option>
                <option value="in_person">Presencial</option>
              </select>
            </label>
          </div>
        </div>
        <div className="rounded-xl bg-primary-container p-6 text-white shadow-soft">
          <Sparkles className="mb-3" />
          <p className="leading-6">La sincronizacion inteligente esta activa. Priorizamos bloques comunes, preferencias y duracion.</p>
        </div>
      </aside>

      <section className="min-w-0 flex-1 space-y-6">
        <header>
          <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-primary">Recomendaciones inteligentes</p>
          <h1 className="mt-2 text-4xl font-bold">Mejores momentos</h1>
          <p className="mt-2 text-text-secondary">Basado en la disponibilidad y habitos de {group.name}.</p>
        </header>
        {recommendations.length ? (
          recommendations.map((recommendation, index) => (
            <RecommendationCard key={recommendation.id} recommendation={recommendation} featured={index === 0} />
          ))
        ) : (
          <div className="rounded-xl border border-border-subtle bg-white p-8 text-text-secondary shadow-soft">
            No hay suficientes horarios para calcular recomendaciones en este grupo.
          </div>
        )}

        <AvailabilityHeatmap group={group} schedules={data.schedules} />
      </section>
    </div>
  );
}
