/**
 * Seed script for visual demo data.
 * Run with: npx tsx scripts/seed-demo.ts
 *
 * Creates 6 tournaments in different formats and states:
 *   /tournament/demo-rascunho?token=admin-rascunho
 *   /tournament/demo-eliminacao?token=admin-eliminacao
 *   /tournament/demo-eliminacao-concluido?token=admin-concluido
 *   /tournament/demo-roundrobin?token=admin-roundrobin
 *   /tournament/demo-grupos?token=admin-grupos
 *   /tournament/demo-dupla?token=admin-dupla
 */

import path from "path";
import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import {
  generateSingleElimination,
  generateRoundRobin,
  generateGroupsKnockout,
  generateDoubleElimination,
} from "../src/lib/bracket-engine";
import { computeGroupStandings } from "../src/lib/standings";

const dbPath = path.resolve(process.cwd(), "prisma/dev.db");
const prisma = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: dbPath }) });

// ─── helpers ────────────────────────────────────────────────────────────────

async function wipeDemo() {
  const slugs = [
    "demo-rascunho", "demo-eliminacao", "demo-eliminacao-concluido",
    "demo-roundrobin", "demo-grupos", "demo-dupla",
  ];
  for (const slug of slugs) {
    const t = await prisma.tournament.findUnique({ where: { slug } });
    if (t) {
      await prisma.match.deleteMany({ where: { tournamentId: t.id } });
      await prisma.player.deleteMany({ where: { tournamentId: t.id } });
      await prisma.tournament.delete({ where: { slug } });
    }
  }
}

async function createTournament(data: {
  slug: string; adminToken: string; name: string; description?: string;
  format: string; matchFormat: string; thirdPlace?: boolean;
  groupCount?: number; advanceCount?: number; status?: string;
}) {
  return prisma.tournament.create({
    data: {
      slug: data.slug, adminToken: data.adminToken, name: data.name,
      description: data.description ?? null, format: data.format,
      matchFormat: data.matchFormat, thirdPlace: data.thirdPlace ?? false,
      groupCount: data.groupCount ?? null, advanceCount: data.advanceCount ?? null,
      status: data.status ?? "draft",
    },
  });
}

async function createPlayers(tournamentId: string, names: string[]) {
  const players = [];
  for (let i = 0; i < names.length; i++) {
    const p = await prisma.player.create({
      data: { tournamentId, name: names[i], seed: i + 1 },
    });
    players.push(p);
  }
  return players;
}

type MatchInput = ReturnType<typeof generateSingleElimination>[number];

async function createMatches(
  tournamentId: string,
  inputs: MatchInput[],
  players: { id: string }[]
) {
  const created = [];
  for (const m of inputs) {
    const match = await prisma.match.create({
      data: {
        tournamentId,
        round: m.round, position: m.position, bracketType: m.bracketType,
        groupIndex: m.groupIndex ?? null,
        team1Id: m.team1Index != null ? (players[m.team1Index]?.id ?? null) : null,
        team2Id: m.team2Index != null ? (players[m.team2Index]?.id ?? null) : null,
        status: m.status,
      },
    });
    created.push(match);
  }
  // Wire nextMatchId / loserNextMatchId
  for (let i = 0; i < inputs.length; i++) {
    const m = inputs[i];
    const updates: Record<string, string | number | null> = {};
    if (m.nextMatchIndex != null) {
      updates.nextMatchId = created[m.nextMatchIndex].id;
      updates.nextMatchSlot = m.nextMatchSlot ?? null;
    }
    if (m.loserNextMatchIndex != null) {
      updates.loserNextMatchId = created[m.loserNextMatchIndex].id;
      updates.loserNextSlot = m.loserNextSlot ?? null;
    }
    if (Object.keys(updates).length > 0) {
      await prisma.match.update({ where: { id: created[i].id }, data: updates });
    }
  }
  // Auto-advance byes
  for (const m of inputs) {
    if (m.status !== "bye") continue;
    const winner = m.team1Index != null ? players[m.team1Index]
      : m.team2Index != null ? players[m.team2Index] : null;
    if (winner && m.nextMatchIndex != null) {
      const slot = m.nextMatchSlot === 2 ? "team2Id" : "team1Id";
      await prisma.match.update({
        where: { id: created[m.nextMatchIndex].id },
        data: { [slot]: winner.id },
      });
    }
  }
  return created;
}

