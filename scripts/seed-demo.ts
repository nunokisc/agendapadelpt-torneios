/**
 * Seed script for visual demo data.
 * Run with: npx tsx scripts/seed-demo.ts
 *
 * Creates 8 tournaments showcasing all current features:
 *
 *   1. /tournament/demo-rascunho-multi?token=admin-rascunho-multi
 *      Draft multi-série FPP (M4 + F4 + +40M), inscrições abertas, check-in parcial
 *   2. /tournament/demo-fpp-auto?token=admin-fpp-auto
 *      FPP auto, 2 séries (M3 grupos+knockout + F3 grupo único), em curso
 *   3. /tournament/demo-eliminacao-concluido?token=admin-concluido
 *      Eliminação simples 8 duplas, 3.º lugar, M3SPO, agenda/campos, concluído
 *   4. /tournament/demo-roundrobin?token=admin-roundrobin
 *      Round Robin 6 duplas, M3SPO com tiebreaks, 3 rondas completas
 *   5. /tournament/demo-grupos?token=admin-grupos
 *      Grupos + Knockout 9 duplas (3 grupos de 3), M3S, grupos A+B completos, C em curso
 *   6. /tournament/demo-dupla?token=admin-dupla
 *      Dupla eliminação 8 duplas, B2 + Star Point, WR1+LR1 concluídos
 *   7. /tournament/demo-grupos-completo?token=admin-grupos-completo
 *      Grupos + Knockout 9 duplas — todos os grupos terminados, knockout SF+Final concluídos
 *   8. /tournament/demo-agenda-live?token=admin-agenda-live
 *      SE 8 duplas com auto-agenda configurada, 1 jogo em curso (startedAt)
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

const dbPath = path.resolve(process.cwd(), "prisma/dev.db");
const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: dbPath }),
});

// ─── Demo slugs ───────────────────────────────────────────────────────────────

const DEMO_SLUGS = [
  // Slugs actuais
  "demo-rascunho-multi",
  "demo-fpp-auto",
  "demo-eliminacao-concluido",
  "demo-roundrobin",
  "demo-grupos",
  "demo-dupla",
  "demo-grupos-completo",
  "demo-agenda-live",
  // Slugs legados (seed anterior) — também removidos ao correr o script
  "demo-rascunho",
  "demo-eliminacao",
];

// ─── Wipe ─────────────────────────────────────────────────────────────────────

async function wipeDemo() {
  for (const slug of DEMO_SLUGS) {
    const t = await prisma.tournament.findUnique({ where: { slug } });
    if (!t) continue;
    await prisma.registration.deleteMany({ where: { tournamentId: t.id } });
    await prisma.match.deleteMany({ where: { tournamentId: t.id } });
    await prisma.player.deleteMany({ where: { tournamentId: t.id } });
    await prisma.category.deleteMany({ where: { tournamentId: t.id } });
    await prisma.tournament.delete({ where: { id: t.id } });
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

type TData = {
  slug: string;
  adminToken: string;
  name: string;
  description?: string;
  format: string;
  tournamentMode?: string;
  matchFormat?: string;
  starPoint?: boolean;
  thirdPlace?: boolean;
  groupCount?: number;
  advanceCount?: number;
  status?: string;
  isPublic?: boolean;
  registrationOpen?: boolean;
  courtCount?: number;
};

async function createTournament(data: TData) {
  return prisma.tournament.create({
    data: {
      slug: data.slug,
      adminToken: data.adminToken,
      name: data.name,
      description: data.description ?? null,
      format: data.format,
      tournamentMode: data.tournamentMode ?? "manual",
      matchFormat: data.matchFormat ?? "M3SPO",
      starPoint: data.starPoint ?? false,
      thirdPlace: data.thirdPlace ?? false,
      groupCount: data.groupCount ?? null,
      advanceCount: data.advanceCount ?? null,
      status: data.status ?? "draft",
      isPublic: data.isPublic ?? false,
      registrationOpen: data.registrationOpen ?? false,
      courtCount: data.courtCount ?? null,
    },
  });
}

async function createCategory(
  tournamentId: string,
  data: {
    code: string;
    name: string;
    matchFormat?: string | null;
    starPoint?: boolean;
    status?: string;
    order?: number;
    format?: string | null;
    groupCount?: number | null;
    advanceCount?: number | null;
  }
) {
  return prisma.category.create({
    data: {
      tournamentId,
      code: data.code,
      name: data.name,
      matchFormat: data.matchFormat ?? null,
      starPoint: data.starPoint ?? false,
      status: data.status ?? "draft",
      order: data.order ?? 0,
      format: data.format ?? null,
      groupCount: data.groupCount ?? null,
      advanceCount: data.advanceCount ?? null,
    },
  });
}

type TeamInput = {
  player1: string;
  player2: string;
  teamName?: string;
  checkedIn?: boolean;
};

async function createPlayers(
  tournamentId: string,
  categoryId: string,
  teams: TeamInput[]
) {
  const players = [];
  for (let i = 0; i < teams.length; i++) {
    const { player1, player2, teamName, checkedIn } = teams[i];
    const name = teamName ?? `${player1} / ${player2}`;
    const p = await prisma.player.create({
      data: {
        tournamentId,
        categoryId,
        name,
        player1Name: player1,
        player2Name: player2,
        seed: i + 1,
        checkedIn: checkedIn !== false,
      },
    });
    players.push(p);
  }
  return players;
}

type MatchInput = ReturnType<typeof generateSingleElimination>[number];

async function createMatches(
  tournamentId: string,
  categoryId: string,
  inputs: MatchInput[],
  players: { id: string }[]
) {
  const created = [];
  for (const m of inputs) {
    const match = await prisma.match.create({
      data: {
        tournamentId,
        categoryId,
        round: m.round,
        position: m.position,
        bracketType: m.bracketType,
        groupIndex: m.groupIndex ?? null,
        team1Id:
          m.team1Index != null ? (players[m.team1Index]?.id ?? null) : null,
        team2Id:
          m.team2Index != null ? (players[m.team2Index]?.id ?? null) : null,
        status: m.status,
      },
    });
    created.push(match);
  }

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

  for (const m of inputs) {
    if (m.status !== "bye") continue;
    const winner =
      m.team1Index != null
        ? players[m.team1Index]
        : m.team2Index != null
        ? players[m.team2Index]
        : null;
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
  matchId: string,
  winnerId: string,
  loserId: string | null,
  scores: object,
  nextMatchId: string | null,
  nextMatchSlot: number | null,
  loserNextMatchId: string | null,
  loserNextSlot: number | null
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

function dateAt(dayOffset: number, hour: number, minute = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d;
}

// ─── 1. Draft — Multi-série FPP, inscrições abertas ──────────────────────────
//
// Mostra: tournamentMode fpp_auto, múltiplas séries (M4, F4, +40M), check-in
// parcial, inscrições pendentes/rejeitadas, sem bracket gerado.

async function seedDraftMultiSeries() {
  const t = await createTournament({
    slug: "demo-rascunho-multi",
    adminToken: "admin-rascunho-multi",
    name: "Open Porto 2026 — Multi-série FPP",
    description:
      "Torneio FPP com 3 séries. Inscrições abertas, check-in em curso. Bracket ainda não gerado.",
    format: "fpp_auto",
    tournamentMode: "fpp_auto",
    isPublic: true,
    registrationOpen: true,
    courtCount: 3,
  });

  const catM4 = await createCategory(t.id, { code: "M4", name: "Masculinos 4", order: 0 });
  await createPlayers(t.id, catM4.id, [
    { player1: "Nuno Cardoso",   player2: "João Silva",        teamName: "Cardoso / Silva",    checkedIn: true  },
    { player1: "Miguel Costa",   player2: "Pedro Ferreira",    teamName: "Costa / Ferreira",   checkedIn: true  },
    { player1: "Rui Santos",     player2: "André Oliveira",                                    checkedIn: true  },
    { player1: "Luís Pereira",   player2: "Carlos Rodrigues",                                  checkedIn: false },
    { player1: "Tiago Mendes",   player2: "Bruno Alves",                                       checkedIn: true  },
    { player1: "Ricardo Sousa",  player2: "Filipe Gomes",                                      checkedIn: false },
    { player1: "Hugo Martins",   player2: "Diogo Lopes",                                       checkedIn: true  },
  ]);

  const catF4 = await createCategory(t.id, { code: "F4", name: "Femininos 4", order: 1 });
  await createPlayers(t.id, catF4.id, [
    { player1: "Ana Soares",     player2: "Beatriz Lopes",     checkedIn: true  },
    { player1: "Carla Mendes",   player2: "Diana Costa",       checkedIn: true  },
    { player1: "Eva Rodrigues",  player2: "Filipa Santos",     checkedIn: false },
    { player1: "Graça Ferreira", player2: "Helena Oliveira",   checkedIn: true  },
    { player1: "Inês Pereira",   player2: "Joana Alves",       checkedIn: true  },
  ]);

  const catV40 = await createCategory(t.id, { code: "+40M", name: "+40 Masculinos", order: 2 });
  await createPlayers(t.id, catV40.id, [
    { player1: "António Borges",  player2: "Manuel Silva"   },
    { player1: "Luís Azevedo",    player2: "Paulo Cunha"    },
    { player1: "Fernando Matos",  player2: "Sérgio Pinto"   },
    { player1: "José Carvalho",   player2: "Ricardo Nunes"  },
  ]);

  await prisma.registration.createMany({
    data: [
      { tournamentId: t.id, categoryId: catM4.id, player1Name: "Marco Neves", player2Name: "Sérgio Pinto", status: "pending" },
      { tournamentId: t.id, categoryId: catM4.id, player1Name: "Daniel Faria", player2Name: "Rafael Costa", contact: "912 345 678", status: "pending" },
      { tournamentId: t.id, categoryId: catF4.id, player1Name: "Lúcia Monteiro", player2Name: "Marta Tavares", contact: "lm@email.pt", status: "pending" },
      { tournamentId: t.id, categoryId: catV40.id, player1Name: "Augusto Lima", player2Name: "Vítor Gomes", status: "rejected" },
    ],
  });

  console.log("✓ Demo Rascunho Multi-série → /tournament/demo-rascunho-multi?token=admin-rascunho-multi");
}

// ─── 2. FPP Automático — 2 séries em curso ────────────────────────────────────
//
// Séries M3 (8 duplas, 2 grupos de 4 + SF + Final; SF1 concluída) e
// F3 (5 duplas, 1 grupo + Final; rondas 1-3 de 5 concluídas). Matches com agenda.
//
// serpentine(8,2): Grupo 0→[p0,p3,p4,p7]  Grupo 1→[p1,p2,p5,p6]
// fppKnockoutOrder(2 grupos)=[p0,p1,p3,p2] → SE(4): SF1=(p0 vs p2), SF2=(p1 vs p3)

async function seedFppAutoInProgress() {
  const t = await createTournament({
    slug: "demo-fpp-auto",
    adminToken: "admin-fpp-auto",
    name: "Torneio FPP Automático — Em Curso",
    description:
      "Modo FPP Automático com 2 séries: M3 (8 duplas, 2 grupos + SF + Final) e F3 (5 duplas, 1 grupo + Final).",
    format: "fpp_auto",
    tournamentMode: "fpp_auto",
    status: "in_progress",
    isPublic: true,
    courtCount: 3,
  });

  // ── Série M3 ──────────────────────────────────────────────────────────────
  const catM3 = await createCategory(t.id, {
    code: "M3", name: "Masculinos 3",
    matchFormat: "M3SPO", format: "groups_knockout",
    groupCount: 2, advanceCount: 2, status: "in_progress", order: 0,
  });

  const playersM3 = await createPlayers(t.id, catM3.id, [
    { player1: "Nuno Cardoso",   player2: "João Silva",       teamName: "Cardoso / Silva"     }, // 0
    { player1: "Rui Santos",     player2: "Miguel Costa",     teamName: "Santos / Costa"      }, // 1
    { player1: "Pedro Ferreira", player2: "André Oliveira",   teamName: "Ferreira / Oliveira" }, // 2
    { player1: "Luís Pereira",   player2: "Carlos Rodrigues"                                  }, // 3
    { player1: "Tiago Mendes",   player2: "Bruno Alves"                                       }, // 4
    { player1: "Ricardo Sousa",  player2: "Filipe Gomes"                                      }, // 5
    { player1: "Hugo Martins",   player2: "Diogo Lopes"                                       }, // 6
    { player1: "Marco Neves",    player2: "Sérgio Pinto"                                      }, // 7
  ]);

  const { groupMatches: gmM3 } = generateGroupsKnockout(8, 2);
  const gMatchesM3 = await createMatches(t.id, catM3.id, gmM3, playersM3);

  const g0R = [
    { t1w: true,  s: [{ team1: 6, team2: 3 }, { team1: 6, team2: 2 }] },
    { t1w: true,  s: [{ team1: 6, team2: 4 }, { team1: 7, team2: 5 }] },
    { t1w: true,  s: [{ team1: 6, team2: 4 }, { team1: 4, team2: 6 }, { team1: 10, team2: 8, superTiebreak: true }] },
    { t1w: false, s: [{ team1: 3, team2: 6 }, { team1: 4, team2: 6 }] },
    { t1w: true,  s: [{ team1: 6, team2: 3 }, { team1: 6, team2: 4 }] },
    { t1w: true,  s: [{ team1: 6, team2: 2 }, { team1: 6, team2: 3 }] },
  ];
  const g1R = [
    { t1w: true,  s: [{ team1: 6, team2: 2 }, { team1: 6, team2: 3 }] },
    { t1w: false, s: [{ team1: 3, team2: 6 }, { team1: 4, team2: 6 }] },
    { t1w: true,  s: [{ team1: 6, team2: 4 }, { team1: 6, team2: 3 }] },
    { t1w: false, s: [{ team1: 4, team2: 6 }, { team1: 5, team2: 7 }] },
    { t1w: true,  s: [{ team1: 6, team2: 1 }, { team1: 6, team2: 2 }] },
    { t1w: true,  s: [{ team1: 7, team2: 5 }, { team1: 6, team2: 4 }] },
  ];

  const g0Real = gMatchesM3.filter((_, i) => gmM3[i].groupIndex === 0 && gmM3[i].status !== "bye");
  const g1Real = gMatchesM3.filter((_, i) => gmM3[i].groupIndex === 1 && gmM3[i].status !== "bye");

  for (let i = 0; i < g0Real.length; i++) {
    const m = await prisma.match.findUnique({ where: { id: g0Real[i].id } });
    if (!m?.team1Id || !m?.team2Id) continue;
    const r = g0R[i % g0R.length];
    const [wId, lId] = r.t1w ? [m.team1Id, m.team2Id] : [m.team2Id, m.team1Id];
    await submitResult(m.id, wId, lId, r.s, null, null, null, null);
  }
  for (let i = 0; i < g1Real.length; i++) {
    const m = await prisma.match.findUnique({ where: { id: g1Real[i].id } });
    if (!m?.team1Id || !m?.team2Id) continue;
    const r = g1R[i % g1R.length];
    const [wId, lId] = r.t1w ? [m.team1Id, m.team2Id] : [m.team2Id, m.team1Id];
    await submitResult(m.id, wId, lId, r.s, null, null, null, null);
  }

  // Knockout: fppKnockoutOrder=[p0,p1,p3,p2] → SE(4): SF1=(p0 vs p2), SF2=(p1 vs p3)
  const advM3 = [playersM3[0], playersM3[1], playersM3[3], playersM3[2]];
  const koInputs = generateSingleElimination(4, false);
  const koMatches = await createMatches(t.id, catM3.id, koInputs, advM3);

  const sf1 = await prisma.match.findUnique({ where: { id: koMatches[0].id } });
  if (sf1?.team1Id && sf1?.team2Id) {
    await submitResult(sf1.id, sf1.team1Id, sf1.team2Id,
      [{ team1: 6, team2: 4 }, { team1: 6, team2: 3 }],
      sf1.nextMatchId, sf1.nextMatchSlot, null, null);
  }

  for (let i = 0; i < gMatchesM3.length; i++) {
    await prisma.match.update({ where: { id: gMatchesM3[i].id }, data: {
      scheduledAt: dateAt(-7 + Math.floor(i / 3), 9 + (i % 3) * 2),
      court: `Campo ${(i % 3) + 1}`,
    }});
  }
  for (let i = 0; i < koMatches.length; i++) {
    await prisma.match.update({ where: { id: koMatches[i].id }, data: {
      scheduledAt: dateAt(0, 10 + i * 2),
      court: `Campo ${(i % 3) + 1}`,
    }});
  }

  // ── Série F3 — 5 duplas, 1 grupo de 5 ────────────────────────────────────
  const catF3 = await createCategory(t.id, {
    code: "F3", name: "Femininos 3",
    matchFormat: "PROPO", format: "groups_knockout",
    groupCount: 1, advanceCount: 2, status: "in_progress", order: 1,
  });

  const playersF3 = await createPlayers(t.id, catF3.id, [
    { player1: "Ana Soares",     player2: "Beatriz Lopes"   }, // 0
    { player1: "Carla Mendes",   player2: "Diana Costa"     }, // 1
    { player1: "Eva Rodrigues",  player2: "Filipa Santos"   }, // 2
    { player1: "Graça Ferreira", player2: "Helena Oliveira" }, // 3
    { player1: "Inês Pereira",   player2: "Joana Alves"     }, // 4
  ]);

  const { groupMatches: gmF3 } = generateGroupsKnockout(5, 1);
  const gMatchesF3 = await createMatches(t.id, catF3.id, gmF3, playersF3);

  const realF3 = gMatchesF3.filter((_, i) => gmF3[i].status !== "bye");
  const f3R = [
    { t1w: true,  s: [{ team1: 9, team2: 6 }] },
    { t1w: true,  s: [{ team1: 9, team2: 5 }] },
    { t1w: true,  s: [{ team1: 9, team2: 4 }] },
    { t1w: true,  s: [{ team1: 9, team2: 7 }] },
    { t1w: true,  s: [{ team1: 9, team2: 3 }] },
    { t1w: false, s: [{ team1: 4, team2: 9 }] },
  ];
  for (let i = 0; i < Math.min(6, realF3.length); i++) {
    const m = await prisma.match.findUnique({ where: { id: realF3[i].id } });
    if (!m?.team1Id || !m?.team2Id) continue;
    const r = f3R[i];
    const [wId, lId] = r.t1w ? [m.team1Id, m.team2Id] : [m.team2Id, m.team1Id];
    await submitResult(m.id, wId, lId, r.s, null, null, null, null);
  }

  for (let i = 0; i < gMatchesF3.length; i++) {
    await prisma.match.update({ where: { id: gMatchesF3[i].id }, data: {
      scheduledAt: dateAt(1, 9 + (i % 4) * 2),
      court: "Campo 3",
    }});
  }

  console.log("✓ Demo FPP Automático → /tournament/demo-fpp-auto?token=admin-fpp-auto");
}

// ─── 3. Eliminação Simples — Concluído ────────────────────────────────────────
//
// SE 8 duplas com 3.º lugar, M3SPO com STB e tiebreaks, 2 campos, concluído.
// Seeding SE(8) [1,8,4,5,2,7,3,6]: match[0]=(p0 vs p7), [1]=(p3 vs p4),
//   [2]=(p1 vs p6), [3]=(p2 vs p5). SF[4] e SF[5]. Final=[6]. 3.º=[7].

async function seedSingleEliminationCompleted() {
  const t = await createTournament({
    slug: "demo-eliminacao-concluido",
    adminToken: "admin-concluido",
    name: "Torneio Eliminação Simples — Concluído",
    description: "8 duplas. Torneio completo com vencedor e resultado de 3.º lugar. M3SPO, 2 campos.",
    format: "single_elimination",
    matchFormat: "M3SPO",
    thirdPlace: true,
    status: "in_progress",
    isPublic: true,
    courtCount: 2,
  });

  const catOpen = await createCategory(t.id, {
    code: "OPEN", name: "Open",
    matchFormat: "M3SPO", format: "single_elimination",
    status: "in_progress", order: 0,
  });

  const players = await createPlayers(t.id, catOpen.id, [
    { player1: "Nuno Cardoso",   player2: "João Silva",      teamName: "Cardoso / Silva"    }, // 0 seed 1
    { player1: "Rui Santos",     player2: "André Oliveira",  teamName: "Santos / Oliveira"  }, // 1 seed 2
    { player1: "Miguel Costa",   player2: "Pedro Ferreira",  teamName: "Costa / Ferreira"   }, // 2 seed 3
    { player1: "Luís Pereira",   player2: "Carlos Rodrigues"                                }, // 3 seed 4
    { player1: "Tiago Mendes",   player2: "Bruno Alves"                                     }, // 4 seed 5
    { player1: "Ricardo Sousa",  player2: "Filipe Gomes"                                    }, // 5 seed 6
    { player1: "Hugo Martins",   player2: "Diogo Lopes"                                     }, // 6 seed 7
    { player1: "Marco Neves",    player2: "Sérgio Pinto"                                    }, // 7 seed 8
  ]);

  const inputs = generateSingleElimination(8, true);
  const matches = await createMatches(t.id, catOpen.id, inputs, players);

  const schedule = [
    { day: -7, hour: 9,  court: "Campo 1" }, // QF1
    { day: -7, hour: 9,  court: "Campo 2" }, // QF2
    { day: -7, hour: 11, court: "Campo 1" }, // QF3
    { day: -7, hour: 11, court: "Campo 2" }, // QF4
    { day: -7, hour: 14, court: "Campo 1" }, // SF1
    { day: -7, hour: 14, court: "Campo 2" }, // SF2
    { day: -6, hour: 10, court: "Campo 1" }, // Final
    { day: -6, hour: 10, court: "Campo 2" }, // 3.º lugar
  ];
  for (let i = 0; i < matches.length; i++) {
    const s = schedule[i];
    if (!s) continue;
    await prisma.match.update({ where: { id: matches[i].id }, data: {
      scheduledAt: dateAt(s.day, s.hour), court: s.court,
    }});
  }

  // QF
  const qfR = [
    { winner: 0, loser: 7, s: [{ team1: 6, team2: 3 }, { team1: 6, team2: 4 }] },
    { winner: 4, loser: 3, s: [{ team1: 6, team2: 4 }, { team1: 4, team2: 6 }, { team1: 10, team2: 7, superTiebreak: true }] },
    { winner: 1, loser: 6, s: [{ team1: 7, team2: 6, tiebreak: { team1: 7, team2: 4 } }, { team1: 6, team2: 4 }] },
    { winner: 2, loser: 5, s: [{ team1: 6, team2: 2 }, { team1: 6, team2: 3 }] },
  ];
  for (let i = 0; i < 4; i++) {
    const r = qfR[i];
    const m = await prisma.match.findUnique({ where: { id: matches[i].id } });
    if (!m) continue;
    await submitResult(m.id, players[r.winner].id, players[r.loser].id, r.s,
      m.nextMatchId, m.nextMatchSlot, m.loserNextMatchId ?? null, m.loserNextSlot ?? null);
  }

  // SF — team1 vence nos dois
  const sfScores = [
    [{ team1: 6, team2: 3 }, { team1: 6, team2: 1 }],
    [{ team1: 6, team2: 4 }, { team1: 4, team2: 6 }, { team1: 10, team2: 8, superTiebreak: true }],
  ];
  for (let i = 0; i < 2; i++) {
    const m = await prisma.match.findUnique({ where: { id: matches[4 + i].id } });
    if (!m?.team1Id || !m?.team2Id) continue;
    await submitResult(m.id, m.team1Id, m.team2Id, sfScores[i],
      m.nextMatchId, m.nextMatchSlot, m.loserNextMatchId ?? null, m.loserNextSlot ?? null);
  }

  // Final
  const final = await prisma.match.findUnique({ where: { id: matches[6].id } });
  if (final?.team1Id && final?.team2Id) {
    await submitResult(final.id, final.team1Id, final.team2Id,
      [{ team1: 6, team2: 4 }, { team1: 4, team2: 6 }, { team1: 10, team2: 7, superTiebreak: true }],
      null, null, null, null);
  }

  // 3.º lugar
  const third = await prisma.match.findUnique({ where: { id: matches[7].id } });
  if (third?.team1Id && third?.team2Id) {
    await submitResult(third.id, third.team1Id, third.team2Id,
      [{ team1: 6, team2: 4 }, { team1: 6, team2: 3 }], null, null, null, null);
  }

  await prisma.tournament.update({ where: { id: t.id }, data: { status: "completed" } });
  await prisma.category.update({ where: { id: catOpen.id }, data: { status: "completed" } });
  console.log("✓ Demo SE Concluído → /tournament/demo-eliminacao-concluido?token=admin-concluido");
}

// ─── 4. Round Robin — Em curso ────────────────────────────────────────────────
//
// RR 6 duplas, M3SPO, 3 rondas completas de 5, tiebreaks visíveis.
// circleMethod(6): R1(0,5)(1,4)(2,3) | R2(0,4)(5,3)(1,2) | R3(0,3)(4,2)(5,1)
//                  R4(0,2)(3,1)(4,5) | R5(0,1)(2,5)(3,4)  [pendentes]
// Após R1-R3: p0=3V, p2=3V, p1=2V, p5=1V, p3=0V, p4=0V

async function seedRoundRobin() {
  const t = await createTournament({
    slug: "demo-roundrobin",
    adminToken: "admin-roundrobin",
    name: "Torneio Round Robin — Em Curso",
    description:
      "6 duplas, todos contra todos, M3SPO. 3 de 5 rondas completas. Tabela em actualização.",
    format: "round_robin",
    matchFormat: "M3SPO",
    status: "in_progress",
    isPublic: true,
    courtCount: 2,
  });

  const catOpen = await createCategory(t.id, {
    code: "OPEN", name: "Open",
    matchFormat: "M3SPO", format: "round_robin",
    status: "in_progress", order: 0,
  });

  const players = await createPlayers(t.id, catOpen.id, [
    { player1: "Nuno Cardoso",   player2: "João Silva",      teamName: "Cardoso / Silva"    }, // 0
    { player1: "Rui Santos",     player2: "André Oliveira",  teamName: "Santos / Oliveira"  }, // 1
    { player1: "Miguel Costa",   player2: "Pedro Ferreira",  teamName: "Costa / Ferreira"   }, // 2
    { player1: "Luís Pereira",   player2: "Carlos Rodrigues"                                }, // 3
    { player1: "Tiago Mendes",   player2: "Bruno Alves"                                     }, // 4
    { player1: "Ricardo Sousa",  player2: "Filipe Gomes"                                    }, // 5
  ]);

  const inputs = generateRoundRobin(6);
  const matches = await createMatches(t.id, catOpen.id, inputs, players);

  for (let i = 0; i < matches.length; i++) {
    const round = inputs[i].round;
    const dayOff = round <= 3 ? -3 + round - 1 : round - 2;
    await prisma.match.update({ where: { id: matches[i].id }, data: {
      scheduledAt: dateAt(dayOff, 9 + (i % 3) * 2),
      court: `Campo ${(i % 2) + 1}`,
    }});
  }

  // R1: p0vp5(p0W), p1vp4(p1W), p2vp3(p2W)
  // R2: p0vp4(p0W), p5vp3(p5W), p1vp2(p2W)
  // R3: p0vp3(p0W), p4vp2(p2W), p5vp1(p1W)
  const r = [
    { t1w: true,  s: [{ team1: 6, team2: 3 }, { team1: 6, team2: 4 }] },
    { t1w: true,  s: [{ team1: 7, team2: 6, tiebreak: { team1: 7, team2: 5 } }, { team1: 6, team2: 4 }] },
    { t1w: true,  s: [{ team1: 6, team2: 2 }, { team1: 6, team2: 3 }] },
    { t1w: true,  s: [{ team1: 6, team2: 4 }, { team1: 6, team2: 3 }] },
    { t1w: true,  s: [{ team1: 6, team2: 3 }, { team1: 7, team2: 5 }] },
    { t1w: false, s: [{ team1: 3, team2: 6 }, { team1: 4, team2: 6 }] },
    { t1w: true,  s: [{ team1: 6, team2: 1 }, { team1: 6, team2: 2 }] },
    { t1w: false, s: [{ team1: 4, team2: 6 }, { team1: 5, team2: 7 }] },
    { t1w: false, s: [{ team1: 3, team2: 6 }, { team1: 4, team2: 6 }] },
  ];

  const realMatches = matches.filter((_, i) => inputs[i].status !== "bye");
  for (let i = 0; i < Math.min(r.length, realMatches.length); i++) {
    const m = await prisma.match.findUnique({ where: { id: realMatches[i].id } });
    if (!m?.team1Id || !m?.team2Id) continue;
    const [wId, lId] = r[i].t1w ? [m.team1Id, m.team2Id] : [m.team2Id, m.team1Id];
    await submitResult(m.id, wId, lId, r[i].s, null, null, null, null);
  }

  console.log("✓ Demo Round Robin → /tournament/demo-roundrobin?token=admin-roundrobin");
}

// ─── 5. Grupos + Knockout — Em curso ──────────────────────────────────────────
//
// 9 duplas em 3 grupos de 3, M3S. Grupos A+B completos, Grupo C com 1 jogo.
// serpentine(9,3): G.A→[0,5,6], G.B→[1,4,7], G.C→[2,3,8]

async function seedGroupsKnockout() {
  const t = await createTournament({
    slug: "demo-grupos",
    adminToken: "admin-grupos",
    name: "Torneio Grupos + Knockout — Em Curso",
    description:
      "9 duplas distribuídas por 3 grupos de 3 (M3S). Grupos A e B concluídos, Grupo C em curso.",
    format: "groups_knockout",
    matchFormat: "M3S",
    groupCount: 3,
    advanceCount: 2,
    status: "in_progress",
    isPublic: true,
    courtCount: 3,
  });

  const catOpen = await createCategory(t.id, {
    code: "OPEN", name: "Open",
    matchFormat: "M3S", format: "groups_knockout",
    groupCount: 3, advanceCount: 2, status: "in_progress", order: 0,
  });

  const players = await createPlayers(t.id, catOpen.id, [
    { player1: "Nuno Cardoso",   player2: "João Silva",      teamName: "Cardoso / Silva"    }, // 0 → G.A
    { player1: "Rui Santos",     player2: "André Oliveira",  teamName: "Santos / Oliveira"  }, // 1 → G.B
    { player1: "Miguel Costa",   player2: "Pedro Ferreira",  teamName: "Costa / Ferreira"   }, // 2 → G.C
    { player1: "Luís Pereira",   player2: "Carlos Rodrigues"                                }, // 3 → G.C
    { player1: "Tiago Mendes",   player2: "Bruno Alves"                                     }, // 4 → G.B
    { player1: "Ricardo Sousa",  player2: "Filipe Gomes"                                    }, // 5 → G.A
    { player1: "Hugo Martins",   player2: "Diogo Lopes"                                     }, // 6 → G.A
    { player1: "Marco Neves",    player2: "Sérgio Pinto"                                    }, // 7 → G.B
    { player1: "Diana Costa",    player2: "Marta Vieira"                                    }, // 8 → G.C
  ]);

  const { groupMatches: gm } = generateGroupsKnockout(9, 3);
  const matches = await createMatches(t.id, catOpen.id, gm, players);

  const gAReal = matches.filter((_, i) => gm[i].groupIndex === 0 && gm[i].status !== "bye");
  const gBReal = matches.filter((_, i) => gm[i].groupIndex === 1 && gm[i].status !== "bye");
  const gCReal = matches.filter((_, i) => gm[i].groupIndex === 2 && gm[i].status !== "bye");

  const gAR = [
    { t1w: false, s: [{ team1: 4, team2: 6 }, { team1: 3, team2: 6 }] },
    { t1w: true,  s: [{ team1: 6, team2: 4 }, { team1: 6, team2: 3 }] },
    { t1w: true,  s: [{ team1: 6, team2: 2 }, { team1: 6, team2: 1 }] },
  ];
  for (let i = 0; i < Math.min(gAR.length, gAReal.length); i++) {
    const m = await prisma.match.findUnique({ where: { id: gAReal[i].id } });
    if (!m?.team1Id || !m?.team2Id) continue;
    const [wId, lId] = gAR[i].t1w ? [m.team1Id, m.team2Id] : [m.team2Id, m.team1Id];
    await submitResult(m.id, wId, lId, gAR[i].s, null, null, null, null);
  }

  const gBR = [
    { t1w: false, s: [{ team1: 5, team2: 7 }, { team1: 4, team2: 6 }] },
    { t1w: true,  s: [{ team1: 6, team2: 3 }, { team1: 7, team2: 5 }] },
    { t1w: true,  s: [{ team1: 6, team2: 4 }, { team1: 6, team2: 3 }] },
  ];
  for (let i = 0; i < Math.min(gBR.length, gBReal.length); i++) {
    const m = await prisma.match.findUnique({ where: { id: gBReal[i].id } });
    if (!m?.team1Id || !m?.team2Id) continue;
    const [wId, lId] = gBR[i].t1w ? [m.team1Id, m.team2Id] : [m.team2Id, m.team1Id];
    await submitResult(m.id, wId, lId, gBR[i].s, null, null, null, null);
  }

  if (gCReal.length > 0) {
    const m = await prisma.match.findUnique({ where: { id: gCReal[0].id } });
    if (m?.team1Id && m?.team2Id) {
      await submitResult(m.id, m.team1Id, m.team2Id,
        [{ team1: 6, team2: 3 }, { team1: 6, team2: 4 }], null, null, null, null);
    }
  }

  for (let i = 0; i < matches.length; i++) {
    const round = gm[i].round;
    await prisma.match.update({ where: { id: matches[i].id }, data: {
      scheduledAt: dateAt(-2 + round, 9 + (i % 3) * 2),
      court: `Campo ${(i % 3) + 1}`,
    }});
  }

  console.log("✓ Demo Grupos+Knockout → /tournament/demo-grupos?token=admin-grupos");
}

// ─── 6. Dupla Eliminação — Em curso ───────────────────────────────────────────
//
// 8 duplas, B2 + Star Point. WR1 concluída (4 matches), LR1 concluída (2),
// WR2 parcial (1 de 2 feita). match[7,8]=LR1, match[4]=WR2 done.
// Seeding WR1: match[0]=(p0 vs p7), [1]=(p3 vs p4), [2]=(p1 vs p6), [3]=(p2 vs p5)

async function seedDoubleElimination() {
  const t = await createTournament({
    slug: "demo-dupla",
    adminToken: "admin-dupla",
    name: "Torneio Dupla Eliminação — Em Curso",
    description: "8 duplas, B2 com Star Point. WR1 e LR1 concluídas, WR2 em curso.",
    format: "double_elimination",
    matchFormat: "B2",
    starPoint: true,
    status: "in_progress",
    isPublic: true,
    courtCount: 2,
  });

  const catOpen = await createCategory(t.id, {
    code: "OPEN", name: "Open",
    matchFormat: "B2", starPoint: true,
    format: "double_elimination", status: "in_progress", order: 0,
  });

  const players = await createPlayers(t.id, catOpen.id, [
    { player1: "Nuno Cardoso",   player2: "João Silva",      teamName: "Cardoso / Silva"    }, // 0 seed 1
    { player1: "Rui Santos",     player2: "André Oliveira",  teamName: "Santos / Oliveira"  }, // 1 seed 2
    { player1: "Miguel Costa",   player2: "Pedro Ferreira",  teamName: "Costa / Ferreira"   }, // 2 seed 3
    { player1: "Luís Pereira",   player2: "Carlos Rodrigues"                                }, // 3 seed 4
    { player1: "Tiago Mendes",   player2: "Bruno Alves"                                     }, // 4 seed 5
    { player1: "Ricardo Sousa",  player2: "Filipe Gomes"                                    }, // 5 seed 6
    { player1: "Hugo Martins",   player2: "Diogo Lopes"                                     }, // 6 seed 7
    { player1: "Marco Neves",    player2: "Sérgio Pinto"                                    }, // 7 seed 8
  ]);

  const inputs = generateDoubleElimination(8);
  const matches = await createMatches(t.id, catOpen.id, inputs, players);

  for (let i = 0; i < Math.min(9, matches.length); i++) {
    const isLosers = inputs[i].bracketType === "losers";
    await prisma.match.update({ where: { id: matches[i].id }, data: {
      scheduledAt: dateAt(isLosers ? 0 : -1, 9 + (i % 4) * 2),
      court: isLosers ? "Campo 2" : "Campo 1",
    }});
  }

  // WR1 (matches 0-3): p0, p4, p1, p2 vencem
  const wr1R = [
    { winner: 0, loser: 7, s: [{ team1: 6, team2: 4 }, { team1: 6, team2: 3 }] },
    { winner: 4, loser: 3, s: [{ team1: 6, team2: 4 }, { team1: 4, team2: 6 }, { team1: 10, team2: 7, superTiebreak: true }] },
    { winner: 1, loser: 6, s: [{ team1: 6, team2: 2 }, { team1: 6, team2: 1 }] },
    { winner: 2, loser: 5, s: [{ team1: 6, team2: 3 }, { team1: 7, team2: 5 }] },
  ];
  for (let i = 0; i < 4; i++) {
    const r = wr1R[i];
    const m = await prisma.match.findUnique({ where: { id: matches[i].id } });
    if (!m) continue;
    await submitResult(m.id, players[r.winner].id, players[r.loser].id, r.s,
      m.nextMatchId, m.nextMatchSlot, m.loserNextMatchId ?? null, m.loserNextSlot ?? null);
  }

  // LR1 (matches 7-8): team1 vence
  for (const li of [7, 8]) {
    const m = await prisma.match.findUnique({ where: { id: matches[li].id } });
    if (!m?.team1Id || !m?.team2Id) continue;
    await submitResult(m.id, m.team1Id, m.team2Id,
      [{ team1: 6, team2: 4 }, { team1: 6, team2: 3 }],
      m.nextMatchId, m.nextMatchSlot, null, null);
  }

  // WR2 match[4] (p0 vs p4): p0 vence — match[5] pendente
  const wr2m0 = await prisma.match.findUnique({ where: { id: matches[4].id } });
  if (wr2m0?.team1Id && wr2m0?.team2Id) {
    await submitResult(wr2m0.id, wr2m0.team1Id, wr2m0.team2Id,
      [{ team1: 6, team2: 3 }, { team1: 6, team2: 4 }],
      wr2m0.nextMatchId, wr2m0.nextMatchSlot, null, null);
  }

  console.log("✓ Demo Dupla Eliminação → /tournament/demo-dupla?token=admin-dupla");
}

// ─── 7. Grupos + Knockout — CONCLUÍDO com vencedor ───────────────────────────
//
// 9 duplas em 3 grupos de 3 (M3S). Todos os grupos terminados.
// Knockout gerado automaticamente: SF + Final concluídos. Campeão coroado.
//
// serpentine(9,3): G.A→[p0,p5,p6], G.B→[p1,p4,p7], G.C→[p2,p3,p8]
//
// Standings após todos os grupos:
//   G.A: 1.º p5 (2V), 2.º p0 (1V), 3.º p6 (0V)
//   G.B: 1.º p4 (2V), 2.º p1 (1V), 3.º p7 (0V)
//   G.C: 1.º p2 (2V), 2.º p3 (1V), 3.º p8 (0V)
//
// Advancing seeding (non-FPP groups_knockout):
//   pos=0 (1sts) → [p5,p4,p2]; pos=1 (2nds) reversed → [p3,p1,p0]
//   advancingPlayers = [p5,p4,p2,p3,p1,p0]
//
// SE(6) bracketSize=8, seeds=[1,8,4,5,2,7,3,6]:
//   m0: p5 vs BYE → p5 avança  (idx 0,7)
//   m1: p3 vs p1              (idx 3,4 → seed4=idx3=p3, seed5=idx4=p1)
//   m2: p4 vs BYE → p4 avança  (idx 1,6)
//   m3: p2 vs p0              (idx 2,5 → seed3=idx2=p2, seed6=idx5=p0)
//   m4 (SF1): p5 vs winner(m1)
//   m5 (SF2): p4 vs winner(m3)
//   m6 (Final): winner(m4) vs winner(m5)

async function seedGroupsCompleto() {
  const t = await createTournament({
    slug: "demo-grupos-completo",
    adminToken: "admin-grupos-completo",
    name: "Torneio Grupos + Knockout — Concluído",
    description:
      "9 duplas em 3 grupos de 3 (M3S). Todos os grupos terminados, vencedor coroado após SF + Final.",
    format: "groups_knockout",
    matchFormat: "M3S",
    groupCount: 3,
    advanceCount: 2,
    status: "in_progress",
    isPublic: true,
    courtCount: 3,
  });

  const catOpen = await createCategory(t.id, {
    code: "OPEN", name: "Open",
    matchFormat: "M3S", format: "groups_knockout",
    groupCount: 3, advanceCount: 2, status: "in_progress", order: 0,
  });

  const players = await createPlayers(t.id, catOpen.id, [
    { player1: "Nuno Cardoso",   player2: "João Silva",      teamName: "Cardoso / Silva"    }, // 0 → G.A
    { player1: "Rui Santos",     player2: "André Oliveira",  teamName: "Santos / Oliveira"  }, // 1 → G.B
    { player1: "Miguel Costa",   player2: "Pedro Ferreira",  teamName: "Costa / Ferreira"   }, // 2 → G.C
    { player1: "Luís Pereira",   player2: "Carlos Rodrigues"                                }, // 3 → G.C
    { player1: "Tiago Mendes",   player2: "Bruno Alves"                                     }, // 4 → G.B
    { player1: "Ricardo Sousa",  player2: "Filipe Gomes"                                    }, // 5 → G.A
    { player1: "Hugo Martins",   player2: "Diogo Lopes"                                     }, // 6 → G.A
    { player1: "Marco Neves",    player2: "Sérgio Pinto"                                    }, // 7 → G.B
    { player1: "Diana Costa",    player2: "Marta Vieira"                                    }, // 8 → G.C
  ]);

  const { groupMatches: gm } = generateGroupsKnockout(9, 3);
  const groupCreated = await createMatches(t.id, catOpen.id, gm, players);

  // Schedule all group matches
  for (let i = 0; i < groupCreated.length; i++) {
    const round = gm[i].round;
    await prisma.match.update({ where: { id: groupCreated[i].id }, data: {
      scheduledAt: dateAt(-5 + round, 9 + (i % 3) * 2),
      court: `Campo ${(i % 3) + 1}`,
    }});
  }

  // ── Group A: p0vp5, p0vp6, p5vp6 → 1ºp5, 2ºp0, 3ºp6 ──────────────────
  const gAReal = groupCreated.filter((_, i) => gm[i].groupIndex === 0 && gm[i].status !== "bye");
  const gAR = [
    { t1w: false, s: [{ team1: 4, team2: 6 }, { team1: 3, team2: 6 }] },  // p5>p0
    { t1w: true,  s: [{ team1: 6, team2: 4 }, { team1: 6, team2: 3 }] },  // p0>p6
    { t1w: true,  s: [{ team1: 6, team2: 2 }, { team1: 6, team2: 1 }] },  // p5>p6
  ];
  for (let i = 0; i < gAReal.length; i++) {
    const m = await prisma.match.findUnique({ where: { id: gAReal[i].id } });
    if (!m?.team1Id || !m?.team2Id) continue;
    const [wId, lId] = gAR[i].t1w ? [m.team1Id, m.team2Id] : [m.team2Id, m.team1Id];
    await submitResult(m.id, wId, lId, gAR[i].s, null, null, null, null);
  }

  // ── Group B: p1vp4, p1vp7, p4vp7 → 1ºp4, 2ºp1, 3ºp7 ──────────────────
  const gBReal = groupCreated.filter((_, i) => gm[i].groupIndex === 1 && gm[i].status !== "bye");
  const gBR = [
    { t1w: false, s: [{ team1: 5, team2: 7 }, { team1: 4, team2: 6 }] },  // p4>p1
    { t1w: true,  s: [{ team1: 6, team2: 3 }, { team1: 7, team2: 5 }] },  // p1>p7
    { t1w: true,  s: [{ team1: 6, team2: 4 }, { team1: 6, team2: 3 }] },  // p4>p7
  ];
  for (let i = 0; i < gBReal.length; i++) {
    const m = await prisma.match.findUnique({ where: { id: gBReal[i].id } });
    if (!m?.team1Id || !m?.team2Id) continue;
    const [wId, lId] = gBR[i].t1w ? [m.team1Id, m.team2Id] : [m.team2Id, m.team1Id];
    await submitResult(m.id, wId, lId, gBR[i].s, null, null, null, null);
  }

  // ── Group C: p2vp3, p2vp8, p3vp8 → 1ºp2, 2ºp3, 3ºp8 ──────────────────
  const gCReal = groupCreated.filter((_, i) => gm[i].groupIndex === 2 && gm[i].status !== "bye");
  const gCR = [
    { t1w: true, s: [{ team1: 6, team2: 3 }, { team1: 6, team2: 4 }] },  // p2>p3
    { t1w: true, s: [{ team1: 6, team2: 1 }, { team1: 6, team2: 2 }] },  // p2>p8
    { t1w: true, s: [{ team1: 6, team2: 2 }, { team1: 6, team2: 3 }] },  // p3>p8
  ];
  for (let i = 0; i < gCReal.length; i++) {
    const m = await prisma.match.findUnique({ where: { id: gCReal[i].id } });
    if (!m?.team1Id || !m?.team2Id) continue;
    const [wId, lId] = gCR[i].t1w ? [m.team1Id, m.team2Id] : [m.team2Id, m.team1Id];
    await submitResult(m.id, wId, lId, gCR[i].s, null, null, null, null);
  }

  // ── Generate knockout bracket ─────────────────────────────────────────────
  // advancingPlayers = [p5, p4, p2, p3, p1, p0]  (non-FPP seeding as per route)
  const advancingPlayers = [
    players[5], players[4], players[2],  // 1sts: G.A, G.B, G.C
    players[3], players[1], players[0],  // 2nds: G.C (rev), G.B, G.A (rev)
  ];

  const koInputs = generateSingleElimination(advancingPlayers.length, false);
  const koMatches = await createMatches(t.id, catOpen.id, koInputs, advancingPlayers);

  // Schedule knockout: SF = dia 0, Final = dia +1
  const koSchedule = [
    { day: 0, hour: 9,  court: "Campo 1" }, // m0 bye
    { day: 0, hour: 9,  court: "Campo 2" }, // m1 p3 vs p1
    { day: 0, hour: 11, court: "Campo 1" }, // m2 bye
    { day: 0, hour: 11, court: "Campo 3" }, // m3 p2 vs p0
    { day: 0, hour: 14, court: "Campo 1" }, // m4 SF1
    { day: 0, hour: 14, court: "Campo 2" }, // m5 SF2
    { day: 1, hour: 10, court: "Campo 1" }, // m6 Final
  ];
  for (let i = 0; i < koMatches.length; i++) {
    const s = koSchedule[i];
    if (!s) continue;
    await prisma.match.update({ where: { id: koMatches[i].id }, data: {
      scheduledAt: dateAt(s.day - 3, s.hour), court: s.court,
    }});
  }

  // ── m1: p3 vs p1 → p1 wins ────────────────────────────────────────────────
  const m1 = await prisma.match.findUnique({ where: { id: koMatches[1].id } });
  if (m1?.team1Id && m1?.team2Id) {
    await submitResult(m1.id, m1.team2Id, m1.team1Id,
      [{ team1: 3, team2: 6 }, { team1: 4, team2: 6 }],
      m1.nextMatchId, m1.nextMatchSlot, null, null);
  }

  // ── m3: p2 vs p0 → p2 wins ────────────────────────────────────────────────
  const m3 = await prisma.match.findUnique({ where: { id: koMatches[3].id } });
  if (m3?.team1Id && m3?.team2Id) {
    await submitResult(m3.id, m3.team1Id, m3.team2Id,
      [{ team1: 6, team2: 4 }, { team1: 7, team2: 5 }],
      m3.nextMatchId, m3.nextMatchSlot, null, null);
  }

  // ── m4 (SF1): p5 vs p1 → p5 wins ─────────────────────────────────────────
  const m4 = await prisma.match.findUnique({ where: { id: koMatches[4].id } });
  if (m4?.team1Id && m4?.team2Id) {
    await submitResult(m4.id, m4.team1Id, m4.team2Id,
      [{ team1: 7, team2: 5 }, { team1: 6, team2: 3 }],
      m4.nextMatchId, m4.nextMatchSlot, null, null);
  }

  // ── m5 (SF2): p4 vs p2 → p4 wins (STB) ───────────────────────────────────
  const m5 = await prisma.match.findUnique({ where: { id: koMatches[5].id } });
  if (m5?.team1Id && m5?.team2Id) {
    await submitResult(m5.id, m5.team1Id, m5.team2Id,
      [{ team1: 6, team2: 4 }, { team1: 4, team2: 6 }, { team1: 10, team2: 8, superTiebreak: true }],
      m5.nextMatchId, m5.nextMatchSlot, null, null);
  }

  // ── m6 (Final): p5 vs p4 → p5 wins ───────────────────────────────────────
  const m6 = await prisma.match.findUnique({ where: { id: koMatches[6].id } });
  if (m6?.team1Id && m6?.team2Id) {
    await submitResult(m6.id, m6.team1Id, m6.team2Id,
      [{ team1: 6, team2: 4 }, { team1: 4, team2: 6 }, { team1: 10, team2: 7, superTiebreak: true }],
      null, null, null, null);
  }

  await prisma.tournament.update({ where: { id: t.id }, data: { status: "completed" } });
  await prisma.category.update({ where: { id: catOpen.id }, data: { status: "completed" } });
  console.log("✓ Demo Grupos+KO Concluído → /tournament/demo-grupos-completo?token=admin-grupos-completo");
}

// ─── 8. Agenda Live — SE com auto-agenda e jogo em curso ─────────────────────
//
// SE 8 duplas, M3SPO. Auto-agenda configurada: 3 campos, 90min/jogo.
// Cenário de demonstração:
//   • QF2 está in_progress com startedAt = há 20 min (20min de atraso)
//   • QF1, QF3, QF4: concluídos
//   • SF1, SF2, Final: agendados nos campos correspondentes
//   • slotMinutes=90, scheduleDays persistido no torneio
// Propósito: mostrar agenda por campo, WhatsApp, início de jogo, delay-push.

async function seedAgendaLive() {
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  const t = await createTournament({
    slug: "demo-agenda-live",
    adminToken: "admin-agenda-live",
    name: "Open Braga — Agenda em Tempo Real",
    description:
      "SE 8 duplas com agenda automática configurada (3 campos, 90 min/jogo). Um jogo está a decorrer — demonstra o acompanhamento em tempo real e notificações WhatsApp.",
    format: "single_elimination",
    matchFormat: "M3SPO",
    thirdPlace: false,
    status: "in_progress",
    isPublic: true,
    courtCount: 3,
  });

  // Persist auto-schedule config so the delay-push logic has the window to check
  await prisma.tournament.update({
    where: { id: t.id },
    data: {
      slotMinutes: 90,
      scheduleDays: JSON.stringify([
        { date: todayStr, startTime: "09:00", endTime: "18:00" },
      ]),
    },
  });

  const catOpen = await createCategory(t.id, {
    code: "OPEN", name: "Open",
    matchFormat: "M3SPO", format: "single_elimination",
    status: "in_progress", order: 0,
  });

  const players = await createPlayers(t.id, catOpen.id, [
    { player1: "Nuno Cardoso",    player2: "João Silva",        teamName: "Cardoso / Silva"    }, // 0 seed 1
    { player1: "Rui Santos",      player2: "André Oliveira",    teamName: "Santos / Oliveira"  }, // 1 seed 2
    { player1: "Miguel Costa",    player2: "Pedro Ferreira",    teamName: "Costa / Ferreira"   }, // 2 seed 3
    { player1: "Luís Pereira",    player2: "Carlos Rodrigues",  teamName: "Pereira / Rodrigues" }, // 3 seed 4
    { player1: "Tiago Mendes",    player2: "Bruno Alves",       teamName: "Mendes / Alves"     }, // 4 seed 5
    { player1: "Ricardo Sousa",   player2: "Filipe Gomes",      teamName: "Sousa / Gomes"      }, // 5 seed 6
    { player1: "Hugo Martins",    player2: "Diogo Lopes",       teamName: "Martins / Lopes"    }, // 6 seed 7
    { player1: "Marco Neves",     player2: "Sérgio Pinto",      teamName: "Neves / Pinto"      }, // 7 seed 8
  ]);

  // SE(8) no third place: QF[0..3], SF[4,5], Final[6]
  // Seeding [1,8,4,5,2,7,3,6]:
  //   QF0: p0(s1) vs p7(s8)
  //   QF1: p3(s4) vs p4(s5)
  //   QF2: p1(s2) vs p6(s7)
  //   QF3: p2(s3) vs p5(s6)
  const inputs = generateSingleElimination(8, false);
  const matches = await createMatches(t.id, catOpen.id, inputs, players);

  // Build schedule (QF round 1, SF round 2, Final round 3)
  // 3 courts, 90 min slots — QF start 09:00; SF 10:30; Final 12:00
  const schedule: { hour: number; min: number; court: string }[] = [
    { hour: 9,  min: 0,  court: "Campo 1" }, // QF0 (complete)
    { hour: 9,  min: 0,  court: "Campo 2" }, // QF1 ← in_progress
    { hour: 9,  min: 0,  court: "Campo 3" }, // QF2 (complete)
    { hour: 9,  min: 0,  court: "Campo 1" }, // QF3 (complete) — 2nd slot Campo 1, sequenced
    { hour: 10, min: 30, court: "Campo 1" }, // SF1
    { hour: 10, min: 30, court: "Campo 2" }, // SF2
    { hour: 12, min: 0,  court: "Campo 1" }, // Final
  ];

  for (let i = 0; i < Math.min(matches.length, schedule.length); i++) {
    const s = schedule[i];
    const d = new Date(today);
    d.setHours(s.hour, s.min, 0, 0);
    await prisma.match.update({ where: { id: matches[i].id }, data: {
      scheduledAt: d, court: s.court,
    }});
  }

  // ── QF0 (p0 vs p7): completed ─────────────────────────────────────────────
  const qf0 = await prisma.match.findUnique({ where: { id: matches[0].id } });
  if (qf0?.team1Id && qf0?.team2Id) {
    await submitResult(qf0.id, qf0.team1Id, qf0.team2Id,
      [{ team1: 6, team2: 3 }, { team1: 6, team2: 4 }],
      qf0.nextMatchId, qf0.nextMatchSlot, null, null);
  }

  // ── QF2 (p1 vs p6): completed ─────────────────────────────────────────────
  const qf2 = await prisma.match.findUnique({ where: { id: matches[2].id } });
  if (qf2?.team1Id && qf2?.team2Id) {
    await submitResult(qf2.id, qf2.team1Id, qf2.team2Id,
      [{ team1: 7, team2: 6, tiebreak: { team1: 7, team2: 4 } }, { team1: 6, team2: 3 }],
      qf2.nextMatchId, qf2.nextMatchSlot, null, null);
  }

  // ── QF3 (p2 vs p5): completed ─────────────────────────────────────────────
  const qf3 = await prisma.match.findUnique({ where: { id: matches[3].id } });
  if (qf3?.team1Id && qf3?.team2Id) {
    await submitResult(qf3.id, qf3.team1Id, qf3.team2Id,
      [{ team1: 6, team2: 2 }, { team1: 6, team2: 3 }],
      qf3.nextMatchId, qf3.nextMatchSlot, null, null);
  }

  // ── QF1 (p3 vs p4): in_progress — começou há 20 minutos ──────────────────
  const startedAt = new Date(Date.now() - 20 * 60 * 1000);
  await prisma.match.update({
    where: { id: matches[1].id },
    data: { status: "in_progress", startedAt },
  });

  console.log("✓ Demo Agenda Live → /tournament/demo-agenda-live?token=admin-agenda-live");
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("A limpar dados de demo anteriores...");
  await wipeDemo();
  console.log("A criar torneios de demonstração...\n");

  await seedDraftMultiSeries();
  await seedFppAutoInProgress();
  await seedSingleEliminationCompleted();
  await seedRoundRobin();
  await seedGroupsKnockout();
  await seedDoubleElimination();
  await seedGroupsCompleto();
  await seedAgendaLive();

  console.log("\n✅ Seed concluído com sucesso!\n");
  console.log("Torneios criados:");
  console.log("  /tournament/demo-rascunho-multi?token=admin-rascunho-multi");
  console.log("  /tournament/demo-fpp-auto?token=admin-fpp-auto");
  console.log("  /tournament/demo-eliminacao-concluido?token=admin-concluido");
  console.log("  /tournament/demo-roundrobin?token=admin-roundrobin");
  console.log("  /tournament/demo-grupos?token=admin-grupos");
  console.log("  /tournament/demo-dupla?token=admin-dupla");
  console.log("  /tournament/demo-grupos-completo?token=admin-grupos-completo");
  console.log("  /tournament/demo-agenda-live?token=admin-agenda-live");
  console.log("\nPainel global: /admin?token=padel-admin-2025");
}

main()
  .catch((e) => {
    console.error("Erro no seed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
