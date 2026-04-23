"use client";

import SingleEliminationBracket from "./SingleEliminationBracket";
import MatchCard from "./MatchCard";
import type { Match } from "@/types";

interface Props {
  matches: Match[];
  isAdmin: boolean;
  onMatchClick: (match: Match) => void;
}

export default function DoubleEliminationBracket({ matches, isAdmin, onMatchClick }: Props) {
  const winners = matches.filter((m) => m.bracketType === "winners");
  const losers = matches.filter((m) => m.bracketType === "losers").sort(
    (a, b) => a.round - b.round || a.position - b.position
  );
  const finals = matches.filter((m) => m.bracketType === "final");

  // Losers bracket: simple grid layout by round
  const losersMaxRound = Math.max(...losers.map((m) => m.round), 0);
  const losersByRound = new Map<number, Match[]>();
  for (const m of losers) {
    const arr = losersByRound.get(m.round) ?? [];
    arr.push(m);
    losersByRound.set(m.round, arr.sort((a, b) => a.position - b.position));
  }

  return (
    <div className="space-y-8">
      {/* Winners bracket */}
      <div>
        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
          Winners Bracket
        </h4>
        <SingleEliminationBracket
          matches={winners}
          isAdmin={isAdmin}
          onMatchClick={onMatchClick}
        />
      </div>

      {/* Losers bracket */}
      {losers.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
            Losers Bracket
          </h4>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {Array.from({ length: losersMaxRound }, (_, i) => i + 1).map((r) => (
              <div key={r} className="flex flex-col gap-3 shrink-0">
                <div className="text-xs text-center text-slate-400 mb-1">L{r}</div>
                {(losersByRound.get(r) ?? []).map((m) => (
                  <MatchCard key={m.id} match={m} isAdmin={isAdmin} onClick={() => onMatchClick(m)} />
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Grand Final */}
      {finals.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-3">
            Grand Final
          </h4>
          <div className="flex gap-4">
            {finals.map((m) => (
              <MatchCard key={m.id} match={m} isAdmin={isAdmin} onClick={() => onMatchClick(m)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
