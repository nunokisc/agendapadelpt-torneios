export type MatchFormat =
  | 'PRO' | 'PROPO' | 'M3S' | 'M3SPO' | 'M3' | 'M3PO'
  | 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2' | 'D1' | 'D2' | 'E' | 'F';

export interface SetScore {
  team1: number;
  team2: number;
  tiebreak?: { team1: number; team2: number };
  superTiebreak?: boolean;
}

export interface SetStructure {
  type: 'normal' | 'short' | 'long' | 'superTiebreak';
  maxGames?: number;
  tiebreakAt?: number;
  tiebreakTarget?: number;
  superTiebreakTarget?: number;
  noAd?: boolean;
  conditional?: boolean;
}

export const FORMAT_LABELS: Record<MatchFormat, string> = {
  // FPP formats
  PRO:   'PRO — 1 set a 9 jogos (FPP/D1)',
  PROPO: 'PROPO — 1 set a 9 jogos No-Ad (FPP/D2)',
  M3S:   'M3S — 2 sets a 6 jogos + Super Tie-Break (FPP/B1)',
  M3SPO: 'M3SPO — 2 sets a 6 jogos No-Ad + Super Tie-Break (FPP/B2)',
  M3:    'M3 — 3 sets a 6 jogos, vantagem (FPP/A1)',
  M3PO:  'M3PO — 3 sets a 6 jogos No-Ad (FPP/A2)',
  // FFT formats
  A1: '3 sets a 6 jogos (vantagem)',
  A2: '3 sets a 6 jogos (No-Ad)',
  B1: '2 sets a 6 jogos + Super Tie-Break a 10',
  B2: '2 sets a 6 jogos (No-Ad) + Super Tie-Break a 10',
  C1: '2 sets a 4 jogos + Super Tie-Break a 10',
  C2: '2 sets a 4 jogos (No-Ad) + Super Tie-Break a 10',
  D1: '1 set a 9 jogos',
  D2: '1 set a 9 jogos (No-Ad)',
  E: 'Super Tie-Break a 10 (ultra-rápido)',
  F: '1 set a 4 jogos (No-Ad)',
};

export function getFormatStructure(format: MatchFormat): SetStructure[] {
  switch (format) {
    // FPP aliases
    case 'PRO':   return getFormatStructure('D1');
    case 'PROPO': return getFormatStructure('D2');
    case 'M3S':   return getFormatStructure('B1');
    case 'M3SPO': return getFormatStructure('B2');
    case 'M3':    return getFormatStructure('A1');
    case 'M3PO':  return getFormatStructure('A2');

    case 'A1':
      return [
        { type: 'normal', maxGames: 6, tiebreakAt: 6, tiebreakTarget: 7 },
        { type: 'normal', maxGames: 6, tiebreakAt: 6, tiebreakTarget: 7 },
        { type: 'normal', maxGames: 6, tiebreakAt: 6, tiebreakTarget: 7, conditional: true },
      ];
    case 'A2':
      return [
        { type: 'normal', maxGames: 6, tiebreakAt: 6, tiebreakTarget: 7, noAd: true },
        { type: 'normal', maxGames: 6, tiebreakAt: 6, tiebreakTarget: 7, noAd: true },
        { type: 'normal', maxGames: 6, tiebreakAt: 6, tiebreakTarget: 7, noAd: true, conditional: true },
      ];
    case 'B1':
      return [
        { type: 'normal', maxGames: 6, tiebreakAt: 6, tiebreakTarget: 7 },
        { type: 'normal', maxGames: 6, tiebreakAt: 6, tiebreakTarget: 7 },
        { type: 'superTiebreak', superTiebreakTarget: 10, conditional: true },
      ];
    case 'B2':
      return [
        { type: 'normal', maxGames: 6, tiebreakAt: 6, tiebreakTarget: 7, noAd: true },
        { type: 'normal', maxGames: 6, tiebreakAt: 6, tiebreakTarget: 7, noAd: true },
        { type: 'superTiebreak', superTiebreakTarget: 10, conditional: true },
      ];
    case 'C1':
      return [
        { type: 'short', maxGames: 4, tiebreakAt: 4, tiebreakTarget: 7 },
        { type: 'short', maxGames: 4, tiebreakAt: 4, tiebreakTarget: 7 },
        { type: 'superTiebreak', superTiebreakTarget: 10, conditional: true },
      ];
    case 'C2':
      return [
        { type: 'short', maxGames: 4, tiebreakAt: 4, tiebreakTarget: 7, noAd: true },
        { type: 'short', maxGames: 4, tiebreakAt: 4, tiebreakTarget: 7, noAd: true },
        { type: 'superTiebreak', superTiebreakTarget: 10, conditional: true },
      ];
    case 'D1':
      return [
        { type: 'long', maxGames: 9, tiebreakAt: 8, tiebreakTarget: 7 },
      ];
    case 'D2':
      return [
        { type: 'long', maxGames: 9, tiebreakAt: 8, tiebreakTarget: 7, noAd: true },
      ];
    case 'E':
      return [
        { type: 'superTiebreak', superTiebreakTarget: 10 },
      ];
    case 'F':
      return [
        { type: 'short', maxGames: 4, tiebreakAt: 3, tiebreakTarget: 7, noAd: true },
      ];
  }
}

