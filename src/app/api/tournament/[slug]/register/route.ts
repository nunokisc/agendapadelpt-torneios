import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { extractAdminToken } from "@/lib/auth-server";

const registerSchema = z.object({
  player1: z.string().min(1).max(60),
  player2: z.string().min(1).max(60),
  teamName: z.string().max(60).optional(),
  contact: z.string().max(100).optional(),
  categoryId: z.string().optional(),
});

// Public: submit registration
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const tournament = await prisma.tournament.findUnique({
    where: { slug },
    include: { categories: { orderBy: { order: "asc" } } },
  });
  if (!tournament) return NextResponse.json({ error: "Torneio não encontrado" }, { status: 404 });
  if (!tournament.registrationOpen) return NextResponse.json({ error: "Inscrições fechadas" }, { status: 403 });
  if (tournament.status !== "draft") return NextResponse.json({ error: "Torneio já em progresso" }, { status: 400 });

  const body = await req.json();
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const { player1, player2, teamName, contact, categoryId } = parsed.data;

  // Resolve category: if tournament has only one category, use it automatically
  let resolvedCategoryId: string | null = null;
  if (tournament.categories.length === 1) {
    resolvedCategoryId = tournament.categories[0].id;
  } else if (categoryId) {
    const cat = tournament.categories.find((c) => c.id === categoryId);
    if (!cat) return NextResponse.json({ error: "Categoria inválida" }, { status: 400 });
    resolvedCategoryId = cat.id;
  } else if (tournament.categories.length > 1) {
    return NextResponse.json({ error: "Indica a série para a inscrição" }, { status: 400 });
  }

  const registration = await prisma.registration.create({
    data: {
      tournamentId: tournament.id,
      categoryId: resolvedCategoryId,
      player1Name: player1.trim(),
      player2Name: player2.trim(),
      teamName: teamName?.trim() || null,
      contact: contact?.trim() || null,
    },
  });

  return NextResponse.json({ registration }, { status: 201 });
}

// Admin: list registrations
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const token = extractAdminToken(req, slug);

  const tournament = await prisma.tournament.findUnique({ where: { slug } });
  if (!tournament) return NextResponse.json({ error: "Torneio não encontrado" }, { status: 404 });
  if (tournament.adminToken !== token) return NextResponse.json({ error: "Não autorizado" }, { status: 403 });

  const registrations = await prisma.registration.findMany({
    where: { tournamentId: tournament.id },
    orderBy: { createdAt: "asc" },
    include: { category: true },
  });

  return NextResponse.json({ registrations });
}

// Admin: approve, reject, or change category
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const token = extractAdminToken(req, slug);

  const tournament = await prisma.tournament.findUnique({ where: { slug } });
  if (!tournament) return NextResponse.json({ error: "Torneio não encontrado" }, { status: 404 });
  if (tournament.adminToken !== token) return NextResponse.json({ error: "Não autorizado" }, { status: 403 });

  const { registrationId, action, categoryId } = await req.json();

  if (!registrationId) return NextResponse.json({ error: "registrationId é obrigatório" }, { status: 400 });

  const reg = await prisma.registration.findUnique({ where: { id: registrationId } });
  if (!reg || reg.tournamentId !== tournament.id) {
    return NextResponse.json({ error: "Inscrição não encontrada" }, { status: 404 });
  }

  // Change category only (no action needed)
  if (!action && categoryId) {
    const cat = await prisma.category.findUnique({ where: { id: categoryId } });
    if (!cat || cat.tournamentId !== tournament.id) {
      return NextResponse.json({ error: "Categoria inválida" }, { status: 400 });
    }
    const updated = await prisma.registration.update({
      where: { id: registrationId },
      data: { categoryId },
    });
    return NextResponse.json({ registration: updated });
  }

  if (!["approve", "reject"].includes(action)) {
    return NextResponse.json({ error: "Acção inválida" }, { status: 400 });
  }

  if (action === "approve") {
    const effectiveCategoryId = categoryId ?? reg.categoryId;

    // Validate category if provided
    if (effectiveCategoryId) {
      const cat = await prisma.category.findUnique({ where: { id: effectiveCategoryId } });
      if (!cat || cat.tournamentId !== tournament.id) {
        return NextResponse.json({ error: "Categoria inválida" }, { status: 400 });
      }
    }

    const displayName = reg.teamName || `${reg.player1Name} / ${reg.player2Name}`;
    const count = await prisma.player.count({ where: { tournamentId: tournament.id } });

    await prisma.$transaction([
      prisma.player.create({
        data: {
          tournamentId: tournament.id,
          categoryId: effectiveCategoryId ?? null,
          name: displayName,
          player1Name: reg.player1Name,
          player2Name: reg.player2Name,
          seed: count + 1,
        },
      }),
      prisma.registration.update({
        where: { id: registrationId },
        data: { status: "approved" },
      }),
    ]);
  } else {
    await prisma.registration.update({
      where: { id: registrationId },
      data: { status: "rejected" },
    });
  }

  return NextResponse.json({ success: true });
}
