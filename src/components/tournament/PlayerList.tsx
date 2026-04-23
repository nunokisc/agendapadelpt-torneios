"use client";

import { useState, useCallback } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import type { Player } from "@/types";

// ─── Sortable row ────────────────────────────────────────────────────────────

function SortablePlayer({
  player,
  index,
  onRemove,
  disabled,
}: {
  player: Player;
  index: number;
  onRemove: () => void;
  disabled: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: player.id, disabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 group"
    >
      <div className="flex items-center gap-3 min-w-0">
        {!disabled && (
          <button
            {...attributes}
            {...listeners}
            className="text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing touch-none shrink-0"
            tabIndex={-1}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM16 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM8 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM16 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM8 22a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM16 22a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />
            </svg>
          </button>
        )}
        <span className="text-sm font-mono text-slate-400 w-5 text-right shrink-0">
          {index + 1}
        </span>
        <span className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
          {player.name}
        </span>
      </div>
      {!disabled && (
        <button
          onClick={onRemove}
          className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 ml-2 shrink-0"
          title="Remover"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </li>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface PlayerListProps {
  players: Player[];
  slug: string;
  token: string;
  onUpdate: () => void;
  disabled?: boolean;
}

export default function PlayerList({
  players,
  slug,
  token,
  onUpdate,
  disabled = false,
}: PlayerListProps) {
  const [singleName, setSingleName] = useState("");
  const [bulkText, setBulkText] = useState("");
  const [showBulk, setShowBulk] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  const saveOrder = useCallback(
    async (ordered: Player[]) => {
      await fetch(`/api/tournament/${slug}/players?token=${token}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order: ordered.map((p, i) => ({ id: p.id, seed: i + 1 })),
        }),
      });
    },
    [slug, token]
  );

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = players.findIndex((p) => p.id === active.id);
    const newIndex = players.findIndex((p) => p.id === over.id);
    const reordered = arrayMove(players, oldIndex, newIndex);

    // Optimistic: parent will re-fetch after saveOrder
    await saveOrder(reordered);
    onUpdate();
  }

  async function handleShuffle() {
    const shuffled = [...players].sort(() => Math.random() - 0.5);
    await saveOrder(shuffled);
    onUpdate();
  }

  async function addPlayer(names: string[]) {
    setError(null);
    setLoading(true);
    try {
      const body = names.length === 1 ? { name: names[0] } : { names };
      const res = await fetch(`/api/tournament/${slug}/players?token=${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Erro ao adicionar jogador");
      }
      setSingleName("");
      setBulkText("");
      onUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }

  async function removePlayer(playerId: string) {
    setError(null);
    try {
      const res = await fetch(
        `/api/tournament/${slug}/players?token=${token}&playerId=${playerId}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Erro ao remover jogador");
      }
      onUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    }
  }

  function handleSingleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!singleName.trim()) return;
    addPlayer([singleName.trim()]);
  }

  function handleBulkAdd() {
    const names = bulkText.split("\n").map((n) => n.trim()).filter(Boolean);
    if (!names.length) return;
    addPlayer(names);
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Jogadores ({players.length})</CardTitle>
            <p className="text-xs text-slate-500 mt-0.5">
              Arrasta para definir seeds. Seed 1 = cabeça de série.
            </p>
          </div>
          {!disabled && players.length > 1 && (
            <button
              onClick={handleShuffle}
              className="text-xs text-slate-400 hover:text-emerald-600 transition-colors flex items-center gap-1"
              title="Seeds aleatórios"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4l16 16M4 20h4l12-12V4h-4L4 16v4z" />
              </svg>
              Shuffle
            </button>
          )}
        </div>
      </CardHeader>

      {!disabled && (
        <div className="mb-4">
          <div className="flex gap-1 mb-3 border-b border-slate-100 dark:border-slate-700">
            <button
              className={`text-xs px-3 py-2 rounded-t-lg -mb-px transition-colors ${
                !showBulk
                  ? "border border-b-white dark:border-slate-600 dark:border-b-slate-900 border-slate-200 text-emerald-600 bg-white dark:bg-slate-900"
                  : "text-slate-400 hover:text-slate-600"
              }`}
              onClick={() => setShowBulk(false)}
            >
              Adicionar um
            </button>
            <button
              className={`text-xs px-3 py-2 rounded-t-lg -mb-px transition-colors ${
                showBulk
                  ? "border border-b-white dark:border-slate-600 dark:border-b-slate-900 border-slate-200 text-emerald-600 bg-white dark:bg-slate-900"
                  : "text-slate-400 hover:text-slate-600"
              }`}
              onClick={() => setShowBulk(true)}
            >
              Colar vários
            </button>
          </div>

          {!showBulk ? (
            <form onSubmit={handleSingleAdd} className="flex gap-2">
              <Input
                placeholder="Nome do jogador"
                value={singleName}
                onChange={(e) => setSingleName(e.target.value)}
                className="flex-1"
                disabled={loading}
              />
              <Button type="submit" loading={loading} disabled={!singleName.trim()}>
                Adicionar
              </Button>
            </form>
          ) : (
            <div className="flex flex-col gap-2">
              <textarea
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 resize-none"
                rows={5}
                placeholder={"Alice\nBob\nCarlos\nDiana"}
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                disabled={loading}
              />
              <Button onClick={handleBulkAdd} loading={loading} disabled={!bulkText.trim()}>
                Adicionar todos
              </Button>
            </div>
          )}

          {error && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
          )}
        </div>
      )}

      {players.length === 0 ? (
        <p className="text-center py-6 text-sm text-slate-400">
          Nenhum jogador adicionado ainda.
        </p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={players.map((p) => p.id)}
            strategy={verticalListSortingStrategy}
          >
            <ol className="flex flex-col gap-0.5">
              {players.map((player, idx) => (
                <SortablePlayer
                  key={player.id}
                  player={player}
                  index={idx}
                  onRemove={() => removePlayer(player.id)}
                  disabled={disabled}
                />
              ))}
            </ol>
          </SortableContext>
        </DndContext>
      )}
    </Card>
  );
}
