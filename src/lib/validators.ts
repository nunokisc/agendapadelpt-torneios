import { z } from "zod";

export const createTournamentSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres").max(100),
  description: z.string().max(500).optional(),
  format: z.enum([
    "single_elimination",
    "double_elimination",
    "round_robin",
    "groups_knockout",
  ]),
  matchFormat: z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'D1', 'D2', 'E', 'F']).default('B1'),
  thirdPlace: z.boolean().optional().default(false),
  groupCount: z.number().int().min(2).max(8).optional(),
  advanceCount: z.number().int().min(1).max(4).optional(),
});

export const addPlayersSchema = z.union([
  z.object({ name: z.string().min(1).max(60) }),
  z.object({ names: z.array(z.string().min(1).max(60)).min(1).max(64) }),
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
