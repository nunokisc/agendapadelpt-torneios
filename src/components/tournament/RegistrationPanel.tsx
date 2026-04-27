"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { useToast } from "@/components/ui/ToastProvider";
import type { Registration, Category } from "@/types";

interface RegistrationWithCategory extends Registration {
  category?: Category | null;
}

interface Props {
  slug: string;
  token: string;
  categories: Category[];
  activeCategoryId: string | null;
  onApproved: () => void;
}

export default function RegistrationPanel({ slug, token, categories, activeCategoryId, onApproved }: Props) {
  const { toast } = useToast();
  const [registrations, setRegistrations] = useState<RegistrationWithCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState<string | null>(null);

  const fetchRegistrations = useCallback(async () => {
    try {
      const res = await fetch(`/api/tournament/${slug}/register?token=${token}`);
      if (!res.ok) return;
      const data = await res.json();
      setRegistrations(data.registrations);
    } finally {
      setLoading(false);
    }
  }, [slug, token]);

  useEffect(() => { fetchRegistrations(); }, [fetchRegistrations]);

  async function act(registrationId: string, action: "approve" | "reject", overrideCategoryId?: string) {
    setActioning(registrationId);
    try {
      const res = await fetch(`/api/tournament/${slug}/register?token=${token}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          registrationId,
          action,
          ...(overrideCategoryId ? { categoryId: overrideCategoryId } : {}),
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast(action === "approve" ? "Dupla aprovada e adicionada!" : "Inscrição rejeitada.");
      await fetchRegistrations();
      if (action === "approve") onApproved();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Erro");
    } finally {
      setActioning(null);
    }
  }

  async function changeCategory(registrationId: string, categoryId: string) {
    setActioning(registrationId);
    try {
      const res = await fetch(`/api/tournament/${slug}/register?token=${token}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registrationId, categoryId }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast("Categoria alterada.");
      await fetchRegistrations();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Erro");
    } finally {
      setActioning(null);
    }
  }

  const hasMultipleCategories = categories.length > 1;

  // Filter pending by active category (if multiple categories)
  const pending = registrations.filter((r) => {
    if (r.status !== "pending") return false;
    if (hasMultipleCategories && activeCategoryId) {
      return r.categoryId === activeCategoryId || r.categoryId == null;
    }
    return true;
  });
  const done = registrations.filter((r) => r.status !== "pending");

  if (loading) return null;
  if (registrations.length === 0) return (
    <Card>
      <CardHeader><CardTitle>Inscrições</CardTitle></CardHeader>
      <p className="text-sm text-slate-400 text-center py-4">Nenhuma inscrição recebida.</p>
    </Card>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Inscrições{pending.length > 0 && (
            <span className="ml-2 inline-flex items-center justify-center h-5 w-5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 text-xs font-bold">
              {pending.length}
            </span>
          )}
        </CardTitle>
      </CardHeader>

      <div className="space-y-2">
        {pending.map((r) => (
          <div key={r.id} className="flex flex-col gap-2 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 px-3 py-2">
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                  {r.teamName ?? `${r.player1Name} / ${r.player2Name}`}
                </p>
                {r.teamName && <p className="text-xs text-slate-500">{r.player1Name} / {r.player2Name}</p>}
                {r.contact && <p className="text-xs text-slate-400">{r.contact}</p>}
                {hasMultipleCategories && (
                  <div className="mt-1 flex items-center gap-1.5">
                    <span className="text-xs text-slate-400">Série:</span>
                    <select
                      className="text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-1.5 py-0.5 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      value={r.categoryId ?? ""}
                      onChange={(e) => changeCategory(r.id, e.target.value)}
                      disabled={actioning === r.id}
                    >
                      <option value="" disabled>-- escolher --</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>{cat.code} — {cat.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              <div className="flex gap-1.5 shrink-0">
                <Button size="sm" loading={actioning === r.id} onClick={() => act(r.id, "approve")}>
                  Aprovar
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={actioning === r.id}
                  onClick={() => act(r.id, "reject")}
                  className="text-red-600 hover:text-red-700"
                >
                  Rejeitar
                </Button>
              </div>
            </div>
          </div>
        ))}

        {done.length > 0 && (
          <details className="mt-2">
            <summary className="text-xs text-slate-400 cursor-pointer hover:text-slate-600 dark:hover:text-slate-300">
              {done.length} processada{done.length !== 1 ? "s" : ""}
            </summary>
            <div className="mt-2 space-y-1">
              {done.map((r) => (
                <div key={r.id} className="flex items-center gap-3 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      {r.teamName ?? `${r.player1Name} / ${r.player2Name}`}
                    </p>
                    {hasMultipleCategories && r.category && (
                      <p className="text-[10px] text-slate-400">{r.category.code}</p>
                    )}
                  </div>
                  <Badge variant={r.status === "approved" ? "success" : "default"}>
                    {r.status === "approved" ? "Aprovada" : "Rejeitada"}
                  </Badge>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>
    </Card>
  );
}
