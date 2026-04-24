import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { scoreSchema } from "@/lib/validators";
import { determineMatchWinner, validateScores } from "@/lib/scoring";
import { generateSingleElimination } from "@/lib/bracket-engine";
import { computeGroupStandings } from "@/lib/standings";
import type { SetScore, MatchFormat } from "@/types";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; matchId: string }> }
) {
  const { slug, matchId } = await params;
  const token = req.nextUrl.searchParams.get("token");

  const tournament = await prisma.tournament.findUnique({ where: { slug } });
  if (!tournament) {
    return NextResponse.json({ error: "Torneio não encontrado" }, { status: 404 });
  }
  if (tournament.adminToken !== token) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  }

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: { team1: true, team2: true },
  });

  if (!match || match.tournamentId !== tournament.id) {
    return NextResponse.json({ error: "Jogo não encontrado" }, { status: 404 });
  }
  if (!match.team1Id || !match.team2Id) {
    return NextResponse.json({ error: "Jogo ainda não tem as duas equipas" }, { status: 400 });
  }

  const body = await req.json();
  const parsed = scoreSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const scores: SetScore[] = parsed.data.scores;
  const matchFormat = (tournament.matchFormat || "B1") as MatchFormat;

  const validation = validateScores(scores, matchFormat);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error ?? "Resultado inválido" }, { status: 400 });
  }

  const matchWinner = determineMatchWinner(scores, matchFormat);
  if (!matchWinner) {
    return NextResponse.json({ error: "Resultado ainda não tem vencedor" }, { status: 400 });
  }

  const winnerId = matchWinner === 1 ? match.team1Id : match.team2Id;
  const loserId = matchWinner === 1 ? match.team2Id : match.team1Id;

  const result = await prisma.$transaction(async (tx) => {
    // 1. Save the result
    const updatedMatch = await tx.match.update({
      where: { id: matchId },
      data: { scores: JSON.stringify(scores), winnerId, status: "completed" },
      include: { team1: true, team2: true, winner: true },
    });

    // 2. Propagate winner to next knockout match
    if (match.nextMatchId) {
      const slot = match.nextMatchSlot === 2 ? "team2Id" : "team1Id";
      await tx.match.update({
        where: { id: match.nextMatchId },
        data: { [slot]: winnerId },
      });
    }

    // 3. Propagate loser (double elimination)
    if (match.loserNextMatchId) {
      const slot = match.loserNextSlot === 2 ? "team2Id" : "team1Id";
      await tx.match.update({
        where: { id: match.loserNextMatchId },
        data: { [slot]: loserId },
      });
    }

    // 4. For groups_knockout: when all group matches finish, auto-generate knockout bracket
    if (tournament.format === "groups_knockout" && match.bracketType === "group") {
      const allGroupMatches = await tx.match.findMany({
        where: { tournamentId: tournament.id, bracketType: "group" },
        select: { status: true, team1Id: true, team2Id: true, winnerId: true, scores: true, groupIndex: true },
      });

      const allGroupDone = allGroupMatches.every(
        (m) => m.status === "completed" || m.status === "bye"
      );

      if (allGroupDone) {
        const knockoutCount = await tx.match.count({
          where: { tournamentId: tournament.id, bracketType: { not: "group" } },
        });

        if (knockoutCount === 0) {
          const groupCount = tournament.groupCount ?? 2;
          const advanceCount = tournament.advanceCount ?? 2;

          // Compute standings per group and collect advancing players
          // Seeding order: G0-1st, G1-1st, ..., G0-2nd, G1-2nd, ...
          const advancingByPosition: string[][] = Array.from({ length: advanceCount }, () => []);

          for (let g = 0; g < groupCount; g++) {
            const gMatches = allGroupMatches.filter((m) => m.groupIndex === g);
            const seen = new Set<string>();
            const playerIds: string[] = [];
            for (const m of gMatches) {
              if (m.team1Id && !seen.has(m.team1Id)) { seen.add(m.team1Id); playerIds.push(m.team1Id); }
              if (m.team2Id && !seen.has(m.team2Id)) { seen.add(m.team2Id); playerIds.push(m.team2Id); }
            }
            const standings = computeGroupStandings(gMatches, playerIds);
            for (let pos = 0; pos < advanceCount; pos++) {
              if (standings[pos]) advancingByPosition[pos].push(standings[pos].playerId);
            }
          }

          // Flatten: 1sts first, then 2nds, etc.
          const advancingPlayers = advancingByPosition.flat();

          // Generate single elimination knockout bracket
          const knockoutInputs = generateSingleElimination(advancingPlayers.length, false);

          const created = await Promise.all(
            knockoutInputs.map((m) =>
              tx.match.create({
                data: {
                  tournamentId: tournament.id,
                  round: m.round,
                  position: m.position,
                  bracketType: m.bracketType,
                  groupIndex: null,
                  team1Id: m.team1Index != null ? (advancingPlayers[m.team1Index] ?? null) : null,
                  team2Id: m.team2Index != null ? (advancingPlayers[m.team2Index] ?? null) : null,
                  status: m.status,
                },
              })
            )
          );

          // Wire nextMatchId references
          await Promise.all(
            knockoutInputs.map((m, idx) => {
              const updates: Record<string, string | number | null> = {};
              if (m.nextMatchIndex != null) {
                updates.nextMatchId = created[m.nextMatchIndex].id;
                updates.nextMatchSlot = m.nextMatchSlot ?? null;
              }
              if (m.loserNextMatchIndex != null) {
                updates.loserNextMatchId = created[m.loserNextMatchIndex].id;
                updates.loserNextSlot = m.loserNextSlot ?? null;
              }
              if (Object.keys(updates).length === 0) return Promise.resolve();
              return tx.match.update({ where: { id: created[idx].id }, data: updates });
            })
          );

          // Auto-advance byes in knockout
          for (const m of knockoutInputs) {
            if (m.status !== "bye") continue;
            const byeWinner =
              m.team1Index != null
                ? advancingPlayers[m.team1Index]
                : m.team2Index != null
                ? advancingPlayers[m.team2Index]
                : null;
            if (byeWinner && m.nextMatchIndex != null) {
              const slot = m.nextMatchSlot === 2 ? "team2Id" : "team1Id";
              await tx.match.update({
                where: { id: created[m.nextMatchIndex].id },
                data: { [slot]: byeWinner },
              });
            }
          }
        }
      }
    }

    // 5. Check if all matches are done → complete tournament
    const remaining = await tx.match.count({
      where: {
        tournamentId: tournament.id,
        status: { in: ["pending", "in_progress"] },
      },
    });
    if (remaining === 0) {
      await tx.tournament.update({
        where: { id: tournament.id },
        data: { status: "completed" },
      });
    }

    return { match: updatedMatch };
  });

  return NextResponse.json(result);
}
