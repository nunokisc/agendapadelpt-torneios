import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateUniqueSlug } from "@/lib/slug";
import { nanoid } from "nanoid";

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
  if (!tournament) return NextResponse.json({ error: "Torneio não encontrado" }, { status: 404 });
  if (tournament.adminToken !== token) return NextResponse.json({ error: "Não autorizado" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const newName = body.name ?? `${tournament.name} (cópia)`;
  const newSlug = await generateUniqueSlug(newName);
  const adminToken = nanoid(24);

  const cloned = await prisma.$transaction(async (tx) => {
    const t = await tx.tournament.create({
      data: {
        slug: newSlug,
        adminToken,
        name: newName,
        description: tournament.description,
        format: tournament.format,
        matchFormat: tournament.matchFormat,
        thirdPlace: tournament.thirdPlace,
        groupCount: tournament.groupCount,
        advanceCount: tournament.advanceCount,
        courtCount: tournament.courtCount,
        status: "draft",
      },
    });

    await Promise.all(
      tournament.players.map((p) =>
        tx.player.create({
          data: {
            tournamentId: t.id,
            name: p.name,
            player1Name: p.player1Name,
            player2Name: p.player2Name,
            seed: p.seed,
          },
        })
      )
    );

    return t;
  });

  return NextResponse.json({
    tournament: cloned,
    adminUrl: `/tournament/${cloned.slug}?token=${adminToken}`,
  }, { status: 201 });
}
