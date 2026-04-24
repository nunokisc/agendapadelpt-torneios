import { describe, it, expect } from "vitest";
import {
  generateSingleElimination,
  generateRoundRobin,
  generateGroupsKnockout,
  generateDoubleElimination,
} from "@/lib/bracket-engine";
import { standardBracketSeeding, nextPowerOfTwo, serpentineGroupDistribution } from "@/lib/seeding";

// ---------------------------------------------------------------------------
// Seeding helpers
// ---------------------------------------------------------------------------
describe("nextPowerOfTwo", () => {
  it("returns self when already power of two", () => {
    expect(nextPowerOfTwo(1)).toBe(1);
    expect(nextPowerOfTwo(2)).toBe(2);
    expect(nextPowerOfTwo(4)).toBe(4);
    expect(nextPowerOfTwo(8)).toBe(8);
  });
  it("rounds up", () => {
    expect(nextPowerOfTwo(3)).toBe(4);
    expect(nextPowerOfTwo(5)).toBe(8);
    expect(nextPowerOfTwo(9)).toBe(16);
  });
});

describe("standardBracketSeeding", () => {
  it("size 2 → [1,2]", () => expect(standardBracketSeeding(2)).toEqual([1, 2]));
  it("size 4 → [1,4,2,3]", () => expect(standardBracketSeeding(4)).toEqual([1, 4, 2, 3]));
  it("size 8 → [1,8,4,5,2,7,3,6]", () =>
    expect(standardBracketSeeding(8)).toEqual([1, 8, 4, 5, 2, 7, 3, 6]));
  it("each pair of adjacent seeds in R1 sums to bracketSize+1", () => {
    for (const size of [4, 8, 16]) {
      const seeds = standardBracketSeeding(size);
      for (let i = 0; i < seeds.length; i += 2) {
        expect(seeds[i] + seeds[i + 1]).toBe(size + 1);
      }
    }
  });
});

describe("serpentineGroupDistribution", () => {
  it("4 players, 2 groups → [0,1,1,0]", () =>
    expect(serpentineGroupDistribution(4, 2)).toEqual([0, 1, 1, 0]));
  it("6 players, 2 groups → [0,1,1,0,0,1]", () =>
    expect(serpentineGroupDistribution(6, 2)).toEqual([0, 1, 1, 0, 0, 1]));
  it("6 players, 3 groups → [0,1,2,2,1,0]", () =>
    expect(serpentineGroupDistribution(6, 3)).toEqual([0, 1, 2, 2, 1, 0]));
  it("each group gets roughly equal players", () => {
    const dist = serpentineGroupDistribution(9, 3);
    const counts = [0, 1, 2].map((g) => dist.filter((x) => x === g).length);
    counts.forEach((c) => expect(c).toBe(3));
  });
});

// ---------------------------------------------------------------------------
// generateSingleElimination
// ---------------------------------------------------------------------------
describe("generateSingleElimination — 4 players, no third place", () => {
  const matches = generateSingleElimination(4, false);

  it("creates 3 matches (log2(4)=2 rounds → 2+1)", () => expect(matches).toHaveLength(3));
  it("all matches are bracketType=winners", () =>
    matches.forEach((m) => expect(m.bracketType).toBe("winners")));
  it("round 1 has 2 matches", () =>
    expect(matches.filter((m) => m.round === 1)).toHaveLength(2));
  it("round 2 (final) has 1 match", () =>
    expect(matches.filter((m) => m.round === 2)).toHaveLength(1));
  it("no byes (4 is power of 2)", () =>
    expect(matches.filter((m) => m.status === "bye")).toHaveLength(0));
  it("R1 matches point to the final", () => {
    const r1 = matches.filter((m) => m.round === 1);
    const finalIdx = matches.findIndex((m) => m.round === 2);
    r1.forEach((m) => expect(m.nextMatchIndex).toBe(finalIdx));
  });
});

