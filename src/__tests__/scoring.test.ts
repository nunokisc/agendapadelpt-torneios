import { describe, it, expect } from "vitest";
import {
  determineSetWinner,
  determineMatchWinner,
  validateScores,
  getFormatStructure,
} from "@/lib/scoring";
// ---------------------------------------------------------------------------
// determineSetWinner
// ---------------------------------------------------------------------------
describe("determineSetWinner — normal 6-game set (A1/A2)", () => {
  const s = getFormatStructure("A1")[0];

  it("6-0 → team 1 wins", () => expect(determineSetWinner({ team1: 6, team2: 0 }, s)).toBe(1));
  it("0-6 → team 2 wins", () => expect(determineSetWinner({ team1: 0, team2: 6 }, s)).toBe(2));
  it("6-4 → team 1 wins", () => expect(determineSetWinner({ team1: 6, team2: 4 }, s)).toBe(1));
  it("4-6 → team 2 wins", () => expect(determineSetWinner({ team1: 4, team2: 6 }, s)).toBe(2));
  it("7-5 → team 1 wins", () => expect(determineSetWinner({ team1: 7, team2: 5 }, s)).toBe(1));
  it("5-7 → team 2 wins", () => expect(determineSetWinner({ team1: 5, team2: 7 }, s)).toBe(2));
  it("6-6 without tiebreak → null (pending)", () =>
    expect(determineSetWinner({ team1: 6, team2: 6 }, s)).toBeNull());
  it("6-6 with valid tiebreak 7-3 → team 1 wins", () =>
    expect(determineSetWinner({ team1: 6, team2: 6, tiebreak: { team1: 7, team2: 3 } }, s)).toBe(1));
  it("6-6 with valid tiebreak 3-7 → team 2 wins", () =>
    expect(determineSetWinner({ team1: 6, team2: 6, tiebreak: { team1: 3, team2: 7 } }, s)).toBe(2));
  it("6-6 with tiebreak 7-6 (needs 2-diff) → null", () =>
    expect(determineSetWinner({ team1: 6, team2: 6, tiebreak: { team1: 7, team2: 6 } }, s)).toBeNull());
  it("6-5 → null (not a valid score)", () =>
    expect(determineSetWinner({ team1: 6, team2: 5 }, s)).toBeNull());
  it("5-6 → null", () => expect(determineSetWinner({ team1: 5, team2: 6 }, s)).toBeNull());
});

describe("determineSetWinner — short 4-game set (C1/C2)", () => {
  const s = getFormatStructure("C1")[0];

  it("4-0 → team 1 wins", () => expect(determineSetWinner({ team1: 4, team2: 0 }, s)).toBe(1));
  it("4-2 → team 1 wins", () => expect(determineSetWinner({ team1: 4, team2: 2 }, s)).toBe(1));
  it("5-3 → team 1 wins", () => expect(determineSetWinner({ team1: 5, team2: 3 }, s)).toBe(1));
  it("4-4 without tiebreak → null", () =>
    expect(determineSetWinner({ team1: 4, team2: 4 }, s)).toBeNull());
  it("4-4 with tiebreak 7-4 → team 1 wins", () =>
    expect(determineSetWinner({ team1: 4, team2: 4, tiebreak: { team1: 7, team2: 4 } }, s)).toBe(1));
  it("3-4 → null (not valid)", () =>
    expect(determineSetWinner({ team1: 3, team2: 4 }, s)).toBeNull());
});

describe("determineSetWinner — long 9-game set (D1/D2)", () => {
  const s = getFormatStructure("D1")[0];

  it("9-0 → team 1 wins", () => expect(determineSetWinner({ team1: 9, team2: 0 }, s)).toBe(1));
  it("9-7 → team 1 wins", () => expect(determineSetWinner({ team1: 9, team2: 7 }, s)).toBe(1));
  it("8-7 → null (at 8-7 the match continues, can't win with 8 games)", () =>
    expect(determineSetWinner({ team1: 8, team2: 7 }, s)).toBeNull());
  it("7-8 → null (same)", () => expect(determineSetWinner({ team1: 7, team2: 8 }, s)).toBeNull());
  it("8-8 without tiebreak → null", () =>
    expect(determineSetWinner({ team1: 8, team2: 8 }, s)).toBeNull());
  it("8-8 with tiebreak 7-3 → team 1 wins", () =>
    expect(determineSetWinner({ team1: 8, team2: 8, tiebreak: { team1: 7, team2: 3 } }, s)).toBe(1));
});

