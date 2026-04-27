import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateUniqueSlug } from "@/lib/slug";
import { createTournamentSchema } from "@/lib/validators";
import { FPP_CATEGORIES_BY_CODE } from "@/lib/categories";
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

    const categoryCodes = data.categories ?? ["OPEN"];

    const tournament = await prisma.$transaction(async (tx) => {
      const t = await tx.tournament.create({
        data: {
          slug,
          adminToken,
          name: data.name,
          description: data.description ?? null,
          format: data.format,
          tournamentMode: data.tournamentMode ?? "manual",
          matchFormat: data.matchFormat ?? "M3SPO",
          starPoint: data.starPoint ?? false,
          thirdPlace: data.thirdPlace ?? false,
          groupCount: data.groupCount ?? null,
          advanceCount: data.advanceCount ?? null,
        },
      });

      await Promise.all(
        categoryCodes.map((code, idx) => {
          const info = FPP_CATEGORIES_BY_CODE[code];
          const name = info?.name ?? (code === "OPEN" ? "Open" : code);
          return tx.category.create({
            data: {
              tournamentId: t.id,
              code,
              name,
              matchFormat: data.tournamentMode === "fpp_auto" ? null : (data.matchFormat ?? "M3SPO"),
              starPoint: data.starPoint ?? false,
              order: idx,
            },
          });
        })
      );

      return t;
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
