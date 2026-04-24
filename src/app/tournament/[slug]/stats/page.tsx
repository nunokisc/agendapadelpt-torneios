"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import TournamentBottomNav from "@/components/layout/TournamentBottomNav";
import type { Tournament, Player, Match, SetScore } from "@/types";

interface TournamentData {
  tournament: Tournament & { players: Player[]; matches: Match[] };
}

interface TeamStat {
  player: Player;
  played: number;
  wins: number;
  losses: number;
  setsFor: number;
  setsAgainst: number;
  gamesFor: number;
  gamesAgainst: number;
  winPct: number;
}

function computeStats(matches: Match[], players: Player[]): TeamStat[] {
  const map = new Map<string, TeamStat>();
  for (const p of players) {
    map.set(p.id, { player: p, played: 0, wins: 0, losses: 0, setsFor: 0, setsAgainst: 0, gamesFor: 0, gamesAgainst: 0, winPct: 0 });
  }

  for (const m of matches) {
    if (m.status !== "completed" || !m.team1Id || !m.team2Id || !m.scores) continue;
    const scores: SetScore[] = JSON.parse(m.scores);
    let s1 = 0, s2 = 0, g1 = 0, g2 = 0;
    for (const s of scores) {
      if (s.team1 > s.team2) s1++; else s2++;
      g1 += s.team1; g2 += s.team2;
    }
    const t1 = map.get(m.team1Id);
    const t2 = map.get(m.team2Id);
    if (t1) {
      t1.played++;
      if (m.winnerId === m.team1Id) t1.wins++; else t1.losses++;
      t1.setsFor += s1; t1.setsAgainst += s2;
      t1.gamesFor += g1; t1.gamesAgainst += g2;
    }
    if (t2) {
      t2.played++;
      if (m.winnerId === m.team2Id) t2.wins++; else t2.losses++;
      t2.setsFor += s2; t2.setsAgainst += s1;
      t2.gamesFor += g2; t2.gamesAgainst += g1;
    }
  }

  return Array.from(map.values())
    .map((s) => ({ ...s, winPct: s.played > 0 ? Math.round((s.wins / s.played) * 100) : 0 }))
    .filter((s) => s.played > 0)
    .sort((a, b) => b.wins - a.wins || b.winPct - a.winPct || (b.setsFor - b.setsAgainst) - (a.setsFor - a.setsAgainst));
}

export default function StatsPage() {
  const { slug } = useParams<{ slug: string }>();
  const [data, setData] = useState<TournamentData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/tournament/${slug}`)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="animate-spin h-6 w-6 border-4 border-emerald-500 border-t-transparent rounded-full" />
    </div>
  );

  if (!data) return (
    <div className="text-center py-16 text-slate-500">Torneio não encontrado.</div>
  );

  const { tournament } = data;
  const stats = computeStats(tournament.matches ?? [], tournament.players ?? []);
  const completedMatches = (tournament.matches ?? []).filter((m) => m.status === "completed");

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 pb-24 sm:pb-8">
      <div className="mb-6">
        <Link href={`/tournament/${slug}`} className="text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
          ← {tournament.name}
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-2">Estatísticas</h1>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Duplas", value: tournament.players?.length ?? 0 },
          { label: "Jogos realizados", value: completedMatches.length },
          { label: "Jogos totais", value: (tournament.matches ?? []).filter((m) => m.status !== "bye").length },
          { label: "Formato", value: tournament.matchFormat },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3">
            <p className="text-xs text-slate-500 dark:text-slate-400">{s.label}</p>
            <p className="text-xl font-bold text-slate-800 dark:text-slate-100 mt-0.5">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Team stats table */}
      <Card>
        <CardHeader><CardTitle>Classificação das duplas</CardTitle></CardHeader>
        {stats.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">Ainda não há resultados registados.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-100 dark:border-slate-800">
                  <th className="text-left py-2 px-2">#</th>
                  <th className="text-left py-2 px-2">Dupla</th>
                  <th className="text-center py-2 px-2">J</th>
                  <th className="text-center py-2 px-2">V</th>
                  <th className="text-center py-2 px-2">D</th>
                  <th className="text-center py-2 px-2 hidden sm:table-cell">%V</th>
                  <th className="text-center py-2 px-2 hidden sm:table-cell">S+</th>
                  <th className="text-center py-2 px-2 hidden sm:table-cell">S-</th>
                  <th className="text-center py-2 px-2 hidden md:table-cell">J+</th>
                  <th className="text-center py-2 px-2 hidden md:table-cell">J-</th>
                </tr>
              </thead>
              <tbody>
                {stats.map((s, i) => (
                  <tr key={s.player.id} className="border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="py-2.5 px-2 text-slate-400 font-mono text-xs">{i + 1}</td>
                    <td className="py-2.5 px-2">
                      <p className="font-medium text-slate-800 dark:text-slate-200">{s.player.name}</p>
                      {s.player.player1Name && s.player.name !== `${s.player.player1Name} / ${s.player.player2Name}` && (
                        <p className="text-xs text-slate-400">{s.player.player1Name} / {s.player.player2Name}</p>
                      )}
                    </td>
                    <td className="py-2.5 px-2 text-center text-slate-600 dark:text-slate-400 font-mono">{s.played}</td>
                    <td className="py-2.5 px-2 text-center text-emerald-600 dark:text-emerald-400 font-bold">{s.wins}</td>
                    <td className="py-2.5 px-2 text-center text-red-500 font-mono">{s.losses}</td>
                    <td className="py-2.5 px-2 text-center hidden sm:table-cell text-slate-600 dark:text-slate-400">{s.winPct}%</td>
                    <td className="py-2.5 px-2 text-center hidden sm:table-cell text-slate-600 dark:text-slate-400">{s.setsFor}</td>
                    <td className="py-2.5 px-2 text-center hidden sm:table-cell text-slate-600 dark:text-slate-400">{s.setsAgainst}</td>
                    <td className="py-2.5 px-2 text-center hidden md:table-cell text-slate-600 dark:text-slate-400">{s.gamesFor}</td>
                    <td className="py-2.5 px-2 text-center hidden md:table-cell text-slate-600 dark:text-slate-400">{s.gamesAgainst}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <TournamentBottomNav slug={slug} />
    </div>
  );
}