async function submitResult(
  matchId: string, winnerId: string, loserId: string | null,
  scores: object, nextMatchId: string | null, nextMatchSlot: number | null,
  loserNextMatchId: string | null, loserNextSlot: number | null
) {
  await prisma.match.update({
    where: { id: matchId },
    data: { scores: JSON.stringify(scores), winnerId, status: "completed" },
  });
  if (nextMatchId && nextMatchSlot) {
    const slot = nextMatchSlot === 2 ? "team2Id" : "team1Id";
    await prisma.match.update({ where: { id: nextMatchId }, data: { [slot]: winnerId } });
  }
  if (loserNextMatchId && loserId && loserNextSlot) {
    const slot = loserNextSlot === 2 ? "team2Id" : "team1Id";
    await prisma.match.update({ where: { id: loserNextMatchId }, data: { [slot]: loserId } });
  }
}

// ─── Tournament 1: Draft – SE 8 jogadores ───────────────────────────────────
async function seedDraft() {
  const t = await createTournament({
    slug: "demo-rascunho", adminToken: "admin-rascunho",
    name: "Demo — Rascunho", description: "Torneio ainda em configuração, sem bracket gerado.",
    format: "single_elimination", matchFormat: "B1",
  });
  await createPlayers(t.id, [
    "Nuno Cardoso", "João Silva", "Miguel Costa", "Pedro Ferreira",
    "Rui Santos", "André Oliveira", "Luís Pereira", "Carlos Rodrigues",
  ]);
  console.log("✓ Demo Rascunho criado → /tournament/demo-rascunho?token=admin-rascunho");
}

// ─── Tournament 2: SE 8 jogadores – meias-finais em jogo ───────────────────
async function seedSingleEliminationInProgress() {
  const t = await createTournament({
    slug: "demo-eliminacao", adminToken: "admin-eliminacao",
    name: "Demo — Eliminação Simples (em curso)",
    description: "QFs concluídas, meias-finais a decorrer.",
    format: "single_elimination", matchFormat: "B1",
    thirdPlace: true, status: "in_progress",
  });
  const players = await createPlayers(t.id, [
    "Nuno Cardoso", "João Silva", "Miguel Costa", "Pedro Ferreira",
    "Rui Santos", "André Oliveira", "Luís Pereira", "Carlos Rodrigues",
  ]);
  const inputs = generateSingleElimination(8, true);
  const matches = await createMatches(t.id, inputs, players);

  // Submit all QF results (round 1)
  const qfResults = [
    { winner: 0, loser: 7, scores: [{ team1: 6, team2: 4 }, { team1: 7, team2: 5 }] },
    { winner: 4, loser: 3, scores: [{ team1: 6, team2: 3 }, { team1: 6, team2: 4 }] },
    { winner: 1, loser: 6, scores: [{ team1: 6, team2: 2 }, { team1: 6, team2: 1 }] },
    { winner: 2, loser: 5, scores: [{ team1: 4, team2: 6 }, { team1: 6, team2: 3 }, { team1: 10, team2: 8 }] },
  ];
  for (let i = 0; i < 4; i++) {
    const r = qfResults[i];
    const m = matches[i];
    const nextM = m.nextMatchId ? matches.find(x => x.id === m.nextMatchId) : null;
    await submitResult(
      m.id, players[r.winner].id, players[r.loser].id, r.scores,
      m.nextMatchId, m.nextMatchSlot,
      m.loserNextMatchId ?? null, m.loserNextSlot ?? null
    );
  }
  console.log("✓ Demo SE em curso → /tournament/demo-eliminacao?token=admin-eliminacao");
}

// ─── Tournament 3: SE 4 jogadores – Concluído com vencedor ─────────────────
async function seedSingleEliminationCompleted() {
  const t = await createTournament({
    slug: "demo-eliminacao-concluido", adminToken: "admin-concluido",
    name: "Demo — Eliminação Simples (concluído)",
    description: "Torneio completo com vencedor e resultado de 3.º lugar.",
    format: "single_elimination", matchFormat: "B1",
    thirdPlace: true, status: "in_progress",
  });
  const players = await createPlayers(t.id, [
    "Nuno Cardoso", "João Silva", "Miguel Costa", "Pedro Ferreira",
  ]);
  const inputs = generateSingleElimination(4, true);
  const matches = await createMatches(t.id, inputs, players);

  // SF 1: Nuno (p0) beats João (p1) → final slot1, João → 3rd slot1
  const sf1 = matches[0];
  await submitResult(
    sf1.id, players[0].id, players[1].id,
    [{ team1: 6, team2: 4 }, { team1: 6, team2: 3 }],
    sf1.nextMatchId, sf1.nextMatchSlot, sf1.loserNextMatchId ?? null, sf1.loserNextSlot ?? null
  );
  // SF 2: Pedro (p3) beats Miguel (p2) → final slot2, Miguel → 3rd slot2
  const sf2 = matches[1];
  await submitResult(
    sf2.id, players[3].id, players[2].id,
    [{ team1: 7, team2: 5 }, { team1: 6, team2: 4 }],
    sf2.nextMatchId, sf2.nextMatchSlot, sf2.loserNextMatchId ?? null, sf2.loserNextSlot ?? null
  );
  // Final: Nuno beats Pedro
  const final = matches[2];
  await submitResult(
    final.id, players[0].id, players[3].id,
    [{ team1: 6, team2: 3 }, { team1: 4, team2: 6 }, { team1: 10, team2: 7 }],
    null, null, null, null
  );
  // 3rd place: João beats Miguel
  const thirdPlace = matches[3];
  await submitResult(
    thirdPlace.id, players[1].id, players[2].id,
    [{ team1: 6, team2: 4 }, { team1: 6, team2: 3 }],
    null, null, null, null
  );
  await prisma.tournament.update({ where: { id: t.id }, data: { status: "completed" } });
  console.log("✓ Demo SE concluído → /tournament/demo-eliminacao-concluido?token=admin-concluido");
}

