import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { extractAdminToken } from "@/lib/auth-server";

const updateCategorySchema = z.object({
  matchFormat: z.string().optional(),
  starPoint: z.boolean().optional(),
  status: z.enum(["draft", "in_progress", "completed"]).optional(),
  order: z.number().int().min(0).optional(),
});

// PUT — update category (admin)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; categoryId: string }> }
) {
  const { slug, categoryId } = await params;
  const token = extractAdminToken(req, slug);

  const tournament = await prisma.tournament.findUnique({ where: { slug } });
  if (!tournament) return NextResponse.json({ error: "Torneio não encontrado" }, { status: 404 });
  if (tournament.adminToken !== token) return NextResponse.json({ error: "Não autorizado" }, { status: 403 });

  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!category || category.tournamentId !== tournament.id) {
    return NextResponse.json({ error: "Categoria não encontrada" }, { status: 404 });
  }

  const body = await req.json();
  const parsed = updateCategorySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const updated = await prisma.category.update({
    where: { id: categoryId },
    data: parsed.data,
  });

  return NextResponse.json({ category: updated });
}

// DELETE — remove category (admin, draft only, no players)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; categoryId: string }> }
) {
  const { slug, categoryId } = await params;
  const token = extractAdminToken(req, slug);

  const tournament = await prisma.tournament.findUnique({ where: { slug } });
  if (!tournament) return NextResponse.json({ error: "Torneio não encontrado" }, { status: 404 });
  if (tournament.adminToken !== token) return NextResponse.json({ error: "Não autorizado" }, { status: 403 });

  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    include: { _count: { select: { players: true } } },
  });
  if (!category || category.tournamentId !== tournament.id) {
    return NextResponse.json({ error: "Categoria não encontrada" }, { status: 404 });
  }
  if (category.status !== "draft") {
    return NextResponse.json({ error: "Só é possível remover categorias em rascunho" }, { status: 400 });
  }
  if (category._count.players > 0) {
    return NextResponse.json({ error: "Remove primeiro os jogadores desta categoria" }, { status: 400 });
  }

  // Ensure at least one category remains
  const totalCategories = await prisma.category.count({ where: { tournamentId: tournament.id } });
  if (totalCategories <= 1) {
    return NextResponse.json({ error: "O torneio deve ter pelo menos uma categoria" }, { status: 400 });
  }

  await prisma.category.delete({ where: { id: categoryId } });
  return NextResponse.json({ success: true });
}
