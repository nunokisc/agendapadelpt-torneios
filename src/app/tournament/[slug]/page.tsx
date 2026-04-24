"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import TournamentBottomNav from "@/components/layout/TournamentBottomNav";
import TournamentHeader from "@/components/tournament/TournamentHeader";
import PlayerList from "@/components/tournament/PlayerList";
import LinkShare from "@/components/tournament/LinkShare";
import ScheduleManager from "@/components/tournament/ScheduleManager";
import RegistrationPanel from "@/components/tournament/RegistrationPanel";
import ScoreInputModal from "@/components/tournament/ScoreInputModal";
import SingleEliminationBracket from "@/components/bracket/SingleEliminationBracket";
import DoubleEliminationBracket from "@/components/bracket/DoubleEliminationBracket";
import RoundRobinTable from "@/components/bracket/RoundRobinTable";
import GroupStageView from "@/components/bracket/GroupStageView";
import Button from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useToast } from "@/components/ui/ToastProvider";
import { BracketSkeleton } from "@/components/ui/Skeleton";
import type { Tournament, Player, Match } from "@/types";

interface TournamentData {
  tournament: Tournament & { players: Player[]; matches: Match[] };
}

// ── Bottom nav icons ──────────────────────────────────────────────────────────

function IconBracket() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="3" width="6" height="4" rx="1" /><rect x="16" y="3" width="6" height="4" rx="1" />
      <rect x="9" y="10" width="6" height="4" rx="1" /><rect x="9" y="17" width="6" height="4" rx="1" />
      <path strokeLinecap="round" d="M5 7v3.5a.5.5 0 00.5.5H9M19 7v3.5a.5.5 0 01-.5.5H15" />
      <path strokeLinecap="round" d="M12 14v3" />
    </svg>
  );
}
function IconCalendar() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="18" rx="2" /><path strokeLinecap="round" d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}
function IconUsers() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" />
      <path strokeLinecap="round" d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
    </svg>
  );
}
function IconPerson() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="8" r="4" /><path strokeLinecap="round" d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  );
}
function IconStats() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function TournamentPage() {
  const { slug } = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const isAdmin = Boolean(token);

  const { toast } = useToast();
  const [data, setData] = useState<TournamentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [activeTab, setActiveTab] = useState<"bracket" | "schedule" | "registrations">("bracket");

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/tournament/${slug}`);
      if (!res.ok) throw new Error("Torneio não encontrado");
      const json = await res.json();
      setData(json);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (isAdmin) return;
    const interval = setInterval(fetchData, 30_000);
    return () => clearInterval(interval);
  }, [isAdmin, fetchData]);

  async function handleGenerate() {
    setGenerating(true);
    setApiError(null);
    try {
      const res = await fetch(`/api/tournament/${slug}/generate?token=${token}`, { method: "POST" });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Erro ao gerar bracket");
      }
      await fetchData();
      toast("Bracket gerado com sucesso!");
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setGenerating(false);
    }
  }

  function handleMatchClick(match: Match) {
    if (!isAdmin) return;
    if (match.status === "bye") return;
    if (!match.team1Id || !match.team2Id) return;
    setSelectedMatch(match);
  }

  if (loading) return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="h-16 bg-slate-200 dark:bg-slate-800 animate-pulse rounded-xl mb-6" />
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        <div className="xl:col-span-1 space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-10 bg-slate-200 dark:bg-slate-800 animate-pulse rounded-lg" />
          ))}
        </div>
        <div className="xl:col-span-3">
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 overflow-x-auto">
            <BracketSkeleton />
          </div>
        </div>
      </div>
    </div>
  );

  if (apiError || !data) return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center">
      <p className="text-slate-500">{apiError ?? "Torneio não encontrado"}</p>
    </div>
  );

  const { tournament } = data;
  const isDraft = tournament.status === "draft";
  const canGenerate = isDraft && tournament.players.length >= 2;
  const bracketUrl = token ? `/tournament/${slug}/bracket?token=${token}` : `/tournament/${slug}/bracket`;

  function renderBracket() {
    const { matches, players, format, groupCount } = tournament;
    if (format === "single_elimination") return <SingleEliminationBracket matches={matches} isAdmin={isAdmin} onMatchClick={handleMatchClick} />;
    if (format === "double_elimination") return <DoubleEliminationBracket matches={matches} isAdmin={isAdmin} onMatchClick={handleMatchClick} />;
    if (format === "round_robin") return <RoundRobinTable matches={matches} players={players} isAdmin={isAdmin} onMatchClick={handleMatchClick} />;
    if (format === "groups_knockout") return <GroupStageView matches={matches} players={players} isAdmin={isAdmin} onMatchClick={handleMatchClick} groupCount={groupCount ?? 2} />;
    return null;
  }

  // ── Bottom nav config ────────────────────────────────────────────────────────
  const showBottomNav = !isDraft;

  const adminNavItems = [
    { key: "bracket" as const, label: "Bracket", icon: <IconBracket /> },
    { key: "schedule" as const, label: "Agenda", icon: <IconCalendar /> },
    { key: "registrations" as const, label: "Inscrições", icon: <IconUsers /> },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 pb-24 sm:pb-8">
      <TournamentHeader tournament={tournament} isAdmin={isAdmin} onUpdate={fetchData} />

      {isAdmin && <LinkShare slug={slug} adminToken={token} />}

      {/* Public quick links — hidden on mobile (bottom nav covers this) */}
      {!isAdmin && !isDraft && (
        <div className="hidden sm:flex items-center gap-4 mb-4 text-sm">
          <Link href={`/tournament/${slug}/stats`} className="text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors flex items-center gap-1">
            <IconStats />
            Estatísticas
          </Link>
          <Link href={`/tournament/${slug}/minha-dupla`} className="text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors flex items-center gap-1">
            <IconPerson />
            Os meus jogos
          </Link>
        </div>
      )}
      {!isAdmin && isDraft && tournament.registrationOpen && (
        <div className="flex items-center gap-4 mb-4 text-sm">
          <Link href={`/tournament/${slug}/register`} className="text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1">
            Inscrever dupla →
          </Link>
        </div>
      )}

      {/* Draft state */}
      {isDraft ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <PlayerList players={tournament.players} slug={slug} token={token} onUpdate={fetchData} disabled={!isAdmin} />
            {isAdmin && tournament.registrationOpen && (
              <RegistrationPanel slug={slug} token={token} onApproved={fetchData} />
            )}
            {isAdmin && (
              <>
                {apiError && <p className="text-sm text-red-600 dark:text-red-400">{apiError}</p>}
                <Button size="lg" className="w-full" disabled={!canGenerate} loading={generating} onClick={handleGenerate}>
                  Gerar Bracket
                </Button>
                {!canGenerate && <p className="text-xs text-center text-slate-400">Precisas de pelo menos 2 duplas.</p>}
              </>
            )}
          </div>
          <div className="lg:col-span-2">
            <div className="flex items-center justify-center h-64 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700">
              <div className="text-center text-slate-400">
                <p className="text-2xl mb-2">🎾</p>
                <p className="font-medium">Bracket ainda não gerado</p>
                <p className="text-sm mt-1">
                  {isAdmin ? "Adiciona as duplas e clica em Gerar Bracket." : "O administrador ainda não gerou o bracket."}
                </p>
                {tournament.registrationOpen && !isAdmin && (
                  <Link href={`/tournament/${slug}/register`} className="mt-3 inline-block text-sm text-emerald-600 dark:text-emerald-400 hover:underline">
                    Inscrever dupla →
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {tournament.status === "completed" && (
            <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 px-6 py-4 text-center">
              <p className="text-emerald-700 dark:text-emerald-400 font-semibold text-lg">🏆 Torneio concluído!</p>
            </div>
          )}

          {/* Desktop tabs (admin only) */}
          {isAdmin && (
            <div className="hidden sm:flex gap-1 border-b border-slate-200 dark:border-slate-700">
              {adminNavItems.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                    activeTab === key
                      ? "border-emerald-600 text-emerald-600 dark:text-emerald-400 dark:border-emerald-400"
                      : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {(!isAdmin || activeTab === "bracket") && (
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
              <div className="xl:col-span-1 space-y-3 hidden xl:block">
                <PlayerList players={tournament.players} slug={slug} token={token} onUpdate={fetchData} disabled />
                <Link href={`/tournament/${slug}/stats`} className="block text-center text-xs text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors py-2">
                  Ver estatísticas →
                </Link>
              </div>
              <div className="xl:col-span-3">
                <Card padding="md">
                  <div className="flex items-center justify-end mb-3">
                    <a
                      href={bracketUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                    >
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                      </svg>
                      Ecrã completo
                    </a>
                  </div>
                  <div className="overflow-x-auto">{renderBracket()}</div>
                </Card>
              </div>
            </div>
          )}

          {isAdmin && activeTab === "schedule" && (
            <ScheduleManager tournament={tournament} matches={tournament.matches} token={token} onUpdate={fetchData} />
          )}
          {isAdmin && activeTab === "registrations" && (
            <RegistrationPanel slug={slug} token={token} onApproved={fetchData} />
          )}
        </div>
      )}

      <ScoreInputModal
        match={selectedMatch}
        slug={slug}
        token={token}
        matchFormat={tournament.matchFormat}
        onClose={() => setSelectedMatch(null)}
        onSaved={fetchData}
      />

      {/* ── Mobile bottom nav ──────────────────────────────────────────────── */}
      {showBottomNav && (
        <>
          {isAdmin ? (
            <nav className="sm:hidden fixed bottom-0 inset-x-0 z-30 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 flex safe-bottom">
              {adminNavItems.map(({ key, label, icon }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`flex-1 flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors ${
                    activeTab === key
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-slate-400 dark:text-slate-500"
                  }`}
                >
                  {icon}
                  {label}
                </button>
              ))}
            </nav>
          ) : (
            <TournamentBottomNav slug={slug} />
          )}
        </>
      )}
    </div>
  );
}
