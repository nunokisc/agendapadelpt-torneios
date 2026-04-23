import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateUniqueSlug } from "@/lib/slug";
import { createTournamentSchema } from "@/lib/validators";
import { nanoid } from "nanoid";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = createTournamentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const slug = await generateUniqueSlug(data.name);
    const adminToken = nanoid(24);

    const tournament = await prisma.tournament.create({
      data: {
        slug,
        adminToken,
        name: data.name,
        description: data.description ?? null,
        format: data.format,
        setsToWin: data.setsToWin,
        pointsPerSet: data.pointsPerSet,
        thirdPlace: data.thirdPlace ?? false,
        groupCount: data.groupCount ?? null,
        advanceCount: data.advanceCount ?? null,
      },
    });

    const publicUrl = `/tournament/${slug}`;
    const adminUrl = `/tournament/${slug}?token=${adminToken}`;

    return NextResponse.json(
      { tournament, adminToken, publicUrl, adminUrl },
      { status: 201 }
    );
  } catch (err) {
    console.error("[POST /api/tournament]", err);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
