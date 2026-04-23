import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import Link from "next/link";

export default async function BracketPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tournament = await prisma.tournament.findUnique({
    where: { slug },
    include: {
      players: { orderBy: { seed: "asc" } },
      matches: {
        include: { team1: true, team2: true, winner: true },
        orderBy: [{ round: "asc" }, { position: "asc" }],
      },
    },
  });

  if (!tournament) notFound();

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{tournament.name}</h1>
        <Link
          href={`/tournament/${slug}`}
          className="text-sm text-slate-400 hover:text-white transition-colors"
        >
          ← Voltar
        </Link>
      </div>
      <p className="text-slate-400 text-sm">
        Vista fullscreen disponível na próxima fase.
      </p>
    </div>
  );
}
