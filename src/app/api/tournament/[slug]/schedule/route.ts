import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { extractAdminToken } from "@/lib/auth-server";

const scheduleSchema = z.object({
  matchId: z.string(),
  court: z.string().max(50).nullable().optional(),
  scheduledAt: z.string().datetime().nullable().optional(),
});

const autoScheduleSchema = z.object({
  days: z
    .array(
      z.object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida (YYYY-MM-DD)"),
        startTime: z.string().regex(/^\d{2}:\d{2}$/, "Hora inválida (HH:MM)"),
        endTime: z.string().regex(/^\d{2}:\d{2}$/, "Hora inválida (HH:MM)"),
      })
    )
    .min(1)
    .max(30),
  minutesPerMatch: z.number().int().min(15).max(240).default(90),
  // Optional: restrict scheduling to specific category IDs
  categoryIds: z.array(z.string()).optional(),
});

const resetSchema = z.object({
  // Optional: restrict reset to a specific category ID
  categoryId: z.string().optional(),
});

// PATCH: manual single-match scheduling
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const token = extractAdminToken(req, slug);

  const tournament = await prisma.tournament.findUnique({
    where: { slug },
    select: { id: true, adminToken: true, slotMinutes: true },
  });
  if (!tournament) return NextResponse.json({ error: "Torneio não encontrado" }, { status: 404 });
  if (tournament.adminToken !== token) return NextResponse.json({ error: "Não autorizado" }, { status: 403 });

  const body = await req.json();
  const parsed = scheduleSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const { matchId, court, scheduledAt } = parsed.data;

  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match || match.tournamentId !== tournament.id) {
    return NextResponse.json({ error: "Jogo não encontrado" }, { status: 404 });
  }
  if (match.status === "completed" || match.status === "in_progress") {
    return NextResponse.json({ error: "Não é possível reagendar um jogo já realizado ou em curso" }, { status: 409 });
  }

  // Server-side conflict check: verify court is free at the requested slot
  const effectiveCourt = court !== undefined ? court : match.court;
  const effectiveTime = scheduledAt !== undefined ? scheduledAt : (match.scheduledAt ? match.scheduledAt.toISOString() : null);
  if (effectiveCourt && effectiveTime) {
    const slotMs = (tournament.slotMinutes ?? 90) * 60_000;
    const newStart = new Date(effectiveTime).getTime();
    const newEnd = newStart + slotMs;
    const conflicting = await prisma.match.findFirst({
      where: {
        tournamentId: tournament.id,
        id: { not: matchId },
        court: effectiveCourt,
        scheduledAt: { not: null, lt: new Date(newEnd) },
      },
      include: { team1: true, team2: true },
    });
    if (conflicting) {
      const cStart = conflicting.scheduledAt!.getTime();
      const cEnd = cStart + slotMs;
      if (cEnd > newStart) {
        const who = `${conflicting.team1?.name ?? "?"} vs ${conflicting.team2?.name ?? "?"}`;
        return NextResponse.json(
          { error: `${effectiveCourt} já está ocupado nesse horário (${who})` },
          { status: 409 }
        );
      }
    }
  }

  const updated = await prisma.match.update({
    where: { id: matchId },
    data: {
      court: court !== undefined ? court : match.court,
      scheduledAt: scheduledAt !== undefined ? (scheduledAt ? new Date(scheduledAt) : null) : match.scheduledAt,
    },
  });

  return NextResponse.json({ match: updated });
}

