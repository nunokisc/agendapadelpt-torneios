import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { extractAdminToken } from "@/lib/auth-server";
import { broadcastUpdate } from "@/lib/sse";

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
  if (tournament.status === "draft") {
    return NextResponse.json({ error: "O torneio já está em rascunho" }, { status: 400 });
  }

  await prisma.$transaction([
    // Delete all matches
    prisma.match.deleteMany({ where: { tournamentId: tournament.id } }),
    // Reset status to draft
    prisma.tournament.update({
      where: { id: tournament.id },
      data: { status: "draft" },
    }),
  ]);

  broadcastUpdate(tournament.id, "tournament_updated", { slug, action: "reset" });

  return NextResponse.json({ success: true, message: "Bracket eliminado. Torneio voltou a rascunho." });
}