// ─── Tournament 4: Round Robin 5 jogadores – em curso ──────────────────────
async function seedRoundRobin() {
  const t = await createTournament({
    slug: "demo-roundrobin", adminToken: "admin-roundrobin",
    name: "Demo — Round Robin (em curso)",
    description: "5 jogadores, todos contra todos. Algumas rondas já jogadas.",
    format: "round_robin", matchFormat: "C1", status: "in_progress",
  });
  const players = await createPlayers(t.id, [
    "Nuno Cardoso", "João Silva", "Miguel Costa", "Pedro Ferreira", "Rui Santos",
  ]);
  const inputs = generateRoundRobin(5);
  const matches = await createMatches(t.id, inputs, players);

  // Submit rounds 1 and 2
  const results: Array<{ team1Wins: boolean; scores: object }> = [
    { team1Wins: true,  scores: [{ team1: 4, team2: 2 }, { team1: 4, team2: 1 }] },
    { team1Wins: false, scores: [{ team1: 2, team2: 4 }, { team1: 3, team2: 4 }] },
    { team1Wins: true,  scores: [{ team1: 4, team2: 0 }, { team1: 4, team2: 2 }] },
    { team1Wins: true,  scores: [{ team1: 4, team2: 3 }, { team1: 4, team2: 1 }] },
    { team1Wins: false, scores: [{ team1: 1, team2: 4 }, { team1: 2, team2: 4 }] },
    { team1Wins: true,  scores: [{ team1: 4, team2: 2 }, { team1: 2, team2: 4 }, { team1: 10, team2: 7 }] },
  ];

  const playableMatches = matches.filter((m) => m.status !== "bye");
  for (let i = 0; i < Math.min(results.length, playableMatches.length); i++) {
    const m = playableMatches[i];
    const r = results[i];
    const reloaded = await prisma.match.findUnique({ where: { id: m.id } });
    if (!reloaded?.team1Id || !reloaded?.team2Id) continue;
    const winnerId = r.team1Wins ? reloaded.team1Id : reloaded.team2Id;
    const loserId = r.team1Wins ? reloaded.team2Id : reloaded.team1Id;
    await submitResult(m.id, winnerId, loserId, r.scores, null, null, null, null);
  }
  console.log("✓ Demo Round Robin → /tournament/demo-roundrobin?token=admin-roundrobin");
}