describe("generateSingleElimination — 8 players, no third place", () => {
  const matches = generateSingleElimination(8, false);

  it("creates 7 matches", () => expect(matches).toHaveLength(7));
  it("4 matches in round 1", () =>
    expect(matches.filter((m) => m.round === 1)).toHaveLength(4));
  it("2 matches in round 2 (semis)", () =>
    expect(matches.filter((m) => m.round === 2)).toHaveLength(2));
  it("1 match in round 3 (final)", () =>
    expect(matches.filter((m) => m.round === 3)).toHaveLength(1));
  it("no byes", () =>
    expect(matches.filter((m) => m.status === "bye")).toHaveLength(0));
  it("seed 1 vs seed 8 in R1 (positions sum bracketSize+1)", () => {
    const r1 = matches.filter((m) => m.round === 1).sort((a, b) => a.position - b.position);
    // team1Index=0 (seed1=playerIdx0) vs team2Index=7 (seed8=playerIdx7)
    expect(r1[0].team1Index).toBe(0);
    expect(r1[0].team2Index).toBe(7);
  });
});

describe("generateSingleElimination — 5 players (has byes)", () => {
  const matches = generateSingleElimination(5, false);

  it("uses bracketSize=8 → 7 matches", () => expect(matches).toHaveLength(7));
  it("has 3 byes (8-5=3 empty spots)", () =>
    expect(matches.filter((m) => m.status === "bye")).toHaveLength(3));
  it("bye matches have a nextMatchIndex", () =>
    matches.filter((m) => m.status === "bye").forEach((m) => {
      expect(m.nextMatchIndex).not.toBeNull();
    }));
});

describe("generateSingleElimination — 4 players WITH third place", () => {
  const matches = generateSingleElimination(4, true);

  it("creates 4 matches (3 winners + 1 third_place)", () => expect(matches).toHaveLength(4));
  it("has 1 third_place match", () =>
    expect(matches.filter((m) => m.bracketType === "third_place")).toHaveLength(1));
  it("both semi-final losers wire to third_place", () => {
    const semis = matches.filter((m) => m.round === 1);
    const thirdIdx = matches.findIndex((m) => m.bracketType === "third_place");
    semis.forEach((m) => expect(m.loserNextMatchIndex).toBe(thirdIdx));
  });
  it("semi slot 1 and slot 2 are assigned", () => {
    const semis = matches.filter((m) => m.round === 1).sort((a, b) => a.position - b.position);
    expect(semis[0].loserNextSlot).toBe(1);
    expect(semis[1].loserNextSlot).toBe(2);
  });
});

describe("generateSingleElimination — 3 players WITH third place", () => {
  const matches = generateSingleElimination(3, true);

  it("does NOT create a third_place match (only 1 real semi)", () =>
    expect(matches.filter((m) => m.bracketType === "third_place")).toHaveLength(0));
  it("the bye match does NOT wire to a loser slot", () => {
    const byes = matches.filter((m) => m.status === "bye");
    byes.forEach((m) => expect(m.loserNextMatchIndex).toBeUndefined());
  });
});

