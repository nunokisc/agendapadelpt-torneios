import { nextPowerOfTwo, standardBracketSeeding, serpentineGroupDistribution } from "./seeding";
import { circleMethodSchedule } from "./round-robin";

interface MatchInput {
  round: number;
  position: number;
  bracketType: string;
  groupIndex?: number;
  team1Index?: number | null;
  team2Index?: number | null;
  nextMatchIndex?: number | null;
  nextMatchSlot?: number | null;
  loserNextMatchIndex?: number | null;
  loserNextSlot?: number | null;
  status: string;
}

export function generateSingleElimination(
  playerCount: number,
  thirdPlace: boolean
): MatchInput[] {
  const bracketSize = nextPowerOfTwo(playerCount);
  const seedOrder = standardBracketSeeding(bracketSize);
  const rounds = Math.log2(bracketSize);
  const matches: MatchInput[] = [];

  // Round 1
  for (let i = 0; i < bracketSize / 2; i++) {
    const seed1 = seedOrder[i * 2] - 1;
    const seed2 = seedOrder[i * 2 + 1] - 1;
    const p1 = seed1 < playerCount ? seed1 : null;
    const p2 = seed2 < playerCount ? seed2 : null;
    const isBye = p1 === null || p2 === null;
    matches.push({
      round: 1,
      position: i,
      bracketType: "winners",
      team1Index: p1,
      team2Index: p2,
      status: isBye ? "bye" : "pending",
    });
  }

  // Subsequent rounds
  for (let r = 2; r <= rounds; r++) {
    const matchesInRound = bracketSize / Math.pow(2, r);
    for (let i = 0; i < matchesInRound; i++) {
      matches.push({
        round: r,
        position: i,
        bracketType: "winners",
        team1Index: null,
        team2Index: null,
        status: "pending",
      });
    }
  }

  // Wire up nextMatch links
  let offset = 0;
  for (let r = 1; r < rounds; r++) {
    const matchesInRound = bracketSize / Math.pow(2, r);
    const nextRoundOffset = offset + matchesInRound;
    for (let i = 0; i < matchesInRound; i++) {
      const nextPos = Math.floor(i / 2);
      matches[offset + i].nextMatchIndex = nextRoundOffset + nextPos;
      matches[offset + i].nextMatchSlot = i % 2 === 0 ? 1 : 2;
    }
    offset += matchesInRound;
  }

  // Third place match — only when there are ≥2 real (non-bye) semi-finals
  // With 3 players one semi is a bye, so no loser exists to fill the 3rd place slot
  if (thirdPlace && rounds >= 2) {
    const semiRound = rounds - 1;
    const realSemiIndices = matches
      .map((m, i) => ({ m, i }))
      .filter(({ m }) => m.round === semiRound && m.bracketType === "winners" && m.status !== "bye")
      .map(({ i }) => i);

    if (realSemiIndices.length >= 2) {
      const thirdPlaceIndex = matches.length;
      matches.push({
        round: rounds,
        position: 1,
        bracketType: "third_place",
        team1Index: null,
        team2Index: null,
        status: "pending",
      });
      realSemiIndices.forEach((idx, slot) => {
        matches[idx].loserNextMatchIndex = thirdPlaceIndex;
        matches[idx].loserNextSlot = slot + 1;
      });
    }
  }

  return matches;
}

export function generateRoundRobin(playerCount: number): MatchInput[] {
  const schedule = circleMethodSchedule(playerCount);
  const matches: MatchInput[] = [];
  for (let r = 0; r < schedule.length; r++) {
    for (let i = 0; i < schedule[r].length; i++) {
      const [a, b] = schedule[r][i];
      matches.push({
        round: r + 1,
        position: i,
        bracketType: "group",
        groupIndex: 0,
        team1Index: a,
        team2Index: b === -1 ? null : b,
        status: b === -1 ? "bye" : "pending",
      });
    }
  }
  return matches;
}

