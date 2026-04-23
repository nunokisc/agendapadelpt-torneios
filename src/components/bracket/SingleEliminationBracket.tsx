"use client";

import { useMemo } from "react";
import MatchCard from "./MatchCard";
import BracketConnector from "./BracketConnector";
import type { Match } from "@/types";

// Layout constants
const CARD_W = 220;
const CARD_H = 72;
const COL_GAP = 60; // horizontal gap between rounds
const ROW_GAP = 16; // vertical gap between cards in same round

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

  if (winners.length === 0) {
    return (
      <div className="text-center py-16 text-slate-400 text-sm">
        Bracket ainda não gerado.
      </div>
    );
  }

  const maxRound = Math.max(...winners.map((m) => m.round));

  return (
    <div className="overflow-x-auto pb-4">
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
            style={{ width: CARD_W, marginLeft: COL_GAP - CARD_W - COL_GAP + (CARD_W + COL_GAP) * (maxRound - 1) + CARD_W + COL_GAP }}
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
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
