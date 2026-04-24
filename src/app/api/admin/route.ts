import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const ADMIN_TOKEN = process.env.PLATFORM_ADMIN_TOKEN ?? "padel-admin-2025";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (token !== ADMIN_TOKEN) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const tournaments = await prisma.tournament.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { players: true, matches: true } },
    },
  });

  return NextResponse.json({ tournaments });
}
