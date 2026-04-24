"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import Badge from "@/components/ui/Badge";

const FORMAT_LABELS: Record<string, string> = {
  single_elimination: "Elim. Simples",
  double_elimination: "Elim. Dupla",
  round_robin: "Round Robin",
  groups_knockout: "Grupos + KO",
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

interface Tournament {
  id: string;
  slug: string;
  adminToken: string;
  name: string;
  description: string | null;
  format: string;
  matchFormat: string;
  status: string;
  thirdPlace: boolean;
  groupCount: number | null;
  advanceCount: number | null;
  createdAt: string;
  _count: { players: number; matches: number; registrations: number };
  matchesCompleted: number;
  matchesPending: number;
}

interface PlatformStats {
  totalTournaments: number;
  totalMatches: number;
  completedMatches: number;
  pendingMatches: number;
  pendingRegistrations: number;
  byStatus: { draft: number; in_progress: number; completed: number };
}

function AdminPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [token, setToken] = useState(searchParams.get("token") ?? "");
  const [input, setInput] = useState(searchParams.get("token") ?? "");
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [platformStats, setPlatformStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const fetchTournaments = useCallback(async (t: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin?token=${encodeURIComponent(t)}`);
      if (res.status === 401) {
        setError("Token inválido.");
        setTournaments([]);
        return;
      }
      const data = await res.json();
      setTournaments(data.tournaments ?? []);
      if (data.stats) setPlatformStats(data.stats);
    } catch {
      setError("Erro ao carregar torneios.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) fetchTournaments(token);
  }, [token, fetchTournaments]);

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    router.replace(`/admin?token=${encodeURIComponent(input.trim())}`);
    setToken(input.trim());
  }

  const filtered = tournaments.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.slug.toLowerCase().includes(search.toLowerCase())
  );

  // ── Login screen ──────────────────────────────────────────────────────────
  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <span className="text-4xl">🛡️</span>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-3">
              Painel de Administração
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Introduz o token da plataforma para continuar.
            </p>
          </div>
          <form onSubmit={handleLogin} className="space-y-3">
            <input
              type="password"
              placeholder="Token de administração"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              autoFocus
            />
            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
            <button
              type="submit"
              className="w-full rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 text-sm transition-colors"
            >
              Entrar
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ── Dashboard ─────────────────────────────────────────────────────────────
  const total = tournaments.length;
  const byStatus = platformStats?.byStatus ?? {
    draft: tournaments.filter((t) => t.status === "draft").length,
    in_progress: tournaments.filter((t) => t.status === "in_progress").length,
    completed: tournaments.filter((t) => t.status === "completed").length,
  };

  // Tournaments that need admin attention
  const needsAction = tournaments.filter(
    (t) => t.status === "in_progress" && t.matchesPending > 0
  ).sort((a, b) => b.matchesPending - a.matchesPending);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              🛡️ Painel de Administração
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {total} torneio{total !== 1 ? "s" : ""} registados
            </p>
          </div>
          <Link
            href="/"
            className="text-sm text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            ← Início
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: "Total", value: total, color: "text-slate-700 dark:text-slate-200" },
            { label: "Rascunho", value: byStatus.draft, color: "text-slate-500" },
            { label: "Em curso", value: byStatus.in_progress, color: "text-blue-600 dark:text-blue-400" },
            { label: "Concluídos", value: byStatus.completed, color: "text-emerald-600 dark:text-emerald-400" },
            { label: "Jogos feitos", value: platformStats?.completedMatches ?? "-", color: "text-emerald-600 dark:text-emerald-400" },
            { label: "Jogos pendentes", value: platformStats?.pendingMatches ?? "-", color: "text-amber-600 dark:text-amber-400" },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3"
            >
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{s.label}</p>
              <p className={`text-2xl font-bold mt-0.5 ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Needs action */}
        {needsAction.length > 0 && (
          <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 p-4">
            <h3 className="text-sm font-semibold text-amber-700 dark:text-amber-400 mb-2">
              ⚡ Torneios com jogos por preencher
            </h3>
            <div className="space-y-1.5">
              {needsAction.slice(0, 5).map((t) => (
                <div key={t.id} className="flex items-center justify-between text-sm">
                  <span className="text-slate-700 dark:text-slate-300 truncate max-w-[200px]">{t.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-amber-600 dark:text-amber-400 font-mono">
                      {t.matchesPending} pendente{t.matchesPending !== 1 ? "s" : ""}
                    </span>
                    <Link
                      href={`/tournament/${t.slug}?token=${t.adminToken}`}
                      target="_blank"
                      className="text-xs px-2 py-0.5 rounded bg-amber-600 hover:bg-amber-700 text-white font-medium transition-colors"
                    >
                      Ir
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Search + Table */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
            <input
              type="search"
              placeholder="Pesquisar por nome ou slug..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full max-w-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin h-6 w-6 border-4 border-emerald-500 border-t-transparent rounded-full" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-sm text-slate-400 py-12">
              {search ? "Nenhum torneio encontrado." : "Ainda não existem torneios."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-100 dark:border-slate-800">
                    <th className="text-left px-4 py-2.5">Nome</th>
                    <th className="text-left px-4 py-2.5 hidden sm:table-cell">Formato</th>
                    <th className="text-left px-4 py-2.5 hidden md:table-cell">Jogo</th>
                    <th className="text-center px-4 py-2.5">Estado</th>
                    <th className="text-center px-4 py-2.5 hidden sm:table-cell">Duplas</th>
                    <th className="text-left px-4 py-2.5 hidden lg:table-cell">Criado em</th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((t) => (
                    <tr
                      key={t.id}
                      className="border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800 dark:text-slate-200 truncate max-w-[200px]">
                          {t.name}
                        </p>
                        <p className="text-xs text-slate-400 font-mono mt-0.5">{t.slug}</p>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell text-slate-600 dark:text-slate-400">
                        {FORMAT_LABELS[t.format] ?? t.format}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="font-mono text-xs font-bold text-slate-600 dark:text-slate-400">
                          {t.matchFormat}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={STATUS_VARIANT[t.status]}>
                          {STATUS_LABEL[t.status] ?? t.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-center hidden sm:table-cell text-slate-600 dark:text-slate-400 font-mono">
                        {t._count.players}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-slate-400 text-xs">
                        {new Date(t.createdAt).toLocaleDateString("pt-PT", {
                          day: "2-digit", month: "short", year: "numeric",
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 justify-end">
                          <Link
                            href={`/tournament/${t.slug}`}
                            target="_blank"
                            className="text-xs px-2 py-1 rounded border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors whitespace-nowrap"
                          >
                            Ver
                          </Link>
                          <Link
                            href={`/tournament/${t.slug}?token=${t.adminToken}`}
                            target="_blank"
                            className="text-xs px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-medium transition-colors whitespace-nowrap"
                          >
                            Admin
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminPageWrapper() {
  return (
    <Suspense>
      <AdminPage />
    </Suspense>
  );
}
