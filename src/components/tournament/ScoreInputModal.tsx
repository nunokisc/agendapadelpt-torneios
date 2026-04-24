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
  // Show only the first non-conditional sets initially
  const nonConditional = structure.filter((s) => !s.conditional);
  return nonConditional.map((s) => emptySet(s.type === "superTiebreak"));
}

export default function ScoreInputModal({ match, slug, token, matchFormat, onClose, onSaved }: Props) {
  const format = (matchFormat || "B1") as MatchFormat;
  const structure = getFormatStructure(format);
  const { toast } = useToast();

  const [sets, setSets] = useState<SetScore[]>(() => buildInitialSets(format));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset sets when match changes or format changes
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
  }, [match, format]);

  if (!match) return null;

  const team1Name = match.team1?.name ?? "Equipa A";
  const team2Name = match.team2?.name ?? "Equipa B";

  // Determine set winners for display
  const setWinners = sets.map((set, i) => {
    const struct = structure[Math.min(i, structure.length - 1)];
    const isSTBSlot =
      (format === "B1" || format === "B2" || format === "C1" || format === "C2") && i === 2;
    const effectiveStruct = isSTBSlot
      ? { type: "superTiebreak" as const, superTiebreakTarget: 10 }
      : struct;
    return determineSetWinner(set, effectiveStruct);
  });

  const t1Sets = setWinners.filter((w) => w === 1).length;
  const t2Sets = setWinners.filter((w) => w === 2).length;

  const matchWinner = determineMatchWinner(sets, format);
  const winnerName = matchWinner === 1 ? team1Name : matchWinner === 2 ? team2Name : null;

  // Check if set needs tiebreak inputs
  function needsTiebreak(set: SetScore, idx: number): boolean {
    const struct = structure[Math.min(idx, structure.length - 1)];
    if (struct.type === "superTiebreak") return false;
    const isSTBSlot =
      (format === "B1" || format === "B2" || format === "C1" || format === "C2") && idx === 2;
    if (isSTBSlot) return false;
    if (struct.tiebreakAt === undefined) return false;
    return set.team1 === struct.tiebreakAt && set.team2 === struct.tiebreakAt;
  }

  function updateSet(idx: number, field: "team1" | "team2", raw: string) {
    const val = Math.max(0, parseInt(raw) || 0);
    setSets((prev) =>
      prev.map((s, i) => {
        if (i !== idx) return s;
        const updated = { ...s, [field]: val };
        // Clear tiebreak if score no longer requires it
        const struct = structure[Math.min(i, structure.length - 1)];
        const tiebreakAt = struct.tiebreakAt ?? (struct.maxGames ?? 6);
        const newTeam1 = field === "team1" ? val : s.team1;
        const newTeam2 = field === "team2" ? val : s.team2;
        if (newTeam1 !== tiebreakAt || newTeam2 !== tiebreakAt) {
          delete updated.tiebreak;
        }
        return updated;
      })
    );
  }

  function updateTiebreak(idx: number, field: "team1" | "team2", raw: string) {
    const val = Math.max(0, parseInt(raw) || 0);
    setSets((prev) =>
      prev.map((s, i) => {
        if (i !== idx) return s;
        return {
          ...s,
          tiebreak: { ...(s.tiebreak ?? { team1: 0, team2: 0 }), [field]: val },
        };
      })
    );
  }

  // Check if we should show a 3rd set option (for B/C/A formats)
  const canAddDecider = (() => {
    if (structure.length < 3) return false;
    const thirdStruct = structure[2];
    if (!thirdStruct.conditional) return false;
    // Show when first two sets are won one each
    return t1Sets === 1 && t2Sets === 1 && sets.length < 3;
  })();

  const thirdStruct = structure[2];
  const isSTBDecider =
    thirdStruct && (thirdStruct.type === "superTiebreak" ||
      ((format === "B1" || format === "B2" || format === "C1" || format === "C2") && true));

  function addDecider() {
    if (isSTBDecider) {
      setSets((prev) => [...prev, { team1: 0, team2: 0, superTiebreak: true }]);
    } else {
      setSets((prev) => [...prev, { team1: 0, team2: 0 }]);
    }
  }

  function removeDecider() {
    setSets((prev) => prev.slice(0, 2));
  }

  const validation = validateScores(sets, format);

  async function handleSave() {
    setError(null);

    if (!validation.valid) {
      setError(validation.error ?? "Resultado inválido");
      return;
    }
    if (!matchWinner) {
      setError("O vencedor ainda não foi determinado.");
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
      toast("Resultado guardado com sucesso!");
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
        <div>
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">
            {roundLabel}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            Formato: <span className="font-mono font-semibold">{format}</span> — {FORMAT_LABELS[format]}
          </p>
        </div>

        {/* Players header */}
        <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center">
          <div className="text-center font-semibold text-slate-800 dark:text-slate-200 text-sm truncate">
            {team1Name}
          </div>
          <div className="text-slate-400 text-sm font-mono text-center">vs</div>
          <div className="text-center font-semibold text-slate-800 dark:text-slate-200 text-sm truncate">
            {team2Name}
          </div>
        </div>

        {/* Sets */}
        <div className="space-y-3">
          {sets.map((s, idx) => {
            const struct = structure[Math.min(idx, structure.length - 1)];
            const isSTBSlot =
              (format === "B1" || format === "B2" || format === "C1" || format === "C2") && idx === 2;
            const isSuperTB = struct.type === "superTiebreak" || isSTBSlot;
            const setWinner = setWinners[idx];
            const showTiebreak = needsTiebreak(s, idx);

            const label = isSuperTB
              ? "STB"
              : `Set ${idx + 1}`;

            const target = isSuperTB
              ? (struct.superTiebreakTarget ?? 10)
              : (struct.maxGames ?? 6);

            return (
              <div key={idx} className="space-y-1.5">
                {/* Set row label */}
                <div className="flex items-center gap-1">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide w-8 shrink-0">
                    {label}
                  </span>
                  {isSuperTB && (
                    <span className="text-xs text-slate-400">
                      (primeiro a {target} com 2 de vantagem)
                    </span>
                  )}
                  {setWinner && (
                    <span className="ml-auto text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                      {setWinner === 1 ? team1Name : team2Name} vence
                    </span>
                  )}
                </div>

                {/* Score inputs */}
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={isSuperTB ? 99 : target + 2}
                    value={s.team1}
                    onChange={(e) => updateSet(idx, "team1", e.target.value)}
                    className={`w-full h-10 rounded-lg border px-3 text-center text-base font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500
                      ${setWinner === 1 ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/20" : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"}`}
                  />
                  <span className="text-slate-400 text-sm font-mono shrink-0">—</span>
                  <input
                    type="number"
                    min={0}
                    max={isSuperTB ? 99 : target + 2}
                    value={s.team2}
                    onChange={(e) => updateSet(idx, "team2", e.target.value)}
                    className={`w-full h-10 rounded-lg border px-3 text-center text-base font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500
                      ${setWinner === 2 ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/20" : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"}`}
                  />
                  {/* Remove decider button */}
                  {idx === 2 && (
                    <button
                      onClick={removeDecider}
                      className="text-slate-300 hover:text-red-400 shrink-0"
                      title="Remover decididor"
                    >
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>

                {/* Tie-break sub-inputs */}
                {showTiebreak && (
                  <div className="ml-8 flex items-center gap-2">
                    <span className="text-xs text-slate-400 shrink-0">Tie-break:</span>
                    <input
                      type="number"
                      min={0}
                      max={99}
                      value={s.tiebreak?.team1 ?? 0}
                      onChange={(e) => updateTiebreak(idx, "team1", e.target.value)}
                      className="w-full h-8 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 text-center text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <span className="text-slate-400 text-xs font-mono shrink-0">—</span>
                    <input
                      type="number"
                      min={0}
                      max={99}
                      value={s.tiebreak?.team2 ?? 0}
                      onChange={(e) => updateTiebreak(idx, "team2", e.target.value)}
                      className="w-full h-8 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 text-center text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Add decider button */}
        {canAddDecider && (
          <button
            onClick={addDecider}
            className="text-sm text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 flex items-center gap-1"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            {isSTBDecider ? "Adicionar Super Tie-Break" : "Adicionar 3.º set"}
          </button>
        )}

        {/* Match winner preview */}
        {winnerName && (
          <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 px-4 py-2">
            <p className="text-sm text-emerald-700 dark:text-emerald-400">
              Vencedor: <strong>{winnerName}</strong>{" "}
              <span className="font-mono">({t1Sets}–{t2Sets})</span>
            </p>
          </div>
        )}

        {/* Validation error */}
        {!validation.valid && sets.some((s) => s.team1 > 0 || s.team2 > 0) && (
          <p className="text-xs text-amber-600 dark:text-amber-400">{validation.error}</p>
        )}

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        <div className="flex justify-end gap-3 pt-1">
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            loading={loading}
            disabled={!matchWinner || !validation.valid}
          >
            Guardar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
