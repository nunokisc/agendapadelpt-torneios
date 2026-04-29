"use client";

import { useState, useEffect } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import type { Match, MatchFormat } from "@/types";
import type { SetScore } from "@/lib/scoring";
import {
  getFormatStructure,
  determineSetWinner,
  determineMatchWinner,
  validateScores,
  FORMAT_LABELS,
} from "@/lib/scoring";
import { useToast } from "@/components/ui/ToastProvider";

interface Props {
  match: Match | null;
  slug: string;
  token: string;
  matchFormat: string;
  onClose: () => void;
  onSaved: () => void;
}

function emptySet(isSuperTiebreak: boolean): SetScore {
  return isSuperTiebreak ? { team1: 0, team2: 0, superTiebreak: true } : { team1: 0, team2: 0 };
}

function buildInitialSets(format: MatchFormat): SetScore[] {
  const structure = getFormatStructure(format);
  return structure.filter((s) => !s.conditional).map((s) => emptySet(s.type === "superTiebreak"));
}

// ── +/− stepper ───────────────────────────────────────────────────────────────

function Stepper({
  value,
  onChange,
  max = 99,
  winner,
}: {
  value: number;
  onChange: (v: number) => void;
  max?: number;
  winner?: boolean;
}) {
  return (
    <div className="flex items-center justify-center gap-2">
      <button
        type="button"
        onClick={() => onChange(Math.max(0, value - 1))}
        className="h-11 w-11 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xl font-bold text-slate-500 dark:text-slate-400 active:scale-95 transition-transform touch-manipulation select-none"
        aria-label="Diminuir"
      >
        −
      </button>
      <span
        className={`w-10 text-center text-2xl font-bold font-mono tabular-nums select-none ${
          winner ? "text-[#0E7C66] dark:text-[#A3E635]" : "text-slate-800 dark:text-slate-100"
        }`}
      >
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        className="h-11 w-11 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xl font-bold text-slate-500 dark:text-slate-400 active:scale-95 transition-transform touch-manipulation select-none"
        aria-label="Aumentar"
      >
        +
      </button>
    </div>
  );
}

// ── Main modal ────────────────────────────────────────────────────────────────

