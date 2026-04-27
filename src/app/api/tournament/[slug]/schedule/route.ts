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

  // Flatten matches sorted by round then position (preserves bracket order)
  const allMatches = [...tournament.matches].sort(
    (a, b) => a.round - b.round || a.position - b.position
  );

  const updates: { id: string; court: string; scheduledAt: Date }[] = [];

  allMatches.forEach((m, i) => {
    const globalSlot = Math.floor(i / courts);
    const courtNum = (i % courts) + 1;

    // Map globalSlot to (dayIndex, slotWithinDay)
    let remaining = globalSlot;
    let targetDay: (typeof daySlots)[number] | null = null;
    let slotWithinDay = 0;
    for (const d of daySlots) {
      if (remaining < d.slots) {
        targetDay = d;
        slotWithinDay = remaining;
        break;
      }
      remaining -= d.slots;
    }

    if (!targetDay) return; // overflows all day windows — skip

    const [year, month, day] = targetDay.date.split("-").map(Number);
    const startMs = new Date(year, month - 1, day, targetDay.startHour, targetDay.startMin).getTime();
    const scheduledAt = new Date(startMs + slotWithinDay * msPerMatch);

    updates.push({ id: m.id, court: `Campo ${courtNum}`, scheduledAt });
  });

  await prisma.$transaction(
    updates.map((u) =>
      prisma.match.update({
        where: { id: u.id },
        data: { court: u.court, scheduledAt: u.scheduledAt },
      })
    )
  );

  return NextResponse.json({ updated: updates.length });
}
