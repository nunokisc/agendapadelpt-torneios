import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { addPlayersSchema } from "@/lib/validators";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const token = req.nextUrl.searchParams.get("token");

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

  const names =
    "names" in parsed.data ? parsed.data.names : [parsed.data.name];

  const existingPlayers = await prisma.player.findMany({
    where: { tournamentId: tournament.id },
    select: { name: true },
  });
  const existingNames = new Set(existingPlayers.map((p) => p.name.toLowerCase()));

  const newNames = names
    .map((n) => n.trim())
    .filter((n) => n && !existingNames.has(n.toLowerCase()));

  if (newNames.length === 0) {
    return NextResponse.json({ error: "Nenhum jogador novo para adicionar" }, { status: 400 });
  }

  const currentCount = existingPlayers.length;

  const players = await prisma.$transaction(
    newNames.map((name, i) =>
      prisma.player.create({
        data: { name, seed: currentCount + i + 1, tournamentId: tournament.id },
      })
    )
  );

  return NextResponse.json({ players }, { status: 201 });
}

// PUT — reorder seeds
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const token = req.nextUrl.searchParams.get("token");

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
  // body.order = [{id: string, seed: number}]
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

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const token = req.nextUrl.searchParams.get("token");
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
