import { CheckCircle2, Clock, Crown, Lock, Users, Vote } from "lucide-react";
import { useAppData } from "../services/AppDataContext";
import { modalityLabel } from "../domain/labels";
import { hasApproved, summarizePoll, voterCount, winningCandidate } from "../domain/polls";
import type { Poll, WorkGroup } from "../types/worksync";

export function PollCard({ poll, group }: { poll: Poll; group: WorkGroup }) {
  const { data, currentUser, castVote, closePoll } = useAppData();

  const myId = currentUser?.id;
  const isMember = Boolean(myId && group.memberIds.includes(myId));
  const isCreator = Boolean(myId && poll.createdBy === myId);
  const isOpen = poll.status === "open";

  const results = summarizePoll(poll);
  const maxCount = results.reduce((max, result) => Math.max(max, result.count), 0);
  const winner = poll.winnerCandidateId
    ? results.find((result) => result.candidate.id === poll.winnerCandidateId)?.candidate
    : winningCandidate(poll);
  const nameOf = (id: string) => data?.users.find((user) => user.id === id)?.name ?? "Integrante";
  const creatorName = nameOf(poll.createdBy);

  return (
    <article className="rounded-xl border border-border-subtle bg-white p-6 shadow-soft">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
        <div className="min-w-0">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-primary">Votación</p>
          <h3 className="mt-1 text-2xl font-bold text-on-surface">{poll.title}</h3>
          <p className="mt-1 text-sm text-text-secondary">
            Propuesta por {creatorName} · {voterCount(poll)}/{group.memberIds.length} votaron
          </p>
        </div>
        <span
          className={`inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1 font-mono text-xs ${
            isOpen ? "bg-secondary-container/25 text-primary" : "bg-surface-container text-text-secondary"
          }`}
        >
          {isOpen ? <Vote size={13} /> : <Lock size={13} />}
          {isOpen ? "Abierta" : "Cerrada"}
        </span>
      </div>

      <div className="mt-5 space-y-3">
        {results.map((result) => {
          const { candidate } = result;
          const mine = Boolean(myId && hasApproved(poll, myId, candidate.id));
          const isWinner = !isOpen && winner?.id === candidate.id;
          const isLeading = isOpen && result.count > 0 && result.count === maxCount;
          return (
            <div
              key={candidate.id}
              className={`rounded-xl border p-4 transition ${
                isWinner ? "border-primary bg-primary-container/10" : "border-border-subtle"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-on-surface">{candidate.dateLabel}</p>
                    {isWinner && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 font-mono text-[10px] uppercase text-white">
                        <Crown size={11} /> Ganadora
                      </span>
                    )}
                    {isLeading && !isWinner && (
                      <span className="rounded-full bg-status-free/15 px-2 py-0.5 font-mono text-[10px] uppercase text-tertiary">
                        Liderando
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 font-mono text-xs text-text-secondary">
                    <Clock size={12} className="mr-1 inline" />
                    {candidate.start} - {candidate.end} · {modalityLabel(candidate.modality)}
                  </p>
                  {result.voterIds.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {result.voterIds.map((voterId) => (
                        <span
                          key={voterId}
                          className="rounded-full bg-surface-container px-2 py-0.5 text-xs font-semibold text-on-surface-variant"
                        >
                          {nameOf(voterId)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 text-primary">
                    <Users size={16} />
                    <span className="text-lg font-bold">{result.count}</span>
                  </div>
                  {isOpen && isMember && (
                    <button
                      type="button"
                      onClick={() => void castVote(poll.id, candidate.id)}
                      className={`inline-flex items-center gap-1.5 rounded-lg border px-4 py-2 text-sm font-bold transition-transform active:scale-95 ${
                        mine
                          ? "border-primary bg-primary text-white"
                          : "border-border-subtle text-on-surface-variant hover:border-primary hover:text-primary"
                      }`}
                    >
                      <CheckCircle2 size={15} />
                      {mine ? "Aprobado" : "Aprobar"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {isOpen && isCreator && (
        <div className="mt-5 flex items-center justify-between gap-3 border-t border-border-subtle pt-4">
          <p className="text-sm text-text-secondary">Cierra la votación para fijar la opción ganadora.</p>
          <button
            type="button"
            onClick={() => void closePoll(poll.id)}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 font-bold text-white transition-transform active:scale-95"
          >
            <Lock size={16} />
            Cerrar votación
          </button>
        </div>
      )}

      {!isOpen && (
        <p className="mt-5 rounded-lg bg-surface-container-low px-4 py-3 text-sm text-on-surface-variant">
          {winner
            ? `Opción ganadora: ${winner.dateLabel}, ${winner.start} - ${winner.end}.`
            : "La votación se cerró sin votos."}
        </p>
      )}
    </article>
  );
}
