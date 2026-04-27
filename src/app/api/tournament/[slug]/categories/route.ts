import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { extractAdminToken } from "@/lib/auth-server";
import { FPP_CATEGORIES_BY_CODE } from "@/lib/categories";

// GET — list categories (public)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const tournament = await prisma.tournament.findUnique({ where: { slug } });
  if (!tournament) return NextResponse.json({ error: "Torneio não encontrado" }, { status: 404 });

  const categories = await prisma.category.findMany({
    where: { tournamentId: tournament.id },
    orderBy: { order: "asc" },
  });

  return NextResponse.json({ categories });
}

const addCategoriesSchema = z.object({
  codes: z.array(z.string().min(1).max(20)).min(1),
});

// POST — add categories (admin)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const token = extractAdminToken(req, slug);

  const tournament = await prisma.tournament.findUnique({ where: { slug } });
  if (!tournament) return NextResponse.json({ error: "Torneio não encontrado" }, { status: 404 });
  if (tournament.adminToken !== token) return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  if (tournament.status !== "draft") return NextResponse.json({ error: "Torneio já em progresso" }, { status: 400 });

  const body = await req.json();
  const parsed = addCategoriesSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const existing = await prisma.category.findMany({
    where: { tournamentId: tournament.id },
    select: { code: true, order: true },
    orderBy: { order: "asc" },
  });
  const existingCodes = new Set(existing.map((c) => c.code));
  const maxOrder = existing.length > 0 ? Math.max(...existing.map((c) => c.order)) : -1;

  const newCodes = parsed.data.codes.filter((code) => !existingCodes.has(code));
  if (newCodes.length === 0) {
    return NextResponse.json({ categories: [] });
  }

  const categories = await prisma.$transaction(
    newCodes.map((code, idx) => {
      const info = FPP_CATEGORIES_BY_CODE[code];
      const name = info?.name ?? code;
      return prisma.category.create({
        data: {
          tournamentId: tournament.id,
          code,
          name,
          matchFormat: tournament.tournamentMode === "fpp_auto" ? null : tournament.matchFormat,
          starPoint: tournament.starPoint,
          order: maxOrder + 1 + idx,
        },
      });
    })
  );

  return NextResponse.json({ categories }, { status: 201 });
}
