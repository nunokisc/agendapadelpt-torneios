"use client";

import { useState, useEffect } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import type { Match, SetScore } from "@/types";

interface Props {
  match: Match | null;
  slug: string;
  token: string;
  onClose: () => void;
  onSaved: () => void;
}

export default function ScoreInputModal({ match, slug, token, onClose, onSaved }: Props) {
  const [sets, setSets] = useState<SetScore[]>([{ team1: 0, team2: 0 }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pre-fill with existing scores when match changes
  useEffect(() => {
    if (!match) return;
    if (match.scores) {
      setSets(JSON.parse(match.scores));
    } else {
      setSets([{ team1: 0, team2: 0 }]);
    }
    setError(null);
  }, [match]);

  if (!match) return null;

  const team1Name = match.team1?.name ?? "Jogador A";
  const team2Name = match.team2?.name ?? "Jogador B";

  // Compute current leader
  let t1Sets = 0, t2Sets = 0;
  for (const s of sets) {
    if (s.team1 > s.team2) t1Sets++;
    else if (s.team2 > s.team1) t2Sets++;
  }

  const winner = t1Sets > t2Sets ? team1Name : t2Sets > t1Sets ? team2Name : null;

  function updateSet(idx: number, field: "team1" | "team2", raw: string) {
    const val = Math.max(0, parseInt(raw) || 0);
    setSets((prev) => prev.map((s, i) => (i === idx ? { ...s, [field]: val } : s)));
  }

  function addSet() {
    setSets((prev) => [...prev, { team1: 0, team2: 0 }]);
  }

  function removeSet(idx: number) {
    if (sets.length === 1) return;
    setSets((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSave() {
    setError(null);

    // Validate
    for (const s of sets) {
      if (s.team1 === s.team2) {
        setError("Empate num set não é permitido. Corrige os resultados.");
        return;
      }
    }
    if (t1Sets === t2Sets) {
      setError("Resultado empatado — adiciona mais um set para determinar o vencedor.");
      return;
    }

    if (!match) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/tournament/${slug}/match/${match.id}?token=${token}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scores: sets }),
        }
      );
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Erro ao guardar resultado");
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }

  const roundLabel =
    match.bracketType === "third_place"
      ? "3.º / 4.º lugar"
      : match.bracketType === "final"
      ? "Grand Final"
      : `Ronda ${match.round} — Jogo ${match.position + 1}`;

  return (
    <Modal open={!!match} onClose={onClose} title="Introduzir Resultado">
      <div className="space-y-5">
        <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">
          {roundLabel}
        </p>

        {/* Players header */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center font-semibold text-slate-800 dark:text-slate-200 text-sm">
            {team1Name}
          </div>
          <div className="text-center font-semibold text-slate-800 dark:text-slate-200 text-sm">
            {team2Name}
          </div>
        </div>

        {/* Sets */}
        <div className="space-y-2">
          {sets.map((s, idx) => {
            const t1Win = s.team1 > s.team2;
            const t2Win = s.team2 > s.team1;
            const tie = s.team1 === s.team2 && s.team1 > 0;
            return (
              <div key={idx} className="flex items-center gap-2">
                <span className="text-xs text-slate-400 w-10 shrink-0">Set {idx + 1}</span>
                <input
                  type="number"
                  min={0}
                  max={99}
                  value={s.team1}
                  onChange={(e) => updateSet(idx, "team1", e.target.value)}
                  className={`w-full h-10 rounded-lg border px-3 text-center text-base font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500
                    ${t1Win ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/20" : tie ? "border-amber-400" : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"}`}
                />
                <span className="text-slate-400 text-sm font-mono shrink-0">—</span>
                <input
                  type="number"
                  min={0}
                  max={99}
                  value={s.team2}
                  onChange={(e) => updateSet(idx, "team2", e.target.value)}
                  className={`w-full h-10 rounded-lg border px-3 text-center text-base font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500
                    ${t2Win ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/20" : tie ? "border-amber-400" : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"}`}
                />
                {sets.length > 1 && (
                  <button
                    onClick={() => removeSet(idx)}
                    className="text-slate-300 hover:text-red-400 shrink-0"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <button
          onClick={addSet}
          className="text-sm text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 flex items-center gap-1"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Adicionar set
        </button>

        {/* Winner preview */}
        {winner && (
          <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 px-4 py-2">
            <p className="text-sm text-emerald-700 dark:text-emerald-400">
              Vencedor: <strong>{winner}</strong>{" "}
              <span className="font-mono">({t1Sets}–{t2Sets})</span>
            </p>
          </div>
        )}

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        <div className="flex justify-end gap-3 pt-1">
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSave} loading={loading} disabled={!winner}>
            Guardar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
