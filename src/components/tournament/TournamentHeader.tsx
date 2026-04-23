"use client";

import Badge from "@/components/ui/Badge";
import type { Tournament } from "@/types";

const FORMAT_LABELS: Record<string, string> = {
  single_elimination: "Eliminação Simples",
  double_elimination: "Eliminação Dupla",
  round_robin: "Round Robin",
  groups_knockout: "Grupos + Eliminação",
};

const STATUS_VARIANT: Record<string, "default" | "info" | "success"> = {
  draft: "default",
  in_progress: "info",
  completed: "success",
};

const STATUS_LABEL: Record<string, string> = {
  draft: "Rascunho",
  in_progress: "Em progresso",
  completed: "Concluído",
};

interface TournamentHeaderProps {
  tournament: Tournament;
  isAdmin: boolean;
}

export default function TournamentHeader({ tournament, isAdmin }: TournamentHeaderProps) {
  return (
    <div className="mb-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant={STATUS_VARIANT[tournament.status]}>
              {STATUS_LABEL[tournament.status]}
            </Badge>
            <Badge>{FORMAT_LABELS[tournament.format]}</Badge>
            {isAdmin && (
              <Badge variant="warning">Admin</Badge>
            )}
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {tournament.name}
          </h1>
          {tournament.description && (
            <p className="mt-1 text-slate-500 dark:text-slate-400 text-sm">
              {tournament.description}
            </p>
          )}
        </div>
        <div className="text-right text-sm text-slate-500 dark:text-slate-400 shrink-0">
          <p>Sets para ganhar: <strong>{tournament.setsToWin}</strong></p>
          <p>Pontos por set: <strong>{tournament.pointsPerSet}</strong></p>
        </div>
      </div>
    </div>
  );
}
