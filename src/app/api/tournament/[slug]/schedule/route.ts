import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { extractAdminToken } from "@/lib/auth-server";

const scheduleSchema = z.object({
  matchId: z.string(),
  court: z.string().max(50).nullable().optional(),
  scheduledAt: z.string().datetime().nullable().optional(),
});

// Bulk auto-assign: distribute matches across courts within day time windows
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
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const token = extractAdminToken(req, slug);

  const tournament = await prisma.tournament.findUnique({ where: { slug } });
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

  const updated = await prisma.match.update({
    where: { id: matchId },
    data: {
      court: court !== undefined ? court : match.court,
      scheduledAt: scheduledAt !== undefined ? (scheduledAt ? new Date(scheduledAt) : null) : match.scheduledAt,
    },
  });

  return NextResponse.json({ match: updated });
}

// POST: auto-schedule all matches across available courts
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const token = extractAdminToken(req, slug);

  const tournament = await prisma.tournament.findUnique({
    where: { slug },
    include: {
      matches: {
        where: { status: { notIn: ["bye", "completed", "in_progress"] } },
        orderBy: [{ round: "asc" }, { position: "asc" }],
      },
    },
  });
  if (!tournament) return NextResponse.json({ error: "Torneio não encontrado" }, { status: 404 });
  if (tournament.adminToken !== token) return NextResponse.json({ error: "Não autorizado" }, { status: 403 });

  const body = await req.json();
  const parsed = autoScheduleSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const courts = tournament.courtCount ?? 1;
  const { days, minutesPerMatch } = parsed.data;
  const msPerMatch = minutesPerMatch * 60 * 1000;

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

  // Phase ordering: group stage must come entirely before knockout phases.
  // Round numbers restart at 1 per bracketType, so we sort by phase first.
  const PHASE_ORDER: Record<string, number> = {
    group: 0,
    winners: 1,
    losers: 2,
    third_place: 3,
    final: 4,
  };

  // Flatten matches: phase → round → groupIndex → position
  const allMatches = [...tournament.matches].sort((a, b) => {
    const pa = PHASE_ORDER[a.bracketType] ?? 99;
    const pb = PHASE_ORDER[b.bracketType] ?? 99;
    if (pa !== pb) return pa - pb;
    if (a.round !== b.round) return a.round - b.round;
    const ga = a.groupIndex ?? 0;
    const gb = b.groupIndex ?? 0;
    if (ga !== gb) return ga - gb;
    return a.position - b.position;
  });

  // ── Per-court pointer initialisation ──────────────────────────────────────
  // Find the latest occupied end time on each court among already-completed /
  // in-progress matches so that newly-scheduled slots start AFTER them.
  const existingScheduled = await prisma.match.findMany({
    where: {
      tournamentId: tournament.id,
      scheduledAt: { not: null },
      status: { in: ["completed", "in_progress"] },
    },
    select: { court: true, scheduledAt: true },
  });

  const courtLastEndMs: Record<string, number> = {};
  for (const em of existingScheduled) {
    if (!em.court || !em.scheduledAt) continue;
    const endMs = em.scheduledAt.getTime() + msPerMatch;
    if (!courtLastEndMs[em.court] || endMs > courtLastEndMs[em.court]) {
      courtLastEndMs[em.court] = endMs;
    }
  }

  // Default start = day 0 start; push forward per court if existing matches exist
  const [y0, m0, d0] = daySlots[0].date.split("-").map(Number);
  const day0StartMs = new Date(y0, m0 - 1, d0, daySlots[0].startHour, daySlots[0].startMin).getTime();

  const courtNextFreeMs: Record<string, number> = {};
  for (let c = 1; c <= courts; c++) {
    const name = `Campo ${c}`;
    courtNextFreeMs[name] = Math.max(day0StartMs, courtLastEndMs[name] ?? 0);
  }

  // Returns the first slot-boundary time within daySlots that is >= notBeforeMs,
  // or null if all day windows are exhausted.
  function nextSlotAfter(notBeforeMs: number): Date | null {
    for (const d of daySlots) {
      const [year, month, day] = d.date.split("-").map(Number);
      const dayStartMs = new Date(year, month - 1, day, d.startHour, d.startMin).getTime();
      const dayEndMs = dayStartMs + d.slots * msPerMatch;

      if (notBeforeMs >= dayEndMs) continue; // this entire day is already past

      // Round up to the next whole slot boundary within this day
      const slotOffset = Math.max(0, Math.ceil((notBeforeMs - dayStartMs) / msPerMatch));
      if (slotOffset < d.slots) {
        return new Date(dayStartMs + slotOffset * msPerMatch);
      }
    }
    return null; // all windows exhausted
  }

  const updates: { id: string; court: string; scheduledAt: Date }[] = [];

  allMatches.forEach((m, i) => {
    const courtName = `Campo ${(i % courts) + 1}`;
    const scheduledAt = nextSlotAfter(courtNextFreeMs[courtName]);
    if (!scheduledAt) return; // overflows all day windows — skip

    courtNextFreeMs[courtName] = scheduledAt.getTime() + msPerMatch;
    updates.push({ id: m.id, court: courtName, scheduledAt });
  });

  await prisma.$transaction([
    // Persist schedule config on tournament for delay-push use
    prisma.tournament.update({
      where: { id: tournament.id },
      data: {
        slotMinutes: minutesPerMatch,
        scheduleDays: JSON.stringify(days),
      },
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
