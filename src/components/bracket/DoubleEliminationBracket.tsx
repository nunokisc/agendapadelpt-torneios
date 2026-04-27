"use client";

import { useState } from "react";
import SingleEliminationBracket from "./SingleEliminationBracket";
import MatchCard from "./MatchCard";
import type { Match } from "@/types";

interface Props {
  matches: Match[];
  isAdmin: boolean;
  onMatchClick: (match: Match) => void;
  onMatchStart?: (matchId: string, startedAt: string) => void;
}

type Section = "winners" | "losers" | "final";

export default function DoubleEliminationBracket({ matches, isAdmin, onMatchClick, onMatchStart }: Props) {
  const winners = matches.filter((m) => m.bracketType === "winners");
  const losers = matches
    .filter((m) => m.bracketType === "losers")
    .sort((a, b) => a.round - b.round || a.position - b.position);
  const finals = matches.filter((m) => m.bracketType === "final");

  const losersMaxRound = Math.max(...losers.map((m) => m.round), 0);
  const losersByRound = new Map<number, Match[]>();
  for (const m of losers) {
    const arr = losersByRound.get(m.round) ?? [];
    arr.push(m);
    losersByRound.set(m.round, arr.sort((a, b) => a.position - b.position));
  }

  const sections: { key: Section; label: string }[] = [
    { key: "winners", label: "Winners" },
    ...(losers.length > 0 ? [{ key: "losers" as Section, label: "Losers" }] : []),
    ...(finals.length > 0 ? [{ key: "final" as Section, label: "Final" }] : []),
  ];
  const [mobileSection, setMobileSection] = useState<Section>("winners");

  return (
    <>
      {/* ── Mobile ── */}
      <div className="sm:hidden space-y-4">
        <div className="flex gap-1.5 overflow-x-auto pb-1 border-b border-slate-200 dark:border-slate-700">
          {sections.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setMobileSection(key)}
              className={`shrink-0 px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                mobileSection === key
                  ? "bg-[#0E7C66] text-white"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {mobileSection === "winners" && (
          <SingleEliminationBracket matches={winners} isAdmin={isAdmin} onMatchClick={onMatchClick} onMatchStart={onMatchStart} />
        )}
        {mobileSection === "losers" && losers.length > 0 && (
          <div className="space-y-3">
            {Array.from({ length: losersMaxRound }, (_, i) => i + 1).map((r) => (
              <div key={r} className="space-y-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Losers L{r}</p>
                {(losersByRound.get(r) ?? []).map((m) => (
                  <MatchCard key={m.id} match={m} isAdmin={isAdmin} onClick={() => onMatchClick(m)} onStart={onMatchStart} compact />
                ))}
              </div>
            ))}
          </div>
        )}
        {mobileSection === "final" && finals.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-[#0E7C66] uppercase tracking-wide">Grand Final</p>
            {finals.map((m) => (
              <MatchCard key={m.id} match={m} isAdmin={isAdmin} onClick={() => onMatchClick(m)} onStart={onMatchStart} />
            ))}
          </div>
        )}
      </div>

      {/* ── Desktop ── */}
      <div className="hidden sm:block space-y-8">
        <div>
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Winners Bracket</h4>
          <SingleEliminationBracket matches={winners} isAdmin={isAdmin} onMatchClick={onMatchClick} onMatchStart={onMatchStart} />
        </div>
        {losers.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Losers Bracket</h4>
            <div className="flex gap-4 overflow-x-auto pb-2">
              {Array.from({ length: losersMaxRound }, (_, i) => i + 1).map((r) => (
                <div key={r} className="flex flex-col gap-3 shrink-0">
                  <div className="text-xs text-center text-slate-400 mb-1">L{r}</div>
                  {(losersByRound.get(r) ?? []).map((m) => (
                    <MatchCard key={m.id} match={m} isAdmin={isAdmin} onClick={() => onMatchClick(m)} onStart={onMatchStart} />
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
        {finals.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-[#0E7C66] uppercase tracking-wide mb-3">Grand Final</h4>
            <div className="flex gap-4">
              {finals.map((m) => (
                <MatchCard key={m.id} match={m} isAdmin={isAdmin} onClick={() => onMatchClick(m)} onStart={onMatchStart} />
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