describe("determineSetWinner — Super Tie-Break (E)", () => {
  const s = getFormatStructure("E")[0];

  it("10-0 → team 1 wins", () => expect(determineSetWinner({ team1: 10, team2: 0 }, s)).toBe(1));
  it("10-8 → team 1 wins", () => expect(determineSetWinner({ team1: 10, team2: 8 }, s)).toBe(1));
  it("11-9 → team 1 wins", () => expect(determineSetWinner({ team1: 11, team2: 9 }, s)).toBe(1));
  it("10-9 → null (needs 2-point lead)", () =>
    expect(determineSetWinner({ team1: 10, team2: 9 }, s)).toBeNull());
  it("9-10 → null (needs 2-point lead)", () =>
    expect(determineSetWinner({ team1: 9, team2: 10 }, s)).toBeNull());
  it("11-9 → team 2 wins (2-diff reached)", () =>
    expect(determineSetWinner({ team1: 9, team2: 11 }, s)).toBe(2));
  it("5-3 → null (not reached target yet)", () =>
    expect(determineSetWinner({ team1: 5, team2: 3 }, s)).toBeNull());
});

// ---------------------------------------------------------------------------
// determineMatchWinner
// ---------------------------------------------------------------------------
describe("determineMatchWinner — B1 (2 sets + STB)", () => {
  it("6-4, 6-3 → team 1 wins 2-0", () =>
    expect(
      determineMatchWinner([{ team1: 6, team2: 4 }, { team1: 6, team2: 3 }], "B1")
    ).toBe(1));

  it("3-6, 6-3, 10-7 STB → team 1 wins 2-1", () =>
    expect(
      determineMatchWinner(
        [{ team1: 3, team2: 6 }, { team1: 6, team2: 3 }, { team1: 10, team2: 7, superTiebreak: true }],
        "B1"
      )
    ).toBe(1));

  it("6-4, 3-6 with no STB → null (match not decided)", () =>
    expect(
      determineMatchWinner([{ team1: 6, team2: 4 }, { team1: 3, team2: 6 }], "B1")
    ).toBeNull());

  it("0-6, 0-6 → team 2 wins 0-2", () =>
    expect(
      determineMatchWinner([{ team1: 0, team2: 6 }, { team1: 0, team2: 6 }], "B1")
    ).toBe(2));
});

describe("determineMatchWinner — A1 (best of 3)", () => {
  it("6-0, 6-0 → team 1 wins", () =>
    expect(determineMatchWinner([{ team1: 6, team2: 0 }, { team1: 6, team2: 0 }], "A1")).toBe(1));

  it("6-0, 0-6, 6-3 → team 1 wins", () =>
    expect(
      determineMatchWinner([{ team1: 6, team2: 0 }, { team1: 0, team2: 6 }, { team1: 6, team2: 3 }], "A1")
    ).toBe(1));

  it("0-6, 0-6 → team 2 wins", () =>
    expect(determineMatchWinner([{ team1: 0, team2: 6 }, { team1: 0, team2: 6 }], "A1")).toBe(2));

  it("single set only → null (need 2 sets to win A1)", () =>
    expect(determineMatchWinner([{ team1: 6, team2: 0 }], "A1")).toBeNull());
});

describe("determineMatchWinner — C1 (2 short sets + STB)", () => {
  it("4-2, 4-2 → team 1 wins", () =>
    expect(determineMatchWinner([{ team1: 4, team2: 2 }, { team1: 4, team2: 2 }], "C1")).toBe(1));

  it("2-4, 4-2, 10-5 → team 1 wins via STB", () =>
    expect(
      determineMatchWinner(
        [{ team1: 2, team2: 4 }, { team1: 4, team2: 2 }, { team1: 10, team2: 5 }],
        "C1"
      )
    ).toBe(1));
});

describe("determineMatchWinner — D1 (single 9-game set)", () => {
  it("9-3 → team 1 wins", () =>
    expect(determineMatchWinner([{ team1: 9, team2: 3 }], "D1")).toBe(1));

  it("3-9 → team 2 wins", () =>
    expect(determineMatchWinner([{ team1: 3, team2: 9 }], "D1")).toBe(2));
});

describe("determineMatchWinner — E (STB only)", () => {
  it("10-2 → team 1 wins", () =>
    expect(determineMatchWinner([{ team1: 10, team2: 2 }], "E")).toBe(1));

  it("10-9 → null (no 2-diff)", () =>
    expect(determineMatchWinner([{ team1: 10, team2: 9 }], "E")).toBeNull());
});

