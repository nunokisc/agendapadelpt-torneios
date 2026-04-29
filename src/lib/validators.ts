import { z } from "zod";

export const createTournamentSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres").max(100),
  description: z.string().max(500).optional(),
  format: z.enum([
    "single_elimination",
    "double_elimination",
    "round_robin",
    "groups_knockout",
    "fpp_auto",
  ]),
  tournamentMode: z.enum(["manual", "fpp_auto"]).optional().default("manual"),
  matchFormat: z.enum(['PRO', 'PROPO', 'M3S', 'M3SPO', 'M3', 'M3PO', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'D1', 'D2', 'E', 'F']).default('M3SPO'),
  thirdPlace: z.boolean().optional().default(false),
  starPoint: z.boolean().optional().default(false),
  groupCount: z.number().int().min(2).max(8).optional(),
  advanceCount: z.number().int().min(1).max(4).optional(),
  courtCount: z.number().int().min(1).max(99).optional().default(1),
  categories: z.array(z.string().min(1).max(20)).min(1).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida (YYYY-MM-DD)").optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida (YYYY-MM-DD)").optional(),
  slotMinutes: z.number().int().min(15).max(240).optional(),
});

export const addTeamSchema = z.object({
  player1: z.string().min(1, "Nome do jogador 1 é obrigatório").max(60),
  player2: z.string().min(1, "Nome do jogador 2 é obrigatório").max(60),
  teamName: z.string().max(60).optional(),
});

export const addPlayersSchema = z.union([
  addTeamSchema,
  z.object({ teams: z.array(addTeamSchema).min(1).max(32) }),
]);

export const scoreSchema = z.object({
  scores: z.array(
    z.object({
      team1: z.number().int().min(0),
      team2: z.number().int().min(0),
      tiebreak: z.object({
        team1: z.number().int().min(0),
        team2: z.number().int().min(0),
      }).optional(),
      superTiebreak: z.boolean().optional(),
    })
  ).min(1),
});
