/**
 * FPP automatic format determination per category.
 * Returns matchFormat AND bracket system type based on number of registered pairs,
 * following the FPP regulation Annex XIX table.
 *
 * Distinct from getFPPConfig (fpp-bracket.ts) which only determines bracket
 * structure for the legacy fpp_auto tournament format.
 */

export type FppSystemType =
  | "round_robin"
  | "groups_knockout"
  | "single_elimination";

export interface FppFormatResult {
  matchFormat: string;
  systemType: FppSystemType;
  groupCount?: number;
  advanceCount?: number;
  description: string;
}

export function getFppFormatForCategory(numPairs: number): FppFormatResult {
  if (numPairs <= 3)  return { matchFormat: "PROPO", systemType: "round_robin",       description: "Round Robin" };
  if (numPairs === 4) return { matchFormat: "PROPO", systemType: "groups_knockout", groupCount: 1, advanceCount: 2, description: "1 Grupo de 4 + Final" };
  if (numPairs === 5) return { matchFormat: "PROPO", systemType: "groups_knockout", groupCount: 1, advanceCount: 2, description: "1 Grupo de 5 + Final" };
  if (numPairs === 6) return { matchFormat: "M3SPO", systemType: "groups_knockout", groupCount: 2, advanceCount: 2, description: "2 Grupos de 3 + Meias + Final" };
  if (numPairs === 7) return { matchFormat: "M3SPO", systemType: "groups_knockout", groupCount: 2, advanceCount: 2, description: "2 Grupos (3+4) + Meias + Final" };
  if (numPairs === 8) return { matchFormat: "M3SPO", systemType: "groups_knockout", groupCount: 2, advanceCount: 2, description: "2 Grupos de 4 + Meias + Final" };
  if (numPairs === 9) return { matchFormat: "M3SPO", systemType: "groups_knockout", groupCount: 3, advanceCount: 2, description: "3 Grupos de 3 + Quartos + Final" };
  if (numPairs === 10) return { matchFormat: "M3SPO", systemType: "groups_knockout", groupCount: 3, advanceCount: 2, description: "3 Grupos (3+3+4) + Quartos + Final" };
  if (numPairs === 11) return { matchFormat: "M3SPO", systemType: "groups_knockout", groupCount: 3, advanceCount: 2, description: "3 Grupos (3+4+4) + Quartos + Final" };
  if (numPairs <= 16) return { matchFormat: "M3SPO", systemType: "single_elimination", description: "Quadro Directo com CS" };
  if (numPairs <= 32) return { matchFormat: "M3SPO", systemType: "single_elimination", description: "Quadro com 8 CS" };
  return               { matchFormat: "M3SPO", systemType: "single_elimination", description: "Quadro com 16 CS" };
}