// ---------------------------------------------------------------------------
// validateScores
// ---------------------------------------------------------------------------
describe("validateScores — B1", () => {
  it("6-4, 6-3 → valid", () =>
    expect(validateScores([{ team1: 6, team2: 4 }, { team1: 6, team2: 3 }], "B1").valid).toBe(true));

  it("6-4, 3-6, 10-7 → valid with STB", () =>
    expect(
      validateScores(
        [{ team1: 6, team2: 4 }, { team1: 3, team2: 6 }, { team1: 10, team2: 7 }],
        "B1"
      ).valid
    ).toBe(true));

  it("6-5, 6-3 → invalid score 6-5", () =>
    expect(validateScores([{ team1: 6, team2: 5 }, { team1: 6, team2: 3 }], "B1").valid).toBe(false));

  it("6-6 without tiebreak → invalid", () =>
    expect(validateScores([{ team1: 6, team2: 6 }, { team1: 6, team2: 3 }], "B1").valid).toBe(false));

  it("10-9 STB (no 2-diff) → invalid", () =>
    expect(
      validateScores(
        [{ team1: 6, team2: 4 }, { team1: 3, team2: 6 }, { team1: 10, team2: 9 }],
        "B1"
      ).valid
    ).toBe(false));

  it("empty scores → invalid", () =>
    expect(validateScores([], "B1").valid).toBe(false));

  it("6-4 only (1 set, no winner) → invalid (tied 1-0... wait, only 1 set played, not decided)", () =>
    expect(validateScores([{ team1: 6, team2: 4 }], "B1").valid).toBe(false));
});

describe("validateScores — A1 (best of 3)", () => {
  it("6-0, 6-0 → valid", () =>
    expect(validateScores([{ team1: 6, team2: 0 }, { team1: 6, team2: 0 }], "A1").valid).toBe(true));

  it("6-0, 0-6, 6-3 → valid", () =>
    expect(
      validateScores([{ team1: 6, team2: 0 }, { team1: 0, team2: 6 }, { team1: 6, team2: 3 }], "A1").valid
    ).toBe(true));

  it("6-0, 6-0, 6-0 → invalid (3rd set unnecessary)", () =>
    expect(
      validateScores([{ team1: 6, team2: 0 }, { team1: 6, team2: 0 }, { team1: 6, team2: 0 }], "A1").valid
    ).toBe(false));
});

describe("validateScores — C1 (4-game sets)", () => {
  it("4-2, 4-2 → valid", () =>
    expect(validateScores([{ team1: 4, team2: 2 }, { team1: 4, team2: 2 }], "C1").valid).toBe(true));

  it("4-3, 4-2 → invalid (4-3 not valid)", () =>
    expect(validateScores([{ team1: 4, team2: 3 }, { team1: 4, team2: 2 }], "C1").valid).toBe(false));
});

describe("validateScores — D1 (9-game set)", () => {
  it("9-5 → valid", () =>
    expect(validateScores([{ team1: 9, team2: 5 }], "D1").valid).toBe(true));

  it("8-8 with tiebreak 7-3 → valid", () =>
    expect(
      validateScores([{ team1: 8, team2: 8, tiebreak: { team1: 7, team2: 3 } }], "D1").valid
    ).toBe(true));

  it("8-8 without tiebreak → invalid", () =>
    expect(validateScores([{ team1: 8, team2: 8 }], "D1").valid).toBe(false));

  it("9-8 → invalid (can't happen: at 8-7 you continue, at 8-8 a tiebreak is played)", () =>
    expect(validateScores([{ team1: 9, team2: 8 }], "D1").valid).toBe(false));
});

describe("validateScores — E (STB only)", () => {
  it("10-5 → valid", () =>
    expect(validateScores([{ team1: 10, team2: 5 }], "E").valid).toBe(true));

  it("10-9 → invalid (no 2-diff)", () =>
    expect(validateScores([{ team1: 10, team2: 9 }], "E").valid).toBe(false));

  it("two sets → invalid (only 1 set allowed)", () =>
    expect(validateScores([{ team1: 10, team2: 5 }, { team1: 10, team2: 5 }], "E").valid).toBe(false));
});

describe("validateScores — F (4-game no-ad, TB at 3-3)", () => {
  it("4-0 → valid", () =>
    expect(validateScores([{ team1: 4, team2: 0 }], "F").valid).toBe(true));

  it("3-3 with tiebreak 7-4 → valid", () =>
    expect(
      validateScores([{ team1: 3, team2: 3, tiebreak: { team1: 7, team2: 4 } }], "F").valid
    ).toBe(true));

  it("4-3 → invalid (not a valid 4-game score)", () =>
    expect(validateScores([{ team1: 4, team2: 3 }], "F").valid).toBe(false));
});
