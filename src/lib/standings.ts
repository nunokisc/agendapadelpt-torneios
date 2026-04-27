import type { SetScore } from "@/types";

export interface GroupStanding {
  playerId: string;
  played: number;
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
    stats.set(pid, { playerId: pid, played: 0, wins: 0, losses: 0, setsFor: 0, setsAgainst: 0, gamesFor: 0, gamesAgainst: 0 });
  }

  // head-to-head: wins and game balance per pair
  const h2hWins = new Map<string, Map<string, number>>();
  const h2hGames = new Map<string, Map<string, number>>();
  for (const pid of playerIds) {
    h2hWins.set(pid, new Map());
    h2hGames.set(pid, new Map());
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
    // head-to-head wins
    if (m.winnerId === m.team1Id) {
      h2hWins.get(m.team1Id)?.set(m.team2Id, 1);
      h2hWins.get(m.team2Id)?.set(m.team1Id, -1);
    } else if (m.winnerId === m.team2Id) {
      h2hWins.get(m.team2Id)?.set(m.team1Id, 1);
      h2hWins.get(m.team1Id)?.set(m.team2Id, -1);
    }
    // head-to-head game balance for each direction
    const prevA = h2hGames.get(m.team1Id)?.get(m.team2Id) ?? 0;
    const prevB = h2hGames.get(m.team2Id)?.get(m.team1Id) ?? 0;
    h2hGames.get(m.team1Id)?.set(m.team2Id, prevA + g1 - g2);
    h2hGames.get(m.team2Id)?.set(m.team1Id, prevB + g2 - g1);
  }

  return Array.from(stats.values()).sort((a, b) => {
    // 1. Wins
    if (b.wins !== a.wins) return b.wins - a.wins;
    // 2. Set differential
    const sdA = a.setsFor - a.setsAgainst;
    const sdB = b.setsFor - b.setsAgainst;
    if (sdB !== sdA) return sdB - sdA;
    // 3. Game differential
    const gdA = a.gamesFor - a.gamesAgainst;
    const gdB = b.gamesFor - b.gamesAgainst;
    if (gdB !== gdA) return gdB - gdA;
    // 4. Head-to-head wins (for exact 2-way ties)
    const h2hResult = h2hWins.get(a.playerId)?.get(b.playerId) ?? 0;
    if (h2hResult !== 0) return -h2hResult;
    // 5. Head-to-head game balance
    const h2hGdA = h2hGames.get(a.playerId)?.get(b.playerId) ?? 0;
    if (h2hGdA !== 0) return -h2hGdA;
    return 0;
  });
}
