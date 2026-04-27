export type TournamentFormat =
  | "single_elimination"
  | "double_elimination"
  | "round_robin"
  | "groups_knockout"
  | "fpp_auto";

export type TournamentMode = "manual" | "fpp_auto";

export type TournamentStatus = "draft" | "in_progress" | "completed";
export type CategoryStatus = "draft" | "in_progress" | "completed";

export type MatchStatus = "pending" | "in_progress" | "completed" | "bye";

export type BracketType =
  | "winners"
  | "losers"
  | "final"
  | "group"
  | "third_place";

// FFT formats
// FPP formats (PRO=D1, PROPO=D2, M3S=B1, M3SPO=B2, M3=A1, M3PO=A2)
export type MatchFormat =
  | 'PRO' | 'PROPO' | 'M3S' | 'M3SPO' | 'M3' | 'M3PO'
  | 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2' | 'D1' | 'D2' | 'E' | 'F';

export interface SetScore {
  team1: number;
  team2: number;
  tiebreak?: { team1: number; team2: number };
  superTiebreak?: boolean;
}

export interface Category {
  id: string;
  tournamentId: string;
  code: string;
  name: string;
  matchFormat: string | null;
  starPoint: boolean;
  status: CategoryStatus;
  order: number;
  groupCount: number | null;
  advanceCount: number | null;
  format: string | null;
  createdAt: Date;
  updatedAt: Date;
  players?: Player[];
  matches?: Match[];
  registrations?: Registration[];
}

export interface Tournament {
  id: string;
  slug: string;
  adminToken: string;
  name: string;
  description: string | null;
  format: TournamentFormat;
  status: TournamentStatus;
  tournamentMode: TournamentMode;
  matchFormat: string;
  starPoint: boolean;
  thirdPlace: boolean;
  groupCount: number | null;
  advanceCount: number | null;
  courtCount: number | null;
  slotMinutes: number | null;
  scheduleDays: string | null;
  isPublic: boolean;
  registrationOpen: boolean;
  createdAt: Date;
  updatedAt: Date;
  categories?: Category[];
  players?: Player[];
  matches?: Match[];
}

export interface Registration {
  id: string;
  tournamentId: string;
  categoryId: string | null;
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
  categoryId: string | null;
  groupIndex: number | null;
}

export interface Match {
  id: string;
  tournamentId: string;
  categoryId: string | null;
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
  startedAt: Date | null;
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
  tournamentMode?: TournamentMode;
  matchFormat?: string;
  starPoint?: boolean;
  thirdPlace?: boolean;
  groupCount?: number;
  advanceCount?: number;
  categories?: string[];
}
