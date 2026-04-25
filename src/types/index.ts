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

export type MatchFormat = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2' | 'D1' | 'D2' | 'E' | 'F';

export interface SetScore {
  team1: number;
  team2: number;
  tiebreak?: { team1: number; team2: number };
  superTiebreak?: boolean;
}

export interface Tournament {
  id: string;
  slug: string;
  adminToken: string;
  name: string;
  description: string | null;
  format: TournamentFormat;
  status: TournamentStatus;
  matchFormat: string;
  thirdPlace: boolean;
  groupCount: number | null;
  advanceCount: number | null;
  courtCount: number | null;
  isPublic: boolean;
  registrationOpen: boolean;
  createdAt: Date;
  updatedAt: Date;
  players?: Player[];
  matches?: Match[];
}

export interface Registration {
  id: string;
  tournamentId: string;
  player1Name: string;
  player2Name: string;
  teamName: string | null;
  contact: string | null;
  status: "pending" | "approved" | "rejected";
  createdAt: Date;
}

export interface Player {
  id: string;
  name: string;
  player1Name: string;
  player2Name: string;
  seed: number | null;
  checkedIn: boolean;
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
  scheduledAt: Date | null;
  court: string | null;
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
  matchFormat?: string;
  thirdPlace?: boolean;
  groupCount?: number;
  advanceCount?: number;
}
