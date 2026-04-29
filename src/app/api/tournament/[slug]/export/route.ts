import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { SetScore } from "@/types";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const format = _req.nextUrl.searchParams.get("format") ?? "csv";

  const tournament = await prisma.tournament.findUnique({
    where: { slug },
    include: {
      categories: true,
      players: { orderBy: { seed: "asc" } },
      matches: {
        include: { team1: true, team2: true, winner: true },
        orderBy: [{ round: "asc" }, { position: "asc" }],
      },
    },
  });

  if (!tournament) {
    return NextResponse.json({ error: "Torneio não encontrado" }, { status: 404 });
  }

  if (format === "ical") {
    return generateICal(tournament);
  }

  return generateCSV(tournament);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function generateCSV(tournament: any) {
  const catMap = new Map<string, string>();
  for (const c of tournament.categories ?? []) {
    catMap.set(c.id, c.code);
  }

  const lines: string[] = [];
  lines.push("Série,Ronda,Posição,Tipo,Dupla 1,Dupla 2,Vencedor,Resultado,W/O,Campo,Data/Hora,Estado");

  for (const m of tournament.matches) {
    if (m.status === "bye") continue;
    const scores: SetScore[] = m.scores ? JSON.parse(m.scores) : [];
    const scoreStr = scores.map((s: SetScore) => `${s.team1}-${s.team2}`).join(" ");
    const serie = m.categoryId ? (catMap.get(m.categoryId) ?? "") : "";
    const row = [
      csvEscape(serie),
      m.round,
      m.position + 1,
      m.bracketType,
      csvEscape(m.team1?.name ?? ""),
      csvEscape(m.team2?.name ?? ""),
      csvEscape(m.winner?.name ?? ""),
      csvEscape(scoreStr),
      m.walkover ?? "",
      csvEscape(m.court ?? ""),
      m.scheduledAt ? new Date(m.scheduledAt).toISOString() : "",
      m.status,
    ].join(",");
    lines.push(row);
  }

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${tournament.slug}-resultados.csv"`,
    },
  });
}

function csvEscape(str: string): string {
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function generateICal(tournament: any) {
  const slotMs = (tournament.slotMinutes ?? 90) * 60 * 1000;

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//PadelTorneios//PT",
    `X-WR-CALNAME:${tournament.name}`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  for (const m of tournament.matches) {
    if (m.status === "bye" || !m.scheduledAt) continue;
    const start = new Date(m.scheduledAt);
    const end = new Date(start.getTime() + slotMs);

    const team1 = m.team1?.name ?? "TBD";
    const team2 = m.team2?.name ?? "TBD";
    const summary = `${team1} vs ${team2}`;
    const description = `${tournament.name} - Ronda ${m.round}${m.court ? ` - ${m.court}` : ""}`;

    lines.push("BEGIN:VEVENT");
    lines.push(`DTSTART:${formatICalDate(start)}`);
    lines.push(`DTEND:${formatICalDate(end)}`);
    lines.push(`SUMMARY:${icalEscape(summary)}`);
    lines.push(`DESCRIPTION:${icalEscape(description)}`);
    if (m.court) lines.push(`LOCATION:${icalEscape(m.court)}`);
    lines.push(`UID:${m.id}@padeltorneios`);
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");

  return new Response(lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${tournament.slug}.ics"`,
    },
  });
}

function formatICalDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function icalEscape(str: string): string {
  return str.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}