export function generateGroupsKnockout(
  playerCount: number,
  groupCount: number
): { groupMatches: MatchInput[]; groupAssignments: number[] } {
  const groupAssignments = serpentineGroupDistribution(playerCount, groupCount);
  const groupMatches: MatchInput[] = [];

  for (let g = 0; g < groupCount; g++) {
    const groupPlayerIndices = groupAssignments
      .map((gi, pi) => (gi === g ? pi : -1))
      .filter((i) => i !== -1);
    const schedule = circleMethodSchedule(groupPlayerIndices.length);
    for (let r = 0; r < schedule.length; r++) {
      for (let i = 0; i < schedule[r].length; i++) {
        const [a, b] = schedule[r][i];
        groupMatches.push({
          round: r + 1,
          position: i,
          bracketType: "group",
          groupIndex: g,
          team1Index: groupPlayerIndices[a],
          team2Index: b === -1 ? null : groupPlayerIndices[b],
          status: b === -1 ? "bye" : "pending",
        });
      }
    }
  }

  return { groupMatches, groupAssignments };
}

export function generateDoubleElimination(playerCount: number): MatchInput[] {
  const bracketSize = nextPowerOfTwo(playerCount);
  const seedOrder = standardBracketSeeding(bracketSize);
  const wRounds = Math.log2(bracketSize);
  const matches: MatchInput[] = [];

  // Winners bracket round 1
  for (let i = 0; i < bracketSize / 2; i++) {
    const seed1 = seedOrder[i * 2] - 1;
    const seed2 = seedOrder[i * 2 + 1] - 1;
    const p1 = seed1 < playerCount ? seed1 : null;
    const p2 = seed2 < playerCount ? seed2 : null;
    matches.push({
      round: 1,
      position: i,
      bracketType: "winners",
      team1Index: p1,
      team2Index: p2,
      status: p1 === null || p2 === null ? "bye" : "pending",
    });
  }

  // Winners bracket subsequent rounds
  for (let r = 2; r <= wRounds; r++) {
    const cnt = bracketSize / Math.pow(2, r);
    for (let i = 0; i < cnt; i++) {
      matches.push({
        round: r,
        position: i,
        bracketType: "winners",
        team1Index: null,
        team2Index: null,
        status: "pending",
      });
    }
  }

  const lRounds = 2 * (wRounds - 1);
  const losersStart = matches.length;

  // Losers bracket
  for (let r = 1; r <= lRounds; r++) {
    const cnt = bracketSize / Math.pow(2, Math.ceil(r / 2) + 1);
    for (let i = 0; i < cnt; i++) {
      matches.push({
        round: r,
        position: i,
        bracketType: "losers",
        team1Index: null,
        team2Index: null,
        status: "pending",
      });
    }
  }

  // Grand final
  const grandFinalIndex = matches.length;
  matches.push({
    round: 1,
    position: 0,
    bracketType: "final",
    team1Index: null,
    team2Index: null,
    status: "pending",
  });

  // Wire winners bracket
  let wOffset = 0;
  for (let r = 1; r < wRounds; r++) {
    const cnt = bracketSize / Math.pow(2, r);
    const nextOffset = wOffset + cnt;
    for (let i = 0; i < cnt; i++) {
      matches[wOffset + i].nextMatchIndex = nextOffset + Math.floor(i / 2);
      matches[wOffset + i].nextMatchSlot = i % 2 === 0 ? 1 : 2;
    }
    wOffset += cnt;
  }
  matches[wOffset].nextMatchIndex = grandFinalIndex;
  matches[wOffset].nextMatchSlot = 1;

  // Wire losers bracket
  let lOffset = losersStart;
  for (let r = 1; r < lRounds; r++) {
    const cnt = bracketSize / Math.pow(2, Math.ceil(r / 2) + 1);
    const nextOffset = lOffset + cnt;
    for (let i = 0; i < cnt; i++) {
      matches[lOffset + i].nextMatchIndex = nextOffset + Math.floor(i / 2);
      matches[lOffset + i].nextMatchSlot = i % 2 === 0 ? 1 : 2;
    }
    lOffset += cnt;
  }
  matches[lOffset].nextMatchIndex = grandFinalIndex;
  matches[lOffset].nextMatchSlot = 2;

  // Wire winners R1 → losers R1
  for (let i = 0; i < bracketSize / 2; i++) {
    matches[i].loserNextMatchIndex = losersStart + Math.floor(i / 2);
    matches[i].loserNextSlot = i % 2 === 0 ? 1 : 2;
  }

  return matches;
}
