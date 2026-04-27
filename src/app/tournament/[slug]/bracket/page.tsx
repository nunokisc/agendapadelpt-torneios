"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import SingleEliminationBracket from "@/components/bracket/SingleEliminationBracket";
import DoubleEliminationBracket from "@/components/bracket/DoubleEliminationBracket";
import RoundRobinTable from "@/components/bracket/RoundRobinTable";
import GroupStageView from "@/components/bracket/GroupStageView";
import ScoreInputModal from "@/components/tournament/ScoreInputModal";
import type { Tournament, Player, Match } from "@/types";

interface TournamentData {
  tournament: Tournament & { players: Player[]; matches: Match[] };
}

export default function FullscreenBracketPage() {
  const { slug } = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const isAdmin = Boolean(token);

  const [data, setData] = useState<TournamentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/tournament/${slug}`);
      if (!res.ok) return;
      const json = await res.json();
      setData(json);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function handleMatchClick(match: Match) {
    if (!isAdmin) return;
    if (match.status === "bye") return;
    if (!match.team1Id || !match.team2Id) return;
    setSelectedMatch(match);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-sm">
        Torneio não encontrado.
      </div>
    );
  }

  const { tournament } = data;

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
    if (format === "fpp_auto") {
      if ((groupCount ?? 0) > 0) {
        return (
          <GroupStageView
            matches={matches}
            players={players}
            isAdmin={isAdmin}
            onMatchClick={handleMatchClick}
            groupCount={groupCount!}
          />
        );
      }
      return (
        <SingleEliminationBracket
          matches={matches}
          isAdmin={isAdmin}
          onMatchClick={handleMatchClick}
        />
      );
    }
    return null;
  }

  const backUrl = token ? `/tournament/${slug}?token=${token}` : `/tournament/${slug}`;

  return (
    <div className="min-h-screen bg-slate-950 text-white print:bg-white print:text-slate-900">
      {/* Minimal top bar — hidden on print */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 print:hidden">
        <div>
          <h1 className="text-lg font-bold text-slate-100">{tournament.name}</h1>
          <p className="text-xs text-slate-400 mt-0.5 font-mono">{tournament.matchFormat}</p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => window.print()}
            className="text-sm text-slate-400 hover:text-white transition-colors flex items-center gap-1.5"
            title="Imprimir bracket"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Imprimir
          </button>
          <Link
            href={backUrl}
            className="text-sm text-slate-400 hover:text-white transition-colors flex items-center gap-1.5"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Voltar
          </Link>
        </div>
      </div>

      {/* Print-only header */}
      <div className="hidden print:block px-6 py-4 border-b border-slate-200 mb-4">
        <h1 className="text-xl font-bold text-slate-900">{tournament.name}</h1>
        <p className="text-sm text-slate-500 mt-0.5">{tournament.matchFormat}</p>
      </div>

      {/* Bracket */}
      <div className="p-6 overflow-auto print:overflow-visible print:p-4">
        {renderBracket()}
      </div>

      {isAdmin && (
        <ScoreInputModal
          match={selectedMatch}
          slug={slug}
          token={token}
          matchFormat={tournament.matchFormat}
          onClose={() => setSelectedMatch(null)}
          onSaved={fetchData}
        />
      )}
    </div>
  );
}
