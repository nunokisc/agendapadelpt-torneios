"use client";

import { useMemo, useState } from "react";
import MatchCard from "./MatchCard";
import BracketConnector from "./BracketConnector";
import type { Match } from "@/types";

// Layout constants — CARD_W must match MatchCard's w-[260px]
const CARD_W = 260;
const CARD_H = 72;
const COL_GAP = 48; // horizontal gap between rounds
const ROW_GAP = 12; // vertical gap between cards in same round

interface Props {
  matches: Match[];
  isAdmin: boolean;
  onMatchClick: (match: Match) => void;
}

function getRoundName(round: number, totalRounds: number): string {
  const remaining = totalRounds - round + 1;
  if (remaining === 1) return "Final";
  if (remaining === 2) return "Meias-Finais";
  if (remaining === 3) return "Quartos";
  return `Ronda ${round}`;
}

export default function SingleEliminationBracket({ matches, isAdmin, onMatchClick }: Props) {
  const [mobileRound, setMobileRound] = useState(1);
  const { rounds, positions, svgConnectors, totalWidth, totalHeight } = useMemo(() => {
    const winners = matches.filter((m) => m.bracketType === "winners");
    const thirdPlace = matches.filter((m) => m.bracketType === "third_place");

    if (winners.length === 0) return { rounds: [], positions: {}, svgConnectors: [], totalWidth: 0, totalHeight: 0 };

    const maxRound = Math.max(...winners.map((m) => m.round));
    const roundNums = Array.from({ length: maxRound }, (_, i) => i + 1);

    // Matches per round
    const byRound = new Map<number, Match[]>();
    for (const m of winners) {
      const arr = byRound.get(m.round) ?? [];
      arr.push(m);
      byRound.set(m.round, arr.sort((a, b) => a.position - b.position));
    }

    // Column x positions
    const colX = (r: number) => (r - 1) * (CARD_W + COL_GAP);

    // For each match, compute its vertical center
    // Round 1: evenly distributed
    // Later rounds: average of their two feeder matches
    const centers = new Map<string, number>();
    const matchById = new Map<string, Match>();
    for (const m of winners) matchById.set(m.id, m);

    function getCenter(m: Match): number {
      if (centers.has(m.id)) return centers.get(m.id)!;
      if (m.round === 1) {
        const r1 = byRound.get(1)!;
        const idx = r1.findIndex((x) => x.id === m.id);
        const slotH = CARD_H + ROW_GAP;
        const c = idx * slotH + CARD_H / 2;
        centers.set(m.id, c);
        return c;
      }
      // Find feeders (matches in round-1 whose nextMatchId === m.id)
      const feeders = (byRound.get(m.round - 1) ?? []).filter(
        (x) => x.nextMatchId === m.id
      );
      let c: number;
      if (feeders.length === 2) {
        c = (getCenter(feeders[0]) + getCenter(feeders[1])) / 2;
      } else if (feeders.length === 1) {
        c = getCenter(feeders[0]);
      } else {
        // fallback
        const r = byRound.get(m.round)!;
        const idx = r.findIndex((x) => x.id === m.id);
        c = idx * (CARD_H + ROW_GAP) * Math.pow(2, m.round - 1) + CARD_H / 2;
      }
      centers.set(m.id, c);
      return c;
    }

    // Build positions {matchId → {x, y}}
    const positions: Record<string, { x: number; y: number }> = {};
    for (const m of winners) {
      const cy = getCenter(m);
      positions[m.id] = { x: colX(m.round), y: cy - CARD_H / 2 };
    }

    // Third place match — below the final column
    for (const m of thirdPlace) {
      const finalY = (byRound.get(maxRound)?.[0] ? getCenter(byRound.get(maxRound)![0]) : 0);
      positions[m.id] = { x: colX(maxRound), y: finalY + CARD_H + 40 };
    }

    // SVG connector lines
    const svgConnectors: {
      x1: number; y1: number; x2: number; y2: number; active: boolean; key: string;
    }[] = [];

    for (const m of winners) {
      if (!m.nextMatchId) continue;
      const src = positions[m.id];
      const dst = positions[m.nextMatchId];
      if (!src || !dst) continue;
      svgConnectors.push({
        x1: src.x + CARD_W,
        y1: src.y + CARD_H / 2,
        x2: dst.x,
        y2: dst.y + CARD_H / 2,
        active: m.status === "completed",
        key: m.id,
      });
    }

    // Dimensions
    const allMatches = [...winners, ...thirdPlace];
    const maxX = Math.max(...allMatches.map((m) => (positions[m.id]?.x ?? 0) + CARD_W));
    const maxY = Math.max(...allMatches.map((m) => (positions[m.id]?.y ?? 0) + CARD_H));

    return {
      rounds: roundNums,
      positions,
      svgConnectors,
      totalWidth: maxX + 20,
      totalHeight: maxY + 20,
    };
  }, [matches]);

  const winners = matches.filter((m) => m.bracketType === "winners");
  const thirdPlace = matches.filter((m) => m.bracketType === "third_place");
  const allVisible = [...winners, ...thirdPlace];

  // Compute winner path: all match IDs won by the overall tournament winner
  const finalMatch = winners.find((m) => m.round === Math.max(...winners.map((x) => x.round)));
  const tournamentWinnerId = finalMatch?.winnerId ?? null;
  const winnerPathIds = new Set(
    tournamentWinnerId
      ? allVisible.filter((m) => m.winnerId === tournamentWinnerId).map((m) => m.id)
      : []
  );

  if (winners.length === 0) {
    return (
      <div className="text-center py-16 text-slate-400 text-sm">
        Bracket ainda não gerado.
      </div>
    );
  }

  const maxRound = Math.max(...winners.map((m) => m.round));

  // Mobile view: round tabs + list of matches for selected round
  const allRoundNums = Array.from(new Set([...winners, ...thirdPlace].map((m) => m.round))).sort((a, b) => a - b);
  const mobileRoundMatches = matches.filter((m) => m.round === mobileRound && m.status !== "bye");
  const hasMobileRound = mobileRoundMatches.length > 0;

  return (
    <>
    {/* Mobile view */}
    <div className="sm:hidden">
      {/* Round tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 mb-4 border-b border-slate-200 dark:border-slate-700">
        {allRoundNums.map((r) => {
          const isThird = thirdPlace.some((m) => m.round === r);
          const label = isThird ? "3º/4º" : getRoundName(r, maxRound);
          return (
            <button
              key={r}
              onClick={() => setMobileRound(r)}
              className={`shrink-0 px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                mobileRound === r
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Matches list for selected round */}
      {!hasMobileRound ? (
        <p className="text-center text-sm text-slate-400 py-8">Nenhum jogo nesta ronda.</p>
      ) : (
        <div className="space-y-3">
          {mobileRoundMatches.map((m) => (
            <div key={m.id} className="flex flex-col gap-1">
              {m.scheduledAt || m.court ? (
                <p className="text-xs text-slate-400 px-1">
                  {m.court && <span className="font-medium text-slate-500">{m.court}</span>}
                  {m.court && m.scheduledAt && " · "}
                  {m.scheduledAt && new Date(m.scheduledAt).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })}
                </p>
              ) : null}
              <MatchCard
                match={m}
                isAdmin={isAdmin}
                onClick={() => onMatchClick(m)}
                highlight={winnerPathIds.has(m.id)}
              />
            </div>
          ))}
        </div>
      )}
    </div>

    {/* Desktop view */}
    <div className="hidden sm:block overflow-x-auto pb-4">
      {/* Round headers */}
      <div className="flex mb-3" style={{ minWidth: totalWidth }}>
        {rounds.map((r) => (
          <div
            key={r}
            className="text-xs font-semibold text-slate-500 uppercase tracking-wide text-center"
            style={{ width: CARD_W, marginRight: r < rounds.length ? COL_GAP : 0 }}
          >
            {getRoundName(r, maxRound)}
          </div>
        ))}
        {thirdPlace.length > 0 && (
          <div
            className="text-xs font-semibold text-amber-500 uppercase tracking-wide text-center"
            style={{ width: CARD_W, marginLeft: COL_GAP }}
          >
            3.º / 4.º lugar
          </div>
        )}
      </div>

      {/* SVG + match cards */}
      <div className="relative" style={{ width: totalWidth, height: totalHeight }}>
        {/* Connector lines */}
        <svg
          className="absolute inset-0 pointer-events-none"
          width={totalWidth}
          height={totalHeight}
        >
          {svgConnectors.map(({ key, ...rest }) => (
            <BracketConnector key={key} {...rest} />
          ))}
        </svg>

        {/* Match cards */}
        {allVisible.map((m) => {
          const pos = positions[m.id];
          if (!pos) return null;
          return (
            <div
              key={m.id}
              className="absolute"
              style={{ left: pos.x, top: pos.y }}
            >
              <MatchCard
                match={m}
                isAdmin={isAdmin}
                onClick={() => onMatchClick(m)}
                highlight={winnerPathIds.has(m.id)}
              />
            </div>
          );
        })}
      </div>
    </div>
    </>
  );
}
