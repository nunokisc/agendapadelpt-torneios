"use client";

import Modal from "@/components/ui/Modal";
import type { Match } from "@/types";
import type { SetScore } from "@/lib/scoring";
import { cn } from "@/lib/utils";

interface Props {
  match: Match | null;
  onClose: () => void;
}

export default function MatchResultModal({ match, onClose }: Props) {
  if (!match) return null;

  const scores: SetScore[] = match.scores ? JSON.parse(match.scores) : [];
  const isWalkover = !!match.walkover;

  const team1Name = match.team1?.name ?? "Dupla A";
  const team2Name = match.team2?.name ?? "Dupla B";

  const team1Sets = scores.filter(
    (s) => s.team1 > s.team2 || (s.team1 === s.team2 && !!s.tiebreak && s.tiebreak.team1 > s.tiebreak.team2)
  ).length;
  const team2Sets = scores.filter(
    (s) => s.team2 > s.team1 || (s.team1 === s.team2 && !!s.tiebreak && s.tiebreak.team2 > s.tiebreak.team1)
  ).length;

  const roundLabel =
    match.bracketType === "third_place"
      ? "3.º / 4.º lugar"
      : match.bracketType === "final"
      ? "Grand Final"
      : match.bracketType === "group"
      ? `Fase de grupos — Ronda ${match.round}`
      : `Ronda ${match.round} — Jogo ${match.position + 1}`;

  const rows = [
    {
      name: team1Name,
      sets: team1Sets,
      isWinner: match.winnerId === match.team1Id,
      isNoShow: isWalkover && match.walkover === "team1",
    },
    {
      name: team2Name,
      sets: team2Sets,
      isWinner: match.winnerId === match.team2Id,
      isNoShow: isWalkover && match.walkover === "team2",
    },
  ];

  return (
    <Modal open={!!match} onClose={onClose} title="Resultado">
      <div className="space-y-4">
        <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">{roundLabel}</p>

        {/* Teams + set totals */}
        <div className="space-y-1.5">
          {rows.map((team, i) => (
            <div
              key={i}
              className={cn(
                "flex items-center justify-between rounded-lg px-3 py-2.5",
                team.isWinner
                  ? "bg-[#d1fae5]/40 dark:bg-[#0E7C66]/10 border border-[#0E7C66]/30"
                  : "bg-slate-50 dark:bg-slate-800/50 border border-transparent opacity-60"
              )}
            >
              <span
                className={cn(
                  "font-medium text-sm truncate flex-1 mr-3",
                  team.isWinner
                    ? "text-[#0E7C66] dark:text-[#A3E635]"
                    : "text-slate-700 dark:text-slate-300"
                )}
              >
                {team.name}
              </span>
              {team.isNoShow ? (
                <span className="font-mono text-xs font-bold text-amber-500 dark:text-amber-400 shrink-0">
                  W/O
                </span>
              ) : (
                <span
                  className={cn(
                    "font-mono text-xl font-bold shrink-0",
                    team.isWinner
                      ? "text-[#0E7C66] dark:text-[#A3E635]"
                      : "text-slate-400"
                  )}
                >
                  {team.sets}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Set-by-set detail */}
        {!isWalkover && scores.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
              Detalhe por set
            </p>
            {scores.map((s, i) => {
              const isSuperTB = !!s.superTiebreak;
              const label = isSuperTB ? "Super Tie-Break" : `Set ${i + 1}`;
              const t1Wins =
                s.team1 > s.team2 ||
                (s.team1 === s.team2 && !!s.tiebreak && s.tiebreak.team1 > s.tiebreak.team2);
              return (
                <div
                  key={i}
                  className="flex items-center gap-3 text-sm px-1"
                >
                  <span className="text-xs text-slate-400 w-28 shrink-0">{label}</span>
                  <span
                    className={cn(
                      "font-mono font-bold w-6 text-center",
                      t1Wins ? "text-[#0E7C66] dark:text-[#A3E635]" : "text-slate-400"
                    )}
                  >
                    {s.team1}
                  </span>
                  <span className="text-slate-300 dark:text-slate-600 font-mono">–</span>
                  <span
                    className={cn(
                      "font-mono font-bold w-6 text-center",
                      !t1Wins ? "text-[#0E7C66] dark:text-[#A3E635]" : "text-slate-400"
                    )}
                  >
                    {s.team2}
                  </span>
                  {s.tiebreak && (
                    <span className="text-xs text-slate-400 ml-1">
                      ({s.tiebreak.team1}–{s.tiebreak.team2})
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </Modal>
  );
}
