export type TournamentFormat =
  | "single_elimination"
  | "double_elimination"
  | "round_robin"
  | "groups_knockout";

export type TournamentStatus = "draft" | "in_progress" | "completed";

export type MatchStatus = "pending" | "in_progress" | "completed" | "bye";

export type BracketType =
  | "winners"
  | "losers"
  | "final"
  | "group"
  | "third_place";

export interface SetScore {
  team1: number;
  team2: number;
}

export interface Tournament {
  id: string;
  slug: string;
  adminToken: string;
  name: string;
  description: string | null;
  format: TournamentFormat;
  status: TournamentStatus;
  setsToWin: number;
  pointsPerSet: number;
  thirdPlace: boolean;
  groupCount: number | null;
  advanceCount: number | null;
  createdAt: Date;
  updatedAt: Date;
  players?: Player[];
  matches?: Match[];
}

export interface Player {
  id: string;
  name: string;
  seed: number | null;
  tournamentId: string;
  groupIndex: number | null;
}

export interface Match {
  id: string;
  tournamentId: string;
  round: number;
  position: number;
  bracketType: BracketType;
  groupIndex: number | null;
  team1Id: string | null;
  team1?: Player | null;
  team2Id: string | null;
  team2?: Player | null;
  winnerId: string | null;
  winner?: Player | null;
  scores: string | null;
  status: MatchStatus;
  nextMatchId: string | null;
  nextMatchSlot: number | null;
  loserNextMatchId: string | null;
  loserNextSlot: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTournamentInput {
  name: string;
  description?: string;
  format: TournamentFormat;
  setsToWin: number;
  pointsPerSet: number;
  thirdPlace?: boolean;
  groupCount?: number;
  advanceCount?: number;
}
