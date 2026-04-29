"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import TournamentBottomNav from "@/components/layout/TournamentBottomNav";
import TournamentHeader from "@/components/tournament/TournamentHeader";
import { useTournamentSSE } from "@/lib/use-tournament-sse";
import { getAdminToken } from "@/lib/auth";
import { usePushNotifications } from "@/lib/use-push-notifications";
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
import Badge from "@/components/ui/Badge";
import { useToast } from "@/components/ui/ToastProvider";
import { BracketSkeleton } from "@/components/ui/Skeleton";
import { getFppFormatForCategory } from "@/lib/fpp-format";
import type { Tournament, Player, Match, Category } from "@/types";

interface TournamentData {
  tournament: Tournament & { players: Player[]; matches: Match[]; categories: (Category & { players: Player[]; matches: Match[] })[] };
}

// ── Icons ──────────────────────────────────────────────────────────────────────

function IconBracket() {
  return <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="6" height="4" rx="1" /><rect x="16" y="3" width="6" height="4" rx="1" /><rect x="9" y="10" width="6" height="4" rx="1" /><rect x="9" y="17" width="6" height="4" rx="1" /><path strokeLinecap="round" d="M5 7v3.5a.5.5 0 00.5.5H9M19 7v3.5a.5.5 0 01-.5.5H15" /><path strokeLinecap="round" d="M12 14v3" /></svg>;
}
function IconCalendar() {
  return <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" /><path strokeLinecap="round" d="M16 2v4M8 2v4M3 10h18" /></svg>;
}
function IconUsers() {
  return <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path strokeLinecap="round" d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></svg>;
}
function IconPerson() {
  return <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4" /><path strokeLinecap="round" d="M4 20c0-4 3.6-7 8-7s8 3 8 7" /></svg>;
}
function IconStats() {
  return <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>;
}

const STATUS_VARIANT: Record<string, "default" | "info" | "success"> = {
  draft: "default", in_progress: "info", completed: "success",
};
const STATUS_LABEL: Record<string, string> = {
  draft: "Rascunho", in_progress: "Em Curso", completed: "Concluído",
};

// ── Category management modal ──────────────────────────────────────────────────

