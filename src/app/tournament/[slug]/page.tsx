"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import TournamentHeader from "@/components/tournament/TournamentHeader";
import PlayerList from "@/components/tournament/PlayerList";
import LinkShare from "@/components/tournament/LinkShare";
import ScoreInputModal from "@/components/tournament/ScoreInputModal";
import SingleEliminationBracket from "@/components/bracket/SingleEliminationBracket";
import DoubleEliminationBracket from "@/components/bracket/DoubleEliminationBracket";
import RoundRobinTable from "@/components/bracket/RoundRobinTable";
import GroupStageView from "@/components/bracket/GroupStageView";
import Button from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { Tournament, Player, Match } from "@/types";

interface TournamentData {
  tournament: Tournament & { players: Player[]; matches: Match[] };
}

export default function TournamentPage() {
  const { slug } = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const isAdmin = Boolean(token);

  const [data, setData] = useState<TournamentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);

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

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleGenerate() {
    setGenerating(true);
    setApiError(null);
    try {
      const res = await fetch(`/api/tournament/${slug}/generate?token=${token}`, {
        method: "POST",
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Erro ao gerar bracket");
      }
      await fetchData();
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="animate-spin h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (apiError || !data) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <p className="text-slate-500">{apiError ?? "Torneio não encontrado"}</p>
      </div>
    );
  }

  const { tournament } = data;
  const isDraft = tournament.status === "draft";
  const canGenerate = isDraft && tournament.players.length >= 2;

  function renderBracket() {
    const { matches, players, format, groupCount } = tournament;

    if (format === "single_elimination") {
      return (
        <SingleEliminationBracket
          matches={matches}
          isAdmin={isAdmin}
          onMatchClick={handleMatchClick}
        />
      );
    }
    if (format === "double_elimination") {
      return (
        <DoubleEliminationBracket
          matches={matches}
          isAdmin={isAdmin}
          onMatchClick={handleMatchClick}
        />
      );
    }
    if (format === "round_robin") {
      return (
        <RoundRobinTable
          matches={matches}
          players={players}
          isAdmin={isAdmin}
          onMatchClick={handleMatchClick}
        />
      );
    }
    if (format === "groups_knockout") {
      return (
        <GroupStageView
          matches={matches}
          players={players}
          isAdmin={isAdmin}
          onMatchClick={handleMatchClick}
          groupCount={groupCount ?? 2}
        />
      );
    }
    return null;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <TournamentHeader tournament={tournament} isAdmin={isAdmin} />

      {isAdmin && <LinkShare slug={slug} adminToken={token} />}

      {/* Draft state: two-column layout */}
      {isDraft ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <PlayerList
              players={tournament.players}
              slug={slug}
              token={token}
              onUpdate={fetchData}
              disabled={false}
            />

            {isAdmin && (
              <>
                {apiError && (
                  <p className="text-sm text-red-600 dark:text-red-400">{apiError}</p>
                )}
                <Button
                  size="lg"
                  className="w-full"
                  disabled={!canGenerate}
                  loading={generating}
                  onClick={handleGenerate}
                >
                  Gerar Bracket
                </Button>
                {!canGenerate && (
                  <p className="text-xs text-center text-slate-400">
                    Precisas de pelo menos 2 jogadores.
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
                  {isAdmin
                    ? "Adiciona os jogadores e clica em Gerar Bracket."
                    : "O administrador ainda não gerou o bracket."}
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* In-progress / completed: bracket fills the page */
        <div className="space-y-6">
          {tournament.status === "completed" && (
            <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 px-6 py-4 text-center">
              <p className="text-emerald-700 dark:text-emerald-400 font-semibold text-lg">
                🏆 Torneio concluído!
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
            {/* Sidebar: player list (read-only) */}
            <div className="xl:col-span-1">
              <PlayerList
                players={tournament.players}
                slug={slug}
                token={token}
                onUpdate={fetchData}
                disabled
              />
            </div>

            {/* Main: bracket */}
            <div className="xl:col-span-3">
              <Card padding="md">
                <div className="overflow-x-auto">
                  {renderBracket()}
                </div>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* Score input modal */}
      <ScoreInputModal
        match={selectedMatch}
        slug={slug}
        token={token}
        onClose={() => setSelectedMatch(null)}
        onSaved={fetchData}
      />
    </div>
  );
}
