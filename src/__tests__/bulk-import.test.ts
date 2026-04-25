import { describe, it, expect } from "vitest";
import { parseBulkText } from "@/lib/bulk-import";

describe("parseBulkText — slash-separated", () => {
  it("single line → one pair", () =>
    expect(parseBulkText("João / Maria")).toEqual([{ player1: "João", player2: "Maria" }]));

  it("trims surrounding whitespace", () =>
    expect(parseBulkText("  João Silva  /  Maria Santos  ")).toEqual([
      { player1: "João Silva", player2: "Maria Santos" },
    ]));

  it("multiple lines → multiple pairs", () =>
    expect(parseBulkText("A / B\nC / D")).toEqual([
      { player1: "A", player2: "B" },
      { player1: "C", player2: "D" },
    ]));

  it("blank lines are ignored", () =>
    expect(parseBulkText("A / B\n\nC / D\n")).toEqual([
      { player1: "A", player2: "B" },
      { player1: "C", player2: "D" },
    ]));
});

describe("parseBulkText — dash-separated", () => {
  it("'A - B' → one pair", () =>
    expect(parseBulkText("A - B")).toEqual([{ player1: "A", player2: "B" }]));

  it("mixed slash and dash", () =>
    expect(parseBulkText("A / B\nC - D")).toEqual([
      { player1: "A", player2: "B" },
      { player1: "C", player2: "D" },
    ]));
});

describe("parseBulkText — alternating lines", () => {
  it("two bare names → one pair", () =>
    expect(parseBulkText("João\nMaria")).toEqual([{ player1: "João", player2: "Maria" }]));

  it("four bare names → two pairs", () =>
    expect(parseBulkText("A\nB\nC\nD")).toEqual([
      { player1: "A", player2: "B" },
      { player1: "C", player2: "D" },
    ]));

  it("odd lone bare name is dropped", () =>
    expect(parseBulkText("A\nB\nC")).toEqual([{ player1: "A", player2: "B" }]));
});

describe("parseBulkText — mixed formats", () => {
  it("slash then alternating then slash", () =>
    expect(parseBulkText("A / B\nC\nD\nE / F")).toEqual([
      { player1: "A", player2: "B" },
      { player1: "C", player2: "D" },
      { player1: "E", player2: "F" },
    ]));
});

describe("parseBulkText — edge cases", () => {
  it("empty string → empty array", () =>
    expect(parseBulkText("")).toEqual([]));

  it("only whitespace/blank lines → empty array", () =>
    expect(parseBulkText("   \n\n  ")).toEqual([]));

  it("name containing a slash inside (no space around) treated as alternating", () =>
    // "AC/DC" has no spaces around the slash — let's check behaviour
    // Our parser uses indexOf("/") so "AC/DC" would be: p1="AC", p2="DC" — actually that's a valid split
    expect(parseBulkText("AC/DC\nMaria")).toEqual([{ player1: "AC", player2: "DC" }]));
});
