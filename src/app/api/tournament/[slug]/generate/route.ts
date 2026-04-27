import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  generateSingleElimination,
  generateRoundRobin,
  generateGroupsKnockout,
  generateDoubleElimination,
} from "@/lib/bracket-engine";
import { getFPPConfig } from "@/lib/fpp-bracket";
import { getFppFormatForCategory } from "@/lib/fpp-format";
import { broadcastUpdate } from "@/lib/sse";
import { extractAdminToken } from "@/lib/auth-server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const token = extractAdminToken(req, slug);

  const body = await req.json().catch(() => ({}));
  const requestedCategoryId: string | null = body.categoryId ?? null;

  const tournament = await prisma.tournament.findUnique({
    where: { slug },
    include: { categories: { orderBy: { order: "asc" } } },
  });

  if (!tournament) return NextResponse.json({ error: "Torneio não encontrado" }, { status: 404 });
  if (tournament.adminToken !== token) return NextResponse.json({ error: "Não autorizado" }, { status: 403 });

  // Resolve which category to generate
  const category = requestedCategoryId
    ? tournament.categories.find((c) => c.id === requestedCategoryId) ?? null
    : tournament.categories[0] ?? null;

  if (!category) return NextResponse.json({ error: "Categoria não encontrada" }, { status: 404 });
  if (category.status !== "draft") return NextResponse.json({ error: "O bracket desta categoria já foi gerado" }, { status: 400 });

  // Get checked-in players for this category
  const players = await prisma.player.findMany({
    where: { tournamentId: tournament.id, categoryId: category.id, checkedIn: true },
    orderBy: { seed: "asc" },
  });

  if (players.length < 2) {
    return NextResponse.json(
      { error: "Precisas de pelo menos 2 duplas confirmadas para gerar o bracket" },
      { status: 400 }
    );
  }

  let matchInputs: ReturnType<typeof generateSingleElimination> = [];
  let catGroupCount: number | null = null;
  let catAdvanceCount: number | null = null;
  let catFormat: string = category.format ?? tournament.format;
  let catMatchFormat: string | null = category.matchFormat;

  if (tournament.tournamentMode === "fpp_auto") {
    // FPP auto: determine both matchFormat and bracket structure from FPP table
    const fppResult = getFppFormatForCategory(players.length);
    catMatchFormat = fppResult.matchFormat;
    catFormat = fppResult.systemType === "round_robin"
      ? "round_robin"
      : fppResult.systemType === "groups_knockout"
      ? "groups_knockout"
      : "single_elimination";

    if (fppResult.systemType === "round_robin") {
      matchInputs = generateRoundRobin(players.length);
    } else if (fppResult.systemType === "groups_knockout" && fppResult.groupCount) {
      const { groupMatches } = generateGroupsKnockout(players.length, fppResult.groupCount);
      matchInputs = groupMatches;
      catGroupCount = fppResult.groupCount;
      catAdvanceCount = fppResult.advanceCount ?? 2;
    } else {
      matchInputs = generateSingleElimination(players.length, tournament.thirdPlace);
    }
  } else {
    // Manual mode: use the category's (or tournament's) format
    const effectiveFormat = (category.format ?? tournament.format) as string;
    switch (effectiveFormat) {
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
        const gc = category.groupCount ?? tournament.groupCount ?? 2;
        const { groupMatches } = generateGroupsKnockout(players.length, gc);
        matchInputs = groupMatches;
        catGroupCount = gc;
        catAdvanceCount = category.advanceCount ?? tournament.advanceCount ?? 2;
        break;
      }
      case "fpp_auto": {
        const config = getFPPConfig(players.length);
        if (config.isDirectElimination) {
          matchInputs = generateSingleElimination(players.length, tournament.thirdPlace);
          catFormat = "single_elimination";
        } else {
          const { groupMatches } = generateGroupsKnockout(players.length, config.groupCount);
          matchInputs = groupMatches;
          catGroupCount = config.groupCount;
          catAdvanceCount = config.advanceCount;
          catFormat = "groups_knockout";
        }
        break;
      }
      default:
        matchInputs = generateSingleElimination(players.length, tournament.thirdPlace);
    }
  }

  const matches = await prisma.$transaction(async (tx) => {
    const created = await Promise.all(
      matchInputs.map((m) =>
        tx.match.create({
          data: {
            tournamentId: tournament.id,
            categoryId: category!.id,
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

    // Wire nextMatchId and loserNextMatchId
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
        m.team1Index != null ? players[m.team1Index]
        : m.team2Index != null ? players[m.team2Index]
        : null;
      if (winner && m.nextMatchIndex != null) {
        const slot = m.nextMatchSlot === 2 ? "team2Id" : "team1Id";
        await tx.match.update({
          where: { id: created[m.nextMatchIndex].id },
          data: { [slot]: winner.id },
        });
      }
    }

    // Update category status + format info
    await tx.category.update({
      where: { id: category!.id },
      data: {
        status: "in_progress",
        format: catFormat,
        matchFormat: catMatchFormat ?? category!.matchFormat,
        ...(catGroupCount !== null && { groupCount: catGroupCount }),
        ...(catAdvanceCount !== null && { advanceCount: catAdvanceCount }),
      },
    });

    // Update tournament status if still draft
    if (tournament.status === "draft") {
      await tx.tournament.update({
        where: { id: tournament.id },
        data: { status: "in_progress" },
      });
    }

    // For backward compat: keep tournament-level groupCount/advanceCount for single-category tournaments
    if (catGroupCount !== null && tournament.categories.length === 1) {
      await tx.tournament.update({
        where: { id: tournament.id },
        data: {
          groupCount: catGroupCount,
          advanceCount: catAdvanceCount,
        },
      });
    }

    return created;
  });

  broadcastUpdate(tournament.id, "bracket_generated", { slug, categoryId: category.id });

  return NextResponse.json({ matches }, { status: 201 });
}
