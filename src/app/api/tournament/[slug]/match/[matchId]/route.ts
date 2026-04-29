import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { scoreSchema } from "@/lib/validators";
import { determineMatchWinner, validateScores } from "@/lib/scoring";
import { generateSingleElimination } from "@/lib/bracket-engine";
import { computeGroupStandings } from "@/lib/standings";
import { fppKnockoutOrder } from "@/lib/fpp-bracket";
import { broadcastUpdate } from "@/lib/sse";
import { extractAdminToken } from "@/lib/auth-server";
import type { SetScore, MatchFormat } from "@/types";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; matchId: string }> }
) {
  const { slug, matchId } = await params;
  const token = extractAdminToken(req, slug);

  const tournament = await prisma.tournament.findUnique({ where: { slug } });
  if (!tournament) return NextResponse.json({ error: "Torneio não encontrado" }, { status: 404 });
  if (tournament.adminToken !== token) return NextResponse.json({ error: "Não autorizado" }, { status: 403 });

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: { team1: true, team2: true },
  });

  if (!match || match.tournamentId !== tournament.id) {
    return NextResponse.json({ error: "Jogo não encontrado" }, { status: 404 });
  }
  if (!match.team1Id || !match.team2Id) {
    return NextResponse.json({ error: "Jogo ainda não tem as duas duplas" }, { status: 400 });
  }

  if (match.status === "completed" && match.nextMatchId) {
    const nextMatch = await prisma.match.findUnique({ where: { id: match.nextMatchId } });
    if (nextMatch && nextMatch.status === "completed") {
      return NextResponse.json({ error: "Não é possível editar: o jogo seguinte já tem resultado" }, { status: 400 });
    }
  }
  if (match.status === "completed" && match.loserNextMatchId) {
    const loserNext = await prisma.match.findUnique({ where: { id: match.loserNextMatchId } });
    if (loserNext && loserNext.status === "completed") {
      return NextResponse.json({ error: "Não é possível editar: o jogo do losers bracket seguinte já tem resultado" }, { status: 400 });
    }
  }

  // GUARD: re-editing a group match is blocked if ANY knockout match already has a result
  if (match.status === "completed" && match.bracketType === "group") {
    const catFilter = match.categoryId ? { categoryId: match.categoryId } : { tournamentId: tournament.id };
    const completedKnockout = await prisma.match.count({
      where: { ...catFilter, bracketType: { not: "group" }, status: "completed" },
    });
    if (completedKnockout > 0) {
      return NextResponse.json(
        { error: "Não é possível editar: já existem resultados no knockout" },
        { status: 400 }
      );
    }
  }

  const body = await req.json();

  // Walkover path: one team didn't show up
  let winnerId: string;
  let loserId: string;
  let matchData: Record<string, unknown>;

  if (body.walkover === "team1" || body.walkover === "team2") {
    // walkover = team that did NOT show — the OTHER team wins
    winnerId = body.walkover === "team1" ? match.team2Id! : match.team1Id!;
    loserId  = body.walkover === "team1" ? match.team1Id! : match.team2Id!;
    matchData = { scores: null, winnerId, walkover: body.walkover, status: "completed" };
  } else {
    // Normal scored result
    const parsed = scoreSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

    // Resolve matchFormat: category.matchFormat > tournament.matchFormat > default
    let resolvedMatchFormat = tournament.matchFormat || "M3SPO";
    if (match.categoryId) {
      const category = await prisma.category.findUnique({ where: { id: match.categoryId } });
      if (category?.matchFormat) resolvedMatchFormat = category.matchFormat;
    }
    const matchFormat = resolvedMatchFormat as MatchFormat;

    const scores: SetScore[] = parsed.data.scores;
    const validation = validateScores(scores, matchFormat);
    if (!validation.valid) return NextResponse.json({ error: validation.error ?? "Resultado inválido" }, { status: 400 });

    const matchWinner = determineMatchWinner(scores, matchFormat);
    if (!matchWinner) return NextResponse.json({ error: "Resultado ainda não tem vencedor" }, { status: 400 });

    winnerId = matchWinner === 1 ? match.team1Id! : match.team2Id!;
    loserId  = matchWinner === 1 ? match.team2Id! : match.team1Id!;
    matchData = { scores: JSON.stringify(scores), winnerId, walkover: null, status: "completed" };
  }

  const result = await prisma.$transaction(async (tx) => {
    // 1. Save the result
    const updatedMatch = await tx.match.update({
      where: { id: matchId },
      data: matchData,
      include: { team1: true, team2: true, winner: true },
    });

    // 1b. Delay-push: if the match had a startedAt and the court has remaining
    //     pending matches scheduled after this one, push them by the overshoot.
    if (match.startedAt && match.court && match.scheduledAt) {
      const slotMs = (tournament.slotMinutes ?? 90) * 60 * 1000;
      const actualDuration = Date.now() - new Date(match.startedAt).getTime();
      const delayMs = actualDuration - slotMs;

      if (delayMs > 0) {
        // Parse day windows for hard-stop enforcement
        type DayWindow = { date: string; startTime: string; endTime: string };
        const scheduleDays: DayWindow[] = tournament.scheduleDays
          ? (JSON.parse(tournament.scheduleDays) as DayWindow[])
          : [];

        // Build end-of-day timestamps keyed by YYYY-MM-DD
        const endOfDay: Record<string, number> = {};
        for (const d of scheduleDays) {
          const [eh, em] = d.endTime.split(":").map(Number);
          const [year, month, day] = d.date.split("-").map(Number);
          endOfDay[d.date] = new Date(year, month - 1, day, eh, em).getTime();
        }

        // Find all pending matches on the same court ordered by scheduledAt
        const courtMatches = await tx.match.findMany({
          where: {
            tournamentId: tournament.id,
            court: match.court,
            status: "pending",
            scheduledAt: { not: null, gt: match.scheduledAt },
          },
          orderBy: { scheduledAt: "asc" },
        });

        for (const cm of courtMatches) {
          const newTs = new Date(cm.scheduledAt!.getTime() + delayMs);
          const dateKey = newTs.toISOString().slice(0, 10);
          const dayEnd = endOfDay[dateKey];

          if (dayEnd && newTs.getTime() + slotMs > dayEnd) {
            // Hard stop: remove schedule, mark overflow
            await tx.match.update({
              where: { id: cm.id },
              data: { scheduledAt: null, court: null },
            });
          } else {
            await tx.match.update({
              where: { id: cm.id },
              data: { scheduledAt: newTs },
            });
          }
        }
      }
    }

    // 2. Propagate winner to next knockout match
    if (match.nextMatchId) {
      const slot = match.nextMatchSlot === 2 ? "team2Id" : "team1Id";
      await tx.match.update({ where: { id: match.nextMatchId }, data: { [slot]: winnerId } });
    }

    // 3. Propagate loser (double elimination)
    if (match.loserNextMatchId) {
      const slot = match.loserNextSlot === 2 ? "team2Id" : "team1Id";
      await tx.match.update({ where: { id: match.loserNextMatchId }, data: { [slot]: loserId } });
    }

    // 4. For groups phase: trigger knockout generation when all group matches done
    const isGroupPhase =
      (tournament.format === "groups_knockout" || tournament.format === "fpp_auto" || match.categoryId) &&
      match.bracketType === "group";

    if (isGroupPhase) {
      const categoryFilter = match.categoryId ? { categoryId: match.categoryId } : { tournamentId: tournament.id };

      const allGroupMatches = await tx.match.findMany({
        where: { ...categoryFilter, bracketType: "group" },
        select: { status: true, team1Id: true, team2Id: true, winnerId: true, scores: true, groupIndex: true },
      });

      const allGroupDone = allGroupMatches.every(
        (m) => m.status === "completed" || m.status === "bye"
      );

      if (allGroupDone) {
        const knockoutCount = await tx.match.count({
          where: { ...categoryFilter, bracketType: { not: "group" } },
        });

        // Always regenerate; delete existing knockout first if re-editing a group result
        if (knockoutCount > 0) {
          await tx.match.deleteMany({ where: { ...categoryFilter, bracketType: { not: "group" } } });
        }
        {
          // Determine group config from category or tournament
          let groupCount = tournament.groupCount ?? 2;
          let advanceCount = tournament.advanceCount ?? 2;

          if (match.categoryId) {
            const cat = await tx.category.findUnique({ where: { id: match.categoryId } });
            if (cat) {
              groupCount = cat.groupCount ?? groupCount;
              advanceCount = cat.advanceCount ?? advanceCount;
            }
          }

          const advancingByPosition: { playerId: string; groupIndex: number }[][] =
            Array.from({ length: advanceCount }, () => []);

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
              if (standings[pos]) advancingByPosition[pos].push({ playerId: standings[pos].playerId, groupIndex: g });
            }
          }

          let advancingPlayers: string[];
          if (tournament.tournamentMode === "fpp_auto" || tournament.format === "fpp_auto") {
            advancingPlayers = fppKnockoutOrder(advancingByPosition, groupCount);
          } else {
            advancingPlayers = [];
            for (let pos = 0; pos < advanceCount; pos++) {
              const group = advancingByPosition[pos];
              if (pos % 2 === 0) {
                advancingPlayers.push(...group.map((g) => g.playerId));
              } else {
                advancingPlayers.push(...[...group].reverse().map((g) => g.playerId));
              }
            }
          }

          const knockoutInputs = generateSingleElimination(advancingPlayers.length, false);
          const created = await Promise.all(
            knockoutInputs.map((m) =>
              tx.match.create({
                data: {
                  tournamentId: tournament.id,
                  categoryId: match.categoryId,
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

          for (const m of knockoutInputs) {
            if (m.status !== "bye") continue;
            const byeWinner =
              m.team1Index != null ? advancingPlayers[m.team1Index]
              : m.team2Index != null ? advancingPlayers[m.team2Index]
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

    // 5. Check if all matches in the category (or tournament) are done
    const categoryFilter = match.categoryId ? { categoryId: match.categoryId } : { tournamentId: tournament.id };

    const remaining = await tx.match.count({
      where: { ...categoryFilter, status: { in: ["pending", "in_progress"] } },
    });

    if (remaining === 0) {
      if (match.categoryId) {
        await tx.category.update({
          where: { id: match.categoryId },
          data: { status: "completed" },
        });
        // Check if all categories are done
        const incompleteCats = await tx.category.count({
          where: { tournamentId: tournament.id, status: { not: "completed" } },
        });
        if (incompleteCats === 0) {
          await tx.tournament.update({ where: { id: tournament.id }, data: { status: "completed" } });
        }
      } else {
        await tx.tournament.update({ where: { id: tournament.id }, data: { status: "completed" } });
      }
    }

    return { match: updatedMatch };
  });

  broadcastUpdate(tournament.id, "match_updated", { matchId, slug });

  return NextResponse.json(result);
}

// PATCH: mark a match as in_progress (started)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; matchId: string }> }
) {
  const { slug, matchId } = await params;
  const token = extractAdminToken(req, slug);

  const tournament = await prisma.tournament.findUnique({ where: { slug } });
  if (!tournament) return NextResponse.json({ error: "Torneio não encontrado" }, { status: 404 });
  if (tournament.adminToken !== token) return NextResponse.json({ error: "Não autorizado" }, { status: 403 });

  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match || match.tournamentId !== tournament.id) {
    return NextResponse.json({ error: "Jogo não encontrado" }, { status: 404 });
  }
  if (match.status !== "pending") {
    return NextResponse.json({ error: "Apenas jogos pendentes podem ser iniciados" }, { status: 409 });
  }
  if (!match.team1Id || !match.team2Id) {
    return NextResponse.json({ error: "As duas duplas ainda não estão definidas" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const providedAt = body.startedAt ? new Date(body.startedAt) : null;
  const startedAt = providedAt && !isNaN(providedAt.getTime()) ? providedAt : new Date();

  const updated = await prisma.match.update({
    where: { id: matchId },
    data: { status: "in_progress", startedAt },
    include: { team1: true, team2: true },
  });

  broadcastUpdate(tournament.id, "match_updated", { matchId, slug });

  return NextResponse.json({ match: updated });
}

// DELETE: reset a completed match back to pending (clears scores, winner, startedAt)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; matchId: string }> }
) {
  const { slug, matchId } = await params;
  const token = extractAdminToken(req, slug);

  const tournament = await prisma.tournament.findUnique({ where: { slug } });
  if (!tournament) return NextResponse.json({ error: "Torneio não encontrado" }, { status: 404 });
  if (tournament.adminToken !== token) return NextResponse.json({ error: "Não autorizado" }, { status: 403 });

  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match || match.tournamentId !== tournament.id) {
    return NextResponse.json({ error: "Jogo não encontrado" }, { status: 404 });
  }
  if (match.status !== "completed") {
    return NextResponse.json({ error: "Apenas jogos com resultado podem ser reposto" }, { status: 400 });
  }

  // Guard: downstream match must not be completed
  if (match.nextMatchId) {
    const nextMatch = await prisma.match.findUnique({ where: { id: match.nextMatchId } });
    if (nextMatch?.status === "completed") {
      return NextResponse.json(
        { error: "Não é possível repor: o jogo seguinte já tem resultado" },
        { status: 409 }
      );
    }
  }
  if (match.loserNextMatchId) {
    const loserNext = await prisma.match.findUnique({ where: { id: match.loserNextMatchId } });
    if (loserNext?.status === "completed") {
      return NextResponse.json(
        { error: "Não é possível repor: o jogo do bracket losers seguinte já tem resultado" },
        { status: 409 }
      );
    }
  }

  // For group match: block if any knockout match is already completed
  const catFilter = match.categoryId ? { categoryId: match.categoryId } : { tournamentId: tournament.id };
  const isGroupMatch = match.bracketType === "group";
  if (isGroupMatch) {
    const completedKnockout = await prisma.match.count({
      where: { ...catFilter, bracketType: { not: "group" }, status: "completed" },
    });
    if (completedKnockout > 0) {
      return NextResponse.json(
        { error: "Não é possível repor: já existem resultados no knockout" },
        { status: 409 }
      );
    }
  }

  await prisma.$transaction(async (tx) => {
    // Reset match to pending
    await tx.match.update({
      where: { id: matchId },
      data: { status: "pending", scores: null, winnerId: null, walkover: null, startedAt: null },
    });

    // Clear the winner slot from the next knockout match
    if (match.nextMatchId) {
      const slot = match.nextMatchSlot === 2 ? "team2Id" : "team1Id";
      await tx.match.update({ where: { id: match.nextMatchId }, data: { [slot]: null } });
    }

    // Clear the loser slot from the losers-bracket match
    if (match.loserNextMatchId) {
      const slot = match.loserNextSlot === 2 ? "team2Id" : "team1Id";
      await tx.match.update({ where: { id: match.loserNextMatchId }, data: { [slot]: null } });
    }

    // For group match: delete entire knockout bracket so it regenerates once all group matches are done again
    if (isGroupMatch) {
      await tx.match.deleteMany({ where: { ...catFilter, bracketType: { not: "group" } } });
    }

    // Reopen category/tournament if they were marked completed
    if (match.categoryId) {
      const cat = await tx.category.findUnique({ where: { id: match.categoryId }, select: { status: true } });
      if (cat?.status === "completed") {
        await tx.category.update({ where: { id: match.categoryId }, data: { status: "in_progress" } });
      }
    }
    const tourn = await tx.tournament.findUnique({ where: { id: tournament.id }, select: { status: true } });
    if (tourn?.status === "completed") {
      await tx.tournament.update({ where: { id: tournament.id }, data: { status: "in_progress" } });
    }
  });

  broadcastUpdate(tournament.id, "match_updated", { matchId, slug });
  return NextResponse.json({ success: true });
}
