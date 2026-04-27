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
  const body = await req.json().catch(() => ({}));
  const categoryId: string | null = body.categoryId ?? null;

  const tournament = await prisma.tournament.findUnique({ where: { slug } });
  if (!tournament) return NextResponse.json({ error: "Torneio não encontrado" }, { status: 404 });
  if (tournament.adminToken !== token) return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  if (tournament.status === "draft" && !categoryId) {
    return NextResponse.json({ error: "O torneio já está em rascunho" }, { status: 400 });
  }

  if (categoryId) {
    const category = await prisma.category.findUnique({ where: { id: categoryId } });
    if (!category || category.tournamentId !== tournament.id) {
      return NextResponse.json({ error: "Categoria não encontrada" }, { status: 404 });
    }
    if (category.status === "draft") {
      return NextResponse.json({ error: "Esta categoria já está em rascunho" }, { status: 400 });
    }

    await prisma.$transaction([
      prisma.match.deleteMany({ where: { tournamentId: tournament.id, categoryId } }),
      prisma.category.update({ where: { id: categoryId }, data: { status: "draft", format: null, groupCount: null, advanceCount: null } }),
    ]);

    // If all categories are now draft, reset tournament too
    const inProgressCats = await prisma.category.count({
      where: { tournamentId: tournament.id, status: { not: "draft" } },
    });
    if (inProgressCats === 0) {
      await prisma.tournament.update({ where: { id: tournament.id }, data: { status: "draft" } });
    }
  } else {
    await prisma.$transaction([
      prisma.match.deleteMany({ where: { tournamentId: tournament.id } }),
      prisma.category.updateMany({ where: { tournamentId: tournament.id }, data: { status: "draft", format: null, groupCount: null, advanceCount: null } }),
      prisma.tournament.update({ where: { id: tournament.id }, data: { status: "draft" } }),
    ]);
  }

  broadcastUpdate(tournament.id, "tournament_updated", { slug, action: "reset" });
  return NextResponse.json({ success: true });
}
