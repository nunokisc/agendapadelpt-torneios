import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const ADMIN_TOKEN = process.env.PLATFORM_ADMIN_TOKEN ?? "padel-admin-2025";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (token !== ADMIN_TOKEN) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const tournaments = await prisma.tournament.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { players: true, matches: true, registrations: true } },
      matches: { select: { status: true, scheduledAt: true, updatedAt: true } },
    },
  });

  // Compute platform-wide stats
  const totalMatches = tournaments.reduce((acc, t) => acc + t.matches.length, 0);
  const completedMatches = tournaments.reduce(
    (acc, t) => acc + t.matches.filter((m) => m.status === "completed").length, 0
  );
  const pendingMatches = tournaments.reduce(
    (acc, t) => acc + t.matches.filter((m) => m.status === "pending" || m.status === "in_progress").length, 0
  );
  const pendingRegistrations = tournaments.reduce(
    (acc, t) => acc + t._count.registrations, 0
  );

  // Strip match details from response (only needed for stats computation)
  const tournamentsClean = tournaments.map(({ matches, ...rest }) => ({
    ...rest,
    matchesCompleted: matches.filter((m) => m.status === "completed").length,
    matchesPending: matches.filter((m) => m.status === "pending" || m.status === "in_progress").length,
    matchesBye: matches.filter((m) => m.status === "bye").length,
  }));

  return NextResponse.json({
    tournaments: tournamentsClean,
    stats: {
      totalTournaments: tournaments.length,
      totalMatches,
      completedMatches,
      pendingMatches,
      pendingRegistrations,
      byStatus: {
        draft: tournaments.filter((t) => t.status === "draft").length,
        in_progress: tournaments.filter((t) => t.status === "in_progress").length,
        completed: tournaments.filter((t) => t.status === "completed").length,
      },
    },
  });
}
