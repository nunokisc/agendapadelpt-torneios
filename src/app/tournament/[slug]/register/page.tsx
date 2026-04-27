"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { Category } from "@/types";

interface TournamentInfo {
  name: string;
  registrationOpen: boolean;
  categories: Category[];
}

export default function RegisterPage() {
  const { slug } = useParams<{ slug: string }>();
  const [tournament, setTournament] = useState<TournamentInfo | null>(null);
  const [loadingTournament, setLoadingTournament] = useState(true);

  const [player1, setPlayer1] = useState("");
  const [player2, setPlayer2] = useState("");
  const [teamName, setTeamName] = useState("");
  const [contact, setContact] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [showTeamName, setShowTeamName] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/tournament/${slug}`)
      .then((r) => r.json())
      .then((d) => {
        const t = d.tournament;
        setTournament({
          name: t.name,
          registrationOpen: t.registrationOpen,
          categories: t.categories ?? [],
        });
        // Pre-select if only one category
        if (t.categories?.length === 1) setCategoryId(t.categories[0].id);
      })
      .catch(() => setTournament(null))
      .finally(() => setLoadingTournament(false));
  }, [slug]);

  const hasMultipleCategories = (tournament?.categories?.length ?? 0) > 1;
  const categoryRequired = hasMultipleCategories && !categoryId;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (categoryRequired) {
      setError("Selecciona a série em que queres competir.");
      return;
    }
    setSubmitting(true);
    try {
      const body: Record<string, string> = { player1: player1.trim(), player2: player2.trim() };
      if (teamName.trim()) body.teamName = teamName.trim();
      if (contact.trim()) body.contact = contact.trim();
      if (categoryId) body.categoryId = categoryId;

      const res = await fetch(`/api/tournament/${slug}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao submeter inscrição");
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingTournament) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin h-6 w-6 border-4 border-[#0E7C66] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="text-slate-500">Torneio não encontrado.</p>
        <Link href="/" className="mt-4 inline-block text-sm text-[#0E7C66] hover:underline">← Início</Link>
      </div>
    );
  }

  if (!tournament.registrationOpen) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="text-2xl mb-2">🔒</p>
        <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100">{tournament.name}</h1>
        <p className="mt-2 text-slate-500">As inscrições estão fechadas.</p>
        <Link href={`/tournament/${slug}`} className="mt-4 inline-block text-sm text-[#0E7C66] hover:underline">Ver torneio →</Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="text-4xl mb-4">🎾</p>
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Inscrição enviada!</h1>
        <p className="mt-2 text-slate-500 text-sm">A tua dupla foi submetida. O organizador irá confirmar a inscrição.</p>
        <Link href={`/tournament/${slug}`} className="mt-6 inline-block text-sm text-[#0E7C66] hover:underline">Ver torneio →</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <div className="mb-8">
        <Link href={`/tournament/${slug}`} className="text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
          ← {tournament.name}
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-2">Inscrição de dupla</h1>
        <p className="text-sm text-slate-500 mt-1">Preenche os dados da tua dupla. O organizador confirma a inscrição.</p>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Jogador 1" placeholder="Nome completo" value={player1} onChange={(e) => setPlayer1(e.target.value)} required disabled={submitting} />
            <Input label="Jogador 2" placeholder="Nome completo" value={player2} onChange={(e) => setPlayer2(e.target.value)} required disabled={submitting} />
          </div>

          {/* Category selector — only if multiple categories */}
          {hasMultipleCategories && (
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Série <span className="text-red-500">*</span>
              </label>
              <select
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0E7C66]"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                required
                disabled={submitting}
              >
                <option value="">-- Seleccionar série --</option>
                {tournament.categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.code} — {cat.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {showTeamName ? (
            <div className="flex gap-2 items-end">
              <Input
                label="Nome da dupla (opcional)"
                placeholder="Ex: Os Campeões"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                className="flex-1"
                disabled={submitting}
              />
              <button type="button" onClick={() => { setShowTeamName(false); setTeamName(""); }} className="mb-0.5 text-xs text-slate-400 hover:text-slate-600 pb-2">
                Remover
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => setShowTeamName(true)} className="text-xs text-slate-400 hover:text-[#0E7C66] transition-colors">
              + Nome de dupla
            </button>
          )}

          <Input
            label="Contacto (email ou telefone — opcional)"
            placeholder="para o organizador entrar em contacto"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            disabled={submitting}
          />

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          <Button type="submit" loading={submitting} className="w-full" disabled={!player1.trim() || !player2.trim() || categoryRequired}>
            Enviar inscrição
          </Button>
        </form>
      </Card>
    </div>
  );
}