describe("generateSingleElimination — 2 players WITH third place", () => {
  const matches = generateSingleElimination(2, true);

  it("only 1 match (the final), no third_place (rounds < 2)", () => {
    expect(matches).toHaveLength(1);
    expect(matches.filter((m) => m.bracketType === "third_place")).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// generateRoundRobin
// ---------------------------------------------------------------------------
describe("generateRoundRobin", () => {
  it("4 players → 6 matches (C(4,2))", () => {
    const m = generateRoundRobin(4);
    expect(m.filter((x) => x.status !== "bye")).toHaveLength(6);
  });

  it("5 players → 10 matches", () => {
    const m = generateRoundRobin(5);
    expect(m.filter((x) => x.status !== "bye")).toHaveLength(10);
  });

  it("all matches are bracketType=group", () => {
    generateRoundRobin(4).forEach((m) => expect(m.bracketType).toBe("group"));
  });

  it("each pair of players meets exactly once", () => {
    const m = generateRoundRobin(4).filter((x) => x.status !== "bye");
    const pairs = m.map((x) =>
      [x.team1Index, x.team2Index].sort((a, b) => (a ?? 0) - (b ?? 0)).join("-")
    );
    const unique = new Set(pairs);
    expect(unique.size).toBe(pairs.length);
  });

  it("5 players: 5 rounds with 2 matches each + 1 bye per round", () => {
    const m = generateRoundRobin(5);
    const maxRound = Math.max(...m.map((x) => x.round));
    expect(maxRound).toBe(5);
    for (let r = 1; r <= 5; r++) {
      const round = m.filter((x) => x.round === r);
      expect(round).toHaveLength(3); // 2 real + 1 bye (5 players → one sits out each round)
    }
  });
});

// ---------------------------------------------------------------------------
// generateGroupsKnockout
// ---------------------------------------------------------------------------
describe("generateGroupsKnockout", () => {
  it("8 players, 2 groups → 12 group matches (6 per group)", () => {
    const { groupMatches } = generateGroupsKnockout(8, 2);
    expect(groupMatches.filter((m) => m.status !== "bye")).toHaveLength(12);
  });

  it("6 players, 3 groups → 3 groups of 2 → 3 matches total", () => {
    const { groupMatches } = generateGroupsKnockout(6, 3);
    // 3 groups of 2 players: C(2,2)=1 match per group × 3 = 3
    expect(groupMatches.filter((m) => m.status !== "bye")).toHaveLength(3);
  });

  it("groupIndex is set correctly on each match", () => {
    const { groupMatches } = generateGroupsKnockout(8, 2);
    groupMatches.forEach((m) => {
      expect(m.groupIndex).toBeGreaterThanOrEqual(0);
      expect(m.groupIndex).toBeLessThan(2);
    });
  });

  it("all matches are bracketType=group", () => {
    const { groupMatches } = generateGroupsKnockout(8, 2);
    groupMatches.forEach((m) => expect(m.bracketType).toBe("group"));
  });
});

// ---------------------------------------------------------------------------
// generateDoubleElimination
// ---------------------------------------------------------------------------
describe("generateDoubleElimination — 4 players", () => {
  const matches = generateDoubleElimination(4);
  const winners = matches.filter((m) => m.bracketType === "winners");
  const losers = matches.filter((m) => m.bracketType === "losers");
  const finals = matches.filter((m) => m.bracketType === "final");

  it("has winners bracket matches", () => expect(winners.length).toBeGreaterThan(0));
  it("has losers bracket matches", () => expect(losers.length).toBeGreaterThan(0));
  it("has 1 grand final", () => expect(finals).toHaveLength(1));
  it("winners bracket R1 losers wire to losers bracket", () => {
    const r1 = winners.filter((m) => m.round === 1);
    r1.forEach((m) => expect(m.loserNextMatchIndex).not.toBeNull());
  });
});

describe("generateDoubleElimination — 8 players", () => {
  const matches = generateDoubleElimination(8);
  const winners = matches.filter((m) => m.bracketType === "winners");
  const losers = matches.filter((m) => m.bracketType === "losers");
  const finals = matches.filter((m) => m.bracketType === "final");

  it("winners bracket: 7 matches (log2(8)=3 rounds)", () => expect(winners).toHaveLength(7));
  it("grand final: 1 match", () => expect(finals).toHaveLength(1));
  it("losers bracket has matches", () => expect(losers.length).toBeGreaterThan(0));
  it("winners final wires to grand final slot 1", () => {
    const wFinal = winners.find((m) => m.round === Math.max(...winners.map((x) => x.round)));
    expect(wFinal?.nextMatchIndex).toBe(matches.indexOf(finals[0]));
    expect(wFinal?.nextMatchSlot).toBe(1);
  });
});
