"use client";

import { cn } from "@/lib/utils";
import type { Match, SetScore } from "@/types";

interface MatchCardProps {
  match: Match;
  isAdmin: boolean;
  onClick?: () => void;
  highlight?: boolean;
}

export default function MatchCard({ match, isAdmin, onClick, highlight }: MatchCardProps) {
  const scores: SetScore[] = match.scores ? JSON.parse(match.scores) : [];
  const team1Sets = scores.filter((s) => s.team1 > s.team2).length;
  const team2Sets = scores.filter((s) => s.team2 > s.team1).length;

  const isBye = match.status === "bye";
  const isCompleted = match.status === "completed";

  const canEdit =
    isAdmin &&
    !isBye &&
    match.team1Id &&
    match.team2Id;

  const statusBg = isBye
    ? "border-dashed border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/50"
    : isCompleted
    ? "border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/20"
    : match.status === "in_progress"
    ? "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20"
    : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900";

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
            "truncate max-w-[170px]",
            isWinner ? "font-bold text-emerald-700 dark:text-emerald-400" : "text-slate-700 dark:text-slate-300",
            !name && "text-slate-300 dark:text-slate-600 italic"
          )}
        >
          {name ?? (isBye ? "—" : "A determinar")}
        </span>
        {isCompleted && sets !== undefined && (
          <span
            className={cn(
              "font-mono text-xs font-bold ml-2 shrink-0",
              isWinner ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"
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
        "w-[260px] rounded-lg border-2 overflow-hidden transition-all select-none",
        highlight ? "border-yellow-400 shadow-yellow-200 shadow-md dark:border-yellow-500 dark:shadow-yellow-900/50" : statusBg,
        canEdit && "cursor-pointer hover:border-emerald-400 hover:shadow-md active:scale-95"
      )}
      style={{ minHeight: 72 }}
      onClick={canEdit ? onClick : undefined}
      title={canEdit ? "Clica para introduzir resultado" : undefined}
    >
      {isBye ? (
        <div className="flex items-center justify-center h-full py-4 text-xs text-slate-400 italic">
          bye
        </div>
      ) : (
        <>
          <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
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
          {hasSchedule && (
            <div className="px-3 py-1 border-t border-slate-100 dark:border-slate-700/50 bg-slate-50/60 dark:bg-slate-800/40">
              <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                {scheduleLabel}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
