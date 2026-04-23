import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  generateSingleElimination,
  generateRoundRobin,
  generateGroupsKnockout,
  generateDoubleElimination,
} from "@/lib/bracket-engine";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const token = req.nextUrl.searchParams.get("token");

  const tournament = await prisma.tournament.findUnique({
    where: { slug },
    include: { players: { orderBy: { seed: "asc" } } },
  });

  if (!tournament) {
    return NextResponse.json({ error: "Torneio não encontrado" }, { status: 404 });
  }
  if (tournament.adminToken !== token) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  }
  if (tournament.status !== "draft") {
    return NextResponse.json({ error: "O bracket já foi gerado" }, { status: 400 });
  }

  const players = tournament.players;
  if (players.length < 2) {
    return NextResponse.json(
      { error: "Precisas de pelo menos 2 jogadores para gerar o bracket" },
      { status: 400 }
    );
  }

  let matchInputs: ReturnType<typeof generateSingleElimination> = [];

  switch (tournament.format) {
    case "single_elimination":
      matchInputs = generateSingleElimination(players.length, tournament.thirdPlace);
      break;
    case "double_elimination":
      matchInputs = generateDoubleElimination(players.length);
      break;
    case "round_robin":
      matchInputs = generateRoundRobin(players.length);
      break;
    case "groups_knockout": {
      const gc = tournament.groupCount ?? 2;
      const { groupMatches } = generateGroupsKnockout(players.length, gc);
      matchInputs = groupMatches;
      break;
    }
  }

  const matches = await prisma.$transaction(async (tx) => {
    const created = await Promise.all(
      matchInputs.map((m) =>
        tx.match.create({
          data: {
            tournamentId: tournament.id,
            round: m.round,
            position: m.position,
            bracketType: m.bracketType,
            groupIndex: m.groupIndex ?? null,
            team1Id: m.team1Index != null ? players[m.team1Index]?.id ?? null : null,
            team2Id: m.team2Index != null ? players[m.team2Index]?.id ?? null : null,
            status: m.status,
          },
        })
      )
    );

    // Wire nextMatchId and loserNextMatchId references
    await Promise.all(
      matchInputs.map((m, idx) => {
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

    // Auto-advance byes
    for (const m of matchInputs) {
      if (m.status !== "bye") continue;
      const winner =
        m.team1Index != null
          ? players[m.team1Index]
          : m.team2Index != null
          ? players[m.team2Index]
          : null;

      if (winner && m.nextMatchIndex != null) {
        const nextMatch = created[m.nextMatchIndex];
        const slot = m.nextMatchSlot === 2 ? "team2Id" : "team1Id";
        await tx.match.update({
          where: { id: nextMatch.id },
          data: { [slot]: winner.id },
        });
      }
    }

    await tx.tournament.update({
      where: { id: tournament.id },
      data: { status: "in_progress" },
    });

    return created;
  });

  return NextResponse.json({ matches }, { status: 201 });
}
