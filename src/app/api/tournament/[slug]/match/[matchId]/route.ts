import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { scoreSchema } from "@/lib/validators";
import { determineMatchWinner, validateScores } from "@/lib/scoring";
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
    return NextResponse.json({ error: "Jogo ainda não tem os dois jogadores" }, { status: 400 });
  }

  const body = await req.json();
  const parsed = scoreSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const scores: SetScore[] = parsed.data.scores;
  const matchFormat = (tournament.matchFormat || 'B1') as MatchFormat;

  // Validate scores using scoring rules
  const validation = validateScores(scores, matchFormat);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error ?? "Resultado inválido" }, { status: 400 });
  }

  // Determine winner using scoring logic
  const matchWinner = determineMatchWinner(scores, matchFormat);
  if (!matchWinner) {
    return NextResponse.json({ error: "Resultado ainda não tem vencedor" }, { status: 400 });
  }

  const winnerId = matchWinner === 1 ? match.team1Id : match.team2Id;
  const loserId = matchWinner === 1 ? match.team2Id : match.team1Id;

  const result = await prisma.$transaction(async (tx) => {
    const updatedMatch = await tx.match.update({
      where: { id: matchId },
      data: {
        scores: JSON.stringify(scores),
        winnerId,
        status: "completed",
      },
      include: { team1: true, team2: true, winner: true },
    });

    let nextMatch = null;

    // Propagate winner to next match
    if (match.nextMatchId) {
      const slot = match.nextMatchSlot === 2 ? "team2Id" : "team1Id";
      nextMatch = await tx.match.update({
        where: { id: match.nextMatchId },
        data: { [slot]: winnerId },
        include: { team1: true, team2: true },
      });
    }

    // Propagate loser in double elimination
    if (match.loserNextMatchId) {
      const slot = match.loserNextSlot === 2 ? "team2Id" : "team1Id";
      await tx.match.update({
        where: { id: match.loserNextMatchId },
        data: { [slot]: loserId },
      });
    }

    // Check if all matches are done → complete tournament
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

    return { match: updatedMatch, nextMatch };
  });

  return NextResponse.json(result);
}
