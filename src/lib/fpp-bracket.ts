/**
 * FPP (Federação Portuguesa de Padel) automatic bracket system.
 * Determines group count and knockout seeding based on player count
 * according to FPP regulation (Section 8).
 */

export interface FPPConfig {
  groupCount: number;
  advanceCount: number;
  isDirectElimination: boolean;
  description: string;
}

/**
 * Returns the FPP bracket system for a given number of checked-in pairs.
 *
 * | Count | System                                  |
 * |-------|-----------------------------------------|
 * | 4–5   | 1 group (RR) + Final                    |
 * | 6–8   | 2 groups + Semis + Final                |
 * | 9–11  | 3 groups + Quartos + Meias + Final      |
 * | 12+   | Quadro directo (single elimination)     |
 */
export function getFPPConfig(playerCount: number): FPPConfig {
  if (playerCount <= 5) {
    return {
      groupCount: 1,
      advanceCount: 2,
      isDirectElimination: false,
      description: `1 grupo de ${playerCount} + Final`,
    };
  }
  if (playerCount <= 8) {
    const groupSizes = playerCount === 6 ? "2×3"
      : playerCount === 7 ? "3+4"
      : "2×4";
    return {
      groupCount: 2,
      advanceCount: 2,
      isDirectElimination: false,
      description: `2 grupos (${groupSizes}) + Meias + Final`,
    };
  }
  if (playerCount <= 11) {
    const groupSizes = playerCount === 9 ? "3×3"
      : playerCount === 10 ? "3+3+4"
      : "3+4+4";
    return {
      groupCount: 3,
      advanceCount: 2,
      isDirectElimination: false,
      description: `3 grupos (${groupSizes}) + Quartos + Meias + Final`,
    };
  }
  return {
    groupCount: 0,
    advanceCount: 0,
    isDirectElimination: true,
    description: `Quadro directo (${playerCount} duplas)`,
  };
}

/**
 * Returns advancing players in FPP cross-group seeding order.
 * Ensures no same-group matchup occurs in the first knockout round.
 *
 * Groups advance in order 0, 1, 2, ... so:
 *   advancingByPosition[0] = [1st-G0, 1st-G1, 1st-G2, ...]
 *   advancingByPosition[1] = [2nd-G0, 2nd-G1, 2nd-G2, ...]
 *
 * FPP seeding rules per group count:
 *   1 group  → [1st, 2nd]            (just a final)
 *   2 groups → [1A, 1B, 2A, 2B]      (cross semis: 1A-2B, 1B-2A)
 *   3 groups → [1A, 1B, 1C, 2C, 2B, 2A]  (1A/1B bye, QFs: 2B-2C, 1C-2A)
 *   4 groups → [1A,1B,1C,1D, 2B,2A,2D,2C] (QFs: 1A-2C, 1D-2B, 1B-2D, 1C-2A)
 */
export function fppKnockoutOrder(
  advancingByPosition: { playerId: string; groupIndex: number }[][],
  groupCount: number
): string[] {
  const firsts = (advancingByPosition[0] ?? []).map((a) => a.playerId);
  const secondsArr = advancingByPosition[1] ?? [];

  if (groupCount <= 1) {
    return [...firsts, ...secondsArr.map((a) => a.playerId)];
  }

  if (groupCount === 2) {
    // Both 1sts and 2nds in group order — standardBracketSeeding(4)=[1,4,2,3]
    // produces pairs (1A,2B) and (1B,2A) ✓
    return [...firsts, ...secondsArr.map((a) => a.playerId)];
  }

  if (groupCount === 3) {
    // 1sts forward, 2nds reversed — in 8-team bracket seeds 1 and 2 get byes,
    // QFs become: 2C-2B and 1C-2A, matching FPP bracket ✓
    const seconds = [...secondsArr].reverse().map((a) => a.playerId);
    return [...firsts, ...seconds];
  }

  // 4 groups (and fallback): pairwise-swap the 2nds
  // secondsArr = [2A,2B,2C,2D] → swap pairs → [2B,2A,2D,2C]
  // This produces FPP QFs: 1A-2C, 1D-2B, 1B-2D, 1C-2A ✓
  const seconds: string[] = [];
  for (let i = 0; i < secondsArr.length; i += 2) {
    seconds.push(secondsArr[Math.min(i + 1, secondsArr.length - 1)].playerId);
    seconds.push(secondsArr[i].playerId);
  }
  return [...firsts, ...seconds];
}

/** Human-readable description of the FPP knockout bracket shape. */
export function fppBracketShape(groupCount: number, advanceCount: number): string {
  const advancing = groupCount * advanceCount;
  if (groupCount === 1) return "Final";
  if (advancing <= 4) return "Meias + Final";
  if (advancing <= 8) return "Quartos + Meias + Final";
  return "Eliminação";
}
