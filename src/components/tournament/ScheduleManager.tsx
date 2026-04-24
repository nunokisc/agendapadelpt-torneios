"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/ToastProvider";
import type { Match, Tournament } from "@/types";

interface Props {
  tournament: Tournament;
  matches: Match[];
  token: string;
  onUpdate: () => void;
}

function fmt(date: Date | string | null) {
  if (!date) return "";
  return new Date(date).toLocaleString("pt-PT", {
    day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
  });
}

function toInputValue(date: Date | string | null) {
  if (!date) return "";
  const d = new Date(date);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function ScheduleManager({ tournament, matches, token, onUpdate }: Props) {
  const { toast } = useToast();
  const [editing, setEditing] = useState<string | null>(null);
  const [courtVal, setCourtVal] = useState("");
  const [timeVal, setTimeVal] = useState("");
  const [saving, setSaving] = useState(false);

  // Auto-schedule form
  const [showAuto, setShowAuto] = useState(false);
  const [startTime, setStartTime] = useState(() => {
    const d = new Date();
    d.setMinutes(0, 0, 0);
    return toInputValue(d);
  });
  const [minutesPerMatch, setMinutesPerMatch] = useState(90);
  const [autoLoading, setAutoLoading] = useState(false);

  const playable = matches.filter((m) => m.status !== "bye");

  function startEdit(m: Match) {
    setEditing(m.id);
    setCourtVal(m.court ?? "");
    setTimeVal(toInputValue(m.scheduledAt));
  }

  async function saveMatch(matchId: string) {
    setSaving(true);
    try {
      const res = await fetch(`/api/tournament/${tournament.slug}/schedule?token=${token}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId,
          court: courtVal.trim() || null,
          scheduledAt: timeVal ? new Date(timeVal).toISOString() : null,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setEditing(null);
      onUpdate();
      toast("Jogo agendado!");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Erro ao agendar");
    } finally {
      setSaving(false);
    }
  }

  async function autoSchedule() {
    setAutoLoading(true);
    try {
      const res = await fetch(`/api/tournament/${tournament.slug}/schedule?token=${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startTime: new Date(startTime).toISOString(),
          minutesPerMatch,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const data = await res.json();
      toast(`${data.updated} jogos agendados automaticamente!`);
      setShowAuto(false);
      onUpdate();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Erro no agendamento automático");
    } finally {
      setAutoLoading(false);
    }
  }

  const courts = tournament.courtCount ?? 1;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Agenda de jogos</CardTitle>
          <button
            onClick={() => setShowAuto((v) => !v)}
            className="text-xs text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 transition-colors"
          >
            Agendar automaticamente
          </button>
        </div>
        <p className="text-xs text-slate-500 mt-0.5">
          {courts} campo{courts !== 1 ? "s" : ""} disponível{courts !== 1 ? "is" : ""}
        </p>
      </CardHeader>

      {showAuto && (
        <div className="mb-4 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3">
          <p className="text-xs text-slate-500">
            Distribui todos os jogos pelos {courts} campo{courts !== 1 ? "s" : ""} por ronda.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-slate-500 font-medium">Início</label>
              <input
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 font-medium">Minutos por jogo</label>
              <input
                type="number"
                min={15}
                max={240}
                value={minutesPerMatch}
                onChange={(e) => setMinutesPerMatch(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
          <Button size="sm" loading={autoLoading} onClick={autoSchedule} className="w-full">
            Gerar agenda
          </Button>
        </div>
      )}

      <div className="space-y-1">
        {playable.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-4">
            Sem jogos agendáveis ainda. Gera o bracket primeiro.
          </p>
        )}
        {playable.map((m) => {
          const isEditing = editing === m.id;
          const label = m.bracketType === "final" ? "Final"
            : m.bracketType === "third_place" ? "3.º lugar"
            : `R${m.round} J${m.position + 1}`;
          const team1 = m.team1?.name ?? "—";
          const team2 = m.team2?.name ?? "—";

          return (
            <div
              key={m.id}
              className="rounded-lg border border-slate-100 dark:border-slate-800 px-3 py-2"
            >
              {isEditing ? (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">{label}: {team1} vs {team2}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-slate-500">Campo</label>
                      <input
                        value={courtVal}
                        onChange={(e) => setCourtVal(e.target.value)}
                        placeholder={`Campo 1`}
                        className="mt-0.5 w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500">Hora</label>
                      <input
                        type="datetime-local"
                        value={timeVal}
                        onChange={(e) => setTimeVal(e.target.value)}
                        className="mt-0.5 w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" loading={saving} onClick={() => saveMatch(m.id)}>Guardar</Button>
                    <Button size="sm" variant="secondary" onClick={() => setEditing(null)}>Cancelar</Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{label}</p>
                    <p className="text-sm text-slate-700 dark:text-slate-300 truncate">
                      {team1} <span className="text-slate-400">vs</span> {team2}
                    </p>
                    {(m.court || m.scheduledAt) && (
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
                        {m.court}{m.court && m.scheduledAt ? " · " : ""}{m.scheduledAt ? fmt(m.scheduledAt) : ""}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => startEdit(m)}
                    className="text-xs text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 shrink-0 transition-colors"
                  >
                    {m.court || m.scheduledAt ? "Editar" : "Agendar"}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
