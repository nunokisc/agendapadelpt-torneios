"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import type { TournamentFormat, TournamentMode } from "@/types";
import { saveTournament } from "@/lib/my-tournaments";
import { FPP_CATEGORIES } from "@/lib/categories";

const MANUAL_FORMAT_OPTIONS = [
  { value: "single_elimination", label: "Eliminação Simples" },
  { value: "double_elimination", label: "Eliminação Dupla" },
  { value: "round_robin",        label: "Todos contra Todos (Round Robin)" },
  { value: "groups_knockout",    label: "Fase de Grupos + Eliminação" },
];

const MATCH_FORMAT_GROUPS: { label: string; options: { value: string; label: string }[] }[] = [
  {
    label: "FPP (Federação Portuguesa de Padel)",
    options: [
      { value: "M3SPO", label: "M3SPO — 2 sets a 6 jogos No-Ad + Super Tie-Break" },
      { value: "M3S",   label: "M3S — 2 sets a 6 jogos + Super Tie-Break" },
      { value: "M3PO",  label: "M3PO — 3 sets a 6 jogos No-Ad" },
      { value: "M3",    label: "M3 — 3 sets a 6 jogos, vantagem" },
      { value: "PROPO", label: "PROPO — 1 set a 9 jogos No-Ad" },
      { value: "PRO",   label: "PRO — 1 set a 9 jogos" },
    ],
  },
  {
    label: "FFT (Fédération Française de Tennis)",
    options: [
      { value: "B1", label: "B1 — 2 sets a 6 jogos + Super Tie-Break a 10" },
      { value: "B2", label: "B2 — 2 sets a 6 jogos (No-Ad) + Super Tie-Break a 10" },
      { value: "A1", label: "A1 — 3 sets a 6 jogos (vantagem)" },
      { value: "A2", label: "A2 — 3 sets a 6 jogos (No-Ad)" },
      { value: "C1", label: "C1 — 2 sets a 4 jogos + Super Tie-Break a 10" },
      { value: "C2", label: "C2 — 2 sets a 4 jogos (No-Ad) + Super Tie-Break a 10" },
      { value: "D1", label: "D1 — 1 set a 9 jogos" },
      { value: "D2", label: "D2 — 1 set a 9 jogos (No-Ad)" },
      { value: "E",  label: "E — Super Tie-Break a 10 (ultra-rápido)" },
      { value: "F",  label: "F — 1 set a 4 jogos (No-Ad)" },
    ],
  },
];

const GROUP_COUNT_OPTIONS = Array.from({ length: 7 }, (_, i) => ({
  value: i + 2,
  label: `${i + 2} grupos`,
}));

const ADVANCE_OPTIONS = [
  { value: 1, label: "1 por grupo" },
  { value: 2, label: "2 por grupo" },
  { value: 3, label: "3 por grupo" },
  { value: 4, label: "4 por grupo" },
];

const CATEGORY_GROUPS = FPP_CATEGORIES.reduce<Record<string, typeof FPP_CATEGORIES>>(
  (acc, cat) => { (acc[cat.group] ??= []).push(cat); return acc; },
  {}
);
const CATEGORY_GROUP_ORDER = Array.from(new Set(FPP_CATEGORIES.map((c) => c.group)));

function FPPAutoInfo() {
  return (
    <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 px-3 py-2.5 text-xs text-emerald-800 dark:text-emerald-300">
      <p className="font-semibold mb-1">Regulamento FPP — formato automático por série</p>
      <p className="text-emerald-700 dark:text-emerald-400">
        O formato de jogo e o sistema de cada série são determinados automaticamente quando gerares o
        bracket, com base no número de duplas inscritas, seguindo o regulamento FPP (Anexo XIX).
      </p>
    </div>
  );
}

