"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getSavedTournaments, removeTournament, type SavedTournament } from "@/lib/my-tournaments";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";

export default function MyTournaments() {
  const [tournaments, setTournaments] = useState<SavedTournament[]>([]);

  useEffect(() => {
    setTournaments(getSavedTournaments());
  }, []);

  function handleRemove(slug: string) {
    removeTournament(slug);
    setTournaments(getSavedTournaments());
  }

  if (tournaments.length === 0) return null;

  return (
    <Card className="w-full max-w-xl">
      <CardHeader>
        <CardTitle>Os meus torneios</CardTitle>
        <p className="text-sm text-slate-500 mt-1">
          Torneios criados neste browser. Guarda os links de admin antes de limpar os dados.
        </p>
      </CardHeader>
      <div className="space-y-2">
        {tournaments.map((t) => {
          const adminUrl = `/tournament/${t.slug}?token=${t.adminToken}`;
          const publicUrl = `/tournament/${t.slug}`;
          const date = new Date(t.createdAt).toLocaleDateString("pt-PT", {
            day: "2-digit", month: "short", year: "numeric",
          });
          return (
            <div
              key={t.slug}
              className="flex items-center gap-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-3 py-2.5"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-slate-800 dark:text-slate-200 truncate">
                  {t.name}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">{date}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Link
                  href={publicUrl}
                  className="text-xs px-2 py-1 rounded-md border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  Ver
                </Link>
                <Link
                  href={adminUrl}
                  className="text-xs px-2 py-1 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 transition-colors font-medium"
                >
                  Admin
                </Link>
                <button
                  onClick={() => handleRemove(t.slug)}
                  title="Remover da lista"
                  className="text-slate-300 hover:text-red-400 dark:text-slate-600 dark:hover:text-red-400 transition-colors p-1"
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
