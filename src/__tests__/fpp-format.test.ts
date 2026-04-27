import { describe, it, expect } from "vitest";
import { getFppFormatForCategory } from "@/lib/fpp-format";

// ── getFppFormatForCategory ────────────────────────────────────────────────────
//
// Source of truth: FPP Annex XIX regulation table.
//
//  ≤ 3  → PROPO, round_robin
//  4–5  → PROPO, groups_knockout (1 group + Final)
//  6–8  → M3SPO, groups_knockout (2 groups)
//  9–11 → M3SPO, groups_knockout (3 groups)
//  12–16 → M3SPO, single_elimination ("com CS")
//  17–32 → M3SPO, single_elimination ("8 CS")
//  33+  → M3SPO, single_elimination ("16 CS")

describe("getFppFormatForCategory — matchFormat boundaries", () => {
  it("≤3 pairs → PROPO (9-game no-ad set)", () => {
    for (const n of [1, 2, 3]) {
      expect(getFppFormatForCategory(n).matchFormat).toBe("PROPO");
    }
  });

  it("4–5 pairs → PROPO (group play)", () => {
    expect(getFppFormatForCategory(4).matchFormat).toBe("PROPO");
    expect(getFppFormatForCategory(5).matchFormat).toBe("PROPO");
  });

  it("6–11 pairs → M3SPO (2-set no-ad + STB)", () => {
    for (const n of [6, 7, 8, 9, 10, 11]) {
      expect(getFppFormatForCategory(n).matchFormat).toBe("M3SPO");
    }
  });

  it("12+ pairs → M3SPO", () => {
    for (const n of [12, 16, 17, 32, 33, 64]) {
      expect(getFppFormatForCategory(n).matchFormat).toBe("M3SPO");
    }
  });
});

describe("getFppFormatForCategory — systemType boundaries", () => {
  it("≤3 pairs → round_robin", () => {
    for (const n of [1, 2, 3]) {
      expect(getFppFormatForCategory(n).systemType).toBe("round_robin");
    }
  });

  it("4 pairs → groups_knockout (1 group + Final)", () => {
    const r = getFppFormatForCategory(4);
    expect(r.systemType).toBe("groups_knockout");
    expect(r.groupCount).toBe(1);
    expect(r.advanceCount).toBe(2);
  });

  it("5 pairs → groups_knockout (1 group + Final)", () => {
    const r = getFppFormatForCategory(5);
    expect(r.systemType).toBe("groups_knockout");
    expect(r.groupCount).toBe(1);
    expect(r.advanceCount).toBe(2);
  });

  it("6 pairs → groups_knockout with 2 groups", () => {
    const r = getFppFormatForCategory(6);
    expect(r.systemType).toBe("groups_knockout");
    expect(r.groupCount).toBe(2);
    expect(r.advanceCount).toBe(2);
  });

  it("7 pairs → groups_knockout with 2 groups", () => {
    expect(getFppFormatForCategory(7).groupCount).toBe(2);
  });

  it("8 pairs → groups_knockout with 2 groups", () => {
    expect(getFppFormatForCategory(8).groupCount).toBe(2);
  });

  it("9 pairs → groups_knockout with 3 groups", () => {
    const r = getFppFormatForCategory(9);
    expect(r.systemType).toBe("groups_knockout");
    expect(r.groupCount).toBe(3);
    expect(r.advanceCount).toBe(2);
  });

  it("10 pairs → groups_knockout with 3 groups", () => {
    expect(getFppFormatForCategory(10).groupCount).toBe(3);
  });

  it("11 pairs → groups_knockout with 3 groups", () => {
    expect(getFppFormatForCategory(11).groupCount).toBe(3);
  });

  it("12 pairs → single_elimination (direct bracket)", () => {
    expect(getFppFormatForCategory(12).systemType).toBe("single_elimination");
  });

  it("16 pairs → single_elimination", () => {
    expect(getFppFormatForCategory(16).systemType).toBe("single_elimination");
  });

  it("17 pairs → single_elimination", () => {
    expect(getFppFormatForCategory(17).systemType).toBe("single_elimination");
  });

  it("32 pairs → single_elimination", () => {
    expect(getFppFormatForCategory(32).systemType).toBe("single_elimination");
  });

  it("33 pairs → single_elimination", () => {
    expect(getFppFormatForCategory(33).systemType).toBe("single_elimination");
  });
});

describe("getFppFormatForCategory — groupCount/advanceCount absent for direct", () => {
  it("12+ pairs have no groupCount", () => {
    const r = getFppFormatForCategory(12);
    expect(r.groupCount).toBeUndefined();
    expect(r.advanceCount).toBeUndefined();
  });

  it("round_robin result has no groupCount", () => {
    const r = getFppFormatForCategory(3);
    expect(r.groupCount).toBeUndefined();
    expect(r.advanceCount).toBeUndefined();
  });
});

describe("getFppFormatForCategory — description strings", () => {
  it("≤3 → 'Round Robin'", () => {
    expect(getFppFormatForCategory(2).description).toContain("Round Robin");
  });

  it("4 → mentions 'Grupo' and 'Final'", () => {
    const d = getFppFormatForCategory(4).description;
    expect(d).toMatch(/grupo|final/i);
  });

  it("8 → mentions '2 Grupos'", () => {
    expect(getFppFormatForCategory(8).description).toMatch(/2 Grupos/i);
  });

  it("9 → mentions '3 Grupos'", () => {
    expect(getFppFormatForCategory(9).description).toMatch(/3 Grupos/i);
  });

  it("12 → mentions 'Quadro'", () => {
    expect(getFppFormatForCategory(12).description).toMatch(/quadro/i);
  });
});

describe("getFppFormatForCategory — boundary transitions are exact", () => {
  // Confirm no off-by-one errors at the critical boundaries

  it("5 still PROPO (not M3SPO)", () =>
    expect(getFppFormatForCategory(5).matchFormat).toBe("PROPO"));

  it("6 is M3SPO (first M3SPO boundary)", () =>
    expect(getFppFormatForCategory(6).matchFormat).toBe("M3SPO"));

  it("11 still 3 groups (not direct)", () => {
    const r = getFppFormatForCategory(11);
    expect(r.systemType).toBe("groups_knockout");
    expect(r.groupCount).toBe(3);
  });

  it("12 is direct bracket (first direct boundary)", () =>
    expect(getFppFormatForCategory(12).systemType).toBe("single_elimination"));
});