export default function CreateTournamentForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tournamentMode, setTournamentMode] = useState<TournamentMode>("manual");
  const [format, setFormat] = useState<TournamentFormat>("single_elimination");
  const [matchFormat, setMatchFormat] = useState("M3SPO");
  const [starPoint, setStarPoint] = useState(false);
  const [thirdPlace, setThirdPlace] = useState(false);
  const [groupCount, setGroupCount] = useState(2);
  const [advanceCount, setAdvanceCount] = useState(2);
  const [courtCount, setCourtCount] = useState<string>("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>(["OPEN"]);

  const isFPPAuto = tournamentMode === "fpp_auto";
  const isGroups = !isFPPAuto && format === "groups_knockout";
  const isSingle = !isFPPAuto && format === "single_elimination";

  function toggleCategory(code: string) {
    setSelectedCategories((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  }

  function handleModeChange(mode: TournamentMode) {
    setTournamentMode(mode);
    if (mode === "fpp_auto") {
      // Switch from OPEN to M3 when moving to FPP auto
      setSelectedCategories((prev) => {
        const fpp = prev.filter((c) => c !== "OPEN");
        return fpp.length > 0 ? fpp : ["M3"];
      });
    } else {
      setSelectedCategories(["OPEN"]);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) { setError("O nome do torneio é obrigatório."); return; }
    if (selectedCategories.length === 0) { setError("Selecciona pelo menos uma categoria."); return; }

    setLoading(true);
    try {
      const effectiveFormat: TournamentFormat = isFPPAuto ? "fpp_auto" : format;
      const body: Record<string, unknown> = {
        name: name.trim(),
        description: description.trim() || undefined,
        format: effectiveFormat,
        tournamentMode,
        matchFormat,
        starPoint,
        thirdPlace: (isSingle || isFPPAuto) ? thirdPlace : false,
        courtCount: courtCount !== "" ? Number(courtCount) : 1,
        categories: selectedCategories,
      };
      if (isGroups) {
        body.groupCount = groupCount;
        body.advanceCount = advanceCount;
      }

      const res = await fetch("/api/tournament", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Erro ao criar torneio");
      }
      const data = await res.json();
      saveTournament({ slug: data.tournament.slug, name: name.trim(), adminToken: data.adminToken, createdAt: new Date().toISOString() });
      router.push(data.adminUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-xl">
      <CardHeader>
        <CardTitle>Criar novo torneio</CardTitle>
        <p className="text-sm text-slate-500 mt-1">Preenche os detalhes e adiciona as duplas a seguir.</p>
      </CardHeader>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <Input
          label="Nome do torneio"
          placeholder="Ex: Torneio de Verão 2025"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Descrição (opcional)</label>
          <textarea
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 resize-none"
            rows={2}
            placeholder="Descrição opcional do torneio..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {/* Bloco A — Modo */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Modo do torneio</label>
          <div className="grid grid-cols-2 gap-2">
            {(["manual", "fpp_auto"] as TournamentMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => handleModeChange(mode)}
                className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors text-left ${
                  tournamentMode === mode
                    ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-600"
                    : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600"
                }`}
              >
                {mode === "manual" ? "Manual" : "FPP Automático"}
                <p className="text-xs font-normal mt-0.5 opacity-70">
                  {mode === "manual"
                    ? "Formato definido pelo organizador"
                    : "Determinado automaticamente pela FPP"}
                </p>
              </button>
            ))}
          </div>
        </div>

        {!isFPPAuto && (
          <div className="flex flex-col gap-1">
            <Select
              label="Formato do torneio"
              options={MANUAL_FORMAT_OPTIONS}
              value={format}
              onChange={(e) => setFormat(e.target.value as TournamentFormat)}
            />
          </div>
        )}

        {!isFPPAuto ? (
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Formato do jogo</label>
            <select
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              value={matchFormat}
              onChange={(e) => setMatchFormat(e.target.value)}
            >
              {MATCH_FORMAT_GROUPS.map((group) => (
                <optgroup key={group.label} label={group.label}>
                  {group.options.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
        ) : (
          <FPPAutoInfo />
        )}

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            checked={starPoint}
            onChange={(e) => setStarPoint(e.target.checked)}
          />
          <span className="text-sm text-slate-700 dark:text-slate-300">Star Point (FIP 2026) — ponto de ouro a 40-40</span>
        </label>

        {(isSingle || isFPPAuto) && (
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              checked={thirdPlace}
              onChange={(e) => setThirdPlace(e.target.checked)}
            />
            <span className="text-sm text-slate-700 dark:text-slate-300">Jogo para 3.º/4.º lugar</span>
          </label>
        )}

        {isGroups && (
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Número de grupos"
              options={GROUP_COUNT_OPTIONS}
              value={groupCount}
              onChange={(e) => setGroupCount(Number(e.target.value))}
            />
            <Select
              label="Avançam por grupo"
              options={ADVANCE_OPTIONS}
              value={advanceCount}
              onChange={(e) => setAdvanceCount(Number(e.target.value))}
            />
          </div>
        )}

        {/* Bloco B — Categorias */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Séries / Categorias</label>
            <span className="text-xs text-slate-400">
              {selectedCategories.length} seleccionada{selectedCategories.length !== 1 ? "s" : ""}
            </span>
          </div>

          {!isFPPAuto ? (
            <div className="space-y-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  checked={selectedCategories.includes("OPEN")}
                  onChange={() => toggleCategory("OPEN")}
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">
                  <strong>OPEN</strong> — categoria única (torneio simples)
                </span>
              </label>
              <details className="text-sm">
                <summary className="text-xs text-slate-400 cursor-pointer hover:text-slate-600 dark:hover:text-slate-300 select-none">
                  Adicionar séries FPP (M3, F3, MX3…)
                </summary>
                <div className="mt-2 space-y-3 pl-1">
                  {CATEGORY_GROUP_ORDER.map((groupName) => (
                    <div key={groupName}>
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">{groupName}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {CATEGORY_GROUPS[groupName].map((cat) => (
                          <button
                            key={cat.code}
                            type="button"
                            onClick={() => toggleCategory(cat.code)}
                            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                              selectedCategories.includes(cat.code)
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 ring-1 ring-emerald-400"
                                : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                            }`}
                          >
                            {cat.code}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </details>
            </div>
          ) : (
            <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 space-y-3 max-h-56 overflow-y-auto">
              {CATEGORY_GROUP_ORDER.map((groupName) => (
                <div key={groupName}>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">{groupName}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {CATEGORY_GROUPS[groupName].map((cat) => (
                      <button
                        key={cat.code}
                        type="button"
                        onClick={() => toggleCategory(cat.code)}
                        className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                          selectedCategories.includes(cat.code)
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 ring-1 ring-emerald-400"
                            : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                        }`}
                      >
                        {cat.code}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <Input
          label="Número de campos"
          type="number"
          min={1}
          max={99}
          placeholder="1"
          value={courtCount}
          onChange={(e) => setCourtCount(e.target.value)}
        />

        {error && (
          <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </p>
        )}

        <Button type="submit" size="lg" loading={loading} className="mt-1">
          Criar Torneio
        </Button>
      </form>
    </Card>
  );
}
