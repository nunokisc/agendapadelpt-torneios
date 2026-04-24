import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const tournaments = await prisma.tournament.findMany({
    where: { isPublic: true },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { players: true, matches: true } } },
  });

  return NextResponse.json({ tournaments });
}