function ManageCategoriesModal({
  slug, token, categories, onClose, onUpdate,
}: {
  slug: string; token: string;
  categories: Category[];
  onClose: () => void;
  onUpdate: () => void;
}) {
  const { toast } = useToast();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/tournament/${slug}/categories?token=${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codes: [code.trim().toUpperCase()] }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setCode("");
      onUpdate();
      toast("Categoria adicionada!");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Erro");
    } finally {
      setLoading(false);
    }
  }

  async function handleRemove(catId: string) {
    try {
      const res = await fetch(`/api/tournament/${slug}/categories/${catId}?token=${token}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error);
      onUpdate();
      toast("Categoria removida.");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Erro");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-sm p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Gerir Categorias</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="space-y-1.5">
          {categories.map((cat) => (
            <div key={cat.id} className="flex items-center justify-between rounded-lg bg-slate-50 dark:bg-slate-800 px-3 py-2">
              <div>
                <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{cat.code}</span>
                <span className="ml-2 text-xs text-slate-400">{cat.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={STATUS_VARIANT[cat.status]}>{STATUS_LABEL[cat.status]}</Badge>
                {cat.status === "draft" && categories.length > 1 && (
                  <button onClick={() => handleRemove(cat.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        <form onSubmit={handleAdd} className="flex gap-2">
          <input
            className="flex-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0E7C66] uppercase placeholder:normal-case"
            placeholder="Código (ex: M4, F3)"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <Button size="sm" type="submit" loading={loading} disabled={!code.trim()}>
            Adicionar
          </Button>
        </form>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function TournamentPage() {
  const { slug } = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryToken = searchParams.get("token") ?? "";
  const [token, setToken] = useState(queryToken);

  useEffect(() => {
    if (!queryToken) {
      const cookieToken = getAdminToken(slug);
      if (cookieToken) setToken(cookieToken);
    }
  }, [slug, queryToken]);

  const isAdmin = Boolean(token);
  const { toast } = useToast();
  const pushNotifs = usePushNotifications(slug);

  const [data, setData] = useState<TournamentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [activeTab, setActiveTab] = useState<"bracket" | "schedule" | "registrations">("bracket");
  const [publicTab, setPublicTab] = useState<"bracket" | "schedule">("bracket");
  const [showManageCategories, setShowManageCategories] = useState(false);
  const [fppConfirm, setFppConfirm] = useState<{ categoryId: string; description: string; matchFormat: string } | null>(null);

  // Active category tracked in URL (?cat=...)
  const catParam = searchParams.get("cat") ?? "";

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
  useTournamentSSE(slug, fetchData, !isAdmin);

  function setActiveCat(code: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("cat", code);
    router.replace(`/tournament/${slug}?${params.toString()}`, { scroll: false });
  }

  const tournament = data?.tournament;
  const categories = tournament?.categories ?? [];
  const hasMultipleCategories = categories.length > 1;

  // Resolve active category
  const activeCategory = (catParam && categories.find((c) => c.code === catParam))
    || categories[0]
    || null;

  async function handleGenerate(categoryId?: string) {
    const catId = categoryId ?? activeCategory?.id;
    if (!catId) return;

    // FPP auto: show confirmation with system details
    if (tournament?.tournamentMode === "fpp_auto") {
      const cat = categories.find((c) => c.id === catId);
      const checkedIn = (cat?.players ?? []).filter((p) => p.checkedIn).length;
      const fppResult = getFppFormatForCategory(checkedIn);
      setFppConfirm({ categoryId: catId, description: fppResult.description, matchFormat: fppResult.matchFormat });
      return;
    }

    await doGenerate(catId);
  }

  async function doGenerate(categoryId: string) {
    setFppConfirm(null);
    setGenerating(true);
    setApiError(null);
    try {
      const res = await fetch(`/api/tournament/${slug}/generate?token=${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryId }),
      });
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

  async function handleReset() {
    const msg = hasMultipleCategories
      ? `Repor o bracket de "${activeCategory?.code}"? Os jogadores mantêm-se.`
      : "Tens a certeza? Todos os resultados e jogos serão eliminados. Os jogadores e seeds mantêm-se.";
    if (!confirm(msg)) return;

    setResetting(true);
    setApiError(null);
    try {
      const body = hasMultipleCategories && activeCategory ? { categoryId: activeCategory.id } : {};
      const res = await fetch(`/api/tournament/${slug}/reset?token=${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Erro ao repor");
      }
      await fetchData();
      toast("Bracket eliminado. Categoria em modo rascunho.");
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setResetting(false);
    }
  }

  function handleMatchClick(match: Match) {
    if (!isAdmin) return;
    if (match.status === "bye") return;
    if (!match.team1Id || !match.team2Id) return;
    setSelectedMatch(match);
  }

  async function handleMatchStart(matchId: string, startedAtHHMM: string) {
    if (!isAdmin) return;
    try {
      const [h, m] = startedAtHHMM.split(":").map(Number);
      const startedAt = new Date();
      startedAt.setHours(h, m, 0, 0);
      const res = await fetch(`/api/tournament/${slug}/match/${matchId}?token=${token}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startedAt: startedAt.toISOString() }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Erro ao iniciar jogo");
      fetchData();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Erro ao iniciar jogo");
    }
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

  if (apiError || !data || !tournament) return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center">
      <p className="text-slate-500">{apiError ?? "Torneio não encontrado"}</p>
    </div>
  );

  const isDraft = tournament.status === "draft";
  const activeCategoryDraft = activeCategory?.status === "draft";
  const activeCategoryPlayers = activeCategory?.players ?? [];
  const checkedInPlayers = activeCategoryPlayers.filter((p) => p.checkedIn);
  const canGenerate = activeCategoryDraft && checkedInPlayers.length >= 2;
  const bracketUrl = token
    ? `/tournament/${slug}/bracket?token=${token}${activeCategory ? `&cat=${activeCategory.code}` : ""}`
    : `/tournament/${slug}/bracket${activeCategory ? `?cat=${activeCategory.code}` : ""}`;

  const activeMatchFormat = activeCategory?.matchFormat ?? tournament.matchFormat;
  const tournamentFormat = tournament.format;
  const tournamentGroupCount = tournament.groupCount;

  function renderBracket() {
    if (!activeCategory) return null;
    const catMatches = activeCategory.matches ?? [];
    const catPlayers = activeCategory.players ?? [];
    const catFormat = activeCategory.format ?? tournamentFormat;

    if (catFormat === "single_elimination") {
      return <SingleEliminationBracket matches={catMatches} isAdmin={isAdmin} onMatchClick={handleMatchClick} onMatchStart={handleMatchStart} />;
    }
    if (catFormat === "double_elimination") {
      return <DoubleEliminationBracket matches={catMatches} isAdmin={isAdmin} onMatchClick={handleMatchClick} onMatchStart={handleMatchStart} />;
    }
    if (catFormat === "round_robin") {
      return <RoundRobinTable matches={catMatches} players={catPlayers} isAdmin={isAdmin} onMatchClick={handleMatchClick} onMatchStart={handleMatchStart} />;
    }
    if (catFormat === "groups_knockout") {
      const gc = activeCategory.groupCount ?? tournamentGroupCount ?? 2;
      return <GroupStageView matches={catMatches} players={catPlayers} isAdmin={isAdmin} onMatchClick={handleMatchClick} onMatchStart={handleMatchStart} groupCount={gc} />;
    }
    if (catFormat === "fpp_auto" || (!catFormat && tournamentFormat === "fpp_auto")) {
      const gc = activeCategory.groupCount ?? tournamentGroupCount ?? 0;
      if (gc > 0) {
        return <GroupStageView matches={catMatches} players={catPlayers} isAdmin={isAdmin} onMatchClick={handleMatchClick} onMatchStart={handleMatchStart} groupCount={gc} />;
      }
      return <SingleEliminationBracket matches={catMatches} isAdmin={isAdmin} onMatchClick={handleMatchClick} onMatchStart={handleMatchStart} />;
    }
    return null;
  }

  const showBottomNav = !isDraft;

  const adminNavItems = [
    { key: "bracket" as const,       label: "Bracket",    icon: <IconBracket /> },
    { key: "schedule" as const,      label: "Agenda",     icon: <IconCalendar /> },
    { key: "registrations" as const, label: "Inscrições", icon: <IconUsers /> },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 pb-24 sm:pb-8">
      <TournamentHeader tournament={tournament} isAdmin={isAdmin} onUpdate={fetchData} />

      {isAdmin && <LinkShare slug={slug} adminToken={token} />}

      {/* Public quick links (desktop) */}
      {!isAdmin && !isDraft && (
        <div className="hidden sm:flex items-center gap-4 mb-1 text-sm">
          <Link href={`/tournament/${slug}/stats`} className="text-slate-500 hover:text-[#0E7C66] dark:hover:text-[#A3E635] transition-colors flex items-center gap-1">
            <IconStats /> Estatísticas
          </Link>
          <Link href={`/tournament/${slug}/minha-dupla`} className="text-slate-500 hover:text-[#0E7C66] dark:hover:text-[#A3E635] transition-colors flex items-center gap-1">
            <IconPerson /> Os meus jogos
          </Link>
          {pushNotifs.supported && (
            <button
              onClick={() => pushNotifs.subscribed ? pushNotifs.unsubscribe() : pushNotifs.subscribe()}
              className={`flex items-center gap-1 transition-colors ${pushNotifs.subscribed ? "text-[#0E7C66] dark:text-[#A3E635]" : "text-slate-500 hover:text-[#0E7C66] dark:hover:text-[#A3E635]"}`}
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill={pushNotifs.subscribed ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 01-3.46 0" />
              </svg>
              {pushNotifs.subscribed ? "Notificações ativas" : "Ativar notificações"}
            </button>
          )}
        </div>
      )}
      {!isAdmin && isDraft && tournament.registrationOpen && (
        <div className="flex items-center gap-4 mb-4 text-sm">
          <Link href={`/tournament/${slug}/register`} className="text-[#0E7C66] dark:text-[#A3E635] hover:underline flex items-center gap-1">
            Inscrever dupla →
          </Link>
        </div>
      )}

      {/* ── LEVEL-1 TABS (global — above everything) ────────────────────────── */}

      {/* Admin tabs: shown when tournament is not fully in draft */}
      {isAdmin && !isDraft && (
        <div className="hidden sm:flex gap-1 border-b border-slate-200 dark:border-slate-700 mb-0">
          {adminNavItems.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === key
                  ? "border-[#0E7C66] text-[#0E7C66] dark:text-[#A3E635] dark:border-[#0E7C66]"
                  : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              {label}
            </button>
          ))}
          {activeTab === "bracket" && (
            <div className="ml-auto flex items-center">
              <button
                onClick={handleReset}
                disabled={resetting}
                className="px-3 py-1.5 text-xs font-medium text-red-500 hover:text-red-700 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors disabled:opacity-50"
              >
                {resetting ? "A repor…" : `Repor${hasMultipleCategories && activeCategory ? ` ${activeCategory.code}` : " Bracket"}`}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Public tabs: Bracket | Horário */}
      {!isAdmin && !isDraft && (
        <div className="hidden sm:flex gap-1 border-b border-slate-200 dark:border-slate-700 mb-0">
          {([
            { key: "bracket" as const, label: "Bracket" },
            { key: "schedule" as const, label: "Horário" },
          ]).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setPublicTab(key)}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                publicTab === key
                  ? "border-[#0E7C66] text-[#0E7C66] dark:text-[#A3E635] dark:border-[#0E7C66]"
                  : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* ── LEVEL-2 TABS: Category tabs (only when viewing bracket) ─────────── */}
      {hasMultipleCategories && (isAdmin ? activeTab === "bracket" : publicTab === "bracket") && (
        <div className="mt-0 mb-4">
          <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-slate-200 dark:border-slate-700 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCat(cat.code)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-t-lg transition-colors border-b-2 -mb-px ${
                  activeCategory?.id === cat.id
                    ? "border-[#0E7C66] text-[#0E7C66] dark:text-[#A3E635] dark:border-[#0E7C66]"
                    : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                }`}
              >
                {cat.code}
                <Badge variant={STATUS_VARIANT[cat.status]} className="text-[10px] px-1 py-0">
                  {STATUS_LABEL[cat.status]}
                </Badge>
              </button>
            ))}
            {isAdmin && (
              <button
                onClick={() => setShowManageCategories(true)}
                className="ml-auto flex-shrink-0 text-xs text-slate-400 hover:text-[#0E7C66] transition-colors px-2 py-1"
              >
                + Gerir categorias
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── CONTENT ──────────────────────────────────────────────────────────── */}

      {tournament.status === "completed" && (
        <div className="rounded-xl bg-[#d1fae5]/40 dark:bg-[#0E7C66]/10 border border-[#0E7C66]/30 dark:border-[#0E7C66]/30 px-6 py-4 text-center mb-4">
          <p className="text-[#0E7C66] dark:text-[#A3E635] font-semibold text-lg">🏆 Torneio concluído!</p>
        </div>
      )}

      {/* Agenda / Horário tab */}
      {(isAdmin ? activeTab === "schedule" : publicTab === "schedule") && !isDraft && (
        <ScheduleManager
          tournament={tournament}
          allMatches={tournament.matches ?? []}
          categories={categories}
          token={token}
          isAdmin={isAdmin}
          onUpdate={fetchData}
        />
      )}

      {/* Inscrições tab (admin only) */}
      {isAdmin && activeTab === "registrations" && (
        <RegistrationPanel slug={slug} token={token} categories={categories} activeCategoryId={activeCategory?.id ?? null} onApproved={fetchData} />
      )}

      {/* Bracket tab */}
      {(isAdmin ? activeTab === "bracket" : (isDraft || publicTab === "bracket")) && (
        activeCategoryDraft ? (
          /* Draft category — setup view */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-4">
              <PlayerList
                players={activeCategoryPlayers}
                slug={slug}
                token={token}
                categoryId={activeCategory?.id ?? null}
                onUpdate={fetchData}
                disabled={!isAdmin}
              />
              {isAdmin && tournament.registrationOpen && (
                <RegistrationPanel
                  slug={slug}
                  token={token}
                  categories={categories}
                  activeCategoryId={activeCategory?.id ?? null}
                  onApproved={fetchData}
                />
              )}
              {isAdmin && (
                <>
                  {apiError && <p className="text-sm text-red-600 dark:text-red-400">{apiError}</p>}
                  <Button size="lg" className="w-full" disabled={!canGenerate} loading={generating} onClick={() => handleGenerate()}>
                    Gerar Bracket{hasMultipleCategories ? ` — ${activeCategory?.code}` : ""}
                  </Button>
                  {tournament.tournamentMode === "fpp_auto" && activeCategory && (
                    <p className="text-xs text-center text-slate-500 dark:text-slate-400">
                      {checkedInPlayers.length >= 2
                        ? <>FPP: {getFppFormatForCategory(checkedInPlayers.length).description}</>
                        : "FPP — sistema determinado quando gerado"}
                    </p>
                  )}
                  {!canGenerate && (
                    <p className="text-xs text-center text-slate-400">
                      Precisas de pelo menos 2 duplas confirmadas.
                    </p>
                  )}
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
                    <Link href={`/tournament/${slug}/register`} className="mt-3 inline-block text-sm text-[#0E7C66] dark:text-[#A3E635] hover:underline">
                      Inscrever dupla →
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* In-progress / completed — bracket view */
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
            <div className="xl:col-span-1 space-y-3 hidden xl:block">
              <PlayerList players={activeCategoryPlayers} slug={slug} token={token} categoryId={activeCategory?.id ?? null} onUpdate={fetchData} disabled />
              <Link href={`/tournament/${slug}/stats`} className="block text-center text-xs text-slate-400 hover:text-[#0E7C66] dark:hover:text-[#A3E635] transition-colors py-2">
                Ver estatísticas →
              </Link>
            </div>
            <div className="xl:col-span-3">
              <Card padding="md">
                <div className="flex items-center justify-end gap-3 mb-3">
                  <div className="flex items-center gap-2 mr-auto">
                    <a href={`/api/tournament/${slug}/export?format=csv`} download className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                      CSV
                    </a>
                    <a href={`/api/tournament/${slug}/export?format=ical`} download className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" /><path strokeLinecap="round" d="M16 2v4M8 2v4M3 10h18" /></svg>
                      iCal
                    </a>
                  </div>
                  <a href={bracketUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors">
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
                    Ecrã completo
                  </a>
                </div>
                <div className="overflow-x-auto">{renderBracket()}</div>
              </Card>
            </div>
          </div>
        )
      )}

      {/* FPP auto confirmation dialog */}
      {fppConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-sm p-5 space-y-4">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Confirmar Geração FPP</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Com <strong>{checkedInPlayers.length}</strong> duplas confirmadas o sistema será:
            </p>
            <div className="rounded-lg bg-[#d1fae5]/40 dark:bg-[#0E7C66]/10 border border-[#0E7C66]/30 dark:border-[#0E7C66]/30 px-3 py-2 text-sm text-[#0a6354] dark:text-[#A3E635]">
              <p className="font-semibold">{fppConfirm.description}</p>
              <p className="text-xs mt-0.5 opacity-80">Formato: {fppConfirm.matchFormat}</p>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setFppConfirm(null)}>Cancelar</Button>
              <Button loading={generating} onClick={() => doGenerate(fppConfirm.categoryId)}>Confirmar</Button>
            </div>
          </div>
        </div>
      )}

      <ScoreInputModal
        match={selectedMatch}
        slug={slug}
        token={token}
        matchFormat={activeMatchFormat}
        onClose={() => setSelectedMatch(null)}
        onSaved={fetchData}
      />

      {showManageCategories && (
        <ManageCategoriesModal
          slug={slug}
          token={token}
          categories={categories}
          onClose={() => setShowManageCategories(false)}
          onUpdate={fetchData}
        />
      )}

      {showBottomNav && (
        <>
          {isAdmin ? (
            <nav className="sm:hidden fixed bottom-0 inset-x-0 z-30 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 flex safe-bottom">
              {adminNavItems.map(({ key, label, icon }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`flex-1 flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors ${activeTab === key ? "text-[#0E7C66] dark:text-[#A3E635]" : "text-slate-400 dark:text-slate-500"}`}
                >
                  {icon}
                  {label}
                </button>
              ))}
            </nav>
          ) : (
            <TournamentBottomNav
              slug={slug}
              activeTab={publicTab}
              onTabChange={(tab) => setPublicTab(tab)}
            />
          )}
        </>
      )}
    </div>
  );
}