/**
 * Determine which team won a set (1 or 2), or null if incomplete/invalid.
 */
export function determineSetWinner(set: SetScore, structure: SetStructure): 1 | 2 | null {
  const { team1, team2 } = set;

  if (structure.type === 'superTiebreak') {
    const target = structure.superTiebreakTarget ?? 10;
    return determineSTBWinner(team1, team2, target);
  }

  if (structure.type === 'normal' || structure.type === 'short') {
    const maxGames = structure.maxGames ?? 6;
    const tiebreakAt = structure.tiebreakAt ?? maxGames;
    const tiebreakTarget = structure.tiebreakTarget ?? 7;

    // Tied at tiebreakAt — tiebreak required
    if (team1 === tiebreakAt && team2 === tiebreakAt) {
      if (!set.tiebreak) return null; // tiebreak not yet entered
      const { team1: tb1, team2: tb2 } = set.tiebreak;
      return determineTBWinner(tb1, tb2, tiebreakTarget);
    }

    // Normal winning scores
    return determineRegularSetWinner(team1, team2, maxGames, tiebreakAt);
  }

  if (structure.type === 'long') {
    const tiebreakAt = structure.tiebreakAt ?? 8;
    const tiebreakTarget = structure.tiebreakTarget ?? 7;

    if (team1 === tiebreakAt && team2 === tiebreakAt) {
      if (!set.tiebreak) return null;
      const { team1: tb1, team2: tb2 } = set.tiebreak;
      return determineTBWinner(tb1, tb2, tiebreakTarget);
    }

    return determineLongSetWinner(team1, team2, tiebreakAt);
  }

  return null;
}

function determineSTBWinner(t1: number, t2: number, target: number): 1 | 2 | null {
  if (t1 >= target && t1 - t2 >= 2) return 1;
  if (t2 >= target && t2 - t1 >= 2) return 2;
  return null;
}

function determineTBWinner(t1: number, t2: number, target: number): 1 | 2 | null {
  if (t1 >= target && t1 - t2 >= 2) return 1;
  if (t2 >= target && t2 - t1 >= 2) return 2;
  return null;
}

function determineRegularSetWinner(t1: number, t2: number, maxGames: number, tiebreakAt: number): 1 | 2 | null {
  // maxGames wins with 2+ diff (e.g. 6-0..6-4 for maxGames=6)
  if (t1 === maxGames && maxGames - t2 >= 2 && t2 < tiebreakAt) return 1;
  if (t2 === maxGames && maxGames - t1 >= 2 && t1 < tiebreakAt) return 2;
  // maxGames+1 wins when other has maxGames-1 (e.g. 7-5)
  if (t1 === maxGames + 1 && t2 === maxGames - 1) return 1;
  if (t2 === maxGames + 1 && t1 === maxGames - 1) return 2;
  return null;
}

function determineLongSetWinner(t1: number, t2: number, tiebreakAt: number): 1 | 2 | null {
  // First to tiebreakAt+1 games while opponent is below tiebreakAt (e.g. 9-0..9-7)
  // At tiebreakAt-tiebreakAt (e.g. 8-8) a tiebreak is played instead
  if (t1 >= tiebreakAt + 1 && t2 < tiebreakAt) return 1;
  if (t2 >= tiebreakAt + 1 && t1 < tiebreakAt) return 2;
  return null;
}

/**
 * Determine match winner (team 1 or 2), or null if not yet decided.
 */
export function determineMatchWinner(scores: SetScore[], format: MatchFormat): 1 | 2 | null {
  const structure = getFormatStructure(format);
  const setsToWin = structure.filter((s) => !s.conditional).length;
  let t1Sets = 0;
  let t2Sets = 0;

  for (let i = 0; i < scores.length; i++) {
    const set = scores[i];
    const struct = structure[Math.min(i, structure.length - 1)];

    const winner = determineSetWinner(set, struct);
    if (winner === 1) t1Sets++;
    else if (winner === 2) t2Sets++;
  }

  if (t1Sets >= setsToWin) return 1;
  if (t2Sets >= setsToWin) return 2;
  return null;
}

/**
 * Validate a complete set of scores against the format rules.
 */
