import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

const scheduleSchema = z.object({
  matchId: z.string(),
  court: z.string().max(50).nullable().optional(),
  scheduledAt: z.string().datetime().nullable().optional(),
});

// Bulk auto-assign: distribute all pending matches across courts by round
const autoScheduleSchema = z.object({
  startTime: z.string().datetime(),
  minutesPerMatch: z.number().int().min(15).max(240).default(90),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const token = req.nextUrl.searchParams.get("token");

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
  const token = req.nextUrl.searchParams.get("token");

  const tournament = await prisma.tournament.findUnique({
    where: { slug },
    include: {
      matches: {
        where: { status: { not: "bye" } },
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
  const msPerMatch = parsed.data.minutesPerMatch * 60 * 1000;
  const start = new Date(parsed.data.startTime).getTime();

  // Group matches by round, assign time slots round by round across courts
  const rounds = new Map<number, typeof tournament.matches>();
  for (const m of tournament.matches) {
    if (!rounds.has(m.round)) rounds.set(m.round, []);
    rounds.get(m.round)!.push(m);
  }

  const updates: { id: string; court: string; scheduledAt: Date }[] = [];
  let roundStart = start;

  for (const [, roundMatches] of Array.from(rounds.entries()).sort(([a], [b]) => a - b)) {
    const slots = Math.ceil(roundMatches.length / courts);
    roundMatches.forEach((m, i) => {
      const slot = Math.floor(i / courts);
      const courtNum = (i % courts) + 1;
      updates.push({
        id: m.id,
        court: `Campo ${courtNum}`,
        scheduledAt: new Date(roundStart + slot * msPerMatch),
      });
    });
    roundStart += slots * msPerMatch;
  }

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
