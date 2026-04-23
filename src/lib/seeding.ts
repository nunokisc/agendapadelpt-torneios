export function nextPowerOfTwo(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

export function standardBracketSeeding(bracketSize: number): number[] {
  if (bracketSize === 1) return [1];
  const seeds: number[] = [1, 2];
  let size = 2;
  while (size < bracketSize) {
    const next: number[] = [];
    for (const s of seeds) {
      next.push(s);
      next.push(size * 2 + 1 - s);
    }
    seeds.length = 0;
    seeds.push(...next);
    size *= 2;
  }
  return seeds;
}

export function serpentineGroupDistribution(
  playerCount: number,
  groupCount: number
): number[] {
  // Returns an array of group indices, one per player (sorted by seed 1..N)
  const groups: number[] = new Array(playerCount);
  let forward = true;
  let groupIndex = 0;

  for (let i = 0; i < playerCount; i++) {
    groups[i] = groupIndex;
    if (forward) {
      groupIndex++;
      if (groupIndex === groupCount) {
        groupIndex = groupCount - 1;
        forward = false;
      }
    } else {
      groupIndex--;
      if (groupIndex < 0) {
        groupIndex = 0;
        forward = true;
      }
    }
  }
  return groups;
}
