import { useMemo, useState } from "react";
import { Plus, Vote } from "lucide-react";
import { PollCard } from "../components/PollCard";
import { useAppData } from "../services/AppDataContext";
import { candidateFromRecommendation } from "../domain/polls";
import { modalityLabel } from "../domain/labels";
import type { Modality } from "../types/worksync";

export function PollsPage() {
  const { data, currentUser, buildGroupRecommendations, createPoll } = useAppData();
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [title, setTitle] = useState("");
  const [durationHours, setDurationHours] = useState(2);
  const [modality, setModality] = useState<Modality>("hybrid");
  const [picked, setPicked] = useState<string[]>([]);
  const [error, setError] = useState("");

  const groupId = selectedGroupId || data?.groups[0]?.id || "";
  const group = data?.groups.find((item) => item.id === groupId) ?? data?.groups[0];

  const recommendations = useMemo(
    () => (group ? buildGroupRecommendations(group.id, durationHours, modality) : []),
    [buildGroupRecommendations, durationHours, group, modality],
  );

  const groupPolls = useMemo(() => {
    if (!group || !data) return [];
    return data.polls
      .filter((poll) => poll.groupId === group.id)
      .slice()
      .sort((a, b) => {
        if (a.status !== b.status) return a.status === "open" ? -1 : 1;
        return b.createdAt - a.createdAt;
      });
  }, [data, group]);

  if (!data || !group) return <div className="rounded-xl bg-white p-8 shadow-soft">Cargando votaciones...</div>;

  const myId = currentUser?.id;
  const isMember = Boolean(myId && group.memberIds.includes(myId));

  const togglePick = (id: string) => {
    setPicked((current) => (current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id]));
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    if (!title.trim()) {
      setError("Ponle un título a la votación.");
      return;
    }
    const candidates = recommendations
      .filter((recommendation) => picked.includes(recommendation.id))
      .map((recommendation) => candidateFromRecommendation(recommendation.id, recommendation));
    if (candidates.length < 2) {
      setError("Elige al menos dos opciones para que el grupo pueda votar.");
      return;
    }
    await createPoll({ groupId: group.id, title: title.trim(), candidates });
    setTitle("");
    setPicked([]);
  };

  return (
    <div className="flex flex-col gap-8 pb-20 md:flex-row md:items-start lg:pb-0">
      <aside className="w-full space-y-6 md:sticky md:top-24 md:w-80">
        <div className="rounded-xl border border-border-subtle bg-white p-6 shadow-soft">
          <div className="mb-5 flex items-center gap-2">
            <Vote className="text-primary" />
            <h2 className="text-xl font-bold">Nueva votación</h2>
          </div>
          {isMember ? (
            <form onSubmit={submit} className="space-y-5">
              <label className="block">
                <span className="font-mono text-xs uppercase text-text-secondary">Grupo</span>
                <select
                  className="mt-2 w-full rounded-lg border-0 bg-surface-container-low p-3 outline-none focus:ring-2 focus:ring-primary"
                  value={group.id}
                  onChange={(event) => {
                    setSelectedGroupId(event.target.value);
                    setPicked([]);
                  }}
                >
                  {data.groups.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="font-mono text-xs uppercase text-text-secondary">Título</span>
                <input
                  className="mt-2 w-full rounded-lg border-0 bg-surface-container-low p-3 outline-none focus:ring-2 focus:ring-primary"
                  placeholder="¿Cuándo nos juntamos?"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="font-mono text-xs uppercase text-text-secondary">Duración</span>
                  <select
                    className="mt-2 w-full rounded-lg border-0 bg-surface-container-low p-3 outline-none focus:ring-2 focus:ring-primary"
                    value={durationHours}
                    onChange={(event) => {
                      setDurationHours(Number(event.target.value));
                      setPicked([]);
                    }}
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
                    onChange={(event) => {
                      setModality(event.target.value as Modality);
                      setPicked([]);
                    }}
                  >
                    <option value="hybrid">Híbrida</option>
                    <option value="remote">Online</option>
                    <option value="in_person">Presencial</option>
                  </select>
                </label>
              </div>
              <div>
                <span className="font-mono text-xs uppercase text-text-secondary">Opciones a votar</span>
                {recommendations.length === 0 ? (
                  <p className="mt-2 text-sm text-text-secondary">
                    No hay franjas disponibles para este grupo con estos filtros.
                  </p>
                ) : (
                  <div className="mt-2 space-y-2">
                    {recommendations.map((recommendation) => {
                      const checked = picked.includes(recommendation.id);
                      return (
                        <button
                          key={recommendation.id}
                          type="button"
                          onClick={() => togglePick(recommendation.id)}
                          className={`flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-sm transition ${
                            checked
                              ? "border-primary bg-primary-fixed text-primary"
                              : "border-border-subtle bg-surface-container-low text-on-surface-variant"
                          }`}
                        >
                          <span className="min-w-0">
                            <span className="block truncate font-bold">{recommendation.dateLabel}</span>
                            <span className="block font-mono text-xs text-text-secondary">
                              {recommendation.start} - {recommendation.end} · {modalityLabel(recommendation.modality)}
                            </span>
                          </span>
                          <span className="shrink-0 font-mono text-xs">{recommendation.availabilityPct}%</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              {error && <p className="rounded-lg bg-status-occupied/15 px-3 py-2 text-sm text-error-red">{error}</p>}
              <button
                type="submit"
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 font-bold text-white transition-transform active:scale-95"
              >
                <Plus size={18} />
                Crear votación
              </button>
            </form>
          ) : (
            <p className="text-sm text-text-secondary">Únete a este grupo para proponer una votación.</p>
          )}
        </div>
      </aside>

      <section className="min-w-0 flex-1 space-y-6">
        <header className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-primary">Votaciones</p>
            <h1 className="mt-2 text-4xl font-bold">Decidan en grupo</h1>
            <p className="mt-2 text-text-secondary">Voten entre las mejores franjas de {group.name}.</p>
          </div>
          <label className="block md:w-56">
            <span className="font-mono text-xs uppercase text-text-secondary">Grupo</span>
            <select
              className="mt-2 w-full rounded-lg border border-border-subtle bg-white p-3 outline-none focus:ring-2 focus:ring-primary"
              value={group.id}
              onChange={(event) => {
                setSelectedGroupId(event.target.value);
                setPicked([]);
              }}
            >
              {data.groups.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
        </header>
        {groupPolls.length ? (
          groupPolls.map((poll) => <PollCard key={poll.id} poll={poll} group={group} />)
        ) : (
          <div className="rounded-xl border border-border-subtle bg-white p-8 text-text-secondary shadow-soft">
            Este grupo aún no tiene votaciones. Crea la primera desde el panel.
          </div>
        )}
      </section>
    </div>
  );
}