// ─── Tournament 5: Grupos + Eliminação 8 jogadores – grupos a decorrer ─────
async function seedGroupsKnockout() {
  const t = await createTournament({
    slug: "demo-grupos", adminToken: "admin-grupos",
    name: "Demo — Grupos + Eliminação (em curso)",
    description: "8 jogadores em 2 grupos de 4. Fase de grupos em curso.",
    format: "groups_knockout", matchFormat: "B1",
    groupCount: 2, advanceCount: 2, status: "in_progress",
  });
  const players = await createPlayers(t.id, [
    "Nuno Cardoso", "João Silva", "Miguel Costa", "Pedro Ferreira",
    "Rui Santos", "André Oliveira", "Luís Pereira", "Carlos Rodrigues",
  ]);
  const { groupMatches } = generateGroupsKnockout(8, 2);
  const matches = await createMatches(t.id, groupMatches, players);

  // Submit group A matches (first half) partially
  const groupAMatches = matches.filter(
    (_, i) => groupMatches[i].groupIndex === 0 && groupMatches[i].status !== "bye"
  );
  const groupAResults = [
    { team1Wins: true,  scores: [{ team1: 6, team2: 3 }, { team1: 6, team2: 4 }] },
    { team1Wins: false, scores: [{ team1: 3, team2: 6 }, { team1: 4, team2: 6 }] },
    { team1Wins: true,  scores: [{ team1: 6, team2: 2 }, { team1: 6, team2: 1 }] },
  ];
  for (let i = 0; i < Math.min(groupAResults.length, groupAMatches.length); i++) {
    const m = groupAMatches[i];
    const r = groupAResults[i];
    const reloaded = await prisma.match.findUnique({ where: { id: m.id } });
    if (!reloaded?.team1Id || !reloaded?.team2Id) continue;
    const winnerId = r.team1Wins ? reloaded.team1Id : reloaded.team2Id;
    const loserId = r.team1Wins ? reloaded.team2Id : reloaded.team1Id;
    await submitResult(m.id, winnerId, loserId, r.scores, null, null, null, null);
  }
  console.log("✓ Demo Grupos+Eliminação → /tournament/demo-grupos?token=admin-grupos");
}

// ─── Tournament 6: Dupla Eliminação 8 jogadores – em curso ─────────────────
async function seedDoubleElimination() {
  const t = await createTournament({
    slug: "demo-dupla", adminToken: "admin-dupla",
    name: "Demo — Dupla Eliminação (em curso)",
    description: "8 jogadores. Ronda 1 do winners bracket concluída.",
    format: "double_elimination", matchFormat: "B1", status: "in_progress",
  });
  const players = await createPlayers(t.id, [
    "Nuno Cardoso", "João Silva", "Miguel Costa", "Pedro Ferreira",
    "Rui Santos", "André Oliveira", "Luís Pereira", "Carlos Rodrigues",
  ]);
  const inputs = generateDoubleElimination(8);
  const matches = await createMatches(t.id, inputs, players);

  // Submit all R1 winners bracket results
  const r1Winners = matches.filter((_, i) => inputs[i].bracketType === "winners" && inputs[i].round === 1);
  const r1Results = [
    { team1Wins: true,  scores: [{ team1: 6, team2: 4 }, { team1: 6, team2: 3 }] },
    { team1Wins: true,  scores: [{ team1: 6, team2: 2 }, { team1: 6, team2: 1 }] },
    { team1Wins: false, scores: [{ team1: 3, team2: 6 }, { team1: 4, team2: 6 }] },
    { team1Wins: true,  scores: [{ team1: 6, team2: 3 }, { team1: 6, team2: 4 }] },
  ];
  for (let i = 0; i < r1Winners.length; i++) {
    const m = r1Winners[i];
    const r = r1Results[i];
    const reloaded = await prisma.match.findUnique({ where: { id: m.id } });
    if (!reloaded?.team1Id || !reloaded?.team2Id) continue;
    const winnerId = r.team1Wins ? reloaded.team1Id : reloaded.team2Id;
    const loserId = r.team1Wins ? reloaded.team2Id : reloaded.team1Id;
    await submitResult(
      m.id, winnerId, loserId, r.scores,
      reloaded.nextMatchId, reloaded.nextMatchSlot,
      reloaded.loserNextMatchId, reloaded.loserNextSlot
    );
  }
  console.log("✓ Demo Dupla Eliminação → /tournament/demo-dupla?token=admin-dupla");
}

// ─── Main ───────────────────────────────────────────────────────────────────
async function main() {
  console.log("A limpar dados de demo anteriores...");
  await wipeDemo();
  console.log("A criar torneios de demonstração...\n");

  await seedDraft();
  await seedSingleEliminationInProgress();
  await seedSingleEliminationCompleted();
  await seedRoundRobin();
  await seedGroupsKnockout();
  await seedDoubleElimination();

  console.log("\n✅ Seed completo. Acede a /tournament/[slug]?token=[token] para testar.");
  console.log("\nLinks rápidos:");
  console.log("  Rascunho:         /tournament/demo-rascunho?token=admin-rascunho");
  console.log("  SE em curso:      /tournament/demo-eliminacao?token=admin-eliminacao");
  console.log("  SE concluído:     /tournament/demo-eliminacao-concluido?token=admin-concluido");
  console.log("  Round Robin:      /tournament/demo-roundrobin?token=admin-roundrobin");
  console.log("  Grupos+Knockout:  /tournament/demo-grupos?token=admin-grupos");
  console.log("  Dupla Eliminação: /tournament/demo-dupla?token=admin-dupla");
}

main().catch(console.error).finally(() => prisma.$disconnect());
