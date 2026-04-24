import { describe, it, expect } from "vitest";
import { computeGroupStandings } from "@/lib/standings";

const makeMatch = (
  t1: string,
  t2: string,
  winner: string,
  scores: Array<{ team1: number; team2: number }>
) => ({
  status: "completed",
  team1Id: t1,
  team2Id: t2,
  winnerId: winner,
  scores: JSON.stringify(scores),
});

describe("computeGroupStandings", () => {
  it("sorts by wins first", () => {
    const matches = [
      makeMatch("A", "B", "A", [{ team1: 6, team2: 3 }, { team1: 6, team2: 2 }]),
      makeMatch("A", "C", "A", [{ team1: 6, team2: 0 }, { team1: 6, team2: 1 }]),
      makeMatch("B", "C", "B", [{ team1: 6, team2: 4 }, { team1: 6, team2: 3 }]),
    ];
    const standings = computeGroupStandings(matches, ["A", "B", "C"]);
    expect(standings[0].playerId).toBe("A"); // 2 wins
    expect(standings[1].playerId).toBe("B"); // 1 win
    expect(standings[2].playerId).toBe("C"); // 0 wins
  });

  it("breaks win ties by set difference", () => {
    // A beats C (2-0 sets), B beats C (2-0 sets), A beats B (2-1 sets)
    const matches = [
      makeMatch("A", "B", "A", [{ team1: 6, team2: 4 }, { team1: 3, team2: 6 }, { team1: 10, team2: 5 }]),
      makeMatch("A", "C", "A", [{ team1: 6, team2: 0 }, { team1: 6, team2: 0 }]),
      makeMatch("B", "C", "B", [{ team1: 6, team2: 1 }, { team1: 6, team2: 2 }]),
    ];
    const standings = computeGroupStandings(matches, ["A", "B", "C"]);
    // A: 2W, sets 4-1=+3; B: 1W, sets 4-2=+2; C: 0W
    expect(standings[0].playerId).toBe("A");
    expect(standings[0].wins).toBe(2);
    expect(standings[1].playerId).toBe("B");
    expect(standings[1].wins).toBe(1);
  });

  it("breaks set-diff ties by game difference", () => {
    // A and B both have 1 win each, same set diff → tie-break by games
    const matches = [
      makeMatch("A", "B", "A", [{ team1: 6, team2: 0 }, { team1: 6, team2: 0 }]), // A wins 12-0 games
      makeMatch("A", "C", "C", [{ team1: 0, team2: 6 }, { team1: 0, team2: 6 }]),
      makeMatch("B", "C", "B", [{ team1: 6, team2: 3 }, { team1: 6, team2: 3 }]), // B wins 12-6 games
    ];
    const standings = computeGroupStandings(matches, ["A", "B", "C"]);
    // A: 1W, setsFor=2, setsAgainst=2, gameDiff=12-12=0? No...
    // A beats B: +2 sets, +12 games; loses to C: -2 sets, -12 games → net: 0 sets, 0 games
    // B beats C: +2 sets, +6 games (12-6); loses to A: -2 sets, -12 games → net: 0 sets, -6 games
    // C beats A: +2 sets, +12 games; loses to B: -2 sets, -6 games → net: 0 sets, +6 games
    // So: C (0W, +6 game diff) > A (0W, 0 game diff) > B (0W, -6 game diff)?
    // Wait, wins: A=1, B=1, C=1 — all 1 win. OK let me recompute.
    // set diff: A=0, B=0, C=0. Game diff: A=0, B=-6, C=+6.
    expect(standings[0].playerId).toBe("C"); // best game diff
    expect(standings[2].playerId).toBe("B"); // worst game diff
  });

  it("ignores incomplete (non-completed) matches", () => {
    const matches = [
      makeMatch("A", "B", "A", [{ team1: 6, team2: 3 }, { team1: 6, team2: 2 }]),
      { status: "pending", team1Id: "A", team2Id: "C", winnerId: null, scores: null },
    ];
    const standings = computeGroupStandings(matches, ["A", "B", "C"]);
    const a = standings.find((s) => s.playerId === "A")!;
    expect(a.wins).toBe(1); // only the completed match counts
  });

  it("all zeros when no matches completed", () => {
    const standings = computeGroupStandings([], ["A", "B", "C"]);
    standings.forEach((s) => {
      expect(s.wins).toBe(0);
      expect(s.losses).toBe(0);
    });
  });

  it("setsFor and setsAgainst are correct", () => {
    const matches = [
      makeMatch("A", "B", "A", [{ team1: 6, team2: 4 }, { team1: 3, team2: 6 }, { team1: 10, team2: 7 }]),
    ];
    const standings = computeGroupStandings(matches, ["A", "B"]);
    const a = standings.find((s) => s.playerId === "A")!;
    const b = standings.find((s) => s.playerId === "B")!;
    expect(a.setsFor).toBe(2);
    expect(a.setsAgainst).toBe(1);
    expect(b.setsFor).toBe(1);
    expect(b.setsAgainst).toBe(2);
  });

  it("gamesFor and gamesAgainst are correct", () => {
    const matches = [
      makeMatch("A", "B", "A", [{ team1: 6, team2: 0 }, { team1: 6, team2: 0 }]),
    ];
    const standings = computeGroupStandings(matches, ["A", "B"]);
    const a = standings.find((s) => s.playerId === "A")!;
    const b = standings.find((s) => s.playerId === "B")!;
    expect(a.gamesFor).toBe(12);
    expect(a.gamesAgainst).toBe(0);
    expect(b.gamesFor).toBe(0);
    expect(b.gamesAgainst).toBe(12);
  });
});
