"use client";

import { useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/ToastProvider";
import type { Category, Match, Tournament } from "@/types";

interface Props {
  tournament: Tournament;
  allMatches: Match[];
  categories: Category[];
  token: string;
  isAdmin: boolean;
  onUpdate: () => void;
}

type DayWindow = { date: string; startTime: string; endTime: string };

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendente",
  in_progress: "Em curso",
  completed: "Concluído",
  bye: "Bye",
};

const STATUS_CLASS: Record<string, string> = {
  pending:     "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
  in_progress: "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
  completed:   "bg-[#d1fae5]/60 text-[#0E7C66] dark:bg-[#0E7C66]/15 dark:text-[#A3E635]",
};

const ROW_STATUS_BG: Record<string, string> = {
  in_progress: "bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-900/40",
  completed:   "bg-emerald-50/70 dark:bg-[#0E7C66]/10 border-emerald-100 dark:border-[#0E7C66]/20",
};

function todayStr() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function dateToStr(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function fmtTime(date: Date | string) {
  return new Date(date).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
}

function fmtDayHeading(dateStr: string) {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("pt-PT", {
    weekday: "long", day: "numeric", month: "long",
  });
}

function toInputValue(date: Date | string | null) {
  if (!date) return "";
  const d = new Date(date);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fmtInterval(date: Date | string, slotMinutes: number) {
  const start = new Date(date);
  const end = new Date(start.getTime() + slotMinutes * 60_000);
  const t = (d: Date) => d.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
  return `${t(start)}–${t(end)}`;
}

function findConflict(
  court: string,
  timeStr: string,
  slotMinutes: number,
  allMatches: Match[],
  excludeId: string
): Match | null {
  if (!court.trim() || !timeStr) return null;
  const newStart = new Date(timeStr).getTime();
  if (isNaN(newStart)) return null;
  const newEnd = newStart + slotMinutes * 60_000;
  const courtNorm = court.trim().toLowerCase();

  for (const m of allMatches) {
    if (m.id === excludeId) continue;
    if (!m.court || !m.scheduledAt) continue;
    if (m.court.trim().toLowerCase() !== courtNorm) continue;
    const mStart = new Date(m.scheduledAt).getTime();
    const mEnd = mStart + slotMinutes * 60_000;
    if (newStart < mEnd && newEnd > mStart) return m;
  }
  return null;
}

function buildDaysFromRange(start: Date, end: Date): DayWindow[] {
  const days: DayWindow[] = [];
  const cur = new Date(start); cur.setHours(0, 0, 0, 0);
  const fin = new Date(end);   fin.setHours(0, 0, 0, 0);
  while (cur <= fin) {
    days.push({ date: dateToStr(cur), startTime: "09:00", endTime: "23:59" });
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

// ── Edit panel (inline below a row) ────────────────────────────────────────────

interface EditPanelProps {
  match: Match;
  slug: string;
  token: string;
  slotMinutes: number;
  allMatches: Match[];
  onSaved: () => void;
  onCancel: () => void;
}

function EditPanel({ match, slug, token, slotMinutes, allMatches, onSaved, onCancel }: EditPanelProps) {
  const { toast } = useToast();
  const [courtVal, setCourtVal] = useState(match.court ?? "");
  const [timeVal, setTimeVal] = useState(toInputValue(match.scheduledAt));
  const [saving, setSaving] = useState(false);

  // Live conflict detection
  const conflict = findConflict(courtVal, timeVal, slotMinutes, allMatches, match.id);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/tournament/${slug}/schedule?token=${token}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId: match.id,
          court: courtVal.trim() || null,
          scheduledAt: timeVal ? new Date(timeVal).toISOString() : null,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast("Jogo agendado!");
      onSaved();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Erro ao agendar");
    } finally {
      setSaving(false);
    }
  }

  const hasConflict = Boolean(conflict);
  const courtCls = `rounded-md border px-2 py-1 text-xs focus:outline-none focus:ring-1 w-28 bg-white dark:bg-slate-800 ${
    hasConflict
      ? "border-amber-400 focus:ring-amber-400 dark:border-amber-500"
      : "border-slate-300 dark:border-slate-600 focus:ring-[#0E7C66]"
  }`;
  const timeCls = `rounded-md border px-2 py-1 text-xs focus:outline-none focus:ring-1 bg-white dark:bg-slate-800 ${
    hasConflict
      ? "border-amber-400 focus:ring-amber-400 dark:border-amber-500"
      : "border-slate-300 dark:border-slate-600 focus:ring-[#0E7C66]"
  }`;

  return (
    <div className="py-2 px-3 bg-slate-50 dark:bg-slate-800/60 rounded-b-lg border-t border-slate-100 dark:border-slate-700 space-y-2">
      <div className="flex items-end gap-2 flex-wrap">
        <div>
          <label className="block text-[10px] text-slate-400 mb-0.5">Campo</label>
          <input
            value={courtVal}
            onChange={(e) => setCourtVal(e.target.value)}
            placeholder="Campo 1"
            className={courtCls}
          />
        </div>
        <div>
          <label className="block text-[10px] text-slate-400 mb-0.5">Data / Hora início</label>
          <input
            type="datetime-local"
            value={timeVal}
            onChange={(e) => setTimeVal(e.target.value)}
            className={timeCls}
          />
        </div>
        {timeVal && slotMinutes > 0 && (
          <div className="pb-0.5">
            <p className="text-[10px] text-slate-400 mb-0.5">Fim</p>
            <p className="text-xs font-mono text-slate-500 dark:text-slate-400 py-1">
              {new Date(new Date(timeVal).getTime() + slotMinutes * 60_000)
                .toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
        )}
        <div className="flex gap-1.5 pb-0.5">
          <Button size="sm" loading={saving} onClick={save}>Guardar</Button>
          <Button size="sm" variant="secondary" onClick={onCancel}>Cancelar</Button>
        </div>
      </div>
      {conflict && (
        <div className="flex items-start gap-1.5 rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 px-2.5 py-2 text-xs text-amber-700 dark:text-amber-400">
          <svg className="h-3.5 w-3.5 mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <span>
            <strong>{courtVal}</strong> já está ocupado nesse horário —{" "}
            {conflict.team1?.name ?? "?"} vs {conflict.team2?.name ?? "?"}
            {conflict.scheduledAt && (
              <> ({fmtInterval(conflict.scheduledAt, slotMinutes)})</>
            )}
          </span>
        </div>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function ScheduleManager({ tournament, allMatches, categories, token, isAdmin, onUpdate }: Props) {
  const { toast } = useToast();
  const hasMultipleCategories = categories.length > 1;
  const [selectedCats, setSelectedCats] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);

  function toggleCat(code: string) {
    setSelectedCats((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code); else next.add(code);
      return next;
    });
  }

  // Auto-schedule form
  const [showAuto, setShowAuto] = useState(false);
  const [days, setDays] = useState<DayWindow[]>(() => {
    if (tournament.startDate && tournament.endDate) {
      return buildDaysFromRange(new Date(tournament.startDate), new Date(tournament.endDate));
    }
    return [{ date: todayStr(), startTime: "09:00", endTime: "23:59" }];
  });
  const [minutesPerMatch, setMinutesPerMatch] = useState(tournament.slotMinutes ?? 90);
  const [autoLoading, setAutoLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const categoryMap = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories]
  );

  const playable = useMemo(
    () => allMatches.filter((m) => m.status !== "bye"),
    [allMatches]
  );

  const filtered = useMemo(() => {
    if (selectedCats.size === 0) return playable;
    const catIds = new Set(
      categories.filter((c) => selectedCats.has(c.code)).map((c) => c.id)
    );
    return playable.filter((m) => m.categoryId && catIds.has(m.categoryId));
  }, [playable, selectedCats, categories]);

  // Split into scheduled (grouped by date) and unscheduled
  const { byDate, unscheduled } = useMemo(() => {
    const groups: Record<string, Match[]> = {};
    const unsched: Match[] = [];
    for (const m of filtered) {
      if (!m.scheduledAt) { unsched.push(m); continue; }
      const key = dateToStr(new Date(m.scheduledAt));
      (groups[key] ??= []).push(m);
    }
    // Sort within each day: by time then court
    for (const key of Object.keys(groups)) {
      groups[key].sort((a, b) => {
        const td = new Date(a.scheduledAt!).getTime() - new Date(b.scheduledAt!).getTime();
        if (td !== 0) return td;
        return (a.court ?? "").localeCompare(b.court ?? "");
      });
    }
    // Sort days chronologically
    const sortedGroups: Record<string, Match[]> = {};
    for (const k of Object.keys(groups).sort()) sortedGroups[k] = groups[k];
    return { byDate: sortedGroups, unscheduled: unsched };
  }, [filtered]);

  const scheduledCount = filtered.filter((m) => m.scheduledAt).length;

  function matchLabel(m: Match) {
    if (m.bracketType === "final") return "Final";
    if (m.bracketType === "third_place") return "3.º lugar";
    if (m.bracketType === "group") return `Gr.${(m.groupIndex ?? 0) + 1} J${m.position + 1}`;
    return `R${m.round} J${m.position + 1}`;
  }

  // Auto-schedule helpers
  function addDay() {
    setDays((prev) => {
      const last = prev[prev.length - 1];
      const next = new Date(last.date + "T12:00:00");
      next.setDate(next.getDate() + 1);
      return [...prev, { date: dateToStr(next), startTime: last.startTime, endTime: last.endTime }];
    });
  }
  function removeDay(i: number) { setDays((p) => p.filter((_, idx) => idx !== i)); }
  function updateDay(i: number, f: keyof DayWindow, v: string) {
    setDays((p) => p.map((d, idx) => idx === i ? { ...d, [f]: v } : d));
  }
  function fillFromDates() {
    if (tournament.startDate && tournament.endDate)
      setDays(buildDaysFromRange(new Date(tournament.startDate), new Date(tournament.endDate)));
  }

  // Resolve active category IDs for the current filter (undefined = no filter = all)
  const activeCategoryIds = useMemo(() => {
    if (selectedCats.size === 0) return undefined;
    const ids = categories.filter((c) => selectedCats.has(c.code)).map((c) => c.id);
    return ids.length > 0 ? ids : undefined;
  }, [selectedCats, categories]);

  async function autoSchedule() {
    setAutoLoading(true);
    try {
      const body: Record<string, unknown> = { days, minutesPerMatch };
      if (activeCategoryIds) body.categoryIds = activeCategoryIds;
      const res = await fetch(`/api/tournament/${tournament.slug}/schedule?token=${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const data = await res.json();
      const label = selectedCats.size > 0 ? ` (${Array.from(selectedCats).join(", ")})` : "";
      toast(`${data.updated} jogos agendados automaticamente${label}!`);
      setShowAuto(false);
      onUpdate();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Erro no agendamento automático");
    } finally {
      setAutoLoading(false);
    }
  }

  async function resetSchedule() {
    const label = selectedCats.size > 0 ? `${Array.from(selectedCats).join(", ")}` : "todo o torneio";
    if (!confirm(`Apagar o agendamento de ${label}? Os resultados não são afectados.`)) return;
    setResetLoading(true);
    try {
      const body: Record<string, unknown> = {};
      if (activeCategoryIds) body.categoryIds = activeCategoryIds;
      const res = await fetch(`/api/tournament/${tournament.slug}/schedule?token=${token}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const data = await res.json();
      toast(`Agendamento limpo (${data.cleared} jogos).`);
      onUpdate();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Erro ao limpar agendamento");
    } finally {
      setResetLoading(false);
    }
  }

  const courts = tournament.courtCount ?? 1;

  // ── Table row ──────────────────────────────────────────────────────────────

  function MatchRow({ m, showTime }: { m: Match; showTime: boolean }) {
    const isEditing = editingId === m.id;
    const cat = m.categoryId ? categoryMap.get(m.categoryId) : null;
    const label = matchLabel(m);
    const team1 = m.team1?.name ?? "—";
    const team2 = m.team2?.name ?? "—";

    const whatsappHref = (() => {
      if (!m.court || !m.scheduledAt) return null;
      const d = new Date(m.scheduledAt);
      const dateStr = d.toLocaleDateString("pt-PT", { weekday: "short", day: "numeric", month: "short" });
      const timeStr = d.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
      const catLabel = cat ? ` — ${cat.code}` : "";
      const msg = `🎾 *${tournament.name}*${catLabel}\n\n*${team1}* vs *${team2}*\n📅 ${dateStr} às ${timeStr}\n🏟️ ${m.court}\n\nBoa sorte a todas as duplas!`;
      return `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
    })();

    return (
      <>
        <tr className={`border-b transition-colors ${
          isEditing
            ? "bg-slate-50/80 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800"
            : (ROW_STATUS_BG[m.status] ?? "border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/30")
        }`}>
          {/* Time */}
          <td className="px-3 py-2.5 text-xs font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">
            {m.scheduledAt && showTime ? fmtInterval(m.scheduledAt, tournament.slotMinutes ?? 90) : ""}
          </td>
          {/* Court */}
          <td className="px-3 py-2.5 text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
            {m.court ?? <span className="text-slate-300 dark:text-slate-600">—</span>}
          </td>
          {/* Category (multi-category only) */}
          {hasMultipleCategories && (
            <td className="px-3 py-2.5">
              {cat && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                  {cat.code}
                </span>
              )}
            </td>
          )}
          {/* Round label */}
          <td className="px-2 py-2.5 text-[10px] text-slate-400 whitespace-nowrap">{label}</td>
          {/* Teams */}
          <td className="px-3 py-2.5 text-sm text-slate-700 dark:text-slate-200">
            <span className="font-medium">{team1}</span>
            <span className="text-slate-400 mx-1.5">vs</span>
            <span className="font-medium">{team2}</span>
          </td>
          {/* Status */}
          <td className="px-3 py-2.5">
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${STATUS_CLASS[m.status] ?? STATUS_CLASS.pending}`}>
              {STATUS_LABEL[m.status] ?? m.status}
            </span>
          </td>
          {/* Actions */}
          <td className="px-3 py-2.5 whitespace-nowrap">
            <div className="flex items-center gap-2 justify-end">
              {isAdmin && whatsappHref && (
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#0E7C66] hover:text-[#0a6354] transition-colors"
                  title="Partilhar via WhatsApp"
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                </a>
              )}
              {isAdmin && m.status !== "completed" && m.status !== "in_progress" && (
                <button
                  onClick={() => setEditingId(isEditing ? null : m.id)}
                  className={`text-xs transition-colors ${isEditing ? "text-[#0E7C66] dark:text-[#A3E635]" : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"}`}
                  title={m.court || m.scheduledAt ? "Editar agendamento" : "Agendar jogo"}
                >
                  {isEditing ? "✕" : (m.court || m.scheduledAt ? "Editar" : "Agendar")}
                </button>
              )}
            </div>
          </td>
        </tr>
        {isEditing && (
          <tr>
            <td colSpan={hasMultipleCategories ? 7 : 6} className="p-0">
              <EditPanel
                match={m}
                slug={tournament.slug}
                token={token}
                slotMinutes={tournament.slotMinutes ?? 90}
                allMatches={allMatches}
                onSaved={() => { setEditingId(null); onUpdate(); }}
                onCancel={() => setEditingId(null)}
              />
            </td>
          </tr>
        )}
      </>
    );
  }

  // ── Table block (one per day or "unscheduled") ──────────────────────────────

  function ScheduleTable({ matches, showTimeCol }: { matches: Match[]; showTimeCol: boolean }) {
    // Track which rows should suppress the time (same time + court = repeated)
    const shownTimes = new Set<string>();
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700">
              <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400 whitespace-nowrap">Hora</th>
              <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400 whitespace-nowrap">Campo</th>
              {hasMultipleCategories && (
                <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Série</th>
              )}
              <th className="px-2 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Ronda</th>
              <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Duplas</th>
              <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Estado</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {matches.map((m) => {
              const timeKey = m.scheduledAt ? fmtTime(m.scheduledAt) : "";
              const show = showTimeCol && !shownTimes.has(timeKey);
              if (timeKey) shownTimes.add(timeKey);
              return <MatchRow key={m.id} m={m} showTime={show} />;
            })}
          </tbody>
        </table>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">Horário do Torneio</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {courts} campo{courts !== 1 ? "s" : ""} · {scheduledCount} de {filtered.length} jogos agendados
            {selectedCats.size > 0 && (
              <span className="ml-1 text-[#0E7C66] dark:text-[#A3E635]">· {Array.from(selectedCats).join(", ")}</span>
            )}
          </p>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAuto((v) => !v)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${showAuto ? "border-[#0E7C66] text-[#0E7C66] bg-[#d1fae5]/30 dark:bg-[#0E7C66]/10 dark:text-[#A3E635]" : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-[#0E7C66] hover:text-[#0E7C66] dark:hover:text-[#A3E635]"}`}
            >
              Agendar automaticamente
            </button>
            <button
              onClick={resetSchedule}
              disabled={resetLoading}
              className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-red-500 hover:border-red-300 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors disabled:opacity-50"
              title={selectedCats.size > 0 ? `Limpar agendamento de ${Array.from(selectedCats).join(", ")}` : "Limpar todo o agendamento"}
            >
              {resetLoading ? "A limpar…" : "Limpar agenda"}
            </button>
          </div>
        )}
      </div>

      {/* Category filter chips (multi-select) */}
      {hasMultipleCategories && (
        <div className="flex gap-1.5 flex-wrap">
          <button
            onClick={() => setSelectedCats(new Set())}
            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
              selectedCats.size === 0
                ? "bg-[#d1fae5] text-[#0E7C66] dark:bg-[#0E7C66]/20 dark:text-[#A3E635] ring-1 ring-[#0E7C66]"
                : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            Todas
          </button>
          {categories.map((cat) => {
            const active = selectedCats.has(cat.code);
            return (
              <button
                key={cat.id}
                onClick={() => toggleCat(cat.code)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                  active
                    ? "bg-[#d1fae5] text-[#0E7C66] dark:bg-[#0E7C66]/20 dark:text-[#A3E635] ring-1 ring-[#0E7C66]"
                    : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                {cat.code}
              </button>
            );
          })}
        </div>
      )}

      {/* Auto-schedule form (admin only) */}
      {isAdmin && showAuto && (
        <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">
              {selectedCats.size > 0
                ? <>Agenda os jogos de <strong>{Array.from(selectedCats).join(", ")}</strong> (sem hora marcada) pelos {courts} campo{courts !== 1 ? "s" : ""}.</>
                : <>Agenda todos os jogos sem hora marcada pelos {courts} campo{courts !== 1 ? "s" : ""}.</>}
            </p>
            {tournament.startDate && tournament.endDate && (
              <button
                onClick={fillFromDates}
                className="text-xs text-[#0E7C66] dark:text-[#A3E635] hover:underline whitespace-nowrap ml-2"
              >
                Usar datas do torneio
              </button>
            )}
          </div>
          <div className="space-y-2">
            {days.map((day, i) => (
              <div key={i} className="grid grid-cols-[1fr_auto_auto_auto] gap-1.5 items-end">
                <div>
                  {i === 0 && <label className="block text-[10px] text-slate-400 mb-0.5">Data</label>}
                  <input type="date" value={day.date}
                    onChange={(e) => updateDay(i, "date", e.target.value)}
                    className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#0E7C66]"
                  />
                </div>
                <div>
                  {i === 0 && <label className="block text-[10px] text-slate-400 mb-0.5">Início</label>}
                  <input type="time" value={day.startTime}
                    onChange={(e) => updateDay(i, "startTime", e.target.value)}
                    className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#0E7C66]"
                  />
                </div>
                <div>
                  {i === 0 && <label className="block text-[10px] text-slate-400 mb-0.5">Fim</label>}
                  <input type="time" value={day.endTime}
                    onChange={(e) => updateDay(i, "endTime", e.target.value)}
                    className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#0E7C66]"
                  />
                </div>
                <div className={i === 0 ? "pt-4" : ""}>
                  {days.length > 1 && (
                    <button onClick={() => removeDay(i)}
                      className="text-slate-400 hover:text-red-500 transition-colors text-sm px-1" title="Remover dia">×</button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <button onClick={addDay} className="text-xs text-[#0E7C66] dark:text-[#A3E635] hover:underline">
            + Adicionar dia
          </button>
          <div>
            <label className="text-xs text-slate-500 font-medium">Minutos por jogo</label>
            <input type="number" min={15} max={240} value={minutesPerMatch}
              onChange={(e) => setMinutesPerMatch(Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#0E7C66]"
            />
          </div>
          <Button size="sm" loading={autoLoading} onClick={autoSchedule} className="w-full">
            Gerar agenda
          </Button>
        </div>
      )}

      {/* Schedule tables */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-700 py-10 text-center">
          <p className="text-sm text-slate-400">Sem jogos agendáveis ainda. Gera o bracket primeiro.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Days with scheduled matches */}
          {Object.entries(byDate).map(([dateKey, matches]) => (
            <div key={dateKey} className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700">
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 capitalize">
                  {fmtDayHeading(dateKey)}
                </p>
              </div>
              <ScheduleTable matches={matches} showTimeCol={true} />
            </div>
          ))}

          {/* Unscheduled */}
          {unscheduled.length > 0 && (
            <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="px-4 py-2.5 bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-200 dark:border-slate-700">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Sem data marcada · {unscheduled.length} jogo{unscheduled.length !== 1 ? "s" : ""}
                </p>
              </div>
              <ScheduleTable matches={unscheduled} showTimeCol={false} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
