"use client";

import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import type { Match, SetScore } from "@/types";

interface MatchCardProps {
  match: Match;
  isAdmin: boolean;
  onClick?: () => void;
  onStart?: (matchId: string, startedAt: string) => void;
  highlight?: boolean;
  compact?: boolean;
}

// Live elapsed timer — shows mm:ss since startedAt
function ElapsedTimer({ startedAt }: { startedAt: Date }) {
  const [elapsed, setElapsed] = useState(() => Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));

  useEffect(() => {
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  const m = Math.floor(elapsed / 60);
  const s = elapsed % 60;
  const isLong = m >= 90;
  return (
    <span className={cn(
      "font-mono text-[10px] font-semibold tabular-nums",
      isLong ? "text-red-500 dark:text-red-400" : "text-blue-600 dark:text-blue-400"
    )}>
      {String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}
    </span>
  );
}

export default function MatchCard({ match, isAdmin, onClick, onStart, highlight, compact }: MatchCardProps) {
  const scores: SetScore[] = match.scores ? JSON.parse(match.scores) : [];
  const [showStart, setShowStart] = useState(false);
  const [startTime, setStartTime] = useState("");

  function nowHHMM() {
    const n = new Date();
    return `${String(n.getHours()).padStart(2, "0")}:${String(n.getMinutes()).padStart(2, "0")}`;
  }

  const team1Sets = scores.filter((s) => s.team1 > s.team2).length;
  const team2Sets = scores.filter((s) => s.team2 > s.team1).length;

  const isBye = match.status === "bye";
  const isCompleted = match.status === "completed";
  const isInProgress = match.status === "in_progress";

  const canEdit =
    isAdmin &&
    !isBye &&
    match.team1Id &&
    match.team2Id;

  const isRescore = canEdit && isCompleted;
  const canStart = canEdit && match.status === "pending" && !!onStart;

  const statusBg = isBye
    ? "border-dashed border-gray-200 bg-gray-50 dark:border-slate-700 dark:bg-slate-900/50"
    : isCompleted
    ? "border-[#0E7C66]/30 bg-[#d1fae5]/40 dark:border-[#0E7C66]/30 dark:bg-[#0E7C66]/10"
    : isInProgress
    ? "border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-950/20"
    : "border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-900";

  function PlayerRow({
    name,
    sets,
    isWinner,
  }: {
    name?: string;
    sets?: number;
    isWinner?: boolean;
  }) {
    return (
      <div
        className={cn(
          "flex items-center justify-between px-3 py-1.5 text-sm",
          isCompleted && !isWinner && "opacity-40"
        )}
      >
        <span
          className={cn(
            compact ? "truncate flex-1 min-w-0" : "truncate max-w-[170px]",
            isWinner ? "font-bold text-[#0E7C66] dark:text-[#A3E635]" : "text-gray-700 dark:text-slate-300",
            !name && "text-gray-300 dark:text-slate-600 italic"
          )}
        >
          {name ?? (isBye ? "—" : "A determinar")}
        </span>
        {isCompleted && sets !== undefined && (
          <span
            className={cn(
              "font-mono text-xs font-bold ml-2 shrink-0",
              isWinner ? "text-[#0E7C66] dark:text-[#A3E635]" : "text-gray-400"
            )}
          >
            {sets}
          </span>
        )}
      </div>
    );
  }

  const hasSchedule = !isBye && (match.court || match.scheduledAt);
  const scheduleLabel = [
    match.court,
    match.scheduledAt
      ? new Date(match.scheduledAt).toLocaleString("pt-PT", {
          day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
        })
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div
      className={cn(
        compact ? "w-full" : "w-[260px]",
        "rounded-lg border-2 overflow-hidden transition-all select-none",
        highlight ? "border-yellow-400 shadow-yellow-200 shadow-md dark:border-yellow-500 dark:shadow-yellow-900/50" : statusBg,
        (canEdit && !isInProgress) && "cursor-pointer hover:border-[#0E7C66]/50 hover:shadow-md active:scale-95"
      )}
      style={{ minHeight: 72 }}
      onClick={(canEdit && !isInProgress) ? onClick : undefined}
      title={canEdit && !isInProgress ? (isRescore ? "Clica para editar resultado" : "Clica para introduzir resultado") : undefined}
    >
      {isBye ? (
        <div className="flex items-center justify-center h-full py-4 text-xs text-gray-400 italic">
          bye
        </div>
      ) : (
        <>
          <div className="divide-y divide-gray-100 dark:divide-slate-700/50">
            <PlayerRow
              name={match.team1?.name}
              sets={team1Sets}
              isWinner={isCompleted && match.winnerId === match.team1Id}
            />
            <PlayerRow
              name={match.team2?.name}
              sets={team2Sets}
              isWinner={isCompleted && match.winnerId === match.team2Id}
            />
          </div>

          {/* In-progress bar: timer + button to enter result */}
          {isInProgress && (
            <div className="px-3 py-1.5 border-t border-blue-100 dark:border-blue-800/50 bg-blue-50/60 dark:bg-blue-950/20 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
                <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">Em curso</span>
                {match.startedAt && <ElapsedTimer startedAt={new Date(match.startedAt)} />}
              </div>
              {canEdit && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onClick?.(); }}
                  className="text-[10px] font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 transition-colors active:scale-95"
                >
                  Resultado →
                </button>
              )}
            </div>
          )}

          {/* Schedule row (hidden when in-progress — replaced by timer bar) */}
          {!isInProgress && hasSchedule && (
            <div className="px-3 py-1 border-t border-gray-100 dark:border-slate-700/50 bg-gray-50/60 dark:bg-slate-800/40 flex items-center justify-between gap-2">
              <p className="text-[10px] text-gray-500 dark:text-slate-400 truncate">
                {scheduleLabel}
              </p>
              {/* Iniciar button — only for admin on pending matches with both teams */}
              {canStart && (
                showStart ? (
                  <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="text-[10px] border border-slate-300 dark:border-slate-600 rounded px-1 py-px bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 w-[4.5rem]"
                    />
                    <button
                      type="button"
                      onClick={() => { onStart!(match.id, startTime); setShowStart(false); }}
                      className="text-[10px] font-bold text-[#0E7C66] dark:text-[#A3E635] hover:text-[#0a6354] transition-colors"
                      title="Confirmar início"
                    >✓</button>
                    <button
                      type="button"
                      onClick={() => setShowStart(false)}
                      className="text-[10px] font-semibold text-gray-400 hover:text-gray-600 transition-colors"
                      title="Cancelar"
                    >✕</button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setStartTime(nowHHMM()); setShowStart(true); }}
                    className="shrink-0 text-[10px] font-semibold text-[#0E7C66] dark:text-[#A3E635] hover:text-[#0a6354] dark:hover:text-white transition-colors active:scale-95 touch-manipulation"
                    title="Marcar jogo como iniciado"
                  >
                    ▶ Iniciar
                  </button>
                )
              )}
            </div>
          )}

          {/* Iniciar button when no schedule row — only admin + pending + both teams */}
          {!isInProgress && !hasSchedule && canStart && (
            <div className="px-3 py-1 border-t border-gray-100 dark:border-slate-700/50 bg-gray-50/60 dark:bg-slate-800/40 flex justify-end">
              {showStart ? (
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="text-[10px] border border-gray-300 dark:border-slate-600 rounded px-1 py-px bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-200 w-[4.5rem]"
                  />
                  <button
                    type="button"
                    onClick={() => { onStart!(match.id, startTime); setShowStart(false); }}
                    className="text-[10px] font-bold text-[#0E7C66] dark:text-[#A3E635] hover:text-[#0a6354] transition-colors"
                    title="Confirmar início"
                  >✓</button>
                  <button
                    type="button"
                    onClick={() => setShowStart(false)}
                    className="text-[10px] font-semibold text-gray-400 hover:text-gray-600 transition-colors"
                    title="Cancelar"
                  >✕</button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setStartTime(nowHHMM()); setShowStart(true); }}
                  className="text-[10px] font-semibold text-[#0E7C66] dark:text-[#A3E635] hover:text-[#0a6354] dark:hover:text-white transition-colors active:scale-95 touch-manipulation"
                  title="Marcar jogo como iniciado"
                >
                  ▶ Iniciar
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
