"use client";

import { useMemo } from "react";
import MatchCard from "./MatchCard";
import { computeGroupStandings } from "@/lib/standings";
import type { Match, Player } from "@/types";

interface Props {
  matches: Match[];
  players: Player[];
  isAdmin: boolean;
  onMatchClick: (match: Match) => void;
  onMatchStart?: (matchId: string, startedAt: string) => void;
  groupIndex?: number;
}

interface Standing {
  player: Player;
  played: number;
  wins: number;
  losses: number;
  setsFor: number;
  setsAgainst: number;
  gamesFor: number;
  gamesAgainst: number;
}

export default function RoundRobinTable({ matches, players, isAdmin, onMatchClick, onMatchStart, groupIndex }: Props) {
  const groupMatches = groupIndex !== undefined
    ? matches.filter((m) => m.groupIndex === groupIndex && m.bracketType === "group")
    : matches.filter((m) => m.bracketType === "group");

  const groupPlayers = useMemo(() => {
    const ids = new Set(groupMatches.flatMap((m) => [m.team1Id, m.team2Id].filter(Boolean)));
    return players.filter((p) => ids.has(p.id));
  }, [groupMatches, players]);

  const standings = useMemo((): Standing[] => {
    const playerIds = groupPlayers.map((p) => p.id);
    const gs = computeGroupStandings(groupMatches, playerIds);
    return gs
      .map((s) => {
        const player = groupPlayers.find((p) => p.id === s.playerId);
        if (!player) return null;
        return {
          player,
          played: s.played,
          wins: s.wins,
          losses: s.losses,
          setsFor: s.setsFor,
          setsAgainst: s.setsAgainst,
          gamesFor: s.gamesFor,
          gamesAgainst: s.gamesAgainst,
        };
      })
      .filter((s): s is Standing => s !== null);
  }, [groupMatches, groupPlayers]);

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
              <th className="py-2 px-2 text-center" title="Jogos disputados">J</th>
              <th className="py-2 px-2 text-center" title="Vitórias">V</th>
              <th className="py-2 px-2 text-center" title="Derrotas">D</th>
              <th className="py-2 px-2 text-center" title="Sets ganhos">SG</th>
              <th className="py-2 px-2 text-center" title="Sets perdidos">SP</th>
              <th className="py-2 px-2 text-center" title="Saldo de sets">SS</th>
              <th className="py-2 px-2 text-center hidden sm:table-cell" title="Jogos ganhos">JG</th>
              <th className="py-2 px-2 text-center hidden sm:table-cell" title="Jogos perdidos">JP</th>
              <th className="py-2 px-2 text-center hidden sm:table-cell" title="Saldo de jogos">SJ</th>
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
                <td className="py-2 px-2 text-center text-slate-500 dark:text-slate-400">{s.played}</td>
                <td className="py-2 px-2 text-center text-emerald-600 dark:text-emerald-400 font-bold">{s.wins}</td>
                <td className="py-2 px-2 text-center text-red-500">{s.losses}</td>
                <td className="py-2 px-2 text-center text-slate-600 dark:text-slate-400">{s.setsFor}</td>
                <td className="py-2 px-2 text-center text-slate-600 dark:text-slate-400">{s.setsAgainst}</td>
                <td className="py-2 px-2 text-center font-medium text-slate-700 dark:text-slate-300">
                  {s.setsFor - s.setsAgainst > 0 ? `+${s.setsFor - s.setsAgainst}` : s.setsFor - s.setsAgainst}
                </td>
                <td className="py-2 px-2 text-center text-slate-600 dark:text-slate-400 hidden sm:table-cell">{s.gamesFor}</td>
                <td className="py-2 px-2 text-center text-slate-600 dark:text-slate-400 hidden sm:table-cell">{s.gamesAgainst}</td>
                <td className="py-2 px-2 text-center font-medium text-slate-700 dark:text-slate-300 hidden sm:table-cell">
                  {s.gamesFor - s.gamesAgainst > 0 ? `+${s.gamesFor - s.gamesAgainst}` : s.gamesFor - s.gamesAgainst}
                </td>
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
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-[repeat(auto-fill,260px)]">
              {roundMatches.map((m) => (
                <MatchCard
                  key={m.id}
                  match={m}
                  isAdmin={isAdmin}
                  onClick={() => onMatchClick(m)}
                  onStart={onMatchStart}
                  compact
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
