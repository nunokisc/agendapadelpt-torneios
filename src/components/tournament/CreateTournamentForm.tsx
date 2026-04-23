"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import type { TournamentFormat } from "@/types";

const FORMAT_OPTIONS = [
  { value: "single_elimination", label: "Eliminação Simples" },
  { value: "double_elimination", label: "Eliminação Dupla" },
  { value: "round_robin", label: "Todos contra Todos (Round Robin)" },
  { value: "groups_knockout", label: "Fase de Grupos + Eliminação" },
];

const SETS_OPTIONS = [
  { value: 1, label: "1 set" },
  { value: 2, label: "Melhor de 3 (2 sets para ganhar)" },
  { value: 3, label: "Melhor de 5 (3 sets para ganhar)" },
];

const POINTS_OPTIONS = [
  { value: 24, label: "24 pontos" },
  { value: 21, label: "21 pontos" },
  { value: 16, label: "16 pontos" },
  { value: 11, label: "11 pontos" },
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

export default function CreateTournamentForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [format, setFormat] = useState<TournamentFormat>("single_elimination");
  const [setsToWin, setSetsToWin] = useState(1);
  const [pointsPerSet, setPointsPerSet] = useState(24);
  const [thirdPlace, setThirdPlace] = useState(false);
  const [groupCount, setGroupCount] = useState(2);
  const [advanceCount, setAdvanceCount] = useState(2);

  const isGroups = format === "groups_knockout";
  const isSingle = format === "single_elimination";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("O nome do torneio é obrigatório.");
      return;
    }

    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        name: name.trim(),
        description: description.trim() || undefined,
        format,
        setsToWin,
        pointsPerSet,
        thirdPlace: isSingle ? thirdPlace : false,
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
        <p className="text-sm text-slate-500 mt-1">
          Preenche os detalhes e adiciona os jogadores a seguir.
        </p>
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
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Descrição (opcional)
          </label>
          <textarea
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 resize-none"
            rows={2}
            placeholder="Descrição opcional do torneio..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <Select
          label="Formato"
          options={FORMAT_OPTIONS}
          value={format}
          onChange={(e) => setFormat(e.target.value as TournamentFormat)}
        />

        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Sets para ganhar"
            options={SETS_OPTIONS}
            value={setsToWin}
            onChange={(e) => setSetsToWin(Number(e.target.value))}
          />
          <Select
            label="Pontos por set"
            options={POINTS_OPTIONS}
            value={pointsPerSet}
            onChange={(e) => setPointsPerSet(Number(e.target.value))}
          />
        </div>

        {isSingle && (
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              checked={thirdPlace}
              onChange={(e) => setThirdPlace(e.target.checked)}
            />
            <span className="text-sm text-slate-700 dark:text-slate-300">
              Jogo para 3.º/4.º lugar
            </span>
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
