"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Badge from "@/components/ui/Badge";

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
  in_progress: "Em curso",
  completed: "Concluído",
};

interface TournamentEntry {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  format: string;
  matchFormat: string;
  status: string;
  registrationOpen: boolean;
  createdAt: string;
  _count: { players: number; matches: number };
}

export default function TorneiosPage() {
  const [tournaments, setTournaments] = useState<TournamentEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/tournaments")
      .then((r) => r.json())
      .then((d) => setTournaments(d.tournaments ?? []))
      .finally(() => setLoading(false));
  }, []);

  const filtered = tournaments.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      (t.description ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Torneios</h1>
        <p className="mt-2 text-slate-500 dark:text-slate-400 text-sm">
          Torneios públicos disponíveis na plataforma.
        </p>
      </div>

      <div className="mb-6">
        <input
          type="search"
          placeholder="Pesquisar torneios..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-2xl mb-2">🎾</p>
          <p className="text-slate-500">
            {search ? "Nenhum torneio encontrado." : "Ainda não há torneios públicos."}
          </p>
          <Link href="/" className="mt-4 inline-block text-sm text-emerald-600 hover:underline">
            Criar um torneio →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filtered.map((t) => (
            <Link
              key={t.id}
              href={`/tournament/${t.slug}`}
              className="group rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <h2 className="font-semibold text-slate-800 dark:text-slate-200 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors leading-tight">
                  {t.name}
                </h2>
                <Badge variant={STATUS_VARIANT[t.status]}>{STATUS_LABEL[t.status]}</Badge>
              </div>
              {t.description && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 line-clamp-2">{t.description}</p>
              )}
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>{FORMAT_LABELS[t.format] ?? t.format} · {t.matchFormat}</span>
                <span>{t._count.players} equipa{t._count.players !== 1 ? "s" : ""}</span>
              </div>
              {t.registrationOpen && (
                <div className="mt-2">
                  <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 font-medium">
                    Inscrições abertas
                  </span>
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
