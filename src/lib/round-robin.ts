// Returns rounds as arrays of [playerIndex, playerIndex] pairs.
// -1 represents a BYE.
export function circleMethodSchedule(playerCount: number): [number, number][][] {
  const n = playerCount % 2 === 0 ? playerCount : playerCount + 1;
  const rounds: [number, number][][] = [];

  const players = Array.from({ length: n }, (_, i) => i);

  for (let round = 0; round < n - 1; round++) {
    const pairs: [number, number][] = [];
    for (let i = 0; i < n / 2; i++) {
      const a = players[i];
      const b = players[n - 1 - i];
      // Skip pairs involving the BYE placeholder (index n-1 when odd)
      if (playerCount % 2 !== 0 && (a === n - 1 || b === n - 1)) {
        pairs.push([a === n - 1 ? b : a, -1]);
      } else {
        pairs.push([a, b]);
      }
    }
    rounds.push(pairs);

    // Rotate: fix player[0], rotate the rest
    const last = players.pop()!;
    players.splice(1, 0, last);
  }

  return rounds;
}
