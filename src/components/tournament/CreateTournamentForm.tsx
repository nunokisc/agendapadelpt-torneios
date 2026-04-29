"use client";

import { useMemo, useState } from "react";
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

type DayWindow = { date: string; startTime: string; endTime: string };

function dateToStr(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function buildDays(start: string, end: string): DayWindow[] {
  const days: DayWindow[] = [];
  const cur = new Date(start + "T12:00:00");
  const fin = new Date(end + "T12:00:00");
  while (cur <= fin) {
    days.push({ date: dateToStr(cur), startTime: "09:00", endTime: "23:59" });
    cur.setDate(cur.getDate() + 1);
  }
  return days.slice(0, 30);
}

function fmtWeekday(dateStr: string) {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("pt-PT", {
    weekday: "short", day: "numeric", month: "short",
  });
}

// Matches needed per category given format parameters and team count
function matchesPerCategory(
  format: string,
  groupCount: number,
  advanceCount: number,
  teams: number,
  hasThirdPlace: boolean
): { groupMatches: number; knockoutMatches: number; total: number } {
  if (teams < 2) return { groupMatches: 0, knockoutMatches: 0, total: 0 };

  if (format === "groups_knockout") {
    const tpg = Math.ceil(teams / groupCount);
    const groupMatches = groupCount * Math.floor((tpg * (tpg - 1)) / 2);
    const advancers = groupCount * advanceCount;
    const knockoutMatches = Math.max(0, advancers - 1) + (hasThirdPlace ? 1 : 0);
    return { groupMatches, knockoutMatches, total: groupMatches + knockoutMatches };
  }
  if (format === "single_elimination" || format === "fpp_auto") {
    const ko = teams - 1 + (hasThirdPlace ? 1 : 0);
    return { groupMatches: 0, knockoutMatches: ko, total: ko };
  }
  if (format === "double_elimination") {
    const ko = (teams - 1) * 2;
    return { groupMatches: 0, knockoutMatches: ko, total: ko };
  }
  if (format === "round_robin") {
    const rr = Math.floor((teams * (teams - 1)) / 2);
    return { groupMatches: rr, knockoutMatches: 0, total: rr };
  }
  const ko = teams - 1;
  return { groupMatches: 0, knockoutMatches: ko, total: ko };
}

function FPPAutoInfo() {
  return (
    <div className="rounded-lg bg-[#d1fae5]/40 dark:bg-[#0E7C66]/10 border border-[#0E7C66]/30 dark:border-[#0E7C66]/30 px-3 py-2.5 text-xs text-[#0a6354] dark:text-[#A3E635]">
      <p className="font-semibold mb-1">Regulamento FPP — formato automático por série</p>
      <p className="text-[#0E7C66] dark:text-[#A3E635]">
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
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>(["OPEN"]);

  // Scheduling configuration
  const [days, setDays] = useState<DayWindow[]>([]);
  const [minutesPerMatch, setMinutesPerMatch] = useState(90);
  const [teamsPerCat, setTeamsPerCat] = useState(8);

  const isFPPAuto = tournamentMode === "fpp_auto";
  const isGroups = !isFPPAuto && format === "groups_knockout";
  const isSingle = !isFPPAuto && format === "single_elimination";
  const effectiveFormat = isFPPAuto ? "fpp_auto" : format;
  const courts = Math.max(1, Number(courtCount) || 1);

  // Total available match slots
  const totalSlots = useMemo(() => {
    if (days.length === 0) return 0;
    return days.reduce((acc, d) => {
      const [sh, sm] = d.startTime.split(":").map(Number);
      const [eh, em] = d.endTime.split(":").map(Number);
      const windowMins = eh * 60 + em - (sh * 60 + sm);
      return acc + Math.floor(windowMins / minutesPerMatch) * courts;
    }, 0);
  }, [days, minutesPerMatch, courts]);

  // Capacity estimate for the selected team count
  const estimate = useMemo(() => {
    const mpc = matchesPerCategory(effectiveFormat, groupCount, advanceCount, teamsPerCat, thirdPlace);
    const cats = selectedCategories.length;
    const totalNeeded = mpc.total * cats;
    const slack = totalSlots - totalNeeded;
    const maxCats = mpc.total > 0 ? Math.floor(totalSlots / mpc.total) : 0;
    return { mpc, totalNeeded, slack, maxCats };
  }, [effectiveFormat, groupCount, advanceCount, teamsPerCat, thirdPlace, selectedCategories.length, totalSlots]);

  function applyDates(s: string, e: string) {
    if (s && e && s <= e) setDays(buildDays(s, e));
    else if (s && !e) setDays(buildDays(s, s));
    else if (!s) setDays([]);
  }

  function handleStartDate(v: string) {
    setStartDate(v);
    if (endDate && v > endDate) { setEndDate(v); applyDates(v, v); }
    else applyDates(v, endDate);
  }
  function handleEndDate(v: string) {
    setEndDate(v);
    applyDates(startDate, v);
  }

  function updateDay(i: number, field: keyof DayWindow, v: string) {
    setDays((prev) => prev.map((d, idx) => idx === i ? { ...d, [field]: v } : d));
  }

  function toggleCategory(code: string) {
    setSelectedCategories((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  }

  function handleModeChange(mode: TournamentMode) {
    setTournamentMode(mode);
    if (mode === "fpp_auto") {
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
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        slotMinutes: minutesPerMatch,
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

  const showCapacity = days.length > 0;

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
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0E7C66] focus:border-transparent dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 resize-none"
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
                    ? "border-[#0E7C66] bg-[#d1fae5]/40 text-[#0E7C66] dark:bg-[#0E7C66]/15 dark:text-[#A3E635] dark:border-[#0E7C66]"
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
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0E7C66] focus:border-transparent dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
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
            className="h-4 w-4 rounded border-slate-300 text-[#0E7C66] focus:ring-[#0E7C66]"
            checked={starPoint}
            onChange={(e) => setStarPoint(e.target.checked)}
          />
          <span className="text-sm text-slate-700 dark:text-slate-300">Star Point (FIP 2026) — ponto de ouro a 40-40</span>
        </label>

        {(isSingle || isFPPAuto) && (
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-[#0E7C66] focus:ring-[#0E7C66]"
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
                  className="h-4 w-4 rounded border-slate-300 text-[#0E7C66] focus:ring-[#0E7C66]"
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
                                ? "bg-[#d1fae5] text-[#0E7C66] dark:bg-[#0E7C66]/20 dark:text-[#A3E635] ring-1 ring-[#0E7C66]"
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
                            ? "bg-[#d1fae5] text-[#0E7C66] dark:bg-[#0E7C66]/20 dark:text-[#A3E635] ring-1 ring-[#0E7C66]"
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

        {/* Bloco C — Disponibilidade e capacidade */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Disponibilidade
            </label>
            <span className="text-xs text-slate-400">Define os dias e horários do torneio</span>
          </div>

          {/* Date range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-500 mb-0.5 block">Data de início</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => handleStartDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0E7C66] focus:border-transparent dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-0.5 block">Data de fim</label>
              <input
                type="date"
                value={endDate}
                min={startDate || undefined}
                onChange={(e) => handleEndDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0E7C66] focus:border-transparent dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>
          </div>

          {/* Per-day time windows */}
          {days.length > 0 && (
            <div className="rounded-lg border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
              <div className="grid grid-cols-[1fr_auto_auto] gap-0 text-[10px] font-semibold uppercase tracking-wide text-slate-400 px-3 py-1.5 bg-slate-50 dark:bg-slate-800/60">
                <span>Dia</span>
                <span className="w-20 text-center">Início</span>
                <span className="w-20 text-center">Fim</span>
              </div>
              {days.map((day, i) => (
                <div key={day.date} className="grid grid-cols-[1fr_auto_auto] gap-2 items-center px-3 py-1.5">
                  <span className="text-xs text-slate-600 dark:text-slate-300 capitalize truncate">
                    {fmtWeekday(day.date)}
                  </span>
                  <input
                    type="time"
                    value={day.startTime}
                    onChange={(e) => updateDay(i, "startTime", e.target.value)}
                    className="w-20 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-1.5 py-1 text-xs text-center focus:outline-none focus:ring-1 focus:ring-[#0E7C66]"
                  />
                  <input
                    type="time"
                    value={day.endTime}
                    onChange={(e) => updateDay(i, "endTime", e.target.value)}
                    className="w-20 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-1.5 py-1 text-xs text-center focus:outline-none focus:ring-1 focus:ring-[#0E7C66]"
                  />
                </div>
              ))}
            </div>
          )}

          {/* Minutes per match */}
          <div className="flex items-center gap-3">
            <label className="text-sm text-slate-600 dark:text-slate-400 shrink-0">Duração por jogo</label>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min={15}
                max={240}
                value={minutesPerMatch}
                onChange={(e) => setMinutesPerMatch(Math.max(15, Math.min(240, Number(e.target.value))))}
                className="w-16 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-[#0E7C66]"
              />
              <span className="text-sm text-slate-400">min</span>
            </div>
          </div>

          {/* Capacity estimate */}
          {showCapacity && (
            <CapacityBox
              totalSlots={totalSlots}
              courts={courts}
              days={days}
              minutesPerMatch={minutesPerMatch}
              format={effectiveFormat}
              groupCount={groupCount}
              advanceCount={advanceCount}
              thirdPlace={isSingle || isFPPAuto ? thirdPlace : false}
              categoryCount={selectedCategories.length}
              teamsPerCat={teamsPerCat}
              onTeamsChange={setTeamsPerCat}
              estimate={estimate}
              isGroups={isGroups}
            />
          )}
        </div>

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

// ── Capacity estimate box ──────────────────────────────────────────────────────

interface CapacityBoxProps {
  totalSlots: number;
  courts: number;
  days: DayWindow[];
  minutesPerMatch: number;
  format: string;
  groupCount: number;
  advanceCount: number;
  thirdPlace: boolean;
  categoryCount: number;
  teamsPerCat: number;
  onTeamsChange: (n: number) => void;
  estimate: {
    mpc: { groupMatches: number; knockoutMatches: number; total: number };
    totalNeeded: number;
    slack: number;
    maxCats: number;
  };
  isGroups: boolean;
}

function CapacityBox({
  totalSlots, courts, days, minutesPerMatch,
  format, groupCount, advanceCount, isGroups,
  categoryCount, teamsPerCat, onTeamsChange, estimate,
}: CapacityBoxProps) {
  const { mpc, totalNeeded, slack, maxCats } = estimate;
  const fits = slack >= 0;
  const hasEstimate = mpc.total > 0 && totalSlots > 0;

  const formatLabel: Record<string, string> = {
    groups_knockout: "Grupos + Eliminação",
    single_elimination: "Eliminação Simples",
    double_elimination: "Eliminação Dupla",
    round_robin: "Todos contra Todos",
    fpp_auto: "FPP Automático",
  };

  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 p-3 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Estimativa de capacidade</p>
        <p className="text-[10px] text-slate-400">
          {totalSlots} slot{totalSlots !== 1 ? "s" : ""} × {minutesPerMatch} min
          {" · "}{courts} campo{courts !== 1 ? "s" : ""}
          {" · "}{days.length} dia{days.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Teams per category control */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-500 shrink-0">Duplas por série:</span>
        <button
          type="button"
          onClick={() => onTeamsChange(Math.max(2, teamsPerCat - 1))}
          className="w-6 h-6 rounded border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 text-sm font-bold flex items-center justify-center"
        >−</button>
        <span className="w-8 text-center text-sm font-semibold text-slate-700 dark:text-slate-200">{teamsPerCat}</span>
        <button
          type="button"
          onClick={() => onTeamsChange(Math.min(32, teamsPerCat + 1))}
          className="w-6 h-6 rounded border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 text-sm font-bold flex items-center justify-center"
        >+</button>
      </div>

      {hasEstimate && (
        <>
          {/* Match breakdown */}
          <div className="text-xs space-y-0.5 text-slate-500 dark:text-slate-400">
            <p className="font-medium text-slate-600 dark:text-slate-300">
              {formatLabel[format] ?? format}
              {isGroups && ` — ${groupCount} grupos, ${advanceCount} avançam`}
            </p>
            {mpc.groupMatches > 0 && (
              <p>Fase de grupos: <span className="font-medium text-slate-600 dark:text-slate-300">{mpc.groupMatches} jogo{mpc.groupMatches !== 1 ? "s" : ""}</span> por série</p>
            )}
            {mpc.knockoutMatches > 0 && (
              <p>Fase eliminatória: <span className="font-medium text-slate-600 dark:text-slate-300">{mpc.knockoutMatches} jogo{mpc.knockoutMatches !== 1 ? "s" : ""}</span> por série</p>
            )}
            <p className="font-semibold text-slate-600 dark:text-slate-300">
              Total por série: {mpc.total} jogos
            </p>
          </div>

          {/* Result */}
          <div className={`rounded-md px-3 py-2 text-xs ${
            fits
              ? "bg-emerald-50 dark:bg-[#0E7C66]/10 border border-emerald-200 dark:border-[#0E7C66]/30 text-emerald-700 dark:text-[#A3E635]"
              : "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400"
          }`}>
            <p className="font-semibold">
              {categoryCount} série{categoryCount !== 1 ? "s" : ""} × {mpc.total} = {totalNeeded} jogos
              {fits
                ? ` · cabe (${slack} slot${slack !== 1 ? "s" : ""} livres)`
                : ` · ${Math.abs(slack)} jogo${Math.abs(slack) !== 1 ? "s" : ""} a mais`}
            </p>
            {!fits && maxCats > 0 && (
              <p className="mt-0.5 opacity-80">
                Com {teamsPerCat} duplas por série, cabem no máximo {maxCats} série{maxCats !== 1 ? "s" : ""}
              </p>
            )}
            {fits && (
              <p className="mt-0.5 opacity-80">
                Capacidade máxima: {maxCats} série{maxCats !== 1 ? "s" : ""} com {teamsPerCat} duplas cada
              </p>
            )}
          </div>
        </>
      )}

      {!hasEstimate && totalSlots > 0 && (
        <p className="text-xs text-slate-400">Ajusta as duplas por série para ver a estimativa.</p>
      )}
      {totalSlots === 0 && (
        <p className="text-xs text-slate-400">Define os horários de cada dia para calcular a capacidade.</p>
      )}
    </div>
  );
}
