"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import TournamentBottomNav from "@/components/layout/TournamentBottomNav";
import type { Tournament, Player, Match, SetScore } from "@/types";

interface TournamentData {
  tournament: Tournament & { players: Player[]; matches: Match[] };
}

function getRoundLabel(match: Match, matches: Match[]): string {
  if (match.bracketType === "third_place") return "3.º / 4.º lugar";
  if (match.bracketType === "final") return "Grand Final";
  if (match.bracketType === "group") return `Grupo — Ronda ${match.round}`;
  const winners = matches.filter((m) => m.bracketType === "winners");
  const maxRound = Math.max(...winners.map((m) => m.round), 1);
  const remaining = maxRound - match.round + 1;
  if (remaining === 1) return "Final";
  if (remaining === 2) return "Meias-Finais";
  if (remaining === 3) return "Quartos";
  return `Ronda ${match.round}`;
}

function MatchRow({ match, myId, allMatches }: { match: Match; myId: string; allMatches: Match[] }) {
  const isTeam1 = match.team1Id === myId;
  const opponent = isTeam1 ? match.team2 : match.team1;
  const won = match.winnerId === myId;

  const scores: SetScore[] = match.scores ? (() => { try { return JSON.parse(match.scores); } catch { return []; } })() : [];
  const mySets = scores.filter((s) => isTeam1 ? s.team1 > s.team2 : s.team2 > s.team1).length;
  const theirSets = scores.filter((s) => isTeam1 ? s.team2 > s.team1 : s.team1 > s.team2).length;

  const roundLabel = getRoundLabel(match, allMatches);

  const statusColor =
    match.status === "completed"
      ? won ? "border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/20"
             : "border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/10"
      : match.status === "in_progress"
      ? "border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20"
      : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900";

  return (
    <div className={`rounded-xl border-2 p-4 space-y-1.5 ${statusColor}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{roundLabel}</span>
        {match.status === "completed" && (
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
            won ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400"
                : "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
          }`}>
            {won ? "Vitória" : "Derrota"}
          </span>
        )}
        {match.status === "in_progress" && (
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400">
            Em curso
          </span>
        )}
        {match.status === "pending" && (
          <span className="text-xs text-slate-400">Por jogar</span>
        )}
      </div>

      <p className="font-semibold text-slate-800 dark:text-slate-200">
        vs {opponent?.name ?? "A determinar"}
      </p>

      {match.status === "completed" && scores.length > 0 && (
        <p className="font-mono text-sm text-slate-600 dark:text-slate-400">
          {scores.map((s, i) => (
            <span key={i} className="mr-2">
              {isTeam1 ? `${s.team1}-${s.team2}` : `${s.team2}-${s.team1}`}
            </span>
          ))}
          <span className="font-bold ml-1">({mySets}–{theirSets} sets)</span>
        </p>
      )}

      {(match.scheduledAt || match.court) && match.status !== "completed" && (
        <p className="text-xs text-slate-400 flex items-center gap-1.5">
          {match.court && (
            <span className="font-medium text-slate-500">{match.court}</span>
          )}
          {match.court && match.scheduledAt && <span>·</span>}
          {match.scheduledAt && (
            <span>
              {new Date(match.scheduledAt).toLocaleDateString("pt-PT", { weekday: "short", day: "numeric", month: "short" })}
              {" "}
              {new Date(match.scheduledAt).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
        </p>
      )}
    </div>
  );
}

export default function MinhaDuplaPage() {
  const { slug } = useParams<{ slug: string }>();
  const [data, setData] = useState<TournamentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(() => {
    if (typeof window !== "undefined") return localStorage.getItem(`minha-dupla-${slug}`) ?? "";
    return "";
  });

  useEffect(() => {
    fetch(`/api/tournament/${slug}`)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [slug]);

  function handleSearch(value: string) {
    setSearch(value);
    localStorage.setItem(`minha-dupla-${slug}`, value);
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="animate-spin h-6 w-6 border-4 border-emerald-500 border-t-transparent rounded-full" />
    </div>
  );

  if (!data) return (
    <div className="text-center py-16 text-slate-500">Torneio não encontrado.</div>
  );

  const { tournament } = data;
  const q = search.trim().toLowerCase();

  // Find matching players
  const myPlayers = q.length >= 2
    ? tournament.players.filter((p) =>
        p.name.toLowerCase().includes(q) ||
        p.player1Name.toLowerCase().includes(q) ||
        p.player2Name.toLowerCase().includes(q)
      )
    : [];

  const myIds = new Set(myPlayers.map((p) => p.id));

  // All matches involving my teams (excluding byes)
  const myMatches = tournament.matches.filter(
    (m) => m.status !== "bye" && (myIds.has(m.team1Id ?? "") || myIds.has(m.team2Id ?? ""))
  );

  const myId = myPlayers[0]?.id ?? "";

  const upcoming = myMatches.filter((m) => m.status === "pending").sort(
    (a, b) => (a.scheduledAt ? new Date(a.scheduledAt).getTime() : Infinity) - (b.scheduledAt ? new Date(b.scheduledAt).getTime() : Infinity)
  );
  const inProgress = myMatches.filter((m) => m.status === "in_progress");
  const completed = myMatches.filter((m) => m.status === "completed").reverse();

  return (
    <div className="mx-auto max-w-lg px-4 py-8 pb-24 sm:pb-8">
      {/* Back link */}
      <div className="mb-6">
        <Link href={`/tournament/${slug}`} className="text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
          ← {tournament.name}
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-2">Os meus jogos</h1>
        <p className="text-sm text-slate-500 mt-1">Pesquisa o teu nome para ver os teus jogos.</p>
      </div>

      {/* Search box */}
      <div className="relative mb-6">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" /><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Nome do jogador ou dupla…"
          autoFocus
          className="w-full pl-9 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-base"
        />
        {search && (
          <button
            onClick={() => handleSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {q.length >= 2 && myPlayers.length === 0 && (
        <p className="text-center text-slate-400 text-sm py-8">Nenhuma dupla encontrada com &ldquo;{search}&rdquo;.</p>
      )}

      {myPlayers.length > 0 && (
        <>
          {/* Matched team */}
          <div className="mb-4 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-300">
            <span className="font-medium">{myPlayers[0].name}</span>
            {myPlayers.length > 1 && <span className="text-slate-400 ml-1">+{myPlayers.length - 1} dupla(s)</span>}
          </div>

          {myMatches.length === 0 && (
            <p className="text-center text-slate-400 text-sm py-8">Ainda não há jogos para esta dupla.</p>
          )}

          {inProgress.length > 0 && (
            <section className="mb-6">
              <h2 className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-3">Em Curso</h2>
              <div className="space-y-3">
                {inProgress.map((m) => <MatchRow key={m.id} match={m} myId={myId} allMatches={tournament.matches} />)}
              </div>
            </section>
          )}

          {upcoming.length > 0 && (
            <section className="mb-6">
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Próximos</h2>
              <div className="space-y-3">
                {upcoming.map((m) => <MatchRow key={m.id} match={m} myId={myId} allMatches={tournament.matches} />)}
              </div>
            </section>
          )}

          {completed.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Concluídos</h2>
              <div className="space-y-3">
                {completed.map((m) => <MatchRow key={m.id} match={m} myId={myId} allMatches={tournament.matches} />)}
              </div>
            </section>
          )}
        </>
      )}

      {q.length < 2 && (
        <div className="text-center py-16 text-slate-300 dark:text-slate-600">
          <p className="text-5xl mb-4">🎾</p>
          <p className="text-sm">Escreve pelo menos 2 letras para pesquisar</p>
        </div>
      )}

      <TournamentBottomNav slug={slug} />
    </div>
  );
}