// POST: auto-schedule unscheduled matches across available courts
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const token = extractAdminToken(req, slug);

  const tournament = await prisma.tournament.findUnique({
    where: { slug },
    select: { id: true, adminToken: true, courtCount: true, slotMinutes: true, scheduleDays: true },
  });
  if (!tournament) return NextResponse.json({ error: "Torneio não encontrado" }, { status: 404 });
  if (tournament.adminToken !== token) return NextResponse.json({ error: "Não autorizado" }, { status: 403 });

  const body = await req.json();
  const parsed = autoScheduleSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const { days, minutesPerMatch, categoryIds } = parsed.data;
  const courts = tournament.courtCount ?? 1;
  const msPerMatch = minutesPerMatch * 60 * 1000;

  // Fetch only pending, unscheduled matches (skip already-scheduled ones)
  const pendingMatches = await prisma.match.findMany({
    where: {
      tournamentId: tournament.id,
      status: { notIn: ["bye", "completed", "in_progress"] },
      scheduledAt: null,
      ...(categoryIds && categoryIds.length > 0 ? { categoryId: { in: categoryIds } } : {}),
    },
    orderBy: [{ round: "asc" }, { position: "asc" }],
  });

  // Pre-compute available slots per day window
  const daySlots = days
    .map((d) => {
      const [sh, sm] = d.startTime.split(":").map(Number);
      const [eh, em] = d.endTime.split(":").map(Number);
      const windowMinutes = eh * 60 + em - (sh * 60 + sm);
      const slots = Math.floor(windowMinutes / minutesPerMatch);
      return { ...d, startHour: sh, startMin: sm, slots };
    })
    .filter((d) => d.slots > 0);

  if (daySlots.length === 0) {
    return NextResponse.json({ error: "Nenhuma janela horária tem capacidade para pelo menos um jogo" }, { status: 400 });
  }

  const PHASE_ORDER: Record<string, number> = {
    group: 0, winners: 1, losers: 2, third_place: 3, final: 4,
  };

  const allMatches = [...pendingMatches].sort((a, b) => {
    const pa = PHASE_ORDER[a.bracketType] ?? 99;
    const pb = PHASE_ORDER[b.bracketType] ?? 99;
    if (pa !== pb) return pa - pb;
    if (a.round !== b.round) return a.round - b.round;
    const ga = a.groupIndex ?? 0;
    const gb = b.groupIndex ?? 0;
    if (ga !== gb) return ga - gb;
    return a.position - b.position;
  });

  // Per-court and per-team pointer: start after any already-scheduled match
  const existingScheduled = await prisma.match.findMany({
    where: {
      tournamentId: tournament.id,
      scheduledAt: { not: null },
      status: { in: ["completed", "in_progress", "pending"] },
    },
    select: { court: true, scheduledAt: true, team1Id: true, team2Id: true },
  });

  const courtLastEndMs: Record<string, number> = {};
  const teamNextFreeMs: Record<string, number> = {};

  for (const em of existingScheduled) {
    if (!em.scheduledAt) continue;
    const endMs = em.scheduledAt.getTime() + msPerMatch;
    if (em.court && endMs > (courtLastEndMs[em.court] ?? 0)) {
      courtLastEndMs[em.court] = endMs;
    }
    if (em.team1Id && endMs > (teamNextFreeMs[em.team1Id] ?? 0)) {
      teamNextFreeMs[em.team1Id] = endMs;
    }
    if (em.team2Id && endMs > (teamNextFreeMs[em.team2Id] ?? 0)) {
      teamNextFreeMs[em.team2Id] = endMs;
    }
  }

  const [y0, m0, d0] = daySlots[0].date.split("-").map(Number);
  const day0StartMs = new Date(y0, m0 - 1, d0, daySlots[0].startHour, daySlots[0].startMin).getTime();

  const courtNextFreeMs: Record<string, number> = {};
  for (let c = 1; c <= courts; c++) {
    const name = `Campo ${c}`;
    courtNextFreeMs[name] = Math.max(day0StartMs, courtLastEndMs[name] ?? 0);
  }

  function nextSlotAfter(notBeforeMs: number): Date | null {
    for (const d of daySlots) {
      const [year, month, day] = d.date.split("-").map(Number);
      const dayStartMs = new Date(year, month - 1, day, d.startHour, d.startMin).getTime();
      const dayEndMs = dayStartMs + d.slots * msPerMatch;
      if (notBeforeMs >= dayEndMs) continue;
      const slotOffset = Math.max(0, Math.ceil((notBeforeMs - dayStartMs) / msPerMatch));
      if (slotOffset < d.slots) {
        return new Date(dayStartMs + slotOffset * msPerMatch);
      }
    }
    return null;
  }

  const updates: { id: string; court: string; scheduledAt: Date }[] = [];

  allMatches.forEach((m, i) => {
    const courtName = `Campo ${(i % courts) + 1}`;

    // Earliest slot where the court AND both teams are free
    const t1Free = m.team1Id ? (teamNextFreeMs[m.team1Id] ?? 0) : 0;
    const t2Free = m.team2Id ? (teamNextFreeMs[m.team2Id] ?? 0) : 0;
    const notBefore = Math.max(courtNextFreeMs[courtName], t1Free, t2Free);

    const scheduledAt = nextSlotAfter(notBefore);
    if (!scheduledAt) return;

    const endMs = scheduledAt.getTime() + msPerMatch;
    courtNextFreeMs[courtName] = endMs;
    if (m.team1Id) teamNextFreeMs[m.team1Id] = endMs;
    if (m.team2Id) teamNextFreeMs[m.team2Id] = endMs;

    updates.push({ id: m.id, court: courtName, scheduledAt });
  });

  await prisma.$transaction([
    prisma.tournament.update({
      where: { id: tournament.id },
      data: { slotMinutes: minutesPerMatch, scheduleDays: JSON.stringify(days) },
    }),
    ...updates.map((u) =>
      prisma.match.update({
        where: { id: u.id },
        data: { court: u.court, scheduledAt: u.scheduledAt },
      })
    ),
  ]);

  return NextResponse.json({ updated: updates.length });
}

// DELETE: reset schedule (clear court + scheduledAt) for pending matches
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const token = extractAdminToken(req, slug);

  const tournament = await prisma.tournament.findUnique({ where: { slug } });
  if (!tournament) return NextResponse.json({ error: "Torneio não encontrado" }, { status: 404 });
  if (tournament.adminToken !== token) return NextResponse.json({ error: "Não autorizado" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const parsed = resetSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const result = await prisma.match.updateMany({
    where: {
      tournamentId: tournament.id,
      status: { notIn: ["completed", "in_progress", "bye"] },
      ...(parsed.data.categoryId ? { categoryId: parsed.data.categoryId } : {}),
    },
    data: { court: null, scheduledAt: null },
  });

  return NextResponse.json({ cleared: result.count });
}
