import type { SetScore } from "@/types";

export interface GroupStanding {
  playerId: string;
  wins: number;
  losses: number;
  setsFor: number;
  setsAgainst: number;
  gamesFor: number;
  gamesAgainst: number;
}

export function computeGroupStandings(
  matches: Array<{
    status: string;
    team1Id: string | null;
    team2Id: string | null;
    winnerId: string | null;
    scores: string | null;
  }>,
  playerIds: string[]
): GroupStanding[] {
  const stats = new Map<string, GroupStanding>();
  for (const pid of playerIds) {
    stats.set(pid, { playerId: pid, wins: 0, losses: 0, setsFor: 0, setsAgainst: 0, gamesFor: 0, gamesAgainst: 0 });
  }

  for (const m of matches) {
    if (m.status !== "completed" || !m.team1Id || !m.team2Id || !m.scores) continue;
    const scores: SetScore[] = JSON.parse(m.scores);
    let s1 = 0, s2 = 0, g1 = 0, g2 = 0;
    for (const s of scores) {
      if (s.team1 > s.team2) s1++; else s2++;
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
    return (b.gamesFor - b.gamesAgainst) - (a.gamesFor - a.gamesAgainst);
  });
}