export default function ScoreInputModal({ match, slug, token, matchFormat, onClose, onSaved }: Props) {
  const format = (matchFormat || "M3SPO") as MatchFormat;
  const structure = getFormatStructure(format);
  const { toast } = useToast();

  const [sets, setSets] = useState<SetScore[]>(() => buildInitialSets(format));
  const [loading, setLoading] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [showWalkover, setShowWalkover] = useState(false);
  const [walkovertLoading, setWalkovertLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!match) return;
    if (match.scores) {
      try {
        const parsed = JSON.parse(match.scores) as SetScore[];
        setSets(parsed.length > 0 ? parsed : buildInitialSets(format));
      } catch {
        setSets(buildInitialSets(format));
      }
    } else {
      setSets(buildInitialSets(format));
    }
    setError(null);
    setShowWalkover(false);
  }, [match, format]);

  if (!match) return null;

  const team1Name = match.team1?.name ?? "Dupla A";
  const team2Name = match.team2?.name ?? "Dupla B";

  const setWinners = sets.map((set, i) => {
    const struct = structure[Math.min(i, structure.length - 1)];
    return determineSetWinner(set, struct);
  });

  const t1Sets = setWinners.filter((w) => w === 1).length;
  const t2Sets = setWinners.filter((w) => w === 2).length;
  const matchWinner = determineMatchWinner(sets, format);
  const winnerName = matchWinner === 1 ? team1Name : matchWinner === 2 ? team2Name : null;

  function needsTiebreak(set: SetScore, idx: number): boolean {
    const struct = structure[Math.min(idx, structure.length - 1)];
    if (struct.type === "superTiebreak") return false;
    if (struct.tiebreakAt === undefined) return false;
    return set.team1 === struct.tiebreakAt && set.team2 === struct.tiebreakAt;
  }

  function updateSet(idx: number, field: "team1" | "team2", val: number) {
    setSets((prev) =>
      prev.map((s, i) => {
        if (i !== idx) return s;
        const updated = { ...s, [field]: val };
        const struct = structure[Math.min(i, structure.length - 1)];
        const tiebreakAt = struct.tiebreakAt ?? (struct.maxGames ?? 6);
        const newT1 = field === "team1" ? val : s.team1;
        const newT2 = field === "team2" ? val : s.team2;
        if (newT1 !== tiebreakAt || newT2 !== tiebreakAt) delete updated.tiebreak;
        return updated;
      })
    );
  }

  function updateTiebreak(idx: number, field: "team1" | "team2", val: number) {
    setSets((prev) =>
      prev.map((s, i) => {
        if (i !== idx) return s;
        return { ...s, tiebreak: { ...(s.tiebreak ?? { team1: 0, team2: 0 }), [field]: val } };
      })
    );
  }

  const canAddDecider = (() => {
    if (structure.length < 3) return false;
    if (!structure[2].conditional) return false;
    return t1Sets === 1 && t2Sets === 1 && sets.length < 3;
  })();

  const isSTBDecider = structure[2]?.type === "superTiebreak";

  function addDecider() {
    setSets((prev) => [
      ...prev,
      isSTBDecider ? { team1: 0, team2: 0, superTiebreak: true } : { team1: 0, team2: 0 },
    ]);
  }

  const validation = validateScores(sets, format);

  async function handleSave() {
    setError(null);
    if (!validation.valid) { setError(validation.error ?? "Resultado inválido"); return; }
    if (!matchWinner) { setError("O vencedor ainda não foi determinado."); return; }
    if (!match) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/tournament/${slug}/match/${match.id}?token=${token}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scores: sets }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Erro ao guardar resultado");
      toast("Resultado guardado com sucesso!");
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }

  async function handleReset() {
    if (!match) return;
    setResetting(true);
    setError(null);
    try {
      const res = await fetch(`/api/tournament/${slug}/match/${match.id}?token=${token}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Erro ao repor resultado");
      toast("Resultado reposto com sucesso");
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
      setConfirmReset(false);
    } finally {
      setResetting(false);
    }
  }

  async function handleWalkover(side: "team1" | "team2") {
    if (!match) return;
    setWalkovertLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/tournament/${slug}/match/${match.id}?token=${token}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walkover: side }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Erro ao registar falta");
      toast("Falta de comparência registada");
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setWalkovertLoading(false);
    }
  }

  const roundLabel =
    match.bracketType === "third_place" ? "3.º / 4.º lugar"
    : match.bracketType === "final" ? "Grand Final"
    : `Ronda ${match.round} — Jogo ${match.position + 1}`;

  return (
    <Modal open={!!match} onClose={onClose} title="Resultado">
      <div className="space-y-5">
        {/* Round / format info */}
        <div>
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">{roundLabel}</p>
          <p className="text-xs text-slate-400 mt-0.5">
            <span className="font-mono font-semibold">{format}</span> — {FORMAT_LABELS[format]}
          </p>
        </div>

        {/* Team name headers */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-center">
          <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm leading-tight truncate">{team1Name}</p>
          <p className="text-slate-400 text-xs font-mono">vs</p>
          <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm leading-tight truncate">{team2Name}</p>
        </div>

        {/* Sets */}
        <div className="space-y-4">
          {sets.map((s, idx) => {
            const struct = structure[Math.min(idx, structure.length - 1)];
            const isSuperTB = struct.type === "superTiebreak";
            const setWinner = setWinners[idx];
            const showTiebreak = needsTiebreak(s, idx);
            const maxScore = isSuperTB ? 99 : (struct.maxGames ?? 6) + 2;
            const label = isSuperTB ? "Super Tie-Break" : `Set ${idx + 1}`;

            return (
              <div key={idx} className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-3 space-y-2">
                {/* Set label + winner */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</span>
                  <div className="flex items-center gap-2">
                    {setWinner && (
                      <span className="text-xs text-[#0E7C66] dark:text-[#A3E635] font-medium">
                        {setWinner === 1 ? team1Name : team2Name} vence
                      </span>
                    )}
                    {idx === 2 && (
                      <button
                        type="button"
                        onClick={() => setSets((p) => p.slice(0, 2))}
                        className="text-slate-300 hover:text-red-400 transition-colors"
                        title="Remover"
                      >
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>

                {/* Steppers */}
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                  <Stepper
                    value={s.team1}
                    onChange={(v) => updateSet(idx, "team1", v)}
                    max={maxScore}
                    winner={setWinner === 1}
                  />
                  <span className="text-slate-300 dark:text-slate-600 font-mono text-lg select-none">—</span>
                  <Stepper
                    value={s.team2}
                    onChange={(v) => updateSet(idx, "team2", v)}
                    max={maxScore}
                    winner={setWinner === 2}
                  />
                </div>

                {/* Tie-break row */}
                {showTiebreak && (
                  <div className="pt-1 border-t border-slate-200 dark:border-slate-700">
                    <p className="text-xs text-slate-400 mb-1.5">Tie-break</p>
                    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                      <Stepper
                        value={s.tiebreak?.team1 ?? 0}
                        onChange={(v) => updateTiebreak(idx, "team1", v)}
                      />
                      <span className="text-slate-300 dark:text-slate-600 font-mono text-lg select-none">—</span>
                      <Stepper
                        value={s.tiebreak?.team2 ?? 0}
                        onChange={(v) => updateTiebreak(idx, "team2", v)}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Add decider */}
        {canAddDecider && (
          <button
            type="button"
            onClick={addDecider}
            className="text-sm text-[#0E7C66] hover:text-[#0E7C66] dark:text-[#A3E635] flex items-center gap-1.5 transition-colors"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            {isSTBDecider ? "Adicionar Super Tie-Break" : "Adicionar 3.º set"}
          </button>
        )}

        {/* Winner banner */}
        {winnerName && (
          <div className="rounded-lg bg-[#d1fae5]/40 dark:bg-[#0E7C66]/10 border border-[#0E7C66]/30 dark:border-[#0E7C66]/30 px-4 py-2.5 text-center">
            <p className="text-sm text-[#0E7C66] dark:text-[#A3E635]">
              Vencedor: <strong>{winnerName}</strong>{" "}
              <span className="font-mono text-xs">({t1Sets}–{t2Sets})</span>
            </p>
          </div>
        )}

        {/* Walkover / falta de comparência */}
        {match.status !== "completed" && (
          <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
            {!showWalkover ? (
              <button
                type="button"
                onClick={() => setShowWalkover(true)}
                className="text-xs text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
              >
                Registar falta de comparência…
              </button>
            ) : (
              <div className="space-y-2">
                <p className="text-xs font-medium text-amber-700 dark:text-amber-400">Qual a dupla que não compareceu?</p>
                <div className="flex gap-2 flex-wrap">
                  <button
                    type="button"
                    disabled={walkovertLoading}
                    onClick={() => handleWalkover("team1")}
                    className="flex-1 min-w-0 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-xs font-medium text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors truncate disabled:opacity-50"
                  >
                    {walkovertLoading ? "…" : team1Name}
                  </button>
                  <button
                    type="button"
                    disabled={walkovertLoading}
                    onClick={() => handleWalkover("team2")}
                    className="flex-1 min-w-0 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-xs font-medium text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors truncate disabled:opacity-50"
                  >
                    {walkovertLoading ? "…" : team2Name}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowWalkover(false)}
                    className="text-xs text-slate-400 hover:text-slate-600 transition-colors px-1"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Errors */}
        {!validation.valid && sets.some((s) => s.team1 > 0 || s.team2 > 0) && (
          <p className="text-xs text-amber-600 dark:text-amber-400">{validation.error}</p>
        )}
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <div className="flex flex-wrap items-start gap-3 pt-1">
          {match.status === "completed" && (
            confirmReset ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-red-600 dark:text-red-400 font-medium">Repor resultado?</span>
                <Button variant="secondary" onClick={() => setConfirmReset(false)} disabled={resetting}>Não</Button>
                <Button variant="danger" onClick={handleReset} loading={resetting}>Sim, repor</Button>
              </div>
            ) : (
              <Button variant="danger" onClick={() => setConfirmReset(true)} disabled={loading || resetting}>
                Repor resultado
              </Button>
            )
          )}
          <div className="flex gap-3 ml-auto">
            <Button variant="secondary" onClick={onClose} disabled={loading || resetting}>Cancelar</Button>
            <Button onClick={handleSave} loading={loading} disabled={!matchWinner || !validation.valid || resetting}>
              Guardar
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
