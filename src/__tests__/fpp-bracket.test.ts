import { describe, it, expect } from "vitest";
import { getFPPConfig, fppKnockoutOrder } from "@/lib/fpp-bracket";

// ── getFPPConfig ───────────────────────────────────────────────────────────────

describe("getFPPConfig", () => {
  it("4 players → 1 group + Final", () => {
    const c = getFPPConfig(4);
    expect(c.groupCount).toBe(1);
    expect(c.advanceCount).toBe(2);
    expect(c.isDirectElimination).toBe(false);
  });

  it("5 players → 1 group + Final", () => {
    const c = getFPPConfig(5);
    expect(c.groupCount).toBe(1);
    expect(c.advanceCount).toBe(2);
    expect(c.isDirectElimination).toBe(false);
  });

  it("6 players → 2 groups", () => {
    const c = getFPPConfig(6);
    expect(c.groupCount).toBe(2);
    expect(c.advanceCount).toBe(2);
    expect(c.isDirectElimination).toBe(false);
  });

  it("7 players → 2 groups", () => {
    expect(getFPPConfig(7).groupCount).toBe(2);
  });

  it("8 players → 2 groups", () => {
    expect(getFPPConfig(8).groupCount).toBe(2);
  });

  it("9 players → 3 groups", () => {
    const c = getFPPConfig(9);
    expect(c.groupCount).toBe(3);
    expect(c.advanceCount).toBe(2);
    expect(c.isDirectElimination).toBe(false);
  });

  it("10 players → 3 groups", () => {
    expect(getFPPConfig(10).groupCount).toBe(3);
  });

  it("11 players → 3 groups", () => {
    expect(getFPPConfig(11).groupCount).toBe(3);
  });

  it("12 players → direct elimination", () => {
    const c = getFPPConfig(12);
    expect(c.isDirectElimination).toBe(true);
    expect(c.groupCount).toBe(0);
  });

  it("32 players → direct elimination", () => {
    expect(getFPPConfig(32).isDirectElimination).toBe(true);
  });
});

// ── fppKnockoutOrder ───────────────────────────────────────────────────────────

function makeAdv(positions: string[][]): { playerId: string; groupIndex: number }[][] {
  return positions.map((group) =>
    group.map((id, gi) => ({ playerId: id, groupIndex: gi }))
  );
}

describe("fppKnockoutOrder — 1 group", () => {
  it("returns [1st, 2nd]", () => {
    const adv = makeAdv([["1A"], ["2A"]]);
    expect(fppKnockoutOrder(adv, 1)).toEqual(["1A", "2A"]);
  });
});

describe("fppKnockoutOrder — 2 groups", () => {
  // standardBracketSeeding(4) = [1,4,2,3] → pairs (idx0,idx3) and (idx1,idx2)
  // Order [1A,1B,2A,2B] → (1A,2B) and (1B,2A) — cross-group ✓
  it("produces cross-group semis: 1A-2B and 1B-2A", () => {
    const adv = makeAdv([["1A", "1B"], ["2A", "2B"]]);
    expect(fppKnockoutOrder(adv, 2)).toEqual(["1A", "1B", "2A", "2B"]);
  });
});

describe("fppKnockoutOrder — 3 groups", () => {
  // Order [1A,1B,1C,2C,2B,2A] in 8-bracket:
  // seeds 1&2 get byes; QFs: (2C,2B) and (1C,2A)
  it("reverses the 2nds: [1A,1B,1C, 2C,2B,2A]", () => {
    const adv = makeAdv([["1A", "1B", "1C"], ["2A", "2B", "2C"]]);
    expect(fppKnockoutOrder(adv, 3)).toEqual(["1A", "1B", "1C", "2C", "2B", "2A"]);
  });
});

describe("fppKnockoutOrder — 4 groups", () => {
  // Expected: [1A,1B,1C,1D, 2B,2A,2D,2C]
  // standardBracketSeeding(8) pairs: (1A,2C),(1D,2B),(1B,2D),(1C,2A) — all cross-group ✓
  it("pairwise-swaps the 2nds: [1A,1B,1C,1D, 2B,2A,2D,2C]", () => {
    const adv = makeAdv([
      ["1A", "1B", "1C", "1D"],
      ["2A", "2B", "2C", "2D"],
    ]);
    expect(fppKnockoutOrder(adv, 4)).toEqual([
      "1A", "1B", "1C", "1D",
      "2B", "2A", "2D", "2C",
    ]);
  });

  it("no same-group pair in round 1", () => {
    // standardBracketSeeding(8)=[1,8,4,5,2,7,3,6] → R1 match pairs: (0,7),(3,4),(1,6),(2,5)
    const order = ["1A", "1B", "1C", "1D", "2B", "2A", "2D", "2C"];
    const seeding = [1, 8, 4, 5, 2, 7, 3, 6];
    // R1 pairs by position index (0-indexed):
    const r1Pairs = [
      [order[seeding[0] - 1], order[seeding[1] - 1]],
      [order[seeding[2] - 1], order[seeding[3] - 1]],
      [order[seeding[4] - 1], order[seeding[5] - 1]],
      [order[seeding[6] - 1], order[seeding[7] - 1]],
    ];
    // Each pair should be from different groups (1sts = A,B,C,D; 2nds = B,A,D,C)
    const groupOf = (s: string) => s[1]; // "1A" → "A"
    for (const [p1, p2] of r1Pairs) {
      expect(groupOf(p1)).not.toBe(groupOf(p2));
    }
  });
});
