import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { extractAdminToken } from "@/lib/auth-server";

const matchInclude = {
  include: { team1: true, team2: true, winner: true },
  orderBy: [{ round: "asc" as const }, { position: "asc" as const }],
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const tournament = await prisma.tournament.findUnique({
    where: { slug },
    include: {
      categories: {
        orderBy: { order: "asc" },
        include: {
          players: { orderBy: { seed: "asc" } },
          matches: matchInclude,
        },
      },
      players: { orderBy: { seed: "asc" } },
      matches: matchInclude,
    },
  });

  if (!tournament) {
    return NextResponse.json({ error: "Torneio não encontrado" }, { status: 404 });
  }

  return NextResponse.json({ tournament });
}

const patchSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  matchFormat: z.enum(["PRO","PROPO","M3S","M3SPO","M3","M3PO","A1","A2","B1","B2","C1","C2","D1","D2","E","F"]).optional(),
  thirdPlace: z.boolean().optional(),
  isPublic: z.boolean().optional(),
  registrationOpen: z.boolean().optional(),
  courtCount: z.number().int().min(1).max(20).nullable().optional(),
  status: z.enum(["draft","in_progress","completed"]).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const token = extractAdminToken(req, slug);

  const tournament = await prisma.tournament.findUnique({ where: { slug } });
  if (!tournament) return NextResponse.json({ error: "Torneio não encontrado" }, { status: 404 });
  if (tournament.adminToken !== token) return NextResponse.json({ error: "Não autorizado" }, { status: 403 });

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });

  const data: Record<string, unknown> = { ...parsed.data };
  if ("startDate" in data) {
    data.startDate = data.startDate ? new Date(data.startDate as string) : null;
  }
  if ("endDate" in data) {
    data.endDate = data.endDate ? new Date(data.endDate as string) : null;
  }
  if (tournament.status !== "draft") {
    delete data.matchFormat;
    delete data.thirdPlace;
  }

  const updated = await prisma.tournament.update({ where: { slug }, data });
  return NextResponse.json({ tournament: updated });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const token = extractAdminToken(req, slug);

  const tournament = await prisma.tournament.findUnique({ where: { slug } });
  if (!tournament) return NextResponse.json({ error: "Torneio não encontrado" }, { status: 404 });
  if (tournament.adminToken !== token) return NextResponse.json({ error: "Não autorizado" }, { status: 403 });

  const body = await req.json();
  const updated = await prisma.tournament.update({
    where: { slug },
    data: {
      name: body.name ?? tournament.name,
      description: body.description ?? tournament.description,
      status: body.status ?? tournament.status,
    },
  });

  return NextResponse.json({ tournament: updated });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const token = extractAdminToken(req, slug);

  const tournament = await prisma.tournament.findUnique({ where: { slug } });
  if (!tournament) return NextResponse.json({ error: "Torneio não encontrado" }, { status: 404 });
  if (tournament.adminToken !== token) return NextResponse.json({ error: "Não autorizado" }, { status: 403 });

  await prisma.tournament.delete({ where: { slug } });
  return NextResponse.json({ success: true });
}
