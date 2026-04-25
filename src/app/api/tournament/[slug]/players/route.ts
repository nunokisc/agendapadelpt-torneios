import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { addPlayersSchema } from "@/lib/validators";
import { extractAdminToken } from "@/lib/auth-server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const token = extractAdminToken(req, slug);

  const tournament = await prisma.tournament.findUnique({ where: { slug } });
  if (!tournament) {
    return NextResponse.json({ error: "Torneio não encontrado" }, { status: 404 });
  }
  if (tournament.adminToken !== token) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  }
  if (tournament.status !== "draft") {
    return NextResponse.json({ error: "Torneio já em progresso" }, { status: 400 });
  }

  const body = await req.json();
  const parsed = addPlayersSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const teams =
    "teams" in parsed.data
      ? parsed.data.teams
      : [{ player1: parsed.data.player1, player2: parsed.data.player2, teamName: parsed.data.teamName }];

  const currentCount = await prisma.player.count({ where: { tournamentId: tournament.id } });

  const players = await prisma.$transaction(
    teams.map((team, i) => {
      const displayName = team.teamName?.trim() || `${team.player1.trim()} / ${team.player2.trim()}`;
      return prisma.player.create({
        data: {
          name: displayName,
          player1Name: team.player1.trim(),
          player2Name: team.player2.trim(),
          seed: currentCount + i + 1,
          tournamentId: tournament.id,
        },
      });
    })
  );

  return NextResponse.json({ players }, { status: 201 });
}

// PUT — reorder seeds
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const token = extractAdminToken(req, slug);

  const tournament = await prisma.tournament.findUnique({ where: { slug } });
  if (!tournament) {
    return NextResponse.json({ error: "Torneio não encontrado" }, { status: 404 });
  }
  if (tournament.adminToken !== token) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  }
  if (tournament.status !== "draft") {
    return NextResponse.json({ error: "Torneio já em progresso" }, { status: 400 });
  }

  const body = await req.json();
  const order: { id: string; seed: number }[] = body.order;
  if (!Array.isArray(order)) {
    return NextResponse.json({ error: "order[] é obrigatório" }, { status: 400 });
  }

  await prisma.$transaction(
    order.map(({ id, seed }) =>
      prisma.player.update({
        where: { id, tournamentId: tournament.id },
        data: { seed },
      })
    )
  );

  return NextResponse.json({ success: true });
}

// PATCH — toggle check-in status
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const token = extractAdminToken(req, slug);
  const { playerId, checkedIn } = await req.json();

  if (!playerId || typeof checkedIn !== "boolean") {
    return NextResponse.json({ error: "playerId e checkedIn são obrigatórios" }, { status: 400 });
  }

  const tournament = await prisma.tournament.findUnique({ where: { slug } });
  if (!tournament) return NextResponse.json({ error: "Torneio não encontrado" }, { status: 404 });
  if (tournament.adminToken !== token) return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  if (tournament.status !== "draft") return NextResponse.json({ error: "Torneio já em progresso" }, { status: 400 });

  const player = await prisma.player.update({
    where: { id: playerId, tournamentId: tournament.id },
    data: { checkedIn },
  });

  return NextResponse.json({ player });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const token = extractAdminToken(req, slug);
  const playerId = req.nextUrl.searchParams.get("playerId");

  if (!playerId) {
    return NextResponse.json({ error: "playerId é obrigatório" }, { status: 400 });
  }

  const tournament = await prisma.tournament.findUnique({ where: { slug } });
  if (!tournament) {
    return NextResponse.json({ error: "Torneio não encontrado" }, { status: 404 });
  }
  if (tournament.adminToken !== token) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  }
  if (tournament.status !== "draft") {
    return NextResponse.json({ error: "Torneio já em progresso" }, { status: 400 });
  }

  await prisma.player.delete({ where: { id: playerId, tournamentId: tournament.id } });

  return NextResponse.json({ success: true });
}
