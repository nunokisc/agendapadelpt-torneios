import type { SetScore } from "@/types";

export interface GroupStanding {
  playerId: string;
  played: number;
  wins: number;
  losses: number;
  points: number;
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
    walkover?: string | null;
  }>,
  playerIds: string[]
): GroupStanding[] {
  const stats = new Map<string, GroupStanding>();
  for (const pid of playerIds) {
    stats.set(pid, { playerId: pid, played: 0, wins: 0, losses: 0, points: 0, setsFor: 0, setsAgainst: 0, gamesFor: 0, gamesAgainst: 0 });
  }

  const h2hWins = new Map<string, Map<string, number>>();
  const h2hGames = new Map<string, Map<string, number>>();
  for (const pid of playerIds) {
    h2hWins.set(pid, new Map());
    h2hGames.set(pid, new Map());
  }

  for (const m of matches) {
    if (m.status !== "completed" || !m.team1Id || !m.team2Id) continue;
    // skip if no scores and not a walkover (incomplete data)
    if (!m.scores && !m.walkover) continue;

    const scores: SetScore[] = m.scores ? JSON.parse(m.scores) : [];
    let s1 = 0, s2 = 0, g1 = 0, g2 = 0;
    for (const s of scores) {
      if (s.team1 > s.team2) s1++; else s2++;
      g1 += s.team1;
      g2 += s.team2;
    }

    const isWalkover = !!m.walkover;
    const absentSide = m.walkover; // "team1" | "team2" | undefined

    const t1 = stats.get(m.team1Id);
    const t2 = stats.get(m.team2Id);

    if (t1) {
      t1.played++;
      if (m.winnerId === m.team1Id) {
        t1.wins++;
        t1.points += 3;
      } else {
        t1.losses++;
        t1.points += isWalkover && absentSide === "team1" ? 0 : 1;
      }
      t1.setsFor += s1; t1.setsAgainst += s2;
      t1.gamesFor += g1; t1.gamesAgainst += g2;
    }
    if (t2) {
      t2.played++;
      if (m.winnerId === m.team2Id) {
        t2.wins++;
        t2.points += 3;
      } else {
        t2.losses++;
        t2.points += isWalkover && absentSide === "team2" ? 0 : 1;
      }
      t2.setsFor += s2; t2.setsAgainst += s1;
      t2.gamesFor += g2; t2.gamesAgainst += g1;
    }

    if (m.winnerId === m.team1Id) {
      h2hWins.get(m.team1Id)?.set(m.team2Id, 1);
      h2hWins.get(m.team2Id)?.set(m.team1Id, -1);
    } else if (m.winnerId === m.team2Id) {
      h2hWins.get(m.team2Id)?.set(m.team1Id, 1);
      h2hWins.get(m.team1Id)?.set(m.team2Id, -1);
    }
    const prevA = h2hGames.get(m.team1Id)?.get(m.team2Id) ?? 0;
    const prevB = h2hGames.get(m.team2Id)?.get(m.team1Id) ?? 0;
    h2hGames.get(m.team1Id)?.set(m.team2Id, prevA + g1 - g2);
    h2hGames.get(m.team2Id)?.set(m.team1Id, prevB + g2 - g1);
  }

  return Array.from(stats.values()).sort((a, b) => {
    // 1. Points
    if (b.points !== a.points) return b.points - a.points;
    // 2. Wins
    if (b.wins !== a.wins) return b.wins - a.wins;
    // 3. Set differential
    const sdA = a.setsFor - a.setsAgainst;
    const sdB = b.setsFor - b.setsAgainst;
    if (sdB !== sdA) return sdB - sdA;
    // 4. Game differential
    const gdA = a.gamesFor - a.gamesAgainst;
    const gdB = b.gamesFor - b.gamesAgainst;
    if (gdB !== gdA) return gdB - gdA;
    // 5. Head-to-head wins
    const h2hResult = h2hWins.get(a.playerId)?.get(b.playerId) ?? 0;
    if (h2hResult !== 0) return -h2hResult;
    // 6. Head-to-head game balance
    const h2hGdA = h2hGames.get(a.playerId)?.get(b.playerId) ?? 0;
    if (h2hGdA !== 0) return -h2hGdA;
    return 0;
  });
}