export function validateScores(scores: SetScore[], format: MatchFormat): { valid: boolean; error?: string } {
  const structure = getFormatStructure(format);

  // Determine max sets we'd expect
  const maxSets = structure.length;

  if (scores.length === 0) {
    return { valid: false, error: 'Nenhum set introduzido' };
  }
  if (scores.length > maxSets) {
    return { valid: false, error: `Demasiados sets para o formato ${format}` };
  }

  let t1Sets = 0;
  let t2Sets = 0;

  for (let i = 0; i < scores.length; i++) {
    const set = scores[i];
    const struct = structure[Math.min(i, structure.length - 1)];

    // Validate the set
    const setValidation = validateSingleSet(set, struct, i + 1);
    if (!setValidation.valid) return setValidation;

    // Check we haven't already found a winner before this set
    if (t1Sets >= 2 || t2Sets >= 2) {
      return { valid: false, error: `Set ${i + 1} é desnecessário — o vencedor já foi determinado` };
    }
    // For 3-set formats (best of 3): check if someone already won
    if ((format === 'A1' || format === 'A2' || format === 'M3' || format === 'M3PO') && i >= 2) {
      if (t1Sets >= 1 && t2Sets === 0) {
        return { valid: false, error: `Set ${i + 1} é desnecessário — o vencedor já foi determinado` };
      }
    }

    const winner = determineSetWinner(set, struct);
    if (winner === 1) t1Sets++;
    else if (winner === 2) t2Sets++;
  }

  // Final check: a side must have won the required number of sets
  const setsToWin = structure.filter((s) => !s.conditional).length;
  if (Math.max(t1Sets, t2Sets) < setsToWin) {
    return { valid: false, error: 'Resultado incompleto — o vencedor ainda não foi determinado' };
  }
  if (t1Sets === t2Sets) {
    return { valid: false, error: 'Resultado empatado — o vencedor não foi determinado' };
  }

  return { valid: true };
}

function validateSingleSet(set: SetScore, structure: SetStructure, setNum: number): { valid: boolean; error?: string } {
  const { team1, team2 } = set;

  if (team1 < 0 || team2 < 0) {
    return { valid: false, error: `Set ${setNum}: valores negativos não são permitidos` };
  }

  if (structure.type === 'superTiebreak') {
    const target = structure.superTiebreakTarget ?? 10;
    const maxVal = Math.max(team1, team2);
    const minVal = Math.min(team1, team2);
    if (maxVal < target && !(maxVal >= target - 1)) {
      // Game might still be in progress
    }
    // Valid if one side has target with 2+ lead, or it's incomplete
    if (maxVal >= target) {
      if (maxVal - minVal < 2) {
        return { valid: false, error: `Set ${setNum}: Super Tie-Break — vantagem de 2 pontos necessária` };
      }
    }
    return { valid: true };
  }

  if (structure.type === 'normal' || structure.type === 'short') {
    const maxGames = structure.maxGames ?? 6;
    const tiebreakAt = structure.tiebreakAt ?? maxGames;
    const tiebreakTarget = structure.tiebreakTarget ?? 7;

    // Tied at tiebreakAt: tiebreak must be present and valid
    if (team1 === tiebreakAt && team2 === tiebreakAt) {
      if (!set.tiebreak) {
        return { valid: false, error: `Set ${setNum}: resultado ${tiebreakAt}-${tiebreakAt} requer tie-break` };
      }
      const { team1: tb1, team2: tb2 } = set.tiebreak;
      const tbWinner = determineTBWinner(tb1, tb2, tiebreakTarget);
      if (tbWinner === null) {
        return { valid: false, error: `Set ${setNum}: tie-break inválido (${tb1}-${tb2})` };
      }
      return { valid: true };
    }

    // Standard winning scores
    const winner = determineRegularSetWinner(team1, team2, maxGames, tiebreakAt);
    if (winner === null) {
      return {
        valid: false,
        error: `Set ${setNum}: resultado ${team1}-${team2} inválido para sets a ${maxGames} jogos`,
      };
    }
    return { valid: true };
  }

  if (structure.type === 'long') {
    const tiebreakAt = structure.tiebreakAt ?? 8;
    const tiebreakTarget = structure.tiebreakTarget ?? 7;

    if (team1 === tiebreakAt && team2 === tiebreakAt) {
      if (!set.tiebreak) {
        return { valid: false, error: `Set ${setNum}: resultado ${tiebreakAt}-${tiebreakAt} requer tie-break` };
      }
      const { team1: tb1, team2: tb2 } = set.tiebreak;
      const tbWinner = determineTBWinner(tb1, tb2, tiebreakTarget);
      if (tbWinner === null) {
        return { valid: false, error: `Set ${setNum}: tie-break inválido (${tb1}-${tb2})` };
      }
      return { valid: true };
    }

    const winner = determineLongSetWinner(team1, team2, tiebreakAt);
    if (winner === null) {
      return {
        valid: false,
        error: `Set ${setNum}: resultado ${team1}-${team2} inválido para set a 9 jogos`,
      };
    }
    return { valid: true };
  }

  return { valid: true };
}
