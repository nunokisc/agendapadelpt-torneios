export interface TeamPair {
  player1: string;
  player2: string;
}

/**
 * Parse a block of text into player pairs.
 *
 * Supported formats (mixed in the same input):
 *   "João Silva / Maria Santos"   — slash-separated on one line
 *   "João Silva - Maria Santos"   — dash-separated on one line
 *   alternating lines:
 *     "João Silva\nMaria Santos"  — two consecutive bare names treated as one pair
 */
export function parseBulkText(text: string): TeamPair[] {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const raw: { player1: string; player2: string | null }[] = [];

  for (const line of lines) {
    const slashIdx = line.indexOf("/");
    const dashIdx = line.indexOf(" - ");

    if (slashIdx !== -1) {
      const p1 = line.slice(0, slashIdx).trim();
      const p2 = line.slice(slashIdx + 1).trim();
      if (p1 && p2) { raw.push({ player1: p1, player2: p2 }); continue; }
    }

    if (dashIdx !== -1) {
      const p1 = line.slice(0, dashIdx).trim();
      const p2 = line.slice(dashIdx + 3).trim();
      if (p1 && p2) { raw.push({ player1: p1, player2: p2 }); continue; }
    }

    // Bare name — will be paired with the next bare name
    raw.push({ player1: line, player2: null });
  }

  // Pair up consecutive bare-name entries
  const result: TeamPair[] = [];
  let i = 0;
  while (i < raw.length) {
    const entry = raw[i];
    if (entry.player2 !== null) {
      result.push({ player1: entry.player1, player2: entry.player2 });
      i++;
    } else if (i + 1 < raw.length && raw[i + 1].player2 === null) {
      result.push({ player1: entry.player1, player2: raw[i + 1].player1 });
      i += 2;
    } else {
      // Lone bare name with no pair — skip
      i++;
    }
  }

  return result;
}
