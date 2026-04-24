"use client";

import { useMemo } from "react";
import MatchCard from "./MatchCard";
import type { Match, Player, SetScore } from "@/types";

interface Props {
  matches: Match[];
  players: Player[];
  isAdmin: boolean;
  onMatchClick: (match: Match) => void;
  groupIndex?: number;
}

interface Standing {
  player: Player;
  wins: number;
  losses: number;
  setsFor: number;
  setsAgainst: number;
  gamesFor: number;
  gamesAgainst: number;
}

function computeStandings(matches: Match[], players: Player[]): Standing[] {
  const stats = new Map<string, Standing>();
  for (const p of players) {
    stats.set(p.id, {
      player: p,
      wins: 0, losses: 0,
      setsFor: 0, setsAgainst: 0,
      gamesFor: 0, gamesAgainst: 0,
    });
  }

  for (const m of matches) {
    if (m.status !== "completed" || !m.team1Id || !m.team2Id || !m.scores) continue;
    const scores: SetScore[] = JSON.parse(m.scores);
    let s1 = 0, s2 = 0, g1 = 0, g2 = 0;
    for (const s of scores) {
      if (s.team1 > s.team2) s1++; else s2++;
      // Sum games within each set (excluding tie-break points)
      g1 += s.team1;
      g2 += s.team2;
    }

    const t1 = stats.get(m.team1Id);
    const t2 = stats.get(m.team2Id);
    if (t1) {
      if (m.winnerId === m.team1Id) t1.wins++; else t1.losses++;
      t1.setsFor += s1; t1.setsAgainst += s2;
      t1.gamesFor += g1; t1.gamesAgainst += g2;
    }
    if (t2) {
      if (m.winnerId === m.team2Id) t2.wins++; else t2.losses++;
      t2.setsFor += s2; t2.setsAgainst += s1;
      t2.gamesFor += g2; t2.gamesAgainst += g1;
    }
  }

  return Array.from(stats.values()).sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    const sdA = a.setsFor - a.setsAgainst;
    const sdB = b.setsFor - b.setsAgainst;
    if (sdB !== sdA) return sdB - sdA;
    const gdA = a.gamesFor - a.gamesAgainst;
    const gdB = b.gamesFor - b.gamesAgainst;
    return gdB - gdA;
  });
}

export default function RoundRobinTable({ matches, players, isAdmin, onMatchClick, groupIndex }: Props) {
  const groupMatches = groupIndex !== undefined
    ? matches.filter((m) => m.groupIndex === groupIndex && m.bracketType === "group")
    : matches.filter((m) => m.bracketType === "group");

  const groupPlayers = useMemo(() => {
    const ids = new Set(groupMatches.flatMap((m) => [m.team1Id, m.team2Id].filter(Boolean)));
    return players.filter((p) => ids.has(p.id));
  }, [groupMatches, players]);

  const standings = useMemo(
    () => computeStandings(groupMatches, groupPlayers),
    [groupMatches, groupPlayers]
  );

  // Rounds of matches
  const maxRound = Math.max(...groupMatches.map((m) => m.round), 0);
  const rounds = Array.from({ length: maxRound }, (_, i) =>
    groupMatches.filter((m) => m.round === i + 1)
  );

  return (
    <div className="space-y-6">
      {/* Standings table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              <th className="text-left py-2 pr-4 pl-2">#</th>
              <th className="text-left py-2 pr-4">Dupla</th>
              <th className="py-2 px-2 text-center">V</th>
              <th className="py-2 px-2 text-center">D</th>
              <th className="py-2 px-2 text-center">S+</th>
              <th className="py-2 px-2 text-center">S-</th>
              <th className="py-2 px-2 text-center">J+</th>
              <th className="py-2 px-2 text-center">J-</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((s, i) => (
              <tr
                key={s.player.id}
                className="border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50"
              >
                <td className="py-2 pr-4 pl-2 text-slate-400 font-mono text-xs">{i + 1}</td>
                <td className="py-2 pr-4 font-medium text-slate-800 dark:text-slate-200">
                  {s.player.name}
                </td>
                <td className="py-2 px-2 text-center text-emerald-600 dark:text-emerald-400 font-bold">{s.wins}</td>
                <td className="py-2 px-2 text-center text-red-500">{s.losses}</td>
                <td className="py-2 px-2 text-center text-slate-600 dark:text-slate-400">{s.setsFor}</td>
                <td className="py-2 px-2 text-center text-slate-600 dark:text-slate-400">{s.setsAgainst}</td>
                <td className="py-2 px-2 text-center text-slate-600 dark:text-slate-400">{s.gamesFor}</td>
                <td className="py-2 px-2 text-center text-slate-600 dark:text-slate-400">{s.gamesAgainst}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Rounds */}
      <div className="space-y-4">
        {rounds.map((roundMatches, ri) => (
          <div key={ri}>
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              Ronda {ri + 1}
            </h4>
            <div className="flex flex-wrap gap-3">
              {roundMatches.map((m) => (
                <MatchCard
                  key={m.id}
                  match={m}
                  isAdmin={isAdmin}
                  onClick={() => onMatchClick(m)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
