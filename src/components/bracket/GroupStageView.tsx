"use client";

import RoundRobinTable from "./RoundRobinTable";
import SingleEliminationBracket from "./SingleEliminationBracket";
import type { Match, Player } from "@/types";

interface Props {
  matches: Match[];
  players: Player[];
  isAdmin: boolean;
  onMatchClick: (match: Match) => void;
  groupCount: number;
}

export default function GroupStageView({ matches, players, isAdmin, onMatchClick, groupCount }: Props) {
  const groupMatches = matches.filter((m) => m.bracketType === "group");
  const knockoutMatches = matches.filter((m) => m.bracketType === "winners" || m.bracketType === "third_place");
  const hasKnockout = knockoutMatches.length > 0;

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">
          Fase de Grupos
        </h3>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {Array.from({ length: groupCount }, (_, g) => (
            <div key={g} className="rounded-xl border border-slate-200 dark:border-slate-700 p-4">
              <h4 className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-3 uppercase tracking-wide">
                Grupo {String.fromCharCode(65 + g)}
              </h4>
              <RoundRobinTable
                matches={groupMatches}
                players={players}
                isAdmin={isAdmin}
                onMatchClick={onMatchClick}
                groupIndex={g}
              />
            </div>
          ))}
        </div>
      </div>

      {hasKnockout && (
        <div>
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">
            Fase de Eliminação
          </h3>
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 overflow-x-auto">
            <SingleEliminationBracket
              matches={knockoutMatches}
              isAdmin={isAdmin}
              onMatchClick={onMatchClick}
            />
          </div>
        </div>
      )}
    </div>
  );
}
