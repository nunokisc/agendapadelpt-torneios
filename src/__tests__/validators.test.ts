import { describe, it, expect } from "vitest";
import { createTournamentSchema, addTeamSchema, addPlayersSchema, scoreSchema } from "@/lib/validators";

// ── createTournamentSchema ─────────────────────────────────────────────────────

describe("createTournamentSchema — valid inputs", () => {
  it("accepts minimal valid input", () => {
    const result = createTournamentSchema.safeParse({
      name: "Open Porto",
      format: "single_elimination",
    });
    expect(result.success).toBe(true);
  });

  it("defaults tournamentMode to 'manual'", () => {
    const result = createTournamentSchema.safeParse({
      name: "Open",
      format: "round_robin",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.tournamentMode).toBe("manual");
  });

  it("defaults matchFormat to 'M3SPO'", () => {
    const result = createTournamentSchema.safeParse({
      name: "Open",
      format: "round_robin",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.matchFormat).toBe("M3SPO");
  });

  it("defaults courtCount to 1", () => {
    const result = createTournamentSchema.safeParse({
      name: "Open",
      format: "round_robin",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.courtCount).toBe(1);
  });

  it("accepts all tournament formats", () => {
    const formats = [
      "single_elimination",
      "double_elimination",
      "round_robin",
      "groups_knockout",
      "fpp_auto",
    ] as const;
    for (const format of formats) {
      const r = createTournamentSchema.safeParse({ name: "Torneio", format });
      expect(r.success, `format: ${format}`).toBe(true);
    }
  });

  it("accepts tournamentMode fpp_auto", () => {
    const result = createTournamentSchema.safeParse({
      name: "FPP Torneio",
      format: "fpp_auto",
      tournamentMode: "fpp_auto",
    });
    expect(result.success).toBe(true);
  });

  it("accepts all valid match formats", () => {
    const formats = ["PRO", "PROPO", "M3S", "M3SPO", "M3", "M3PO",
                     "A1", "A2", "B1", "B2", "C1", "C2", "D1", "D2", "E", "F"] as const;
    for (const f of formats) {
      const r = createTournamentSchema.safeParse({
        name: "Torneio",
        format: "round_robin",
        matchFormat: f,
      });
      expect(r.success, `matchFormat: ${f}`).toBe(true);
    }
  });

  it("accepts optional description up to 500 chars", () => {
    const result = createTournamentSchema.safeParse({
      name: "Open",
      format: "round_robin",
      description: "x".repeat(500),
    });
    expect(result.success).toBe(true);
  });

  it("accepts categories array", () => {
    const result = createTournamentSchema.safeParse({
      name: "Multi-série",
      format: "fpp_auto",
      tournamentMode: "fpp_auto",
      categories: ["M3", "F3", "+40M"],
    });
    expect(result.success).toBe(true);
  });

  it("accepts starPoint and thirdPlace booleans", () => {
    const result = createTournamentSchema.safeParse({
      name: "Torneio",
      format: "single_elimination",
      starPoint: true,
      thirdPlace: true,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.starPoint).toBe(true);
      expect(result.data.thirdPlace).toBe(true);
    }
  });

  it("accepts courtCount up to 20 (a large value within range)", () => {
    const result = createTournamentSchema.safeParse({
      name: "Torneio",
      format: "round_robin",
      courtCount: 20,
    });
    expect(result.success).toBe(true);
  });
});

describe("createTournamentSchema — invalid inputs", () => {
  it("rejects name shorter than 2 chars", () => {
    const result = createTournamentSchema.safeParse({
      name: "A",
      format: "round_robin",
    });
    expect(result.success).toBe(false);
  });

  it("rejects name longer than 100 chars", () => {
    const result = createTournamentSchema.safeParse({
      name: "x".repeat(101),
      format: "round_robin",
    });
    expect(result.success).toBe(false);
  });

  it("rejects description longer than 500 chars", () => {
    const result = createTournamentSchema.safeParse({
      name: "Open",
      format: "round_robin",
      description: "x".repeat(501),
    });
    expect(result.success).toBe(false);
  });

  it("rejects unknown tournament format", () => {
    const result = createTournamentSchema.safeParse({
      name: "Open",
      format: "swiss_system",
    });
    expect(result.success).toBe(false);
  });

  it("rejects unknown match format", () => {
    const result = createTournamentSchema.safeParse({
      name: "Open",
      format: "round_robin",
      matchFormat: "UNKOWN",
    });
    expect(result.success).toBe(false);
  });

  it("rejects courtCount of 0", () => {
    const result = createTournamentSchema.safeParse({
      name: "Open",
      format: "round_robin",
      courtCount: 0,
    });
    expect(result.success).toBe(false);
  });

  it("rejects courtCount above 99", () => {
    const result = createTournamentSchema.safeParse({
      name: "Open",
      format: "round_robin",
      courtCount: 100,
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty categories array", () => {
    const result = createTournamentSchema.safeParse({
      name: "Open",
      format: "fpp_auto",
      categories: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects groupCount below 2", () => {
    const result = createTournamentSchema.safeParse({
      name: "Open",
      format: "groups_knockout",
      groupCount: 1,
    });
    expect(result.success).toBe(false);
  });

  it("rejects groupCount above 8", () => {
    const result = createTournamentSchema.safeParse({
      name: "Open",
      format: "groups_knockout",
      groupCount: 9,
    });
    expect(result.success).toBe(false);
  });
});

// ── addTeamSchema ──────────────────────────────────────────────────────────────

describe("addTeamSchema — valid inputs", () => {
  it("accepts player1 and player2", () => {
    const result = addTeamSchema.safeParse({ player1: "João", player2: "Maria" });
    expect(result.success).toBe(true);
  });

  it("accepts optional teamName", () => {
    const result = addTeamSchema.safeParse({
      player1: "João",
      player2: "Maria",
      teamName: "João & Maria",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.teamName).toBe("João & Maria");
  });
});

describe("addTeamSchema — invalid inputs", () => {
  it("rejects missing player1", () => {
    const result = addTeamSchema.safeParse({ player2: "Maria" });
    expect(result.success).toBe(false);
  });

  it("rejects missing player2", () => {
    const result = addTeamSchema.safeParse({ player1: "João" });
    expect(result.success).toBe(false);
  });

  it("rejects empty player1", () => {
    const result = addTeamSchema.safeParse({ player1: "", player2: "Maria" });
    expect(result.success).toBe(false);
  });

  it("rejects player1 longer than 60 chars", () => {
    const result = addTeamSchema.safeParse({
      player1: "x".repeat(61),
      player2: "Maria",
    });
    expect(result.success).toBe(false);
  });

  it("rejects teamName longer than 60 chars", () => {
    const result = addTeamSchema.safeParse({
      player1: "João",
      player2: "Maria",
      teamName: "x".repeat(61),
    });
    expect(result.success).toBe(false);
  });
});

// ── addPlayersSchema ──────────────────────────────────────────────────────────

describe("addPlayersSchema — union variant", () => {
  it("accepts a single team object", () => {
    const result = addPlayersSchema.safeParse({ player1: "A", player2: "B" });
    expect(result.success).toBe(true);
  });

  it("accepts a teams array with one element", () => {
    const result = addPlayersSchema.safeParse({
      teams: [{ player1: "A", player2: "B" }],
    });
    expect(result.success).toBe(true);
  });

  it("accepts a teams array with multiple elements", () => {
    const result = addPlayersSchema.safeParse({
      teams: [
        { player1: "A", player2: "B" },
        { player1: "C", player2: "D" },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty teams array", () => {
    const result = addPlayersSchema.safeParse({ teams: [] });
    expect(result.success).toBe(false);
  });
});

// ── scoreSchema ───────────────────────────────────────────────────────────────

describe("scoreSchema — valid inputs", () => {
  it("accepts one set", () => {
    const result = scoreSchema.safeParse({
      scores: [{ team1: 6, team2: 3 }],
    });
    expect(result.success).toBe(true);
  });

  it("accepts multiple sets", () => {
    const result = scoreSchema.safeParse({
      scores: [
        { team1: 6, team2: 3 },
        { team1: 6, team2: 4 },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("accepts set with tiebreak", () => {
    const result = scoreSchema.safeParse({
      scores: [{ team1: 6, team2: 6, tiebreak: { team1: 7, team2: 3 } }],
    });
    expect(result.success).toBe(true);
  });

  it("accepts set with superTiebreak flag", () => {
    const result = scoreSchema.safeParse({
      scores: [{ team1: 10, team2: 7, superTiebreak: true }],
    });
    expect(result.success).toBe(true);
  });

  it("accepts score of 0-0", () => {
    const result = scoreSchema.safeParse({
      scores: [{ team1: 0, team2: 0 }],
    });
    expect(result.success).toBe(true);
  });
});

describe("scoreSchema — invalid inputs", () => {
  it("rejects empty scores array", () => {
    const result = scoreSchema.safeParse({ scores: [] });
    expect(result.success).toBe(false);
  });

  it("rejects missing scores key", () => {
    const result = scoreSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects negative scores", () => {
    const result = scoreSchema.safeParse({
      scores: [{ team1: -1, team2: 3 }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects float scores", () => {
    const result = scoreSchema.safeParse({
      scores: [{ team1: 6.5, team2: 3 }],
    });
    expect(result.success).toBe(false);
  });
});
