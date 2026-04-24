"use client";

import { useState } from "react";
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

  const groupLabels = Array.from({ length: groupCount }, (_, g) => `Grupo ${String.fromCharCode(65 + g)}`);
  const mobileTabs = [...groupLabels, ...(hasKnockout ? ["Eliminação"] : [])];
  const [mobileTab, setMobileTab] = useState(0);

  return (
    <div className="space-y-8">
      {/* ── Mobile: tabs per group + knockout ── */}
      <div className="sm:hidden space-y-4">
        <div className="flex gap-1.5 overflow-x-auto pb-1 border-b border-slate-200 dark:border-slate-700">
          {mobileTabs.map((label, i) => (
            <button
              key={i}
              onClick={() => setMobileTab(i)}
              className={`shrink-0 px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                mobileTab === i
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {mobileTab < groupCount ? (
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4">
            <h4 className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-3 uppercase tracking-wide">
              {groupLabels[mobileTab]}
            </h4>
            <RoundRobinTable
              matches={groupMatches}
              players={players}
              isAdmin={isAdmin}
              onMatchClick={onMatchClick}
              groupIndex={mobileTab}
            />
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4">
            <h4 className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-3 uppercase tracking-wide">
              Fase de Eliminação
            </h4>
            <SingleEliminationBracket matches={knockoutMatches} isAdmin={isAdmin} onMatchClick={onMatchClick} />
          </div>
        )}
      </div>

      {/* ── Desktop: full grid ── */}
      <div className="hidden sm:block space-y-8">
        <div>
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">Fase de Grupos</h3>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {Array.from({ length: groupCount }, (_, g) => (
              <div key={g} className="rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                <h4 className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-3 uppercase tracking-wide">
                  {groupLabels[g]}
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
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">Fase de Eliminação</h3>
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 overflow-x-auto">
              <SingleEliminationBracket matches={knockoutMatches} isAdmin={isAdmin} onMatchClick={onMatchClick} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
